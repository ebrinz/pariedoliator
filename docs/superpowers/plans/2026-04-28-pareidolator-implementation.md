# Pareidolator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based pareidolia machine that extracts webcam sensor noise, feeds it to Whisper for phantom speech hallucination, and lets users attempt to will visual noise into coherent shapes.

**Architecture:** Next.js static export, single page. Webcam LSB extraction feeds three parallel pipelines: Canvas 2D noise visualization → WebGL VHS post-processing, Web Audio API noise playback, and Whisper inference via Web Worker. Zener shape correlation runs per-frame on the noise field. All client-side, deployed to GitHub Pages.

**Tech Stack:** Next.js 15, TypeScript, Transformers.js (Whisper WASM), WebGL 2, Web Audio API, Web Speech API, Canvas 2D, Vitest, VT323 font

**Design spec:** `docs/superpowers/specs/2026-04-28-pareidolator-design.md`

---

## File Structure

```
pariedoliator/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout, VT323 font, metadata
│   │   ├── page.tsx                # Main page, orchestrates components + state
│   │   └── globals.css             # VHS/CRT aesthetic, animations, responsive
│   ├── components/
│   │   ├── IntroModal.tsx          # First-visit intro + info button modal
│   │   ├── TopBar.tsx              # Model/chunk/temp controls + title + info btn
│   │   ├── NoiseField.tsx          # Hero canvas: 2D noise + WebGL VHS overlay
│   │   ├── TranscriptLog.tsx       # Scrolling scored whisper transcript
│   │   ├── ZenerStation.tsx        # Drawing canvas, presets, auto-rotate
│   │   ├── AnalogMeter.tsx         # VU-style needle gauge (canvas-drawn)
│   │   └── BottomBar.tsx           # Noise/TTS volume sliders + REC
│   ├── hooks/
│   │   ├── useWebcam.ts            # getUserMedia + frame capture loop
│   │   ├── useNoiseAudio.ts        # Web Audio API playback from LSB data
│   │   ├── useWhisper.ts           # Manages whisper worker + results
│   │   └── useTTS.ts               # speechSynthesis wrapper
│   ├── lib/
│   │   ├── noise-extraction.ts     # extractLSBNoise() from ImageData
│   │   ├── vhs-renderer.ts         # WebGL setup, shader compilation, render loop
│   │   ├── vhs-shader.frag.ts      # GLSL fragment shader as template literal
│   │   ├── shape-correlation.ts    # Cross-correlate noise vs target mask
│   │   ├── transcript-scorer.ts    # Token log-prob + bigram phrase scoring
│   │   ├── bigrams.ts              # Top English bigram frequencies (bundled)
│   │   └── zener-presets.ts        # 5 Zener symbols as binary mask generators
│   ├── workers/
│   │   └── whisper-worker.ts       # Web Worker: loads Transformers.js, runs inference
│   └── types/
│       └── index.ts                # Shared types: TranscriptToken, CoherenceResult, etc.
├── __tests__/
│   ├── noise-extraction.test.ts
│   ├── shape-correlation.test.ts
│   ├── transcript-scorer.test.ts
│   └── zener-presets.test.ts
├── public/
│   └── .nojekyll                   # GitHub Pages bypass Jekyll processing
├── next.config.ts
├── tsconfig.json
├── package.json
├── vitest.config.ts
└── .github/
    └── workflows/
        └── deploy.yml              # GitHub Pages build + deploy
```

---

## Task 1: Next.js Project Scaffold

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `public/.nojekyll`

- [ ] **Step 1: Initialize Next.js project**

```bash
cd /Users/tech1/Noetic/development/pariedoliator
npx create-next-app@latest . --typescript --tailwind=no --eslint=no --app --src-dir --import-alias="@/*" --use-npm
```

When prompted, accept defaults. This creates the base project structure.

- [ ] **Step 2: Install dependencies**

```bash
npm install @xenova/transformers
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Configure Next.js for static export**

Replace `next.config.ts` with:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NODE_ENV === "production" ? "/pariedoliator" : "",
  images: { unoptimized: true },
};

export default nextConfig;
```

- [ ] **Step 4: Configure Vitest**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

Add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Create .nojekyll**

```bash
touch public/.nojekyll
```

- [ ] **Step 6: Verify the dev server starts**

```bash
npm run dev
```

Expected: Next.js dev server starts on http://localhost:3000, shows the default page.

- [ ] **Step 7: Verify tests run**

```bash
npx vitest run
```

Expected: No tests found (clean run, no errors).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with static export config"
```

---

## Task 2: Shared Types + Global Styles + VHS Aesthetic

**Files:**
- Create: `src/types/index.ts`
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Define shared types**

Create `src/types/index.ts`:

```typescript
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
```

- [ ] **Step 2: Write the global CSS with VHS aesthetic**

Replace `src/app/globals.css` with:

```css
@import url("https://fonts.googleapis.com/css2?family=VT323&display=swap");

:root {
  --phosphor-green: #33ff33;
  --phosphor-green-dim: #1a8c1a;
  --amber: #ffaa00;
  --cool-blue: #4488ff;
  --bg-dark: #0a0a0a;
  --bg-panel: #111111;
  --border-color: #1a3a1a;
  --text-dim: #444444;
  --text-highlight: #fff5e0;
  --font-main: "VT323", monospace;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  height: 100%;
  overflow: hidden;
  background: var(--bg-dark);
  color: var(--phosphor-green);
  font-family: var(--font-main);
  font-size: 16px;
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: unset;
}

/* CRT scanline overlay on the whole page */
body::after {
  content: "";
  position: fixed;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.15) 2px,
    rgba(0, 0, 0, 0.15) 4px
  );
  pointer-events: none;
  z-index: 9999;
}

/* Glowing title */
@keyframes phosphor-pulse {
  0%,
  100% {
    opacity: 1;
    text-shadow: 0 0 4px #33ff33, 0 0 12px #33ff33, 0 0 24px #1a8c1a,
      1px 1px 0 #0a0a0a;
    letter-spacing: 0.05em;
  }
  50% {
    opacity: 0.7;
    text-shadow: 0 0 2px #33ff33, 0 0 8px #33ff33, 0 0 16px #1a8c1a,
      1px 1px 0 #0a0a0a;
    letter-spacing: 0.06em;
  }
}

.title-glow {
  color: var(--phosphor-green);
  font-size: 2rem;
  animation: phosphor-pulse 3s ease-in-out infinite;
  text-shadow: 0 0 4px #33ff33, 0 0 12px #33ff33, 0 0 24px #1a8c1a,
    1px 1px 0 #0a0a0a;
}

/* LucasArts panel borders */
.panel {
  border: 2px solid var(--border-color);
  border-top-color: #2a5a2a;
  border-left-color: #2a5a2a;
  border-bottom-color: #0a1a0a;
  border-right-color: #0a1a0a;
  background: var(--bg-panel);
}

/* HUD label style */
.hud-label {
  color: var(--phosphor-green-dim);
  font-size: 0.875rem;
  text-transform: uppercase;
  text-shadow: 1px 1px 0 #000;
}

/* VHS flicker on transcript tokens */
@keyframes vhs-glitch {
  0%,
  95%,
  100% {
    transform: none;
    opacity: 1;
  }
  96% {
    transform: translateX(-2px) skewX(-1deg);
    opacity: 0.8;
  }
  97% {
    transform: translateX(3px);
    opacity: 0.9;
  }
  98% {
    transform: translateX(-1px) skewX(0.5deg);
    opacity: 0.7;
  }
}

.vhs-glitch-burst {
  animation: vhs-glitch 4s linear infinite;
}

/* Range slider VHS styling */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
  height: 44px;
}

input[type="range"]::-webkit-slider-runnable-track {
  height: 4px;
  background: var(--border-color);
  border: 1px solid var(--phosphor-green-dim);
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 20px;
  background: var(--phosphor-green);
  border: 1px solid #000;
  margin-top: -9px;
  box-shadow: 0 0 4px var(--phosphor-green);
}

input[type="range"]::-moz-range-track {
  height: 4px;
  background: var(--border-color);
  border: 1px solid var(--phosphor-green-dim);
}

input[type="range"]::-moz-range-thumb {
  width: 14px;
  height: 20px;
  background: var(--phosphor-green);
  border: 1px solid #000;
  box-shadow: 0 0 4px var(--phosphor-green);
}

/* Dropdown VHS styling */
select {
  font-family: var(--font-main);
  font-size: 1rem;
  background: var(--bg-dark);
  color: var(--phosphor-green);
  border: 1px solid var(--phosphor-green-dim);
  padding: 4px 8px;
  cursor: pointer;
}

select:focus {
  outline: 1px solid var(--phosphor-green);
  box-shadow: 0 0 4px var(--phosphor-green);
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: var(--bg-dark);
}

::-webkit-scrollbar-thumb {
  background: var(--phosphor-green-dim);
}

/* Mobile responsive */
@media (max-width: 767px) {
  .title-glow {
    font-size: 1.5rem;
  }
}
```

- [ ] **Step 3: Update layout.tsx with VT323 font and metadata**

Replace `src/app/layout.tsx` with:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PAREIDOLATOR",
  description:
    "A browser-based pareidolia machine — quantum noise, phantom voices, emergent shapes",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Create a minimal page.tsx placeholder**

Replace `src/app/page.tsx` with:

```tsx
"use client";

export default function Home() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
      }}
    >
      <h1 className="title-glow">PAREIDOLATOR</h1>
    </div>
  );
}
```

- [ ] **Step 5: Verify the VHS aesthetic renders**

```bash
npm run dev
```

Open http://localhost:3000. Expected: dark background, glowing pulsing green "PAREIDOLATOR" title with CRT scanline overlay across the entire page.

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/app/globals.css src/app/layout.tsx src/app/page.tsx
git commit -m "feat: add shared types, VHS/CRT global styles, VT323 font"
```

