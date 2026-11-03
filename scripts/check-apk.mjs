#!/usr/bin/env node
// Device-side proof read from a built APK (AC-03, AC-35): launcher name per language and permissions.
// Usage: node scripts/check-apk.mjs <path/to/app.apk>   (uses aapt from the newest Android SDK build-tools)
// Exit code 1 when the AD_ID permission is present or a launcher name differs from factory-app.json.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const meta = JSON.parse(fs.readFileSync(path.join(root, 'factory-app.json'), 'utf8'));
const apk = process.argv[2];
if (!apk || !fs.existsSync(apk)) {
  console.error('usage: node scripts/check-apk.mjs <path/to/app.apk>');
  process.exit(2);
}

function aapt() {
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!sdk) throw new Error('ANDROID_HOME is not set');
  const tools = path.join(sdk, 'build-tools');
  const newest = fs.readdirSync(tools).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })).pop();
  const exe = path.join(tools, newest, process.platform === 'win32' ? 'aapt.exe' : 'aapt');
  return exe;
}

const badging = execFileSync(aapt(), ['dump', 'badging', apk], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const permissions = [...badging.matchAll(/uses-permission: name='([^']+)'/g)].map((m) => m[1]);
const labels = Object.fromEntries([...badging.matchAll(/application-label-([a-zA-Z-]+):'([^']*)'/g)].map((m) => [m[1], m[2]]));
const defaultLabel = (badging.match(/application-label:'([^']*)'/) || [])[1];

const expected = { [meta.languages[0]]: meta.displayName, ...(meta.displayNames || {}) };
const problems = [];
for (const [lang, name] of Object.entries(expected)) {
  if (labels[lang] !== name) problems.push(`launcher name for ${lang} is ${JSON.stringify(labels[lang])}, expected ${JSON.stringify(name)}`);
}
const fallbackName = expected[meta.fallbackLanguage] || meta.displayName;
if (defaultLabel !== fallbackName) problems.push(`default launcher name is ${JSON.stringify(defaultLabel)}, expected ${JSON.stringify(fallbackName)}`);
for (const forbidden of ['com.google.android.gms.permission.AD_ID', 'android.permission.ACCESS_ADSERVICES_AD_ID']) {
  if (permissions.includes(forbidden)) problems.push(`forbidden permission ${forbidden}`);
}

console.log(`launcher names: default=${JSON.stringify(defaultLabel)} ${Object.entries(expected).map(([l]) => `${l}=${JSON.stringify(labels[l])}`).join(' ')}`);
console.log(`permissions (${permissions.length}): ${permissions.join(', ')}`);
if (problems.length) {
  for (const p of problems) console.log(`FAIL ${p}`);
  process.exit(1);
}
console.log('PASS no AD_ID permission, launcher name per language matches factory-app.json');
