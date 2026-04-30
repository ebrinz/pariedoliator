"use client";

import { useRef, useEffect } from "react";
import type { TranscriptEntry } from "@/types";

interface TranscriptLogProps {
  entries: TranscriptEntry[];
  modelLoading?: boolean;
  modelReady?: boolean;
}

export default function TranscriptLog({ entries, modelLoading, modelReady }: TranscriptLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div className="panel" style={styles.container} ref={scrollRef}>
      <div className="hud-label" style={{ marginBottom: 8 }}>
        TRANSCRIPT
      </div>
      {entries.length === 0 && (
        <div style={{ color: "var(--text-dim)", fontSize: "0.875rem" }}>
          {modelLoading ? (
            <span className="phosphor-pulse">Downloading Whisper model...</span>
          ) : modelReady ? (
            "Listening for phantom voices..."
          ) : (
            "Awaiting initialization..."
          )}
        </div>
      )}
      {entries.map((entry) => (
        <div key={entry.id} style={styles.entry}>
          {entry.tokens.map((token, i) => {
            const brightness = Math.max(0.2, Math.min(1, (token.logProb + 5) / 5));
            const isHighConf = token.logProb > -1;
            return (
              <span
                key={i}
                className={isHighConf ? "vhs-glitch-burst" : undefined}
                style={{
                  color: isHighConf
                    ? "var(--text-highlight)"
                    : `rgba(240,230,210,${brightness})`,
                  textShadow: isHighConf
                    ? "0 0 6px var(--screen-amber)"
                    : "none",
                }}
              >
                {token.text}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: "100%",
    overflowY: "auto",
    padding: 12,
    fontSize: "1rem",
  },
  entry: {
    marginBottom: 8,
    lineHeight: 1.5,
  },
};
