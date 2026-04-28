"use client";

interface TopBarProps {
  model: "tiny" | "small";
  chunkDuration: number;
  temperature: number;
  onModelChange: (model: "tiny" | "small") => void;
  onChunkChange: (value: number) => void;
  onTempChange: (value: number) => void;
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
  onModelChange,
  onChunkChange,
  onTempChange,
  onInfoClick,
}: TopBarProps) {
  return (
    <div className="panel" style={styles.bar}>
      <div style={styles.controls}>
        <label style={styles.control}>
          <span className="hud-label">MODEL</span>
          <select
            value={model}
            onChange={(e) => onModelChange(e.target.value as "tiny" | "small")}
          >
            <option value="tiny">TINY</option>
            <option value="small">SMALL</option>
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
    color: "var(--phosphor-green)",
    background: "transparent",
    border: "1px solid var(--phosphor-green-dim)",
    width: 32,
    height: 32,
    cursor: "pointer",
    textShadow: "0 0 4px var(--phosphor-green)",
  },
};
