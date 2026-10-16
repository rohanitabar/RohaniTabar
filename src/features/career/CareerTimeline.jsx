/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import AdaptiveLogo from '../../components/ui/AdaptiveLogo';
import { careerPeriod, careerText, normalizeCareer } from './career';

export function CareerTimeline({ career: rawCareer, skills = [], lang = 'fa' }) {
  const career = normalizeCareer(rawCareer);
  const fa = lang === 'fa';
  const [expandedCompanies, setExpandedCompanies] = useState({});
  const skillsById = new Map(skills.map((skill) => [skill.id, skill]));

  if (career.noExperience) {
    return <p className="career-empty">{fa
      ? '\u0647\u0646\u0648\u0632 \u0633\u0627\u0628\u0642\u0647\u0654 \u06a9\u0627\u0631\u06cc \u0646\u062f\u0627\u0631\u0645 \u0648 \u0628\u0647\u200c\u062f\u0646\u0628\u0627\u0644 \u0641\u0631\u0635\u062a\u06cc \u0647\u0633\u062a\u0645 \u062a\u0627 \u062a\u062c\u0631\u0628\u0647\u0654 \u0639\u0645\u0644\u06cc \u0648 \u06a9\u0627\u0631 \u062a\u06cc\u0645\u06cc \u0628\u0647 \u062f\u0633\u062a \u0628\u06cc\u0627\u0648\u0631\u0645.'
      : 'I do not have professional experience yet. I am looking for an opportunity to gain hands-on and team experience.'}</p>;
  }
  if (!career.companies.length) return <p className="career-empty">{fa ? '\u0633\u0627\u0628\u0642\u0647\u0654 \u06a9\u0627\u0631\u06cc \u062b\u0628\u062a \u0646\u0634\u062f\u0647 \u0627\u0633\u062a.' : 'No work experience has been added yet.'}</p>;

  return <div className="career-public-company-list">
    {career.companies.map((company) => {
      const key = company.id || company.name;
      const expanded = Boolean(expandedCompanies[key]);
      const visibleRoles = expanded ? company.roles : company.roles.slice(0, 1);
      const showMore = company.roles.length > 1;
      return <article className={`career-company-card${expanded ? ' is-expanded' : ''}`} key={key}>
        <div className="career-company-heading">
          {company.logoUrl ? <AdaptiveLogo className="career-logo" src={company.logoUrl} alt={company.name} /> : <span className="career-logo career-logo-fallback" aria-hidden="true">{company.name.slice(0, 1)}</span>}
          <div><h3>{company.name}</h3><p>{careerPeriod(company, lang)}</p></div>
        </div>
        {!!visibleRoles.length && <ol className="career-roles">
          {visibleRoles.map((role, roleIndex) => <li key={role.id || role.title}>
            <h4>{careerText(role.title, lang)}</h4>
            <p className="career-role-period">{careerPeriod(role, lang)}</p>
            {role.technologiesUsed?.length > 0 && <ul className="career-public-technologies" aria-label={fa ? '\u0641\u0646\u0627\u0648\u0631\u06cc\u200c\u0647\u0627\u06cc \u0627\u0633\u062a\u0641\u0627\u062f\u0647\u200c\u0634\u062f\u0647' : 'Technologies used'}>
              {role.technologiesUsed.map((technology) => {
                const reference = typeof technology === 'string' ? { id: technology, name: technology } : technology;
                const currentSkill = skillsById.get(reference.id);
                const name = currentSkill?.name || reference.name;
                const iconUrl = currentSkill ? currentSkill.iconUrl : reference.iconUrl;
                return <li key={reference.id || name}>{iconUrl && <AdaptiveLogo className="career-tech-icon" src={iconUrl} alt="" loading="lazy" />}<span>{name}</span></li>;
              })}
            </ul>}
            {careerText(role.description, lang) && <p className="career-description">{careerText(role.description, lang)}</p>}
            {showMore && roleIndex === visibleRoles.length - 1 && <button className="career-company-expand" type="button" aria-expanded={expanded} onClick={() => setExpandedCompanies((current) => ({ ...current, [key]: !current[key] }))}>{expanded ? (fa ? '\u0646\u0645\u0627\u06cc\u0634 \u06a9\u0645\u062a\u0631' : 'Show less') : (fa ? '\u0646\u0645\u0627\u06cc\u0634 \u0645\u0648\u0642\u0639\u06cc\u062a\u200c\u0647\u0627\u06cc \u0628\u06cc\u0634\u062a\u0631' : 'Show more positions')}</button>}
          </li>)}
        </ol>}
      </article>;
    })}
  </div>;
}

export default CareerTimeline;
