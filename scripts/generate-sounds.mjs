#!/usr/bin/env node
// Generates the 4 short sound effects as 16-bit mono WAV files in assets/sounds/ (synthesised: no third-party
// audio, no licence). No dependency: `node scripts/generate-sounds.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const RATE = 22050;

// notes: [frequency Hz, duration s, start s]; `noise` adds a short wooden click at the start.
function render({ notes, noise = 0, gain = 0.5 }) {
  const length = Math.ceil(RATE * Math.max(...notes.map(([, d, s]) => s + d)) + RATE * 0.01);
  const samples = new Float32Array(length);
  for (const [freq, duration, start] of notes) {
    const from = Math.floor(start * RATE);
    const count = Math.floor(duration * RATE);
    for (let i = 0; i < count; i++) {
      const t = i / RATE;
      const envelope = Math.min(1, i / (RATE * 0.004)) * Math.exp((-5 * t) / duration);
      samples[from + i] += Math.sin(2 * Math.PI * freq * t) * envelope;
    }
  }
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let i = 0; i < noise * RATE; i++) samples[i] += random() * Math.exp(-i / (RATE * 0.006)) * 0.8;
  const peak = Math.max(...samples.map(Math.abs)) || 1;
  const data = Buffer.alloc(length * 2);
  samples.forEach((v, i) => data.writeInt16LE(Math.round((v / peak) * gain * 32767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const SOUNDS = {
  move: { notes: [[520, 0.06, 0]], noise: 0.02, gain: 0.45 },
  capture: { notes: [[330, 0.09, 0], [250, 0.08, 0.03]], noise: 0.03, gain: 0.55 },
  error: { notes: [[220, 0.12, 0], [175, 0.16, 0.1]], gain: 0.45 },
  success: { notes: [[523, 0.12, 0], [659, 0.12, 0.09], [784, 0.22, 0.18]], gain: 0.4 },
};

const dir = path.join(root, 'assets', 'sounds');
fs.mkdirSync(dir, { recursive: true });
for (const [name, spec] of Object.entries(SOUNDS)) {
  fs.writeFileSync(path.join(dir, `${name}.wav`), render(spec));
}
console.log(`wrote ${Object.keys(SOUNDS).length} sounds in assets/sounds/`);
