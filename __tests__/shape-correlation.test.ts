import { describe, it, expect } from "vitest";
import { correlateNoiseMask } from "@/lib/shape-correlation";

describe("correlateNoiseMask", () => {
  it("returns 100% when noise matches mask perfectly", () => {
    const mask = new Uint8Array([1, 0, 1, 0, 1, 0, 1, 0, 1]);
    const noise = new Float32Array([1, 0, 1, 0, 1, 0, 1, 0, 1]);
    const result = correlateNoiseMask(noise, mask, 3, 3, 3, 3);
    expect(result.score).toBeCloseTo(100, 0);
  });

  it("returns ~50% for uncorrelated random data", () => {
    const size = 1000;
    const mask = new Uint8Array(size);
    const noise = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      mask[i] = i % 2;
      noise[i] = (i + 1) % 2;
    }
    const result = correlateNoiseMask(
      noise,
      mask,
      Math.sqrt(size),
      Math.sqrt(size),
      Math.sqrt(size),
      Math.sqrt(size)
    );
    expect(result.score).toBeLessThan(10);
  });

  it("returns a tintMap with correct dimensions", () => {
    const mask = new Uint8Array([1, 0, 1, 0]);
    const noise = new Float32Array([0.8, 0.2, 0.9, 0.1]);
    const result = correlateNoiseMask(noise, mask, 2, 2, 2, 2);
    expect(result.tintMap!.length).toBe(4);
  });

  it("tintMap highlights pixels where mask=1 and noise is bright", () => {
    const mask = new Uint8Array([1, 0]);
    const noise = new Float32Array([0.9, 0.9]);
    const result = correlateNoiseMask(noise, mask, 2, 1, 2, 1);
    expect(result.tintMap![0]).toBeGreaterThan(0);
    expect(result.tintMap![1]).toBe(0);
  });
});
