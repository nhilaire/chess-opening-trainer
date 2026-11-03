import { createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import fs from 'fs';
import path from 'path';

import { effectsFor, playFeedback } from '../feedback/feedback';

describe('feedback settings (AC-31)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('plays the sound only when sounds are on, vibrates only on errors when vibrations are on', () => {
    expect(effectsFor('move', { sound: true, vibration: true })).toEqual({ sound: 'move', vibrate: false });
    expect(effectsFor('error', { sound: true, vibration: true })).toEqual({ sound: 'error', vibrate: true });
    expect(effectsFor('error', { sound: false, vibration: true })).toEqual({ sound: null, vibrate: true });
    expect(effectsFor('error', { sound: true, vibration: false })).toEqual({ sound: 'error', vibrate: false });
    expect(effectsFor('success', { sound: false, vibration: false })).toEqual({ sound: null, vibrate: false });
  });

  it('triggers nothing when both are off', () => {
    playFeedback('error', { sound: false, vibration: false });
    expect(createAudioPlayer).not.toHaveBeenCalled();
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it('plays and vibrates when both are on', () => {
    playFeedback('error', { sound: true, vibration: true });
    expect(createAudioPlayer).toHaveBeenCalledTimes(1);
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('error');
  });
});

describe('generated sounds', () => {
  const dir = path.join(__dirname, '..', '..', 'assets', 'sounds');

  it.each(['move', 'capture', 'error', 'success'])('%s.wav is a valid, non-silent 16-bit PCM WAV', (name) => {
    const wav = fs.readFileSync(path.join(dir, `${name}.wav`));
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.readUInt32LE(4)).toBe(wav.length - 8);
    expect(wav.toString('ascii', 8, 16)).toBe('WAVEfmt ');
    expect(wav.readUInt16LE(20)).toBe(1);
    expect(wav.readUInt16LE(34)).toBe(16);
    expect(wav.toString('ascii', 36, 40)).toBe('data');
    expect(wav.readUInt32LE(40)).toBe(wav.length - 44);
    let peak = 0;
    for (let i = 44; i < wav.length; i += 2) peak = Math.max(peak, Math.abs(wav.readInt16LE(i)));
    expect(peak).toBeGreaterThan(5000);
  });
});
