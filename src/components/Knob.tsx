"use client";

import { useRef, useCallback, useEffect, useState } from "react";

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  size?: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  disabled?: boolean;
  statusDot?: "loading" | "ready" | null;
}

const ARC_START = -135;
const ARC_END = 135;
const ARC_RANGE = ARC_END - ARC_START;

export default function Knob({
  label,
  value,
  min,
  max,
  step,
  size = 56,
  onChange,
  formatValue,
  disabled,
  statusDot,
}: KnobProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startVal = useRef(0);

  const pct = (value - min) / (max - min);
  const angle = ARC_START + pct * ARC_RANGE;

  const snap = useCallback(
    (v: number) => {
      const snapped = Math.round(v / step) * step;
      return Math.max(min, Math.min(max, snapped));
    },
    [min, max, step]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      e.preventDefault();
      dragging.current = true;
      startY.current = e.clientY;
      startVal.current = value;
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [value, disabled]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      const dy = startY.current - e.clientY;
      const range = max - min;
      const sensitivity = range / 120;
      const newVal = snap(startVal.current + dy * sensitivity);
      if (newVal !== value) onChange(newVal);
    },
    [value, min, max, snap, onChange]
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  // Tick mark positions
  const ticks: number[] = [];
  const tickCount = Math.min(11, Math.round((max - min) / step) + 1);
  for (let i = 0; i < tickCount; i++) {
    ticks.push(ARC_START + (i / (tickCount - 1)) * ARC_RANGE);
  }

  const cx = size / 2;
  const cy = size / 2;
  const knobR = size * 0.32;
  const tickR = size * 0.44;
  const tickInner = size * 0.38;

  const displayVal = formatValue ? formatValue(value) : String(value);

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
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{ cursor: disabled ? "default" : "ns-resize", touchAction: "none" }}
      >
        <defs>
          <radialGradient id={`kg-${label}`} cx="42%" cy="38%">
            <stop offset="0%" stopColor="#f0ece4" />
            <stop offset="25%" stopColor="#ddd8cc" />
            <stop offset="55%" stopColor="#b8b0a0" />
            <stop offset="85%" stopColor="#908878" />
            <stop offset="100%" stopColor="#706858" />
          </radialGradient>
          <radialGradient id={`kd-${label}`} cx="40%" cy="35%">
            <stop offset="0%" stopColor="#908878" />
            <stop offset="100%" stopColor="#d4cfc4" />
          </radialGradient>
        </defs>

        {/* Outer chrome ring */}
        <circle
          cx={cx}
          cy={cy}
          r={size * 0.46}
          fill="none"
          stroke="#b8b0a0"
          strokeWidth="1.5"
        />

        {/* Dark plate */}
        <circle cx={cx} cy={cy} r={size * 0.44} fill="#1a1410" />

        {/* Tick marks */}
        {ticks.map((t, i) => {
          const rad = (t * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={cx + Math.sin(rad) * tickInner}
              y1={cy - Math.cos(rad) * tickInner}
              x2={cx + Math.sin(rad) * tickR}
              y2={cy - Math.cos(rad) * tickR}
              stroke="#6b5a48"
              strokeWidth="0.8"
            />
          );
        })}

        {/* Chrome knob */}
        <circle
          cx={cx}
          cy={cy}
          r={knobR}
          fill={`url(#kg-${label})`}
          stroke="#605848"
          strokeWidth="1"
        />

        {/* Pointer */}
        <g
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: `${cx}px ${cy}px`,
            transition: dragging.current ? "none" : "transform 0.1s ease",
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
        <circle
          cx={cx}
          cy={cy}
          r={size * 0.05}
          fill={`url(#kd-${label})`}
          stroke="#706858"
          strokeWidth="0.3"
        />
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
