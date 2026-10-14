import React from 'react';
import { render, screen } from '@testing-library/react';
import { CareerTimeline } from './CareerTimeline';
import { careerPeriod, formatCareerDate, fromPersianMonth, normalizeCareer, toPersianMonth } from './career';

test('normalizes missing work history to a safe empty state', () => {
  expect(normalizeCareer(null)).toEqual({ noExperience: false, companies: [] });
});

test('formats active employment periods in both supported languages', () => {
  const employment = { startDate: '2023-05', isCurrent: true };
  expect(careerPeriod(employment, 'en')).toMatch(/May 2023.*Present/);
  expect(careerPeriod(employment, 'fa')).toContain('اکنون');
  expect(formatCareerDate('bad-date', 'en')).toBe('bad-date');
});

test('converts the same work-history month between Shamsi and Gregorian calendars', () => {
  expect(fromPersianMonth('1403-01')).toBe('2024-04-03');
  expect(toPersianMonth('2024-04-03')).toBe('1403-01');
  expect(formatCareerDate('2024-04-03', 'fa')).toContain('فروردین');
  expect(formatCareerDate('2024-04-03', 'en')).toContain('Apr');
});

test('shows the editable no-experience message to visitors', () => {
  render(<CareerTimeline career={{ noExperience: true }} lang="fa" />);
  expect(screen.getByText(/دنبال فرصتی هستم تا تجربهٔ عملی و کار تیمی/)).toBeInTheDocument();
});

test('hides saved company history from visitors when no-experience is enabled', () => {
  render(<CareerTimeline lang="en" career={{ noExperience: true, companies: [{ id: 'c1', name: 'Hidden Company', roles: [{ id: 'r1', title: 'Hidden Position' }] }] }} />);
  expect(screen.getByText(/I do not have professional experience yet/)).toBeInTheDocument();
  expect(screen.queryByText('Hidden Company')).not.toBeInTheDocument();
  expect(screen.queryByText('Hidden Position')).not.toBeInTheDocument();
});

test('renders companies, nested positions and their descriptions as a timeline', () => {
  render(<CareerTimeline lang="en" career={{ companies: [{ id: 'c1', name: 'Example Studio', startDate: '2022-01', isCurrent: true, roles: [{ id: 'r1', title: 'Frontend Developer', description: 'Built accessible web apps.', startDate: '2023-06', isCurrent: true }] }] }} />);
  expect(screen.getByRole('heading', { name: 'Example Studio' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Frontend Developer' })).toBeInTheDocument();
  expect(screen.getByText('Built accessible web apps.')).toBeInTheDocument();
  expect(screen.getAllByText(/Present/)).toHaveLength(2);
});

test('shows technologies selected for a position in the public timeline', () => {
  render(<CareerTimeline lang="en" career={{ companies: [{ id: 'c1', name: 'Example Studio', roles: [{ id: 'r1', title: 'Frontend Developer', technologiesUsed: [{ id: 'react', name: 'React', iconUrl: '' }, { id: 'css', name: 'CSS', iconUrl: '' }] }] }] }} />);
  expect(screen.getByText('React')).toBeInTheDocument();
  expect(screen.getByText('CSS')).toBeInTheDocument();
});
