"use client";

import type { NoiseMode } from "@/types";
import Knob from "./Knob";
import SelectorKnob from "./SelectorKnob";

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

const MODEL_OPTIONS = [
  { value: "tiny", label: "TINY" },
  { value: "small", label: "SMALL" },
];

const NOISE_OPTIONS = [
  { value: "whisper", label: "WHISP" },
  { value: "phoneme", label: "PHON" },
  { value: "voice", label: "VOICE" },
  { value: "raw", label: "RAW" },
];

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
        <SelectorKnob
          label="MODEL"
          options={MODEL_OPTIONS}
          value={model}
          onChange={(v) => onModelChange(v as "tiny" | "small")}
          disabled={modelLoading}
          statusDot={modelLoading ? "loading" : modelReady ? "ready" : null}
        />
        <SelectorKnob
          label="NOISE"
          options={NOISE_OPTIONS}
          value={noiseMode}
          onChange={(v) => onNoiseModeChange(v as NoiseMode)}
        />
        <Knob
          label="CHUNK"
          value={chunkDuration}
          min={2}
          max={10}
          step={1}
          onChange={onChunkChange}
          formatValue={(v) => `${v}s`}
        />
        <Knob
          label="TEMP"
          value={temperature}
          min={0.1}
          max={1.5}
          step={0.1}
          onChange={onTempChange}
          formatValue={(v) => v.toFixed(1)}
        />
        <Knob
          label="SEED"
          value={seed}
          min={0}
          max={100}
          step={1}
          onChange={onSeedChange}
        />
      </div>
      <div style={styles.titleArea}>
        <h1 className="title-glow">Pareidolator</h1>
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
    padding: "6px 16px",
    gap: 16,
  },
  controls: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  titleArea: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexShrink: 0,
  },
  infoBtn: {
    fontFamily: "var(--font-main)",
    fontSize: "1.25rem",
    color: "var(--screen-amber-glow)",
    background: "transparent",
    border: "2px solid",
    borderColor: "#c0b8a8 #706858 #605848 #b8b0a0",
    boxShadow: "1px 1px 3px rgba(0,0,0,0.3)",
    width: 32,
    height: 32,
    cursor: "pointer",
    textShadow: "0 0 4px var(--screen-amber)",
  },
};
