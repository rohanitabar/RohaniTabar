import { render, screen } from '@testing-library/react';
import App from './App';
import apiVersion from '../lib/apiVersion';

test('shows a loading skeleton before rendering the portfolio home', async () => {
  render(<App />);
  expect(screen.getByRole('link', { name: 'Abbas home' })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'منوی اصلی' })).toBeInTheDocument();
  expect(screen.getByRole('status', { name: 'در حال بارگذاری...' })).toBeInTheDocument();
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('من عباس روحانی‌تبار هستم.');
  expect(await screen.findByRole('heading', { name: 'سابقهٔ کاری' })).toBeInTheDocument();
});

test('still renders when browser storage is unavailable', async () => {
  const storage = jest.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new Error('Storage blocked'); });
  try {
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('من عباس روحانی‌تبار هستم.');
  } finally {
    storage.mockRestore();
  }
});

test('loads the admin route on demand', async () => {
  window.history.pushState({}, '', '/admin');
  try {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'ورود مدیر' })).toBeInTheDocument();
  } finally {
    window.history.pushState({}, '', '/');
  }
});

test('renders the authenticated admin dashboard after its lazy module loads', async () => {
  const previousFetch = global.fetch;
  global.fetch = jest.fn((url) => {
    if (url === '/api/admin/status') return Promise.resolve({ ok: true, status: 200, json: async () => ({ configured: true, apiVersion }) });
    if (url === '/api/admin/me') return Promise.resolve({ ok: true, status: 200, json: async () => ({ authenticated: true }) });
    return Promise.reject(new Error('Test API unavailable'));
  });
  window.history.pushState({}, '', '/admin');
  try {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'پنل مدیریت' })).toBeInTheDocument();
    expect(screen.getByRole('tablist', { name: 'بخش‌های پنل مدیریت' })).toBeInTheDocument();
  } finally {
    global.fetch = previousFetch;
    window.history.pushState({}, '', '/');
  }
});
