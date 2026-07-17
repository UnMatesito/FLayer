export function FilamentIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="11" r="8" fill={color} />
      <circle cx="12" cy="11" r="3" fill="white" />
      <path d="M5 13 Q2 15 3 17" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
