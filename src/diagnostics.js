const scopeLabels = {
  translation: { fa: 'ترجمهٔ خودکار', en: 'Automatic translation' },
  projects: { fa: 'مدیریت پروژه‌ها', en: 'Project management' },
  posts: { fa: 'مدیریت نوشته‌ها', en: 'Post management' },
  skills: { fa: 'مدیریت مهارت‌ها', en: 'Skills management' },
  socials: { fa: 'شبکه‌های اجتماعی', en: 'Social links' },
  experience: { fa: 'سابقهٔ کاری', en: 'Work history' },
  advertising: { fa: 'مدیریت تبلیغات', en: 'Advertising' },
  notifications: { fa: 'اعلان‌ها', en: 'Notifications' },
  messages: { fa: 'پیام‌های تماس', en: 'Contact messages' },
  comments: { fa: 'دیدگاه‌ها', en: 'Comments' },
  api: { fa: 'ارتباط با سرور', en: 'Server connection' },
  interface: { fa: 'نمایش سایت', en: 'Website display' },
  runtime: { fa: 'اجرای سایت', en: 'Website runtime' }
};

export function describeIssue(scope, lang = 'fa') {
  const normalized = ({ skill: 'skills', social: 'socials', project: 'projects', post: 'posts', career: 'experience' })[scope] || scope;
  return scopeLabels[normalized]?.[lang] || scopeLabels.runtime[lang];
}

export async function reportClientIssue(scope, message, details = '') {
  if (typeof window === 'undefined' || !window.fetch) return;
  try {
    await window.fetch('/api/client-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ scope, message: String(message || 'Unknown error').slice(0, 500), details: String(details || '').slice(0, 1200), page: `${window.location.pathname}${window.location.hash}`.slice(0, 300) })
    });
  } catch (_) {
    // Error reporting must never interrupt the visitor's current action.
  }
}

export async function monitoredFetch(input, options = {}, scope = 'api') {
  const safeToRetry = !options.method || options.method.toUpperCase() === 'GET' || options.method.toUpperCase() === 'HEAD';
  let lastError;
  for (let attempt = 0; attempt < (safeToRetry ? 2 : 1); attempt += 1) {
    try { return await window.fetch(input, options); }
    catch (error) {
      lastError = error;
      if (attempt === 0 && safeToRetry) await new Promise((resolve) => window.setTimeout(resolve, 350));
    }
  }
  void reportClientIssue(scope, lastError?.message || 'Network request failed', String(input));
  throw lastError;
}
