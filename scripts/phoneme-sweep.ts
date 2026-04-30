import { pipeline } from "@xenova/transformers";
import { execSync } from "child_process";
import { readFileSync, unlinkSync, mkdirSync } from "fs";

const RUNS = 30;
const VOICES = ["Samantha", "Daniel", "Fred", "Kathy", "Junior"];

const ONSETS = [
  "", "b", "d", "f", "g", "h", "k", "l", "m", "n", "p", "r", "s", "t", "v", "w", "z",
  "th", "sh", "ch", "br", "kr", "gr", "fl", "pl", "tr", "sk", "sp", "st",
];
const VOWELS = ["a", "e", "i", "o", "u", "ah", "oh", "ee", "oo", "ay", "ey", "ow"];
const CODAS = ["", "", "", "n", "m", "s", "t", "l", "r", "k", "th", "ng", "nd", "st"];

function randomSyllable(): string {
  const onset = ONSETS[Math.floor(Math.random() * ONSETS.length)];
  const vowel = VOWELS[Math.floor(Math.random() * VOWELS.length)];
  const coda = CODAS[Math.floor(Math.random() * CODAS.length)];
  return onset + vowel + coda;
}

function randomUtterance(syllableCount: number): string {
  const words: string[] = [];
  let remaining = syllableCount;
  while (remaining > 0) {
    const wordLen = Math.min(remaining, 1 + Math.floor(Math.random() * 3));
    const syllables: string[] = [];
    for (let i = 0; i < wordLen; i++) {
      syllables.push(randomSyllable());
    }
    words.push(syllables.join(""));
    remaining -= wordLen;
  }
  return words.join(" ");
}

function sayToBuffer(text: string, voice: string): Float32Array {
  const tmpAiff = `/tmp/pareidolator-say-${Date.now()}.aiff`;
  const tmpRaw = `/tmp/pareidolator-say-${Date.now()}.raw`;

  try {
    execSync(`say -v "${voice}" -r 140 -o "${tmpAiff}" "${text.replace(/"/g, '\\"')}"`, {
      timeout: 10000,
    });

    // Convert AIFF to 16kHz mono raw PCM using afconvert (macOS built-in)
    execSync(
      `afconvert -f caff -d LEI16@16000 -c 1 "${tmpAiff}" "${tmpRaw}"`,
      { timeout: 10000 }
    );

    const raw = readFileSync(tmpRaw);
    // CAF has a header; skip it and read as int16 LE
    // Actually, let's use a simpler approach: output raw PCM directly
    unlinkSync(tmpAiff);
    unlinkSync(tmpRaw);

    // Use afconvert to raw PCM instead
    const tmpPcm = `/tmp/pareidolator-say-${Date.now()}.pcm`;
    execSync(`say -v "${voice}" -r 140 -o "${tmpAiff}" "${text.replace(/"/g, '\\"')}"`, {
      timeout: 10000,
    });
    execSync(
      `afconvert -f 'WAVE' -d LEI16@16000 -c 1 "${tmpAiff}" "${tmpPcm}"`,
      { timeout: 10000 }
    );

    const wavBuf = readFileSync(tmpPcm);
    // WAV header is 44 bytes
    const pcmData = wavBuf.subarray(44);
    const samples = new Float32Array(pcmData.length / 2);
    for (let i = 0; i < samples.length; i++) {
      const int16 = pcmData[i * 2] | (pcmData[i * 2 + 1] << 8);
      samples[i] = (int16 > 32767 ? int16 - 65536 : int16) / 32768;
    }

    try { unlinkSync(tmpAiff); } catch {}
    try { unlinkSync(tmpPcm); } catch {}

    return samples;
  } catch (err) {
    try { unlinkSync(tmpAiff); } catch {}
    try { unlinkSync(tmpRaw); } catch {}
    throw err;
  }
}

function scoreResult(text: string): { isTag: boolean; wordCount: number; uniqueWords: number } {
  const trimmed = text.trim();
  const isTag = /^\[.*\]$/.test(trimmed) || /^\(.*\)$/.test(trimmed) || trimmed === "";
  const words = trimmed.replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean);
  const unique = new Set(words.map(w => w.toLowerCase()));
  return { isTag, wordCount: words.length, uniqueWords: unique.size };
}

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

async function main() {
  console.log("Loading Whisper tiny...");
  const transcriber = await pipeline(
    "automatic-speech-recognition",
    "Xenova/whisper-tiny",
    { quantized: true }
  );
  console.log("Model loaded.\n");

  const allPhrases = new Set<string>();
  let wordHits = 0;
  let promptIdx = 0;

  for (let run = 0; run < RUNS; run++) {
    const syllables = 6 + Math.floor(Math.random() * 10);
    const utterance = randomUtterance(syllables);
    const voice = VOICES[run % VOICES.length];
    const prompt = PROMPTS[promptIdx % PROMPTS.length];
    promptIdx++;

    let audio: Float32Array;
    try {
      audio = sayToBuffer(utterance, voice);
    } catch (err) {
      console.log(`  [ERR] voice=${voice} text="${utterance}" — ${err}`);
      continue;
    }

    // Pad short audio to at least 1s
    if (audio.length < 16000) {
      const padded = new Float32Array(16000);
      padded.set(audio);
      audio = padded;
    }

    const result = await transcriber(audio, {
      return_timestamps: false,
      language: "en",
      task: "transcribe",
      temperature: 0.8,
      no_speech_threshold: 0.99,
      compression_ratio_threshold: 10.0,
      prompt,
    } as any);

    const text = (result as { text: string }).text.trim();
    const score = scoreResult(text);

    const marker = score.isTag ? "TAG" : `${score.uniqueWords}w`;
    console.log(`[${(run + 1).toString().padStart(2)}] v=${voice.padEnd(8)} phonemes="${utterance.substring(0, 35).padEnd(35)}" [${marker}]`);
    console.log(`     → "${text.substring(0, 90)}"`);

    if (!score.isTag && score.uniqueWords >= 2) {
      wordHits++;
      allPhrases.add(text.substring(0, 100));
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Word hallucinations: ${wordHits}/${RUNS} (${((wordHits / RUNS) * 100).toFixed(0)}%)`);
  console.log(`Unique phrases: ${allPhrases.size}`);
  console.log(`\n=== ALL HALLUCINATED PHRASES ===`);
  for (const p of allPhrases) {
    console.log(`  "${p}"`);
  }
}

main().catch(console.error);
