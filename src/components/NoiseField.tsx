"use client";

import { useRef, useEffect, useCallback } from "react";

interface NoiseFieldProps {
  noiseGrid: Float32Array | null;
  gridWidth: number;
  gridHeight: number;
  tintMap: Uint8Array | null;
}

export default function NoiseField({
  noiseGrid,
  gridWidth,
  gridHeight,
  tintMap,
}: NoiseFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!noiseGrid) {
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#33ff33";
      ctx.font = "24px VT323";
      ctx.textAlign = "center";
      ctx.fillText("AWAITING SIGNAL...", canvas.width / 2, canvas.height / 2);
      return;
    }

    const imageData = ctx.createImageData(gridWidth, gridHeight);
    const data = imageData.data;

    for (let i = 0; i < noiseGrid.length; i++) {
      const v = Math.round(noiseGrid[i] * 255);
      const base = i * 4;
      if (tintMap && tintMap[i] > 0) {
        const tint = tintMap[i] / 255;
        data[base] = Math.round(v * (1 - tint) + 51 * tint);
        data[base + 1] = Math.round(v * (1 - tint) + 255 * tint);
        data[base + 2] = Math.round(v * (1 - tint) + 51 * tint);
      } else {
        data[base] = v;
        data[base + 1] = v;
        data[base + 2] = v;
      }
      data[base + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }, [noiseGrid, gridWidth, gridHeight, tintMap]);

  useEffect(() => {
    render();
  }, [render]);

  return (
    <div ref={containerRef} style={styles.container}>
      <canvas
        ref={canvasRef}
        width={gridWidth}
        height={gridHeight}
        style={styles.canvas}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  canvas: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    imageRendering: "pixelated",
  },
};
