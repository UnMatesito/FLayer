'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTheme } from '@mui/material';
import type { ActivityPoint } from '@/app/api';

const HEIGHT = 150;
const PLOT_TOP = 26;
const PLOT_BOTTOM = 116;
const AXIS_Y = 140;
const LAYER_STEP = 4.5;

interface LayerBarChartProps {
  data: ActivityPoint[];
}

export default function LayerBarChart({ data }: LayerBarChartProps) {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [drawn, setDrawn] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReduceMotion(prefersReduced);
    if (prefersReduced) {
      setDrawn(true);
      return;
    }
    const timer = window.setTimeout(() => setDrawn(true), 30);
    return () => window.clearTimeout(timer);
  }, []);

  const accent = theme.vars?.palette.primary.main ?? theme.palette.primary.main;
  const ink = theme.vars?.palette.ink ?? theme.palette.ink;
  const slate = theme.vars?.palette.slate ?? theme.palette.slate;
  const line = theme.vars?.palette.line ?? theme.palette.line;

  const today = new Date(data.length ? data[data.length - 1].date : new Date().toISOString());
  const maxOrders = Math.max(1, ...data.map((d) => d.orders));
  const slot = Math.max(0, (width - 8) / Math.max(1, data.length));
  const barWidth = Math.max(6, slot * 0.5);
  const plotHeight = PLOT_BOTTOM - PLOT_TOP;

  const bars = data.map((point, i) => {
    const day = new Date(point.date);
    const isToday = i === data.length - 1;
    const cx = 4 + slot * i + slot / 2;
    const barHeight = point.orders > 0 ? Math.max(6, (point.orders / maxOrders) * plotHeight) : 0;
    const layers = barHeight > 0 ? Math.max(1, Math.round(barHeight / LAYER_STEP)) : 0;
    const color = isToday ? accent : i % 2 === 0 ? ink : slate;
    const x = cx - barWidth / 2;

    return { cx, x, isToday, barHeight, layers, color, day };
  });

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="Actividad de los últimos 14 días"
          style={{ display: 'block', overflow: 'visible' }}
        >
          <line
            x1={0}
            x2={width}
            y1={PLOT_BOTTOM}
            y2={PLOT_BOTTOM}
            strokeWidth={1}
            style={{ stroke: line }}
          />

          {bars.map((bar, i) => {
            const todayOffset = drawn ? 0 : 10;
            const delay = reduceMotion ? 0 : i * 24;
            const transition = reduceMotion ? 'none' : `transform 380ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, opacity 300ms ease ${delay}ms`;

            return (
              <g key={i} style={{ fill: bar.color, transform: `translateY(${drawn ? 0 : todayOffset}px)`, opacity: drawn ? 1 : 0, transition }}>
                {bar.layers > 0 &&
                  Array.from({ length: bar.layers }, (_, j) => (
                    <rect
                      key={j}
                      x={bar.x}
                      y={PLOT_BOTTOM - 2 - j * LAYER_STEP}
                      width={barWidth}
                      height={2.2}
                      rx={1.1}
                      opacity={bar.isToday ? 1 : 0.55 + (j / Math.max(1, bar.layers)) * 0.45}
                    />
                  ))}
              </g>
            );
          })}

          {bars.map((bar, i) => {
            if (!bar.isToday) return null;
            const todayOffset = drawn ? 0 : 10;
            const transition = reduceMotion ? 'none' : `transform 380ms cubic-bezier(0.22, 1, 0.36, 1) 320ms, opacity 300ms ease 320ms`;
            return (
              <g key={`today-${i}`} style={{ transform: `translateY(${drawn ? 0 : todayOffset}px)`, opacity: drawn ? 1 : 0, transition }}>
                <line
                  x1={bar.cx}
                  x2={bar.cx}
                  y1={PLOT_TOP - 14}
                  y2={PLOT_BOTTOM}
                  strokeWidth={1}
                  opacity={0.4}
                  style={{ stroke: accent }}
                />
                <text
                  x={bar.cx}
                  y={PLOT_TOP - 17}
                  textAnchor="middle"
                  fontFamily="var(--font-overpass-mono), ui-monospace, monospace"
                  fontSize={10}
                  fontWeight={600}
                  letterSpacing="0.08em"
                  style={{ fill: accent }}
                >
                  hoy
                </text>
              </g>
            );
          })}

          {bars.map((bar, i) => (
            <text
              key={`axis-${i}`}
              x={bar.cx}
              y={AXIS_Y}
              textAnchor="middle"
              fontFamily="var(--font-overpass-mono), ui-monospace, monospace"
              fontSize={10}
              style={{ fill: bar.isToday ? accent : slate }}
            >
              {bar.day.getDate()}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}
