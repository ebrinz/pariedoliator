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
