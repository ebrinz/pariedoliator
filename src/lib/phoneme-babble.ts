const SAMPLE_RATE = 16000;

const VOWEL_TARGETS = [
  { f1: 730, f2: 1090 },  // "ah" (open front)
  { f1: 400, f2: 2050 },  // "ee" (close front)
  { f1: 570, f2: 840 },   // "aw" (open back)
  { f1: 440, f2: 1020 },  // "uh" (mid central)
  { f1: 300, f2: 870 },   // "oo" (close back)
  { f1: 660, f2: 1720 },  // "eh" (open-mid front)
  { f1: 520, f2: 1190 },  // "er" (mid central r-colored)
  { f1: 390, f2: 2300 },  // "ih" (near-close front)
];

class OnePoleLPF {
  state = 0;

  smooth(input: number, cutoffHz: number): number {
    const alpha = 1 - Math.exp((-2 * Math.PI * cutoffHz) / SAMPLE_RATE);
    this.state += alpha * (input - this.state);
    return this.state;
  }
}

class Resonator {
  y1 = 0;
  y2 = 0;

  process(input: number, freq: number, bw: number): number {
    const r = Math.exp((-Math.PI * bw) / SAMPLE_RATE);
    const theta = (2 * Math.PI * freq) / SAMPLE_RATE;
    const a1 = -2 * r * Math.cos(theta);
    const a2 = r * r;
    const out = input - a1 * this.y1 - a2 * this.y2;
    this.y2 = this.y1;
    this.y1 = out;
    return out;
  }
}

function glottalPulse(phase: number): number {
  const p = phase % 1;
  return p < 0.5 ? 1 - 4 * p * p : -1 + 4 * (p - 1) * (p - 1);
}

export class NoiseBabbleSynth {
  private glottalPhase = 0;
  private vibratoPhase = 0;

  private res1 = new Resonator();
  private res2 = new Resonator();
  private res3 = new Resonator();

  private f1Current = 500;
  private f2Current = 1500;
  private f1Target = 500;
  private f2Target = 1500;

  private syllableCounter = 0;
  private syllableDuration = 0;
  private syllablePhase = 0;
  private inSilence = false;
  private silenceRemaining = 0;

  private pitchBase = 120;
  private pitchTarget = 120;

  private syllableRateCtrl = new OnePoleLPF();
  private vibratoCtrl = new OnePoleLPF();
  private dynamicsCtrl = new OnePoleLPF();

  private consonantBurst = 0;
  private consonantRemaining = 0;
  private syllableGain = 1;

  // Gain staging: envelope follower for dynamics expansion
  private envFollower = 0;
  private prevEnv = 0;

  // Mid-chunk character shifts: force parameter jumps to create "speaker changes"
  private shiftCounter = 0;
  private shiftInterval = 0;

  // Coherence feedback: 0 = random noise, 1 = strong shape coherence
  private coherence = 0;
  private seed = 50;

  setSeed(value: number) {
    this.seed = Math.max(0, Math.min(100, value));
  }

  setCoherence(score: number) {
    // Remap: 0-50% → 0 (no effect), 50-100% → 0-1 (increasing clarity)
    this.coherence = Math.max(0, Math.min(1, (score - 50) / 50));
  }

