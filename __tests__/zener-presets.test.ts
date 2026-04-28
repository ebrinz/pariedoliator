import { describe, it, expect } from "vitest";
import { generatePresetMask } from "@/lib/zener-presets";

describe("generatePresetMask", () => {
  it("generates a 120x120 binary mask", () => {
    const mask = generatePresetMask("circle", 120, 120);
    expect(mask.length).toBe(120 * 120);
  });

  it("circle has filled pixels in center", () => {
    const mask = generatePresetMask("circle", 120, 120);
    expect(mask[60 * 120 + 60]).toBe(1);
  });

  it("circle has empty pixels in corners", () => {
    const mask = generatePresetMask("circle", 120, 120);
    expect(mask[0]).toBe(0);
    expect(mask[119]).toBe(0);
  });

  it("all five presets produce non-empty masks", () => {
    const shapes = ["circle", "triangle", "square", "star", "plus"] as const;
    for (const shape of shapes) {
      const mask = generatePresetMask(shape, 120, 120);
      const sum = mask.reduce((a, b) => a + b, 0);
      expect(sum).toBeGreaterThan(0);
    }
  });
});