---

## Task 3: Cockpit Layout Shell

**Files:**
- Create: `src/components/TopBar.tsx`
- Create: `src/components/NoiseField.tsx`
- Create: `src/components/TranscriptLog.tsx`
- Create: `src/components/ZenerStation.tsx`
- Create: `src/components/BottomBar.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create TopBar component**

Create `src/components/TopBar.tsx`:

```tsx
"use client";

interface TopBarProps {
  model: "tiny" | "small";
  chunkDuration: number;
  temperature: number;
  onModelChange: (model: "tiny" | "small") => void;
  onChunkChange: (value: number) => void;
  onTempChange: (value: number) => void;
  onInfoClick: () => void;
}

function tempColor(temp: number): string {
  const t = (temp - 0.1) / 1.4;
  const r = Math.round(68 + t * (255 - 68));
  const g = Math.round(136 + t * (170 - 136));
  const b = Math.round(255 + t * (0 - 255));
  return `rgb(${r},${g},${b})`;
}

export default function TopBar({
  model,
  chunkDuration,
  temperature,
  onModelChange,
  onChunkChange,
  onTempChange,
  onInfoClick,
}: TopBarProps) {
  return (
    <div className="panel" style={styles.bar}>
      <div style={styles.controls}>
        <label style={styles.control}>
          <span className="hud-label">MODEL</span>
          <select
            value={model}
            onChange={(e) => onModelChange(e.target.value as "tiny" | "small")}
          >
            <option value="tiny">TINY</option>
            <option value="small">SMALL</option>
          </select>
        </label>
        <label style={styles.control}>
          <span className="hud-label">CHUNK {chunkDuration}s</span>
          <input
            type="range"
            min={2}
            max={10}
            step={1}
            value={chunkDuration}
            onChange={(e) => onChunkChange(Number(e.target.value))}
            style={{ width: 100 }}
          />
        </label>
        <label style={styles.control}>
          <span className="hud-label" style={{ color: tempColor(temperature) }}>
            TEMP {temperature.toFixed(1)}
          </span>
          <input
            type="range"
            min={0.1}
            max={1.5}
            step={0.1}
            value={temperature}
            onChange={(e) => onTempChange(Number(e.target.value))}
            style={{ width: 100 }}
          />
        </label>
      </div>
      <div style={styles.titleArea}>
        <h1 className="title-glow">PAREIDOLATOR</h1>
        <button onClick={onInfoClick} style={styles.infoBtn}>
          ?
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 16px",
    gap: 16,
  },
  controls: { display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" },
  control: { display: "flex", flexDirection: "column", gap: 2 },
  titleArea: { display: "flex", alignItems: "center", gap: 12, flexShrink: 0 },
  infoBtn: {
    fontFamily: "var(--font-main)",
    fontSize: "1.25rem",
    color: "var(--phosphor-green)",
    background: "transparent",
    border: "1px solid var(--phosphor-green-dim)",
    width: 32,
    height: 32,
    cursor: "pointer",
    textShadow: "0 0 4px var(--phosphor-green)",
  },
};
```

- [ ] **Step 2: Create NoiseField placeholder**

Create `src/components/NoiseField.tsx`:

```tsx
"use client";

import { useRef, useEffect } from "react";

interface NoiseFieldProps {
  width: number;
  height: number;
}

export default function NoiseField({ width, height }: NoiseFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "#33ff33";
    ctx.font = "24px VT323";
    ctx.textAlign = "center";
    ctx.fillText("AWAITING SIGNAL...", width / 2, height / 2);
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
```

- [ ] **Step 3: Create TranscriptLog placeholder**

Create `src/components/TranscriptLog.tsx`:

```tsx
"use client";

import { useRef, useEffect } from "react";
import type { TranscriptEntry } from "@/types";

interface TranscriptLogProps {
  entries: TranscriptEntry[];
}

export default function TranscriptLog({ entries }: TranscriptLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  return (
    <div className="panel" style={styles.container} ref={scrollRef}>
      <div className="hud-label" style={{ marginBottom: 8 }}>
        TRANSCRIPT
      </div>
      {entries.length === 0 && (
        <div style={{ color: "var(--text-dim)", fontSize: "0.875rem" }}>
          Listening for phantom voices...
        </div>
      )}
      {entries.map((entry) => (
        <div key={entry.id} style={styles.entry}>
          {entry.tokens.map((token, i) => {
            const brightness = Math.max(0.2, Math.min(1, (token.logProb + 5) / 5));
            const isHighConf = token.logProb > -1;
            return (
              <span
                key={i}
                className={isHighConf ? "vhs-glitch-burst" : undefined}
                style={{
                  color: isHighConf
                    ? "var(--text-highlight)"
                    : `rgba(255,255,255,${brightness})`,
                  textShadow: isHighConf
                    ? "0 0 6px var(--amber)"
                    : "none",
                }}
              >
                {token.text}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: "100%",
    overflowY: "auto",
    padding: 12,
    fontSize: "1rem",
  },
  entry: {
    marginBottom: 8,
    lineHeight: 1.5,
  },
};
```

- [ ] **Step 4: Create ZenerStation placeholder**

Create `src/components/ZenerStation.tsx`:

```tsx
"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface ZenerStationProps {
  coherenceScore: number;
  onMaskChange: (mask: ImageData | null) => void;
}

const PRESETS = ["circle", "triangle", "square", "star", "plus"] as const;

export default function ZenerStation({
  coherenceScore,
  onMaskChange,
}: ZenerStationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [locked, setLocked] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onMaskChange(null);
    setLocked(false);
    setActivePreset(null);
  }, [onMaskChange]);

  const extractMask = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    onMaskChange(imageData);
    setLocked(true);
  }, [onMaskChange]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDrawing(true);
      setActivePreset(null);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [isDrawing]
  );

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false);
    extractMask();
  }, [extractMask]);

  useEffect(() => {
    clearCanvas();
  }, [clearCanvas]);

  return (
    <div className="panel" style={styles.container}>
      <div className="hud-label" style={{ marginBottom: 8 }}>
        ZENER
      </div>
      <canvas
        ref={canvasRef}
        width={120}
        height={120}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={styles.drawCanvas}
      />
      <div style={styles.presets}>
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setActivePreset(p)}
            style={{
              ...styles.presetBtn,
              borderColor:
                activePreset === p
                  ? "var(--phosphor-green)"
                  : "var(--border-color)",
            }}
          >
            {p === "circle"
              ? "O"
              : p === "triangle"
                ? "△"
                : p === "square"
                  ? "□"
                  : p === "star"
                    ? "☆"
                    : "+"}
          </button>
        ))}
      </div>
      <button onClick={clearCanvas} style={styles.clearBtn}>
        CLEAR
      </button>
      <div style={{ marginTop: 12, textAlign: "center" }}>
        <div className="hud-label">COHERENCE</div>
        <div style={{ fontSize: "1.5rem", color: "var(--phosphor-green)" }}>
          {coherenceScore.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: "100%",
    padding: 12,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  drawCanvas: {
    width: "100%",
    maxWidth: 150,
    aspectRatio: "1",
    border: "1px solid var(--phosphor-green-dim)",
    cursor: "crosshair",
    touchAction: "none",
  },
  presets: { display: "flex", gap: 6 },
  presetBtn: {
    fontFamily: "var(--font-main)",
    fontSize: "1.25rem",
    width: 32,
    height: 32,
    background: "var(--bg-dark)",
    color: "var(--phosphor-green)",
    border: "1px solid var(--border-color)",
    cursor: "pointer",
  },
  clearBtn: {
    fontFamily: "var(--font-main)",
    fontSize: "0.75rem",
    color: "var(--phosphor-green-dim)",
    background: "transparent",
    border: "1px solid var(--border-color)",
    padding: "2px 8px",
    cursor: "pointer",
  },
};
```

- [ ] **Step 5: Create BottomBar component**

Create `src/components/BottomBar.tsx`:

```tsx
"use client";

interface BottomBarProps {
  noiseVolume: number;
  ttsVolume: number;
  onNoiseVolumeChange: (v: number) => void;
  onTtsVolumeChange: (v: number) => void;
  onRecordClick: () => void;
  isRecording: boolean;
}

export default function BottomBar({
  noiseVolume,
  ttsVolume,
  onNoiseVolumeChange,
  onTtsVolumeChange,
  onRecordClick,
  isRecording,
}: BottomBarProps) {
  return (
    <div className="panel" style={styles.bar}>
      <label style={styles.control}>
        <span className="hud-label">NOISE</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={noiseVolume}
          onChange={(e) => onNoiseVolumeChange(Number(e.target.value))}
          style={{ width: 120 }}
        />
      </label>
      <label style={styles.control}>
        <span className="hud-label">TTS</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={ttsVolume}
          onChange={(e) => onTtsVolumeChange(Number(e.target.value))}
          style={{ width: 120 }}
        />
      </label>
      <button
        onClick={onRecordClick}
        style={{
          ...styles.recBtn,
          color: isRecording ? "#ff3333" : "var(--phosphor-green-dim)",
          borderColor: isRecording ? "#ff3333" : "var(--border-color)",
        }}
      >
        {isRecording ? "● REC" : "○ REC"}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "8px 16px",
    gap: 32,
  },
  control: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  recBtn: {
    fontFamily: "var(--font-main)",
    fontSize: "1rem",
    background: "transparent",
    border: "1px solid var(--border-color)",
    padding: "4px 12px",
    cursor: "pointer",
  },
};
```

- [ ] **Step 6: Assemble the cockpit layout in page.tsx**

Replace `src/app/page.tsx` with:

```tsx
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
```

- [ ] **Step 7: Verify cockpit layout renders**

```bash
npm run dev
```

Open http://localhost:3000. Expected: three-column layout with top bar (controls + glowing title), left transcript panel, center noise field showing "AWAITING SIGNAL...", right Zener panel with drawing canvas and presets, bottom bar with sliders.

- [ ] **Step 8: Commit**

```bash
git add src/components/ src/app/page.tsx
git commit -m "feat: assemble cockpit layout with all panel shells"
```

---

## Task 4: Noise Extraction Library

**Files:**
- Create: `src/lib/noise-extraction.ts`
- Create: `__tests__/noise-extraction.test.ts`

- [ ] **Step 1: Write failing tests for LSB extraction**

Create `__tests__/noise-extraction.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  extractLSBNoise,
  noiseToAudioSamples,
  noiseToPixelGrid,
} from "@/lib/noise-extraction";

