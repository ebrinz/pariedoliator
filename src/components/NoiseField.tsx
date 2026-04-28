"use client";

import { useRef, useEffect } from "react";

interface NoiseFieldProps {
  width: number;
  height: number;
}

export default function NoiseField({ width, height }: NoiseFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#33ff33";
    ctx.font = "24px VT323";
    ctx.textAlign = "center";
    ctx.fillText("AWAITING SIGNAL...", width / 2, height / 2);
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
