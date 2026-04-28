"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface ZenerStationProps {
  coherenceScore: number;
  onMaskChange: (mask: ImageData | null) => void;
}

const PRESETS = ["circle", "triangle", "square", "star", "plus"] as const;

export default function ZenerStation({
  coherenceScore,
  onMaskChange,
}: ZenerStationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [locked, setLocked] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onMaskChange(null);
    setLocked(false);
    setActivePreset(null);
  }, [onMaskChange]);

  const extractMask = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    onMaskChange(imageData);
    setLocked(true);
  }, [onMaskChange]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDrawing(true);
      setActivePreset(null);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [isDrawing]
  );

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false);
    extractMask();
  }, [extractMask]);

  useEffect(() => {
    clearCanvas();
  }, [clearCanvas]);

  return (
    <div className="panel" style={styles.container}>
      <div className="hud-label" style={{ marginBottom: 8 }}>
        ZENER
      </div>
      <canvas
        ref={canvasRef}
        width={120}
        height={120}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={styles.drawCanvas}
      />
      <div style={styles.presets}>
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setActivePreset(p)}
            style={{
              ...styles.presetBtn,
              borderColor:
                activePreset === p
                  ? "var(--phosphor-green)"
                  : "var(--border-color)",
            }}
          >
            {p === "circle"
              ? "O"
              : p === "triangle"
                ? "△"
                : p === "square"
                  ? "□"
                  : p === "star"
                    ? "☆"
                    : "+"}
          </button>
        ))}
      </div>
      <button onClick={clearCanvas} style={styles.clearBtn}>
        CLEAR
      </button>
      <div style={{ marginTop: 12, textAlign: "center" }}>
        <div className="hud-label">COHERENCE</div>
        <div style={{ fontSize: "1.5rem", color: "var(--phosphor-green)" }}>
          {coherenceScore.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: "100%",
    padding: 12,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  drawCanvas: {
    width: "100%",
    maxWidth: 150,
    aspectRatio: "1",
    border: "1px solid var(--phosphor-green-dim)",
    cursor: "crosshair",
    touchAction: "none",
  },
  presets: { display: "flex", gap: 6 },
  presetBtn: {
    fontFamily: "var(--font-main)",
    fontSize: "1.25rem",
    width: 32,
    height: 32,
    background: "var(--bg-dark)",
    color: "var(--phosphor-green)",
    border: "1px solid var(--border-color)",
    cursor: "pointer",
  },
  clearBtn: {
    fontFamily: "var(--font-main)",
    fontSize: "0.75rem",
    color: "var(--phosphor-green-dim)",
    background: "transparent",
    border: "1px solid var(--border-color)",
    padding: "2px 8px",
    cursor: "pointer",
  },
};
