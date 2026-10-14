/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react';

function decodeKey(value) {
  const normalized = `${value}${'='.repeat((4 - value.length % 4) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(normalized);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

async function sendSubscription(path, subscription) {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not update notification settings.');
  return result;
}

export default function PushToggle({ lang, notify }) {
  const [registration, setRegistration] = useState(null);
  const [publicKey, setPublicKey] = useState('');
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const canPush = window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    if (!canPush) return undefined;
    let active = true;
    setSupported(true);
    Promise.all([
      navigator.serviceWorker.register('/service-worker.js', { scope: '/' }),
      fetch('/api/push/public-key', { credentials: 'same-origin' }).then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.publicKey) throw new Error('Push notifications are not configured.');
        return result.publicKey;
      })
    ]).then(async ([registered, key]) => {
      if (!active) return;
      const worker = await navigator.serviceWorker.ready;
      setRegistration(worker || registered);
      setPublicKey(key);
      const subscription = await (worker || registered).pushManager.getSubscription();
      if (!active || !subscription) return;
      await sendSubscription('/api/push/subscribe', subscription.toJSON());
      if (active) setEnabled(true);
    }).catch((error) => { if (active) { setSupported(false); notify?.(error.message || (lang === 'fa' ? 'اتصال اعلان‌ها به سرور ناموفق بود.' : 'Could not connect notifications to the server.')); } });
    return () => { active = false; };
  }, [lang, notify]);

  if (!supported) return null;
  const toggle = async () => {
    if (!registration || busy) return;
    setBusy(true);
    try {
      const current = await registration.pushManager.getSubscription();
      if (current) {
        await current.unsubscribe();
        await sendSubscription('/api/push/unsubscribe', { endpoint: current.endpoint });
        setEnabled(false);
        notify?.(lang === 'fa' ? 'اعلان‌ها غیرفعال شدند.' : 'Notifications disabled.');
        return;
      }
      let permission = Notification.permission;
      if (permission === 'default') permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error(lang === 'fa' ? 'اجازهٔ اعلان‌ها از تنظیمات مرورگر داده نشده است.' : 'Allow notifications in your browser settings first.');
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(publicKey) });
      await sendSubscription('/api/push/subscribe', subscription.toJSON());
      setEnabled(true);
      notify?.(lang === 'fa' ? 'اعلان‌های سایت فعال شد.' : 'Site notifications enabled.');
    } catch (error) {
      notify?.(error.message || (lang === 'fa' ? 'فعال‌سازی اعلان ناموفق بود.' : 'Could not enable notifications.'));
    } finally { setBusy(false); }
  };

  return <button className="icon-button push-toggle" type="button" disabled={busy || !registration} onClick={toggle} aria-label={enabled ? (lang === 'fa' ? 'غیرفعال‌کردن اعلان‌ها' : 'Disable notifications') : (lang === 'fa' ? 'فعال‌کردن اعلان‌ها' : 'Enable notifications')} title={enabled ? (lang === 'fa' ? 'اعلان‌ها فعال است' : 'Notifications are on') : (lang === 'fa' ? 'فعال‌کردن اعلان‌ها' : 'Enable notifications')}>
    <span aria-hidden="true">{enabled ? '🔔' : '🔕'}</span>
  </button>;
}