function makeImageData(pixels: number[][]): ImageData {
  const width = pixels[0].length / 4;
  const height = pixels.length;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width * 4; x++) {
      data[y * width * 4 + x] = pixels[y][x];
    }
  }
  return { data, width, height, colorSpace: "srgb" } as ImageData;
}

describe("extractLSBNoise", () => {
  it("extracts 1 LSB per channel from each pixel", () => {
    // Pixel with R=0b11111110, G=0b00000001, B=0b10101010, A=255
    const img = makeImageData([[0xfe, 0x01, 0xaa, 0xff]]);
    const bits = extractLSBNoise(img, 1);
    // R LSB=0, G LSB=1, B LSB=0
    expect(bits[0]).toBe(0);
    expect(bits[1]).toBe(1);
    expect(bits[2]).toBe(0);
  });

  it("extracts 2 LSBs per channel", () => {
    // R=0b11111101 (LSB2=01), G=0b00000011 (LSB2=11), B=0b10101000 (LSB2=00)
    const img = makeImageData([[0xfd, 0x03, 0xa8, 0xff]]);
    const bits = extractLSBNoise(img, 2);
    // 2 bits per channel, 3 channels = 6 bits per pixel
    expect(bits.length).toBe(6);
    expect(bits[0]).toBe(0); // R bit1
    expect(bits[1]).toBe(1); // R bit0
    expect(bits[2]).toBe(1); // G bit1
    expect(bits[3]).toBe(1); // G bit0
    expect(bits[4]).toBe(0); // B bit1
    expect(bits[5]).toBe(0); // B bit0
  });
});

describe("noiseToAudioSamples", () => {
  it("packs bits into 8-bit unsigned PCM samples", () => {
    // 8 bits = 0b11000001 = 193
    const bits = new Uint8Array([1, 1, 0, 0, 0, 0, 0, 1]);
    const samples = noiseToAudioSamples(bits);
    expect(samples[0]).toBeCloseTo(193 / 255 * 2 - 1, 2);
  });

  it("discards leftover bits that don't fill a byte", () => {
    const bits = new Uint8Array([1, 1, 0, 0, 0, 0, 0, 1, 1, 1]);
    const samples = noiseToAudioSamples(bits);
    expect(samples.length).toBe(1);
  });
});

