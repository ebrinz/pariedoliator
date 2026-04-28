export function extractLSBNoise(
  imageData: ImageData,
  lsbCount: number = 1
): Uint8Array {
  const { data } = imageData;
  const pixelCount = data.length / 4;
  const bitsPerPixel = 3 * lsbCount;
  const result = new Uint8Array(pixelCount * bitsPerPixel);
  let idx = 0;

  for (let p = 0; p < pixelCount; p++) {
    const base = p * 4;
    for (let ch = 0; ch < 3; ch++) {
      const val = data[base + ch];
      for (let b = lsbCount - 1; b >= 0; b--) {
        result[idx++] = (val >> b) & 1;
      }
    }
  }

  return result;
}

export function noiseToAudioSamples(bits: Uint8Array): Float32Array {
  const sampleCount = Math.floor(bits.length / 8);
  const samples = new Float32Array(sampleCount);

  for (let i = 0; i < sampleCount; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | bits[i * 8 + b];
    }
    samples[i] = (byte / 255) * 2 - 1;
  }

  return samples;
}

export function noiseToPixelGrid(
  bits: Uint8Array,
  width: number,
  height: number
): Float32Array {
  const pixelCount = width * height;
  const bitsPerPixel = Math.floor(bits.length / pixelCount);
  const grid = new Float32Array(pixelCount);

  for (let p = 0; p < pixelCount; p++) {
    let sum = 0;
    for (let b = 0; b < bitsPerPixel; b++) {
      sum += bits[p * bitsPerPixel + b];
    }
    grid[p] = sum / bitsPerPixel;
  }

  return grid;
}
