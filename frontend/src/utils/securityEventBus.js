/**
 * Cross-tab and Same-window Security Event Dispatcher & Listener for instant, zero-delay real-time updates.
 */

const CHANNEL_NAME = 'cyberguardian_channel';
const CUSTOM_EVENT_NAME = 'cyberguardian_security_event';

export const emitSecurityEvent = (type = 'SCAN_COMPLETED', payload = {}) => {
  try {
    if (typeof window !== 'undefined') {
      const eventData = { type, payload, timestamp: Date.now() };

      // 1. Dispatch locally in current window/SPA context
      window.dispatchEvent(new CustomEvent(CUSTOM_EVENT_NAME, { detail: eventData }));

      // 2. Broadcast across tabs/windows via BroadcastChannel
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channel.postMessage(eventData);
        setTimeout(() => {
          try {
            channel.close();
          } catch (_) {}
        }, 200);
      }
    }
  } catch (e) {
    console.debug('SecurityEventBus emit error:', e);
  }
};

export const subscribeSecurityEvents = (callback) => {
  if (typeof window === 'undefined') return () => {};

  let channel = null;
  const handleMessage = (data) => {
    if (data && callback) {
      try {
        callback(data);
      } catch (err) {
        console.debug('Error in security event listener callback:', err);
      }
    }
  };

  try {
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (event) => {
        handleMessage(event.data);
      };
    }
  } catch (e) {
    console.debug('BroadcastChannel subscribe error:', e);
  }

  // Listen to same-window events
  const handleCustomEvent = (e) => {
    if (e.detail) {
      handleMessage(e.detail);
    }
  };
  window.addEventListener(CUSTOM_EVENT_NAME, handleCustomEvent);

  const handleVisibility = () => {
    if (document.visibilityState === 'visible' && callback) {
      handleMessage({ type: 'TAB_FOCUSED' });
    }
  };

  document.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('focus', handleVisibility);

  return () => {
    try {
      if (channel) channel.close();
    } catch (_) {}
    window.removeEventListener(CUSTOM_EVENT_NAME, handleCustomEvent);
    document.removeEventListener('visibilitychange', handleVisibility);
    window.removeEventListener('focus', handleVisibility);
  };
};

