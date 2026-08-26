// Throwaway icon generator — renders the Localijambo jambo glyph to branded PNGs.
// No external deps: procedural rasterizer + zlib PNG encoder (Node built-ins).
// Run: node scripts/gen-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

const CREAM = [0xff, 0xf7, 0xf2];
const CRIMSON = [0xc2, 0x10, 0x30];
const MAGENTA = [0xb0, 0x16, 0x5a];
const LEAF = [0x2e, 0x7d, 0x32];
const LEAF_DARK = [0x1b, 0x5e, 0x20];

// CRC32 for PNG chunks.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Geometry helpers in normalized glyph space [0..1] × [0..1].
function pointInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// The glyph, authored to match favicon/logo.svg (64-unit space, normalized to 0..1).
const S = 64;
const fruit = { cx: 32 / S, cy: 39 / S, rx: 13.5 / S, ry: 16.5 / S };
const leafPoly = [
  [33, 16],
  [40, 8],
  [50, 8],
  [54, 11],
  [50, 19],
  [41, 21],
  [35, 17],
].map(([x, y]) => [x / S, y / S]);
// 4-point green crown/calyx at the bottom tip; spikes peek below the fruit.
const calyxPolys = [
  [
    [30, 53],
    [25.5, 61],
    [31.5, 54.5],
  ],
  [
    [30.5, 54],
    [32, 62],
    [33.5, 54],
  ],
  [
    [34, 53],
    [38.5, 61],
    [32.5, 54.5],
  ],
].map((poly) => poly.map(([x, y]) => [x / S, y / S]));
const stem = { x: 31.5 / S, y0: 15 / S, y1: 26 / S, w: 2.6 / S };

function sampleGlyph(nx, ny) {
  // returns [r,g,b] or null (transparent) for a point in [0..1]^2 glyph space.
  // fruit ellipse with crimson→magenta vertical gradient
  const dx = (nx - fruit.cx) / fruit.rx;
  const dy = (ny - fruit.cy) / fruit.ry;
  if (dx * dx + dy * dy <= 1) {
    const t = Math.min(1, Math.max(0, (ny - (fruit.cy - fruit.ry)) / (2 * fruit.ry)));
    return [
      Math.round(CRIMSON[0] + (MAGENTA[0] - CRIMSON[0]) * t),
      Math.round(CRIMSON[1] + (MAGENTA[1] - CRIMSON[1]) * t),
      Math.round(CRIMSON[2] + (MAGENTA[2] - CRIMSON[2]) * t),
    ];
  }
  for (const poly of calyxPolys) if (pointInPoly(nx, ny, poly)) return LEAF;
  if (pointInPoly(nx, ny, leafPoly)) return LEAF;
  // stem (thin vertical capsule)
  if (nx >= stem.x - stem.w / 2 && nx <= stem.x + stem.w / 2 && ny >= stem.y0 && ny <= stem.y1)
    return LEAF_DARK;
  return null;
}

// Render one icon. inset = fraction of padding around the glyph (0 = full bleed).
function render(size, { background, inset }) {
  const SS = 4; // supersampling
  const W = size * SS;
  const rgba = Buffer.alloc(size * size * 4);
  const acc = new Float32Array(size * size * 4);
  const drawSpan = 1 - 2 * inset;
  for (let py = 0; py < W; py++) {
    for (let px = 0; px < W; px++) {
      const nx = inset + (px / W) * drawSpan;
      const ny = inset + (py / W) * drawSpan;
      const c = sampleGlyph(nx, ny);
      const ox = Math.floor(px / SS);
      const oy = Math.floor(py / SS);
      const idx = (oy * size + ox) * 4;
      if (c) {
        acc[idx] += c[0];
        acc[idx + 1] += c[1];
        acc[idx + 2] += c[2];
        acc[idx + 3] += 255;
      } else if (background) {
        acc[idx] += background[0];
        acc[idx + 1] += background[1];
        acc[idx + 2] += background[2];
        acc[idx + 3] += 255;
      }
      // else: transparent contribution (0)
    }
  }
  const per = SS * SS;
  for (let i = 0; i < size * size; i++) {
    const a = acc[i * 4 + 3] / per;
    rgba[i * 4 + 3] = Math.round(a);
    if (a > 0) {
      rgba[i * 4] = Math.round(acc[i * 4] / per / (a / 255));
      rgba[i * 4 + 1] = Math.round(acc[i * 4 + 1] / per / (a / 255));
      rgba[i * 4 + 2] = Math.round(acc[i * 4 + 2] / per / (a / 255));
    }
  }
  return encodePng(size, size, rgba);
}

const jobs = [
  ['icon-192.png', 192, { background: null, inset: 0.06 }],
  ['icon-512.png', 512, { background: null, inset: 0.06 }],
  ['maskable-192.png', 192, { background: CREAM, inset: 0.19 }],
  ['maskable-512.png', 512, { background: CREAM, inset: 0.19 }],
  ['apple-touch-icon.png', 180, { background: CREAM, inset: 0.1 }],
];
for (const [name, size, opts] of jobs) {
  writeFileSync(join(OUT, name), render(size, opts));
  console.log('wrote', name, size);
}
