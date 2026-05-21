// Stroke icons sized for the 36px tile in the right-side value-prop column.
// All four share viewBox 24×24 and currentColor so the tile's `color` token
// (mint accent in light, soft mint in dark) governs the visual.

interface IconProps { className?: string }
const base = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function ShieldIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M12 3 4.5 6v6.2c0 4.2 3 7.4 7.5 8.8 4.5-1.4 7.5-4.6 7.5-8.8V6z" />
      <path d="m9 12 2.2 2.2L15 10.5" />
    </svg>
  );
}

export function BoltIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M13.5 3 5 14h6l-1.5 7L18 10h-6z" />
    </svg>
  );
}

export function CoinsIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <ellipse cx="9" cy="7" rx="6" ry="2.5" />
      <path d="M3 7v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V7" />
      <path d="M3 11v4c0 1.4 2.7 2.5 6 2.5" />
      <ellipse cx="15" cy="14" rx="6" ry="2.5" />
      <path d="M9 14v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4" />
    </svg>
  );
}

export function ChartIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M4 19h16" />
      <path d="M7 16V9" />
      <path d="M12 16V5" />
      <path d="M17 16v-4" />
    </svg>
  );
}
