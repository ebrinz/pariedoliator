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
  const threshold = 0.5;

  for (let y = 0; y < noiseH; y++) {
    for (let x = 0; x < noiseW; x++) {
      const mx = Math.min(Math.floor(x * scaleX), maskW - 1);
      const my = Math.min(Math.floor(y * scaleY), maskH - 1);
      const maskVal = mask[my * maskW + mx];

      if (maskVal > 0) {
        maskPixelCount++;
        const noiseVal = noise[y * noiseW + x];

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

  if (maskPixelCount === 0) return { score: 0, tintMap };

  // z-score: how far above the expected 50% random baseline
  const observed = matchCount / maskPixelCount;
  const expected = 0.5;
  const stddev = Math.sqrt((expected * (1 - expected)) / maskPixelCount);
  const z = stddev > 0 ? (observed - expected) / stddev : 0;

  // Map z-score to 0-100: z=0 → 50%, z>=3 → 100%, z<=-3 → 0%
  const score = Math.max(0, Math.min(100, (z / 3) * 50 + 50));

  return { score, tintMap };
}
