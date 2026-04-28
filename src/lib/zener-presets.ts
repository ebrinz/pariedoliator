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
          const normY = dy / r;
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
          const angle = Math.atan2(dy, dx);
          const dist = Math.sqrt(dx * dx + dy * dy);
          const starR =
            r * (0.4 + 0.6 * Math.abs(Math.cos(2.5 * angle)));
          mask[idx] = dist <= starR ? 1 : 0;
          break;
        }
      }
    }
  }

  return mask;
}