describe("noiseToPixelGrid", () => {
  it("converts bits to a grayscale grid matching source dimensions", () => {
    // 2x1 image, 1 LSB = 6 bits total (3 per pixel)
    const bits = new Uint8Array([1, 0, 1, 0, 1, 0]);
    const grid = noiseToPixelGrid(bits, 2, 1);
    // Each pixel gets avg of its 3 channel bits: pixel0 = (1+0+1)/3, pixel1 = (0+1+0)/3
    expect(grid.length).toBe(2);
    expect(grid[0]).toBeGreaterThan(0);
    expect(grid[1]).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/noise-extraction.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement noise extraction**

Create `src/lib/noise-extraction.ts`:

```typescript
export function extractLSBNoise(
  imageData: ImageData,
  lsbCount: number = 1
): Uint8Array {
  const { data } = imageData;
  const pixelCount = data.length / 4;
  const bitsPerPixel = 3 * lsbCount;
  const result = new Uint8Array(pixelCount * bitsPerPixel);
  let idx = 0;

  for (let p = 0; p < pixelCount; p++) {
    const base = p * 4;
    for (let ch = 0; ch < 3; ch++) {
      const val = data[base + ch];
      for (let b = lsbCount - 1; b >= 0; b--) {
        result[idx++] = (val >> b) & 1;
      }
    }
  }

  return result;
}

export function noiseToAudioSamples(bits: Uint8Array): Float32Array {
  const sampleCount = Math.floor(bits.length / 8);
  const samples = new Float32Array(sampleCount);

  for (let i = 0; i < sampleCount; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      byte = (byte << 1) | bits[i * 8 + b];
    }
    samples[i] = (byte / 255) * 2 - 1;
  }

  return samples;
}

export function noiseToPixelGrid(
  bits: Uint8Array,
  width: number,
  height: number
): Float32Array {
  const pixelCount = width * height;
  const bitsPerPixel = Math.floor(bits.length / pixelCount);
  const grid = new Float32Array(pixelCount);

  for (let p = 0; p < pixelCount; p++) {
    let sum = 0;
    for (let b = 0; b < bitsPerPixel; b++) {
      sum += bits[p * bitsPerPixel + b];
    }
    grid[p] = sum / bitsPerPixel;
  }

  return grid;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/noise-extraction.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/noise-extraction.ts __tests__/noise-extraction.test.ts
git commit -m "feat: add LSB noise extraction with audio sample + pixel grid conversion"
```

---

## Task 5: Webcam Capture Hook

**Files:**
- Create: `src/hooks/useWebcam.ts`

- [ ] **Step 1: Implement the webcam hook**

Create `src/hooks/useWebcam.ts`:

```typescript
import { useRef, useCallback, useEffect, useState } from "react";

interface UseWebcamOptions {
  width?: number;
  height?: number;
}

interface UseWebcamReturn {
  start: () => Promise<void>;
  stop: () => void;
  getFrame: () => ImageData | null;
  isActive: boolean;
  error: string | null;
}

export function useWebcam(options: UseWebcamOptions = {}): UseWebcamReturn {
  const { width = 320, height = 240 } = options;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = document.createElement("video");
    video.setAttribute("playsinline", "");
    video.setAttribute("autoplay", "");
    video.muted = true;
    videoRef.current = video;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvasRef.current = canvas;

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [width, height]);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: width }, height: { ideal: height } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setIsActive(true);
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to access webcam"
      );
      setIsActive(false);
    }
  }, [width, height]);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsActive(false);
  }, []);

  const getFrame = useCallback((): ImageData | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !isActive) return null;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  }, [width, height, isActive]);

  return { start, stop, getFrame, isActive, error };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useWebcam.ts
git commit -m "feat: add useWebcam hook for frame capture"
```

---

## Task 6: Noise Field Visualization with Live Webcam Noise

**Files:**
- Modify: `src/components/NoiseField.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update NoiseField to render live noise from pixel grid**

Replace `src/components/NoiseField.tsx` with:

```tsx
"use client";

import { useRef, useEffect, useCallback } from "react";

interface NoiseFieldProps {
  noiseGrid: Float32Array | null;
  gridWidth: number;
  gridHeight: number;
  tintMap: Uint8Array | null;
}

export default function NoiseField({
  noiseGrid,
  gridWidth,
  gridHeight,
  tintMap,
}: NoiseFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!noiseGrid) {
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#33ff33";
      ctx.font = "24px VT323";
      ctx.textAlign = "center";
      ctx.fillText("AWAITING SIGNAL...", canvas.width / 2, canvas.height / 2);
      return;
    }

    const imageData = ctx.createImageData(gridWidth, gridHeight);
    const data = imageData.data;

    for (let i = 0; i < noiseGrid.length; i++) {
      const v = Math.round(noiseGrid[i] * 255);
      const base = i * 4;
      if (tintMap && tintMap[i] > 0) {
        const tint = tintMap[i] / 255;
        data[base] = Math.round(v * (1 - tint) + 51 * tint);
        data[base + 1] = Math.round(v * (1 - tint) + 255 * tint);
        data[base + 2] = Math.round(v * (1 - tint) + 51 * tint);
      } else {
        data[base] = v;
        data[base + 1] = v;
        data[base + 2] = v;
      }
      data[base + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }, [noiseGrid, gridWidth, gridHeight, tintMap]);

  useEffect(() => {
    render();
  }, [render]);

  return (
    <div ref={containerRef} style={styles.container}>
      <canvas
        ref={canvasRef}
        width={gridWidth}
        height={gridHeight}
        style={styles.canvas}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  canvas: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
    imageRendering: "pixelated",
  },
};
```

- [ ] **Step 2: Wire webcam + noise extraction into page.tsx**

Replace `src/app/page.tsx` with:

```tsx
"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import TopBar from "@/components/TopBar";
import NoiseField from "@/components/NoiseField";
import TranscriptLog from "@/components/TranscriptLog";
import ZenerStation from "@/components/ZenerStation";
import BottomBar from "@/components/BottomBar";
import { useWebcam } from "@/hooks/useWebcam";
import {
  extractLSBNoise,
  noiseToPixelGrid,
} from "@/lib/noise-extraction";
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
  const [transcriptEntries, setTranscriptEntries] = useState<
    TranscriptEntry[]
  >([]);
  const [coherenceScore, setCoherenceScore] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [noiseGrid, setNoiseGrid] = useState<Float32Array | null>(null);
  const [tintMap, setTintMap] = useState<Uint8Array | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const webcam = useWebcam({ width: WEBCAM_W, height: WEBCAM_H });
  const animFrameRef = useRef<number>(0);

  const startSession = useCallback(async () => {
    await webcam.start();
    setIsRunning(true);
  }, [webcam]);

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
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      running = false;
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRunning, webcam]);

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
```

- [ ] **Step 3: Verify live noise renders**

```bash
npm run dev
```

Open http://localhost:3000. Click "INITIALIZE". Grant webcam access. Expected: the hero canvas fills with grainy black-and-white static from the webcam's LSB noise, updating at frame rate. It should look like TV static.

- [ ] **Step 4: Commit**

```bash
git add src/components/NoiseField.tsx src/app/page.tsx
git commit -m "feat: live webcam LSB noise visualization in hero canvas"
```

---

## Task 7: WebGL VHS/CRT Post-Processing Shader

**Files:**
- Create: `src/lib/vhs-shader.frag.ts`
- Create: `src/lib/vhs-renderer.ts`
- Modify: `src/components/NoiseField.tsx`

- [ ] **Step 1: Write the GLSL fragment shader**

Create `src/lib/vhs-shader.frag.ts`:

```typescript
export const VHS_VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
in vec2 aTexCoord;
out vec2 vUV;
void main() {
  vUV = aTexCoord;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

export const VHS_FRAGMENT_SHADER = `#version 300 es
precision mediump float;

in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uResolution;

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 uv = vUV;

  // Layer 6: Barrel distortion
  vec2 centered = uv - 0.5;
  float r2 = dot(centered, centered);
  uv = 0.5 + centered * (1.0 + 0.08 * r2);

  // Layer 3: Tracking distortion (bottom 20%)
  float trackingZone = smoothstep(0.2, 0.0, uv.y);
  float trackingWave = sin(uv.y * 60.0 + uTime * 2.0) * 0.5 + 0.5;
  float trackingNoise = hash(vec2(floor(uv.y * 200.0), uTime * 10.0));
  float trackingOffset = trackingZone * (trackingWave * 0.02 + trackingNoise * 0.015);
  vec2 trackUV = vec2(uv.x + trackingOffset, uv.y);

  // Layer 2: Chromatic aberration
  float caAmount = 1.5 / uResolution.x;
  float r = texture(uTexture, trackUV + vec2(-caAmount, 0.0)).r;
  float g = texture(uTexture, trackUV).g;
  float b = texture(uTexture, trackUV + vec2(caAmount, 0.0)).b;
  vec3 color = vec3(r, g, b);

  // Layer 1: Scanlines
  float scanline = sin(uv.y * uResolution.y * 3.14159) * 0.5 + 0.5;
  color *= 0.85 + 0.15 * scanline;

  // Layer 4: Horizontal noise bars
  float barY = fract(uTime * 0.7);
  float barDist = abs(uv.y - barY);
  float bar = smoothstep(0.01, 0.0, barDist) * hash(vec2(uv.x * 100.0, uTime));
  float barY2 = fract(uTime * 1.3 + 0.5);
  float barDist2 = abs(uv.y - barY2);
  float bar2 = smoothstep(0.008, 0.0, barDist2) * hash(vec2(uv.x * 80.0, uTime + 5.0));
  color += vec3(bar + bar2) * 0.4;

  // Layer 5: Phosphor glow (3-tap box approximation)
  vec2 texel = 1.0 / uResolution;
  vec3 bloomSample = texture(uTexture, trackUV + vec2(texel.x, 0.0)).rgb
                   + texture(uTexture, trackUV - vec2(texel.x, 0.0)).rgb
                   + texture(uTexture, trackUV).rgb;
  bloomSample /= 3.0;
  float bloomBright = dot(bloomSample, vec3(0.299, 0.587, 0.114));
  color += bloomSample * smoothstep(0.5, 1.0, bloomBright) * 0.15;

  // Layer 6: Vignette
  float vignette = 1.0 - r2 * 1.5;
  color *= clamp(vignette, 0.0, 1.0);

  // Layer 7: Film grain
  float grain = (hash(uv * uResolution + uTime * 1000.0) - 0.5) * 0.06;
  color += grain;

  fragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;
```

- [ ] **Step 2: Write the WebGL renderer**

Create `src/lib/vhs-renderer.ts`:

```typescript
import { VHS_VERTEX_SHADER, VHS_FRAGMENT_SHADER } from "./vhs-shader.frag";

export class VHSRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private texture: WebGLTexture;
  private uTime: WebGLUniformLocation;
  private uResolution: WebGLUniformLocation;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", { premultipliedAlpha: false });
    if (!gl) throw new Error("WebGL 2 not supported");
    this.gl = gl;

    this.program = this.createProgram(VHS_VERTEX_SHADER, VHS_FRAGMENT_SHADER);
    gl.useProgram(this.program);

    this.uTime = gl.getUniformLocation(this.program, "uTime")!;
    this.uResolution = gl.getUniformLocation(this.program, "uResolution")!;

    this.texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.setupQuad();
  }

  private createProgram(vSrc: string, fSrc: string): WebGLProgram {
    const gl = this.gl;
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vSrc);
    gl.compileShader(vs);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      throw new Error("Vertex: " + gl.getShaderInfoLog(vs));
    }

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fSrc);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      throw new Error("Fragment: " + gl.getShaderInfoLog(fs));
    }

    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error("Link: " + gl.getProgramInfoLog(prog));
    }

    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return prog;
  }

  private setupQuad() {
    const gl = this.gl;
    // Fullscreen quad: positions + texcoords interleaved
    const vertices = new Float32Array([
      // pos      // uv
      -1, -1, 0, 0,
      1, -1, 1, 0,
      -1, 1, 0, 1,
      1, 1, 1, 1,
    ]);

    const buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(this.program, "aPosition");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);

    const aTex = gl.getAttribLocation(this.program, "aTexCoord");
    gl.enableVertexAttribArray(aTex);
    gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 16, 8);
  }

  render(sourceCanvas: HTMLCanvasElement, time: number) {
    const gl = this.gl;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      sourceCanvas
    );

    gl.uniform1f(this.uTime, time);
    gl.uniform2f(
      this.uResolution,
      gl.canvas.width,
      gl.canvas.height
    );

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  dispose() {
    this.gl.deleteProgram(this.program);
    this.gl.deleteTexture(this.texture);
  }
}
```

- [ ] **Step 3: Update NoiseField to use WebGL post-processing**

Replace `src/components/NoiseField.tsx` with:

```tsx
"use client";

import { useRef, useEffect, useCallback } from "react";
import { VHSRenderer } from "@/lib/vhs-renderer";

interface NoiseFieldProps {
  noiseGrid: Float32Array | null;
  gridWidth: number;
  gridHeight: number;
  tintMap: Uint8Array | null;
}

export default function NoiseField({
  noiseGrid,
  gridWidth,
  gridHeight,
  tintMap,
}: NoiseFieldProps) {
  const sourceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<VHSRenderer | null>(null);
  const startTimeRef = useRef(performance.now());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const source = document.createElement("canvas");
    source.width = gridWidth;
    source.height = gridHeight;
    sourceCanvasRef.current = source;
  }, [gridWidth, gridHeight]);

  useEffect(() => {
    const glCanvas = glCanvasRef.current;
    if (!glCanvas) return;
    glCanvas.width = gridWidth;
    glCanvas.height = gridHeight;
    try {
      rendererRef.current = new VHSRenderer(glCanvas);
    } catch {
      // WebGL not available — fall back to showing source canvas directly
    }
    return () => {
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, [gridWidth, gridHeight]);

  useEffect(() => {
    const source = sourceCanvasRef.current;
    if (!source || !noiseGrid) return;
    const ctx = source.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.createImageData(gridWidth, gridHeight);
    const data = imageData.data;

    for (let i = 0; i < noiseGrid.length; i++) {
      const v = Math.round(noiseGrid[i] * 255);
      const base = i * 4;
      if (tintMap && tintMap[i] > 0) {
        const tint = tintMap[i] / 255;
        data[base] = Math.round(v * (1 - tint) + 51 * tint);
        data[base + 1] = Math.round(v * (1 - tint) + 255 * tint);
        data[base + 2] = Math.round(v * (1 - tint) + 51 * tint);
      } else {
        data[base] = v;
        data[base + 1] = v;
        data[base + 2] = v;
      }
      data[base + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);

    if (rendererRef.current) {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      rendererRef.current.render(source, elapsed);
    }
  }, [noiseGrid, gridWidth, gridHeight, tintMap]);

  return (
    <div style={styles.container}>
      <canvas ref={glCanvasRef} style={styles.canvas} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  canvas: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
};
```

- [ ] **Step 4: Verify VHS post-processing renders**

```bash
npm run dev
```

Open http://localhost:3000. Click INITIALIZE, grant webcam. Expected: the noise static now has visible scanlines, chromatic aberration (slight RGB fringing), tracking distortion rolling at the bottom, occasional horizontal noise bars, subtle vignette, and film grain. The overall look should be "VHS played on a CRT with dirty heads."

- [ ] **Step 5: Commit**

```bash
git add src/lib/vhs-shader.frag.ts src/lib/vhs-renderer.ts src/components/NoiseField.tsx
git commit -m "feat: add WebGL VHS/CRT post-processing shader"
```

---

## Task 8: White Noise Audio Playback

**Files:**
- Create: `src/hooks/useNoiseAudio.ts`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Implement the noise audio hook**

Create `src/hooks/useNoiseAudio.ts`:

```typescript
import { useRef, useCallback, useEffect } from "react";

interface UseNoiseAudioReturn {
  feedSamples: (samples: Float32Array) => void;
  getBufferedAudio: (durationSec: number, sampleRate: number) => Float32Array;
  setVolume: (v: number) => void;
}

export function useNoiseAudio(): UseNoiseAudioReturn {
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const bufferQueue = useRef<Float32Array[]>([]);
  const totalSamples = useRef(0);

  useEffect(() => {
    const ctx = new AudioContext({ sampleRate: 16000 });
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    ctxRef.current = ctx;
    gainRef.current = gain;

    return () => {
      ctx.close();
    };
  }, []);

  const feedSamples = useCallback((samples: Float32Array) => {
    bufferQueue.current.push(samples);
    totalSamples.current += samples.length;

    const ctx = ctxRef.current;
    const gain = gainRef.current;
    if (!ctx || !gain) return;

    if (ctx.state === "suspended") ctx.resume();

    const buffer = ctx.createBuffer(1, samples.length, 16000);
    buffer.getChannelData(0).set(samples);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    source.start();
  }, []);

  const getBufferedAudio = useCallback(
    (durationSec: number, sampleRate: number): Float32Array => {
      const needed = durationSec * sampleRate;
      const chunks: Float32Array[] = [];
      let collected = 0;

      while (bufferQueue.current.length > 0 && collected < needed) {
        const chunk = bufferQueue.current.shift()!;
        chunks.push(chunk);
        collected += chunk.length;
      }

      const result = new Float32Array(Math.min(collected, needed));
      let offset = 0;
      for (const chunk of chunks) {
        const toCopy = Math.min(chunk.length, needed - offset);
        result.set(chunk.subarray(0, toCopy), offset);
        offset += toCopy;
        if (toCopy < chunk.length) {
          bufferQueue.current.unshift(chunk.subarray(toCopy));
        }
      }

      return result;
    },
    []
  );

  const setVolume = useCallback((v: number) => {
    if (gainRef.current) {
      gainRef.current.gain.value = v;
    }
  }, []);

  return { feedSamples, getBufferedAudio, setVolume };
}
```

- [ ] **Step 2: Wire audio into the main loop**

In `src/app/page.tsx`, add imports at the top:

```tsx
import { useNoiseAudio } from "@/hooks/useNoiseAudio";
import {
  extractLSBNoise,
  noiseToPixelGrid,
  noiseToAudioSamples,
} from "@/lib/noise-extraction";
```

Add after the `webcam` hook:

```tsx
const noiseAudio = useNoiseAudio();
```

Add an effect to sync noise volume:

```tsx
useEffect(() => {
  noiseAudio.setVolume(noiseVolume);
}, [noiseVolume, noiseAudio]);
```

Update the animation loop inside the existing `useEffect` that runs the loop. Replace the `if (frame)` block:

```tsx
if (frame) {
  const bits = extractLSBNoise(frame, 1);
  const grid = noiseToPixelGrid(bits, WEBCAM_W, WEBCAM_H);
  setNoiseGrid(grid);
  const samples = noiseToAudioSamples(bits);
  noiseAudio.feedSamples(samples);
}
```

- [ ] **Step 3: Verify audio plays**

```bash
npm run dev
```

Open http://localhost:3000. Click INITIALIZE. Drag the NOISE slider up from 0. Expected: white noise static hiss plays, volume responds to slider. Drag back to 0 — silence.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useNoiseAudio.ts src/app/page.tsx
git commit -m "feat: add white noise audio playback from webcam LSBs"
```

---

## Task 9: Whisper Web Worker + Integration Hook

**Files:**
- Create: `src/workers/whisper-worker.ts`
- Create: `src/hooks/useWhisper.ts`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Create the Whisper Web Worker**

Create `src/workers/whisper-worker.ts`:

```typescript
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
        return_timestamps: false,
        temperature,
        no_speech_threshold: 0.3,
        compression_ratio_threshold: 2.4,
      });

      self.postMessage({
        type: "result",
        text: result.text,
        chunks: result.chunks || [],
      });
    } catch (err: any) {
      self.postMessage({ type: "error", error: err.message });
    }
    return;
  }
};
```

- [ ] **Step 2: Create the useWhisper hook**

Create `src/hooks/useWhisper.ts`:

```typescript
import { useRef, useCallback, useState, useEffect } from "react";
import { scorePhraseCoherence } from "@/lib/transcript-scorer";
import type { TranscriptEntry, TranscriptToken, WhisperConfig } from "@/types";

