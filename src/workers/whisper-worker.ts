import { pipeline, env } from "@xenova/transformers";

env.allowLocalModels = false;

let transcriber: any = null;
let currentModel: string | null = null;

async function loadModel(model: "tiny" | "small") {
  const modelId =
    model === "tiny"
      ? "Xenova/whisper-tiny.en"
      : "Xenova/whisper-small.en";

  if (currentModel === modelId && transcriber) return;

  self.postMessage({ type: "loading", model: modelId });
  transcriber = await pipeline("automatic-speech-recognition", modelId, {
    dtype: "fp32",
  } as any);
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
        return_timestamps: "word",
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
