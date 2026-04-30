"use client";

import { memo } from "react";

function WoodGrain() {
  return (
    <svg
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
      }}
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      <defs>
        <filter
          id="woodGrain"
          x="0"
          y="0"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.16"
            numOctaves="6"
            seed="5"
            result="grain"
          />
          <feTurbulence
            type="turbulence"
            baseFrequency="0.035 0.003"
            numOctaves="3"
            seed="12"
            result="bands"
          />
          <feDisplacementMap
            in="grain"
            in2="bands"
            scale="40"
            xChannelSelector="R"
            yChannelSelector="G"
            result="warped"
          />
          <feComponentTransfer in="warped">
            <feFuncR type="table" tableValues="0.16 0.24 0.34 0.42 0.50" />
            <feFuncG type="table" tableValues="0.10 0.15 0.22 0.28 0.34" />
            <feFuncB type="table" tableValues="0.04 0.07 0.11 0.15 0.20" />
            <feFuncA type="discrete" tableValues="1" />
          </feComponentTransfer>
        </filter>
        <linearGradient id="laminateGloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.05" />
          <stop offset="40%" stopColor="white" stopOpacity="0.01" />
          <stop offset="60%" stopColor="black" stopOpacity="0.01" />
          <stop offset="100%" stopColor="black" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" filter="url(#woodGrain)" />
      <rect width="100%" height="100%" fill="url(#laminateGloss)" />
    </svg>
  );
}

export default memo(WoodGrain);
