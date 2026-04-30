"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import IntroModal from "@/components/IntroModal";
import TopBar from "@/components/TopBar";
import NoiseField from "@/components/NoiseField";
import TranscriptLog from "@/components/TranscriptLog";
import ZenerStation from "@/components/ZenerStation";
import BottomBar from "@/components/BottomBar";
import WoodGrain from "@/components/WoodGrain";
import { useWebcam } from "@/hooks/useWebcam";
import { useNoiseAudio } from "@/hooks/useNoiseAudio";
import { useWhisper } from "@/hooks/useWhisper";
import { useTTS } from "@/hooks/useTTS";
import {
  extractLSBNoise,
  noiseToPixelGrid,
  noiseToAudioSamples,
  shapeAudioForSpeech,
  setBabbleSeed,
} from "@/lib/noise-extraction";
import { loadSyllableSprite } from "@/lib/syllable-synth";
import { correlateNoiseMask } from "@/lib/shape-correlation";
import type { TranscriptEntry, WhisperConfig, NoiseMode } from "@/types";

const WEBCAM_W = 320;
const WEBCAM_H = 240;

export default function Home() {
  const [whisperConfig, setWhisperConfig] = useState<WhisperConfig>({
    model: "tiny",
    temperature: 0.8,
    chunkDuration: 5,
  });
  const [noiseMode, setNoiseMode] = useState<NoiseMode>("phoneme");
  const [babbleSeed, setBabbleSeedState] = useState(50);
  const [noiseVolume, setNoiseVolume] = useState(0.01);
  const [ttsVolume, setTtsVolume] = useState(0.33);
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

  const recordingRef = useRef<{
    entries: TranscriptEntry[];
    coherenceLog: { time: number; score: number }[];
    startTime: number;
  }>({ entries: [], coherenceLog: [], startTime: 0 });

  const { setVolume: setNoiseAudioVolume, feedSamples, getBufferedAudio } = noiseAudio;
  const { setVolume: setTtsVolume2, speak, stop: stopTts } = tts;
  const { isReady: whisperReady, isLoading: whisperLoading, loadModel, transcribe, entries: whisperEntries } = whisper;

  useEffect(() => {
    setBabbleSeed(babbleSeed);
  }, [babbleSeed]);

  useEffect(() => {
    loadSyllableSprite();
  }, []);

  useEffect(() => {
    setNoiseAudioVolume(noiseVolume);
  }, [noiseVolume, setNoiseAudioVolume]);

  useEffect(() => {
    setTtsVolume2(ttsVolume);
  }, [ttsVolume, setTtsVolume2]);

  useEffect(() => {
    if (whisperEntries.length > prevEntryCountRef.current) {
      const latest = whisperEntries[whisperEntries.length - 1];
      const text = latest.tokens.map((t) => t.text).join("");
      speak(text);
      prevEntryCountRef.current = whisperEntries.length;
    }
  }, [whisperEntries, speak]);

  useEffect(() => {
    if (isRunning) {
      loadModel(whisperConfig.model);
    }
  }, [isRunning, whisperConfig.model, loadModel]);

  useEffect(() => {
    if (!isRunning || !whisperReady) return;

    const interval = setInterval(() => {
      const audio = getBufferedAudio(
        whisperConfig.chunkDuration,
        16000
      );
      if (audio.length > 0) {
        transcribe(audio, whisperConfig.temperature);
      }
    }, whisperConfig.chunkDuration * 1000);

    return () => clearInterval(interval);
  }, [isRunning, whisperReady, whisperConfig.chunkDuration, whisperConfig.temperature, getBufferedAudio, transcribe]);

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
    if (isRecording && whisperEntries.length > 0) {
      recordingRef.current.entries = [...whisperEntries];
    }
  }, [isRecording, whisperEntries]);

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
  }, [webcam.start]);

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
  }, [isRecording]);

  const { getFrame, isActive: webcamActive } = webcam;

  useEffect(() => {
    if (!isRunning || !webcamActive) return;

    let running = true;
    const loop = () => {
      if (!running) return;
      const frame = getFrame();
      if (frame) {
        const bits = extractLSBNoise(frame, 1);
        const grid = noiseToPixelGrid(bits, WEBCAM_W, WEBCAM_H);
        setNoiseGrid(grid);

        // Compute coherence first so the score feeds into audio shaping
        let currentCoherence = 0;
        if (targetMask.mask) {
          const result = correlateNoiseMask(
            grid,
            targetMask.mask,
            WEBCAM_W,
            WEBCAM_H,
            targetMask.width,
            targetMask.height
          );
          currentCoherence = result.score;
          setCoherenceScore(result.score);
          setTintMap(result.tintMap);
        }

        const rawSamples = noiseToAudioSamples(bits);
        const samples = shapeAudioForSpeech(rawSamples, noiseMode, 16000, currentCoherence);
        feedSamples(samples);
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRunning, webcamActive, getFrame, feedSamples, targetMask, noiseMode]);

  return (
    <div style={styles.cockpit}>
      <WoodGrain />
      <div style={styles.content}>
      <TopBar
        model={whisperConfig.model}
        chunkDuration={whisperConfig.chunkDuration}
        temperature={whisperConfig.temperature}
        seed={babbleSeed}
        noiseMode={noiseMode}
        modelLoading={whisperLoading}
        modelReady={whisperReady}
        onModelChange={(model) =>
          setWhisperConfig((c) => ({ ...c, model }))
        }
        onChunkChange={(chunkDuration) =>
          setWhisperConfig((c) => ({ ...c, chunkDuration }))
        }
        onTempChange={(temperature) =>
          setWhisperConfig((c) => ({ ...c, temperature }))
        }
        onSeedChange={setBabbleSeedState}
        onNoiseModeChange={setNoiseMode}
        onInfoClick={() => setShowIntro(true)}
      />
      <div style={styles.main} className="cockpit-main">
        <div style={styles.transcript} className="cockpit-transcript">
          <TranscriptLog entries={whisperEntries} modelLoading={whisperLoading} modelReady={whisperReady} />
        </div>
        <div style={styles.hero} className="cockpit-hero">
          {!isRunning ? (
            <div style={{ textAlign: "center" }}>
              <button onClick={startSession} style={styles.startBtn}>
                INITIALIZE
              </button>
              {webcam.error && (
                <p style={{ color: "var(--screen-amber)", marginTop: 12, fontSize: "0.9rem" }}>
                  WEBCAM ERROR: {webcam.error}
                </p>
              )}
            </div>
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
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  cockpit: {
    position: "relative",
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
  },
  content: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  main: {
    display: "flex",
    flex: 1,
    minHeight: 0,
    padding: "0 8px",
    gap: 8,
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
    background: "var(--bg-screen)",
    borderRadius: 16,
    border: "4px solid",
    borderColor: "#d4cfc4 #807868 #706858 #ccc6b8",
    boxShadow: "1px 1px 0 #504840, -1px -1px 0 #e8e2d8, 2px 2px 6px rgba(0,0,0,0.45), inset 0 0 40px rgba(212,164,74,0.06), inset 1px 1px 3px rgba(0,0,0,0.3)",
    overflow: "hidden",
  },
  zener: {
    width: 200,
    flexShrink: 0,
  },
  startBtn: {
    fontFamily: "var(--font-main)",
    fontSize: "1.4rem",
    color: "var(--screen-amber-glow)",
    background: "transparent",
    border: "3px solid",
    borderColor: "#d4cfc4 #807868 #706858 #ccc6b8",
    borderRadius: 4,
    padding: "16px 32px",
    cursor: "pointer",
    textShadow: "0 0 8px var(--screen-amber-dim)",
    boxShadow: "1px 1px 0 #504840, -1px -1px 0 #e8e2d8, 2px 2px 6px rgba(0,0,0,0.4), 0 0 12px rgba(212,164,74,0.15)",
    letterSpacing: "0.1em",
  },
};
