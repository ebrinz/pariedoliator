import { describe, it, expect } from "vitest";
import {
  extractLSBNoise,
  noiseToAudioSamples,
  noiseToPixelGrid,
} from "@/lib/noise-extraction";

function makeImageData(pixels: number[][]): ImageData {
  const width = pixels[0].length / 4;
  const height = pixels.length;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width * 4; x++) {
      data[y * width * 4 + x] = pixels[y][x];
    }
  }
  return { data, width, height, colorSpace: "srgb" } as ImageData;
}

describe("extractLSBNoise", () => {
  it("extracts 1 LSB per channel from each pixel", () => {
    const img = makeImageData([[0xfe, 0x01, 0xaa, 0xff]]);
    const bits = extractLSBNoise(img, 1);
    expect(bits[0]).toBe(0);
    expect(bits[1]).toBe(1);
    expect(bits[2]).toBe(0);
  });

  it("extracts 2 LSBs per channel", () => {
    const img = makeImageData([[0xfd, 0x03, 0xa8, 0xff]]);
    const bits = extractLSBNoise(img, 2);
    expect(bits.length).toBe(6);
    expect(bits[0]).toBe(0);
    expect(bits[1]).toBe(1);
    expect(bits[2]).toBe(1);
    expect(bits[3]).toBe(1);
    expect(bits[4]).toBe(0);
    expect(bits[5]).toBe(0);
  });
});

describe("noiseToAudioSamples", () => {
  it("packs bits into 8-bit unsigned PCM samples", () => {
    const bits = new Uint8Array([1, 1, 0, 0, 0, 0, 0, 1]);
    const samples = noiseToAudioSamples(bits);
    expect(samples[0]).toBeCloseTo(193 / 255 * 2 - 1, 2);
  });

  it("discards leftover bits that don't fill a byte", () => {
    const bits = new Uint8Array([1, 1, 0, 0, 0, 0, 0, 1, 1, 1]);
    const samples = noiseToAudioSamples(bits);
    expect(samples.length).toBe(1);
  });
});

describe("noiseToPixelGrid", () => {
  it("converts bits to a grayscale grid matching source dimensions", () => {
    const bits = new Uint8Array([1, 0, 1, 0, 1, 0]);
    const grid = noiseToPixelGrid(bits, 2, 1);
    expect(grid.length).toBe(2);
    expect(grid[0]).toBeGreaterThan(0);
    expect(grid[1]).toBeGreaterThan(0);
  });
});
