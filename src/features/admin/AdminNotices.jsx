/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useState } from 'react';
import { describeIssue } from '../../lib/diagnostics';

function friendlyNotice(item, lang) {
  if (item.scope === 'translation' && (item.page === '/admin/career' || item.details?.includes('validateCareer'))) {
    return lang === 'fa'
      ? '\u0633\u0631\u0648\u06cc\u0633 \u062a\u0631\u062c\u0645\u0647 \u062f\u0631 \u062f\u0633\u062a\u0631\u0633 \u0646\u0628\u0648\u062f. \u0645\u062a\u0646 \u0641\u0627\u0631\u0633\u06cc \u0630\u062e\u06cc\u0631\u0647 \u0634\u062f\u061b \u0633\u0631\u0648\u06cc\u0633 \u0631\u0627 \u0627\u062c\u0631\u0627 \u06a9\u0646 \u0648 \u0633\u0627\u0628\u0642\u0647\u0654 \u06a9\u0627\u0631\u06cc \u0631\u0627 \u062f\u0648\u0628\u0627\u0631\u0647 \u0630\u062e\u06cc\u0631\u0647 \u06a9\u0646 \u062a\u0627 \u062a\u0631\u062c\u0645\u0647 \u0627\u0646\u062c\u0627\u0645 \u0634\u0648\u062f.'
      : 'The translation service was unavailable. The Persian text was saved; start the service and save the work history again to create the English translation.';
  }
  return item.friendlyMessage?.[lang] || (lang === 'fa' ? '\u062f\u0631 \u0627\u06cc\u0646 \u0628\u062e\u0634 \u0645\u0634\u06a9\u0644\u06cc \u0631\u062e \u062f\u0627\u062f\u0647 \u0627\u0633\u062a\u061b \u062c\u0632\u0626\u06cc\u0627\u062a \u0641\u0646\u06cc \u062f\u0631 \u0627\u062f\u0627\u0645\u0647 \u0622\u0645\u062f\u0647.' : 'An issue occurred in this area. Technical details are below.');
}

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
    <ul className="notice-list">{items.map((item) => <li key={item.id} className="notice-item"><div className="notice-copy"><strong>{fa ? `بخش: ${describeIssue(item.scope, lang)}` : `Area: ${describeIssue(item.scope, lang)}`}</strong><p>{friendlyNotice(item, lang)}</p><small>{fa ? 'مسیر' : 'Page'}: <code dir="ltr">{item.page || '/'}</code> · {new Date(item.createdAt).toLocaleString(fa ? 'fa-IR' : 'en-US')}</small>{item.details && <details><summary>{fa ? 'جزئیات فنی' : 'Technical details'}</summary><pre dir="ltr">{item.details}</pre></details>}</div><button className="delete-action" type="button" disabled={busyId === item.id} onClick={() => dismiss(item)}>{fa ? 'رفع شد' : 'Dismiss'}</button></li>)}</ul>
  </section>;
}
