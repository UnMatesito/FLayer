'use client';

import { useEffect, useState } from 'react';
import { createTheme, useColorScheme, type Theme } from '@mui/material/styles';
import type { CSSProperties } from 'react';

declare module '@mui/material/styles' {
  interface Palette {
    plate: string;
    snow: string;
    ink: string;
    slate: string;
    line: string;
    ember: string;
    canvas: string;
    rail: string;
    railHover: string;
    railInk: string;
    maker: string;
    makerContrastText: string;
  }
  interface PaletteOptions {
    plate?: string;
    snow?: string;
    ink?: string;
    slate?: string;
    line?: string;
    ember?: string;
    canvas?: string;
    rail?: string;
    railHover?: string;
    railInk?: string;
    maker?: string;
    makerContrastText?: string;
  }
  interface TypeBackground {
    level1: string;
  }
  interface TypographyVariants {
    display: CSSProperties;
    eyebrow: CSSProperties;
    mono: CSSProperties;
  }
  interface TypographyVariantsOptions {
    display?: CSSProperties;
    eyebrow?: CSSProperties;
    mono?: CSSProperties;
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    display: true;
    eyebrow: true;
    mono: true;
  }
}

export const EMBER = '#FF8400';
export const PLATE = '#E9EBEE';
export const SNOW = '#F9FAFB';
export const INK = '#111827';
export const SLATE = '#4A5058';
export const LINE = '#D9DEE4';
export const CANVAS = '#F1F3F5';

export const DARK_DEFAULT = '#1A1D22';
export const DARK_PAPER = '#23272E';
export const DARK_INK = '#E8EAED';
export const DARK_SLATE = '#9AA3AD';
export const DARK_LINE = '#32373F';
export const DARK_CANVAS = '#171A1F';

export const RAIL = '#16181C';
export const RAIL_DARK = '#131518';
export const RAIL_HOVER = '#26292F';
export const RAIL_HOVER_DARK = '#202329';
export const LIGHT_RAIL = '#F2F4F6';
export const LIGHT_RAIL_HOVER = '#E6E9ED';

const SANS = 'var(--font-overpass), Overpass, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
const DISPLAY = 'var(--font-overpass), Overpass, ui-sans-serif, system-ui, sans-serif';
const MONO = 'var(--font-overpass-mono), "Overpass Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(hex: string, target: string, amount: number): string {
  const [r1, g1, b1] = hexToRgb(hex);
  const [r2, g2, b2] = hexToRgb(target);
  const mixChannel = (a: number, b: number) => Math.round(a + (b - a) * amount);
  return `#${[mixChannel(r1, r2), mixChannel(g1, g2), mixChannel(b1, b2)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export interface AccentRamp {
  main: string;
  light: string;
  dark: string;
  contrastText: string;
}

export function deriveAccent(accent: string | null): AccentRamp {
  const main = accent ?? EMBER;
  return {
    main,
    light: mix(main, '#ffffff', 0.22),
    dark: mix(main, '#000000', 0.16),
    contrastText: luminance(main) > 0.45 ? INK : '#FFFFFF',
  };
}

const typography = {
  fontFamily: SANS,
  fontSize: 14,
  h5: { fontFamily: DISPLAY, fontWeight: 700 },
  h6: { fontFamily: DISPLAY, fontWeight: 600 },
  display: {
    fontFamily: DISPLAY,
    fontWeight: 700,
    fontSize: '2rem',
    lineHeight: 1.15,
    letterSpacing: '-0.01em',
  },
  eyebrow: {
    fontFamily: SANS,
    fontWeight: 600,
    fontSize: '0.72rem',
    lineHeight: 1.4,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: SLATE,
  },
  mono: {
    fontFamily: MONO,
    fontWeight: 500,
    fontSize: '2.5rem',
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
  },
};

function baseComponents() {
  return {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 },
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 8 } },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0 },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 12 },
      },
    },
  };
}

export function buildTheme(accent: string | null): Theme {
  const ramp = deriveAccent(accent);

  return createTheme({
    cssVariables: { colorSchemeSelector: 'data' },
    colorSchemes: {
      light: {
        palette: {
          mode: 'light',
          primary: ramp,
          secondary: { main: INK },
          background: {
            default: PLATE,
            paper: SNOW,
            level1: CANVAS,
          },
          text: { primary: INK, secondary: SLATE },
          divider: LINE,
          error: { main: '#D32F2F' },
          warning: { main: '#ED6C02' },
          info: { main: '#0288D1' },
          success: { main: '#2E7D32' },
          plate: PLATE,
          snow: SNOW,
          ink: INK,
          slate: SLATE,
          line: LINE,
          ember: EMBER,
          canvas: CANVAS,
          rail: LIGHT_RAIL,
          railHover: LIGHT_RAIL_HOVER,
          railInk: '#111827',
          maker: ramp.main,
          makerContrastText: ramp.contrastText,
        },
      },
      dark: {
        palette: {
          mode: 'dark',
          primary: {
            main: ramp.main,
            light: mix(ramp.main, '#ffffff', 0.35),
            dark: mix(ramp.main, '#000000', 0.3),
            contrastText: ramp.contrastText,
          },
          secondary: { main: DARK_INK },
          background: {
            default: DARK_DEFAULT,
            paper: DARK_PAPER,
            level1: DARK_CANVAS,
          },
          text: { primary: DARK_INK, secondary: DARK_SLATE },
          divider: DARK_LINE,
          error: { main: '#F44336' },
          warning: { main: '#FFA726' },
          info: { main: '#29B6F6' },
          success: { main: '#66BB6A' },
          plate: DARK_DEFAULT,
          snow: DARK_PAPER,
          ink: DARK_INK,
          slate: DARK_SLATE,
          line: DARK_LINE,
          ember: EMBER,
          canvas: DARK_CANVAS,
          rail: RAIL_DARK,
          railHover: RAIL_HOVER_DARK,
          railInk: DARK_INK,
          maker: ramp.main,
          makerContrastText: ramp.contrastText,
        },
      },
    },
    shape: { borderRadius: 12 },
    typography,
    components: baseComponents(),
  });
}

export function useResolvedColorScheme(): 'light' | 'dark' {
  const { mode } = useColorScheme();
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return mode === 'dark' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
      ? 'dark'
      : 'light';
  });

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const update = () =>
      setResolved(mode === 'dark' || (mode === 'system' && media.matches) ? 'dark' : 'light');
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [mode]);

  return resolved;
}

export default buildTheme(null);
