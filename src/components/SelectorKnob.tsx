"use client";

import { useRef, useCallback } from "react";

interface SelectorKnobProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  size?: number;
  onChange: (value: string) => void;
  disabled?: boolean;
  statusDot?: "loading" | "ready" | null;
}

const ARC_START = -120;
const ARC_END = 120;
const ARC_RANGE = ARC_END - ARC_START;

export default function SelectorKnob({
  label,
  options,
  value,
  size = 56,
  onChange,
  disabled,
  statusDot,
}: SelectorKnobProps) {
  const dragging = useRef(false);
  const startY = useRef(0);
  const startIdx = useRef(0);

  const idx = options.findIndex((o) => o.value === value);
  const pct = options.length > 1 ? idx / (options.length - 1) : 0;
  const angle = ARC_START + pct * ARC_RANGE;

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      e.preventDefault();
      dragging.current = true;
      startY.current = e.clientY;
      startIdx.current = idx;
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [idx, disabled]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const dy = startY.current - e.clientY;
      const steps = Math.round(dy / 30);
      const newIdx = Math.max(0, Math.min(options.length - 1, startIdx.current + steps));
      if (options[newIdx].value !== value) {
        onChange(options[newIdx].value);
      }
    },
    [value, options, onChange]
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const onClick = useCallback(() => {
    if (disabled) return;
    const next = (idx + 1) % options.length;
    onChange(options[next].value);
  }, [idx, options, onChange, disabled]);

  const cx = size / 2;
  const cy = size / 2;
  const knobR = size * 0.32;
  const detentR = size * 0.44;
  const labelR = size * 0.36;

  const displayVal = options[idx]?.label ?? value;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
      <span className="hud-label" style={{ fontSize: "0.65rem" }}>
        {label}
        {statusDot === "loading" && (
          <span className="phosphor-pulse" style={{ color: "var(--screen-amber)", fontSize: "0.6rem", marginLeft: 3 }}>
            ...
          </span>
        )}
        {statusDot === "ready" && (
          <span style={{ color: "var(--screen-amber-glow)", fontSize: "0.6rem", marginLeft: 3 }}>●</span>
        )}
      </span>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onClick={onClick}
        style={{ cursor: disabled ? "default" : "pointer", touchAction: "none" }}
      >
        <defs>
          <radialGradient id={`skg-${label}`} cx="42%" cy="38%">
            <stop offset="0%" stopColor="#f0ece4" />
            <stop offset="25%" stopColor="#ddd8cc" />
            <stop offset="55%" stopColor="#b8b0a0" />
            <stop offset="85%" stopColor="#908878" />
            <stop offset="100%" stopColor="#706858" />
          </radialGradient>
          <radialGradient id={`skd-${label}`} cx="40%" cy="35%">
            <stop offset="0%" stopColor="#908878" />
            <stop offset="100%" stopColor="#d4cfc4" />
          </radialGradient>
        </defs>

        {/* Chrome ring */}
        <circle cx={cx} cy={cy} r={size * 0.46} fill="none" stroke="#b8b0a0" strokeWidth="1.5" />

        {/* Dark plate */}
        <circle cx={cx} cy={cy} r={size * 0.44} fill="#1a1410" />

        {/* Detent dots */}
        {options.map((_, i) => {
          const a = ARC_START + (i / (options.length - 1)) * ARC_RANGE;
          const rad = (a * Math.PI) / 180;
          const isActive = i === idx;
          return (
            <circle
              key={i}
              cx={cx + Math.sin(rad) * detentR}
              cy={cy - Math.cos(rad) * detentR}
              r={isActive ? 2.5 : 1.5}
              fill={isActive ? "#e8c874" : "#6b5a48"}
            />
          );
        })}

        {/* Chrome knob */}
        <circle cx={cx} cy={cy} r={knobR} fill={`url(#skg-${label})`} stroke="#605848" strokeWidth="1" />

        {/* Pointer */}
        <g
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            transition: "transform 0.15s ease",
          }}
        >
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={cy - knobR + 3}
            stroke="#2a1c10"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx={cx} cy={cy - knobR + 5} r="1.5" fill="#c03030" />
        </g>

        {/* Center dimple */}
        <circle cx={cx} cy={cy} r={size * 0.05} fill={`url(#skd-${label})`} stroke="#706858" strokeWidth="0.3" />
      </svg>
      <span
        style={{
          fontFamily: "var(--font-label)",
          fontSize: "0.65rem",
          color: "var(--screen-amber-dim)",
          marginTop: -2,
        }}
      >
        {displayVal}
      </span>
    </div>
  );
}
