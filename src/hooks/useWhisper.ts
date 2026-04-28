import { useRef, useCallback, useState, useEffect } from "react";
import { scorePhraseCoherence } from "@/lib/transcript-scorer";
import type { TranscriptEntry, TranscriptToken, WhisperConfig } from "@/types";

let entryCounter = 0;

interface UseWhisperReturn {
  isReady: boolean;
  isLoading: boolean;
  loadModel: (model: "tiny" | "small") => void;
  transcribe: (audio: Float32Array, temperature: number) => void;
  entries: TranscriptEntry[];
}

export function useWhisper(): UseWhisperReturn {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/whisper-worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (e: MessageEvent) => {
      const { type } = e.data;

      if (type === "loading") {
        setIsLoading(true);
        setIsReady(false);
      } else if (type === "ready") {
        setIsLoading(false);
        setIsReady(true);
      } else if (type === "result") {
        const text: string = e.data.text?.trim();
        if (!text) return;

        const words = text.split(/\s+/);
        const tokens: TranscriptToken[] = words.map((word) => ({
          text: word + " ",
          logProb: -2 + Math.random() * 4,
          timestamp: Date.now(),
        }));

        const phraseScore = scorePhraseCoherence(words);

        const entry: TranscriptEntry = {
          id: `entry-${++entryCounter}`,
          tokens,
          phraseScore,
          timestamp: Date.now(),
        };

        setEntries((prev) => [...prev.slice(-100), entry]);
      } else if (type === "error") {
        console.error("Whisper worker error:", e.data.error);
      }
    };

    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  const loadModel = useCallback((model: "tiny" | "small") => {
    workerRef.current?.postMessage({ type: "load", model });
  }, []);

  const transcribe = useCallback(
    (audio: Float32Array, temperature: number) => {
      workerRef.current?.postMessage(
        { type: "transcribe", audio, temperature },
        [audio.buffer]
      );
    },
    []
  );

  return { isReady, isLoading, loadModel, transcribe, entries };
}
