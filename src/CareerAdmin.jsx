/* eslint-disable react/prop-types */
import React, { useEffect, useRef, useState } from 'react';
import CalendarMonthInput from './CalendarMonthInput';
import { careerPeriod, careerText, normalizeCareer } from './career';
import { reportClientIssue } from './diagnostics';

const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const CAREER_DRAFT_KEY = 'portfolio-career-draft-v1';
function readCareerDraft() {
  try {
    const value = typeof window !== 'undefined' ? window.localStorage.getItem(CAREER_DRAFT_KEY) : null;
    return value ? normalizeCareer(JSON.parse(value)) : null;
  } catch (_) { return null; }
}

function CareerTechnologyPicker({ skills, selected = [], lang, onChange }) {
  const selectedIds = new Set(selected.map((technology) => typeof technology === 'string' ? technology : technology.id));
  const toggle = (skill, checked) => {
    const next = new Set(selectedIds);
    if (checked) next.add(skill.id);
    else next.delete(skill.id);
    onChange([...next]);
  };
  return <fieldset className="career-technology-picker">
    <legend>{lang === 'fa' ? 'تکنولوژی‌های استفاده‌شده در این موقعیت' : 'Technologies used in this position'}</legend>
    {skills.length ? <div className="project-skills-options">{skills.map((skill) => <label className="project-skill-option" key={skill.id}>
      <input type="checkbox" checked={selectedIds.has(skill.id)} onChange={(event) => toggle(skill, event.target.checked)} />
      {skill.iconUrl && <img src={skill.iconUrl} alt="" loading="lazy" />}
      <span>{skill.name}</span>
    </label>)}</div> : <p className="field-hint">{lang === 'fa' ? 'ابتدا مهارت‌ها را در بخش مدیریت مهارت اضافه کن.' : 'Add skills in the skills manager first.'}</p>}
  </fieldset>;
}
const emptyRole = () => ({ id: newId(), title: '', description: '', technologiesUsed: [], startDate: '', endDate: '', isCurrent: false });
const emptyCompany = () => ({ id: newId(), name: '', logoUrl: '', startDate: '', endDate: '', isCurrent: false, roles: [] });

