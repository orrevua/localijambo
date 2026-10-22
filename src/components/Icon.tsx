// Minimal line icons (24px grid, currentColor stroke).
const PATHS = {
  map: 'M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4Zm0 0v13m6-10.5v13',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6 6 18',
  menu: 'M4 7h16M4 12h16M4 17h10',
  locate: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v3m0 14v3M2 12h3m14 0h3',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4-4',
  chevronUp: 'm6 15 6-6 6 6',
  chevronDown: 'm6 9 6 6 6-6',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4V8Zm8 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  trash: 'M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13',
  pin: 'M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  download: 'M12 4v11m0 0-4-4m4 4 4-4M5 20h14',
  check: 'm5 12 5 5 9-10',
} as const;

export type IconName = keyof typeof PATHS;

export default function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
