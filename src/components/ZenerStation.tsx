"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { generatePresetMask, type ZenerShape } from "@/lib/zener-presets";
import AnalogMeter from "./AnalogMeter";

interface ZenerStationProps {
  coherenceScore: number;
  onMaskChange: (
    mask: Uint8Array | null,
    width: number,
    height: number
  ) => void;
}

const DIAL_POSITIONS: {
  shape: ZenerShape;
  label: string;
  angle: number;
}[] = [
  { shape: "circle", label: "○", angle: -100 },
  { shape: "triangle", label: "△", angle: -50 },
  { shape: "square", label: "□", angle: 0 },
  { shape: "star", label: "☆", angle: 50 },
  { shape: "plus", label: "+", angle: 100 },
];

const CANVAS_SIZE = 120;

export default function ZenerStation({
  coherenceScore,
  onMaskChange,
}: ZenerStationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activePreset, setActivePreset] = useState<ZenerShape | null>(null);

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
      drawPresetToCanvas(shape);
    },
    [drawPresetToCanvas]
  );

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    onMaskChange(null, 0, 0);
    setActivePreset(null);
  }, [onMaskChange]);

  useEffect(() => {
    drawPresetToCanvas("circle");
    setActivePreset("circle");
  }, [drawPresetToCanvas]);

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

  const selectedAngle =
    DIAL_POSITIONS.find((p) => p.shape === activePreset)?.angle ?? null;

  return (
    <div className="panel" style={styles.container}>
      <div className="hud-label">CHANNEL</div>

      {/* Shape preview / freehand canvas */}
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

      {/* Rotary channel dial */}
      <svg
        viewBox="0 0 160 120"
        style={{ width: "100%", maxWidth: 155 }}
      >
        <defs>
          <radialGradient id="knobChrome" cx="42%" cy="38%">
            <stop offset="0%" stopColor="#f0ece4" />
            <stop offset="25%" stopColor="#ddd8cc" />
            <stop offset="55%" stopColor="#b8b0a0" />
            <stop offset="85%" stopColor="#908878" />
            <stop offset="100%" stopColor="#706858" />
          </radialGradient>
          <radialGradient id="knobDimple" cx="40%" cy="35%">
            <stop offset="0%" stopColor="#908878" />
            <stop offset="100%" stopColor="#d4cfc4" />
          </radialGradient>
          <linearGradient id="dialBezel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e8e2d8" />
            <stop offset="40%" stopColor="#c0b8a8" />
            <stop offset="100%" stopColor="#605848" />
          </linearGradient>
          <filter id="labelGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer chrome bezel */}
        <ellipse
          cx="80"
          cy="64"
          rx="76"
          ry="58"
          fill="none"
          stroke="url(#dialBezel)"
          strokeWidth="4"
        />

        {/* Dark dial plate */}
        <ellipse cx="80" cy="64" rx="72" ry="54" fill="#1a1410" />

        {/* Decorative ring */}
        <ellipse
          cx="80"
          cy="64"
          rx="64"
          ry="48"
          fill="none"
          stroke="#2a2018"
          strokeWidth="0.5"
        />

        {/* Detent positions and labels */}
        {DIAL_POSITIONS.map(({ shape, label, angle }) => {
          const rad = (angle * Math.PI) / 180;
          const dotRx = 64;
          const dotRy = 48;
          const labelRx = 52;
          const labelRy = 39;
          const dx = 80 + dotRx * Math.sin(rad);
          const dy = 64 - dotRy * Math.cos(rad);
          const lx = 80 + labelRx * Math.sin(rad);
          const ly = 64 - labelRy * Math.cos(rad);
          const active = activePreset === shape;

          return (
            <g
              key={shape}
              onClick={() => selectPreset(shape)}
              style={{ cursor: "pointer" }}
            >
              <circle cx={lx} cy={ly} r="14" fill="transparent" />
              <circle
                cx={dx}
                cy={dy}
                r={active ? 3 : 2}
                fill={active ? "#e8c874" : "#6b5a48"}
              />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="central"
                fill={active ? "#e8c874" : "#8b6d2e"}
                fontSize="15"
                fontFamily="'Special Elite', serif"
                filter={active ? "url(#labelGlow)" : undefined}
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Chrome knob */}
        <circle
          cx="80"
          cy="64"
          r="22"
          fill="url(#knobChrome)"
          stroke="#605848"
          strokeWidth="1.5"
        />

        {/* Knurled edge ring */}
        <circle
          cx="80"
          cy="64"
          r="19"
          fill="none"
          stroke="rgba(0,0,0,0.1)"
          strokeWidth="0.5"
        />

        {/* Pointer indicator */}
        {selectedAngle !== null && (
          <g
            style={{
              transform: `rotate(${selectedAngle}deg)`,
              transformOrigin: "80px 64px",
              transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <line
              x1="80"
              y1="64"
              x2="80"
              y2="44"
              stroke="#2a1c10"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="80" cy="45" r="2.5" fill="#c03030" />
          </g>
        )}

        {/* Center dimple */}
        <circle
          cx="80"
          cy="64"
          r="4"
          fill="url(#knobDimple)"
          stroke="#706858"
          strokeWidth="0.5"
        />
      </svg>

      <button onClick={clearCanvas} style={styles.clearBtn}>
        CLEAR
      </button>

      <AnalogMeter value={coherenceScore} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: "100%",
    padding: "6px 8px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "space-evenly",
  },
  drawCanvas: {
    width: "100%",
    maxWidth: 120,
    aspectRatio: "1",
    border: "3px solid",
    borderColor: "#d4cfc4 #807868 #706858 #ccc6b8",
    boxShadow:
      "1px 1px 0 #504840, -1px -1px 0 #e8e2d8, inset 1px 1px 3px rgba(0,0,0,0.4)",
    cursor: "crosshair",
    touchAction: "none",
  },
  clearBtn: {
    fontFamily: "var(--font-main)",
    fontSize: "0.7rem",
    color: "var(--screen-amber-dim)",
    background: "transparent",
    border: "2px solid",
    borderColor: "#b0a898 #706858 #605848 #a8a090",
    boxShadow: "1px 1px 2px rgba(0,0,0,0.25)",
    padding: "2px 10px",
    cursor: "pointer",
  },
};
