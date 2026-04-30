import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import { scorePhraseCoherence } from "@/lib/transcript-scorer";
import type { TranscriptEntry, TranscriptToken } from "@/types";

interface UseWhisperReturn {
  isReady: boolean;
  isLoading: boolean;
  loadModel: (model: "tiny" | "small") => void;
  transcribe: (audio: Float32Array, temperature: number) => void;
  entries: TranscriptEntry[];
}

export function useWhisper(): UseWhisperReturn {
  const workerRef = useRef<Worker | null>(null);
  const entryCounterRef = useRef(0);
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

        const workerTokens: { text: string; logProb: number | null }[] =
          e.data.tokens || [];

        let tokens: TranscriptToken[];
        if (workerTokens.length > 0) {
          tokens = workerTokens.map((t) => ({
            text: t.text.trim() + " ",
            logProb: t.logProb ?? -3,
            timestamp: Date.now(),
          }));
        } else {
          const words = text.split(/\s+/);
          tokens = words.map((word) => ({
            text: word + " ",
            logProb: -3,
            timestamp: Date.now(),
          }));
        }

        const words = tokens.map((t) => t.text.trim()).filter(Boolean);
        const phraseScore = scorePhraseCoherence(words);

        const entry: TranscriptEntry = {
          id: `entry-${++entryCounterRef.current}`,
          tokens,
          phraseScore,
          timestamp: Date.now(),
        };

        setEntries((prev) => {
          // Deduplicate: skip if same text as last 3 entries
          const recent = prev.slice(-3);
          const newText = tokens.map((t) => t.text).join("").trim();
          if (recent.some((r) => r.tokens.map((t) => t.text).join("").trim() === newText)) {
            return prev;
          }
          return [...prev.slice(-100), entry];
        });
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

  return useMemo(
    () => ({ isReady, isLoading, loadModel, transcribe, entries }),
    [isReady, isLoading, loadModel, transcribe, entries]
  );
}
