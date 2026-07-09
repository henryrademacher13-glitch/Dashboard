import { useSyncExternalStore } from 'react';

// Recharts needs concrete color values, so chart ink mirrors the CSS custom
// properties in App.css for both modes. Both palettes validated with the
// dataviz six-checks script against their surfaces.
const LIGHT = {
  surface: '#fcfcfb',
  ink: '#0b0b0b',
  muted: '#898781',
  grid: '#e1e0d9',
  baseline: '#c3c2b7',
  series1: '#2a78d6', // blue — primary magnitude hue
  series2: '#1baf7a', // aqua — second concurrent context
};

const DARK = {
  surface: '#1a1a19',
  ink: '#ffffff',
  muted: '#898781',
  grid: '#2c2c2a',
  baseline: '#383835',
  series1: '#3987e5',
  series2: '#199e70',
};

const query = window.matchMedia('(prefers-color-scheme: dark)');

function subscribe(cb) {
  query.addEventListener('change', cb);
  return () => query.removeEventListener('change', cb);
}

export function useChartTheme() {
  const isDark = useSyncExternalStore(subscribe, () => query.matches);
  return isDark ? DARK : LIGHT;
}

export const fmt = {
  money: (v) =>
    v >= 10000
      ? '$' + (v / 1000).toFixed(1) + 'K'
      : '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 }),
  moneyExact: (v) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  compact: (v) => (v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(1) + 'K' : String(Math.round(v))),
  int: (v) => Math.round(v).toLocaleString('en-US'),
};
