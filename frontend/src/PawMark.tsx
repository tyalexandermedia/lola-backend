/**
 * Lola's paw — the recurring brand motif.
 *
 * The brief is "subtle recurring accent, not a mascot takeover", so this is a
 * small inline SVG that inherits `currentColor` and therefore always paints in
 * whatever gold the surrounding element already uses.
 *
 * It replaces the 🐾 emoji in the header and footer wordmarks. An emoji renders
 * in each platform's OWN colours — Apple's is brown, Google's is grey-blue — so
 * it was the one element on the page that ignored the palette entirely, and it
 * shifted the wordmark's baseline differently per device.
 */
export default function PawMark({ className = '', size = 14 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <ellipse cx="7.2" cy="8.6" rx="2.1" ry="2.7" />
      <ellipse cx="12" cy="6.9" rx="2.2" ry="2.9" />
      <ellipse cx="16.8" cy="8.6" rx="2.1" ry="2.7" />
      <ellipse cx="19.6" cy="13.2" rx="1.8" ry="2.3" />
      <path d="M12 12.4c3.1 0 5.6 2.2 5.6 4.6 0 1.7-1.3 2.8-3.1 2.8-1 0-1.8-.3-2.5-.3s-1.5.3-2.5.3c-1.8 0-3.1-1.1-3.1-2.8 0-2.4 2.5-4.6 5.6-4.6z" />
    </svg>
  );
}
