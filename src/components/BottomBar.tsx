"use client";

import Knob from "./Knob";

interface BottomBarProps {
  noiseVolume: number;
  ttsVolume: number;
  onNoiseVolumeChange: (v: number) => void;
  onTtsVolumeChange: (v: number) => void;
  onRecordClick: () => void;
  isRecording: boolean;
}

export default function BottomBar({
  noiseVolume,
  ttsVolume,
  onNoiseVolumeChange,
  onTtsVolumeChange,
  onRecordClick,
  isRecording,
}: BottomBarProps) {
  return (
    <div className="panel" style={styles.bar}>
      <Knob
        label="NOISE"
        value={noiseVolume}
        min={0}
        max={1}
        step={0.01}
        size={52}
        onChange={onNoiseVolumeChange}
        formatValue={(v) => `${Math.round(v * 100)}%`}
      />
      <Knob
        label="TTS"
        value={ttsVolume}
        min={0}
        max={1}
        step={0.01}
        size={52}
        onChange={onTtsVolumeChange}
        formatValue={(v) => `${Math.round(v * 100)}%`}
      />
      <button
        onClick={onRecordClick}
        style={{
          ...styles.recBtn,
          color: isRecording ? "#ff3333" : "var(--screen-amber-dim)",
          borderColor: isRecording
            ? "#ff3333 #cc2222 #cc2222 #ff3333"
            : "#c0b8a8 #706858 #605848 #b8b0a0",
        }}
      >
        {isRecording ? "● REC" : "○ REC"}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "4px 16px",
    gap: 24,
  },
  recBtn: {
    fontFamily: "var(--font-main)",
    fontSize: "0.9rem",
    letterSpacing: "0.08em",
    background: "linear-gradient(180deg, #e0dcd4 0%, #c8c0b4 40%, #b0a898 70%, #c0b8ac 100%)",
    border: "2px solid",
    borderRadius: 3,
    boxShadow:
      "1px 1px 0 #605848, -1px -1px 0 #f0ece4, 2px 2px 4px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.3)",
    padding: "6px 16px",
    cursor: "pointer",
  },
};
