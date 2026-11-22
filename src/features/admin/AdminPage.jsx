/* eslint-disable react/prop-types */
import React, { lazy, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import AdaptiveLogo from '../../components/ui/AdaptiveLogo';
import { ArticleEditor } from '../editorial/Editorial';
import { reportClientIssue } from '../../lib/diagnostics';
import apiVersion from '../../lib/apiVersion';
const SortableList = lazy(() => import('../../components/ui/SortableList'));
const CareerAdmin = lazy(() => import('../career/CareerAdmin'));
const AdminAd = lazy(() => import('./AdminExtras').then((module) => ({ default: module.AdminAd })));
const AdminComments = lazy(() => import('./AdminExtras').then((module) => ({ default: module.AdminComments })));
const AdminMessages = lazy(() => import('./AdminExtras').then((module) => ({ default: module.AdminMessages })));
const AdminPush = lazy(() => import('./AdminExtras').then((module) => ({ default: module.AdminPush })));
const AdminNotices = lazy(() => import('./AdminNotices'));
export default function AdminPage({ t, lang, data, refresh, onCareerSaved, notify, unresolvedNoticeCount, setUnresolvedNoticeCount, api, uploadImage, localized, translatedError, skillLogos }) {
  const [status, setStatus] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('manage');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errorScope, setErrorScope] = useState('');
  const [savedScope, setSavedScope] = useState('');
  const [editingPost, setEditingPost] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [projectType, setProjectType] = useState('static');
  const [projectFormVersion, setProjectFormVersion] = useState(0);
  const [postCoverPreview, setPostCoverPreview] = useState('');
  const [projectImagePreview, setProjectImagePreview] = useState('');
  const [postFormVersion, setPostFormVersion] = useState(0);
  const [editingSkill, setEditingSkill] = useState(null);
  const unreadMessageCount = (data.messages || []).filter((message) => !message.read).length;
  const commentCount = (data.posts || []).reduce((total, post) => total + (Array.isArray(post.comments) ? post.comments.length : 0), 0);
  const inboxCount = unreadMessageCount + commentCount;
  const [editingSocial, setEditingSocial] = useState(null);
  const [skillFormVersion, setSkillFormVersion] = useState(0);
  const [socialFormVersion, setSocialFormVersion] = useState(0);
  const [skillPreview, setSkillPreview] = useState('');
  const [socialPreview, setSocialPreview] = useState('');
  const run = async (work, scope = '') => { setBusy(true); setError(''); setErrorScope(scope); setSavedScope(''); try { await work(); return true; } catch (problem) { if (problem.status === 401) setAuthenticated(false); if (!problem.status || problem.status >= 500) void reportClientIssue(scope || 'api', problem.message, window.location.pathname); const message = translatedError(problem, lang); setError(message); notify(message); return false; } finally { setBusy(false); } };
  const saveOrder = (kind, ids) => {
    if (busy) return Promise.resolve(false);
    return run(async () => {
      await api(`/api/admin/${kind}/order`, { method: 'PUT', body: JSON.stringify({ ids }) });
      await refresh();
      notify(lang === 'fa' ? 'ترتیب ذخیره شد.' : 'Order saved.');
    }, kind === 'skills' ? 'skill' : kind === 'socials' ? 'social' : kind === 'projects' ? 'project' : 'ad');
  };
  const loadStatus = useCallback(async () => { try { const setup = await api('/api/admin/status'); if (setup.apiVersion !== apiVersion) { setStatus({ outdated: true }); return; } const me = await api('/api/admin/me').catch(() => ({ authenticated: false })); setStatus(setup); setAuthenticated(me.authenticated); if (me.authenticated) await refresh(); } catch { setStatus({ unavailable: true }); } }, [api, refresh]);
  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => { if (!authenticated) return undefined; window.addEventListener('focus', loadStatus); return () => window.removeEventListener('focus', loadStatus); }, [authenticated, loadStatus]);
  useEffect(() => { if (!authenticated) return undefined; const timer = window.setInterval(refresh, 30000); return () => window.clearInterval(timer); }, [authenticated, refresh]);
  useEffect(() => { const expire = () => setAuthenticated(false); window.addEventListener('portfolio-auth-expired', expire); return () => window.removeEventListener('portfolio-auth-expired', expire); }, []);
  useEffect(() => { if (skillPreview) return () => URL.revokeObjectURL(skillPreview); }, [skillPreview]);
  useEffect(() => { if (socialPreview) return () => URL.revokeObjectURL(socialPreview); }, [socialPreview]);
  useEffect(() => { if (postCoverPreview) return () => URL.revokeObjectURL(postCoverPreview); }, [postCoverPreview]);
  useEffect(() => { if (projectImagePreview) return () => URL.revokeObjectURL(projectImagePreview); }, [projectImagePreview]);
  const formAction = (event, endpoint, transform = (form) => Object.fromEntries(new FormData(form).entries())) => { event.preventDefault(); const form = event.currentTarget; const payload = transform(form); run(async () => { await api(endpoint, { method: 'POST', body: JSON.stringify(payload) }); form.reset(); if (endpoint === '/api/admin/setup' || endpoint === '/api/admin/login') { setAuthenticated(true); await refresh(); } if (endpoint === '/api/admin/posts' || endpoint === '/api/admin/projects' || endpoint === '/api/admin/skills') await refresh(); notify(lang === 'fa' ? 'تغییرات ذخیره شد.' : 'Changes saved.'); }); };
  const remove = (endpoint) => run(async () => { await api(endpoint, { method: 'DELETE' }); await refresh(); });
  const saveProject = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const payload = Object.fromEntries(fields.entries());
    payload.skillsUsed = fields.getAll('skillsUsed');
    payload.featured = fields.get('featured') === 'on';
    const position = payload.position;
    delete payload.position;
    const imageFile = fields.get('imageFile');
    delete payload.imageFile;
    const shouldDeploy = Boolean(payload.repoUrl && payload.demoSubdomain && (!editingProject || editingProject.demoEnabled || editingProject.deployment?.status === 'running'));
    run(async () => {
      if (imageFile?.size) payload.image = await uploadImage(imageFile, 'project-image');
      const savedProject = await api(editingProject ? `/api/admin/projects/${encodeURIComponent(editingProject.id)}` : '/api/admin/projects', { method: editingProject ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      const ordered = data.projects.filter((item) => item.id !== savedProject.id);
      const insertAt = position === 'first' ? 0 : Math.max(0, ordered.findIndex((item) => item.id === position) + 1);
      ordered.splice(insertAt, 0, savedProject);
      await api('/api/admin/projects/order', { method: 'PUT', body: JSON.stringify({ ids: ordered.map((item) => item.id) }) });
      let deploymentError = '';
      if (shouldDeploy) {
        try { await api(`/api/admin/projects/${encodeURIComponent(savedProject.id)}/deploy`, { method: 'POST', body: '{}' }); }
        catch (problem) { deploymentError = problem.message; }
      }
      setEditingProject(null);
      setProjectType('static');
      setProjectImagePreview('');
      setProjectFormVersion((version) => version + 1);
      await refresh();
      notify(deploymentError ? (lang === 'fa' ? `\u067E\u0631\u0648\u0698\u0647 \u062B\u0628\u062A \u0634\u062F\u060C \u0627\u0645\u0627 \u0633\u0627\u062E\u062A \u062F\u0645\u0648 \u0646\u0627\u0645\u0648\u0641\u0642 \u0628\u0648\u062F: ${deploymentError}` : `Project saved, but demo deployment failed: ${deploymentError}`) : savedProject.translationStatus === 'pending' ? (lang === 'fa' ? `\u067E\u0631\u0648\u0698\u0647 \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F\u061B \u062A\u0631\u062C\u0645\u0647 \u0627\u0646\u06AF\u0644\u06CC\u0633\u06CC \u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631 \u0627\u0633\u062A.` : 'Project saved; English translation is pending.') : (lang === 'fa' ? (shouldDeploy ? `\u067E\u0631\u0648\u0698\u0647 \u062B\u0628\u062A \u0648 \u062F\u0645\u0648\u06CC \u0622\u0646 \u0641\u0639\u0627\u0644 \u0634\u062F.` : `\u067E\u0631\u0648\u0698\u0647 \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F.`) : (shouldDeploy ? 'Project saved and its demo is active.' : 'Project saved.')));
    });
  };
  const toggleProjectDemo = (project) => run(async () => {
    const isActive = project.demoEnabled || project.deployment?.status === 'running' || project.deployment?.status === 'building';
    const endpoint = `/api/admin/projects/${encodeURIComponent(project.id)}/${isActive ? 'stop' : 'deploy'}`;
    await api(endpoint, { method: 'POST', body: '{}' });
    await refresh();
    notify(lang === 'fa' ? (isActive ? '\u062F\u0645\u0648 \u063A\u06CC\u0631\u0641\u0639\u0627\u0644 \u0634\u062F.' : '\u062F\u0645\u0648 \u0641\u0639\u0627\u0644 \u0634\u062F.') : (isActive ? 'Demo disabled.' : 'Demo enabled.'));
  });
  const savePost = (event) => {
    event.preventDefault();
      const form = event.currentTarget;
    if (form.querySelector('.editor-upload input:disabled')) { notify(lang === 'fa' ? 'صبر کن تا بارگذاری تصویر تمام شود.' : 'Wait for the image upload to finish.'); return; }
    const fields = new FormData(form);
    const payload = Object.fromEntries(fields.entries());
    const coverFile = fields.get('coverFile');
    const endpoint = editingPost ? `/api/admin/posts/${encodeURIComponent(editingPost.id)}` : '/api/admin/posts';
    run(async () => {
      if (coverFile?.size) payload.image = await uploadImage(coverFile, 'post-image');
      if (!payload.image) throw new Error(lang === 'fa' ? 'برای هر نوشته یک پوستر انتخاب یا بارگذاری کن.' : 'Choose or upload a poster for this post.');
      const savedPost = await api(endpoint, { method: editingPost ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      setEditingPost(null);
      setPostCoverPreview('');
      setPostFormVersion((version) => version + 1);
      await refresh();
      notify(savedPost.translationStatus === 'pending'
        ? (lang === 'fa' ? 'نوشته ذخیره شد؛ ترجمهٔ انگلیسی در انتظار است. برای تلاش دوباره، نوشته را ویرایش و ذخیره کن.' : 'Post saved; English translation is pending. Edit and save again to retry.')
        : (lang === 'fa' ? 'نوشته ذخیره شد.' : 'Post saved.'));
    });
  };
  const saveSkill = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const file = fields.get('logoFile');
    run(async () => {
      const iconUrl = file?.size ? await uploadImage(file, 'skill-logo') : String(fields.get('iconUrl') || '').trim();
      if (!iconUrl) throw new Error(lang === 'fa' ? 'یک لوگو بارگذاری کن یا لینک مستقیم تصویر بده.' : 'Upload a logo or enter a direct image URL.');
      const endpoint = editingSkill ? `/api/admin/skills/${encodeURIComponent(editingSkill.id)}` : '/api/admin/skills';
      await api(endpoint, { method: editingSkill ? 'PUT' : 'POST', body: JSON.stringify({ name: fields.get('name'), iconUrl }) });
      setEditingSkill(null); setSkillPreview(''); setSkillFormVersion((version) => version + 1); form.reset(); await refresh(); setSavedScope('skill'); notify(lang === 'fa' ? 'مهارت ذخیره شد.' : 'Skill saved.');
    }, 'skill');
  };
  const saveSocial = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const file = fields.get('logoFile');
    run(async () => {
      const iconUrl = file?.size ? await uploadImage(file, 'social-logo') : String(fields.get('iconUrl') || '').trim();
      if (!iconUrl) throw new Error(lang === 'fa' ? 'لوگوی شبکه را بارگذاری کن یا لینک مستقیم تصویر بده.' : 'Upload an icon or enter a direct image URL.');
      const endpoint = editingSocial ? `/api/admin/socials/${encodeURIComponent(editingSocial.id)}` : '/api/admin/socials';
      await api(endpoint, { method: editingSocial ? 'PUT' : 'POST', body: JSON.stringify({ href: fields.get('href'), iconUrl }) });
      form.reset(); setSocialPreview(''); setEditingSocial(null); setSocialFormVersion((version) => version + 1); await refresh(); setSavedScope('social'); notify(lang === 'fa' ? 'پیوند شبکه اجتماعی ذخیره شد.' : 'Social link saved.');
    }, 'social');
  };
  const postLabels = lang === 'fa'
    ? { title: 'عنوان فارسی', excerpt: 'خلاصه فارسی', body: 'متن فارسی', tags: 'هشتگ‌ها', translation: 'ترجمهٔ انگلیسی با سرویس محلی ساخته می‌شود؛ اگر سرویس خاموش باشد، متن فارسی ذخیره و ترجمه در ویرایش بعدی دوباره امتحان می‌شود.' }
    : { title: 'Persian title', excerpt: 'Persian summary', body: 'Persian article', tags: 'Hashtags', translation: 'English is generated by a local translation service. If it is offline, Persian is saved and translation can be retried by editing and saving again.' };
  if (!status) return <main className="admin-main"><p>{t.loading}</p></main>;
  if (status.unavailable) return <main className="admin-main"><div className="admin-card"><h1>{t.admin}</h1><p>{lang === 'fa' ? 'سرور مدیریت در دسترس نیست. طبق README، API را اجرا کن.' : 'The admin API is not running. Start the API as described in the README.'}</p></div></main>;
  if (status.outdated) return <main className="admin-main"><div className="admin-card"><h1>{t.admin}</h1><p role="alert">{lang === 'fa' ? 'نسخهٔ قدیمی سرور مدیریت هنوز در حال اجراست. ترمینال‌های قبلی سایت و API را متوقف کن، سپس npm start را اجرا و صفحه را تازه‌سازی کن.' : 'An older admin API is still running. Stop the previous website and API processes, run npm start, and refresh this page.'}</p></div></main>;
  if (!authenticated) return <main className="admin-main"><form className="admin-card auth-card" onSubmit={(event) => formAction(event, status.configured ? '/api/admin/login' : '/api/admin/setup')}><Link to="/" className="back-link">{lang === 'fa' ? 'بازگشت به سایت' : 'Back to site'}</Link><span className="eyebrow">SECURE AREA</span><h1>{status.configured ? t.loginTitle : t.setupTitle}</h1><p>{status.configured ? (lang === 'fa' ? 'برای مدیریت محتوا وارد حساب خودت شو.' : 'Sign in to manage your portfolio content.') : t.setupHelp}</p>{!status.configured && <Field label={t.setupKey} name="setupKey" type="password" required autoComplete="off" />}<Field label={t.username} name="username" required autoComplete="username" minLength="3" maxLength="32" /><Field label={t.password} name="password" type="password" required autoComplete={status.configured ? 'current-password' : 'new-password'} minLength="12" /><button className="button button-primary" disabled={busy}>{status.configured ? t.login : t.createAdmin}</button>{!status.configured && !status.setupAvailable && <p className="field-hint">{t.setupMissing}</p>}{error && <p className="error-text" role="alert">{error}</p>}</form></main>;
  return <main className="admin-main">
    <div className="admin-heading"><div><span className="eyebrow">SECURE AREA</span><h1>{t.panel}</h1></div><button className="button button-outline" onClick={() => run(async () => { await api('/api/admin/logout', { method: 'POST', body: '{}' }); setAuthenticated(false); await refresh(); await loadStatus(); })}>{t.logout}</button></div>
    <div className="admin-tabs" role="tablist" aria-label={lang === 'fa' ? 'بخش‌های پنل مدیریت' : 'Admin sections'}>
      {[['manage', lang === 'fa' ? '\u0645\u0647\u0627\u0631\u062A\u200C\u0647\u0627\u060C \u0634\u0628\u06A9\u0647\u200C\u0647\u0627\u06CC \u0627\u062C\u062A\u0645\u0627\u0639\u06CC \u0648 \u062F\u0645\u0648\u0633\u0627\u0632' : 'Skills, social links & demo builder'], ['projects', lang === 'fa' ? '\u0627\u0641\u0632\u0648\u062F\u0646 \u067E\u0631\u0648\u0698\u0647' : 'Add project'], ['posts', lang === 'fa' ? 'انتشار نوشته' : 'Publish posts'], ['inbox', lang === 'fa' ? 'تماس‌ها و دیدگاه‌ها' : 'Messages & comments'], ['promotion', lang === 'fa' ? 'تبلیغات و پوش نوتیف' : 'Ads & push notifications'], ['notices', lang === 'fa' ? 'گزارش خطاها' : 'Issue reports']].map(([tab, label]) => {
        const count = tab === 'notices' ? unresolvedNoticeCount : tab === 'inbox' ? inboxCount : 0;
        return <button key={tab} role="tab" aria-selected={activeTab === tab} aria-label={count ? `${label}: ${count}` : label} className={`${activeTab === tab ? 'is-active' : ''}${count ? ' has-notices' : ''}`} onClick={() => setActiveTab(tab)}>{count > 0 && <span className="admin-tab-count" aria-hidden="true">{count > 99 ? '99+' : count}</span>}{label}</button>;
      })}
    </div>
    {activeTab === 'manage' && <div className="admin-grid">
      <section className="admin-card"><div className="admin-section-title"><h2>{editingSkill ? (lang === 'fa' ? 'ویرایش مهارت' : 'Edit skill') : t.addSkill}</h2>{editingSkill && <button className="text-link" type="button" onClick={() => { setEditingSkill(null); setSkillPreview(''); }}>{lang === 'fa' ? 'لغو ویرایش' : 'Cancel edit'}</button>}</div><form key={`${editingSkill?.id || 'new-skill'}-${skillFormVersion}`} onSubmit={saveSkill}><Field label={t.skillName} name="name" required maxLength="40" defaultValue={editingSkill?.name || ''} /><ImageUrlField key={`${editingSkill?.id || 'new-skill-url'}-${skillFormVersion}`} label={lang === 'fa' ? 'لینک مستقیم تصویر لوگو (اختیاری)' : 'Direct logo image URL (optional)'} name="iconUrl" placeholder="https://.../logo.png" defaultValue={editingSkill?.iconUrl || ''} lang={lang} /><ImageUpload lang={lang} preview={skillPreview} setPreview={setSkillPreview} /><button className="button button-primary" disabled={busy}>{busy ? (lang === 'fa' ? 'در حال بارگذاری و ذخیره...' : 'Uploading and saving...') : editingSkill ? (lang === 'fa' ? 'ذخیره تغییرات' : 'Save changes') : t.add}</button>{error && errorScope === 'skill' && <p className="error-text" role="alert">{error}</p>}{savedScope === 'skill' && <p className="success-text" role="status">{lang === 'fa' ? 'مهارت ثبت شد و در فهرست پایین دیده می‌شود.' : 'Skill saved and shown in the list below.'}</p>}</form><SortableList items={data.skills} lang={lang} busy={busy} onReorder={(ids) => saveOrder('skills', ids)} renderItem={(skill) => <><span className="admin-skill"><AdaptiveLogo src={skill.iconUrl || skillLogos[skill.name]} alt="" />{skill.name}</span><span className="post-admin-actions"><button className="edit-action" onClick={() => setEditingSkill(skill)}>{lang === 'fa' ? 'ویرایش' : 'Edit'}</button><button onClick={() => remove(`/api/admin/skills/${encodeURIComponent(skill.id)}`)} aria-label={t.delete}>×</button></span></>} /></section>
      <section className="admin-card"><div className="admin-section-title"><h2>{lang === 'fa' ? 'پیوندهای شبکه‌های اجتماعی' : 'Social links'}</h2>{editingSocial && <button className="text-link" type="button" onClick={() => setEditingSocial(null)}>{lang === 'fa' ? 'لغو ویرایش' : 'Cancel edit'}</button>}</div><form key={`${editingSocial?.id || 'new-social'}-${socialFormVersion}`} onSubmit={saveSocial}><Field label={lang === 'fa' ? 'آدرس صفحه' : 'Profile URL'} name="href" type="text" required placeholder="https://..." defaultValue={editingSocial?.href || ''} /><ImageUrlField key={`${editingSocial?.id || 'new-social-url'}-${socialFormVersion}`} label={lang === 'fa' ? 'لینک مستقیم تصویر لوگو (اختیاری)' : 'Direct icon image URL (optional)'} name="iconUrl" type="text" placeholder="https://.../icon.png" defaultValue={editingSocial?.iconUrl || ''} lang={lang} /><ImageUpload lang={lang} preview={socialPreview} setPreview={setSocialPreview} /><button className="button button-primary" disabled={busy}>{busy ? (lang === 'fa' ? 'در حال بارگذاری و ذخیره...' : 'Uploading and saving...') : editingSocial ? (lang === 'fa' ? 'ذخیره تغییرات' : 'Save changes') : (lang === 'fa' ? 'افزودن پیوند' : 'Add link')}</button>{error && errorScope === 'social' && <p className="error-text" role="alert">{error}</p>}{savedScope === 'social' && <p className="success-text" role="status">{lang === 'fa' ? 'پیوند ثبت شد و در فهرست پایین دیده می‌شود.' : 'Link saved and shown in the list below.'}</p>}</form><SortableList items={data.socials} lang={lang} busy={busy} onReorder={(ids) => saveOrder('socials', ids)} renderItem={(account) => <><span className="admin-social"><AdaptiveLogo src={account.iconUrl} alt="" /><span dir="ltr">{account.href}</span></span><span className="post-admin-actions"><button className="edit-action" onClick={() => setEditingSocial(account)}>{lang === 'fa' ? 'ویرایش' : 'Edit'}</button><button onClick={() => remove(`/api/admin/socials/${encodeURIComponent(account.id)}`)} aria-label={t.delete}>×</button></span></>} /></section>
      <CareerAdmin career={data.career} skills={data.skills} lang={lang} onCareerSaved={onCareerSaved} notify={notify} />
      <section className="admin-card admin-wide" id="resume-management"><h2>{t.uploadResume}</h2><p>{data.resume || t.noResume}</p><form onSubmit={(event) => { event.preventDefault(); const file = event.currentTarget.elements.resume.files[0]; if (!file) return; run(async () => { const response = await fetch('/api/admin/resume', { method: 'POST', body: file, headers: { 'Content-Type': 'application/pdf', 'X-File-Name': file.name }, credentials: 'same-origin' }); const result = await response.json(); if (!response.ok) throw Object.assign(new Error(result.error || 'Upload failed'), { status: response.status }); await refresh(); notify(lang === 'fa' ? 'رزومه بارگذاری شد.' : 'Résumé uploaded.'); }); }}><input type="file" name="resume" accept="application/pdf,.pdf" required /><button className="button button-primary" disabled={busy}>{lang === 'fa' ? 'بارگذاری' : 'Upload'}</button></form></section>

    </div>}
    {activeTab === 'projects' && <div className="admin-grid admin-single">
<section className="admin-card"><div className="admin-section-title"><h2>{editingProject ? (lang === 'fa' ? 'ویرایش پروژه' : 'Edit project') : t.newProject}</h2>{editingProject && <button className="text-link" type="button" onClick={() => { setEditingProject(null); setProjectType('static'); setProjectImagePreview(''); setProjectFormVersion((version) => version + 1); }}>{lang === 'fa' ? 'لغو ویرایش' : 'Cancel edit'}</button>}</div><p className="field-hint">{lang === 'fa' ? 'عنوان و توضیحات را فارسی بنویس؛ نسخهٔ انگلیسی با مترجم محلی ساخته می‌شود.' : 'Write the title and description in Persian; the local translation service creates the English version.'}</p><form key={`${editingProject?.id || 'new-project'}-${projectFormVersion}`} onSubmit={saveProject}><Field label={t.titleFa} name="titleFa" required maxLength="160" defaultValue={localized(editingProject?.title, 'fa')} /><Field label={t.descriptionFa} name="descriptionFa" required maxLength="800" multiline defaultValue={localized(editingProject?.description, 'fa')} /><ProjectSkillsField skills={data.skills} selectedSkills={editingProject?.skillsUsed || []} lang={lang} /><ProjectImageFields lang={lang} defaultValue={editingProject?.image || ''} preview={projectImagePreview} setPreview={setProjectImagePreview} /><label className="checkbox-label project-featured-toggle"><input type="checkbox" name="featured" defaultChecked={editingProject ? editingProject.featured !== false : false} />{lang === 'fa' ? '\u0646\u0645\u0627\u06CC\u0634 \u0628\u0647\u200C\u0639\u0646\u0648\u0627\u0646 \u067E\u0631\u0648\u0698\u0647\u0654 \u0645\u0646\u062A\u062E\u0628' : 'Show as a featured project'}</label><Field label={t.demoUrl} name="demoUrl" type="url" placeholder="https://..." defaultValue={editingProject?.demoUrl || ''} /><Field label={t.repoUrl} name="repoUrl" type="url" placeholder="https://github.com/owner/repository" defaultValue={editingProject?.repoUrl || ''} /><p className="field-hint">{lang === 'fa' ? '\u0628\u0627 \u0648\u0627\u0631\u062F\u06A9\u0631\u062F\u0646 \u0644\u06CC\u0646\u06A9 GitHub \u0648 \u0632\u06CC\u0631\u062F\u0627\u0645\u0646\u0647\u060C \u0628\u0627 \u062B\u0628\u062A \u067E\u0631\u0648\u0698\u0647 \u062F\u0645\u0648 \u062E\u0648\u062F\u06A9\u0627\u0631 \u0633\u0627\u062E\u062A\u0647 \u0648 \u0641\u0639\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u062F.' : 'Add a GitHub repository and subdomain to build and activate the demo automatically when you save the project.'}</p><label className="field-label">{lang === 'fa' ? '\u0646\u0648\u0639 \u067E\u0631\u0648\u0698\u0647' : 'Project type'}<select name="projectType" value={projectType} onChange={(event) => setProjectType(event.target.value)}><option value="static">{lang === 'fa' ? '\u0627\u0633\u062A\u0627\u062A\u06CC\u06A9 \u06CC\u0627 \u0633\u0627\u06CC\u062A \u062B\u0627\u0628\u062A' : 'Static site'}</option><option value="dynamic">{lang === 'fa' ? '\u062F\u0627\u06CC\u0646\u0627\u0645\u06CC\u06A9 \u06CC\u0627 \u0628\u06A9\u0646\u062F' : 'Dynamic app'}</option></select></label><p className="field-hint">{projectType === 'static' ? (lang === 'fa' ? '\u0633\u0627\u06CC\u062A \u0627\u0633\u062A\u0627\u062A\u06CC\u06A9 \u0628\u0627 \u0641\u0627\u06CC\u0644 index.html \u062F\u0631 \u0631\u06CC\u0634\u0647 \u06CC\u0627 \u067E\u0648\u0634\u0647 dist\u060C build \u06CC\u0627 out \u0627\u062C\u0631\u0627 \u0645\u06CC\u200C\u0634\u0648\u062F\u061B \u0628\u062F\u0648\u0646 Docker.' : 'Static sites serve index.html from the root, dist, build or out folder; Docker is not used.') : (lang === 'fa' ? '\u0628\u0631\u0627\u06CC \u0627\u067E \u062F\u0627\u06CC\u0646\u0627\u0645\u06CC\u06A9 \u0641\u0627\u06CC\u0644 Dockerfile \u06CC\u0627 Docker Compose \u0644\u0627\u0632\u0645 \u0627\u0633\u062A.' : 'Dynamic apps require a Dockerfile or Docker Compose file.')}</p><div className="form-columns"><Field label={lang === 'fa' ? '\u0632\u06CC\u0631\u062F\u0627\u0645\u0646\u0647\u0654 \u062F\u0645\u0648' : 'Demo subdomain'} name="demoSubdomain" placeholder="my-project" defaultValue={editingProject?.demoSubdomain || ''} /><Field label={lang === 'fa' ? '\u0634\u0627\u062E\u0647\u0654 GitHub (\u0627\u062E\u062A\u06CC\u0627\u0631\u06CC)' : 'GitHub branch (optional)'} name="demoBranch" placeholder="main" defaultValue={editingProject?.demoBranch || ''} /></div><div className="form-columns"><Field label={lang === 'fa' ? '\u067E\u0648\u0631\u062A \u0628\u0631\u0646\u0627\u0645\u0647 (Docker)' : 'App port (Docker)'} name="containerPort" type="number" defaultValue={editingProject?.containerPort || 3000} disabled={projectType === 'static'} /><Field label={lang === 'fa' ? '\u0646\u0627\u0645 \u0633\u0631\u0648\u06CC\u0633 Compose (\u0627\u062E\u062A\u06CC\u0627\u0631\u06CC)' : 'Compose service name (optional)'} name="serviceName" defaultValue={editingProject?.serviceName || ''} disabled={projectType === 'static'} /></div><label className="field-label">{lang === 'fa' ? 'جایگاه نمایش پروژه' : 'Project position'}<select name="position" defaultValue={editingProject ? (data.projects[data.projects.findIndex((item) => item.id === editingProject.id) - 1]?.id || 'first') : 'first'}><option value="first">{lang === 'fa' ? 'ابتدای فهرست' : 'At the top'}</option>{data.projects.filter((item) => item.id !== editingProject?.id).map((item) => <option key={item.id} value={item.id}>{lang === 'fa' ? `بعد از ${localized(item.title, 'fa')}` : `After ${localized(item.title, 'en')}`}</option>)}</select></label><button className="button button-primary" disabled={busy}>{editingProject ? (lang === 'fa' ? 'ذخیره تغییرات' : 'Save changes') : t.addProject}</button></form><SortableList items={data.projects} lang={lang} busy={busy} onReorder={(ids) => saveOrder("projects", ids)} renderItem={(project) => <><span>{localized(project.title, lang)}{project.translationStatus === 'pending' && <small>{lang === 'fa' ? 'ترجمهٔ انگلیسی در انتظار' : 'English translation pending'}</small>}{project.deployment && <><small>{project.deployment.status === 'running' ? (lang === 'fa' ? '\u062F\u0645\u0648 \u0641\u0639\u0627\u0644' : 'Demo active') : project.deployment.status === 'building' ? (lang === 'fa' ? '\u062F\u0631 \u062D\u0627\u0644 \u0633\u0627\u062E\u062A' : 'Building demo') : project.deployment.status === 'failed' ? (lang === 'fa' ? '\u0633\u0627\u062E\u062A \u062F\u0645\u0648 \u0646\u0627\u0645\u0648\u0641\u0642' : 'Demo failed') : (lang === 'fa' ? '\u062F\u0645\u0648 \u063A\u06CC\u0631\u0641\u0639\u0627\u0644' : 'Demo inactive')}</small>{project.deployment.status === 'failed' && project.deployment.error && <small className="project-deployment-error">{project.deployment.error}</small>}</>}</span><span className="post-admin-actions"><button className={`demo-toggle-action ${project.demoEnabled || project.deployment?.status === "running" ? "is-active" : ""}`} type="button" aria-pressed={Boolean(project.demoEnabled || project.deployment?.status === "running")} disabled={busy || (!(project.demoEnabled || project.deployment?.status === "running") && (!project.repoUrl || !project.demoSubdomain))} onClick={() => toggleProjectDemo(project)}>{project.demoEnabled || project.deployment?.status === "running" ? (lang === "fa" ? "\u063A\u06CC\u0631\u0641\u0639\u0627\u0644" : "Disable") : (lang === "fa" ? "\u0641\u0639\u0627\u0644" : "Enable")}</button><button className="edit-action" type="button" disabled={busy} onClick={() => { setEditingProject(project); setProjectType(project.projectType || (project.deployment?.runtimeKind === 'static' ? 'static' : 'dynamic')); setProjectImagePreview(''); setProjectFormVersion((version) => version + 1); }}>{lang === 'fa' ? 'ویرایش' : 'Edit'}</button><button className="delete-action" type="button" disabled={busy} onClick={() => remove(`/api/admin/projects/${encodeURIComponent(project.id)}`)} aria-label={t.delete}>×</button></span></>} /></section>
    </div>}
    {activeTab === 'posts' && <div className="admin-grid"><section className="admin-card admin-wide" id="post-management"><div className="admin-section-title"><h2>{editingPost ? (lang === 'fa' ? 'ویرایش نوشته' : 'Edit post') : t.newPost}</h2>{editingPost && <button className="text-link" type="button" onClick={() => { setEditingPost(null); setPostCoverPreview(''); }}>{lang === 'fa' ? 'لغو ویرایش' : 'Cancel edit'}</button>}</div>
        <form key={`${editingPost?.id || 'new-post'}-${postFormVersion}`} onSubmit={savePost}>
          <div className="form-columns"><Field label={postLabels.title} name="title" dir="rtl" required maxLength="160" defaultValue={localized(editingPost?.title, 'fa')} /><Field label={postLabels.excerpt} name="excerpt" dir="rtl" required maxLength="500" defaultValue={localized(editingPost?.excerpt, 'fa')} /></div>
          <ArticleEditor label={postLabels.body} name="body" lang="fa" defaultValue={localized(editingPost?.body, 'fa')} onUpload={(file) => uploadImage(file, 'post-image')} />
          <Field label={postLabels.tags} name="tags" defaultValue={(editingPost?.tags?.fa || editingPost?.tags?.en || []).join(', ')} placeholder="#design, #React" />
          <PostCoverField lang={lang} defaultValue={editingPost?.image || ''} preview={postCoverPreview} setPreview={setPostCoverPreview} />
          <p className="field-hint translation-hint">{postLabels.translation}</p>
          <label className="checkbox-label"><input type="checkbox" name="published" defaultChecked={editingPost ? editingPost.published : true} /> {lang === 'fa' ? '\u0627\u0646\u062a\u0634\u0627\u0631 \u0639\u0645\u0648\u0645\u06cc' : 'Publish publicly'}</label>
          <button className="button button-primary" disabled={busy}>{editingPost ? (lang === 'fa' ? '\u0630\u062e\u06cc\u0631\u0647 \u0648\u06cc\u0631\u0627\u06cc\u0634' : 'Save changes') : t.publish}</button>
        </form>
        <h3 className="admin-subheading">{lang === 'fa' ? 'مطالب منتشرشده و پیش‌نویس‌ها' : 'Published posts and drafts'}</h3><ul className="admin-list">{data.posts.map((post) => <li key={post.id}><span>{localized(post.title, lang)}{!post.published && <small>{lang === 'fa' ? 'پیش‌نویس' : 'Draft'}</small>}{post.translationStatus === 'pending' && <small>{lang === 'fa' ? 'ترجمهٔ انگلیسی در انتظار' : 'English translation pending'}</small>}</span><span className="post-admin-actions"><button className="edit-action" onClick={() => { setEditingPost(post); setPostCoverPreview(''); document.getElementById('post-management')?.scrollIntoView({ behavior: 'smooth' }); }}>{lang === 'fa' ? 'ویرایش' : 'Edit'}</button><button onClick={() => remove(`/api/admin/posts/${encodeURIComponent(post.id)}`)} aria-label={t.delete}>×</button></span></li>)}</ul>
      </section></div>}
    {activeTab === 'inbox' && <div className="admin-grid"><AdminMessages messages={data.messages || []} lang={lang} refresh={refresh} /><AdminComments posts={data.posts} lang={lang} refresh={refresh} /></div>}
    {activeTab === 'promotion' && <div className="admin-grid"><AdminAd ads={data.ads} lang={lang} refresh={refresh} uploadImage={uploadImage} /><AdminPush lang={lang} posts={data.posts} /></div>}
    {activeTab === 'notices' && <div className="admin-grid admin-single"><AdminNotices lang={lang} onCountChange={setUnresolvedNoticeCount} /></div>}
    {error && !errorScope && <p className="error-text" role="alert">{error}</p>}
  </main>;
}
function Field({ label, name, type = 'text', required = false, autoComplete, minLength, maxLength, multiline = false, defaultValue, placeholder, dir, disabled = false }) { const Tag = multiline ? 'textarea' : 'input'; return <label className="field-label">{label}<Tag name={name} type={multiline ? undefined : type} required={required} autoComplete={autoComplete} minLength={minLength} maxLength={maxLength} rows={multiline ? 4 : undefined} defaultValue={defaultValue} placeholder={placeholder} dir={dir} disabled={disabled} /></label>; }

