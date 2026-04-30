export type ZenerShape = "circle" | "triangle" | "square" | "star" | "plus";

export function generatePresetMask(
  shape: ZenerShape,
  width: number,
  height: number
): Uint8Array {
  const mask = new Uint8Array(width * height);
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.4;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const dx = x - cx;
      const dy = y - cy;

      switch (shape) {
        case "circle":
          mask[idx] = Math.sqrt(dx * dx + dy * dy) <= r ? 1 : 0;
          break;

        case "square":
          mask[idx] = Math.abs(dx) <= r * 0.8 && Math.abs(dy) <= r * 0.8 ? 1 : 0;
          break;

        case "triangle": {
          const normX = dx / r;
          const normY = -dy / r;
          const inTri =
            normY >= -0.7 &&
            normY <= 0.8 &&
            normX >= -(0.8 - (normY + 0.7) * 0.533) &&
            normX <= 0.8 - (normY + 0.7) * 0.533;
          mask[idx] = inTri ? 1 : 0;
          break;
        }

        case "plus":
          mask[idx] =
            (Math.abs(dx) <= r * 0.25 && Math.abs(dy) <= r * 0.8) ||
            (Math.abs(dy) <= r * 0.25 && Math.abs(dx) <= r * 0.8)
              ? 1
              : 0;
          break;

        case "star": {
          const outerR = r;
          const innerR = r * 0.38;
          const pts: [number, number][] = [];
          for (let k = 0; k < 10; k++) {
            const a = (k * Math.PI) / 5 - Math.PI / 2;
            const pr = k % 2 === 0 ? outerR : innerR;
            pts.push([cx + pr * Math.cos(a), cy + pr * Math.sin(a)]);
          }
          let inside = false;
          for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const [xi, yi] = pts[i];
            const [xj, yj] = pts[j];
            if (
              yi > y !== yj > y &&
              x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
            ) {
              inside = !inside;
            }
          }
          mask[idx] = inside ? 1 : 0;
          break;
        }
      }
    }
  }

  return mask;
}
