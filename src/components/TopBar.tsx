"use client";

import type { NoiseMode } from "@/types";

interface TopBarProps {
  model: "tiny" | "small";
  chunkDuration: number;
  temperature: number;
  seed: number;
  noiseMode: NoiseMode;
  modelLoading: boolean;
  modelReady: boolean;
  onModelChange: (model: "tiny" | "small") => void;
  onChunkChange: (value: number) => void;
  onTempChange: (value: number) => void;
  onSeedChange: (value: number) => void;
  onNoiseModeChange: (mode: NoiseMode) => void;
  onInfoClick: () => void;
}

function tempColor(temp: number): string {
  const t = (temp - 0.1) / 1.4;
  const r = Math.round(68 + t * (255 - 68));
  const g = Math.round(136 + t * (170 - 136));
  const b = Math.round(255 + t * (0 - 255));
  return `rgb(${r},${g},${b})`;
}

export default function TopBar({
  model,
  chunkDuration,
  temperature,
  seed,
  noiseMode,
  modelLoading,
  modelReady,
  onModelChange,
  onChunkChange,
  onTempChange,
  onSeedChange,
  onNoiseModeChange,
  onInfoClick,
}: TopBarProps) {
  return (
    <div className="panel" style={styles.bar}>
      <div style={styles.controls}>
        <label style={styles.control}>
          <span className="hud-label">
            MODEL{" "}
            {modelLoading ? (
              <span className="phosphor-pulse" style={{ color: "var(--screen-amber)", fontSize: "0.75rem" }}>
                LOADING...
              </span>
            ) : modelReady ? (
              <span style={{ color: "var(--screen-amber-glow)", fontSize: "0.75rem" }}>●</span>
            ) : null}
          </span>
          <select
            value={model}
            onChange={(e) => onModelChange(e.target.value as "tiny" | "small")}
            disabled={modelLoading}
          >
            <option value="tiny">TINY</option>
            <option value="small">SMALL</option>
          </select>
        </label>
        <label style={styles.control}>
          <span className="hud-label">NOISE</span>
          <select
            value={noiseMode}
            onChange={(e) => onNoiseModeChange(e.target.value as NoiseMode)}
          >
            <option value="whisper">WHISPER</option>
            <option value="phoneme">PHONEME</option>
            <option value="voice">VOICE</option>
            <option value="raw">RAW</option>
          </select>
        </label>
        <label style={styles.control}>
          <span className="hud-label">CHUNK {chunkDuration}s</span>
          <input
            type="range"
            min={2}
            max={10}
            step={1}
            value={chunkDuration}
            onChange={(e) => onChunkChange(Number(e.target.value))}
            style={{ width: 100 }}
          />
        </label>
        <label style={styles.control}>
          <span className="hud-label" style={{ color: tempColor(temperature) }}>
            TEMP {temperature.toFixed(1)}
          </span>
          <input
            type="range"
            min={0.1}
            max={1.5}
            step={0.1}
            value={temperature}
            onChange={(e) => onTempChange(Number(e.target.value))}
            style={{ width: 100 }}
          />
        </label>
        <label style={styles.control}>
          <span className="hud-label">SEED {seed}</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={seed}
            onChange={(e) => onSeedChange(Number(e.target.value))}
            style={{ width: 100 }}
          />
        </label>
      </div>
      <div style={styles.titleArea}>
        <h1 className="title-glow">PAREIDOLATOR</h1>
        <button onClick={onInfoClick} style={styles.infoBtn}>
          ?
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 16px",
    gap: 16,
  },
  controls: { display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" },
  control: { display: "flex", flexDirection: "column", gap: 2 },
  titleArea: { display: "flex", alignItems: "center", gap: 12, flexShrink: 0 },
  infoBtn: {
    fontFamily: "var(--font-main)",
    fontSize: "1.25rem",
    color: "var(--screen-amber-glow)",
    background: "transparent",
    border: "1px solid var(--screen-amber-dim)",
    width: 32,
    height: 32,
    cursor: "pointer",
    textShadow: "0 0 4px var(--screen-amber)",
  },
};
