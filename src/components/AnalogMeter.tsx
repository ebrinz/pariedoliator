"use client";

import { useRef, useEffect } from "react";

interface AnalogMeterProps {
  value: number;
  width?: number;
  height?: number;
}

export default function AnalogMeter({
  value,
  width = 160,
  height = 90,
}: AnalogMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const smoothedRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    smoothedRef.current += (value - smoothedRef.current) * 0.12;
    const v = smoothedRef.current;

    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height - 6;
    const R = Math.min(cx - 6, cy - 6);
    const bandOuter = R;
    const bandInner = R - 10;

    // Cream meter face
    ctx.beginPath();
    ctx.arc(cx, cy, R + 3, Math.PI, 0);
    ctx.closePath();
    ctx.fillStyle = "#f0e8d4";
    ctx.fill();

    // Red → white → red arc bands (-1 to +1 mapped to 0–1 for arc position)
    const zones: [number, number, string][] = [
      [0, 0.1, "#c03030"],
      [0.1, 0.2, "#d06040"],
      [0.2, 0.3, "#e09868"],
      [0.3, 0.42, "#e8c8a0"],
      [0.42, 0.58, "#f0e8d4"],
      [0.58, 0.7, "#e8c8a0"],
      [0.7, 0.8, "#e09868"],
      [0.8, 0.9, "#d06040"],
      [0.9, 1.0, "#c03030"],
    ];
    for (const [s, e, c] of zones) {
      const a0 = Math.PI + s * Math.PI;
      const a1 = Math.PI + e * Math.PI;
      ctx.beginPath();
      ctx.arc(cx, cy, bandOuter, a0, a1);
      ctx.arc(cx, cy, bandInner, a1, a0, true);
      ctx.closePath();
      ctx.fillStyle = c;
      ctx.fill();
    }

    // Tick marks
    for (let i = 0; i <= 20; i++) {
      const a = Math.PI + (i / 20) * Math.PI;
      const major = i % 5 === 0;
      const r1 = major ? bandInner - 6 : bandInner - 3;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.lineTo(cx + Math.cos(a) * bandInner, cy + Math.sin(a) * bandInner);
      ctx.strokeStyle = "#2a1c10";
      ctx.lineWidth = major ? 1.5 : 0.6;
      ctx.stroke();
    }

    // Scale labels (-1 to +1)
    ctx.font = "bold 8px 'Courier Prime', monospace";
    ctx.fillStyle = "#2a1c10";
    ctx.textAlign = "center";
    const labels = ["-1", "-.5", "0", "+.5", "+1"];
    for (let i = 0; i < labels.length; i++) {
      const a = Math.PI + (i / 4) * Math.PI;
      const lr = bandInner - 14;
      ctx.fillText(
        labels[i],
        cx + Math.cos(a) * lr,
        cy + Math.sin(a) * lr + 3
      );
    }

    // Needle: map value from [-1,+1] to [0,1] for arc position
    const norm = (v + 1) / 2;
    const na = Math.PI + norm * Math.PI;
    const nLen = R;
    ctx.beginPath();
    ctx.moveTo(cx + 0.5, cy + 0.5);
    ctx.lineTo(
      cx + Math.cos(na) * nLen + 0.5,
      cy + Math.sin(na) * nLen + 0.5
    );
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Needle body
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(na) * nLen, cy + Math.sin(na) * nLen);
    ctx.strokeStyle = "#1a1008";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Red needle tip
    const tipR = nLen * 0.6;
    ctx.beginPath();
    ctx.moveTo(
      cx + Math.cos(na) * tipR,
      cy + Math.sin(na) * tipR
    );
    ctx.lineTo(cx + Math.cos(na) * nLen, cy + Math.sin(na) * nLen);
    ctx.strokeStyle = "#c03030";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Chrome pivot screw
    const pg = ctx.createRadialGradient(cx - 1, cy - 1, 0, cx, cy, 5);
    pg.addColorStop(0, "#e8e2d8");
    pg.addColorStop(0.5, "#d4cfc4");
    pg.addColorStop(1, "#807868");
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = pg;
    ctx.fill();
    ctx.strokeStyle = "#605848";
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Bottom edge
    ctx.beginPath();
    ctx.moveTo(cx - R - 3, cy + 1);
    ctx.lineTo(cx + R + 3, cy + 1);
    ctx.strokeStyle = "#2a1c10";
    ctx.lineWidth = 1;
    ctx.stroke();
  }, [value, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        width: "100%",
        maxWidth: width,
        borderRadius: 4,
        background: "#f0e8d4",
        border: "3px solid",
        borderColor: "#d4cfc4 #807868 #706858 #ccc6b8",
        boxShadow:
          "1px 1px 0 #504840, -1px -1px 0 #e8e2d8, 2px 2px 5px rgba(0,0,0,0.35), inset 1px 1px 2px rgba(0,0,0,0.15)",
      }}
    />
  );
}
