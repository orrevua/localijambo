import type { JamboTone } from '../../lib/jamboStatus.ts';

// Pastel fruit colours per tone: [top, bottom] of the gradient.
const FILL: Record<JamboTone | 'new', [string, string]> = {
  ripe: ['#EE8FA4', '#C9526D'],
  fruiting: ['#F7C9A0', '#E89A7A'],
  flowering: ['#F9D6E0', '#E9A9BC'],
  resting: ['#CDEBD7', '#8CC7A1'],
  new: ['#EE8FA4', '#C9526D'],
};

/**
 * A jambo-fruit shaped map pin (matches public/logo.svg). The pear-shaped
 * fruit's calyx tip points down at the location, so markers anchor 'bottom'.
 */
export function jamboPinSvg(tone: JamboTone | 'new' = 'ripe'): string {
  const [top, bottom] = FILL[tone];
  const id = `jambo-pin-${tone}`;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
  <defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${top}"/>
      <stop offset="1" stop-color="${bottom}"/>
    </linearGradient>
  </defs>
  <path d="M32 23 C23 23 18 30 18 38 C18 49 25 56 32 56 C40 56 45 49 44 38 C43 30 40 23 32 23 Z"
        fill="none" stroke="#fff" stroke-width="5"/>
  <path d="M33 15 C41 5 53 5 58 9 C53 19 42 21 35 16 Z" fill="#84C49D" stroke="#fff" stroke-width="1.5"/>
  <path d="M31 14 C31 19 31 22 32 25" fill="none" stroke="#3F8A5F" stroke-width="2.6" stroke-linecap="round"/>
  <path d="M32 23 C23 23 18 30 18 38 C18 49 25 56 32 56 C40 56 45 49 44 38 C43 30 40 23 32 23 Z"
        fill="url(#${id})"/>
  <path d="M30 53 L25.5 61 L31.5 54.5 Z" fill="#84C49D"/>
  <path d="M30.5 54 L32 62 L33.5 54 Z" fill="#3F8A5F"/>
  <path d="M34 53 L38.5 61 L32.5 54.5 Z" fill="#84C49D"/>
  <ellipse cx="26" cy="33" rx="3" ry="5" fill="#fff" opacity="0.35"/>
</svg>`.trim();
}

/** Style an element as a jambo pin and fill it with the fruit SVG. */
export function applyJamboPin(el: HTMLElement, tone: JamboTone | 'new' = 'ripe'): void {
  el.style.width = '34px';
  el.style.height = '38px';
  el.style.cursor = 'pointer';
  el.style.filter = 'drop-shadow(0 3px 3px rgba(61, 42, 51, 0.25))';
  el.innerHTML = jamboPinSvg(tone);
}
