export interface TranscriptToken {
  text: string;
  logProb: number;
  timestamp: number;
}

export interface TranscriptEntry {
  id: string;
  tokens: TranscriptToken[];
  phraseScore: number;
  timestamp: number;
}

export interface CoherenceResult {
  score: number;
  tintMap: Uint8Array | null;
}

export interface WhisperConfig {
  model: "tiny" | "small";
  temperature: number;
  chunkDuration: number;
}

export interface AppState {
  isRunning: boolean;
  whisperConfig: WhisperConfig;
  noiseVolume: number;
  ttsVolume: number;
  whisperReady: boolean;
  whisperLoading: boolean;
}
