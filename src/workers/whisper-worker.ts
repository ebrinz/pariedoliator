/* eslint-disable @typescript-eslint/no-explicit-any */

let pipeline: any = null;
let transcriber: any = null;
let currentModel: string | null = null;

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
      ? "Xenova/whisper-tiny.en"
      : "Xenova/whisper-small.en";

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
      const result = await transcriber(audio, {
        return_timestamps: true,
        temperature,
        no_speech_threshold: 0.3,
        compression_ratio_threshold: 2.4,
      });

      const chunks = result.chunks || [];
      const tokens = chunks.map((c: any) => ({
        text: c.text ?? "",
        logProb: typeof c.logprob === "number" ? c.logprob : null,
      }));

      self.postMessage({
        type: "result",
        text: result.text,
        tokens,
      });
    } catch (err: any) {
      self.postMessage({ type: "error", error: err.message });
    }
    return;
  }
};
