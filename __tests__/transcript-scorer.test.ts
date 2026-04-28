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

  it("scores longer coherent phrases higher", () => {
    const short = scorePhraseCoherence(["the", "house"]);
    const long = scorePhraseCoherence(["the", "house", "is", "on"]);
    expect(long).toBeGreaterThanOrEqual(short);
  });
});
