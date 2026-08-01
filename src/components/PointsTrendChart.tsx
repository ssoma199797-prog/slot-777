import { useMemo, useState } from 'react';
import { PointSeries } from '../utils/stats';

/**
 * Every player's running total on one set of axes.
 *
 * Colours come from the validated dark-surface categorical palette and are
 * assigned by player id, never by rank — a player keeps their colour when the
 * standings change.
 */
const SERIES_COLORS = [
  '#3987e5', // blue
  '#d95926', // orange
  '#199e70', // aqua
  '#c98500', // yellow
  '#d55181', // magenta
  '#008300', // green
  '#9085e9', // violet
  '#e66767', // red
];

const VIEW_W = 340;
const VIEW_H = 168;
const PAD = { top: 12, right: 14, bottom: 26, left: 40 };
const PLOT_W = VIEW_W - PAD.left - PAD.right;
const PLOT_H = VIEW_H - PAD.top - PAD.bottom;

interface PointsTrendChartProps {
  series: PointSeries[];
}

/** Round a bound out to a readable step so the axis labels are not noise. */
function niceBound(value: number, up: boolean): number {
  if (value === 0) return 0;
  const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(value))));
  const step = magnitude >= 1000 ? 1000 : magnitude >= 100 ? 500 : 100;
  return up ? Math.ceil(value / step) * step : Math.floor(value / step) * step;
}

export default function PointsTrendChart({ series }: PointsTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const gameCount = series.reduce((max, s) => Math.max(max, s.cumulative.length), 0);

  const { yMin, yMax, xFor, yFor } = useMemo(() => {
    const all = series.flatMap((s) => s.cumulative);
    const rawMax = all.length > 0 ? Math.max(...all, 0) : 0;
    const rawMin = all.length > 0 ? Math.min(...all, 0) : 0;
    let top = niceBound(rawMax, true);
    let bottom = niceBound(rawMin, false);
    if (top === bottom) {
      top += 1000;
      bottom -= 1000;
    }
    const span = top - bottom;
    return {
      yMin: bottom,
      yMax: top,
      xFor: (i: number) => PAD.left + (gameCount <= 1 ? PLOT_W / 2 : (i / (gameCount - 1)) * PLOT_W),
      yFor: (v: number) => PAD.top + PLOT_H - ((v - bottom) / span) * PLOT_H,
    };
  }, [series, gameCount]);

  if (gameCount === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
        まだ推移を表示できる記録がありません
      </div>
    );
  }

  const zeroY = yFor(0);
  const activeIndex = hoverIndex !== null ? Math.min(hoverIndex, gameCount - 1) : null;

  return (
    <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full h-auto select-none"
        role="img"
        aria-label="参加者の通算ポイント推移"
      >
        {/* Recessive hairline grid — solid, one shade off the surface.
            Zero is one of the ticks whenever it is in range, so the zero rule and
            a midpoint gridline never sit almost on top of each other. */}
        {(yMin < 0 && yMax > 0 ? [yMax, 0, yMin] : [yMax, (yMax + yMin) / 2, yMin]).map((value) => (
          <g key={value}>
            <line
              x1={PAD.left}
              x2={PAD.left + PLOT_W}
              y1={yFor(value)}
              y2={yFor(value)}
              // Zero is the line that decides plus from minus, so it reads a step
              // brighter than the rest of the grid.
              stroke={value === 0 ? '#475569' : '#1e293b'}
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={yFor(value) + 3}
              textAnchor="end"
              className="fill-slate-500"
              style={{ fontSize: 8, fontVariantNumeric: 'tabular-nums' }}
            >
              {Math.round(value)}
            </text>
          </g>
        ))}

        {/* Zero reference, drawn brighter than the grid. Only needed when zero is
            not already one of the ticks above. */}
        {!(yMin < 0 && yMax > 0) && zeroY > PAD.top && zeroY < PAD.top + PLOT_H && (
          <line
            x1={PAD.left}
            x2={PAD.left + PLOT_W}
            y1={zeroY}
            y2={zeroY}
            stroke="#475569"
            strokeWidth={1}
          />
        )}

        {/* Hovered game marker */}
        {activeIndex !== null && (
          <line
            x1={xFor(activeIndex)}
            x2={xFor(activeIndex)}
            y1={PAD.top}
            y2={PAD.top + PLOT_H}
            stroke="#64748b"
            strokeWidth={1}
          />
        )}

        {series.map((s, seriesIdx) => {
          const color = SERIES_COLORS[seriesIdx % SERIES_COLORS.length];
          const path = s.cumulative
            .map((value, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(value).toFixed(1)}`)
            .join(' ');
          const lastIdx = s.cumulative.length - 1;
          return (
            <g key={s.playerId}>
              <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {/* Endpoint marker with a surface ring so overlapping lines stay readable */}
              <circle
                cx={xFor(lastIdx)}
                cy={yFor(s.cumulative[lastIdx])}
                r={4}
                fill={color}
                stroke="#020617"
                strokeWidth={2}
              />
              {activeIndex !== null && activeIndex < s.cumulative.length && (
                <circle
                  cx={xFor(activeIndex)}
                  cy={yFor(s.cumulative[activeIndex])}
                  r={3.5}
                  fill={color}
                  stroke="#020617"
                  strokeWidth={2}
                />
              )}
            </g>
          );
        })}

        {/* X axis: first and last game only, so the band never crowds */}
        <text x={PAD.left} y={VIEW_H - 8} textAnchor="start" className="fill-slate-500" style={{ fontSize: 8 }}>
          1ゲーム目
        </text>
        <text
          x={PAD.left + PLOT_W}
          y={VIEW_H - 8}
          textAnchor="end"
          className="fill-slate-500"
          style={{ fontSize: 8 }}
        >
          {gameCount}ゲーム目
        </text>

        {/* Hit areas: one full-height band per game, well past the 24px minimum */}
        {Array.from({ length: gameCount }).map((_, i) => {
          const bandW = gameCount <= 1 ? PLOT_W : PLOT_W / (gameCount - 1);
          return (
            <rect
              key={i}
              x={xFor(i) - bandW / 2}
              y={PAD.top}
              width={bandW}
              height={PLOT_H}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
              onTouchStart={() => setHoverIndex(i)}
            />
          );
        })}
      </svg>

      {/* Legend — always present for 2+ series, so identity is never colour alone */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 px-1">
        {series.map((s, seriesIdx) => {
          const color = SERIES_COLORS[seriesIdx % SERIES_COLORS.length];
          const shown =
            activeIndex !== null && activeIndex < s.cumulative.length
              ? s.cumulative[activeIndex]
              : s.cumulative[s.cumulative.length - 1];
          return (
            <span key={s.playerId} className="flex items-center gap-1.5 text-[10px] font-mono text-slate-300">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
              <span className="font-bold">{s.name}</span>
              <span className={shown >= 0 ? 'text-emerald-400' : 'text-rose-400'} style={{ fontVariantNumeric: 'tabular-nums' }}>
                {shown >= 0 ? `+${shown}` : shown}
              </span>
            </span>
          );
        })}
      </div>

      <div className="text-[9px] text-slate-500 mt-1.5 px-1">
        {activeIndex !== null ? `${activeIndex + 1}ゲーム目終了時点` : 'グラフに触れると各時点の通算を表示します'}
      </div>
    </div>
  );
}
