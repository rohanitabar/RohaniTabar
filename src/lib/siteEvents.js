const connectionLock = 'portfolio-data-events';

function shareChanges() {
  if (!window.navigator.locks || !window.BroadcastChannel) return null;
  try { return new BroadcastChannel(connectionLock); } catch (_) { return null; }
}

export function subscribeToSiteChanges(onChange, onOpen) {
  if (!window.EventSource) return () => {};
  const channel = shareChanges();
  let connection;
  let pending;
  let release;
  let wasHidden = document.hidden;

  const open = () => {
    connection = new EventSource('/api/events');
    connection.addEventListener('data-change', () => {
      channel?.postMessage('data-change');
      onChange();
    });
    connection.addEventListener('open', onOpen);
  };

  const disconnect = () => {
    pending?.abort();
    pending = null;
    connection?.close();
    connection = null;
    release?.();
    release = null;
  };

  const connect = () => {
    if (pending || connection) return;
    if (!channel) { open(); return; }
    pending = new AbortController();
    const { signal } = pending;
    window.navigator.locks.request(connectionLock, { signal }, () => {
      if (signal.aborted) return undefined;
      open();
      return new Promise((resolve) => { release = resolve; });
    }).catch(() => {
      if (signal.aborted) return;
      pending = null;
      open();
    });
  };

  const onMessage = (event) => { if (event.data === 'data-change' && !document.hidden) onChange(); };
  const onVisibility = () => {
    if (document.hidden) {
      wasHidden = true;
      disconnect();
    } else {
      if (wasHidden) onChange();
      wasHidden = false;
      connect();
    }
  };

  channel?.addEventListener('message', onMessage);
  document.addEventListener('visibilitychange', onVisibility);
  if (!wasHidden) connect();
  return () => {
    disconnect();
    channel?.close();
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