  process(noise: Float32Array): Float32Array {
    const out = new Float32Array(noise.length);
    const c = this.coherence;

    for (let i = 0; i < noise.length; i++) {
      const n = noise[i];

      const syllableNoise = this.syllableRateCtrl.smooth(n, 3);
      const vibratoDepth = Math.abs(this.vibratoCtrl.smooth(n, 0.5)) * 6;
      const dynamicsNoise = this.dynamicsCtrl.smooth(n, 1.5);

      // Silence gaps
      if (this.inSilence) {
        this.silenceRemaining--;
        if (this.silenceRemaining <= 0) this.inSilence = false;
        // Noise gate: near-zero during silence
        this.envFollower *= 0.995;
        out[i] = 0;
        continue;
      }

      // Consonant burst with transient spike
      if (this.consonantRemaining > 0) {
        this.consonantRemaining--;
        const t = 1 - this.consonantRemaining / this.consonantBurst;
        // Sharp attack transient: exponential onset
        const burstEnv = t < 0.1 ? (t / 0.1) * 3.0 : Math.exp(-(t - 0.1) * 8);
        out[i] = n * 0.4 * burstEnv * this.syllableGain;
        continue;
      }

      // Syllable timing
      this.syllableCounter--;
      if (this.syllableCounter <= 0) {
        this.pickNewSyllable(n, syllableNoise, dynamicsNoise);
      }

      this.syllablePhase =
        1 - this.syllableCounter / this.syllableDuration;

      // Sharper envelope: fast attack, variable sustain, noise-modulated release
      let env: number;
      const sp = this.syllablePhase;
      if (sp < 0.04) {
        // Very fast attack (~2.5ms) — creates transient
        env = sp / 0.04;
        env = env * env; // quadratic for punch
      } else if (sp < 0.15) {
        // Brief overshoot decay after transient
        env = 1.0 + (1 - (sp - 0.04) / 0.11) * 0.3;
      } else if (sp < 0.65) {
        // Sustain with noise-modulated micro-dynamics
        const microDyn = 1 + n * 0.15;
        env = 1.0 * microDyn;
      } else {
        // Release — variable speed based on noise
        const releaseSpeed = 2.5 + Math.abs(dynamicsNoise) * 3;
        env = Math.exp(-(sp - 0.65) * releaseSpeed);
      }
      env = Math.max(0, Math.min(1.3, env));

      // Formant glide — coherence widens transitions (more vowel variety)
      const glideRate = 50 - c * 20;
      const glideAlpha = 1 - Math.exp((-2 * Math.PI * glideRate) / SAMPLE_RATE);
      this.f1Current += glideAlpha * (this.f1Target - this.f1Current);
      this.f2Current += glideAlpha * (this.f2Target - this.f2Current);

      // Pitch glide + vibrato — coherence adds expressiveness
      const pitchAlpha = 1 - Math.exp((-2 * Math.PI * 8) / SAMPLE_RATE);
      this.pitchBase += pitchAlpha * (this.pitchTarget - this.pitchBase);
      this.vibratoPhase += 5.5 / SAMPLE_RATE;
      const vibrato =
        Math.sin(2 * Math.PI * this.vibratoPhase) * vibratoDepth * (1 + c * 0.4);
      const pitch = this.pitchBase + vibrato;

      // Jitter: coherence increases pitch variation (more speech-like)
      const jitter = n * 0.02 * (1 + c * 0.5);
      this.glottalPhase += (pitch * (1 + jitter)) / SAMPLE_RATE;
      const glottal = glottalPulse(this.glottalPhase);

      // Shimmer + aspiration: coherence boosts noise texture and dynamics
      const shimmer = 1 + n * 0.08 * (1 + c * 0.5);
      const aspiration = n * 0.06 * (1 + c * 0.4);
      const voiceGain = 0.3 + c * 0.15;
      const excitation = glottal * voiceGain * shimmer + aspiration;

      // Resonator bandwidths: coherence widens formants (richer harmonics)
      const bwScale = 1 + c * 0.3;
      const f3 = 2500 + (this.f1Current - 500) * 0.3;
      const r1 = this.res1.process(excitation, this.f1Current, 60 * bwScale);
      const r2 = this.res2.process(excitation, this.f2Current, 90 * bwScale);
      const r3 = this.res3.process(excitation, f3, 150 * bwScale);

      const raw = (r1 * 0.5 + r2 * 0.35 + r3 * 0.15) * env * this.syllableGain;

      // Dynamics expansion: boost peaks, suppress quiet parts
      const absRaw = Math.abs(raw);
      const attackCoeff = absRaw > this.envFollower ? 0.01 : 0.0005;
      this.envFollower += attackCoeff * (absRaw - this.envFollower);

      // Gentle expansion: boost transient peaks relative to sustain
      const expandGain = this.envFollower > 0.001
        ? Math.pow(this.envFollower / 0.2, 0.3)
        : 0;
      out[i] = raw * Math.min(expandGain, 2.0);
    }

    // Peak normalization with headroom for dynamics
    let peak = 0;
    for (let i = 0; i < out.length; i++) {
      const abs = Math.abs(out[i]);
      if (abs > peak) peak = abs;
    }
    if (peak > 0) {
      const scale = 0.7 / peak;
      for (let i = 0; i < out.length; i++) {
        out[i] *= scale;
      }
    }

    return out;
  }

