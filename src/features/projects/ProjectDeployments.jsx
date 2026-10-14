/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react';
import SortableList from '../../components/ui/SortableList';
import './ProjectDeployments.css';
import { monitoredFetch } from '../../lib/diagnostics';

async function request(path, options = {}) {
  const response = await monitoredFetch(path, { credentials: 'same-origin', ...options }, 'projects');
  const result = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(result.error || 'The request failed.'), { status: response.status });
  return result;
}

export default function ProjectDeployments({ projects, lang, refresh }) {
  const [settings, setSettings] = useState({});
  const [busyId, setBusyId] = useState('');
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState('');
  const fa = lang === 'fa';
  useEffect(() => {
    setSettings((current) => {
      const next = { ...current };
      projects.forEach((project) => {
        next[project.id] = { subdomain: next[project.id]?.subdomain ?? project.demoSubdomain ?? '', port: next[project.id]?.port ?? project.containerPort ?? 3000, service: next[project.id]?.service ?? project.serviceName ?? '', position: String(projects.findIndex((item) => item.id === project.id)) };
      });
      return next;
    });
  }, [projects]);

  const update = (projectId, key, value) => setSettings((current) => ({ ...current, [projectId]: { ...current[projectId], [key]: value } }));
  const moveProject = async (projectId, index) => {
    const ordered = [...projects];
    const [selected] = ordered.splice(ordered.findIndex((item) => item.id === projectId), 1);
    ordered.splice(Math.max(0, Math.min(Number(index), ordered.length)), 0, selected);
    setBusyId(projectId);
    try { await request('/api/admin/projects/order', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: ordered.map((item) => item.id) }) }); await refresh(); }
    catch (error) { setErrors((current) => ({ ...current, [projectId]: error.message })); }
    finally { setBusyId(''); }
  };
  const saveOrder = async (ids) => {
    try { await request('/api/admin/projects/order', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) }); await refresh(); return true; }
    catch (error) { setErrors((current) => ({ ...current, order: error.message })); return false; }
  };

  const manage = async (event, project, action) => {
    event?.preventDefault();
    const form = event?.currentTarget?.tagName === 'FORM' ? event.currentTarget : null;
    const fields = form ? new FormData(form) : null;
    const source = fields?.get('source');
    setBusyId(project.id);
    setErrors((current) => ({ ...current, [project.id]: '' }));
    try {
      if (action === 'stop') {
        await request(`/api/admin/projects/${encodeURIComponent(project.id)}/stop`, { method: 'POST' });
      } else if (action === 'delete') {
        await request(`/api/admin/projects/${encodeURIComponent(project.id)}/deployment`, { method: 'DELETE' });
        setEditingId('');
      } else {
        const config = settings[project.id] || {};
        await request(`/api/admin/projects/${encodeURIComponent(project.id)}/config`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ demoSubdomain: config.subdomain, containerPort: config.port, serviceName: config.service })
        });
        if (source?.size) await request(`/api/admin/projects/${encodeURIComponent(project.id)}/source`, { method: 'POST', headers: { 'Content-Type': 'application/zip' }, body: source });
        await request(`/api/admin/projects/${encodeURIComponent(project.id)}/deploy`, { method: 'POST' });
        form?.reset();
      }
      await refresh();
    } catch (error) {
      setErrors((current) => ({ ...current, [project.id]: error.message }));
      await refresh();
    } finally { setBusyId(''); }
  };

  return <section className="admin-card admin-wide deployment-manager">
    <div className="admin-section-title"><h2>{fa ? 'دموساز محلی' : 'Local demo deployer'}</h2><span className="deployment-badge">Docker</span></div>
    <p>{fa ? 'هر پروژه را از نوار فشرده مدیریت کن. برای تنظیمات یا بارگذاری ZIP، ویرایش را بزن.' : 'Manage each project from its compact row. Choose Edit to change settings or upload a ZIP.'}</p>
    {!projects.length && <p>{fa ? 'اول پروژه را در بخش مدیریت پروژه‌ها ثبت کن.' : 'Save a project in Project Management first.'}</p>}
    <SortableList items={projects} lang={lang} busy={Boolean(busyId)} onReorder={saveOrder} renderItem={(project) => {
      const index = projects.findIndex((item) => item.id === project.id);
      const config = settings[project.id] || { subdomain: project.demoSubdomain || '', port: project.containerPort || 3000, service: project.serviceName || '', position: String(index) };
      const deployment = project.deployment;
      const active = deployment?.status === 'running';
      const statusText = active ? (fa ? 'فعال' : 'Active') : (fa ? 'غیرفعال' : 'Inactive');
      const previewUrl = config.subdomain ? `http://${config.subdomain}.localhost:5000` : '';
      const isEditing = editingId === project.id;
      return <article className={`deployment-project ${isEditing ? 'is-editing' : ''}`}>
        <div className="deployment-compact-row">
          <strong>{project.title?.[fa ? 'fa' : 'en'] || project.title?.fa || project.title?.en}</strong>
          {previewUrl && <a href={previewUrl} target="_blank" rel="noreferrer" dir="ltr">{previewUrl}</a>}
          <button type="button" className={`deployment-toggle ${active ? 'is-active' : ''}`} disabled={busyId === project.id || !deployment?.uploadedAt} onClick={(event) => manage(event, project, active ? 'stop' : 'deploy')} aria-pressed={active}>
            <span />{busyId === project.id ? (fa ? 'در حال انجام' : 'Working') : statusText}
          </button>
          <button type="button" className="deployment-icon-action" disabled={busyId === project.id} onClick={() => setEditingId(isEditing ? '' : project.id)}>{fa ? 'ویرایش' : 'Edit'}</button>
          <button type="button" className="deployment-delete" disabled={busyId === project.id || !deployment?.uploadedAt} onClick={(event) => manage(event, project, 'delete')} aria-label={fa ? 'حذف دمو' : 'Delete demo'} title={fa ? 'حذف دمو' : 'Delete demo'}>×</button>
        </div>
        {isEditing && <form className="deployment-form" onSubmit={(event) => manage(event, project, 'deploy')}>
          <label className="field-label">{fa ? 'زیر‌دامنهٔ دلخواه' : 'Your subdomain'}<div className="deployment-domain-field"><input required value={config.subdomain} onChange={(event) => update(project.id, 'subdomain', event.target.value.toLowerCase())} placeholder="bootstrap" pattern="[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,48}[a-zA-Z0-9])?" /><span dir="ltr">.localhost:5000</span></div></label>
          <label className="field-label">{fa ? 'جایگاه پروژه' : 'Project position'}<select value={config.position} onChange={(event) => { update(project.id, 'position', event.target.value); moveProject(project.id, event.target.value); }}>{projects.map((item, itemIndex) => <option key={item.id} value={itemIndex}>{fa ? `جایگاه ${itemIndex + 1} — ${item.title?.fa || ''}` : `Position ${itemIndex + 1} — ${item.title?.en || item.title?.fa || ''}`}</option>)}</select></label>
          <label className="field-label">{fa ? 'پورت برنامه داخل کانتینر' : 'Container app port'}<input type="number" min="1" max="65535" value={config.port} onChange={(event) => update(project.id, 'port', event.target.value)} required /></label>
          <label className="field-label">{fa ? 'نام سرویس Compose (اختیاری)' : 'Compose service (optional)'}<input value={config.service} onChange={(event) => update(project.id, 'service', event.target.value)} placeholder={fa ? 'تشخیص خودکار' : 'Auto-detect'} /></label>
          <label className="field-label deployment-source-field">{fa ? 'سورس پروژه (ZIP)' : 'Project source (ZIP)'}<input type="file" name="source" accept=".zip,application/zip" />{deployment?.uploadedAt && <small>{fa ? 'برای جایگزینی سورس، ZIP تازه انتخاب کن.' : 'Choose a new ZIP to replace the saved source.'}</small>}</label>
          <div className="deployment-actions"><button className="button button-primary" disabled={busyId === project.id}>{busyId === project.id ? (fa ? 'در حال ساخت و اجرا…' : 'Building…') : (fa ? 'ذخیره تنظیمات و اجرا' : 'Save settings and deploy')}</button>{errors[project.id] && <p className="error-text" role="alert">{errors[project.id]}</p>}{!errors[project.id] && deployment?.error && deployment.status === 'failed' && <p className="error-text" role="alert">{deployment.error}</p>}</div>
        </form>}
        {!isEditing && errors[project.id] && <p className="error-text" role="alert">{errors[project.id]}</p>}
      </article>;
    }} />
    {errors.order && <p className="error-text" role="alert">{errors.order}</p>}
    <p className="field-hint">{fa ? 'سایت استاتیک بدون Docker اجرا می‌شود؛ پروژهٔ کانتینری به Docker Desktop نیاز دارد. سقف ZIP برابر ۱۵۰ مگابایت است.' : 'Static sites run without Docker; containerized projects need Docker Desktop. ZIP limit: 150 MB.'}</p>
  </section>;
}
