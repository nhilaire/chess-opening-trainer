// Sounds and vibration for the trainer, following the « Sons » / « Vibrations » settings.
// One expo-audio player per sound, created lazily; failures are ignored (no sound is better than a crash).
// The first load of each sound is logged (SOUND_LOADED <name>) so that logcat proves playback on the phone.
import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';

import type { Sound } from '../game/trainer';
import type { Feedback } from '../storage/repertoireStore';

const SOURCES: Record<Sound, number> = {
  move: require('../../assets/sounds/move.wav'),
  capture: require('../../assets/sounds/capture.wav'),
  error: require('../../assets/sounds/error.wav'),
  success: require('../../assets/sounds/success.wav'),
};

// What a trainer sound triggers with the current settings (pure, unit-tested).
export function effectsFor(kind: Sound, settings: Feedback): { sound: Sound | null; vibrate: boolean } {
  return { sound: settings.sound ? kind : null, vibrate: settings.vibration && kind === 'error' };
}

const players = new Map<Sound, AudioPlayer>();
let modeSet = false;

function player(kind: Sound): AudioPlayer {
  let p = players.get(kind);
  if (!p) {
    if (!modeSet) {
      modeSet = true;
      // Plays whatever the ringer mode; the in-app switch is the mute.
      setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
    }
    p = createAudioPlayer(SOURCES[kind]);
    players.set(kind, p);
    console.log(`SOUND_LOADED ${kind}`);
  }
  return p;
}

export function playFeedback(kind: Sound, settings: Feedback): void {
  const { sound, vibrate } = effectsFor(kind, settings);
  if (sound) {
    try {
      const p = player(sound);
      p.seekTo(0).catch(() => {});
      p.play();
    } catch {
      // audio is optional
    }
  }
  if (vibrate) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
}
