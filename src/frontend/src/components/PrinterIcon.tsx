export function PrinterIcon({ color, size = 24 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="4" y="3" width="16" height="13" rx="1" stroke={color} strokeWidth="1.5" />
      <path d="M4 8h16" stroke={color} strokeWidth="1.5" />
      <path d="M12 5v3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="9.5" y="8" width="5" height="4" fill={color} />
      <path d="M11 12v2.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6 16v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-2" stroke={color} strokeWidth="1.5" />
      <path d="M6 19v2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18 19v2" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