function ProjectSkillsField({ skills = [], selectedSkills = [], lang }) {
  const selected = new Set(selectedSkills.map((skill) => typeof skill === 'string' ? skill : skill.id || skill.name));
  return <fieldset className="project-skills-picker">
    <legend>{lang === 'fa' ? 'تکنولوژی‌های استفاده‌شده در پروژه' : 'Technologies used in this project'}</legend>
    {!skills.length ? <p className="field-hint">{lang === 'fa' ? 'ابتدا مهارت‌ها را در بخش مدیریت مهارت اضافه کن.' : 'Add skills in the skills manager first.'}</p> : <div className="project-skills-options">{skills.map((skill) => <label className="project-skill-option" key={skill.id}>
      <input type="checkbox" name="skillsUsed" value={skill.id} defaultChecked={selected.has(skill.id) || selected.has(skill.name)} />
      {skill.iconUrl && <img src={skill.iconUrl} alt="" loading="lazy" />}
      <span>{skill.name}</span>
    </label>)}</div>}
  </fieldset>;
}

function ProjectImageFields({ lang, defaultValue = '', preview, setPreview }) {
  const [url, setUrl] = useState(defaultValue);
  return <div className="project-image-fields">
    <label className="field-label">{lang === 'fa' ? 'لینک مستقیم پوستر پروژه (اختیاری)' : 'Project cover image URL (optional)'}<input type="text" name="image" value={url} placeholder="https://.../cover.jpg" onChange={(event) => setUrl(event.target.value)} /></label>
    <label className="image-upload-label">{lang === 'fa' ? 'یا فایل پوستر را بارگذاری کن (PNG، JPG یا WebP؛ حداکثر ۳ مگابایت)' : 'Or upload a project cover (PNG, JPG or WebP; up to 3 MB)'}<input type="file" name="imageFile" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files[0]; setPreview(file ? URL.createObjectURL(file) : ''); }} /></label>
    {(preview || url) && <img className="project-image-preview" src={preview || url} alt={lang === 'fa' ? 'پیش‌نمایش پوستر پروژه' : 'Project cover preview'} />}
  </div>;
}

