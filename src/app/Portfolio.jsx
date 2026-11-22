/* eslint-disable react/prop-types */
import React, { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import AdaptiveLogo from '../components/ui/AdaptiveLogo';
import PushToggle from '../features/notifications/PushNotifications';
import { ArticlePage, BlogPage, PostPreview, ProjectCard, ProjectsPage, newestFirst } from '../features/editorial/Editorial';
const AdminPage = lazy(() => import('../features/admin/AdminPage'));
import CareerTimeline from '../features/career/CareerTimeline';
import RuntimeErrorBoundary from '../components/ui/RuntimeErrorBoundary';
import { monitoredFetch, reportClientIssue } from '../lib/diagnostics';
import { subscribeToSiteChanges } from '../lib/siteEvents';
import { Hero } from './Hero';
import { sectionPaths, sectionIdsByPath } from './portfolioSections';
import portraitMobile from '../assets/images/Abbas-mobile.webp';
import portraitDesktop from '../assets/images/Abbas-desktop.webp';
import logo from '../assets/images/Logo.jpg';

const copy = {
    fa: {
    nav: ['خانه', 'درباره من', 'مهارت‌ها', 'پروژه‌ها', 'وبلاگ', 'تماس'], projects: 'پروژه‌های منتخب', skills: 'مهارت‌های من', about: 'درباره من', blog: 'یادداشت‌های تازه', contact: 'بیایید با هم کار کنیم', contactText: 'برای همکاری، پیشنهاد یا گفت‌وگو پیام بده.', resume: 'دریافت رزومه PDF', viewDemo: 'مشاهده دمو', source: 'کد منبع', read: 'ادامه مطلب', like: 'پسندیدن', liked: 'پسندیدم', comments: 'دیدگاه‌ها', commentPlaceholder: 'دیدگاهت را بنویس...', send: 'ارسال دیدگاه', share: 'اشتراک‌گذاری', emptyPosts: 'به‌زودی نوشته‌های تازه منتشر می‌شوند.', emptyProjects: 'پروژه‌های تازه به‌زودی اینجا قرار می‌گیرند.', admin: 'ورود مدیر', themeLight: 'حالت روشن', themeDark: 'حالت تیره', language: 'English', name: 'نام', email: 'ایمیل', message: 'پیام', sendMessage: 'ارسال پیام', messageSent: 'پیام با موفقیت ارسال شد.', messageFailed: 'ارسال پیام ناموفق بود. کمی بعد دوباره تلاش کن.', sending: 'در حال ارسال...', setupTitle: 'راه‌اندازی مدیر سایت', setupHelp: 'کلید راه‌اندازی را از فایل محیطی سرور وارد کن، سپس نام کاربری و رمز خودت را بساز.', setupKey: 'کلید راه‌اندازی', username: 'نام کاربری', password: 'رمز عبور', loginTitle: 'ورود به پنل مدیریت', login: 'ورود', createAdmin: 'ساخت حساب مدیر', panel: 'پنل مدیریت', logout: 'خروج', addSkill: 'افزودن مهارت', skillName: 'نام مهارت', add: 'افزودن', manage: 'مدیریت محتوا', newPost: 'انتشار نوشته', titleFa: 'عنوان فارسی', titleEn: 'عنوان انگلیسی', excerptFa: 'خلاصه فارسی', excerptEn: 'خلاصه انگلیسی', bodyFa: 'متن فارسی', bodyEn: 'متن انگلیسی', imageUrl: 'آدرس تصویر (اختیاری)', publish: 'انتشار', newProject: 'افزودن پروژه', descriptionFa: 'توضیح فارسی', descriptionEn: 'توضیح انگلیسی', demoUrl: 'لینک دمو', repoUrl: 'لینک مخزن کد', addProject: 'ثبت پروژه', uploadResume: 'بارگذاری رزومه PDF', noResume: 'هنوز رزومه‌ای بارگذاری نشده است.', commentsAdmin: 'مدیریت دیدگاه‌ها', delete: 'حذف', loading: 'در حال بارگذاری...', setupMissing: 'برای فعال‌کردن پنل، ADMIN_SETUP_KEY را در فایل .env سرور تنظیم و سرور را دوباره اجرا کن.', fallbackAbout: 'من عباس روحانی‌تبار هستم؛ توسعه‌دهنده فرانت‌اند علاقه‌مند به یادگیری، طراحی رابط کاربری و ساخت محصولاتی که استفاده از آن‌ها ساده و لذت‌بخش باشد.'
  },
  en: {
    nav: ['Home', 'About', 'Skills', 'Projects', 'Blog', 'Contact'], projects: 'Selected projects', skills: 'What I work with', about: 'A little about me', blog: 'Latest writing', contact: 'Let’s work together', contactText: 'Have an opportunity, an idea or just want to say hello?', resume: 'Download résumé PDF', viewDemo: 'Live demo', source: 'Source code', read: 'Read article', like: 'Like', liked: 'Liked', comments: 'Comments', commentPlaceholder: 'Write a comment...', send: 'Post comment', share: 'Share', emptyPosts: 'Fresh articles are on their way.', emptyProjects: 'New projects will show up here soon.', admin: 'Admin sign in', themeLight: 'Light mode', themeDark: 'Dark mode', language: 'فارسی', name: 'Name', email: 'Email', message: 'Message', sendMessage: 'Send message', messageSent: 'Your message was sent.', messageFailed: 'Message could not be sent. Please try again shortly.', sending: 'Sending...', setupTitle: 'Set up your admin account', setupHelp: 'Enter the server setup key, then choose your own username and password.', setupKey: 'Setup key', username: 'Username', password: 'Password', loginTitle: 'Admin sign in', login: 'Sign in', createAdmin: 'Create admin account', panel: 'Admin panel', logout: 'Sign out', addSkill: 'Add a skill', skillName: 'Skill name', add: 'Add', manage: 'Content management', newPost: 'Publish a post', titleFa: 'Persian title', titleEn: 'English title', excerptFa: 'Persian summary', excerptEn: 'English summary', bodyFa: 'Persian article', bodyEn: 'English article', imageUrl: 'Image URL (optional)', publish: 'Publish', newProject: 'Add a project', descriptionFa: 'Persian description', descriptionEn: 'English description', demoUrl: 'Demo URL', repoUrl: 'Repository URL', addProject: 'Save project', uploadResume: 'Upload PDF résumé', noResume: 'No résumé has been uploaded yet.', commentsAdmin: 'Manage comments', delete: 'Delete', loading: 'Loading...', setupMissing: 'Set ADMIN_SETUP_KEY in the server .env file and restart the server to enable setup.', fallbackAbout: 'I’m Abbas Rohani Tabar, a frontend developer who enjoys learning, interface design and building products that feel simple and pleasant to use.'
  }
};

const skillLogos = {
  HTML: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/html5/html5-original.svg',
  CSS: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/css3/css3-original.svg',
  JavaScript: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg',
  Bootstrap: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/bootstrap/bootstrap-original.svg',
  React: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg',
  Git: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/git/git-original.svg'
};
const initialSkills = Object.keys(skillLogos).map((name) => ({ id: name.toLowerCase(), name, iconUrl: skillLogos[name] }));
const initialProjects = [
  { id: 'ai-notes', title: { fa: 'یادداشت‌های هوش مصنوعی', en: 'AI Notes' }, description: { fa: 'یک مجموعه نوشته درباره ابزارها و روندهای تازه هوش مصنوعی.', en: 'A collection of notes on AI tools and emerging ideas.' }, demoUrl: '', repoUrl: '' },
  { id: 'portfolio', title: { fa: 'پورتفولیو شخصی', en: 'Personal portfolio' }, description: { fa: 'وب‌سایت شخصی برای معرفی مهارت‌ها، پروژه‌ها و نوشته‌ها.', en: 'A personal site for sharing skills, projects and writing.' }, demoUrl: '', repoUrl: '' }
];
const initialPosts = [
  { id: 'qwen', title: { fa: 'Qwen، رقیب جدی ChatGPT', en: 'Qwen: a serious ChatGPT competitor' }, excerpt: { fa: 'نگاهی به مدل‌های Qwen و کاربردهای آن‌ها در متن، تصویر و صدا.', en: 'A look at Qwen models and their uses across text, images and audio.' }, body: { fa: 'مدل‌های Qwen مجموعه‌ای از ابزارهای هوش مصنوعی علی‌بابا هستند. در این نوشته نگاهی کوتاه به قابلیت‌ها و کاربردهای آن‌ها داریم.', en: 'Qwen is Alibaba’s family of AI models. This short article looks at some of their capabilities and practical uses.' }, image: '', likes: 0, comments: [] },
  { id: 'deepseek', title: { fa: 'آشنایی با DeepSeek', en: 'Getting to know DeepSeek' }, excerpt: { fa: 'چرا DeepSeek توجه زیادی را در دنیای هوش مصنوعی جلب کرد؟', en: 'Why did DeepSeek draw so much attention in the AI world?' }, body: { fa: 'DeepSeek با مدل‌های کارآمد و دسترس‌پذیر خود توجه توسعه‌دهندگان را جلب کرد. این مقاله درباره رویکرد و ابزارهای آن است.', en: 'DeepSeek drew developers’ attention with capable, accessible models. This article explores its approach and tools.' }, image: '', likes: 0, comments: [] }
];
const initialSocials = [
  { id: 'github', href: 'https://github.com/rohanitabar', iconUrl: 'https://cdn.simpleicons.org/github/181717' },
  { id: 'whatsapp', href: 'https://wa.me/989032991639', iconUrl: 'https://cdn.simpleicons.org/whatsapp/25D366' },
  { id: 'telegram', href: 'https://t.me/AbbasRt_1385', iconUrl: 'https://cdn.simpleicons.org/telegram/26A5E4' }
];
async function api(url, options = {}) {
  const scope = url.includes('/career') ? 'experience' : url.includes('/projects') ? 'projects' : url.includes('/posts') ? 'posts' : url.includes('/skills') ? 'skills' : url.includes('/socials') ? 'socials' : 'api';
  const response = await monitoredFetch(url, { credentials: 'same-origin', ...options, headers: { ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...options.headers } }, scope);
  const result = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(result.error || `Request failed (${response.status})`), { status: response.status });
  return result;
}
async function optimizeUploadImage(file, type) {
  const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
  const isPhoto = /\.(?:png|jpe?g)$/i.test(file.name) || /image\/(?:png|jpeg)/.test(file.type);
  if (!isSvg && (!isPhoto || file.size < 100 * 1024)) return file;
  if (!isSvg && (file.type === 'image/png' || /\.png$/i.test(file.name))) {
    const header = new TextDecoder().decode(await file.slice(0, 65536).arrayBuffer());
    if (header.includes('acTL')) return file;
  }

  const previewUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = previewUrl;
    await image.decode();
    const maxSize = isSvg ? 1200 : type.endsWith('logo') ? 512 : 1440;
    const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not convert the image.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const mime = isSvg ? 'image/png' : 'image/webp';
    const result = await new Promise((resolve) => canvas.toBlob(resolve, mime, 0.84));
    if (!result || result.type !== mime) throw new Error('Could not convert the image.');
    return isSvg || result.size < file.size ? result : file;
  } catch (error) {
    if (isSvg) throw new Error('Could not convert the SVG logo.');
    return file;
  } finally {
    URL.revokeObjectURL(previewUrl);
  }
}

