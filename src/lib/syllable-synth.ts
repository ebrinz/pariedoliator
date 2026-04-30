const SAMPLE_RATE = 16000;

interface SyllableManifest {
  count: number;
  entries: { id: number; text: string; offset: number; length: number }[];
}

let audioData: Float32Array | null = null;
let manifest: SyllableManifest | null = null;
let loading = false;
let ready = false;

export function isSyllableSynthReady(): boolean {
  return ready;
}

export async function loadSyllableSprite(): Promise<void> {
  if (ready || loading) return;
  loading = true;

  const [manifestRes, audioRes] = await Promise.all([
    fetch("/syllables.json"),
    fetch("/syllables.bin"),
  ]);

  manifest = await manifestRes.json();
  const buf = await audioRes.arrayBuffer();
  audioData = new Float32Array(buf);
  ready = true;
  loading = false;
}

let outputBuffer: Float32Array = new Float32Array(0);
let outputPos = 0;

export function generateFromNoise(noise: Float32Array): Float32Array {
  if (!ready || !audioData || !manifest) return noise;

  const out = new Float32Array(noise.length);
  let outIdx = 0;

  while (outIdx < out.length) {
    // If we have buffered output left, use it
    if (outputPos < outputBuffer.length) {
      const remaining = outputBuffer.length - outputPos;
      const needed = out.length - outIdx;
      const toCopy = Math.min(remaining, needed);
      out.set(outputBuffer.subarray(outputPos, outputPos + toCopy), outIdx);
      outputPos += toCopy;
      outIdx += toCopy;
      continue;
    }

    // Generate a new utterance: 4-8 syllables grouped into 1-3 "words"
    const syllableCount = 4 + Math.floor(Math.abs(noise[outIdx % noise.length]) * 5);
    const segments: Float32Array[] = [];
    let totalLen = 0;

    for (let s = 0; s < syllableCount; s++) {
      // Use noise to pick syllable index
      const noiseIdx = (outIdx + s * 137) % noise.length;
      const syllIdx = Math.floor(Math.abs(noise[noiseIdx]) * manifest.count) % manifest.count;
      const entry = manifest.entries[syllIdx];

      const clip = audioData.subarray(entry.offset, entry.offset + entry.length);
      segments.push(clip);
      totalLen += clip.length;

      // Add small gap between syllables, bigger gap between "words"
      const isWordBreak = s > 0 && Math.abs(noise[(noiseIdx + 31) % noise.length]) > 0.6;
      const gapMs = isWordBreak ? 80 + Math.abs(noise[noiseIdx]) * 120 : 10 + Math.abs(noise[noiseIdx]) * 30;
      const gapSamples = Math.floor((gapMs / 1000) * SAMPLE_RATE);
      totalLen += gapSamples;
      segments.push(new Float32Array(gapSamples));
    }

    // Add sentence-end pause
    const pauseSamples = Math.floor(0.2 * SAMPLE_RATE);
    totalLen += pauseSamples;

    // Concatenate
    outputBuffer = new Float32Array(totalLen + pauseSamples);
    let pos = 0;
    for (const seg of segments) {
      outputBuffer.set(seg, pos);
      pos += seg.length;
    }
    outputPos = 0;
  }

  return out;
}

export function resetSyllableSynth() {
  outputBuffer = new Float32Array(0);
  outputPos = 0;
}
