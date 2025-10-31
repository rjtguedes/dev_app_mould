// 🔊 Hook para sons do app
import { useCallback } from 'react';
import { playSound, sounds, stopAllSounds } from '../lib/sounds';

export function useSounds() {
  // Tocar sons de feedback
  const playNotification = useCallback(() => playSound('notification'), []);
  const playSuccess = useCallback(() => playSound('success'), []);
  const playError = useCallback(() => playSound('error'), []);
  const playClick = useCallback(() => playSound('click'), []);
  
  // Sons de produção
  const playStop = useCallback(() => playSound('stop'), []);
  const playResume = useCallback(() => playSound('resume'), []);
  
  // Alertas
  const playAlert = useCallback(() => playSound('alert'), []);
  const playWarning = useCallback(() => playSound('warning'), []);

  return {
    playNotification,
    playSuccess,
    playError,
    playClick,
    playStop,
    playResume,
    playAlert,
    playWarning,
    stopAllSounds
  };
}


