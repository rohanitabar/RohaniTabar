/* eslint-disable react/prop-types */
import React from 'react';
import AdaptiveLogo from './AdaptiveLogo';
import { careerPeriod, careerText, normalizeCareer } from './career';

export function CareerTimeline({ career: rawCareer, lang = 'fa' }) {
  const career = normalizeCareer(rawCareer);
  const fa = lang === 'fa';
  if (career.noExperience) {
    return <p className="career-empty">{fa
      ? 'هنوز سابقهٔ کاری ندارم و به‌دنبال فرصتی هستم تا تجربهٔ عملی و کار تیمی به دست بیاورم.'
      : 'I do not have professional experience yet. I am looking for an opportunity to gain hands-on and team experience.'}</p>;
  }
  if (!career.companies.length) return <p className="career-empty">{fa ? 'سابقهٔ کاری ثبت نشده است.' : 'No work experience has been added yet.'}</p>;
  return <ol className="career-tree">
    {career.companies.map((company) => <li className="career-company" key={company.id || company.name}>
      <div className="career-company-heading">
        {company.logoUrl ? <AdaptiveLogo className="career-logo" src={company.logoUrl} alt={company.name} /> : <span className="career-logo career-logo-fallback" aria-hidden="true">{company.name.slice(0, 1)}</span>}
        <div><h3>{company.name}</h3><p>{careerPeriod(company, lang)}</p></div>
      </div>
      {!!company.roles.length && <ol className="career-roles">
        {company.roles.map((role) => <li key={role.id || role.title}>
          <h4>{careerText(role.title, lang)}</h4><p className="career-role-period">{careerPeriod(role, lang)}</p>
          {careerText(role.description, lang) && <p className="career-description">{careerText(role.description, lang)}</p>}
          {role.technologiesUsed?.length > 0 && <ul className="career-public-technologies" aria-label={fa ? 'تکنولوژی‌های استفاده‌شده' : 'Technologies used'}>{role.technologiesUsed.map((technology) => <li key={typeof technology === 'string' ? technology : technology.id}>{typeof technology === 'object' && technology.iconUrl && <AdaptiveLogo className="career-tech-icon" src={technology.iconUrl} alt="" loading="lazy" />}<span>{typeof technology === 'string' ? technology : technology.name}</span></li>)}</ul>}
        </li>)}
      </ol>}
    </li>)}
  </ol>;
}

export default CareerTimeline;