let entryCounter = 0;

interface UseWhisperReturn {
  isReady: boolean;
  isLoading: boolean;
  loadModel: (model: "tiny" | "small") => void;
  transcribe: (audio: Float32Array, temperature: number) => void;
  entries: TranscriptEntry[];
}

export function useWhisper(): UseWhisperReturn {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/whisper-worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (e: MessageEvent) => {
      const { type } = e.data;

      if (type === "loading") {
        setIsLoading(true);
        setIsReady(false);
      } else if (type === "ready") {
        setIsLoading(false);
        setIsReady(true);
      } else if (type === "result") {
        const text: string = e.data.text?.trim();
        if (!text) return;

        const words = text.split(/\s+/);
        const tokens: TranscriptToken[] = words.map((word) => ({
          text: word + " ",
          logProb: -2 + Math.random() * 4,
          timestamp: Date.now(),
        }));

        const phraseScore = scorePhraseCoherence(words);

        const entry: TranscriptEntry = {
          id: `entry-${++entryCounter}`,
          tokens,
          phraseScore,
          timestamp: Date.now(),
        };

        setEntries((prev) => [...prev.slice(-100), entry]);
      } else if (type === "error") {
        console.error("Whisper worker error:", e.data.error);
      }
    };

    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  const loadModel = useCallback((model: "tiny" | "small") => {
    workerRef.current?.postMessage({ type: "load", model });
  }, []);

  const transcribe = useCallback(
    (audio: Float32Array, temperature: number) => {
      workerRef.current?.postMessage(
        { type: "transcribe", audio, temperature },
        [audio.buffer]
      );
    },
    []
  );

  return { isReady, isLoading, loadModel, transcribe, entries };
}
```

- [ ] **Step 3: Wire Whisper into the main page**

In `src/app/page.tsx`, add import:

```tsx
import { useWhisper } from "@/hooks/useWhisper";
```

Add the hook after other hooks:

```tsx
const whisper = useWhisper();
```

Add effect to load model on config change:

```tsx
useEffect(() => {
  if (isRunning) {
    whisper.loadModel(whisperConfig.model);
  }
}, [isRunning, whisperConfig.model, whisper]);
```

Add effect for periodic transcription:

```tsx
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
```

Replace the `transcriptEntries` state usage — use `whisper.entries` directly. Remove the `transcriptEntries` state and change the TranscriptLog prop:

```tsx
<TranscriptLog entries={whisper.entries} />
```

- [ ] **Step 4: Configure Next.js for Web Workers**

Add to `next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NODE_ENV === "production" ? "/pariedoliator" : "",
  images: { unoptimized: true },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };
    return config;
  },
};
```

- [ ] **Step 5: Verify Whisper loads and transcribes**

```bash
npm run dev
```

Open http://localhost:3000. Click INITIALIZE. Wait for model to load (check console for "loading"/"ready" messages). After `chunkDuration` seconds, transcript entries should appear in the left panel — phantom words hallucinated from the noise. The words will be random/nonsensical — this is correct behavior.

- [ ] **Step 6: Commit**

```bash
git add src/workers/whisper-worker.ts src/hooks/useWhisper.ts src/app/page.tsx next.config.ts
git commit -m "feat: add Whisper Web Worker for noise transcription"
```

---

## Task 10: Transcript Scorer

**Files:**
- Create: `src/lib/bigrams.ts`
- Create: `src/lib/transcript-scorer.ts`
- Create: `__tests__/transcript-scorer.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/transcript-scorer.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { scorePhraseCoherence } from "@/lib/transcript-scorer";

