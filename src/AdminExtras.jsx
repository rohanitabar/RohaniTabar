/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import portrait from './components/Abbas.jpg';
import { localized } from './Editorial';
import SortableList from './SortableList';

async function request(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options });
  const result = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Request failed.');
  return result;
}

export function AdminAd({ ads = [], lang, refresh }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [editingId, setEditingId] = useState('');
  const editingAd = ads.find((ad) => ad.id === editingId);
  const save = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true); setError(''); setSaved(false);
    try {
      const fields = new FormData(form);
      const file = fields.get('imageFile');
      let imageUrl = String(fields.get('imageUrl') || '').trim();
      if (file?.size) {
        const result = await request('/api/admin/media?type=ad-image', { method: 'POST', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } });
        imageUrl = result.url;
      }
      await request(editingId ? `/api/admin/ads/${encodeURIComponent(editingId)}` : '/api/admin/ads', { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl, href: fields.get('href'), altFa: fields.get('altFa'), altEn: fields.get('altEn'), captionFa: fields.get('captionFa') }) });
      setEditingId(''); form.reset(); await refresh();
    } catch (problem) { setError(problem.message); } finally { setBusy(false); }
  };
  const remove = async (ad) => { setBusy(true); setError(''); try { await request(`/api/admin/ads/${encodeURIComponent(ad.id)}`, { method: 'DELETE' }); if (editingId === ad.id) setEditingId(''); await refresh(); } catch (problem) { setError(problem.message); } finally { setBusy(false); } };
  const reorder = async (ids) => { setBusy(true); setError(''); setSaved(false); try { await request('/api/admin/ads/order', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) }); await refresh(); setSaved(true); return true; } catch (problem) { setError(problem.message); return false; } finally { setBusy(false); } };
  return <section className="admin-card"><div className="admin-section-title"><h2>{lang === 'fa' ? 'تبلیغات سایت' : 'Site advertisements'}</h2><span className="admin-ad-count">{ads.length}</span></div><p>{lang === 'fa' ? 'ترتیب نمایش را با کشیدن دستهٔ کنار هر تبلیغ تغییر دهید. تبلیغ‌ها در صفحهٔ اصلی، پروژه‌ها و وبلاگ پخش می‌شوند.' : 'Drag the handle beside an ad to change display order. Ads are spread across the home, projects and blog pages.'}</p><form key={`${editingId || 'new-ad'}`} onSubmit={save}>
    <h3 className="admin-subheading">{editingAd ? (lang === 'fa' ? 'ویرایش تبلیغ' : 'Edit ad') : (lang === 'fa' ? 'افزودن تبلیغ' : 'Add an ad')}</h3>
    <label className="field-label">{lang === 'fa' ? 'لینک تصویر تبلیغ' : 'Ad image URL'}<input name="imageUrl" type="text" defaultValue={editingAd?.imageUrl || ''} placeholder="https://..." /></label>
    <label className="field-label">{lang === 'fa' ? 'یا بارگذاری تصویر' : 'Or upload an image'}<input name="imageFile" type="file" accept="image/png,image/jpeg,image/webp" /></label>
    <label className="field-label">{lang === 'fa' ? 'لینک مقصد آگهی' : 'Ad destination URL'}<input name="href" type="text" inputMode="url" dir="ltr" required defaultValue={editingAd?.href || editingAd?.url || editingAd?.link || ''} placeholder="https://..." /></label>
    <label className="field-label">{lang === 'fa' ? 'شرح فارسی تصویر' : 'Persian image description'}<input name="altFa" defaultValue={editingAd?.altFa || ''} maxLength="120" /></label>
    <label className="field-label">{lang === 'fa' ? 'شرح انگلیسی تصویر' : 'English image description'}<input name="altEn" defaultValue={editingAd?.altEn || ''} maxLength="120" /></label>
    <label className="field-label">{lang === 'fa' ? 'متن زیر تصویر' : 'Text below image'}<input name="captionFa" defaultValue={editingAd?.captionFa || ''} maxLength="240" placeholder={lang === 'fa' ? 'مثلاً: برای دیدن جزئیات کلیک کنید' : 'e.g. Click to learn more'} /></label>
    {editingAd?.imageUrl && <img className="admin-ad-preview" src={editingAd.imageUrl} alt="" />}
    <div className="admin-inline-actions"><button className="button button-primary" disabled={busy}>{editingAd ? (lang === 'fa' ? 'ذخیره تغییرات' : 'Save changes') : (lang === 'fa' ? 'افزودن تبلیغ' : 'Add ad')}</button>{editingAd && <button className="button button-outline" type="button" disabled={busy} onClick={() => setEditingId('')}>{lang === 'fa' ? 'لغو ویرایش' : 'Cancel edit'}</button>}</div>
    {error && <p className="error-text" role="alert">{error}</p>}
  </form><SortableList items={ads} lang={lang} busy={busy} onReorder={reorder} renderItem={(ad) => <><article className="admin-ad-item"><img src={ad.imageUrl} alt="" /><div className="admin-ad-details"><strong>{lang === 'fa' ? ad.altFa || 'تبلیغ' : ad.altEn || 'Advertisement'}</strong><a href={ad.href || ad.url || ad.link} target="_blank" rel="noreferrer" dir="ltr">{ad.href}</a></div><div className="admin-ad-item-actions"><button className="edit-action" type="button" disabled={busy} onClick={() => setEditingId(ad.id)}>{lang === 'fa' ? 'ویرایش' : 'Edit'}</button><button className="delete-action" type="button" disabled={busy} onClick={() => remove(ad)} aria-label={lang === 'fa' ? 'حذف تبلیغ' : 'Delete ad'}>×</button></div></article></>} />
  {saved && <p className="success-text" role="status">{lang === 'fa' ? 'ترتیب تبلیغ‌ها ذخیره شد.' : 'Ad order saved.'}</p>}
  </section>;
}
export function AdminMessages({ messages = [], lang, refresh }) {
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const change = async (item, action) => { setBusyId(item.id); setError(''); try { await request(`/api/admin/messages/${encodeURIComponent(item.id)}`, action === 'delete' ? { method: 'DELETE' } : { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ read: !item.read }) }); await refresh(); } catch (problem) { setError(problem.message); } finally { setBusyId(''); } };
  return <section className="admin-card admin-wide"><h2>{lang === 'fa' ? 'پیام‌های تماس' : 'Contact messages'} ({messages.length})</h2>{!messages.length && <p>{lang === 'fa' ? 'هنوز پیامی ثبت نشده است.' : 'No messages yet.'}</p>}{messages.map((item) => <article className={`admin-message ${item.read ? 'is-read' : ''}`} key={item.id}><div><h3>{item.name}</h3><time>{new Date(item.createdAt).toLocaleString(lang === 'fa' ? 'fa-IR' : 'en-US')}</time></div><p>{item.body}</p><div className="admin-message-links">{item.email && <a href={`mailto:${item.email}`} dir="ltr">{item.email}</a>}{item.phone && <a href={`tel:${item.phone.replace(/[^+\d]/g, '')}`} dir="ltr">{item.phone}</a>}</div><div className="admin-inline-actions"><button className="button button-outline" type="button" disabled={busyId === item.id} onClick={() => change(item, 'read')}>{item.read ? (lang === 'fa' ? 'خوانده‌نشده' : 'Mark unread') : (lang === 'fa' ? 'خوانده شد' : 'Mark read')}</button><button className="button button-outline admin-danger-button" type="button" disabled={busyId === item.id} onClick={() => change(item, 'delete')}>{lang === 'fa' ? 'حذف' : 'Delete'}</button></div></article>)}{error && <p className="error-text" role="alert">{error}</p>}</section>;
}