async function uploadImage(file, type) {
  if (!file) throw new Error('Choose an image file.');
  if (file.size > 3 * 1024 * 1024) throw new Error('Image file exceeds 3 MB.');
  const imageFile = await optimizeUploadImage(file, type);
  const response = await fetch(`/api/admin/media?type=${encodeURIComponent(type)}`, { method: 'POST', body: imageFile, credentials: 'same-origin', headers: { 'Content-Type': imageFile.type } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) { if (response.status === 401) window.dispatchEvent(new Event('portfolio-auth-expired')); throw Object.assign(new Error(result.error || 'Image upload failed.'), { status: response.status }); }
  return result.url;
}
const localized = (value, lang) => typeof value === 'string' ? value : value?.[lang] || value?.en || value?.fa || '';
const readPreference = (key, allowed, fallback) => { try { const value = window.localStorage.getItem(key); return allowed.includes(value) ? value : fallback; } catch (_) { return fallback; } };
const writePreference = (key, value) => {
  try { window.localStorage.setItem(key, value); } catch (_) { /* Storage can be unavailable. */ }
  document.cookie = `${key}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
};
const fallbackPublicData = { skills: initialSkills, projects: initialProjects, posts: initialPosts, socials: initialSocials, resume: null, ads: [], messages: [], career: { noExperience: false, companies: [] } };
const translatedError = (error, lang) => {
  const message = error?.message || '';
  if (lang !== 'fa') return message || 'The request could not be completed.';
  const messages = {
    'Choose an image file.': 'ابتدا فایل لوگو را انتخاب کن.',
    'Logo file exceeds 3 MB.': 'حجم لوگو باید حداکثر ۳ مگابایت باشد.',
    'Image file exceeds 3 MB.': 'حجم تصویر باید حداکثر ۳ مگابایت باشد.',
    'Logo image could not be loaded.': 'این لینک تصویر باز نشد؛ لینک مستقیم دیگری بده یا فایل لوگو را بارگذاری کن.',
    'Wait for the logo preview to load, or upload the file.': 'صبر کن پیش‌نمایش تصویر بارگذاری شود یا فایل لوگو را انتخاب کن.',
    'Please sign in to continue.': 'نشست ورود منقضی شده؛ دوباره وارد پنل شو.',
    'Upload a PNG, JPEG or WebP image.': 'فایل باید PNG، JPG یا WebP معتبر باشد.',
    'Request is too large.': 'حجم فایل از حد مجاز ۳ مگابایت بیشتر است.',
    'Choose a supported logo type.': 'نوع لوگوی مهارت یا شبکه اجتماعی را انتخاب کن.',
    'Choose a supported image type.': 'نوع تصویر معتبر انتخاب کن.',
    'Enter a valid article image URL.': 'آدرس عکس داخل مطلب معتبر نیست.',
    'This skill already exists.': 'این مهارت قبلاً ثبت شده است؛ برای تغییر لوگو، ویرایش را بزن.',
    'Enter a skill name and logo URL.': 'نام مهارت و تصویر لوگو را وارد یا بارگذاری کن.',
    'A profile URL and a logo are required.': 'لینک پروفایل و تصویر لوگو را وارد یا بارگذاری کن.',
    'Enter a valid HTTP or HTTPS URL.': 'یک لینک معتبر با شروع http یا https وارد کن.',
    'Enter a valid HTTP or HTTPS URL without embedded credentials.': 'لینک معتبر بدون نام کاربری یا رمز عبور وارد کن.',
    'Use an HTTPS image link on this site, or upload the image file.': 'لینک تصویر باید HTTPS باشد؛ یا فایل تصویر را بارگذاری کن.',
    'This source repository is already assigned to another project.': 'این مخزن کد قبلاً به پروژهٔ دیگری اختصاص داده شده است.',
    'This demo URL is already assigned to another project.': 'این لینک دمو قبلاً برای پروژهٔ دیگری ثبت شده است.',
    'Links must use HTTP or HTTPS.': 'لینک باید با http:// یا https:// شروع شود.',
    'Incorrect setup key.': 'کلید راه‌اندازی درست نیست.',
    'The uploaded file is not a valid PDF.': 'فایل انتخاب‌شده PDF معتبر نیست.',
    'Could not convert the SVG logo.': 'تبدیل فایل SVG انجام نشد؛ لطفاً PNG یا JPG انتخاب کن.',
    'Image upload failed.': 'بارگذاری تصویر انجام نشد؛ اتصال API را بررسی کن.'
  };
  if (/failed to fetch|networkerror/i.test(message)) return 'ارتباط با سرور برقرار نشد؛ مطمئن شو API روی پورت ۵۰۰۰ اجراست.';
  return messages[message] || message || 'درخواست انجام نشد؛ اتصال سرور را بررسی کن.';
};

export default function Portfolio({ publicData, partialData, initialLanguage, initialTheme, hasHomePreview, hostname, protocol }) {
  const location = useLocation();
  const pathname = location.pathname.replace(/\/$/, '') || '/';
  const [lang, setLang] = useState(() => initialLanguage ?? readPreference('portfolio-language', ['fa', 'en'], document.documentElement.lang === 'en' ? 'en' : 'fa'));
  const [theme, setTheme] = useState(() => initialTheme ?? readPreference('portfolio-theme', ['light', 'dark'], document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'));
  const [data, setData] = useState(() => publicData || fallbackPublicData);
  const [initialLoading, setInitialLoading] = useState(() => !publicData && !hasHomePreview);
  const [notice, setNotice] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [unresolvedNoticeCount, setUnresolvedNoticeCount] = useState(0);
  const [belowFoldReady, setBelowFoldReady] = useState(() => pathname !== '/');
  const latestDataRequest = useRef(0);
  const postChangesDuringRefresh = useRef(null);
  const refreshRetry = useRef(null);
  const needsRetry = useRef(false);
  const retryDelay = useRef(3000);
  const t = copy[lang];
  useEffect(() => {
    if (pathname !== '/' || belowFoldReady) return undefined;
    // Let the browser paint the hero before mounting the rest of the homepage.
    let nextFrame;
    const frame = requestAnimationFrame(() => {
      nextFrame = requestAnimationFrame(() => setBelowFoldReady(true));
    });
    return () => {
      cancelAnimationFrame(frame);
      if (nextFrame !== undefined) cancelAnimationFrame(nextFrame);
    };
  }, [pathname, belowFoldReady]);
  const isAdmin = pathname === '/admin';
  const isBlog = pathname === '/blog';
  const isProjects = pathname === '/projects';
  const articleId = pathname.startsWith('/blog/') ? pathname.slice('/blog/'.length) : null;
  const isPortfolio = !isAdmin && !isBlog && !isProjects && !articleId;
  const latestPosts = useMemo(() => isPortfolio ? newestFirst(data.posts.filter((post) => post.published !== false)).slice(0, 5) : [], [data.posts, isPortfolio]);
  const latestProjects = useMemo(() => isPortfolio ? data.projects.filter((project) => project.featured !== false).slice(0, 5) : [], [data.projects, isPortfolio]);
  const refresh = useCallback(async () => {
    const requestId = ++latestDataRequest.current;
    const updatedPosts = new Map();
    postChangesDuringRefresh.current = updatedPosts;
    try {
      const next = await api('/api/site-data', { timeoutMs: 12000 });
      // StrictMode and admin actions can trigger overlapping refreshes. Ignore an
      // older response so it cannot replace a newer career setting on screen.
      if (requestId !== latestDataRequest.current) return;
      needsRetry.current = false;
      retryDelay.current = 3000;
      window.clearTimeout(refreshRetry.current);
      const posts = next.posts || initialPosts;
      setData({ ...next, skills: next.skills || initialSkills, projects: next.projects || initialProjects, posts: updatedPosts.size ? posts.map((post) => updatedPosts.has(post.id) ? { ...post, ...updatedPosts.get(post.id) } : post) : posts, socials: next.socials || initialSocials, ads: next.ads || [], career: next.career || { noExperience: false, companies: [] } });
    } catch {
      if (requestId === latestDataRequest.current) {
        needsRetry.current = true;
        window.clearTimeout(refreshRetry.current);
        refreshRetry.current = window.setTimeout(() => void refresh(), retryDelay.current);
        retryDelay.current = Math.min(retryDelay.current * 2, 30000);
      }
    }
    finally {
      if (postChangesDuringRefresh.current === updatedPosts) postChangesDuringRefresh.current = null;
      if (requestId === latestDataRequest.current) setInitialLoading(false);
    }
  }, []);
  const updateCareer = useCallback((career) => {
    // A successful save is newer than any site-data request already in flight.
    latestDataRequest.current += 1;
    setData((current) => ({ ...current, career }));
  }, []);
  const updatePost = useCallback((id, changes) => {
    const pending = postChangesDuringRefresh.current;
    if (pending) pending.set(id, { ...pending.get(id), ...changes });
    setData((current) => ({ ...current, posts: current.posts.map((post) => post.id === id ? { ...post, ...changes } : post) }));
  }, []);
  useEffect(() => { if (!publicData) void refresh(); }, [publicData, refresh]);
  useEffect(() => {
    if (!partialData) return undefined;
    // The visible page is complete. Load other articles after the first paint.
    let nextFrame;
    const frame = requestAnimationFrame(() => { nextFrame = requestAnimationFrame(() => void refresh()); });
    return () => { cancelAnimationFrame(frame); if (nextFrame !== undefined) cancelAnimationFrame(nextFrame); };
  }, [partialData, refresh]);
  useEffect(() => {
    const reconnect = () => { if (needsRetry.current) void refresh(); };
    window.addEventListener('online', reconnect);
    window.addEventListener('focus', reconnect);
    return () => { window.clearTimeout(refreshRetry.current); window.removeEventListener('online', reconnect); window.removeEventListener('focus', reconnect); };
  }, [refresh]);
  useEffect(() => {
    let refreshTimer;
    const onDataChanged = () => {
      clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        void refresh();
        window.dispatchEvent(new Event('portfolio-data-changed'));
      }, 120);
    };
    const unsubscribe = subscribeToSiteChanges(onDataChanged, () => { if (needsRetry.current) void refresh(); });
    return () => { clearTimeout(refreshTimer); unsubscribe(); };
  }, [refresh]);
  useEffect(() => {
    if (!isAdmin) return undefined;
    let active = true;
    const loadNoticeCount = async () => {
      try {
        const response = await fetch('/api/admin/notices', { credentials: 'same-origin' });
        if (!response.ok) return;
        const result = await response.json();
        if (active) setUnresolvedNoticeCount(Array.isArray(result.notices) ? result.notices.length : 0);
      } catch { /* Keep the last known count while the server is unavailable. */ }
    };
    loadNoticeCount();
    const timer = window.setInterval(loadNoticeCount, 30000);
    window.addEventListener('portfolio-data-changed', loadNoticeCount);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('portfolio-data-changed', loadNoticeCount); };
  }, [isAdmin]);
  useEffect(() => {
    const onError = (event) => reportClientIssue('interface', event.message || 'Browser runtime error', event.filename ? `${event.filename}:${event.lineno || 0}:${event.colno || 0}` : 'window.error');
    const onRejection = (event) => reportClientIssue('runtime', event.reason?.message || String(event.reason || 'Unhandled promise rejection'), 'window.unhandledrejection');
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => { window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onRejection); };
  }, []);
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr'; writePreference('portfolio-language', lang); }, [lang]);
  useEffect(() => { document.documentElement.dataset.theme = theme; writePreference('portfolio-theme', theme); const themeMeta = document.querySelector('meta[name="theme-color"]'); if (themeMeta) themeMeta.content = theme === 'dark' ? '#151b18' : '#f7f8f6'; }, [theme]);
  let postKey = articleId;
  if (articleId) {
    try { postKey = decodeURIComponent(articleId); } catch (_) { /* Invalid encoded URLs have no matching post. */ }
  }
  const currentPost = postKey ? data.posts.find((post) => post.slug === postKey || post.id === postKey) : null;
  useEffect(() => {
    const page = isBlog ? (lang === 'fa' ? 'وبلاگ' : 'Blog') : isProjects ? (lang === 'fa' ? 'پروژه‌ها' : 'Projects') : articleId ? localized(currentPost?.title, lang) : '';
    const title = page ? `${page} | Abbas Rohani Tabar` : (lang === 'fa' ? 'عباس روحانی‌تبار — توسعه‌دهنده فرانت‌اند' : 'Abbas Rohani Tabar — Frontend Developer');
    const description = articleId && currentPost ? localized(currentPost.excerpt, lang) : isBlog ? (lang === 'fa' ? 'مقاله‌ها و یادداشت‌ها درباره طراحی و توسعه وب.' : 'Articles and notes about design and web development.') : isProjects ? (lang === 'fa' ? 'پروژه‌ها و دموهای توسعه وب عباس روحانی‌تبار.' : 'Web projects and demos by Abbas Rohani Tabar.') : (lang === 'fa' ? 'پروژه‌ها، مهارت‌ها و تجربه‌های کاری عباس روحانی‌تبار.' : 'Projects, skills and work experience of Abbas Rohani Tabar.');
    document.title = title;
    const setMeta = (selector, attribute, value) => { const tag = document.querySelector(selector); if (tag) tag.setAttribute(attribute, value); };
    setMeta('meta[name="description"]', 'content', description);
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:locale"]', 'content', lang === 'fa' ? 'fa_IR' : 'en_US');
    setMeta('meta[name="robots"]', 'content', isAdmin || (articleId && !currentPost) ? 'noindex,nofollow' : 'index,follow');
  }, [lang, isBlog, isProjects, isAdmin, articleId, currentPost]);
  useEffect(() => { if (notice) { const timer = setTimeout(() => setNotice(''), 4500); return () => clearTimeout(timer); } }, [notice]);
  useEffect(() => {
    const updateVisibility = () => setShowBackToTop(window.scrollY > 320);
    updateVisibility();
    window.addEventListener('scroll', updateVisibility, { passive: true });
    return () => window.removeEventListener('scroll', updateVisibility);
  }, []);
  useEffect(() => {
    let lastScrollY = window.scrollY;
    const updateHeader = () => {
      const currentScrollY = window.scrollY;
      if (menuOpen) { setHeaderHidden(false); lastScrollY = currentScrollY; return; }
      if (Math.abs(currentScrollY - lastScrollY) < 8) return;
      setHeaderHidden(currentScrollY > 100 && currentScrollY > lastScrollY);
      lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', updateHeader, { passive: true });
    return () => window.removeEventListener('scroll', updateHeader);
  }, [menuOpen]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);
  useLayoutEffect(() => {
    const sectionId = sectionIdsByPath[pathname] || location.hash.slice(1);
    if (sectionId) document.getElementById(sectionId)?.scrollIntoView({ behavior: 'instant' });
    else if (pathname === '/') window.scrollTo(0, 0);
    setMenuOpen(false);
  }, [location.pathname, location.hash, pathname]);
  useEffect(() => {
    if ((pathname !== '/' && !sectionIdsByPath[pathname]) || isAdmin || isBlog || isProjects || articleId) return undefined;
    const sections = Array.from(document.querySelectorAll('main section[id]'));
    if (!sections.length) return undefined;
    let frame = 0;
    const updateHash = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const threshold = window.innerHeight * 0.36;
        let active = sections[0];
        sections.forEach((section) => {
          if (section.getBoundingClientRect().top <= threshold) active = section;
        });
        const nextPath = active.id === 'home' ? '/' : sectionPaths[active.id] || `/${active.id}`;
        if (window.location.pathname !== nextPath) window.history.replaceState(window.history.state, '', `${nextPath}${window.location.search}`);
      });
    };
    updateHash();
    window.addEventListener('scroll', updateHash, { passive: true });
    window.addEventListener('resize', updateHash);
    return () => {
      window.removeEventListener('scroll', updateHash);
      window.removeEventListener('resize', updateHash);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [pathname, isAdmin, isBlog, isProjects, articleId]);
  // Web Components
  // Header
  return <div className={`site-shell ${isAdmin ? 'admin-shell' : ''}`}>
    <header className={`topbar${headerHidden && !menuOpen ? ' is-hidden' : ''}${menuOpen ? ' menu-open' : ''}`}>
      <a className="brand" href="/" aria-label="Abbas home"><img src={logo} fetchPriority="low" alt="" /><span>AbbasRt<span className="brand-dot">.</span></span></a>
      {!isAdmin && <><button className="nav-toggle" type="button" aria-label={lang === 'fa' ? 'باز و بسته کردن منو' : 'Toggle navigation'} aria-controls="primary-navigation" aria-expanded={menuOpen} onClick={() => { setMenuOpen((open) => !open); setHeaderHidden(false); }}>{menuOpen ? '×' : '☰'}</button><nav id="primary-navigation" className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label={lang === 'fa' ? 'منوی اصلی' : 'Main navigation'}>{t.nav.map((label, i) => <Link key={label} to={['/', sectionPaths.about, sectionPaths.skills, '/projects', '/blog', sectionPaths.contact][i]} {...(i === 3 || i === 4 ? { target: '_blank', rel: 'noopener noreferrer' } : {})} onClick={() => setMenuOpen(false)}>{label}</Link>)}{data.resume && <a className="resume-nav-link" href={data.resume} download aria-label={lang === 'fa' ? '\u062F\u0627\u0646\u0644\u0648\u062F \u0631\u0632\u0648\u0645\u0647' : 'Download resume'} onClick={() => setMenuOpen(false)}><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m-5-5 5 5 5-5M4 19h16" /></svg><span>{lang === 'fa' ? '\u0631\u0632\u0648\u0645\u0647' : 'Resume'}</span></a>}</nav></>}
      <div className="top-actions">
        <PushToggle lang={lang} notify={setNotice} />
        <button className="icon-button" onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')} aria-label={lang === 'fa' ? 'Switch to English' : 'تغییر زبان به فارسی'}>{t.language}</button>
        <button className="icon-button theme-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={theme === 'light' ? t.themeDark : t.themeLight}>{theme === 'light' ? '☾' : '☀'}</button>
      </div>
    </header>
    <RuntimeErrorBoundary lang={lang}><Suspense fallback={isAdmin ? <main className="admin-main"><div className="admin-card auth-card" role="status" aria-label={t.loading}><span className="skeleton-block skeleton-title" /><span className="skeleton-block skeleton-line" /></div></main> : <main className="section-wrap page-skeleton" aria-label={t.loading}><span className="skeleton-block skeleton-title" /><span className="skeleton-block skeleton-line" /></main>}>{isAdmin ? <AdminPage t={t} lang={lang} data={data} refresh={refresh} onCareerSaved={updateCareer} notify={setNotice} unresolvedNoticeCount={unresolvedNoticeCount} setUnresolvedNoticeCount={setUnresolvedNoticeCount} api={api} uploadImage={uploadImage} localized={localized} translatedError={translatedError} skillLogos={skillLogos} /> : initialLoading ? <main className="section-wrap page-skeleton" role="status" aria-label={t.loading}><span className="skeleton-block skeleton-title" /><span className="skeleton-block skeleton-line" /><div className="skeleton-cards"><span className="skeleton-block" /><span className="skeleton-block" /><span className="skeleton-block" /></div></main> : isBlog ? <BlogPage posts={data.posts} lang={lang} t={t} ads={data.ads} socials={data.socials} /> : isProjects ? <ProjectsPage projects={data.projects} lang={lang} t={t} ads={data.ads} socials={data.socials} hostname={hostname} protocol={protocol} /> : articleId ? <ArticlePage key={articleId} post={currentPost} posts={data.posts} lang={lang} t={t} notify={setNotice} onPostUpdated={updatePost} ads={data.ads} socials={data.socials} /> : <main>
      <Hero lang={lang} images={{ mobile: portraitMobile, desktop: portraitDesktop }} Link={Link} priority={!sectionIdsByPath[pathname]} />

      <section className="intro-strip"><div className="section-wrap intro-inner"><span className="eyebrow">{t.about}</span><p>{t.fallbackAbout}</p></div></section>
      {!belowFoldReady && pathname === '/' && <div className="deferred-page-space" aria-hidden="true" />}
      {(belowFoldReady || pathname !== '/') && <>

      <section className="section-wrap content-section" id="about"><SectionHeading title={t.about} subtitle={lang === 'fa' ? 'ترکیب کنجکاوی و کدنویسی' : 'Curiosity, translated into code'} /><div className="about-grid"><p className="about-lead">{t.fallbackAbout}</p><div className="about-notes"><div><p>{lang === 'fa' ? 'به یادگیری مداوم و تجربه‌کردن ابزارهای تازه علاقه دارم.' : 'I enjoy learning continuously and trying useful new tools.'}</p></div><div><p>{lang === 'fa' ? 'برای دسترس‌پذیری، جزئیات بصری و تجربه موبایل اهمیت قائلم.' : 'I care about accessibility, visual detail and the mobile experience.'}</p></div></div></div></section>

      <section className="section-wrap content-section" id="experience"><SectionHeading title={lang === 'fa' ? 'سابقهٔ کاری' : 'Work experience'} subtitle={lang === 'fa' ? 'مسیر حرفه‌ای و تجربه‌های کاری' : 'My professional path and experience'} /><CareerTimeline career={data.career} skills={data.skills} lang={lang} /></section>

      <section className="skills-section" id="skills"><div className="section-wrap content-section"><SectionHeading title={t.skills} subtitle={lang === 'fa' ? 'ابزارهایی که هر روز بهترشان می‌کنم' : 'Tools I keep getting better at'} /><div className="skill-grid">{data.skills.map((skill) => <article className="skill-card" key={skill.id || skill.name}><div className="skill-logo-wrap"><AdaptiveLogo className="skill-logo" src={skill.iconUrl || skillLogos[skill.name]} alt={skill.name} loading="lazy" /></div><h3>{skill.name}</h3></article>)}</div></div></section>

      <section className="section-wrap content-section" id="projects"><SectionHeading title={t.projects} subtitle={lang === 'fa' ? 'چیزهایی که ساخته‌ام و در حال ساختشان هستم' : 'Things I have built and keep building'} /><div className="project-grid">{latestProjects.map((project, index) => <ProjectCard key={project.id} project={project} lang={lang} t={t} index={index} hostname={hostname} protocol={protocol} priority={pathname === '/featured-projects' && index === 0} eager={pathname === '/featured-projects' && index === 1} />)}</div><div className="section-more"><Link to="/projects" target="_blank" rel="noopener noreferrer">{lang === 'fa' ? 'دیدن همه پروژه‌ها' : 'View all projects'}</Link></div></section>

      <section className="blog-section" id="blog"><div className="section-wrap content-section"><SectionHeading title={t.blog} subtitle={lang === 'fa' ? 'یادداشت‌هایی از مسیر یادگیری و ساختن' : 'Notes from learning and building'} /><div className="blog-grid">{latestPosts.map((post, index) => <PostPreview key={post.id} post={post} lang={lang} priority={pathname === '/latest-posts' && index === 0} />)}</div>{!latestPosts.length && <p className="empty-state">{t.emptyPosts}</p>}<div className="section-more"><Link to="/blog" target="_blank" rel="noopener noreferrer">{lang === 'fa' ? 'دیدن همه مطالب' : 'View all articles'}</Link></div></div></section>

      <section className="contact-section" id="contact"><div className="section-wrap contact-inner"><span className="eyebrow">{t.contact}</span><h2>{lang === 'fa' ? <>یک ایده خوب<br /><span className="accent-text">از یک گفت‌وگو شروع می‌شود.</span></> : <>Good work starts<br /><span className="accent-text">with a conversation.</span></>}</h2><p>{t.contactText}</p><div className="contact-actions"><a className="button button-light" href="https://mail.google.com/mail/a.rohanitabar@gmail.com">{lang === 'fa' ? 'ایمیل به من' : 'Email me'}</a></div><ContactForm t={t} lang={lang} /></div></section></>}
    </main>}</Suspense></RuntimeErrorBoundary>
    <footer className="site-footer"><span>© {new Date().getFullYear()} Abbas Rohani Tabar</span><div className="social-icons" aria-label={lang === 'fa' ? 'شبکه‌های اجتماعی' : 'Social accounts'}>{data.socials.map((account) => <a key={account.id} href={account.href} target="_blank" rel="noreferrer" aria-label={lang === 'fa' ? 'پیوند شبکه اجتماعی' : 'Social profile'}><AdaptiveLogo src={account.iconUrl} alt="" loading="lazy" /></a>)}</div></footer>
    {!isAdmin && showBackToTop && <button className="back-to-top" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label={lang === 'fa' ? '\u0628\u0627\u0632\u06af\u0634\u062a \u0628\u0647 \u0628\u0627\u0644\u0627' : 'Back to top'} title={lang === 'fa' ? '\u0628\u0627\u0632\u06af\u0634\u062a \u0628\u0647 \u0628\u0627\u0644\u0627' : 'Back to top'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg></button>}{notice && <div className="toast-message" role="status">{notice}</div>}
  </div>;
}

function SectionHeading({ title, subtitle }) { return <div className="section-heading"><div><h2>{title}</h2><p>{subtitle}</p></div><span className="heading-line" /></div>; }

function ContactForm({ t, lang }) {
  const formRef = React.useRef(null);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    setStatus('');
    try {
      const fields = Object.fromEntries(new FormData(formRef.current).entries());
      if (!fields.email && !fields.phone) throw new Error(lang === 'fa' ? 'ایمیل یا شماره تلفن خود را وارد کنید.' : 'Enter an email address or phone number.');
      await api('/api/contact', { method: 'POST', body: JSON.stringify(fields) });
      formRef.current.reset();
      setStatus(t.messageSent);
    } catch (error) {
      setStatus(error.message === 'Enter an email address or phone number.' || error.message.includes('تلفن') ? error.message : t.messageFailed);
    } finally { setSending(false); }
  };
  return <form ref={formRef} className="contact-form" method="post" onSubmit={submit}>
    <div className="form-columns"><label className="field-label">{t.name}<input name="name" required maxLength="80" autoComplete="name" /></label><label className="field-label">{t.email}<input type="email" name="email" maxLength="254" autoComplete="email" /></label><label className="field-label">{lang === 'fa' ? 'شماره تلفن' : 'Phone number'}<input type="tel" name="phone" maxLength="30" autoComplete="tel" /></label></div>
    <label className="field-label">{t.message}<textarea name="message" required minLength="4" maxLength="5000" rows="5" /></label><input className="contact-honeypot" type="text" name="website" tabIndex="-1" autoComplete="off" aria-hidden="true" />
    <button className="button button-light" disabled={sending}>{sending ? t.sending : t.sendMessage}</button>
    {status && <p className="contact-status" role="status">{status}</p>}
  </form>;
}
