/* eslint-disable @typescript-eslint/no-explicit-any */

let pipeline: any = null;
let transcriber: any = null;
let currentModel: string | null = null;
let promptIndex = 0;

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

async function ensurePipeline() {
  if (pipeline) return;
  const module = await import(
    /* webpackIgnore: true */
    // @ts-ignore — bypass bundler, load from CDN at runtime
    "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2"
  );
  module.env.allowLocalModels = false;
  pipeline = module.pipeline;
}

async function loadModel(model: "tiny" | "small") {
  const modelId =
    model === "tiny"
      ? "Xenova/whisper-tiny"
      : "Xenova/whisper-small";

  if (currentModel === modelId && transcriber) return;

  self.postMessage({ type: "loading", model: modelId });
  await ensurePipeline();
  transcriber = await pipeline("automatic-speech-recognition", modelId, {
    dtype: "fp32",
  });
  currentModel = modelId;
  self.postMessage({ type: "ready", model: modelId });
}

self.onmessage = async (e: MessageEvent) => {
  const { type } = e.data;

  if (type === "load") {
    try {
      await loadModel(e.data.model);
    } catch (err: any) {
      self.postMessage({ type: "error", error: err.message });
    }
    return;
  }

  if (type === "transcribe") {
    if (!transcriber) {
      self.postMessage({ type: "error", error: "Model not loaded" });
      return;
    }

    try {
      const { audio, temperature } = e.data;
      const prompt = PROMPTS[promptIndex % PROMPTS.length];
      promptIndex++;

      const result = await transcriber(audio, {
        return_timestamps: false,
        language: "en",
        task: "transcribe",
        temperature: Math.max(temperature, 0.6),
        no_speech_threshold: 0.99,
        compression_ratio_threshold: 10.0,
        prompt,
      });

      const text: string = (result.text ?? "").trim();

      if (!text) return;

      // Deduplicate single-word repetitions ("yeah, yeah, yeah" → "yeah")
      const words = text.replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean);
      const unique = [...new Set(words.map((w) => w.toLowerCase()))];
      const deduped = unique.length <= 2 && words.length > 4
        ? unique.join(" ")
        : text;

      if (!deduped) return;

      self.postMessage({
        type: "result",
        text: deduped,
        tokens: [],
      });
    } catch (err: any) {
      self.postMessage({ type: "error", error: err.message });
    }
    return;
  }
};
