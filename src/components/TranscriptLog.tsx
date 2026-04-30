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
    <div style={styles.wrapper}>
      {/* Perforated tear strip at top */}
      <div style={styles.perforation} />
      <div style={styles.paper} ref={scrollRef}>
        {entries.length === 0 && (
          <div style={styles.placeholder}>
            {modelLoading ? (
              <span style={styles.placeholderPulse}>LOADING MODEL...</span>
            ) : modelReady ? (
              "listening..."
            ) : (
              "awaiting signal..."
            )}
          </div>
        )}
        {entries.map((entry, entryIdx) => (
          <div key={entry.id} style={styles.entry}>
            <span style={styles.lineNum}>
              {String(entryIdx + 1).padStart(3, "0")}
            </span>
            {entry.tokens.map((token, i) => {
              const brightness = Math.max(0.3, Math.min(1, (token.logProb + 5) / 5));
              const isHighConf = token.logProb > -1;
              return (
                <span
                  key={i}
                  className={isHighConf ? "vhs-glitch-burst" : undefined}
                  style={{
                    color: isHighConf
                      ? "#1a0800"
                      : `rgba(40,30,20,${brightness})`,
                    fontWeight: isHighConf ? 700 : 400,
                  }}
                >
                  {token.text}
                </span>
              );
            })}
          </div>
        ))}
        {/* Paper tail with fade */}
        <div style={styles.tail} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    border: "3px solid",
    borderColor: "#d4cfc4 #807868 #706858 #ccc6b8",
    boxShadow:
      "1px 1px 0 #504840, -1px -1px 0 #e8e2d8, 2px 2px 6px rgba(0,0,0,0.45), inset 1px 1px 3px rgba(0,0,0,0.25)",
    borderRadius: 2,
    overflow: "hidden",
  },
  perforation: {
    height: 8,
    flexShrink: 0,
    background: "#f5f0e4",
    borderBottom: "2px dashed #c8bca8",
    boxShadow: "inset 0 -1px 2px rgba(0,0,0,0.06)",
  },
  paper: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 10px",
    fontFamily: "'Courier Prime', 'Courier New', monospace",
    fontSize: "0.8rem",
    lineHeight: 1.6,
    background: "linear-gradient(180deg, #f5f0e4 0%, #efe8d8 50%, #e8e0d0 100%)",
    color: "#2a1c10",
    backgroundImage: `
      linear-gradient(180deg, #f5f0e4 0%, #efe8d8 50%, #e8e0d0 100%),
      repeating-linear-gradient(
        180deg,
        transparent,
        transparent 19px,
        rgba(180,168,148,0.2) 19px,
        rgba(180,168,148,0.2) 20px
      )
    `,
  },
  placeholder: {
    color: "#a09080",
    fontStyle: "italic",
    fontSize: "0.75rem",
    padding: "4px 0",
  },
  placeholderPulse: {
    color: "#a09080",
    fontStyle: "normal",
    animation: "warm-pulse 2s ease-in-out infinite",
  },
  entry: {
    marginBottom: 4,
    borderBottom: "1px solid rgba(180,168,148,0.15)",
    paddingBottom: 4,
  },
  lineNum: {
    color: "#b8a890",
    fontSize: "0.65rem",
    marginRight: 6,
    fontVariantNumeric: "tabular-nums",
    userSelect: "none",
  },
  tail: {
    height: 40,
    background: "linear-gradient(180deg, transparent 0%, rgba(245,240,228,0.8) 100%)",
  },
};
