"use client";

import { useRef, useEffect } from "react";

interface AnalogMeterProps {
  value: number;
  width?: number;
  height?: number;
}

export default function AnalogMeter({
  value,
  width = 150,
  height = 90,
}: AnalogMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const smoothedRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    smoothedRef.current += (value - smoothedRef.current) * 0.1;
    const v = smoothedRef.current;

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height - 10;
    const radius = height - 20;

    // Arc background
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, 0);
    ctx.strokeStyle = "#1a3a1a";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tick marks
    for (let i = 0; i <= 10; i++) {
      const angle = Math.PI + (i / 10) * Math.PI;
      const inner = radius - 8;
      const outer = radius;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.strokeStyle = "#1a8c1a";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Needle
    const needleAngle = Math.PI + (v / 100) * Math.PI;
    const needleLen = radius - 12;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(needleAngle) * needleLen,
      cy + Math.sin(needleAngle) * needleLen
    );
    ctx.strokeStyle = "#33ff33";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Needle glow
    ctx.shadowColor = "#33ff33";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#33ff33";
    ctx.fill();
    ctx.shadowBlur = 0;

    // Label
    ctx.font = "12px VT323";
    ctx.fillStyle = "#1a8c1a";
    ctx.textAlign = "left";
    ctx.fillText("0", cx - radius + 5, cy - 4);
    ctx.textAlign = "right";
    ctx.fillText("100", cx + radius - 5, cy - 4);
  }, [value, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: "100%", maxWidth: width }}
    />
  );
}
