import { useEffect } from 'react';

export function useWakeLock() {
  const acquireWakeLock = async () => {
    try {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        const wakeLock = await navigator.wakeLock.request('screen');
        console.log('Wake Lock is active');

        wakeLock.addEventListener('release', () => {
          console.log('Wake Lock was released');
        });

        return wakeLock;
      }
    } catch (err) {
      // Silently handle the error since Wake Lock is not critical
      console.debug('Wake Lock request failed:', err);
    }
    return null;
  };

  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    async function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        wakeLock = await acquireWakeLock();
      }
    }

    // Initial wake lock request
    acquireWakeLock().then(lock => {
      wakeLock = lock;
    });

    // Re-request wake lock when page becomes visible again
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      wakeLock?.release().catch(console.debug);
    };
  }, []);
}