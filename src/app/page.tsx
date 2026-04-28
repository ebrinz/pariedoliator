"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import IntroModal from "@/components/IntroModal";
import TopBar from "@/components/TopBar";
import NoiseField from "@/components/NoiseField";
import TranscriptLog from "@/components/TranscriptLog";
import ZenerStation from "@/components/ZenerStation";
import BottomBar from "@/components/BottomBar";
import { useWebcam } from "@/hooks/useWebcam";
import { useNoiseAudio } from "@/hooks/useNoiseAudio";
import { useWhisper } from "@/hooks/useWhisper";
import { useTTS } from "@/hooks/useTTS";
import {
  extractLSBNoise,
  noiseToPixelGrid,
  noiseToAudioSamples,
} from "@/lib/noise-extraction";
import { correlateNoiseMask } from "@/lib/shape-correlation";
import type { TranscriptEntry, WhisperConfig } from "@/types";

const WEBCAM_W = 320;
const WEBCAM_H = 240;

export default function Home() {
  const [whisperConfig, setWhisperConfig] = useState<WhisperConfig>({
    model: "tiny",
    temperature: 0.8,
    chunkDuration: 5,
  });
  const [noiseVolume, setNoiseVolume] = useState(0);
  const [ttsVolume, setTtsVolume] = useState(0);
  const [coherenceScore, setCoherenceScore] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [hasVisited, setHasVisited] = useState(false);

  useEffect(() => {
    const visited = localStorage.getItem("pareidolator-visited");
    if (visited) {
      setShowIntro(false);
      setHasVisited(true);
    }
  }, []);
  const [noiseGrid, setNoiseGrid] = useState<Float32Array | null>(null);
  const [tintMap, setTintMap] = useState<Uint8Array | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const webcam = useWebcam({ width: WEBCAM_W, height: WEBCAM_H });
  const noiseAudio = useNoiseAudio();
  const whisper = useWhisper();
  const tts = useTTS();
  const animFrameRef = useRef<number>(0);
  const prevEntryCountRef = useRef(0);

  // Task 17: Recording ref
  const recordingRef = useRef<{
    entries: TranscriptEntry[];
    coherenceLog: { time: number; score: number }[];
    startTime: number;
  }>({ entries: [], coherenceLog: [], startTime: 0 });

  useEffect(() => {
    noiseAudio.setVolume(noiseVolume);
  }, [noiseVolume, noiseAudio]);

  useEffect(() => {
    tts.setVolume(ttsVolume);
  }, [ttsVolume, tts]);

  useEffect(() => {
    if (whisper.entries.length > prevEntryCountRef.current) {
      const latest = whisper.entries[whisper.entries.length - 1];
      const text = latest.tokens.map((t) => t.text).join("");
      tts.speak(text);
      prevEntryCountRef.current = whisper.entries.length;
    }
  }, [whisper.entries, tts]);

  useEffect(() => {
    if (isRunning) {
      whisper.loadModel(whisperConfig.model);
    }
  }, [isRunning, whisperConfig.model, whisper]);

  useEffect(() => {
    if (!isRunning || !whisper.isReady) return;

    const interval = setInterval(() => {
      const audio = noiseAudio.getBufferedAudio(
        whisperConfig.chunkDuration,
        16000
      );
      if (audio.length > 0) {
        whisper.transcribe(audio, whisperConfig.temperature);
      }
    }, whisperConfig.chunkDuration * 1000);

    return () => clearInterval(interval);
  }, [isRunning, whisper, whisperConfig, noiseAudio]);

  // Task 17: Capture recording data
  useEffect(() => {
    if (isRecording) {
      recordingRef.current = {
        entries: [],
        coherenceLog: [],
        startTime: Date.now(),
      };
    }
  }, [isRecording]);

  useEffect(() => {
    if (isRecording && whisper.entries.length > 0) {
      recordingRef.current.entries = [...whisper.entries];
    }
  }, [isRecording, whisper.entries]);

  useEffect(() => {
    if (isRecording) {
      recordingRef.current.coherenceLog.push({
        time: Date.now(),
        score: coherenceScore,
      });
    }
  }, [isRecording, coherenceScore]);

  const [targetMask, setTargetMask] = useState<{
    mask: Uint8Array | null;
    width: number;
    height: number;
  }>({ mask: null, width: 0, height: 0 });

  const handleMaskChange = useCallback(
    (mask: Uint8Array | null, width: number, height: number) => {
      setTargetMask({ mask, width, height });
    },
    []
  );

  const startSession = useCallback(async () => {
    await webcam.start();
    setIsRunning(true);
  }, [webcam]);

  const handleIntroStart = useCallback(async () => {
    localStorage.setItem("pareidolator-visited", "true");
    setShowIntro(false);
    setHasVisited(true);
    await startSession();
  }, [startSession]);

  const handleIntroClose = useCallback(() => {
    setShowIntro(false);
  }, []);

  // Task 17: Export session on stop
  const handleRecordClick = useCallback(() => {
    if (isRecording) {
      const data = recordingRef.current;
      const exportObj = {
        session: {
          start: new Date(data.startTime).toISOString(),
          end: new Date().toISOString(),
          duration: Date.now() - data.startTime,
        },
        transcript: data.entries.map((e) => ({
          time: new Date(e.timestamp).toISOString(),
          text: e.tokens.map((t) => t.text).join(""),
          phraseScore: e.phraseScore,
        })),
        coherence: data.coherenceLog,
      };

      const blob = new Blob([JSON.stringify(exportObj, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pareidolator-session-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setIsRecording((r) => !r);
  }, [isRecording, whisper.entries, coherenceScore]);

  useEffect(() => {
    if (!isRunning || !webcam.isActive) return;

    let running = true;
    const loop = () => {
      if (!running) return;
      const frame = webcam.getFrame();
      if (frame) {
        const bits = extractLSBNoise(frame, 1);
        const grid = noiseToPixelGrid(bits, WEBCAM_W, WEBCAM_H);
        setNoiseGrid(grid);
        const samples = noiseToAudioSamples(bits);
        noiseAudio.feedSamples(samples);
        if (targetMask.mask) {
          const result = correlateNoiseMask(
            grid,
            targetMask.mask,
            WEBCAM_W,
            WEBCAM_H,
            targetMask.width,
            targetMask.height
          );
          setCoherenceScore(result.score);
          setTintMap(result.tintMap);
        }
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRunning, webcam, targetMask]);

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
      <div style={styles.main} className="cockpit-main">
        <div style={styles.transcript} className="cockpit-transcript">
          <TranscriptLog entries={whisper.entries} />
        </div>
        <div style={styles.hero} className="cockpit-hero">
          {!isRunning ? (
            <button onClick={startSession} style={styles.startBtn}>
              INITIALIZE
            </button>
          ) : (
            <NoiseField
              noiseGrid={noiseGrid}
              gridWidth={WEBCAM_W}
              gridHeight={WEBCAM_H}
              tintMap={tintMap}
            />
          )}
        </div>
        <div style={styles.zener} className="cockpit-zener">
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
        onRecordClick={handleRecordClick}
        isRecording={isRecording}
      />
      {showIntro && (
        <IntroModal
          onStart={handleIntroStart}
          onClose={handleIntroClose}
          isFirstVisit={!hasVisited}
        />
      )}
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
  startBtn: {
    fontFamily: "var(--font-main)",
    fontSize: "1.5rem",
    color: "var(--phosphor-green)",
    background: "transparent",
    border: "2px solid var(--phosphor-green)",
    padding: "16px 32px",
    cursor: "pointer",
    textShadow: "0 0 8px var(--phosphor-green)",
    boxShadow: "0 0 16px rgba(51,255,51,0.3)",
  },
};
