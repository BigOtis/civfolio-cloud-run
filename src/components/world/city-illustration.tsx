import type { ReactNode } from "react";

import type { CityLevel } from "@/lib/content/derive";
import type { Work } from "@/lib/content/schema";

const palettes = {
  code: {
    stone: "#80684b",
    roof: "#d7a15f",
    accent: "#f5d894",
    glow: "rgba(242, 205, 136, 0.5)",
    garden: "#50714f",
  },
  art: {
    stone: "#8f6653",
    roof: "#d98a63",
    accent: "#f3d3b7",
    glow: "rgba(235, 170, 120, 0.48)",
    garden: "#5c6650",
  },
  music: {
    stone: "#63707b",
    roof: "#7fc2d4",
    accent: "#d7f2ff",
    glow: "rgba(127, 194, 212, 0.46)",
    garden: "#466462",
  },
  video: {
    stone: "#566755",
    roof: "#93d2ad",
    accent: "#d8f6e4",
    glow: "rgba(147, 210, 173, 0.44)",
    garden: "#4a6447",
  },
  writing: {
    stone: "#7f6e50",
    roof: "#ceb96f",
    accent: "#f6ebbd",
    glow: "rgba(210, 199, 126, 0.44)",
    garden: "#5a6948",
  },
  client: {
    stone: "#7d6046",
    roof: "#cb8f59",
    accent: "#f1d3ab",
    glow: "rgba(213, 151, 80, 0.46)",
    garden: "#5f6749",
  },
} as const;

