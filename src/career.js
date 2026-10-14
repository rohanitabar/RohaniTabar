export function normalizeCareer(value) {
  const career = value && typeof value === 'object' ? value : {};
  const companies = Array.isArray(career.companies) ? career.companies : [];
  const localized = (text) => typeof text === 'object' && text !== null
    ? { fa: String(text.fa || ''), en: String(text.en || '') }
    : { fa: String(text || ''), en: String(text || '') };
  return {
    noExperience: career.noExperience === true,
    companies: companies.map((company) => ({
      id: String(company.id || ''),
      name: String(company.name || ''),
      logoUrl: String(company.logoUrl || ''),
      startDate: String(company.startDate || ''),
      endDate: String(company.endDate || ''),
      isCurrent: company.isCurrent === true,
      roles: (Array.isArray(company.roles) ? company.roles : []).map((role) => ({
        id: String(role.id || ''),
        title: localized(role.title),
        description: localized(role.description),
        technologiesUsed: Array.isArray(role.technologiesUsed) ? role.technologiesUsed.map((technology) => typeof technology === 'string'
          ? technology
          : { id: String(technology.id || ''), name: String(technology.name || ''), iconUrl: String(technology.iconUrl || '') }) : [],
        startDate: String(role.startDate || ''),
        endDate: String(role.endDate || ''),
        isCurrent: role.isCurrent === true
      }))
    }))
  };
}

export function careerText(value, lang = 'fa') {
  return typeof value === 'string' ? value : value?.[lang] || value?.fa || value?.en || '';
}

const persianPartsFormatter = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', {
  year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'UTC'
});
function parseStoredMonth(value) {
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value || '')) return `${value}-15`;
  return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value || '') ? value : '';
}

export function persianMonthParts(value) {
  const dateValue = parseStoredMonth(value);
  if (!dateValue) return null;
  const date = new Date(`${dateValue}T12:00:00Z`);
  const parts = Object.fromEntries(persianPartsFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
}

export function toPersianMonth(value) {
  const parts = persianMonthParts(value);
  return parts ? `${parts.year}-${String(parts.month).padStart(2, '0')}` : '';
}

export function fromPersianMonth(value) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value || '');
  if (!match) return '';
  const year = Number(match[1]);
  const month = Number(match[2]);
  const monthOffset = month <= 6 ? (month - 1) * 31 : 186 + (month - 7) * 30;
  const approximate = Date.UTC(year + 621, 2, 20 + monthOffset + 14);
  for (let offset = -4; offset <= 4; offset += 1) {
    const candidate = new Date(approximate + offset * 86400000);
    const parts = persianPartsFormatter.formatToParts(candidate);
    const result = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    if (Number(result.year) === year && Number(result.month) === month && Number(result.day) === 15) {
      return `${candidate.getUTCFullYear()}-${String(candidate.getUTCMonth() + 1).padStart(2, '0')}-${String(candidate.getUTCDate()).padStart(2, '0')}`;
    }
  }
  return '';
}

export function formatCareerDate(value, lang = 'fa') {
  const dateValue = parseStoredMonth(value);
  if (!dateValue) return value || '';
  const date = new Date(`${dateValue}T12:00:00Z`);
  return new Intl.DateTimeFormat(lang === 'fa' ? 'fa-IR-u-ca-persian' : 'en-US-u-ca-gregory', {
    month: 'short', year: 'numeric', timeZone: 'UTC'
  }).format(date);
}

export function careerPeriod(item, lang = 'fa') {
  const from = formatCareerDate(item?.startDate, lang);
  const to = item?.isCurrent
    ? (lang === 'fa' ? 'اکنون' : 'Present')
    : formatCareerDate(item?.endDate, lang);
  if (!from && !to) return lang === 'fa' ? 'زمان ثبت نشده' : 'Dates not provided';
  return `${from || '…'} — ${to || '…'}`;
}
