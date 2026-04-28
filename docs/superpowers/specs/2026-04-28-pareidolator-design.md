# Pareidolator — Design Spec

A browser-based pareidolia machine that extracts quantum-level noise from a webcam sensor, converts it to white noise audio, feeds it to Whisper to hallucinate phantom speech, speaks the hallucinations via TTS, and simultaneously lets the user attempt to will the visual noise into coherent shapes.

Deployed as a static Next.js app on GitHub Pages. Runs entirely client-side — no servers, no API keys, no data leaves the browser.

## Tech Stack

- **Framework:** Next.js (static export for GitHub Pages)
- **Speech-to-text:** Whisper via Transformers.js (WASM backend, Safari-compatible)
- **Text-to-speech:** Web Speech API `speechSynthesis`
- **Audio:** Web Audio API for noise playback
- **Rendering:** Canvas 2D (noise extraction + shape scoring) → WebGL 2 (VHS/CRT post-processing)
- **Font:** VT323 (Google Fonts) — VT100 terminal aesthetic
- **Styling:** CSS with LucasArts-inspired pixel text effects

## Architecture & Data Flow

```
Webcam → Canvas 2D (hidden) → Extract LSB pixel data
                                    |
                    +---------------+---------------+
                    |               |               |
             Pack as PCM      Raw pixel grid    Shape correlation
             audio samples    to WebGL for      against user's
                    |         VHS post-process   drawn target
                    |               |               |
             Web Audio API    Hero display      Coherence meter
             (white noise)    (noise field +    + pixel tinting
                    |         CRT/VHS effects)
                    |
             Whisper (Transformers.js, WASM)
                    |
             Token log-probs -> Score & highlight
                    |
             Transcript log panel (scrolling)
                    |
             speechSynthesis (TTS, toggleable)
```

### Core Loop (~15-30fps)

1. Grab webcam frame on a hidden canvas
2. Extract LSB noise from pixel RGB data (1-2 least significant bits per channel)
3. Fork the data three ways: audio generation, visual display, shape scoring
4. Every N seconds (configurable 2-10s), accumulate an audio buffer and feed to Whisper
5. Whisper returns tokens + log-probs, append to transcript, score for coherence
6. High-confidence phrases highlighted in the transcript log
7. Optionally spoken via TTS

### Key Constraint

Whisper inference is async and slow (2-15s per chunk depending on model). The visual loop runs independently at frame rate. Whisper processes in the background via a Web Worker and results arrive when ready.

## Whisper Configuration

- **Models available:** whisper-tiny (~75MB, default), whisper-small (~244MB, optional)
- **User selects at runtime** via HUD dropdown. Tiny loads by default, small available for beefier machines.
- **Temperature:** Exposed as a HUD slider, range 0.1-1.5, default 0.8. Higher = more unhinged hallucinations, lower = more precise/coherent phantom phrases.
- **Chunk duration:** Configurable 2-10s via HUD slider. Shorter chunks = more frequent but fragmentary results. Longer = more coherent phrases but slower feedback.
- **Token log-probabilities:** Returned by Transformers.js for each token. Used for transcript scoring.

## Noise Source: Webcam LSB Extraction

The webcam sensor has inherent shot noise (quantum, from photon statistics) and thermal noise at the pixel level. The least significant bits of each pixel are dominated by this noise and are genuinely random.

### Extraction Process

1. Request webcam via `getUserMedia()` with low resolution (e.g., 320x240 — more pixels than needed, keeps it fast)
2. Draw each frame to a hidden canvas
3. Call `getImageData()` to get raw RGBA pixel array
4. Extract the 1-2 LSBs from each R, G, B channel
5. These bits are the noise source for both audio and visual display

### Audio Conversion

- Pack extracted LSBs into 8-bit unsigned PCM samples (lo-fi, fits the aesthetic)
- Feed to a Web Audio API `AudioBufferSourceNode` for playback (toggleable)
- Accumulate into a buffer for Whisper processing on the configured chunk interval

## UI Layout — The Cockpit

```
+-------------------------------------------------------------+
| MODEL [tiny v]  CHUNK [--o--]  TEMP [----o]   PAREIDOLATOR  |
|                  2-10s          0.1-1.5    (glowing green)   |
+----------+----------------------------------+---------------+
|          |                                  |               |
|  T       |                                  |  ZENER        |
|  R       |                                  |  +----------+ |
|  A       |        NOISE FIELD               |  | freehand | |
|  N       |        (hero canvas)             |  | draw     | |
|  S       |                                  |  | canvas   | |
|  C       |        VHS/CRT post-process      |  +----------+ |
|  R       |        scanlines, tracking       |  O /\ [] * +  |
|  I       |        chromatic aberration      |               |
|  P       |                                  |  +----------+ |
|  T       |                                  |  | analog   | |
|          |                                  |  | meter    | |
|  LOG     |                                  |  +----------+ |
|          |                                  |  Coherence    |
|          |                                  |  34.7%        |
+----------+----------------------------------+---------------+
| NOISE [--------o--]  |  TTS [--------o--]  |     REC       |
+-------------------------------------------------------------+
```

