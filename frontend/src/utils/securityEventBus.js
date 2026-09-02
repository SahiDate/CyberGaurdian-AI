/**
 * Cross-tab Security Event Dispatcher & Listener for instant, zero-poll real-time updates.
 */

export const emitSecurityEvent = (type = 'SCAN_COMPLETED', payload = {}) => {
  try {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('cyberguardian_channel');
      channel.postMessage({ type, payload, timestamp: Date.now() });
      channel.close();
    }
  } catch (e) {
    console.debug('BroadcastChannel emit error:', e);
  }
};

export const subscribeSecurityEvents = (callback) => {
  if (typeof window === 'undefined') return () => {};

  let channel = null;
  try {
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel('cyberguardian_channel');
      channel.onmessage = (event) => {
        if (event.data && callback) {
          callback(event.data);
        }
      };
    }
  } catch (e) {
    console.debug('BroadcastChannel subscribe error:', e);
  }

  const handleVisibility = () => {
    if (document.visibilityState === 'visible' && callback) {
      callback({ type: 'TAB_FOCUSED' });
    }
  };

  document.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('focus', handleVisibility);

  return () => {
    try {
      if (channel) channel.close();
    } catch (_) {}
    document.removeEventListener('visibilitychange', handleVisibility);
    window.removeEventListener('focus', handleVisibility);
  };
};
