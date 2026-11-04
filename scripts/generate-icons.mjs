#!/usr/bin/env node
// Draws the app icon, the adaptive icon layers, the splash image and the favicon: the cburnett white knight on a
// corner of the app's board, with the green discovery arrow making a knight's move (an "L"). SVG composed here,
// rendered to PNG by headless Chrome (no npm dependency). Run once after a design change, commit the PNGs:
//   node scripts/generate-icons.mjs            (CHROME=<path to chrome.exe> if Chrome is elsewhere)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'assets');

// App palette (src/ui/theme.ts): board squares, arrow green, background.
const LIGHT = '#f0d9b5';
const DARK = '#b58863';
const GREEN = '#15781B';
const BG = '#312e2b';

// Knight paths of assets/pieces/wN.svg (viewBox 45 x 45), recoloured per use.
const KNIGHT_BODY = 'M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21';
const KNIGHT_HEAD = 'M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3';
const KNIGHT_EYES = 'M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.433-9.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z';

// Board squares of size `s` on a 1024 canvas, aligned so that a grid line passes through the centre (the full icon
// uses 4 x 256 px; the adaptive background the same grid scaled like the foreground).
function board(s) {
  const out = [];
  const first = Math.floor(-512 / s) - 1;
  const last = Math.ceil(512 / s) + 1;
  for (let r = first; r < last; r++) {
    for (let c = first; c < last; c++) {
      const light = ((r + c) % 2 + 2) % 2 === 0;
      out.push(`<rect x="${512 + c * s}" y="${512 + r * s}" width="${s + 0.5}" height="${s + 0.5}" fill="${light ? LIGHT : DARK}"/>`);
    }
  }
  return out.join('');
}

// Knight's move from the knight's square (col 1, row 2 of the 4 x 4 grid): two squares right, one up, ending on
// the centre of the square (896, 384).
function arrow(color = GREEN, outline = true) {
  const d = 'M 400 640 L 896 640 L 896 476';
  const head = '<polygon points="896,330 804,476 988,476"';
  return [
    outline ? `<path d="${d}" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="104" stroke-linejoin="round" stroke-linecap="round"/>` : '',
    outline ? `${head} fill="#ffffff" fill-opacity="0.55" stroke="#ffffff" stroke-opacity="0.55" stroke-width="34" stroke-linejoin="round"/>` : '',
    `<path d="${d}" fill="none" stroke="${color}" stroke-width="70" stroke-linejoin="round" stroke-linecap="round"/>`,
    `${head} fill="${color}" stroke="${color}" stroke-width="6" stroke-linejoin="round"/>`,
  ].join('');
}

// The knight, ~560 px tall, standing on the square around (384, 640); `mono` draws a plain silhouette.
function knight(mono = false) {
  const t = 'translate(118 70) scale(13.2)';
  if (mono) {
    return `<g transform="${t}" fill="#ffffff" stroke="#ffffff" stroke-width="1.5" stroke-linejoin="round"><path d="${KNIGHT_BODY}"/><path d="${KNIGHT_HEAD}"/></g>`;
  }
  return `<g transform="${t}">
    <g transform="translate(1.2 1.4)" fill="#000" fill-opacity="0.28" stroke="none"><path d="${KNIGHT_BODY}"/><path d="${KNIGHT_HEAD}"/></g>
    <g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5">
      <path fill="#fff" d="${KNIGHT_BODY}"/><path fill="#fff" d="${KNIGHT_HEAD}"/><path fill="#000" d="${KNIGHT_EYES}"/>
    </g></g>`;
}

const svg = (body, { clip } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${
    clip ? `<defs><clipPath id="c"><rect width="1024" height="1024" rx="${clip}"/></clipPath></defs><g clip-path="url(#c)">${body}</g>` : body
  }</svg>`;

// Adaptive icon: the launcher shows the centre 66 % of the layer, so the drawing is scaled to 62 % around the centre.
const SAFE = 0.62;
// The knight + arrow drawing spans x 190-990, y 155-690: its centre (590, 422) goes to the layer centre.
const scaled = (inner) => `<g transform="translate(512 512) scale(${SAFE}) translate(-590 -422)">${inner}</g>`;

const IMAGES = {
  'icon.png': { size: 1024, svg: svg(board(256) + arrow() + knight()) },
  'android-icon-background.png': { size: 1024, svg: svg(board(256 * SAFE)) },
  'android-icon-foreground.png': { size: 1024, svg: svg(scaled(arrow() + knight())) },
  'android-icon-monochrome.png': { size: 1024, svg: svg(scaled(arrow('#ffffff', false) + knight(true))) },
  'splash-icon.png': { size: 1024, svg: svg(board(256) + arrow() + knight(), { clip: 200 }) },
  'favicon.png': { size: 48, svg: svg(board(256) + arrow() + knight(), { clip: 160 }) },
};

function chrome() {
  const candidates = [
    process.env.CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  const found = candidates.find((c) => c && fs.existsSync(c));
  if (!found) throw new Error('Chrome not found: set CHROME=<path to chrome>');
  return found;
}

const exe = chrome();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'icons-'));
for (const [name, { size, svg: content }] of Object.entries(IMAGES)) {
  const html = path.join(tmp, `${name}.html`);
  fs.writeFileSync(
    html,
    `<!doctype html><html><body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px">${content.replace(
      'width="1024" height="1024"',
      `width="${size}" height="${size}"`,
    )}</div></body></html>`,
  );
  const out = path.join(ASSETS, name);
  execFileSync(exe, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--default-background-color=00000000',
    `--window-size=${size},${size}`,
    `--screenshot=${out}`,
    `file:///${html.replace(/\\/g, '/')}`,
  ], { stdio: 'ignore' });
  console.log(`wrote assets/${name} (${size} px)`);
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`splash background: ${BG}`);