### Top Bar — Controls

- **MODEL:** Dropdown selector — `tiny` (default) / `small`
- **CHUNK:** Slider — 2s to 10s, controls how much audio is buffered before sending to Whisper
- **TEMP:** Slider — 0.1 to 1.5, controls Whisper temperature. Label color shifts from cool blue (low) to hot amber (high) as visual feedback.
- **PAREIDOLATOR:** Title, top-right. VT323 font, bright phosphor green (#33ff33), multi-layer text-shadow CRT bloom, slow 3-second brightness pulse (70%-100%), subtle letter-spacing jitter on pulse for voltage fluctuation feel. LucasArts-style pixel drop shadow for depth.

### Left Panel — Transcript Log

- Scrolling log of Whisper output, newest at bottom
- Token coloring based on log-probability:
  - High log-prob (confident hallucinations): bright white/amber glow
  - Low log-prob (noise babble): dim grey
  - Consecutive high-confidence tokens: pulse with a VHS glitch burst effect
- Secondary coherence scoring: simple bigram/trigram frequency check (bundled lookup table, no API) to flag statistically unlikely phrases from random input
- Styled as VHS closed captions — chunky, slightly flickering

### Center — Hero Noise Field

- The main canvas, dominant visual element
- Displays raw LSB pixel noise from the webcam
- Rendered first to Canvas 2D (where pixel data is extracted), then passed as a texture to WebGL for VHS post-processing
- Pixels that correlate with the target shape tint subtly (coherence visualization — see Zener section)

### Right Panel — Zener Station

- **Drawing canvas:** Small freehand drawing area where the user inscribes their target symbol. This is the primary input — the user draws whatever shape they want to concentrate on.
- **Preset shortcuts:** Five Zener card symbols below the drawing canvas (circle, triangle, square, star, plus). Clicking a preset loads it into the drawing canvas.
- **Auto-rotation:** By default, presets rotate every 45 seconds. User can click a symbol or draw to lock. Click again or clear to resume auto-rotation.
- **Analog meter:** A needle gauge showing coherence score, styled as a vintage VU meter. Needle swings in response to real-time correlation scoring.
- **Numeric readout:** Percentage below the meter.

### Bottom Bar

- **NOISE volume:** Slider controlling the white noise audio output level. Off by default.
- **TTS volume:** Slider controlling speech synthesis volume. Off by default.
- **REC:** Optional session record/export button. Saves transcript + coherence log as a downloadable file.

## Coherence Scoring — Shape Detection

### Correlation Method

1. User's drawn symbol (or preset) is captured as a binary mask from the drawing canvas
2. The LSB noise field is thresholded to binary each frame
3. Cross-correlation between the noise binary and the target mask, computed per-frame
4. Correlation score normalized to 0-100% and drives:
   - The analog needle meter
   - The numeric readout
   - Pixel tinting in the hero canvas (pixels contributing to correlation glow subtly in the target region)

### Pixel Tinting (Coherence Visualization)

- Overlay the target mask position on the noise field
- Pixels where noise matches the expected target pattern get a subtle color tint (e.g., faint green or amber)
- The tinting intensity scales with the coherence score
- Effect is subtle enough to not overwhelm the raw noise aesthetic but visible enough to provide feedback
- Creates the experience of the shape "emerging" from the static

## Transcript Scoring

### Token-Level Scoring

- Whisper returns log-probabilities per token via Transformers.js
- High log-prob tokens indicate Whisper is "confident" — these are the meaningful pareidolia hits
- Token display brightness maps to log-prob value

### Phrase-Level Scoring

- Bigram/trigram frequency check against a small bundled English language model (simple JSON lookup, ~50KB)
- Consecutive tokens that form statistically improbable-from-noise phrases get flagged
- Flagged phrases receive a VHS glitch highlight effect in the transcript

## VHS/CRT Post-Processing Shader (WebGL 2)

Single-pass fragment shader applied to the noise field canvas texture. Seven composited layers:

### Layer 1 — Scanlines
Horizontal darkened lines every 2-3 pixels. Subtle opacity (~15-20%). The CRT baseline texture that everything sits on.

### Layer 2 — Chromatic Aberration
RGB channels offset horizontally by 1-2 pixels in opposite directions. Slight color fringing on all content. The red channel shifts left, blue shifts right.

### Layer 3 — Tracking Distortion
Bottom 15-20% of the screen gets horizontal displacement that rolls upward slowly. Amplitude varies via a noise function. The signature "dirty VHS heads" effect. Displacement amount oscillates over time.

### Layer 4 — Horizontal Noise Bars
Occasional thin bands (2-5px tall) of bright white noise that sweep vertically across the frame. Triggered randomly, ~2-4 per second. Tape dropout simulation.

### Layer 5 — Phosphor Glow
Slight bloom on bright pixels via additive blending with a 3-tap box sample (cheap single-pass approximation). Particularly visible on the green UI text and high-confidence transcript tokens.

### Layer 6 — Vignette & Barrel Distortion
Darkened corners with smooth falloff. Slight barrel distortion to simulate CRT screen curvature. Subtle — just enough to register subconsciously.

### Layer 7 — Film Grain
Fine per-pixel noise overlay. Very subtle, animates each frame. Adds texture to flat areas without competing with the main noise field.

All layers driven by `uniform float uTime` for animation. Single-pass, Safari WebGL 2 compatible.

## Aesthetic Guidelines

### Overall Mood
80s Spielberg horror meets 70s cult classic. Poltergeist through a worn VHS tape. The interface should feel like a piece of equipment you found in the basement of a shuttered parapsychology lab.

### Typography
- **VT323** throughout — title, labels, transcript, readouts
- Title "PAREIDOLATOR": phosphor green (#33ff33), multi-layer CRT bloom text-shadow, 3s brightness pulse, letter-spacing jitter, LucasArts pixel drop shadow
- HUD labels: dimmer green or amber, smaller size
- Transcript: white/amber for confident tokens, grey for noise

### Color Palette
- Background: near-black (#0a0a0a)
- Primary text/UI: phosphor green (#33ff33)
- Secondary: amber (#ffaa00) for warnings/high-temperature indicators
- Accent: cool blue (#4488ff) for low-temperature indicators
- Transcript highlights: warm white (#fff5e0) for high-confidence, dim grey (#444) for low-confidence

### LucasArts Touches
- Pixel-perfect drop shadows on text (1px offset, dark)
- Slight emboss/bevel effect on panel borders
- UI elements feel like SCUMM engine verb bars — chunky, tactile, clearly clickable
- Dithered gradients where possible instead of smooth CSS gradients

## Intro Modal

A modal overlay shown on first visit (and accessible anytime via an info button in the top bar).

### Content
- **Title:** "PAREIDOLATOR" in glowing green
- **Tagline:** Brief atmospheric description — what this machine does and why
- **Permissions:** Explains that the app needs webcam access, why (sensor noise as randomness source), and that no data leaves the browser
- **How to use:** Short bullet list — what the noise field is, what the transcript shows, how to draw/select Zener shapes, what the controls do
- **Start button:** "INITIALIZE" — dismisses the modal and triggers the webcam permission request
- **Aesthetic:** Same VHS/CRT treatment as the main UI — scanline overlay, VT323 font, dark background with phosphor green text

### Info Button
- Small `[?]` or `[i]` icon in the top bar, next to the title
- Re-opens the modal at any time
- Does not interrupt the running session — modal overlays on top, dismiss to resume

### First Visit Behavior
- Modal shown automatically on first load
- A `localStorage` flag tracks whether the user has dismissed it
- Subsequent visits skip the modal and go straight to the cockpit (webcam permission still requested on start)

## Responsive / Mobile Layout

The cockpit adapts to mobile viewports (portrait and landscape).

### Portrait (< 768px width)
```
+---------------------------+
| PAREIDOLATOR        [?]   |
+---------------------------+
|                           |
|       NOISE FIELD         |
|       (hero canvas)       |
|                           |
+---------------------------+
| MODEL [tiny v] TEMP [--o] |
| CHUNK [--o--]             |
+-------------+-------------+
| TRANSCRIPT  | ZENER       |
| LOG         | [draw box]  |
| (scrolling) | O /\ [] * + |
|             | [meter]     |
+-------------+-------------+
| NOISE [---o-] TTS [---o-] |
+---------------------------+
```

- Hero noise field stays dominant, full-width
- Controls collapse into a compact row below the hero
- Transcript and Zener panels stack side-by-side below controls (50/50 split)
- Bottom bar stays fixed at the bottom
- Drawing canvas shrinks but remains usable (min 120x120px touch target)
- All sliders switch to touch-friendly sizing (taller hit areas)

### Landscape Mobile (< 768px height)
- Similar to desktop layout but panels shrink proportionally
- Transcript log reduces to fewer visible lines
- Zener panel collapses to just the drawing canvas + presets (meter overlays on tap)

### Touch Interactions
- Drawing canvas supports touch/pointer events for freehand drawing
- Sliders use native range inputs styled to match the VHS aesthetic
- Tap Zener preset symbols to load them
- All interactive elements meet minimum 44x44px touch target

## Deployment

- Next.js with `output: 'export'` for static generation
- GitHub Pages via GitHub Actions (build on push to main)
- All assets (Whisper models, bigram table) loaded on-demand from CDN or bundled
- Whisper models loaded from Hugging Face Hub via Transformers.js (cached in browser after first load)
- No server-side code, no environment variables, no API keys

## Browser Support

- Chrome 90+ (full support)
- Safari 15.4+ (WebGL 2, WASM, speechSynthesis, getUserMedia all supported)
- Firefox 90+ (full support)
- Edge 90+ (full support)

## Performance Considerations

- Webcam capture at low resolution (320x240) to minimize pixel processing overhead
- Noise extraction and shape scoring on main thread (lightweight per-frame ops)
- Whisper inference in a Web Worker to avoid blocking the UI
- WebGL shader is single-pass, no multi-buffer ping-pong
- Model download is one-time, cached by the browser / Transformers.js cache
- Chunk duration slider lets users trade responsiveness for CPU load
