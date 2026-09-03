export type IconName =
  | "research" | "balance" | "shield" | "doc" | "arrow" | "leaf" | "check"
  | "mail" | "pin" | "clock" | "id" | "bag" | "menu" | "globe";

const PATHS: Record<IconName, React.ReactNode> = {
  research: <path d="M11 3a8 8 0 105.29 14.01l4.35 4.35 1.41-1.41-4.35-4.35A8 8 0 0011 3zm0 2a6 6 0 110 12 6 6 0 010-12z" />,
  balance: <path d="M12 2v2.6l7 2.1V9l-2.6 6.2a4.4 4.4 0 008.6 0h-1L19 9M12 4.6L5 6.7V9l2.6 6.2a4.4 4.4 0 01-8.6 0h1L5 9M12 4.6V21M8 21h8" />,
  shield: (
    <>
      <path d="M12 2l8 3.2v6c0 4.9-3.4 9.5-8 10.8-4.6-1.3-8-5.9-8-10.8v-6L12 2z" />
      <path d="M8.6 12l2.3 2.3 4.5-4.5" />
    </>
  ),
  doc: (
    <>
      <path d="M14 2H6.5A1.5 1.5 0 005 3.5v17A1.5 1.5 0 006.5 22h11a1.5 1.5 0 001.5-1.5V7l-5-5z" />
      <path d="M14 2v5h5M8.5 13h7M8.5 17h5" />
    </>
  ),
  arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
  leaf: (
    <>
      <path d="M12 21V9" />
      <path d="M12 15c-6 0-9-3-9-8 5 0 9 3 9 8zM12 15c6 0 9-3 9-8-5 0-9 3-9 8z" />
    </>
  ),
  check: <path d="M4 12.5l5 5L20 6.5" />,
  mail: (
    <>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
      <path d="M3 6.5l9 6.5 9-6.5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.5l3.5 2" />
    </>
  ),
  id: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M7 10h4M7 14h7M16 10h1.5" />
    </>
  ),
  bag: (
    <>
      <path d="M6 8h12l1 12H5L6 8z" />
      <path d="M9 8V6a3 3 0 016 0v2" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z" />
    </>
  ),
};

export function Icon({
  name,
  size = 24,
  strokeWidth = 1.5,
  className,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {PATHS[name]}
    </svg>
  );
}