export function CityAdornment({
  slug,
  level,
  discipline,
}: {
  slug?: string;
  level: CityLevel;
  discipline: Work["discipline"];
}) {
  const palette = palettes[discipline];
  const roof = palette.roof;
  const accent = palette.accent;
  const stone = palette.stone;

  if (!slug) {
    return null;
  }

  if (slug === "robot-future") {
    return (
      <g opacity={0.94}>
        <ellipse cx="0" cy="2" rx={level === "wonder" ? 15 : 12} ry={level === "wonder" ? 8 : 6} fill="none" stroke={accent} strokeOpacity="0.7" strokeWidth="1.4" />
        <circle cx="0" cy="-10" r={level === "wonder" ? 5.5 : 4.2} fill={accent} opacity="0.92" />
        <path d="M -9 -1 L 0 -11 L 9 -1" fill="none" stroke={roof} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  }

  if (slug === "ibm-support-innovation") {
    return (
      <g opacity={0.92}>
        <rect x="-10" y="-2" width="20" height="9" rx="2" fill={stone} stroke={accent} strokeOpacity="0.45" strokeWidth="0.8" />
        <path d="M -6 -2 L -6 -12 M 0 -2 L 0 -14 M 6 -2 L 6 -10" stroke={roof} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M -7 -12 C -5 -15 -3 -15 -1 -12 M -1 -14 C 1 -17 3 -17 5 -14 M 5 -10 C 7 -13 9 -13 11 -10" fill="none" stroke={accent} strokeOpacity="0.5" strokeWidth="1" />
      </g>
    );
  }

  if (slug === "busters-td") {
    return (
      <g opacity={0.95}>
        <path d="M -12 4 L -12 -3 L -8 -3 L -8 -6 L -3 -6 L -3 -3 L 3 -3 L 3 -6 L 8 -6 L 8 -3 L 12 -3 L 12 4 Z" fill={stone} stroke={accent} strokeOpacity="0.45" strokeWidth="0.9" />
        <path d="M -5 6 L 0 -8 L 5 6" fill="none" stroke={roof} strokeWidth="1.4" strokeLinecap="round" />
      </g>
    );
  }

  if (slug === "polylogue") {
    return (
      <g opacity={0.92}>
        <circle cx="0" cy="1" r="6.5" fill="none" stroke={accent} strokeOpacity="0.72" strokeWidth="1.2" />
        <path d="M -11 5 L -6 -7 M 0 6 L 0 -9 M 11 5 L 6 -7" stroke={roof} strokeWidth="1.2" strokeLinecap="round" />
        <circle cx="-6" cy="-8" r="2" fill={accent} />
        <circle cx="0" cy="-10" r="2.1" fill={accent} />
        <circle cx="6" cy="-8" r="2" fill={accent} />
      </g>
    );
  }

  if (slug === "character-chat") {
    return (
      <g opacity={0.94}>
        <path d="M -10 0 C -10 -7 -5 -11 0 -11 C 5 -11 10 -7 10 0 C 10 6 6 10 0 10 C -6 10 -10 6 -10 0 Z" fill="none" stroke={accent} strokeOpacity="0.66" strokeWidth="1.2" />
        <circle cx="-4" cy="-1.5" r="1.5" fill={roof} />
        <circle cx="4" cy="-1.5" r="1.5" fill={roof} />
        <path d="M -4 4 C -2 6 2 6 4 4" fill="none" stroke={roof} strokeWidth="1.2" strokeLinecap="round" />
      </g>
    );
  }

  if (slug === "otisfuse") {
    return (
      <g opacity={0.93}>
        <rect x="-10" y="0" width="20" height="8" rx="2" fill={stone} stroke={accent} strokeOpacity="0.4" strokeWidth="0.8" />
        <path d="M -2 -8 L 7 -3 L -2 2 Z" fill={roof} />
        <circle cx="-9" cy="-3" r="2" fill={accent} />
      </g>
    );
  }

  if (slug === "civfolio") {
    return (
      <g opacity={0.94}>
        <path d="M -11 6 C -10 -3 -5 -8 0 -8 C 5 -8 10 -3 11 6" fill="none" stroke={accent} strokeOpacity="0.68" strokeWidth="1.1" />
        <path d="M -4 -11 L 4 -11" stroke={roof} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M -8 2 L -3 -4 L 0 1 L 4 -5 L 9 0" fill="none" stroke={roof} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
  }

  if (slug === "slopswapper") {
    return (
      <g opacity={0.92}>
        <path d="M -9 6 L -2 -2 L 3 -2 L 10 6" fill="none" stroke={accent} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M -7 -4 L -1 -8 M 1 -8 L 7 -4" stroke={roof} strokeWidth="1.2" strokeLinecap="round" />
        <rect x="-3" y="1" width="6" height="6" rx="1.5" fill={stone} stroke={accent} strokeOpacity="0.35" strokeWidth="0.8" />
      </g>
    );
  }

  if (slug === "popcurrent") {
    return (
      <g opacity={0.94}>
        <rect x="-10" y="1" width="20" height="7" rx="2" fill={stone} stroke={accent} strokeOpacity="0.4" strokeWidth="0.8" />
        <path d="M 0 1 L 0 -11" stroke={roof} strokeWidth="1.3" strokeLinecap="round" />
        <path d="M -7 -5 C -4 -9 4 -9 7 -5 M -10 -1 C -6 -6 6 -6 10 -1" fill="none" stroke={accent} strokeOpacity="0.62" strokeWidth="1" strokeLinecap="round" />
      </g>
    );
  }

  return null;
}

function House({
  x,
  y,
  width,
  height,
  roof,
  wall,
  accent,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  roof: string;
  wall: string;
  accent: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect
        x={-width / 2}
        y={-height}
        width={width}
        height={height}
        rx={2}
        fill={wall}
        stroke="rgba(17, 10, 8, 0.3)"
        strokeWidth={1}
      />
      <path
        d={`M ${-width / 2 - 2} ${-height} L 0 ${-height - height * 0.6} L ${width / 2 + 2} ${-height} Z`}
        fill={roof}
        stroke="rgba(17, 10, 8, 0.3)"
        strokeWidth={1}
      />
      <rect x={-2} y={-height * 0.72} width={4} height={height * 0.72} rx={1} fill={accent} />
    </g>
  );
}

function Tower({
  x,
  y,
  height,
  wall,
  roof,
  accent,
}: {
  x: number;
  y: number;
  height: number;
  wall: string;
  roof: string;
  accent: string;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-6} y={-height} width={12} height={height} rx={2} fill={wall} />
      <path d="M -9 -20 L 0 -30 L 9 -20 Z" fill={roof} />
      <rect x={-1.5} y={-height + 8} width={3} height={height - 12} rx={1.5} fill={accent} />
    </g>
  );
}

function MonumentBase({
  accent,
  wall,
  glow,
  children,
}: {
  accent: string;
  wall: string;
  glow: string;
  children: ReactNode;
}) {
  return (
    <g>
      <ellipse cx="0" cy="16" rx="24" ry="8" fill="rgba(7, 4, 3, 0.28)" />
      <ellipse cx="0" cy="12" rx="20" ry="7" fill={glow} opacity="0.34" />
      <path d="M -22 14 L -16 0 L 16 0 L 22 14 L 12 18 L -12 18 Z" fill={wall} stroke={accent} strokeOpacity="0.35" strokeWidth="1" />
      {children}
    </g>
  );
}

export function GreatWorkIllustration({
  discipline,
  title,
  active = false,
}: {
  discipline: Work["discipline"];
  title: string;
  active?: boolean;
}) {
  const palette = palettes[discipline];
  const variant = /beacon|signal/i.test(title)
    ? "beacon"
    : /engine|citadel|editorial/i.test(title)
      ? "engine"
      : /harbor|port/i.test(title)
        ? "harbor"
        : "spire";

  return (
    <g className={active ? "city-breath city-breath-active" : "city-breath"} transform="scale(0.88)">
      <MonumentBase accent={palette.accent} wall={palette.stone} glow={palette.glow}>
        {variant === "beacon" ? (
          <>
            <path d="M -4 0 L 0 -20 L 4 0 Z" fill={palette.roof} />
            <rect x="-3" y="-2" width="6" height="12" rx="2" fill={palette.accent} />
            <circle cx="0" cy="-24" r="5" fill={palette.accent} />
            <circle cx="0" cy="-24" r="11" fill={palette.glow} opacity="0.42" />
          </>
        ) : null}

        {variant === "engine" ? (
          <>
            <rect x="-14" y="-10" width="28" height="16" rx="3" fill={palette.stone} />
            <rect x="-7" y="-20" width="14" height="10" rx="2" fill={palette.roof} />
            <rect x="-11" y="-4" width="4" height="10" rx="1.5" fill={palette.accent} />
            <rect x="7" y="-4" width="4" height="10" rx="1.5" fill={palette.accent} />
          </>
        ) : null}

        {variant === "harbor" ? (
          <>
            <path d="M -16 2 C -10 -8 10 -8 16 2" fill="none" stroke={palette.accent} strokeWidth="2.4" strokeLinecap="round" />
            <rect x="-12" y="-4" width="6" height="12" rx="2" fill={palette.roof} />
            <rect x="6" y="-4" width="6" height="12" rx="2" fill={palette.roof} />
            <path d="M -8 8 L 0 -6 L 8 8 Z" fill={palette.accent} opacity="0.9" />
          </>
        ) : null}

        {variant === "spire" ? (
          <>
            <path d="M 0 -24 L 10 8 L -10 8 Z" fill={palette.roof} />
            <rect x="-3" y="-2" width="6" height="10" rx="1.5" fill={palette.accent} />
            <circle cx="0" cy="-26" r={active ? 4.5 : 3.8} fill={palette.accent} />
          </>
        ) : null}
      </MonumentBase>
    </g>
  );
}

export function CityIllustration({
  level,
  discipline,
  radius,
  active = false,
}: {
  level: CityLevel;
  discipline: Work["discipline"];
  radius: number;
  active?: boolean;
}) {
  const palette = palettes[discipline];
  const scale = radius / 28;
  const wall = palette.stone;
  const roof = palette.roof;
  const accent = palette.accent;

  return (
    <g transform={`scale(${scale})`}>
      <g className={active ? "city-breath city-breath-active" : "city-breath"}>
        <ellipse cx="0" cy="24" rx="34" ry="10" fill="rgba(7, 4, 3, 0.34)" />
        <ellipse cx="0" cy="20" rx="30" ry="12" fill={palette.glow} opacity="0.55" />
        <path d="M -30 20 C -18 8 18 8 30 20 L 24 28 C 10 32 -10 32 -24 28 Z" fill={palette.garden} opacity="0.9" />

        {level === "settlement" ? (
          <g>
            <House x={-11} y={18} width={14} height={12} roof={roof} wall={wall} accent={accent} />
            <House x={9} y={20} width={12} height={10} roof={roof} wall={wall} accent={accent} />
            <path d="M -2 13 L 2 13 L 0 4 Z" fill={accent} className="city-flame" />
            <rect x={-0.6} y="4" width="1.2" height="8" fill={accent} opacity="0.8" />
            <circle cx="0" cy="16" r="3" fill={palette.glow} opacity="0.7" />
          </g>
        ) : null}

        {level === "town" ? (
          <g>
            <path
              d="M -28 22 L -22 10 L 22 10 L 28 22 L 21 25 L -21 25 Z"
              fill="#4d3a28"
              stroke={accent}
              strokeOpacity="0.35"
              strokeWidth="1"
            />
            <House x={-13} y={16} width={13} height={12} roof={roof} wall={wall} accent={accent} />
            <House x={0} y={14} width={16} height={14} roof={roof} wall={wall} accent={accent} />
            <House x={14} y={17} width={12} height={11} roof={roof} wall={wall} accent={accent} />
            <rect x="-1.2" y="-7" width="2.4" height="20" fill={accent} />
            <path d="M 1.2 -7 L 11 -3 L 1.2 1 Z" fill={roof} />
          </g>
        ) : null}

        {level === "city" ? (
          <g>
            <path
              d="M -30 23 L -24 2 L 24 2 L 30 23 L 20 26 L -20 26 Z"
              fill="#4c3b2b"
              stroke={accent}
              strokeOpacity="0.45"
              strokeWidth="1.2"
            />
            <Tower x={-18} y={10} height={20} wall={wall} roof={roof} accent={accent} />
            <Tower x={18} y={10} height={20} wall={wall} roof={roof} accent={accent} />
            <House x={0} y={12} width={20} height={18} roof={roof} wall={wall} accent={accent} />
            <House x={-8} y={19} width={10} height={10} roof={roof} wall={wall} accent={accent} />
            <House x={10} y={19} width={10} height={10} roof={roof} wall={wall} accent={accent} />
          </g>
        ) : null}

        {level === "capital" ? (
          <g>
            <path
              d="M -33 24 L -26 -2 L 26 -2 L 33 24 L 22 28 L -22 28 Z"
              fill="#443324"
              stroke={accent}
              strokeOpacity="0.5"
              strokeWidth="1.4"
            />
            <Tower x={-22} y={8} height={24} wall={wall} roof={roof} accent={accent} />
            <Tower x={22} y={8} height={24} wall={wall} roof={roof} accent={accent} />
            <Tower x={0} y={5} height={28} wall={wall} roof={roof} accent={accent} />
            <House x={0} y={14} width={22} height={18} roof={roof} wall={wall} accent={accent} />
            <House x={-10} y={20} width={12} height={10} roof={roof} wall={wall} accent={accent} />
            <House x={11} y={20} width={12} height={10} roof={roof} wall={wall} accent={accent} />
            <rect x="-1.5" y="-18" width="3" height="18" fill={accent} />
            <path d="M 1.5 -18 L 14 -13 L 1.5 -8 Z" fill={roof} />
          </g>
        ) : null}

        {level === "wonder" ? (
          <g>
            <path
              d="M -34 24 L -24 2 L 24 2 L 34 24 L 22 28 L -22 28 Z"
              fill="#403126"
              stroke={accent}
              strokeOpacity="0.52"
              strokeWidth="1.5"
            />
            <path d="M -22 20 L -10 -4 L 10 -4 L 22 20 Z" fill={wall} />
            <path d="M -15 3 L 0 -17 L 15 3 Z" fill={roof} />
            <circle cx="0" cy="-10" r="7" fill={accent} />
            <circle cx="0" cy="-10" r="12" fill={palette.glow} opacity="0.4" />
            <Tower x={-20} y={10} height={22} wall={wall} roof={roof} accent={accent} />
            <Tower x={20} y={10} height={22} wall={wall} roof={roof} accent={accent} />
            <path d="M 0 -24 L 4 -14 L -4 -14 Z" fill={accent} className="city-flame" />
          </g>
        ) : null}

        <circle cx="0" cy="8" r={active ? "16" : "12"} fill={palette.glow} opacity={active ? "0.36" : "0.2"} />
      </g>
    </g>
  );
}
