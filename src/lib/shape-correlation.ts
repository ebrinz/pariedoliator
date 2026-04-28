import type { CoherenceResult } from "@/types";

export function correlateNoiseMask(
  noise: Float32Array,
  mask: Uint8Array,
  noiseW: number,
  noiseH: number,
  maskW: number,
  maskH: number
): CoherenceResult {
  const tintMap = new Uint8Array(noiseW * noiseH);

  const scaleX = maskW / noiseW;
  const scaleY = maskH / noiseH;

  let matchCount = 0;
  let maskPixelCount = 0;

  for (let y = 0; y < noiseH; y++) {
    for (let x = 0; x < noiseW; x++) {
      const mx = Math.min(Math.floor(x * scaleX), maskW - 1);
      const my = Math.min(Math.floor(y * scaleY), maskH - 1);
      const maskVal = mask[my * maskW + mx];

      if (maskVal > 0) {
        maskPixelCount++;
        const noiseVal = noise[y * noiseW + x];
        const threshold = 0.5;

        if (noiseVal >= threshold) {
          matchCount++;
          const intensity = Math.round(
            ((noiseVal - threshold) / (1 - threshold)) * 180
          );
          tintMap[y * noiseW + x] = intensity;
        }
      }
    }
  }

  const score =
    maskPixelCount > 0 ? (matchCount / maskPixelCount) * 100 : 0;

  return { score, tintMap };
}
