import { useRef, useCallback, useMemo } from "react";

interface UseTTSReturn {
  speak: (text: string) => void;
  setVolume: (v: number) => void;
  stop: () => void;
}

export function useTTS(): UseTTSReturn {
  const volumeRef = useRef(0);

  const speak = useCallback((text: string) => {
    if (volumeRef.current === 0) return;
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = volumeRef.current;
    utterance.rate = 0.8;
    utterance.pitch = 0.6;
    window.speechSynthesis.speak(utterance);
  }, []);

  const setVolume = useCallback((v: number) => {
    volumeRef.current = v;
  }, []);

  const stop = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return useMemo(() => ({ speak, setVolume, stop }), [speak, setVolume, stop]);
}