  private pickNewSyllable(noiseSample: number, syllableNoise: number, dynamicsNoise: number) {
    const s = this.seed / 100;

    // Seed offsets vowel selection — different seed = different vowel patterns
    const vowelOffset = Math.floor(s * VOWEL_TARGETS.length);
    const vowelIdx =
      (Math.abs(Math.floor(noiseSample * 1000)) + vowelOffset) % VOWEL_TARGETS.length;
    const vowel = VOWEL_TARGETS[vowelIdx];
    this.f1Target = vowel.f1;
    this.f2Target = vowel.f2;

    // Seed scales syllable duration: low seed = faster, high seed = slower
    const durScale = 0.6 + s * 0.8;
    const durMs = (60 + Math.abs(syllableNoise) * 190) * durScale;
    this.syllableDuration = Math.floor((durMs / 1000) * SAMPLE_RATE);
    this.syllableCounter = this.syllableDuration;
    this.syllablePhase = 0;

    // Seed shifts pitch center: 0=low(70Hz), 50=mid(120Hz), 100=high(170Hz)
    const pitchCenter = 70 + s * 100;
    const pitchSpread = 30 + s * 30;
    this.pitchTarget = pitchCenter + noiseSample * pitchSpread;

    // Per-syllable gain: noise-driven amplitude variation (0.3 — 1.4)
    this.syllableGain = 0.3 + (Math.abs(dynamicsNoise) + 0.5) * 0.73;

    // Consonant burst probability shifts with seed
    const consThreshold = 0.1 + (1 - s) * 0.3;
    if (Math.abs(noiseSample) > consThreshold) {
      const consDur = 15 + Math.abs(syllableNoise) * 40;
      this.consonantRemaining = Math.floor((consDur / 1000) * SAMPLE_RATE);
      this.consonantBurst = this.consonantRemaining;
    }

    // Word boundary silence gaps (~12% chance, variable length)
    if (Math.abs(syllableNoise) > 0.8) {
      const gapMs = 40 + Math.abs(noiseSample) * 160;
      this.silenceRemaining = Math.floor((gapMs / 1000) * SAMPLE_RATE);
      this.inSilence = true;
    }
  }

  reset() {
    this.glottalPhase = 0;
    this.vibratoPhase = 0;
    this.f1Current = 500;
    this.f2Current = 1500;
    this.f1Target = 500;
    this.f2Target = 1500;
    this.syllableCounter = 0;
    this.syllableDuration = 0;
    this.syllablePhase = 0;
    this.inSilence = false;
    this.silenceRemaining = 0;
    this.pitchBase = 120;
    this.pitchTarget = 120;
    this.consonantBurst = 0;
    this.consonantRemaining = 0;
    this.syllableGain = 1;
    this.envFollower = 0;
    this.prevEnv = 0;
    this.shiftCounter = 0;
    this.shiftInterval = 0;
    this.res1.y1 = 0;
    this.res1.y2 = 0;
    this.res2.y1 = 0;
    this.res2.y2 = 0;
    this.res3.y1 = 0;
    this.res3.y2 = 0;
    this.syllableRateCtrl.state = 0;
    this.vibratoCtrl.state = 0;
    this.dynamicsCtrl.state = 0;
  }
}
