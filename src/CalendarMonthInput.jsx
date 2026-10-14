/* eslint-disable react/prop-types */
import React from 'react';
import { fromPersianMonth, persianMonthParts, toPersianMonth } from './career';

const persianMonths = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

export default function CalendarMonthInput({ value = '', onChange, lang = 'fa', disabled = false }) {
  if (lang !== 'fa') {
    return <input type="month" value={value ? value.slice(0, 7) : ''} disabled={disabled} onChange={(event) => onChange(event.target.value ? `${event.target.value}-15` : '')} />;
  }

  const selected = persianMonthParts(value);
  const selectedValue = toPersianMonth(value);
  const currentYear = persianMonthParts(`${new Date().getUTCFullYear()}-03-20`)?.year || 1400;
  const firstYear = Math.min(currentYear - 60, selected?.year || currentYear);
  const years = Array.from({ length: currentYear + 10 - firstYear + 1 }, (_, index) => currentYear + 10 - index);
  const update = (part, nextValue) => {
    if (!nextValue) { onChange(''); return; }
    const current = selectedValue ? selectedValue.split('-').map(Number) : [currentYear, 1];
    const next = part === 'year' ? [Number(nextValue), current[1]] : [current[0], Number(nextValue)];
    onChange(fromPersianMonth(`${next[0]}-${String(next[1]).padStart(2, '0')}`));
  };

  return <span className="career-calendar-input" dir="rtl">
    <select aria-label="ماه شمسی" value={selected?.month || ''} disabled={disabled} onChange={(event) => update('month', event.target.value)}>
      <option value="">ماه</option>
      {persianMonths.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
    </select>
    <select aria-label="سال شمسی" value={selected?.year || ''} disabled={disabled} onChange={(event) => update('year', event.target.value)}>
      <option value="">سال</option>
      {years.map((year) => <option key={year} value={year}>{year.toLocaleString('fa-IR')}</option>)}
    </select>
  </span>;
}
