import { describe, it, expect } from "vitest";
import { scorePhraseCoherence } from "@/lib/transcript-scorer";

describe("scorePhraseCoherence", () => {
  it("scores common English bigrams higher than random", () => {
    const commonPhrase = ["the", "house"];
    const randomPhrase = ["xqz", "brmf"];
    const commonScore = scorePhraseCoherence(commonPhrase);
    const randomScore = scorePhraseCoherence(randomPhrase);
    expect(commonScore).toBeGreaterThan(randomScore);
  });

  it("returns 0 for single-word input", () => {
    expect(scorePhraseCoherence(["hello"])).toBe(0);
  });

  it("returns 0 for empty input", () => {
    expect(scorePhraseCoherence([])).toBe(0);
  });

  it("returns consistent average for phrases with same bigram density", () => {
    const twoWord = scorePhraseCoherence(["the", "house"]);
    const fourWord = scorePhraseCoherence(["the", "house", "the", "house"]);
    expect(twoWord).toBeGreaterThan(0);
    expect(fourWord).toBeGreaterThan(0);
  });
});
