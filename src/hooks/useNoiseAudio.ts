import { useRef, useCallback, useMemo } from "react";

const MAX_BUFFER_SAMPLES = 16000 * 12;

interface UseNoiseAudioReturn {
  feedSamples: (samples: Float32Array) => void;
  getBufferedAudio: (durationSec: number, sampleRate: number) => Float32Array;
  setVolume: (v: number) => void;
  unlock: () => void;
}

type AudioContextCtor = typeof AudioContext;

export function useNoiseAudio(): UseNoiseAudioReturn {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const bufferQueue = useRef<Float32Array[]>([]);
  const totalSamples = useRef(0);
  const pendingVolume = useRef(0);

  const ensureContext = useCallback(() => {
    if (ctxRef.current) return;
    const Ctor: AudioContextCtor | undefined =
      typeof window !== "undefined"
        ? window.AudioContext ||
          (window as unknown as { webkitAudioContext?: AudioContextCtor })
            .webkitAudioContext
        : undefined;
    if (!Ctor) return;
    let ctx: AudioContext;
    try {
      ctx = new Ctor({ sampleRate: 16000 });
    } catch {
      // iOS Safari historically rejects explicit sampleRate; fall back to default
      ctx = new Ctor();
    }
    const gain = ctx.createGain();
    gain.gain.value = pendingVolume.current;
    gain.connect(ctx.destination);
    ctxRef.current = ctx;
    gainRef.current = gain;
  }, []);

  // Call synchronously inside a user-gesture handler to satisfy iOS Safari's
  // autoplay policy: creates the AudioContext, resumes it, and plays a 1-sample
  // silent buffer to fully unlock the audio route.
  const unlock = useCallback(() => {
    ensureContext();
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    const silent = ctx.createBuffer(1, 1, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = silent;
    src.connect(ctx.destination);
    src.start(0);
  }, [ensureContext]);

  const feedSamples = useCallback((samples: Float32Array) => {
    bufferQueue.current.push(samples);
    totalSamples.current += samples.length;

    while (totalSamples.current > MAX_BUFFER_SAMPLES && bufferQueue.current.length > 1) {
      const dropped = bufferQueue.current.shift()!;
      totalSamples.current -= dropped.length;
    }

    ensureContext();
    const ctx = ctxRef.current;
    const gain = gainRef.current;
    if (!ctx || !gain) return;

    if (ctx.state === "suspended") ctx.resume();

    const buffer = ctx.createBuffer(1, samples.length, 16000);
    buffer.getChannelData(0).set(samples);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    source.onended = () => source.disconnect();
    source.start();
  }, [ensureContext]);

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

      totalSamples.current = 0;
      for (const remaining of bufferQueue.current) {
        totalSamples.current += remaining.length;
      }

      const result = new Float32Array(Math.min(collected, needed));
      let offset = 0;
      for (const chunk of chunks) {
        const toCopy = Math.min(chunk.length, needed - offset);
        result.set(chunk.subarray(0, toCopy), offset);
        offset += toCopy;
        if (toCopy < chunk.length) {
          bufferQueue.current.unshift(chunk.subarray(toCopy));
          totalSamples.current += chunk.length - toCopy;
        }
      }

      return result;
    },
    []
  );

  const setVolume = useCallback((v: number) => {
    pendingVolume.current = v;
    if (gainRef.current) {
      gainRef.current.gain.value = v;
    }
  }, []);

  return useMemo(
    () => ({ feedSamples, getBufferedAudio, setVolume, unlock }),
    [feedSamples, getBufferedAudio, setVolume, unlock]
  );
}
