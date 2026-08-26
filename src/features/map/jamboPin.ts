// A jambo-fruit shaped map pin (matches public/logo.svg). The pear-shaped
// fruit's calyx tip points down at the location, so markers anchor 'bottom'.
export const JAMBO_PIN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
  <defs>
    <linearGradient id="jambo-pin" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#C21030"/>
      <stop offset="1" stop-color="#B0165A"/>
    </linearGradient>
  </defs>
  <!-- white halo for contrast against the map -->
  <path d="M32 23 C23 23 18 30 18 38 C18 49 25 56 32 56 C40 56 45 49 44 38 C43 30 40 23 32 23 Z"
        fill="none" stroke="#fff" stroke-width="4"/>
  <!-- leaf + stem -->
  <path d="M33 15 C41 5 53 5 58 9 C53 19 42 21 35 16 Z" fill="#2E7D32" stroke="#fff" stroke-width="1"/>
  <path d="M31 14 C31 19 31 22 32 25" fill="none" stroke="#1B5E20" stroke-width="2.6" stroke-linecap="round"/>
  <!-- pear-shaped jambo fruit -->
  <path d="M32 23 C23 23 18 30 18 38 C18 49 25 56 32 56 C40 56 45 49 44 38 C43 30 40 23 32 23 Z"
        fill="url(#jambo-pin)"/>
  <!-- 4-point green calyx peeking from the bottom tip -->
  <path d="M30 53 L25.5 61 L31.5 54.5 Z" fill="#2E7D32"/>
  <path d="M30.5 54 L32 62 L33.5 54 Z" fill="#1B5E20"/>
  <path d="M34 53 L38.5 61 L32.5 54.5 Z" fill="#2E7D32"/>
  <!-- soft highlight -->
  <ellipse cx="26" cy="33" rx="3" ry="5" fill="#fff" opacity="0.22"/>
</svg>`.trim();

/** Style an element as a jambo pin and fill it with the fruit SVG. */
export function applyJamboPin(el: HTMLElement): void {
  el.style.width = '30px';
  el.style.height = '34px';
  el.style.cursor = 'pointer';
  el.style.filter = 'drop-shadow(0 2px 2px rgba(0, 0, 0, 0.35))';
  el.innerHTML = JAMBO_PIN_SVG;
}
