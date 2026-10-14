/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useState } from 'react';
import { describeIssue } from '../../lib/diagnostics';

export default function AdminNotices({ lang, onCountChange }) {
  const fa = lang === 'fa';
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/notices', { credentials: 'same-origin' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not load notices.');
      const notices = Array.isArray(result.notices) ? result.notices : [];
      setItems(notices);
      onCountChange?.(notices.length);
      setError('');
    } catch (_) { setError(fa ? 'گزارش‌ها بارگیری نشدند. اتصال سرور را بررسی و دوباره تلاش کن.' : 'Notices could not be loaded. Check the server connection and try again.'); }
  }, [fa, onCountChange]);
  useEffect(() => { load(); const timer = setInterval(load, 30000); return () => clearInterval(timer); }, [load]);
  const dismiss = async (item) => {
    setBusyId(item.id);
    try {
      const response = await fetch(`/api/admin/notices/${encodeURIComponent(item.id)}`, { method: 'PATCH', credentials: 'same-origin' });
      if (!response.ok) throw new Error('Could not dismiss this notice.');
      setItems((current) => {
        const next = current.filter((notice) => notice.id !== item.id);
        onCountChange?.(next.length);
        return next;
      });
    } catch (_) { setError(fa ? 'حذف این اعلان انجام نشد.' : 'Could not dismiss this notice.'); }
    finally { setBusyId(''); }
  };
  return <section className="admin-card admin-wide admin-notices"><div className="admin-section-title"><div><h2>{fa ? 'گزارش خطاهای سایت' : 'Website issue reports'}</h2><p>{fa ? 'خطاهای مهم رابط کاربری، API، انتشار پروژه و ترجمه به‌صورت خودکار اینجا ثبت می‌شوند.' : 'Important interface, API, deployment and translation errors are reported here automatically.'}</p></div><button className="button button-outline" type="button" onClick={load}>{fa ? 'تازه‌سازی' : 'Refresh'}</button></div>
    {error && <p className="error-text" role="alert">{error}</p>}
    {!items.length && !error && <p className="empty-state">{fa ? 'خطای ثبت‌شده‌ای وجود ندارد.' : 'There are no reported issues.'}</p>}
    <ul className="notice-list">{items.map((item) => <li key={item.id} className="notice-item"><div className="notice-copy"><strong>{fa ? `بخش: ${describeIssue(item.scope, lang)}` : `Area: ${describeIssue(item.scope, lang)}`}</strong><p>{item.friendlyMessage?.[lang] || (fa ? 'در این بخش مشکلی رخ داده است؛ جزئیات فنی در ادامه آمده.' : 'An issue occurred in this area. Technical details are below.')}</p><small>{fa ? 'مسیر' : 'Page'}: <code dir="ltr">{item.page || '/'}</code> · {new Date(item.createdAt).toLocaleString(fa ? 'fa-IR' : 'en-US')}</small>{item.details && <details><summary>{fa ? 'جزئیات فنی' : 'Technical details'}</summary><pre dir="ltr">{item.details}</pre></details>}</div><button className="delete-action" type="button" disabled={busyId === item.id} onClick={() => dismiss(item)}>{fa ? 'رفع شد' : 'Dismiss'}</button></li>)}</ul>
  </section>;
}
