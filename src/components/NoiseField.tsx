"use client";

import { useRef, useEffect, useCallback } from "react";
import { VHSRenderer } from "@/lib/vhs-renderer";

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
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<VHSRenderer | null>(null);
  const startTimeRef = useRef(performance.now());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const source = document.createElement("canvas");
    source.width = gridWidth;
    source.height = gridHeight;
    sourceCanvasRef.current = source;
  }, [gridWidth, gridHeight]);

  useEffect(() => {
    const glCanvas = glCanvasRef.current;
    if (!glCanvas) return;
    glCanvas.width = gridWidth;
    glCanvas.height = gridHeight;
    try {
      rendererRef.current = new VHSRenderer(glCanvas);
    } catch {
      // WebGL not available — fall back to showing source canvas directly
    }
    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, [gridWidth, gridHeight]);

  useEffect(() => {
    const source = sourceCanvasRef.current;
    if (!source || !noiseGrid) return;
    const ctx = source.getContext("2d");
    if (!ctx) return;

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

    if (rendererRef.current) {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      rendererRef.current.render(source, elapsed);
    }
  }, [noiseGrid, gridWidth, gridHeight, tintMap]);

  return (
    <div style={styles.container}>
      <canvas ref={glCanvasRef} style={styles.canvas} />
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
  },
};