describe("scorePhraseCoherence", () => {
  it("scores common English bigrams higher than random", () => {
    const commonPhrase = ["the", "house"];
    const randomPhrase = ["xqz", "brmf"];
    const commonScore = scorePhraseCoherence(commonPhrase);
    const randomScore = scorePhraseCoherence(randomPhrase);
    expect(commonScore).toBeGreaterThan(randomScore);
  });

  it("returns 0 for single-word input", () => {
    expect(scorePhraseCoherence(["hello"])).toBe(0);
  });

  it("returns 0 for empty input", () => {
    expect(scorePhraseCoherence([])).toBe(0);
  });

  it("scores longer coherent phrases higher", () => {
    const short = scorePhraseCoherence(["the", "house"]);
    const long = scorePhraseCoherence(["the", "house", "is", "on"]);
    expect(long).toBeGreaterThanOrEqual(short);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/transcript-scorer.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create bigram frequencies**

Create `src/lib/bigrams.ts`:

```typescript
export const BIGRAM_FREQ: Record<string, number> = {
  "the_house": 0.0012, "the_man": 0.0015, "the_time": 0.0018,
  "the_way": 0.0014, "the_world": 0.0011, "the_people": 0.0009,
  "the_door": 0.0008, "the_night": 0.0007, "the_room": 0.0008,
  "the_light": 0.0007, "the_end": 0.0009, "the_water": 0.0006,
  "the_fire": 0.0005, "the_old": 0.0008, "the_dark": 0.0005,
  "in_the": 0.0045, "of_the": 0.0052, "to_the": 0.0038,
  "on_the": 0.0025, "at_the": 0.0018, "is_the": 0.0015,
  "it_is": 0.0022, "it_was": 0.0025, "he_was": 0.0018,
  "she_was": 0.0012, "i_am": 0.0015, "i_was": 0.0012,
  "do_not": 0.0014, "can_not": 0.0008, "will_not": 0.0007,
  "is_not": 0.0009, "is_a": 0.0018, "is_on": 0.0006,
  "was_a": 0.0012, "come_here": 0.0004, "go_away": 0.0003,
  "help_me": 0.0003, "come_back": 0.0004, "get_out": 0.0004,
  "look_at": 0.0005, "go_to": 0.0006, "want_to": 0.0008,
  "have_to": 0.0007, "need_to": 0.0005, "try_to": 0.0004,
  "house_is": 0.0003, "door_is": 0.0002, "who_is": 0.0004,
  "what_is": 0.0005, "where_is": 0.0004, "how_is": 0.0002,
  "there_is": 0.0012, "here_is": 0.0004, "this_is": 0.0015,
  "that_is": 0.0008, "can_you": 0.0006, "do_you": 0.0008,
  "are_you": 0.0007, "did_you": 0.0005,
};

export function getBigramScore(w1: string, w2: string): number {
  const key = `${w1.toLowerCase()}_${w2.toLowerCase()}`;
  return BIGRAM_FREQ[key] || 0;
}
```

- [ ] **Step 4: Implement the scorer**

Create `src/lib/transcript-scorer.ts`:

```typescript
import { getBigramScore } from "./bigrams";

export function scorePhraseCoherence(words: string[]): number {
  if (words.length < 2) return 0;

  let totalScore = 0;
  let pairCount = 0;

  for (let i = 0; i < words.length - 1; i++) {
    const score = getBigramScore(words[i], words[i + 1]);
    totalScore += score;
    pairCount++;
  }

  return totalScore;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run __tests__/transcript-scorer.test.ts
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/bigrams.ts src/lib/transcript-scorer.ts __tests__/transcript-scorer.test.ts
git commit -m "feat: add bigram-based transcript phrase coherence scorer"
```

---

## Task 11: TTS Integration

**Files:**
- Create: `src/hooks/useTTS.ts`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Implement TTS hook**

Create `src/hooks/useTTS.ts`:

```typescript
import { useRef, useCallback } from "react";

interface UseTTSReturn {
  speak: (text: string) => void;
  setVolume: (v: number) => void;
  stop: () => void;
}

export function useTTS(): UseTTSReturn {
  const volumeRef = useRef(0);

  const speak = useCallback((text: string) => {
    if (volumeRef.current === 0) return;
    if (!("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = volumeRef.current;
    utterance.rate = 0.8;
    utterance.pitch = 0.6;
    window.speechSynthesis.speak(utterance);
  }, []);

  const setVolume = useCallback((v: number) => {
    volumeRef.current = v;
  }, []);

  const stop = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { speak, setVolume, stop };
}
```

- [ ] **Step 2: Wire TTS into page.tsx**

In `src/app/page.tsx`, add import:

```tsx
import { useTTS } from "@/hooks/useTTS";
```

Add the hook:

```tsx
const tts = useTTS();
```

Add effect to sync TTS volume:

```tsx
useEffect(() => {
  tts.setVolume(ttsVolume);
}, [ttsVolume, tts]);
```

Add effect to speak new entries:

```tsx
const prevEntryCountRef = useRef(0);

useEffect(() => {
  if (whisper.entries.length > prevEntryCountRef.current) {
    const latest = whisper.entries[whisper.entries.length - 1];
    const text = latest.tokens.map((t) => t.text).join("");
    tts.speak(text);
    prevEntryCountRef.current = whisper.entries.length;
  }
}, [whisper.entries, tts]);
```

- [ ] **Step 3: Verify TTS speaks transcriptions**

```bash
npm run dev
```

Open http://localhost:3000. Click INITIALIZE. Drag TTS slider up. After Whisper produces a transcription, the browser should speak the phantom text in a low, slow, uncanny voice. Drag to 0 — goes silent.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useTTS.ts src/app/page.tsx
git commit -m "feat: add TTS integration for speaking phantom transcriptions"
```

---

## Task 12: Zener Presets + Auto-Rotation

**Files:**
- Create: `src/lib/zener-presets.ts`
- Create: `__tests__/zener-presets.test.ts`
- Modify: `src/components/ZenerStation.tsx`

- [ ] **Step 1: Write failing tests for preset mask generation**

Create `__tests__/zener-presets.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { generatePresetMask } from "@/lib/zener-presets";

describe("generatePresetMask", () => {
  it("generates a 120x120 binary mask", () => {
    const mask = generatePresetMask("circle", 120, 120);
    expect(mask.length).toBe(120 * 120);
  });

  it("circle has filled pixels in center", () => {
    const mask = generatePresetMask("circle", 120, 120);
    // Center pixel should be filled
    expect(mask[60 * 120 + 60]).toBe(1);
  });

  it("circle has empty pixels in corners", () => {
    const mask = generatePresetMask("circle", 120, 120);
    expect(mask[0]).toBe(0);
    expect(mask[119]).toBe(0);
  });

  it("all five presets produce non-empty masks", () => {
    const shapes = ["circle", "triangle", "square", "star", "plus"] as const;
    for (const shape of shapes) {
      const mask = generatePresetMask(shape, 120, 120);
      const sum = mask.reduce((a, b) => a + b, 0);
      expect(sum).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/zener-presets.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement preset mask generation**

Create `src/lib/zener-presets.ts`:

```typescript
export type ZenerShape = "circle" | "triangle" | "square" | "star" | "plus";

export function generatePresetMask(
  shape: ZenerShape,
  width: number,
  height: number
): Uint8Array {
  const mask = new Uint8Array(width * height);
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) * 0.4;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const dx = x - cx;
      const dy = y - cy;

      switch (shape) {
        case "circle":
          mask[idx] = Math.sqrt(dx * dx + dy * dy) <= r ? 1 : 0;
          break;

        case "square":
          mask[idx] = Math.abs(dx) <= r * 0.8 && Math.abs(dy) <= r * 0.8 ? 1 : 0;
          break;

        case "triangle": {
          const normX = dx / r;
          const normY = dy / r;
          const inTri =
            normY >= -0.7 &&
            normY <= 0.8 &&
            normX >= -(0.8 - (normY + 0.7) * 0.533) &&
            normX <= 0.8 - (normY + 0.7) * 0.533;
          mask[idx] = inTri ? 1 : 0;
          break;
        }

        case "plus":
          mask[idx] =
            (Math.abs(dx) <= r * 0.25 && Math.abs(dy) <= r * 0.8) ||
            (Math.abs(dy) <= r * 0.25 && Math.abs(dx) <= r * 0.8)
              ? 1
              : 0;
          break;

        case "star": {
          const angle = Math.atan2(dy, dx);
          const dist = Math.sqrt(dx * dx + dy * dy);
          const starR =
            r * (0.4 + 0.6 * Math.abs(Math.cos(2.5 * angle)));
          mask[idx] = dist <= starR ? 1 : 0;
          break;
        }
      }
    }
  }

  return mask;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/zener-presets.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Update ZenerStation with presets and auto-rotation**

Replace `src/components/ZenerStation.tsx` with:

```tsx
"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { generatePresetMask, type ZenerShape } from "@/lib/zener-presets";

interface ZenerStationProps {
  coherenceScore: number;
  onMaskChange: (mask: Uint8Array | null, width: number, height: number) => void;
}

const PRESETS: ZenerShape[] = ["circle", "triangle", "square", "star", "plus"];
const PRESET_LABELS: Record<ZenerShape, string> = {
  circle: "O",
  triangle: "△",
  square: "□",
  star: "☆",
  plus: "+",
};
const ROTATION_INTERVAL = 45000;
const CANVAS_SIZE = 120;

export default function ZenerStation({
  coherenceScore,
  onMaskChange,
}: ZenerStationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [locked, setLocked] = useState(false);
  const [activePreset, setActivePreset] = useState<ZenerShape | null>(null);
  const rotationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const presetIdxRef = useRef(0);

  const drawPresetToCanvas = useCallback(
    (shape: ZenerShape) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const mask = generatePresetMask(shape, CANVAS_SIZE, CANVAS_SIZE);
      const imgData = ctx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
      for (let i = 0; i < mask.length; i++) {
        const v = mask[i] * 255;
        imgData.data[i * 4] = v;
        imgData.data[i * 4 + 1] = v;
        imgData.data[i * 4 + 2] = v;
        imgData.data[i * 4 + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
      onMaskChange(mask, CANVAS_SIZE, CANVAS_SIZE);
    },
    [onMaskChange]
  );

  const selectPreset = useCallback(
    (shape: ZenerShape) => {
      setActivePreset(shape);
      setLocked(true);
      drawPresetToCanvas(shape);
      if (rotationRef.current) {
        clearInterval(rotationRef.current);
        rotationRef.current = null;
      }
    },
    [drawPresetToCanvas]
  );

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    onMaskChange(null, 0, 0);
    setLocked(false);
    setActivePreset(null);
    startRotation();
  }, [onMaskChange]);

  const startRotation = useCallback(() => {
    if (rotationRef.current) clearInterval(rotationRef.current);
    const rotate = () => {
      const shape = PRESETS[presetIdxRef.current % PRESETS.length];
      presetIdxRef.current++;
      setActivePreset(shape);
      drawPresetToCanvas(shape);
    };
    rotate();
    rotationRef.current = setInterval(rotate, ROTATION_INTERVAL);
  }, [drawPresetToCanvas]);

  useEffect(() => {
    startRotation();
    return () => {
      if (rotationRef.current) clearInterval(rotationRef.current);
    };
  }, [startRotation]);

  const extractFreehandMask = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const mask = new Uint8Array(CANVAS_SIZE * CANVAS_SIZE);
    for (let i = 0; i < mask.length; i++) {
      mask[i] = imgData.data[i * 4] > 128 ? 1 : 0;
    }
    onMaskChange(mask, CANVAS_SIZE, CANVAS_SIZE);
    setLocked(true);
  }, [onMaskChange]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      setIsDrawing(true);
      setActivePreset(null);
      if (rotationRef.current) {
        clearInterval(rotationRef.current);
        rotationRef.current = null;
      }
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#0a0a0a";
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
      const y = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * CANVAS_SIZE;
      const y = ((e.clientY - rect.top) / rect.height) * CANVAS_SIZE;
      ctx.lineTo(x, y);
      ctx.stroke();
    },
    [isDrawing]
  );

  const handlePointerUp = useCallback(() => {
    setIsDrawing(false);
    extractFreehandMask();
  }, [extractFreehandMask]);

  return (
    <div className="panel" style={styles.container}>
      <div className="hud-label" style={{ marginBottom: 8 }}>
        ZENER
      </div>
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={styles.drawCanvas}
      />
      <div style={styles.presets}>
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => selectPreset(p)}
            style={{
              ...styles.presetBtn,
              borderColor:
                activePreset === p
                  ? "var(--phosphor-green)"
                  : "var(--border-color)",
              textShadow:
                activePreset === p ? "0 0 6px var(--phosphor-green)" : "none",
            }}
          >
            {PRESET_LABELS[p]}
          </button>
        ))}
      </div>
      <button onClick={clearCanvas} style={styles.clearBtn}>
        CLEAR
      </button>
      <div style={{ marginTop: 12, textAlign: "center" }}>
        <div className="hud-label">COHERENCE</div>
        <div style={{ fontSize: "1.5rem", color: "var(--phosphor-green)" }}>
          {coherenceScore.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: "100%",
    padding: 12,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    overflowY: "auto",
  },
  drawCanvas: {
    width: "100%",
    maxWidth: 150,
    aspectRatio: "1",
    border: "1px solid var(--phosphor-green-dim)",
    cursor: "crosshair",
    touchAction: "none",
  },
  presets: { display: "flex", gap: 6 },
  presetBtn: {
    fontFamily: "var(--font-main)",
    fontSize: "1.25rem",
    width: 32,
    height: 32,
    background: "var(--bg-dark)",
    color: "var(--phosphor-green)",
    border: "1px solid var(--border-color)",
    cursor: "pointer",
    minHeight: 44,
    minWidth: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  clearBtn: {
    fontFamily: "var(--font-main)",
    fontSize: "0.75rem",
    color: "var(--phosphor-green-dim)",
    background: "transparent",
    border: "1px solid var(--border-color)",
    padding: "2px 8px",
    cursor: "pointer",
  },
};
```

- [ ] **Step 6: Update page.tsx handleMaskChange signature**

In `src/app/page.tsx`, update the mask state and handler:

```tsx
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
```

And update the ZenerStation prop:

```tsx
<ZenerStation
  coherenceScore={coherenceScore}
  onMaskChange={handleMaskChange}
/>
```

- [ ] **Step 7: Verify presets and drawing work**

```bash
npm run dev
```

Open http://localhost:3000. Expected: Zener panel shows auto-rotating preset shapes (circle → triangle → square → star → plus every 45s). Click a preset to lock it. Draw freehand to override. Click CLEAR to resume rotation.

- [ ] **Step 8: Commit**

```bash
git add src/lib/zener-presets.ts __tests__/zener-presets.test.ts src/components/ZenerStation.tsx src/app/page.tsx
git commit -m "feat: add Zener presets, freehand drawing, auto-rotation"
```

---

## Task 13: Shape Correlation Scoring + Coherence Visualization

**Files:**
- Create: `src/lib/shape-correlation.ts`
- Create: `__tests__/shape-correlation.test.ts`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Write failing tests**

Create `__tests__/shape-correlation.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { correlateNoiseMask } from "@/lib/shape-correlation";

describe("correlateNoiseMask", () => {
  it("returns 100% when noise matches mask perfectly", () => {
    const mask = new Uint8Array([1, 0, 1, 0, 1, 0, 1, 0, 1]);
    const noise = new Float32Array([1, 0, 1, 0, 1, 0, 1, 0, 1]);
    const result = correlateNoiseMask(noise, mask, 3, 3, 3, 3);
    expect(result.score).toBeCloseTo(100, 0);
  });

  it("returns ~50% for uncorrelated random data", () => {
    const size = 1000;
    const mask = new Uint8Array(size);
    const noise = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      mask[i] = i % 2;
      noise[i] = (i + 1) % 2;
    }
    const result = correlateNoiseMask(
      noise,
      mask,
      Math.sqrt(size),
      Math.sqrt(size),
      Math.sqrt(size),
      Math.sqrt(size)
    );
    expect(result.score).toBeLessThan(10);
  });

  it("returns a tintMap with correct dimensions", () => {
    const mask = new Uint8Array([1, 0, 1, 0]);
    const noise = new Float32Array([0.8, 0.2, 0.9, 0.1]);
    const result = correlateNoiseMask(noise, mask, 2, 2, 2, 2);
    expect(result.tintMap.length).toBe(4);
  });

  it("tintMap highlights pixels where mask=1 and noise is bright", () => {
    const mask = new Uint8Array([1, 0]);
    const noise = new Float32Array([0.9, 0.9]);
    const result = correlateNoiseMask(noise, mask, 2, 1, 2, 1);
    expect(result.tintMap[0]).toBeGreaterThan(0);
    expect(result.tintMap[1]).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/shape-correlation.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement shape correlation**

Create `src/lib/shape-correlation.ts`:

```typescript
import type { CoherenceResult } from "@/types";

export function correlateNoiseMask(
  noise: Float32Array,
  mask: Uint8Array,
  noiseW: number,
  noiseH: number,
  maskW: number,
  maskH: number
): CoherenceResult {
  const tintMap = new Uint8Array(noiseW * noiseH);

  const scaleX = maskW / noiseW;
  const scaleY = maskH / noiseH;

  let matchCount = 0;
  let maskPixelCount = 0;

  for (let y = 0; y < noiseH; y++) {
    for (let x = 0; x < noiseW; x++) {
      const mx = Math.min(Math.floor(x * scaleX), maskW - 1);
      const my = Math.min(Math.floor(y * scaleY), maskH - 1);
      const maskVal = mask[my * maskW + mx];

      if (maskVal > 0) {
        maskPixelCount++;
        const noiseVal = noise[y * noiseW + x];
        const threshold = 0.5;

        if (noiseVal >= threshold) {
          matchCount++;
          const intensity = Math.round(
            ((noiseVal - threshold) / (1 - threshold)) * 180
          );
          tintMap[y * noiseW + x] = intensity;
        }
      }
    }
  }

  const score =
    maskPixelCount > 0 ? (matchCount / maskPixelCount) * 100 : 0;

  return { score, tintMap };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/shape-correlation.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Wire coherence scoring into the main loop**

In `src/app/page.tsx`, add import:

```tsx
import { correlateNoiseMask } from "@/lib/shape-correlation";
```

Update the animation loop's `if (frame)` block to include coherence scoring after computing the grid:

```tsx
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
```

- [ ] **Step 6: Verify coherence scoring works**

```bash
npm run dev
```

Open http://localhost:3000. Click INITIALIZE. Select a Zener shape or draw one. The coherence percentage should fluctuate around ~50% (random noise). In the hero canvas, pixels matching the shape region should show a subtle green tint. The analog meter percentage should update in real-time.

- [ ] **Step 7: Commit**

```bash
git add src/lib/shape-correlation.ts __tests__/shape-correlation.test.ts src/app/page.tsx
git commit -m "feat: add shape correlation scoring with coherence tinting"
```

---

## Task 14: Analog Meter Component

**Files:**
- Create: `src/components/AnalogMeter.tsx`
- Modify: `src/components/ZenerStation.tsx`

- [ ] **Step 1: Implement the analog meter**

Create `src/components/AnalogMeter.tsx`:

```tsx
"use client";

import { useRef, useEffect } from "react";

interface AnalogMeterProps {
  value: number;
  width?: number;
  height?: number;
}

export default function AnalogMeter({
  value,
  width = 150,
  height = 90,
}: AnalogMeterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const smoothedRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    smoothedRef.current += (value - smoothedRef.current) * 0.1;
    const v = smoothedRef.current;

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height - 10;
    const radius = height - 20;

    // Arc background
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI, 0);
    ctx.strokeStyle = "#1a3a1a";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tick marks
    for (let i = 0; i <= 10; i++) {
      const angle = Math.PI + (i / 10) * Math.PI;
      const inner = radius - 8;
      const outer = radius;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.strokeStyle = "#1a8c1a";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Needle
    const needleAngle = Math.PI + (v / 100) * Math.PI;
    const needleLen = radius - 12;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(needleAngle) * needleLen,
      cy + Math.sin(needleAngle) * needleLen
    );
    ctx.strokeStyle = "#33ff33";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Needle glow
    ctx.shadowColor = "#33ff33";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#33ff33";
    ctx.fill();
    ctx.shadowBlur = 0;

    // Label
    ctx.font = "12px VT323";
    ctx.fillStyle = "#1a8c1a";
    ctx.textAlign = "left";
    ctx.fillText("0", cx - radius + 5, cy - 4);
    ctx.textAlign = "right";
    ctx.fillText("100", cx + radius - 5, cy - 4);
  }, [value, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ width: "100%", maxWidth: width }}
    />
  );
}
```

- [ ] **Step 2: Integrate meter into ZenerStation**

In `src/components/ZenerStation.tsx`, add import:

```tsx
import AnalogMeter from "./AnalogMeter";
```

Replace the numeric coherence readout section (the `<div>` with COHERENCE label and percentage) with:

```tsx
<div style={{ marginTop: 12, textAlign: "center", width: "100%" }}>
  <AnalogMeter value={coherenceScore} />
  <div className="hud-label" style={{ marginTop: 4 }}>COHERENCE</div>
  <div style={{ fontSize: "1.5rem", color: "var(--phosphor-green)" }}>
    {coherenceScore.toFixed(1)}%
  </div>
</div>
```

- [ ] **Step 3: Verify the meter renders and animates**

```bash
npm run dev
```

Open http://localhost:3000. Click INITIALIZE, select a shape. The analog meter needle should smoothly swing to match the coherence percentage, with green glow at the pivot point.

- [ ] **Step 4: Commit**

```bash
git add src/components/AnalogMeter.tsx src/components/ZenerStation.tsx
git commit -m "feat: add animated analog VU meter for coherence display"
```

---

## Task 15: Intro Modal

**Files:**
- Create: `src/components/IntroModal.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Implement the intro modal**

Create `src/components/IntroModal.tsx`:

```tsx
"use client";

interface IntroModalProps {
  onStart: () => void;
  onClose: () => void;
  isFirstVisit: boolean;
}

export default function IntroModal({
  onStart,
  onClose,
  isFirstVisit,
}: IntroModalProps) {
  return (
    <div style={styles.overlay}>
      <div className="panel" style={styles.modal}>
        <h1
          className="title-glow"
          style={{ textAlign: "center", marginBottom: 16 }}
        >
          PAREIDOLATOR
        </h1>
        <p style={styles.tagline}>
          A machine that listens to quantum noise and hears phantom voices.
          Your webcam&apos;s sensor noise becomes the signal. What it hears
          is up to the void.
        </p>

        <div style={styles.section}>
          <h2 style={styles.heading}>PERMISSIONS</h2>
          <p style={styles.text}>
            This app requires <strong>webcam access</strong> to extract
            random noise from your camera sensor. No video is recorded or
            transmitted. All processing happens locally in your browser.
            No data leaves this page.
          </p>
        </div>

        <div style={styles.section}>
          <h2 style={styles.heading}>HOW TO USE</h2>
          <ul style={styles.list}>
            <li>The center display shows raw pixel noise from your sensor</li>
            <li>
              Whisper AI listens to this noise and hallucinates words —
              the transcript appears on the left
            </li>
            <li>
              Draw a symbol on the right panel (or pick a preset) and
              concentrate — watch the coherence meter
            </li>
            <li>
              Adjust TEMP to control hallucination intensity, CHUNK for
              how often it listens
            </li>
            <li>
              Turn up NOISE to hear the raw static, TTS to hear the
              phantom voices speak
            </li>
          </ul>
        </div>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          {isFirstVisit ? (
            <button onClick={onStart} style={styles.startBtn}>
              INITIALIZE
            </button>
          ) : (
            <button onClick={onClose} style={styles.startBtn}>
              RESUME
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10000,
    padding: 16,
  },
  modal: {
    maxWidth: 520,
    width: "100%",
    padding: 32,
    maxHeight: "90vh",
    overflowY: "auto",
  },
  tagline: {
    color: "var(--phosphor-green-dim)",
    fontSize: "1.1rem",
    lineHeight: 1.5,
    textAlign: "center",
    marginBottom: 24,
  },
  section: { marginBottom: 20 },
  heading: {
    color: "var(--phosphor-green)",
    fontSize: "1rem",
    marginBottom: 8,
    textShadow: "0 0 4px var(--phosphor-green)",
  },
  text: {
    color: "var(--phosphor-green-dim)",
    fontSize: "0.95rem",
    lineHeight: 1.5,
  },
  list: {
    color: "var(--phosphor-green-dim)",
    fontSize: "0.95rem",
    lineHeight: 1.7,
    paddingLeft: 20,
  },
  startBtn: {
    fontFamily: "var(--font-main)",
    fontSize: "1.5rem",
    color: "var(--phosphor-green)",
    background: "transparent",
    border: "2px solid var(--phosphor-green)",
    padding: "12px 40px",
    cursor: "pointer",
    textShadow: "0 0 8px var(--phosphor-green)",
    boxShadow: "0 0 16px rgba(51,255,51,0.3)",
  },
};
```

- [ ] **Step 2: Wire modal into page.tsx**

In `src/app/page.tsx`, add import:

```tsx
import IntroModal from "@/components/IntroModal";
```

Replace the `showIntro` state initialization with localStorage check:

```tsx
const [showIntro, setShowIntro] = useState(true);
const [hasVisited, setHasVisited] = useState(false);

useEffect(() => {
  const visited = localStorage.getItem("pareidolator-visited");
  if (visited) {
    setShowIntro(false);
    setHasVisited(true);
  }
}, []);
```

Add modal handlers:

```tsx
const handleIntroStart = useCallback(async () => {
  localStorage.setItem("pareidolator-visited", "true");
  setShowIntro(false);
  setHasVisited(true);
  await startSession();
}, [startSession]);

const handleIntroClose = useCallback(() => {
  setShowIntro(false);
}, []);
```

Add the modal to the JSX, before the closing `</div>` of the cockpit:

```tsx
{showIntro && (
  <IntroModal
    onStart={handleIntroStart}
    onClose={handleIntroClose}
    isFirstVisit={!hasVisited}
  />
)}
```

Update the info button handler:

```tsx
onInfoClick={() => setShowIntro(true)}
```

- [ ] **Step 3: Verify modal works**

```bash
npm run dev
```

Clear localStorage first (DevTools → Application → Local Storage → clear). Reload. Expected: modal appears with glowing title, explanation, and INITIALIZE button. Click INITIALIZE — modal closes, webcam starts. Click `[?]` in top bar — modal reopens with RESUME button.

- [ ] **Step 4: Commit**

```bash
git add src/components/IntroModal.tsx src/app/page.tsx
git commit -m "feat: add intro modal with first-visit detection and info button"
```

---

## Task 16: Mobile Responsive Layout

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add responsive CSS**

Append to `src/app/globals.css`:

```css
/* Mobile portrait layout */
@media (max-width: 767px) {
  .cockpit-main {
    flex-direction: column !important;
  }

  .cockpit-transcript {
    width: 100% !important;
    height: auto !important;
    max-height: 150px;
    order: 2;
  }

  .cockpit-hero {
    width: 100% !important;
    min-height: 200px;
    max-height: 40vh;
    order: 1;
  }

  .cockpit-zener {
    width: 100% !important;
    height: auto !important;
    order: 3;
  }

  .cockpit-bottom-panels {
    display: flex !important;
    flex-direction: row;
    order: 2;
  }

  .cockpit-transcript,
  .cockpit-zener {
    flex: 1;
    min-width: 0;
  }
}

/* Mobile landscape */
@media (max-height: 500px) {
  .title-glow {
    font-size: 1.25rem;
  }

  .cockpit-transcript {
    width: 160px !important;
  }

  .cockpit-zener {
    width: 160px !important;
  }
}
```

- [ ] **Step 2: Add CSS class names to page.tsx layout divs**

In `src/app/page.tsx`, add `className` props to the layout divs. Update the `<div style={styles.main}>` and its children:

```tsx
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
```

- [ ] **Step 3: Verify responsive layout**

```bash
npm run dev
```

Open http://localhost:3000. Use Chrome DevTools device toolbar to test:
- iPhone 14 (390px): hero on top full-width, transcript and Zener side-by-side below, controls compact
- iPad (768px+): desktop three-column layout
- Landscape mobile: panels shrink proportionally

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css src/app/page.tsx
git commit -m "feat: add mobile responsive layout"
```

---

## Task 17: Session Recording / Export

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add recording logic to page.tsx**

Add a recording ref and export function in `src/app/page.tsx`:

```tsx
const recordingRef = useRef<{
  entries: TranscriptEntry[];
  coherenceLog: { time: number; score: number }[];
  startTime: number;
}>({ entries: [], coherenceLog: [], startTime: 0 });

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
```

Update the BottomBar to use the new handler:

```tsx
<BottomBar
  noiseVolume={noiseVolume}
  ttsVolume={ttsVolume}
  onNoiseVolumeChange={setNoiseVolume}
  onTtsVolumeChange={setTtsVolume}
  onRecordClick={handleRecordClick}
  isRecording={isRecording}
/>
```

- [ ] **Step 2: Verify recording works**

```bash
npm run dev
```

Open http://localhost:3000, start a session, click REC. Let it run for 10-15 seconds with Whisper producing output. Click REC again. Expected: a JSON file downloads with session metadata, transcript entries, and coherence log.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add session recording and JSON export"
```

---

## Task 18: GitHub Pages Deployment

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create the GitHub Actions workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci
      - run: npm run build

      - uses: actions/upload-pages-artifact@v3
        with:
          path: out

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Verify the build succeeds locally**

```bash
npm run build
```

Expected: `out/` directory created with static HTML, JS, and CSS files. No build errors.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat: add GitHub Pages deployment workflow"
```

---

## Task 19: Final Integration Verification

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass (noise extraction, shape correlation, transcript scorer, zener presets).

- [ ] **Step 2: Run the full build**

```bash
npm run build
```

Expected: Clean build, no errors, `out/` directory produced.

- [ ] **Step 3: Full end-to-end manual test**

```bash
npm run dev
```

Open http://localhost:3000. Verify:
1. Intro modal appears on first visit with INITIALIZE button
2. Clicking INITIALIZE requests webcam, starts the session
3. Noise field shows live LSB static with VHS post-processing (scanlines, chromatic aberration, tracking distortion)
4. Top bar controls work: MODEL dropdown, CHUNK slider, TEMP slider (color changes)
5. Glowing pulsing green PAREIDOLATOR title in top-right
6. `[?]` button reopens the intro modal
7. After model loads, transcript entries appear in left panel with token brightness varying
8. NOISE slider plays white noise audio at adjustable volume
9. TTS slider speaks phantom transcriptions at adjustable volume
10. Zener presets auto-rotate every 45 seconds
11. Click a preset to lock it, draw freehand to override, CLEAR to resume rotation
12. Coherence percentage and analog meter update in real-time
13. Green tinting visible on hero canvas where noise matches target shape
14. REC button starts/stops recording, downloads JSON on stop
15. Mobile layout: test at 390px width — hero on top, panels below

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration polish"
```
