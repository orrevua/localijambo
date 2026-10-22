import type { JamboTone } from '../../lib/jamboStatus.ts';

// Drawn from a photo of jambo vermelho (Syzygium malaccense): a glossy,
// bell-shaped fruit — narrow at the stem, broad at the base — with a sunken
// calyx crater holding four small sepals. Unripe fruit is pale pink-white,
// the flowers are magenta "pom-poms" of stamens.

const FRUIT_BODY =
  'M32 12 C24.5 12 19.6 16.3 18.6 22.5 C17.6 29 13.8 33.8 13.8 42 C13.8 51.2 21.5 57.6 32 57.6 C42.5 57.6 50.2 51.2 50.2 42 C50.2 33.8 46.4 29 45.4 22.5 C44.4 16.3 39.5 12 32 12 Z';

// [light, mid, dark] skin colours; crater [rim, inside]
const FRUIT: Record<
  'ripe' | 'fruiting',
  { skin: [string, string, string]; crater: [string, string] }
> = {
  ripe: { skin: ['#E0496B', '#B71F45', '#651030'], crater: ['#8E1A3B', '#4A0A20'] },
  fruiting: { skin: ['#FFF1F3', '#F6C3CF', '#D9869C'], crater: ['#E2A2B2', '#B86A80'] },
};

function fruitSvg(tone: 'ripe' | 'fruiting', id: string): string {
  const { skin, crater } = FRUIT[tone];
  return `
  <defs>
    <radialGradient id="${id}" cx="0.38" cy="0.36" r="0.75">
      <stop offset="0" stop-color="${skin[0]}"/>
      <stop offset="0.45" stop-color="${skin[1]}"/>
      <stop offset="1" stop-color="${skin[2]}"/>
    </radialGradient>
  </defs>
  <path d="${FRUIT_BODY}" fill="#fff" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>
  <path d="M34 9 C39 2.5 48 2 53 5 C49 11.5 41 13 35.5 10.5 Z" fill="#6FAE7F" stroke="#fff" stroke-width="1.5"/>
  <path d="M31.5 6 C32 8.5 32 10.5 32 13" fill="none" stroke="#5B4A2E" stroke-width="2.6" stroke-linecap="round"/>
  <path d="${FRUIT_BODY}" fill="url(#${id})"/>
  <ellipse cx="32" cy="52" rx="7.6" ry="3.3" fill="${crater[0]}"/>
  <ellipse cx="32" cy="52.3" rx="5.6" ry="2.3" fill="${crater[1]}"/>
  <g fill="#D3C670">
    <ellipse cx="29.3" cy="52.2" rx="1.6" ry="0.85"/><ellipse cx="34.7" cy="52.2" rx="1.6" ry="0.85"/>
    <ellipse cx="32" cy="50.9" rx="0.95" ry="0.75"/><ellipse cx="32" cy="53.5" rx="0.95" ry="0.75"/>
  </g>
  <ellipse cx="24.5" cy="29" rx="3" ry="6.5" transform="rotate(20 24.5 29)" fill="#fff" opacity="0.45"/>`;
}

// Jambo flower: a dense puff of magenta stamens around a small green base.
function flowerSvg(): string {
  const stamens: string[] = [];
  for (let i = 0; i < 44; i++) {
    const a = (i / 44) * Math.PI * 2 + (i % 2) * 0.07;
    const len = 15 + (i % 4) * 2.2;
    const x = (32 + Math.cos(a) * len).toFixed(1);
    const y = (30 + Math.sin(a) * len).toFixed(1);
    stamens.push(
      `<line x1="32" y1="30" x2="${x}" y2="${y}"/><circle cx="${x}" cy="${y}" r="2.1"/>`,
    );
  }
  return `
  <circle cx="32" cy="30" r="25" fill="#fff"/>
  <path d="M32 48 L32 58" stroke="#fff" stroke-width="5" stroke-linecap="round"/>
  <path d="M32 48 L32 57.5" stroke="#5E9B6E" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="32" cy="30" r="18" fill="#F7B6D3"/>
  <g stroke="#D8428C" stroke-width="1.6" fill="#E45C9E">${stamens.join('')}</g>
  <circle cx="32" cy="30" r="5.5" fill="#B8306F"/>
  <circle cx="32" cy="30" r="3" fill="#8FBF7A"/>`;
}

// Resting tree: a single soft green leaf.
function leafSvg(): string {
  const leaf = 'M32 57 C16 48 13 28 22 14 C27 7 37 7 42 14 C51 28 48 48 32 57 Z';
  return `
  <path d="${leaf}" fill="#fff" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>
  <path d="${leaf}" fill="#8CC7A1"/>
  <path d="M32 55 C31 40 31 26 32 12" fill="none" stroke="#3F8A5F" stroke-width="2" stroke-linecap="round"/>
  <path d="M32 40 L24 33 M32 32 L40 25 M32 47 L39 41 M32 25 L26 20" fill="none" stroke="#3F8A5F" stroke-width="1.4" stroke-linecap="round"/>
  <ellipse cx="25" cy="26" rx="2" ry="6" transform="rotate(15 25 26)" fill="#fff" opacity="0.35"/>`;
}

/**
 * Map pin for a tree. The drawing's base touches the bottom edge, so markers
 * anchor 'bottom'. 'new' is the ripe fruit, used for the placement pin.
 */
export function jamboPinSvg(tone: JamboTone | 'new' = 'ripe'): string {
  let body: string;
  if (tone === 'flowering') body = flowerSvg();
  else if (tone === 'resting') body = leafSvg();
  else body = fruitSvg(tone === 'fruiting' ? 'fruiting' : 'ripe', `jambo-pin-${tone}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 61" width="100%" height="100%" aria-hidden="true">${body}</svg>`;
}

/** Style an element as a jambo pin and fill it with the matching drawing. */
export function applyJamboPin(el: HTMLElement, tone: JamboTone | 'new' = 'ripe'): void {
  el.style.width = '36px';
  el.style.height = '34px';
  el.style.cursor = 'pointer';
  el.style.filter = 'drop-shadow(0 3px 3px rgba(61, 42, 51, 0.28))';
  el.innerHTML = jamboPinSvg(tone);
}
