import { pipeline } from "@xenova/transformers";
import { NoiseBabbleSynth } from "../src/lib/phoneme-babble";

const SAMPLE_RATE = 16000;
const CHUNK_SECONDS = 5;
const CHUNK_SAMPLES = SAMPLE_RATE * CHUNK_SECONDS;
const RUNS_PER_COMBO = 2;

const PROMPTS = [
  "The strange voice whispered something about",
  "She kept repeating the same warning over and over",
  "The recording was barely audible but seemed to say",
  "In the static between stations you could almost hear",
  "The old tape recorder played back fragments of",
  "Someone on the other end of the line was saying",
  "Through the interference came what sounded like",
  "The last transmission before contact was lost said",
];

interface SweepResult {
  seed: number;
  temperature: number;
  prompt: string;
  text: string;
  isTag: boolean;
  wordCount: number;
  uniqueWords: number;
}

function generateNoise(length: number): Float32Array {
  const buf = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    buf[i] = Math.random() * 2 - 1;
  }
  return buf;
}

function scoreResult(text: string): { isTag: boolean; wordCount: number; uniqueWords: number } {
  const trimmed = text.trim();
  const isTag = /^\[.*\]$/.test(trimmed) || /^\(.*\)$/.test(trimmed) || trimmed === "";
  const words = trimmed.replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean);
  const unique = new Set(words.map(w => w.toLowerCase()));
  return { isTag, wordCount: words.length, uniqueWords: unique.size };
}

async function main() {
  console.log("Loading Whisper small...");
  const transcriber = await pipeline(
    "automatic-speech-recognition",
    "Xenova/whisper-small",
    { quantized: true }
  );
  console.log("Model loaded.\n");

  const seeds = [10, 20, 30, 40, 50];
  const temperatures = [0.8, 1.0];

  const results: SweepResult[] = [];
  let promptIdx = 0;

  for (const seed of seeds) {
    for (const temp of temperatures) {
      for (let run = 0; run < RUNS_PER_COMBO; run++) {
        const synth = new NoiseBabbleSynth();
        synth.setSeed(seed);

        const noise = generateNoise(CHUNK_SAMPLES);
        const audio = synth.process(noise);

        const prompt = PROMPTS[promptIdx % PROMPTS.length];
        promptIdx++;

        const result = await transcriber(audio, {
          return_timestamps: false,
          language: "en",
          task: "transcribe",
          temperature: Math.max(temp, 0.6),
          no_speech_threshold: 0.99,
          compression_ratio_threshold: 10.0,
          prompt,
        } as any);

        const text = (result as { text: string }).text.trim();
        const score = scoreResult(text);

        results.push({ seed, temperature: temp, prompt: prompt.substring(0, 30), text, ...score });

        const marker = score.isTag ? "TAG" : `${score.uniqueWords}w`;
        console.log(`seed=${seed.toString().padStart(3)} temp=${temp.toFixed(1)} p="${prompt.substring(0, 25)}..." [${marker}] ${text.substring(0, 70)}`);
      }
    }
  }

  console.log("\n=== SUMMARY ===\n");

  // Group by seed
  const bySeed = new Map<number, SweepResult[]>();
  for (const r of results) {
    if (!bySeed.has(r.seed)) bySeed.set(r.seed, []);
    bySeed.get(r.seed)!.push(r);
  }

  console.log("SEED | Word% | AvgUnique | AvgWords | BestTemp");
  console.log("-----|-------|-----------|----------|--------");

  for (const [seed, runs] of bySeed) {
    const wordRuns = runs.filter(r => !r.isTag);
    const wordPct = ((wordRuns.length / runs.length) * 100).toFixed(0);
    const avgUnique = wordRuns.length > 0
      ? (wordRuns.reduce((s, r) => s + r.uniqueWords, 0) / wordRuns.length).toFixed(1)
      : "0";
    const avgWords = wordRuns.length > 0
      ? (wordRuns.reduce((s, r) => s + r.wordCount, 0) / wordRuns.length).toFixed(1)
      : "0";

    // Find best temperature for this seed
    const byTemp = new Map<number, SweepResult[]>();
    for (const r of runs) {
      if (!byTemp.has(r.temperature)) byTemp.set(r.temperature, []);
      byTemp.get(r.temperature)!.push(r);
    }
    let bestTemp = 0.6;
    let bestScore = -1;
    for (const [t, tRuns] of byTemp) {
      const score = tRuns.filter(r => !r.isTag).reduce((s, r) => s + r.uniqueWords, 0);
      if (score > bestScore) { bestScore = score; bestTemp = t; }
    }

    console.log(
      `${seed.toString().padStart(4)} | ${wordPct.padStart(4)}% | ${avgUnique.padStart(9)} | ${avgWords.padStart(8)} | ${bestTemp.toFixed(1)}`
    );
  }

  // Group by temperature
  console.log("\nTEMP | Word% | AvgUnique");
  console.log("-----|-------|----------");

  const byTemp = new Map<number, SweepResult[]>();
  for (const r of results) {
    if (!byTemp.has(r.temperature)) byTemp.set(r.temperature, []);
    byTemp.get(r.temperature)!.push(r);
  }

  for (const [temp, runs] of byTemp) {
    const wordRuns = runs.filter(r => !r.isTag);
    const wordPct = ((wordRuns.length / runs.length) * 100).toFixed(0);
    const avgUnique = wordRuns.length > 0
      ? (wordRuns.reduce((s, r) => s + r.uniqueWords, 0) / wordRuns.length).toFixed(1)
      : "0";
    console.log(`${temp.toFixed(1).padStart(4)} | ${wordPct.padStart(4)}% | ${avgUnique.padStart(9)}`);
  }

  // Collect all unique hallucinated phrases
  const wordResults = results.filter(r => !r.isTag && r.uniqueWords >= 3);
  const allPhrases = new Set(wordResults.map(r => r.text.substring(0, 80)));

  console.log(`\n=== HALLUCINATION SWEET SPOTS (${wordResults.length} hits, ${allPhrases.size} unique phrases) ===`);
  if (wordResults.length > 0) {
    wordResults.sort((a, b) => b.uniqueWords - a.uniqueWords);
    for (const r of wordResults.slice(0, 15)) {
      console.log(`  seed=${r.seed} temp=${r.temperature} p="${r.prompt}" unique=${r.uniqueWords}`);
      console.log(`    "${r.text.substring(0, 100)}"`);
    }
  } else {
    console.log("  No rich hallucinations. Try wider parameter ranges.");
  }

  console.log(`\n=== ALL UNIQUE PHRASES ===`);
  for (const p of allPhrases) {
    console.log(`  "${p}"`);
  }
}

main().catch(console.error);