async function saveCareer(career) {
  const response = await fetch('/api/admin/career', {
    method: 'PUT', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(career)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Could not save career history.');
  return result.career;
}

export default function CareerAdmin({ career: initialCareer, skills = [], lang, onCareerSaved, notify }) {
  const fa = lang === 'fa';
  const [career, setCareer] = useState(() => readCareerDraft() || normalizeCareer(initialCareer));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editingCompanyId, setEditingCompanyId] = useState('');
  const [editingRoleId, setEditingRoleId] = useState('');
  const [draftStatus, setDraftStatus] = useState(() => readCareerDraft() ? 'restored' : '');
  const firstCareerRender = useRef(true);
  const lastServerSaved = useRef(null);
  useEffect(() => {
    const draft = readCareerDraft();
    setCareer(draft || normalizeCareer(initialCareer));
    if (draft) setDraftStatus('restored');
  }, [initialCareer]);
  useEffect(() => {
    if (firstCareerRender.current) { firstCareerRender.current = false; return; }
    const serialized = JSON.stringify(normalizeCareer(career));
    if (lastServerSaved.current === serialized) {
      try { window.localStorage.removeItem(CAREER_DRAFT_KEY); } catch (_) { /* No local draft remains to clear. */ }
      setDraftStatus('');
      return;
    }
    try {
      window.localStorage.setItem(CAREER_DRAFT_KEY, JSON.stringify(career));
      setDraftStatus('saved');
    } catch (_) { setDraftStatus('unavailable'); }
  }, [career]);
  const patchCompany = (companyIndex, patch) => setCareer((current) => ({ ...current, companies: current.companies.map((company, index) => index === companyIndex ? { ...company, ...patch } : company) }));
  const patchRole = (companyIndex, roleIndex, patch) => setCareer((current) => ({ ...current, companies: current.companies.map((company, index) => index === companyIndex ? { ...company, roles: company.roles.map((role, itemIndex) => itemIndex === roleIndex ? { ...role, ...patch } : role) } : company) }));
  const addCompany = () => { const company = emptyCompany(); setCareer((current) => ({ ...current, companies: [...current.companies, company] })); setEditingCompanyId(company.id); setEditingRoleId(''); };
  const addPosition = (companyIndex) => { const role = emptyRole(); patchCompany(companyIndex, { roles: [...career.companies[companyIndex].roles, role] }); setEditingRoleId(role.id); };
  const persist = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const saved = normalizeCareer(await saveCareer(career));
      lastServerSaved.current = JSON.stringify(saved);
      setCareer(saved);
      onCareerSaved?.(saved);
      try { window.localStorage.removeItem(CAREER_DRAFT_KEY); } catch (_) { /* Server save already succeeded. */ }
      setDraftStatus('');
      notify(fa ? 'سابقهٔ کاری ذخیره شد.' : 'Work history saved.');
    }
    catch (problem) {
      if (!problem.status || problem.status >= 500) void reportClientIssue('experience', problem.message, 'PUT /api/admin/career');
      const friendly = ({ 'Enter a company name.': 'نام شرکت را وارد کن.', 'Enter a position title.': 'عنوان موقعیت شغلی را وارد کن.' })[problem.message];
      setError(fa ? (friendly || 'ذخیرهٔ سابقهٔ کاری انجام نشد. جزئیات فنی در تب گزارش خطاها ثبت شد.') : `Could not save work history. ${problem.status && problem.status < 500 ? problem.message : 'Technical details were saved in Issue reports.'}`);
    }
    finally { setBusy(false); }
  };
  return <form className="admin-card career-admin" onSubmit={persist}>
    <div className="admin-section-title"><h2>{fa ? 'مدیریت سابقهٔ کاری' : 'Manage work history'}</h2>{!career.noExperience && <button className="button button-outline" type="button" onClick={addCompany}>{fa ? 'افزودن شرکت' : 'Add company'}</button>}</div>
    <label className="checkbox-label career-empty-toggle"><input type="checkbox" checked={career.noExperience} onChange={(event) => setCareer((current) => ({ ...current, noExperience: event.target.checked }))} />{fa ? 'سابقهٔ کاری ندارم؛ پیام فرصت همکاری نمایش داده شود' : 'I have no work experience; show the opportunity message'}</label>
    <p className="field-hint" role="status">{draftStatus === 'restored' ? (fa ? 'پیش‌نویس ذخیره‌شده بازیابی شد؛ می‌توانی ویرایش را ادامه بدهی.' : 'Your saved draft was restored. You can continue editing.') : draftStatus === 'saved' ? (fa ? 'پیش‌نویس به‌صورت خودکار در همین مرورگر ذخیره شد.' : 'Draft saved automatically in this browser.') : draftStatus === 'unavailable' ? (fa ? 'ذخیرهٔ خودکار پیش‌نویس در این مرورگر در دسترس نیست؛ برای ثبت تغییرات از دکمهٔ ذخیره استفاده کن.' : 'Automatic draft saving is unavailable in this browser. Use Save to keep your changes.') : (fa ? 'شرکت را باز کن و موقعیت‌هایش را جداگانه مدیریت کن. پیش‌نویس خودکار ذخیره می‌شود.' : 'Open a company to manage its positions. A draft is saved automatically.')}</p>
    {!career.noExperience && <>
    {!career.companies.length && <p className="empty-state">{fa ? 'هنوز شرکتی اضافه نشده است.' : 'No companies have been added yet.'}</p>}
    <div className="career-company-list">{career.companies.map((company, companyIndex) => <section className="career-company-admin" key={company.id}>
      <div className="career-company-admin-row">
        {company.logoUrl ? <img className="career-admin-logo" src={company.logoUrl} alt="" /> : <span className="career-admin-logo career-admin-logo-empty">{company.name.slice(0, 1) || '•'}</span>}
        <div className="career-company-admin-summary"><strong>{company.name || (fa ? 'شرکت بدون نام' : 'Unnamed company')}</strong><span>{careerPeriod(company, lang)}</span><small>{company.roles.length} {fa ? 'موقعیت' : 'positions'}</small></div>
        <div className="career-admin-actions"><button className="edit-action" type="button" onClick={() => { setEditingCompanyId(editingCompanyId === company.id ? '' : company.id); setEditingRoleId(''); }}>{editingCompanyId === company.id ? (fa ? 'بستن' : 'Close') : (fa ? 'ویرایش شرکت' : 'Edit company')}</button><button className="delete-action" type="button" onClick={() => { setCareer((current) => ({ ...current, companies: current.companies.filter((item) => item.id !== company.id) })); if (editingCompanyId === company.id) setEditingCompanyId(''); }}>{fa ? 'حذف' : 'Delete'}</button></div>
      </div>
      {editingCompanyId === company.id && <div className="career-company-editor">
        <div className="form-columns"><label className="field-label">{fa ? 'نام شرکت' : 'Company name'}<input required maxLength="100" value={company.name} onChange={(event) => patchCompany(companyIndex, { name: event.target.value })} /></label><label className="field-label">{fa ? 'لینک لوگو (اختیاری)' : 'Logo URL (optional)'}<input dir="ltr" type="url" value={company.logoUrl} onChange={(event) => patchCompany(companyIndex, { logoUrl: event.target.value })} placeholder="https://..." /></label><label className="field-label">{fa ? 'شروع همکاری' : 'Company start'}<CalendarMonthInput lang={lang} value={company.startDate} onChange={(value) => patchCompany(companyIndex, { startDate: value })} /></label><label className="field-label">{fa ? 'پایان همکاری' : 'Company end'}<CalendarMonthInput lang={lang} value={company.endDate} disabled={company.isCurrent} onChange={(value) => patchCompany(companyIndex, { endDate: value })} /></label></div>
        <label className="checkbox-label"><input type="checkbox" checked={company.isCurrent} onChange={(event) => patchCompany(companyIndex, { isCurrent: event.target.checked, endDate: event.target.checked ? '' : company.endDate })} />{fa ? 'هم‌اکنون در این شرکت مشغولم' : 'I currently work here'}</label>
        <div className="career-admin-roles"><div className="admin-section-title"><h3>{fa ? 'موقعیت‌های شغلی' : 'Positions'}</h3><button className="button button-outline" type="button" onClick={() => addPosition(companyIndex)}>{fa ? 'افزودن موقعیت' : 'Add position'}</button></div>
          {!company.roles.length && <p className="field-hint">{fa ? 'برای این شرکت هنوز موقعیتی ثبت نشده است.' : 'No positions have been added for this company yet.'}</p>}
          {company.roles.map((role, roleIndex) => <div className="career-role-admin" key={role.id}>
            {editingRoleId === role.id ? <div className="career-role-editor"><label className="field-label">{fa ? 'عنوان موقعیت' : 'Position title'}<input required maxLength="100" value={careerText(role.title)} onChange={(event) => patchRole(companyIndex, roleIndex, { title: { ...role.title, fa: event.target.value, en: '' } })} /></label><label className="field-label">{fa ? 'توضیحات موقعیت' : 'Position description'}<textarea rows="3" maxLength="1200" value={careerText(role.description)} onChange={(event) => patchRole(companyIndex, roleIndex, { description: { ...role.description, fa: event.target.value, en: '' } })} /></label><CareerTechnologyPicker skills={skills} selected={role.technologiesUsed} lang={lang} onChange={(technologiesUsed) => patchRole(companyIndex, roleIndex, { technologiesUsed })} /><div className="form-columns"><label className="field-label">{fa ? 'شروع موقعیت' : 'Position start'}<CalendarMonthInput lang={lang} value={role.startDate} onChange={(value) => patchRole(companyIndex, roleIndex, { startDate: value })} /></label><label className="field-label">{fa ? 'پایان موقعیت' : 'Position end'}<CalendarMonthInput lang={lang} value={role.endDate} disabled={role.isCurrent} onChange={(value) => patchRole(companyIndex, roleIndex, { endDate: value })} /></label></div><label className="checkbox-label"><input type="checkbox" checked={role.isCurrent} onChange={(event) => patchRole(companyIndex, roleIndex, { isCurrent: event.target.checked, endDate: event.target.checked ? '' : role.endDate })} />{fa ? 'هم‌اکنون در این موقعیت هستم' : 'I currently hold this position'}</label></div> : <div className="career-role-summary"><strong>{careerText(role.title, lang) || (fa ? 'موقعیت بدون عنوان' : 'Untitled position')}</strong><span>{careerPeriod(role, lang)}</span><p>{careerText(role.description, lang)}</p>{role.technologiesUsed?.length > 0 && <div className="career-technology-tags">{role.technologiesUsed.map((technology) => <span key={typeof technology === 'string' ? technology : technology.id}>{typeof technology === 'string' ? technology : technology.name}</span>)}</div>}</div>}
            <div className="career-admin-actions"><button className="edit-action" type="button" onClick={() => setEditingRoleId(editingRoleId === role.id ? '' : role.id)}>{editingRoleId === role.id ? (fa ? 'بستن ویرایش' : 'Done editing') : (fa ? 'ویرایش' : 'Edit')}</button><button className="delete-action" type="button" onClick={() => { patchCompany(companyIndex, { roles: company.roles.filter((item) => item.id !== role.id) }); if (editingRoleId === role.id) setEditingRoleId(''); }}>{fa ? 'حذف' : 'Delete'}</button></div>
          </div>)}
        </div>
      </div>}
    </section>)}</div>
    </>}
    {error && <p className="error-text" role="alert">{error}</p>}
    <button className="button button-primary" disabled={busy}>{busy ? (fa ? 'در حال ذخیره...' : 'Saving...') : (fa ? 'ذخیرهٔ سابقهٔ کاری' : 'Save work history')}</button>
  </form>;
}
