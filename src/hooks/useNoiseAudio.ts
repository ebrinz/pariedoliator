import { useRef, useCallback, useEffect } from "react";

interface UseNoiseAudioReturn {
  feedSamples: (samples: Float32Array) => void;
  getBufferedAudio: (durationSec: number, sampleRate: number) => Float32Array;
  setVolume: (v: number) => void;
}

export function useNoiseAudio(): UseNoiseAudioReturn {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const bufferQueue = useRef<Float32Array[]>([]);
  const totalSamples = useRef(0);

  useEffect(() => {
    const ctx = new AudioContext({ sampleRate: 16000 });
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    ctxRef.current = ctx;
    gainRef.current = gain;

    return () => {
      ctx.close();
    };
  }, []);

  const feedSamples = useCallback((samples: Float32Array) => {
    bufferQueue.current.push(samples);
    totalSamples.current += samples.length;

    const ctx = ctxRef.current;
    const gain = gainRef.current;
    if (!ctx || !gain) return;

    if (ctx.state === "suspended") ctx.resume();

    const buffer = ctx.createBuffer(1, samples.length, 16000);
    buffer.getChannelData(0).set(samples);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    source.start();
  }, []);

  const getBufferedAudio = useCallback(
    (durationSec: number, sampleRate: number): Float32Array => {
      const needed = durationSec * sampleRate;
      const chunks: Float32Array[] = [];
      let collected = 0;

      while (bufferQueue.current.length > 0 && collected < needed) {
        const chunk = bufferQueue.current.shift()!;
        chunks.push(chunk);
        collected += chunk.length;
      }

      const result = new Float32Array(Math.min(collected, needed));
      let offset = 0;
      for (const chunk of chunks) {
        const toCopy = Math.min(chunk.length, needed - offset);
        result.set(chunk.subarray(0, toCopy), offset);
        offset += toCopy;
        if (toCopy < chunk.length) {
          bufferQueue.current.unshift(chunk.subarray(toCopy));
        }
      }

      return result;
    },
    []
  );

  const setVolume = useCallback((v: number) => {
    if (gainRef.current) {
      gainRef.current.gain.value = v;
    }
  }, []);

  return { feedSamples, getBufferedAudio, setVolume };
}
