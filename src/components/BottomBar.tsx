"use client";

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
      <label style={styles.control}>
        <span className="hud-label">NOISE</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={noiseVolume}
          onChange={(e) => onNoiseVolumeChange(Number(e.target.value))}
          style={{ width: 120 }}
        />
      </label>
      <label style={styles.control}>
        <span className="hud-label">TTS</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={ttsVolume}
          onChange={(e) => onTtsVolumeChange(Number(e.target.value))}
          style={{ width: 120 }}
        />
      </label>
      <button
        onClick={onRecordClick}
        style={{
          ...styles.recBtn,
          color: isRecording ? "#ff3333" : "var(--phosphor-green-dim)",
          borderColor: isRecording ? "#ff3333" : "var(--border-color)",
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
    padding: "8px 16px",
    gap: 32,
  },
  control: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  recBtn: {
    fontFamily: "var(--font-main)",
    fontSize: "1rem",
    background: "transparent",
    border: "1px solid var(--border-color)",
    padding: "4px 12px",
    cursor: "pointer",
  },
};