function ImageUrlField({ label, name, defaultValue = '', placeholder, lang }) {
  const [value, setValue] = useState(defaultValue);
  const [failed, setFailed] = useState(false);
  return <div className="image-url-wrap"><label className="field-label">{label}<input type="text" name={name} value={value} placeholder={placeholder} onChange={(event) => { setValue(event.target.value); setFailed(false); }} /></label>{value && (failed ? <small className="upload-hint">{lang === 'fa' ? 'پیش‌نمایش باز نشد. لینک ذخیره می‌شود، اما ممکن است لوگو نمایش داده نشود؛ می‌توانی فایل لوگو را بارگذاری کنی.' : 'Preview could not load. The link can be saved, but the logo may not display; you can upload the file instead.'}</small> : <img className="upload-preview" src={value} alt="Preview" onError={() => setFailed(true)} />)}</div>;
}

function ImageUpload({ lang, preview, setPreview }) {
  return <label className="image-upload-label">{lang === 'fa' ? 'یا فایل لوگو را بارگذاری کن (PNG، JPG، WebP یا SVG؛ حداکثر ۳ مگابایت)' : 'Or upload a logo (PNG, JPG, WebP or SVG; up to 3 MB)'}<input type="file" name="logoFile" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" onChange={(event) => { const file = event.target.files[0]; setPreview(file ? URL.createObjectURL(file) : ''); }} />{preview && <img className="upload-preview" src={preview} alt="" />}</label>;
}