export function AdminComments({ posts, lang, refresh }) {
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const comments = posts.flatMap((post) => (post.comments || []).map((comment) => ({ ...comment, post })));
  const reply = async (event, item) => { event.preventDefault(); const form = event.currentTarget; const body = new FormData(form).get('body'); setBusyId(item.id); setError(''); try { await request(`/api/admin/posts/${encodeURIComponent(item.post.id)}/comments/${encodeURIComponent(item.id)}/replies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }) }); form.reset(); await refresh(); } catch (problem) { setError(problem.message); } finally { setBusyId(''); } };
  const remove = async (item) => { setBusyId(item.id); setError(''); try { await request(`/api/admin/comments/${encodeURIComponent(item.id)}`, { method: 'DELETE' }); await refresh(); } catch (problem) { setError(problem.message); } finally { setBusyId(''); } };
  return <section className="admin-card admin-wide"><h2>{lang === 'fa' ? 'مدیریت دیدگاه‌ها' : 'Manage comments'}</h2>{!comments.length && <p>—</p>}{comments.map((item) => <div className="admin-comment admin-comment-thread" key={item.id}><div><b>{item.author}</b><span>{localized(item.post.title, lang)}</span><p>{item.body}</p>{(item.replies || []).map((answer) => <div className="admin-answer" key={answer.id}><img src={portrait} alt="" /><div><b>عباس روحانی تبار</b><p>{answer.body}</p></div></div>)}<form className="admin-reply-form" onSubmit={(event) => reply(event, item)}><textarea name="body" maxLength="2000" required placeholder={lang === 'fa' ? 'پاسخ به دیدگاه...' : 'Write a reply...'} /><button className="button button-primary" disabled={busyId === item.id}>{lang === 'fa' ? 'ثبت پاسخ' : 'Post reply'}</button></form></div><button className="button button-outline" disabled={busyId === item.id} onClick={() => remove(item)}>{lang === 'fa' ? 'حذف' : 'Delete'}</button></div>)}{error && <p className="error-text" role="alert">{error}</p>}</section>;
}

export function AdminPush({ lang, posts = [] }) {
  const [kind, setKind] = useState('update');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const posterPosts = posts.filter((post) => post.published !== false && post.image);
  const send = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true); setError(''); setResult('');
    try {
      const fields = new FormData(form);
      const response = await request('/api/admin/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, title: fields.get('title'), body: fields.get('body'), imageUrl: fields.get('imageUrl'), imagePostId: fields.get('imagePostId'), url: kind === 'advertisement' ? fields.get('adUrl') : fields.get('url') })
      });
      if (response.sent > 0) {
        const statusText = response.failed ? ` ${lang === 'fa' ? `شکست: ${response.failed} (HTTP ${Object.keys(response.failureStatuses || {}).join(', ') || 'نامشخص'}).` : `Failed: ${response.failed} (HTTP ${Object.keys(response.failureStatuses || {}).join(', ') || 'unknown'}).`}` : '';
        setResult(lang === 'fa' ? `ارسال به ${response.sent} دستگاه پذیرفته شد.${statusText}` : `Accepted for ${response.sent} devices.${statusText}`);
        form.reset(); setKind('update');
      } else if (response.failed > 0) {
        const diagnostic = [...Object.keys(response.failureStatuses || {}).map((code) => `HTTP ${code}`), ...Object.keys(response.failureCodes || {})].join(', ') || (lang === 'fa' ? 'نامشخص' : 'unknown');
        setError(lang === 'fa' ? `ارسال به ${response.failed} دستگاه ناموفق بود (${diagnostic}). اتصال شبکه و اجازهٔ اعلان دستگاه‌ها را بررسی کن.` : `Delivery failed for ${response.failed} devices (${diagnostic}). Check network access and device notification permissions.`);
      } else if (response.removed > 0) {
        setError(lang === 'fa' ? `${response.removed} اشتراک منقضی بود و حذف شد. زنگ اعلان را روی دستگاه موردنظر خاموش و دوباره روشن کن.` : `${response.removed} subscriptions had expired and were removed. Turn notifications off and on again on the target device.`);
      } else {
        setResult(lang === 'fa' ? 'هنوز دستگاهی عضو اعلان‌ها نیست. زنگ بالای صفحه را در همین دستگاه فعال کن و دوباره بفرست.' : 'No device is subscribed yet. Enable the bell at the top of this page on this device, then send again.');
      }
    } catch (problem) { setError(problem.message); }
    finally { setBusy(false); }
  };
  return <section className="admin-card"><h2>{lang === 'fa' ? '\u0627\u0631\u0633\u0627\u0644 \u067e\u0648\u0634 \u0646\u0648\u062a\u06cc\u0641\u06cc\u06a9\u06cc\u0634\u0646' : 'Send a push notification'}</h2>
    <p>{lang === 'fa' ? 'اعلان به دستگاه‌هایی می‌رسد که زنگ بالای صفحه را فعال کرده باشند.' : 'Notifications go to devices that enabled the bell at the top of the page.'}</p>
    <form onSubmit={send}>
      <label className="field-label">{lang === 'fa' ? 'نوع اعلان' : 'Notification type'}<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="update">{lang === 'fa' ? 'اعلان عادی' : 'Site update'}</option><option value="advertisement">{lang === 'fa' ? 'تبلیغ' : 'Advertisement'}</option></select></label>
      <label className="field-label">{lang === 'fa' ? 'عنوان' : 'Title'}<input name="title" required maxLength="90" /></label>
      <label className="field-label">{lang === 'fa' ? 'متن اعلان' : 'Message'}<textarea name="body" required maxLength="240" rows="3" /></label>
      {kind === 'advertisement' ? <><label className="field-label">{lang === 'fa' ? 'لینک تصویر تبلیغ (اختیاری)' : 'Ad image URL (optional)'}<input name="imageUrl" type="text" inputMode="url" dir="ltr" placeholder="https://example.com/ad.jpg" /></label><label className="field-label">{lang === 'fa' ? 'لینک مقصد تبلیغ' : 'Ad destination URL'}<input name="adUrl" type="text" inputMode="url" dir="ltr" placeholder="https://example.com or example.com" required /></label></> : <><label className="field-label">{lang === 'fa' ? 'تصویر اعلان از پوستر کدام نوشته باشد؟' : 'Use the poster from which post?'}<select name="imagePostId" defaultValue={posterPosts[0]?.id || ''} required><option value="" disabled>{lang === 'fa' ? 'یک نوشتهٔ دارای پوستر انتخاب کن' : 'Select a post with a poster'}</option>{posterPosts.map((post) => <option key={post.id} value={post.id}>{localized(post.title, lang)}</option>)}</select></label><p className="field-hint">{lang === 'fa' ? 'همان تصویر اصلی که برای نوشته بارگذاری کرده‌ای در اعلان استفاده می‌شود.' : 'The selected post’s main poster image will be used in the notification.'}</p><label className="field-label">{lang === 'fa' ? 'صفحه‌ای که با کلیک باز می‌شود' : 'Page to open'}<select name="url" defaultValue="/blog"><option value="/blog">{lang === 'fa' ? 'صفحهٔ وبلاگ' : 'Blog home'}</option><option value="/projects">{lang === 'fa' ? 'صفحهٔ پروژه‌ها' : 'Projects page'}</option>{posts.filter((post) => post.published !== false).map((post) => <option key={post.id} value={`/blog/${encodeURIComponent(post.slug || post.id)}`}>{localized(post.title, lang)}</option>)}</select></label></>}
      <button className="button button-primary" disabled={busy}>{busy ? (lang === 'fa' ? 'در حال ارسال...' : 'Sending...') : (lang === 'fa' ? 'ارسال اعلان' : 'Send notification')}</button>
    </form>
    {result && <p className="success-text" role="status">{result}</p>}{error && <p className="error-text" role="alert">{error}</p>}
  </section>;
}
