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

  let insideSum = 0;
  let insideCount = 0;
  let outsideSum = 0;
  let outsideCount = 0;

  for (let y = 0; y < noiseH; y++) {
    for (let x = 0; x < noiseW; x++) {
      const mx = Math.min(Math.floor(x * scaleX), maskW - 1);
      const my = Math.min(Math.floor(y * scaleY), maskH - 1);
      const maskVal = mask[my * maskW + mx];
      const noiseVal = noise[y * noiseW + x];

      if (maskVal > 0) {
        insideSum += noiseVal;
        insideCount++;

        if (noiseVal >= 0.5) {
          const intensity = Math.round(
            ((noiseVal - 0.5) / 0.5) * 180
          );
          tintMap[y * noiseW + x] = intensity;
        }
      } else {
        outsideSum += noiseVal;
        outsideCount++;
      }
    }
  }

  if (insideCount === 0 || outsideCount === 0) return { score: 0, tintMap };

  const meanInside = insideSum / insideCount;
  const meanOutside = outsideSum / outsideCount;
  const contrast = meanInside - meanOutside;

  // Compute pooled variance for z-score
  let varInside = 0;
  let varOutside = 0;

  for (let y = 0; y < noiseH; y++) {
    for (let x = 0; x < noiseW; x++) {
      const mx = Math.min(Math.floor(x * scaleX), maskW - 1);
      const my = Math.min(Math.floor(y * scaleY), maskH - 1);
      const maskVal = mask[my * maskW + mx];
      const noiseVal = noise[y * noiseW + x];

      if (maskVal > 0) {
        const d = noiseVal - meanInside;
        varInside += d * d;
      } else {
        const d = noiseVal - meanOutside;
        varOutside += d * d;
      }
    }
  }

  varInside /= insideCount;
  varOutside /= outsideCount;

  // Require meaningful effect size — tiny sensor bias with huge N shouldn't score high
  const minContrast = 0.03;
  if (Math.abs(contrast) < minContrast) return { score: 50, tintMap };

  const se = Math.sqrt(varInside / insideCount + varOutside / outsideCount);
  let z: number;
  if (se > 0) {
    z = contrast / se;
  } else {
    z = contrast > 0.001 ? 5 : contrast < -0.001 ? -5 : 0;
  }

  // Scale by effect size so weak-but-significant effects don't max out
  const effectScale = Math.min(1, Math.abs(contrast) / 0.15);
  const rawScore = (z / 4) * 50 + 50;
  const score = Math.max(0, Math.min(100, 50 + (rawScore - 50) * effectScale));

  return { score, tintMap };
}
