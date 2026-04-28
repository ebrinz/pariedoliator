"use client";

import { useState, useCallback } from "react";
import TopBar from "@/components/TopBar";
import NoiseField from "@/components/NoiseField";
import TranscriptLog from "@/components/TranscriptLog";
import ZenerStation from "@/components/ZenerStation";
import BottomBar from "@/components/BottomBar";
import type { TranscriptEntry, WhisperConfig } from "@/types";

export default function Home() {
  const [whisperConfig, setWhisperConfig] = useState<WhisperConfig>({
    model: "tiny",
    temperature: 0.8,
    chunkDuration: 5,
  });
  const [noiseVolume, setNoiseVolume] = useState(0);
  const [ttsVolume, setTtsVolume] = useState(0);
  const [transcriptEntries, setTranscriptEntries] = useState<TranscriptEntry[]>(
    []
  );
  const [coherenceScore, setCoherenceScore] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  const handleMaskChange = useCallback((mask: ImageData | null) => {
    // Will be connected to coherence scoring in Task 13
  }, []);

  return (
    <div style={styles.cockpit}>
      <TopBar
        model={whisperConfig.model}
        chunkDuration={whisperConfig.chunkDuration}
        temperature={whisperConfig.temperature}
        onModelChange={(model) =>
          setWhisperConfig((c) => ({ ...c, model }))
        }
        onChunkChange={(chunkDuration) =>
          setWhisperConfig((c) => ({ ...c, chunkDuration }))
        }
        onTempChange={(temperature) =>
          setWhisperConfig((c) => ({ ...c, temperature }))
        }
        onInfoClick={() => setShowIntro(true)}
      />
      <div style={styles.main}>
        <div style={styles.transcript}>
          <TranscriptLog entries={transcriptEntries} />
        </div>
        <div style={styles.hero}>
          <NoiseField width={640} height={480} />
        </div>
        <div style={styles.zener}>
          <ZenerStation
            coherenceScore={coherenceScore}
            onMaskChange={handleMaskChange}
          />
        </div>
      </div>
      <BottomBar
        noiseVolume={noiseVolume}
        ttsVolume={ttsVolume}
        onNoiseVolumeChange={setNoiseVolume}
        onTtsVolumeChange={setTtsVolume}
        onRecordClick={() => setIsRecording((r) => !r)}
        isRecording={isRecording}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  cockpit: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    width: "100vw",
  },
  main: {
    display: "flex",
    flex: 1,
    minHeight: 0,
  },
  transcript: {
    width: 220,
    flexShrink: 0,
  },
  hero: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#050505",
  },
  zener: {
    width: 200,
    flexShrink: 0,
  },
};
