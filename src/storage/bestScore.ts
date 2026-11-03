import AsyncStorage from '@react-native-async-storage/async-storage';

import { reportError } from '../telemetry/telemetry';

const KEY = 'game.bestScore.v1';

export async function loadBestScore(): Promise<number> {
  try {
    const value = Number(await AsyncStorage.getItem(KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch (error) {
    reportError(error, 'load_best_score');
    return 0;
  }
}

// Stores the score only if it beats the current best. Returns the best score after the update.
export async function saveBestScore(score: number): Promise<number> {
  const best = await loadBestScore();
  if (score <= best) return best;
  try {
    await AsyncStorage.setItem(KEY, String(score));
  } catch (error) {
    reportError(error, 'save_best_score');
  }
  return score;
}
