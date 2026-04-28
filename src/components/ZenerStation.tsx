"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { generatePresetMask, type ZenerShape } from "@/lib/zener-presets";
import AnalogMeter from "./AnalogMeter";

interface ZenerStationProps {
  coherenceScore: number;
  onMaskChange: (mask: Uint8Array | null, width: number, height: number) => void;
}

const PRESETS: ZenerShape[] = ["circle", "triangle", "square", "star", "plus"];
const PRESET_LABELS: Record<ZenerShape, string> = {
  circle: "O",
  triangle: "△",
  square: "□",
  star: "☆",
  plus: "+",
};
const ROTATION_INTERVAL = 45000;
const CANVAS_SIZE = 120;

export default function ZenerStation({
  coherenceScore,
  onMaskChange,
}: ZenerStationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [locked, setLocked] = useState(false);
  const [activePreset, setActivePreset] = useState<ZenerShape | null>(null);
  const rotationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const presetIdxRef = useRef(0);

  const drawPresetToCanvas = useCallback(
    (shape: ZenerShape) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const mask = generatePresetMask(shape, CANVAS_SIZE, CANVAS_SIZE);
      const imgData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
      for (let i = 0; i < mask.length; i++) {
        const v = mask[i] * 255;
        imgData.data[i * 4] = v;
        imgData.data[i * 4 + 1] = v;
        imgData.data[i * 4 + 2] = v;
        imgData.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
      onMaskChange(mask, CANVAS_SIZE, CANVAS_SIZE);
    },
    [onMaskChange]
  );

  const selectPreset = useCallback(
    (shape: ZenerShape) => {
      setActivePreset(shape);
      setLocked(true);
      drawPresetToCanvas(shape);
      if (rotationRef.current) {
        clearInterval(rotationRef.current);
        rotationRef.current = null;
      }
    },
    [drawPresetToCanvas]
  );

  const startRotation = useCallback(() => {
    if (rotationRef.current) clearInterval(rotationRef.current);
    const rotate = () => {
      const shape = PRESETS[presetIdxRef.current % PRESETS.length];
      presetIdxRef.current++;
      setActivePreset(shape);
      drawPresetToCanvas(shape);
    };
    rotate();
    rotationRef.current = setInterval(rotate, ROTATION_INTERVAL);
  }, [drawPresetToCanvas]);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    onMaskChange(null, 0, 0);
    setLocked(false);
    setActivePreset(null);
    startRotation();
  }, [onMaskChange, startRotation]);

  useEffect(() => {
    startRotation();
    return () => {
      if (rotationRef.current) clearInterval(rotationRef.current);
    };
  }, [startRotation]);

  const extractFreehandMask = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const mask = new Uint8Array(CANVAS_SIZE * CANVAS_SIZE);
    for (let i = 0; i < mask.length; i++) {
      mask[i] = imgData.data[i * 4] > 128 ? 1 : 0;
    }
    onMaskChange(mask, CANVAS_SIZE, CANVAS_SIZE);
    setLocked(true);
  }, [onMaskChange]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDrawing(true);
      setActivePreset(null);
      if (rotationRef.current) {
        clearInterval(rotationRef.current);
        rotationRef.current = null;
      }
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
      const y = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;
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
      const x = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
      const y = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [isDrawing]
  );

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false);
    extractFreehandMask();
  }, [extractFreehandMask]);

  return (
    <div className="panel" style={styles.container}>
      <div className="hud-label" style={{ marginBottom: 8 }}>
        ZENER
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
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
            onClick={() => selectPreset(p)}
            style={{
              ...styles.presetBtn,
              borderColor:
                activePreset === p
                  ? "var(--phosphor-green)"
                  : "var(--border-color)",
              textShadow:
                activePreset === p ? "0 0 6px var(--phosphor-green)" : "none",
            }}
          >
            {PRESET_LABELS[p]}
          </button>
        ))}
      </div>
      <button onClick={clearCanvas} style={styles.clearBtn}>
        CLEAR
      </button>
      <div style={{ marginTop: 12, textAlign: "center", width: "100%" }}>
        <AnalogMeter value={coherenceScore} />
        <div className="hud-label" style={{ marginTop: 4 }}>COHERENCE</div>
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
    overflowY: "auto",
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
    minHeight: 44,
    minWidth: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
