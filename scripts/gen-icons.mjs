// Renders public/logo.svg into the PWA icon PNGs in public/icons.
// Needs Playwright's Chromium: `npm i --no-save playwright` then
// `node scripts/gen-icons.mjs`.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svgPath = join(root, 'public', 'logo.svg');
const outDir = join(root, 'public', 'icons');
const svg = readFileSync(svgPath, 'utf8').replace('<svg ', '<svg width="100%" height="100%" ');
const jobs = [
  ['icon-192.png', 192, null, 0.06],
  ['icon-512.png', 512, null, 0.06],
  ['maskable-192.png', 192, '#FDE2E8', 0.2],
  ['maskable-512.png', 512, '#FDE2E8', 0.2],
  ['apple-touch-icon.png', 180, '#FDE2E8', 0.12],
];
const b = await chromium.launch();
const p = await b.newPage();
for (const [name, size, bg, inset] of jobs) {
  await p.setViewportSize({ width: size, height: size });
  const pad = Math.round(size * inset);
  await p.setContent(
    `<html><body style="margin:0;background:${bg ?? 'transparent'}"><div style="box-sizing:border-box;width:${size}px;height:${size}px;padding:${pad}px">${svg}</div></body></html>`,
  );
  await p.screenshot({ path: `${outDir}/${name}`, omitBackground: !bg });
}
await b.close();
