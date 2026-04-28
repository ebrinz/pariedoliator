import { getBigramScore } from "./bigrams";

export function scorePhraseCoherence(words: string[]): number {
  if (words.length < 2) return 0;

  let totalScore = 0;
  let pairCount = 0;

  for (let i = 0; i < words.length - 1; i++) {
    const score = getBigramScore(words[i], words[i + 1]);
    totalScore += score;
    pairCount++;
  }

  return totalScore;
}
