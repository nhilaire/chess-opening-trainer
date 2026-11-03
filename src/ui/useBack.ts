import { useEffect } from 'react';
import { BackHandler } from 'react-native';

// Android back runs `onBack` instead of leaving the app (registered last, so it runs before older handlers).
export function useBack(onBack: () => void): void {
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => sub.remove();
  }, [onBack]);
}