function PostCoverField({ lang, defaultValue = '', preview, setPreview }) {
  const [url, setUrl] = useState(defaultValue);
  const [failed, setFailed] = useState(false);
  const source = preview || url;
  return <div className="post-cover-field"><label className="field-label">{lang === 'fa' ? 'پوستر نوشته (اجباری)' : 'Post poster (required)'}<input name="image" type="text" value={url} onChange={(event) => { setUrl(event.target.value); setFailed(false); }} placeholder="https://.../poster.jpg" /></label><label className="image-upload-label">{lang === 'fa' ? 'یا پوستر را بارگذاری کن (PNG، JPG یا WebP؛ حداکثر ۳ مگابایت؛ اندازه پیشنهادی ۱۲۰۰×۶۲۷)' : 'Or upload a poster (PNG, JPG or WebP; up to 3 MB; recommended size 1200 × 627 px)'}<input type="file" name="coverFile" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files[0]; setPreview(file ? URL.createObjectURL(file) : ''); setFailed(false); }} /></label>{source && !failed && <img className="post-cover-preview" src={source} alt="Poster preview" onError={() => setFailed(true)} />}{source && failed && <small className="upload-hint">{lang === 'fa' ? 'پیش‌نمایش پوستر بارگذاری نشد؛ لینک یا فایل را بررسی کن.' : 'Poster preview failed to load. Check the URL or upload a file.'}</small>}</div>;
}
