export function FilamentIcon({
  color,
  hole = 'white',
  size = 24,
}: {
  color: string;
  hole?: string;
  size?: number;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="11" r="8" style={{ fill: color }} />
      <circle cx="12" cy="11" r="3" style={{ fill: hole }} />
      <path d="M5 13 Q2 15 3 17" strokeWidth="1.5" fill="none" strokeLinecap="round" style={{ stroke: color }} />
    </svg>
  );
}
