import { describe, it, expect } from "vitest";
import { correlateNoiseMask } from "@/lib/shape-correlation";

describe("correlateNoiseMask", () => {
  it("scores strongly positive when noise is bright inside and dark outside mask", () => {
    const w = 10, h = 10, size = w * h;
    const mask = new Uint8Array(size);
    const noise = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      mask[i] = i < size / 2 ? 1 : 0;
      noise[i] = i < size / 2 ? 0.9 : 0.1;
    }
    const result = correlateNoiseMask(noise, mask, w, h, w, h);
    expect(result.score).toBeGreaterThan(0.8);
  });

  it("scores near 0 for uniform noise regardless of mask", () => {
    const w = 20, h = 20, size = w * h;
    const mask = new Uint8Array(size);
    const noise = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      mask[i] = i < size / 2 ? 1 : 0;
      noise[i] = 0.5;
    }
    const result = correlateNoiseMask(noise, mask, w, h, w, h);
    expect(result.score).toBeGreaterThanOrEqual(-0.1);
    expect(result.score).toBeLessThanOrEqual(0.1);
  });

  it("scores strongly negative when noise is inverted relative to mask", () => {
    const w = 10, h = 10, size = w * h;
    const mask = new Uint8Array(size);
    const noise = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      mask[i] = i < size / 2 ? 1 : 0;
      noise[i] = i < size / 2 ? 0.1 : 0.9;
    }
    const result = correlateNoiseMask(noise, mask, w, h, w, h);
    expect(result.score).toBeLessThan(-0.8);
  });

  it("all-bright noise scores near 0 (no contrast)", () => {
    const w = 10, h = 10, size = w * h;
    const mask = new Uint8Array(size);
    const noise = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      mask[i] = i < size / 3 ? 1 : 0;
      noise[i] = 1.0;
    }
    const result = correlateNoiseMask(noise, mask, w, h, w, h);
    expect(result.score).toBeGreaterThanOrEqual(-0.1);
    expect(result.score).toBeLessThanOrEqual(0.1);
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
