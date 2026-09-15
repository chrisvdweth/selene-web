/**
 * The whole icon set: seven marks, one stroke weight (1.5), one grid (16).
 * Drawn here rather than pulled from a library so the family stays this small
 * and the stroke matches the 1px rules used everywhere else.
 */
type IconProps = { size?: number; className?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
});

export function SearchIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="7" cy="7" r="4.25" />
      <path d="M10.25 10.25 13.5 13.5" />
    </svg>
  );
}

/** Half-filled disc: the light/dark state is legible without colour. */
export function ThemeIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="8" cy="8" r="5.25" />
      <path d="M8 2.75a5.25 5.25 0 0 0 0 10.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function MenuIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
    </svg>
  );
}

export function CloseIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

/** A file coming down onto a tray. */
export function DownloadIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M8 2.5v8M4.75 7.25 8 10.5l3.25-3.25M3 13.5h10" />
    </svg>
  );
}

/** Out of the box and up to the right: opens elsewhere. */
export function ExternalIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6.5 3.5H3.5v9h9V9.5M9 3h4v4M13 3 7.5 8.5" />
    </svg>
  );
}

/** Direction of dependency, used in the wire lists next to a written label. */
export function ArrowIcon({ size = 14, className }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 8h10M9.5 4.5 13 8l-3.5 3.5" />
    </svg>
  );
}
