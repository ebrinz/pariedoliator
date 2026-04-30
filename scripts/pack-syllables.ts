import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const SYLLABLES_DIR = join(__dirname, "syllables");
const PUBLIC_DIR = join(__dirname, "..", "public");

const ONSETS = ["", "b", "d", "f", "g", "h", "k", "l", "m", "n", "p", "r", "s", "t", "v", "w", "z", "th", "sh", "ch"];
const VOWELS = ["ah", "eh", "ee", "oh", "oo", "ay", "ow", "uh"];

interface SyllableEntry {
  id: number;
  text: string;
  offset: number;
  length: number;
}

const manifest: SyllableEntry[] = [];
const allSamples: number[] = [];

let id = 0;
for (const onset of ONSETS) {
  for (const vowel of VOWELS) {
    const text = onset + vowel;
    const wavPath = join(SYLLABLES_DIR, `${id}.wav`);
    const wavBuf = readFileSync(wavPath);

    // WAV header is 44 bytes, data is 16-bit LE PCM
    const pcmData = wavBuf.subarray(44);
    const sampleCount = pcmData.length / 2;
    const offset = allSamples.length;

    for (let i = 0; i < sampleCount; i++) {
      const int16 = pcmData[i * 2] | (pcmData[i * 2 + 1] << 8);
      allSamples.push((int16 > 32767 ? int16 - 65536 : int16) / 32768);
    }

    manifest.push({ id, text, offset, length: sampleCount });
    id++;
  }
}

// Write manifest
writeFileSync(
  join(PUBLIC_DIR, "syllables.json"),
  JSON.stringify({ count: manifest.length, entries: manifest })
);

// Write audio as Float32 binary
const float32 = new Float32Array(allSamples);
writeFileSync(join(PUBLIC_DIR, "syllables.bin"), Buffer.from(float32.buffer));

const totalMs = (allSamples.length / 16000 * 1000).toFixed(0);
const sizeMB = (float32.byteLength / 1024 / 1024).toFixed(1);
console.log(`Packed ${manifest.length} syllables`);
console.log(`Total audio: ${totalMs}ms (${allSamples.length} samples)`);
console.log(`Binary size: ${sizeMB}MB`);
console.log(`Files: public/syllables.json, public/syllables.bin`);
