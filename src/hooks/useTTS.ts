import { useRef, useCallback, useMemo } from "react";

interface UseTTSReturn {
  speak: (text: string) => void;
  setVolume: (v: number) => void;
  stop: () => void;
  unlock: () => void;
}

export function useTTS(): UseTTSReturn {
  const volumeRef = useRef(0);
  const unlockedRef = useRef(false);

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

  // Call synchronously inside a user-gesture handler. iOS Safari requires the
  // first speak() to originate from a gesture; a silent priming utterance
  // satisfies that so later async-triggered speak() calls work.
  const unlock = useCallback(() => {
    if (unlockedRef.current) return;
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
    unlockedRef.current = true;
  }, []);

  return useMemo(
    () => ({ speak, setVolume, stop, unlock }),
    [speak, setVolume, stop, unlock]
  );
}
