/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import AdaptiveLogo from '../components/ui/AdaptiveLogo';
import SortableList from '../components/ui/SortableList';
import PushToggle from '../features/notifications/PushNotifications';
import ProjectDeployments from '../features/projects/ProjectDeployments';
import { ArticleEditor, ArticlePage, BlogPage, PostPreview, ProjectCard, ProjectsPage, newestFirst } from '../features/editorial/Editorial';
import { AdminAd, AdminComments, AdminMessages, AdminPush } from '../features/admin/AdminExtras';
import CareerAdmin from '../features/career/CareerAdmin';
import CareerTimeline from '../features/career/CareerTimeline';
import AdminNotices from '../features/admin/AdminNotices';
import RuntimeErrorBoundary from '../components/ui/RuntimeErrorBoundary';
import { monitoredFetch, reportClientIssue } from '../lib/diagnostics';
import portrait from '../assets/images/Abbas.jpg';
import logo from '../assets/images/Logo.jpg';

const copy = {
    fa: {
    nav: ['خانه', 'درباره من', 'مهارت‌ها', 'پروژه‌ها', 'وبلاگ', 'تماس'], heroEyebrow: 'طراحی و توسعه وب', heroTitle: 'من عباس روحانی‌تبار هستم.', heroText: 'توسعه‌دهنده فرانت‌اند؛ عاشق ساخت تجربه‌های وب سریع، ساده و کاربردی.', projects: 'پروژه‌های منتخب', skills: 'مهارت‌های من', about: 'درباره من', blog: 'یادداشت‌های تازه', contact: 'بیایید با هم کار کنیم', contactText: 'برای همکاری، پیشنهاد یا گفت‌وگو پیام بده.', resume: 'دریافت رزومه PDF', viewDemo: 'مشاهده دمو', source: 'کد منبع', read: 'ادامه مطلب', like: 'پسندیدن', liked: 'پسندیدم', comments: 'دیدگاه‌ها', commentPlaceholder: 'دیدگاهت را بنویس...', send: 'ارسال دیدگاه', share: 'اشتراک‌گذاری', emptyPosts: 'به‌زودی نوشته‌های تازه منتشر می‌شوند.', emptyProjects: 'پروژه‌های تازه به‌زودی اینجا قرار می‌گیرند.', admin: 'ورود مدیر', themeLight: 'حالت روشن', themeDark: 'حالت تیره', language: 'English', name: 'نام', email: 'ایمیل', message: 'پیام', sendMessage: 'ارسال پیام', messageSent: 'پیام با موفقیت ارسال شد.', messageFailed: 'ارسال پیام ناموفق بود. کمی بعد دوباره تلاش کن.', sending: 'در حال ارسال...', setupTitle: 'راه‌اندازی مدیر سایت', setupHelp: 'کلید راه‌اندازی را از فایل محیطی سرور وارد کن، سپس نام کاربری و رمز خودت را بساز.', setupKey: 'کلید راه‌اندازی', username: 'نام کاربری', password: 'رمز عبور', loginTitle: 'ورود به پنل مدیریت', login: 'ورود', createAdmin: 'ساخت حساب مدیر', panel: 'پنل مدیریت', logout: 'خروج', addSkill: 'افزودن مهارت', skillName: 'نام مهارت', add: 'افزودن', manage: 'مدیریت محتوا', newPost: 'انتشار نوشته', titleFa: 'عنوان فارسی', titleEn: 'عنوان انگلیسی', excerptFa: 'خلاصه فارسی', excerptEn: 'خلاصه انگلیسی', bodyFa: 'متن فارسی', bodyEn: 'متن انگلیسی', imageUrl: 'آدرس تصویر (اختیاری)', publish: 'انتشار', newProject: 'افزودن پروژه', descriptionFa: 'توضیح فارسی', descriptionEn: 'توضیح انگلیسی', demoUrl: 'لینک دمو', repoUrl: 'لینک مخزن کد', addProject: 'ثبت پروژه', uploadResume: 'بارگذاری رزومه PDF', noResume: 'هنوز رزومه‌ای بارگذاری نشده است.', commentsAdmin: 'مدیریت دیدگاه‌ها', delete: 'حذف', loading: 'در حال بارگذاری...', setupMissing: 'برای فعال‌کردن پنل، ADMIN_SETUP_KEY را در فایل .env سرور تنظیم و سرور را دوباره اجرا کن.', fallbackAbout: 'من عباس روحانی‌تبار هستم؛ توسعه‌دهنده فرانت‌اند علاقه‌مند به یادگیری، طراحی رابط کاربری و ساخت محصولاتی که استفاده از آن‌ها ساده و لذت‌بخش باشد.'
  },
  en: {
    nav: ['Home', 'About', 'Skills', 'Projects', 'Blog', 'Contact'], heroEyebrow: 'Web design & development', heroTitle: 'I’m Abbas Rohani Tabar.', heroText: 'Frontend developer who enjoys building fast, clear and useful web experiences.', projects: 'Selected projects', skills: 'What I work with', about: 'A little about me', blog: 'Latest writing', contact: 'Let’s work together', contactText: 'Have an opportunity, an idea or just want to say hello?', resume: 'Download résumé PDF', viewDemo: 'Live demo', source: 'Source code', read: 'Read article', like: 'Like', liked: 'Liked', comments: 'Comments', commentPlaceholder: 'Write a comment...', send: 'Post comment', share: 'Share', emptyPosts: 'Fresh articles are on their way.', emptyProjects: 'New projects will show up here soon.', admin: 'Admin sign in', themeLight: 'Light mode', themeDark: 'Dark mode', language: 'فارسی', name: 'Name', email: 'Email', message: 'Message', sendMessage: 'Send message', messageSent: 'Your message was sent.', messageFailed: 'Message could not be sent. Please try again shortly.', sending: 'Sending...', setupTitle: 'Set up your admin account', setupHelp: 'Enter the server setup key, then choose your own username and password.', setupKey: 'Setup key', username: 'Username', password: 'Password', loginTitle: 'Admin sign in', login: 'Sign in', createAdmin: 'Create admin account', panel: 'Admin panel', logout: 'Sign out', addSkill: 'Add a skill', skillName: 'Skill name', add: 'Add', manage: 'Content management', newPost: 'Publish a post', titleFa: 'Persian title', titleEn: 'English title', excerptFa: 'Persian summary', excerptEn: 'English summary', bodyFa: 'Persian article', bodyEn: 'English article', imageUrl: 'Image URL (optional)', publish: 'Publish', newProject: 'Add a project', descriptionFa: 'Persian description', descriptionEn: 'English description', demoUrl: 'Demo URL', repoUrl: 'Repository URL', addProject: 'Save project', uploadResume: 'Upload PDF résumé', noResume: 'No résumé has been uploaded yet.', commentsAdmin: 'Manage comments', delete: 'Delete', loading: 'Loading...', setupMissing: 'Set ADMIN_SETUP_KEY in the server .env file and restart the server to enable setup.', fallbackAbout: 'I’m Abbas Rohani Tabar, a frontend developer who enjoys learning, interface design and building products that feel simple and pleasant to use.'
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
async function uploadImage(file, type) {
  if (!file) throw new Error('Choose an image file.');
  if (file.size > 3 * 1024 * 1024) throw new Error('Image file exceeds 3 MB.');
  let imageFile = file;
  if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    const previewUrl = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = previewUrl; await image.decode();
      const scale = Math.min(1, 1200 / Math.max(image.naturalWidth || 512, image.naturalHeight || 512));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round((image.naturalWidth || 512) * scale)); canvas.height = Math.max(1, Math.round((image.naturalHeight || 512) * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not convert the SVG logo.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const png = await new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Could not convert the SVG logo.')), 'image/png'));
      imageFile = new File([png], file.name.replace(/\.svg$/i, '.png'), { type: 'image/png' });
    } finally { URL.revokeObjectURL(previewUrl); }
  }
  const response = await fetch(`/api/admin/media?type=${encodeURIComponent(type)}`, { method: 'POST', body: imageFile, credentials: 'same-origin', headers: { 'Content-Type': imageFile.type } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) { if (response.status === 401) window.dispatchEvent(new Event('portfolio-auth-expired')); throw Object.assign(new Error(result.error || 'Image upload failed.'), { status: response.status }); }
  return result.url;
}
const localized = (value, lang) => typeof value === 'string' ? value : value?.[lang] || value?.en || value?.fa || '';
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
    'Links must use HTTP or HTTPS.': 'لینک باید با http:// یا https:// شروع شود.',
    'Incorrect setup key.': 'کلید راه‌اندازی درست نیست.',
    'The uploaded file is not a valid PDF.': 'فایل انتخاب‌شده PDF معتبر نیست.',
    'Could not convert the SVG logo.': 'تبدیل فایل SVG انجام نشد؛ لطفاً PNG یا JPG انتخاب کن.',
    'Image upload failed.': 'بارگذاری تصویر انجام نشد؛ اتصال API را بررسی کن.'
  };
  if (/failed to fetch|networkerror/i.test(message)) return 'ارتباط با سرور برقرار نشد؛ مطمئن شو API روی پورت ۵۰۰۰ اجراست.';
  return messages[message] || message || 'درخواست انجام نشد؛ اتصال سرور را بررسی کن.';
};

export default function Portfolio() {
  const location = useLocation();
  const [lang, setLang] = useState(() => localStorage.getItem('portfolio-language') || 'fa');
  const [theme, setTheme] = useState(() => localStorage.getItem('portfolio-theme') || 'light');
  const [data, setData] = useState({ skills: initialSkills, projects: initialProjects, posts: initialPosts, socials: initialSocials, resume: null, ads: [], messages: [], career: { noExperience: false, companies: [] } });
  const [notice, setNotice] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [unresolvedNoticeCount, setUnresolvedNoticeCount] = useState(0);
  const latestDataRequest = useRef(0);
  const t = copy[lang];
  const pathname = location.pathname.replace(/\/$/, '') || '/';
  const isAdmin = pathname === '/admin';
  const isBlog = pathname === '/blog';
  const isProjects = pathname === '/projects';
  const articleId = pathname.startsWith('/blog/') ? pathname.slice('/blog/'.length) : null;
  const latestPosts = newestFirst(data.posts.filter((post) => post.published !== false));
  const latestProjects = data.projects;
  const refresh = useCallback(async () => {
    const requestId = ++latestDataRequest.current;
    try {
      const next = await api('/api/site-data');
      // StrictMode and admin actions can trigger overlapping refreshes. Ignore an
      // older response so it cannot replace a newer career setting on screen.
      if (requestId !== latestDataRequest.current) return;
      setData({ ...next, skills: next.skills || initialSkills, projects: next.projects || initialProjects, posts: next.posts || initialPosts, socials: next.socials || initialSocials, ads: next.ads || [], career: next.career || { noExperience: false, companies: [] } });
    } catch (_) { /* Demo content remains available until the API is started. */ }
  }, []);
  const updateCareer = useCallback((career) => {
    // A successful save is newer than any site-data request already in flight.
    latestDataRequest.current += 1;
    setData((current) => ({ ...current, career }));
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!isAdmin) return undefined;
    let active = true;
    const loadNoticeCount = async () => {
      try {
        const response = await fetch('/api/admin/notices', { credentials: 'same-origin' });
        if (!response.ok) return;
        const result = await response.json();
        if (active) setUnresolvedNoticeCount(Array.isArray(result.notices) ? result.notices.length : 0);
      } catch (_) { /* Keep the last known count while the server is unavailable. */ }
    };
    loadNoticeCount();
    const timer = window.setInterval(loadNoticeCount, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [isAdmin]);
  useEffect(() => {
    const onError = (event) => reportClientIssue('interface', event.message || 'Browser runtime error', event.filename ? `${event.filename}:${event.lineno || 0}:${event.colno || 0}` : 'window.error');
    const onRejection = (event) => reportClientIssue('runtime', event.reason?.message || String(event.reason || 'Unhandled promise rejection'), 'window.unhandledrejection');
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => { window.removeEventListener('error', onError); window.removeEventListener('unhandledrejection', onRejection); };
  }, []);
  useEffect(() => { document.documentElement.lang = lang; document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr'; localStorage.setItem('portfolio-language', lang); }, [lang]);
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('portfolio-theme', theme); const themeMeta = document.querySelector('meta[name="theme-color"]'); if (themeMeta) themeMeta.content = theme === 'dark' ? '#151b18' : '#f7f8f6'; }, [theme]);
  const currentPost = articleId ? data.posts.find((post) => encodeURIComponent(post.slug || post.id) === articleId || encodeURIComponent(post.id) === articleId) : null;
  useEffect(() => { const page = isBlog ? (lang === 'fa' ? 'وبلاگ' : 'Blog') : isProjects ? (lang === 'fa' ? 'پروژه‌ها' : 'Projects') : articleId ? localized(currentPost?.title, lang) : ''; document.title = page ? `${page} | Abbas Rohani Tabar` : (lang === 'fa' ? 'عباس روحانی‌تبار — توسعه‌دهنده فرانت‌اند' : 'Abbas Rohani Tabar — Frontend Developer'); }, [lang, isBlog, isProjects, articleId, currentPost]);
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
      if (Math.abs(currentScrollY - lastScrollY) < 8) return;
      setHeaderHidden(currentScrollY > 100 && currentScrollY > lastScrollY);
      lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', updateHeader, { passive: true });
    return () => window.removeEventListener('scroll', updateHeader);
  }, []);
  useEffect(() => { if (location.hash) requestAnimationFrame(() => document.getElementById(location.hash.slice(1))?.scrollIntoView()); else window.scrollTo(0, 0); setMenuOpen(false); }, [location.pathname, location.hash]);
  useEffect(() => {
    if (pathname !== '/' || isAdmin) return undefined;
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
        const hash = active.id === 'home' ? '' : `#${active.id}`;
        if (window.location.hash !== hash) window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${hash}`);
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
  }, [pathname, isAdmin]);
  // Web Components
  // Header
  return <div className={`site-shell ${isAdmin ? 'admin-shell' : ''}`}>
    <header className={`topbar${headerHidden ? ' is-hidden' : ''}`}>
      <a className="brand" href="/" aria-label="Abbas home"><img src={logo} alt="" /><span>AbbasRt<span className="brand-dot">.</span></span></a>
      {!isAdmin && <><button className="nav-toggle" type="button" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? '×' : '☰'}</button><nav className={`main-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main navigation">{t.nav.map((label, i) => <Link key={label} to={i === 3 ? '/projects' : i === 4 ? '/blog' : i === 0 ? '/' : `/#${['','about','skills','','','contact'][i]}`} {...(i === 3 || i === 4 ? { target: '_blank', rel: 'noopener noreferrer' } : {})} onClick={() => setMenuOpen(false)}>{label}</Link>)}</nav></>}
      <div className="top-actions">
        <PushToggle lang={lang} notify={setNotice} />
        <button className="icon-button" onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')} aria-label={lang === 'fa' ? 'Switch to English' : 'تغییر زبان به فارسی'}>{t.language}</button>
        <button className="icon-button theme-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={theme === 'light' ? t.themeDark : t.themeLight}>{theme === 'light' ? '☾' : '☀'}</button>
      </div>
    </header>
    <RuntimeErrorBoundary lang={lang}>{isAdmin ? <AdminPage t={t} lang={lang} data={data} refresh={refresh} onCareerSaved={updateCareer} notify={setNotice} unresolvedNoticeCount={unresolvedNoticeCount} setUnresolvedNoticeCount={setUnresolvedNoticeCount} /> : isBlog ? <BlogPage posts={data.posts} lang={lang} t={t} ads={data.ads} socials={data.socials} /> : isProjects ? <ProjectsPage projects={data.projects} lang={lang} t={t} ads={data.ads} socials={data.socials} /> : articleId ? <ArticlePage post={currentPost} posts={data.posts} lang={lang} t={t} notify={setNotice} refresh={refresh} ads={data.ads} socials={data.socials} /> : <main>
      <section className="hero section-wrap" id="home">
        <div className="hero-copy"><span className="eyebrow"><span className="status-dot" />{t.heroEyebrow}</span><h1><span className="hero-name">{t.heroTitle}</span><span className="hero-slogan accent-text">{lang === 'fa' ? 'وب را با ایده‌ها زنده می‌کنم.' : 'I bring ideas to the web.'}</span></h1><p>{t.heroText}</p><div className="hero-actions"><a className="button button-primary" href="#projects">{t.projects}</a><a className="text-link" href="#contact">{t.contact}</a></div></div>
        <div className="hero-visual"><div className="portrait-glow" /><div className="portrait-frame"><img src={portrait} alt={lang === 'fa' ? 'عباس روحانی‌تبار' : 'Abbas Rohani Tabar'} /></div><span className="floating-chip chip-top">{lang === 'fa' ? 'توسعه فرانت‌اند' : 'Frontend developer'}</span><span className="floating-chip chip-bottom"><span className="status-dot" /> {lang === 'fa' ? 'آماده همکاری' : 'Open to work'}</span></div>
      </section>

      <section className="intro-strip"><div className="section-wrap intro-inner"><span className="eyebrow">{t.about}</span><p>{t.fallbackAbout}</p></div></section>

      <section className="section-wrap content-section" id="about"><SectionHeading title={t.about} subtitle={lang === 'fa' ? 'ترکیب کنجکاوی و کدنویسی' : 'Curiosity, translated into code'} /><div className="about-grid"><p className="about-lead">{t.fallbackAbout}</p><div className="about-notes"><div><p>{lang === 'fa' ? 'به یادگیری مداوم و تجربه‌کردن ابزارهای تازه علاقه دارم.' : 'I enjoy learning continuously and trying useful new tools.'}</p></div><div><p>{lang === 'fa' ? 'برای دسترس‌پذیری، جزئیات بصری و تجربه موبایل اهمیت قائلم.' : 'I care about accessibility, visual detail and the mobile experience.'}</p></div></div></div></section>

      <section className="section-wrap content-section" id="experience"><SectionHeading title={lang === 'fa' ? 'سابقهٔ کاری' : 'Work experience'} subtitle={lang === 'fa' ? 'مسیر حرفه‌ای و تجربه‌های کاری' : 'My professional path and experience'} /><CareerTimeline career={data.career} lang={lang} /></section>

      <section className="skills-section" id="skills"><div className="section-wrap content-section"><SectionHeading title={t.skills} subtitle={lang === 'fa' ? 'ابزارهایی که هر روز بهترشان می‌کنم' : 'Tools I keep getting better at'} /><div className="skill-grid">{data.skills.map((skill) => <article className="skill-card" key={skill.id || skill.name}><div className="skill-logo-wrap"><AdaptiveLogo className="skill-logo" src={skill.iconUrl || skillLogos[skill.name]} alt={skill.name} loading="lazy" /></div><h3>{skill.name}</h3></article>)}</div></div></section>

      <section className="section-wrap content-section" id="projects"><SectionHeading title={t.projects} subtitle={lang === 'fa' ? 'چیزهایی که ساخته‌ام و در حال ساختشان هستم' : 'Things I have built and keep building'} /><div className="project-grid">{latestProjects.slice(0, 5).map((project, index) => <ProjectCard key={project.id} project={project} lang={lang} t={t} index={index} />)}</div><div className="section-more"><Link to="/projects" target="_blank" rel="noopener noreferrer">{lang === 'fa' ? 'دیدن همه پروژه‌ها' : 'View all projects'}</Link></div></section>

      <section className="blog-section" id="blog"><div className="section-wrap content-section"><SectionHeading title={t.blog} subtitle={lang === 'fa' ? 'یادداشت‌هایی از مسیر یادگیری و ساختن' : 'Notes from learning and building'} /><div className="blog-grid">{latestPosts.slice(0, 5).map((post) => <PostPreview key={post.id} post={post} lang={lang} />)}</div>{!latestPosts.length && <p className="empty-state">{t.emptyPosts}</p>}<div className="section-more"><Link to="/blog" target="_blank" rel="noopener noreferrer">{lang === 'fa' ? 'دیدن همه مطالب' : 'View all articles'}</Link></div></div></section>

      <section className="contact-section" id="contact"><div className="section-wrap contact-inner"><span className="eyebrow">{t.contact}</span><h2>{lang === 'fa' ? <>یک ایده خوب<br /><span className="accent-text">از یک گفت‌وگو شروع می‌شود.</span></> : <>Good work starts<br /><span className="accent-text">with a conversation.</span></>}</h2><p>{t.contactText}</p><div className="contact-actions"><a className="button button-light" href="https://mail.google.com/mail/a.rohanitabar@gmail.com">{lang === 'fa' ? 'ایمیل به من' : 'Email me'}</a></div><ContactForm t={t} lang={lang} />{data.resume && <a className="button button-primary resume-link" href={data.resume} target="_blank" rel="noopener noreferrer">{lang === 'fa' ? '\u062f\u0631\u06cc\u0627\u0641\u062a \u0631\u0632\u0648\u0645\u0647 PDF' : t.resume}<span aria-hidden="true">↓</span></a>}</div></section>
    </main>}</RuntimeErrorBoundary>
    <footer className="site-footer"><span>© {new Date().getFullYear()} Abbas Rohani Tabar</span><div className="social-icons" aria-label={lang === 'fa' ? 'شبکه‌های اجتماعی' : 'Social accounts'}>{data.socials.map((account) => <a key={account.id} href={account.href} target="_blank" rel="noreferrer" aria-label={lang === 'fa' ? 'پیوند شبکه اجتماعی' : 'Social profile'}><AdaptiveLogo src={account.iconUrl} alt="" loading="lazy" /></a>)}</div></footer>
    {!isAdmin && showBackToTop && <button className="back-to-top" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label={lang === 'fa' ? '\u0628\u0627\u0632\u06af\u0634\u062a \u0628\u0647 \u0628\u0627\u0644\u0627' : 'Back to top'} title={lang === 'fa' ? '\u0628\u0627\u0632\u06af\u0634\u062a \u0628\u0647 \u0628\u0627\u0644\u0627' : 'Back to top'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg></button>}{notice && <div className="toast-message" role="status">{notice}</div>}
  </div>;
}

function SectionHeading({ title, subtitle }) { return <div className="section-heading"><div><h2>{title}</h2><p>{subtitle}</p></div><span className="heading-line" /></div>; }

function AdminPage({ t, lang, data, refresh, onCareerSaved, notify, unresolvedNoticeCount, setUnresolvedNoticeCount }) {
  const [status, setStatus] = useState(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('manage');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errorScope, setErrorScope] = useState('');
  const [savedScope, setSavedScope] = useState('');
  const [editingPost, setEditingPost] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [projectFormVersion, setProjectFormVersion] = useState(0);
  const [postCoverPreview, setPostCoverPreview] = useState('');
  const [projectImagePreview, setProjectImagePreview] = useState('');
  const [postFormVersion, setPostFormVersion] = useState(0);
  const [editingSkill, setEditingSkill] = useState(null);
  const unreadMessageCount = (data.messages || []).filter((message) => !message.read).length;
  const commentCount = (data.posts || []).reduce((total, post) => total + (Array.isArray(post.comments) ? post.comments.length : 0), 0);
  const inboxCount = unreadMessageCount + commentCount;
  const [editingSocial, setEditingSocial] = useState(null);
  const [skillFormVersion, setSkillFormVersion] = useState(0);
  const [socialFormVersion, setSocialFormVersion] = useState(0);
  const [skillPreview, setSkillPreview] = useState('');
  const [socialPreview, setSocialPreview] = useState('');
  const run = async (work, scope = '') => { setBusy(true); setError(''); setErrorScope(scope); setSavedScope(''); try { await work(); return true; } catch (problem) { if (problem.status === 401) setAuthenticated(false); if (!problem.status || problem.status >= 500) void reportClientIssue(scope || 'api', problem.message, window.location.pathname); const message = translatedError(problem, lang); setError(message); notify(message); return false; } finally { setBusy(false); } };
  const saveOrder = (kind, ids) => {
    if (busy) return Promise.resolve(false);
    return run(async () => {
      await api(`/api/admin/${kind}/order`, { method: 'PUT', body: JSON.stringify({ ids }) });
      await refresh();
      notify(lang === 'fa' ? 'ترتیب ذخیره شد.' : 'Order saved.');
    }, kind === 'skills' ? 'skill' : kind === 'socials' ? 'social' : kind === 'projects' ? 'project' : 'ad');
  };
  const loadStatus = useCallback(async () => { try { const setup = await api('/api/admin/status'); if (setup.apiVersion !== 24) { setStatus({ outdated: true }); return; } const me = await api('/api/admin/me').catch(() => ({ authenticated: false })); setStatus(setup); setAuthenticated(me.authenticated); if (me.authenticated) await refresh(); } catch (_) { setStatus({ unavailable: true }); } }, [refresh]);
  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => { if (!authenticated) return undefined; window.addEventListener('focus', loadStatus); return () => window.removeEventListener('focus', loadStatus); }, [authenticated, loadStatus]);
  useEffect(() => { if (!authenticated) return undefined; const timer = window.setInterval(refresh, 30000); return () => window.clearInterval(timer); }, [authenticated, refresh]);
  useEffect(() => { const expire = () => setAuthenticated(false); window.addEventListener('portfolio-auth-expired', expire); return () => window.removeEventListener('portfolio-auth-expired', expire); }, []);
  useEffect(() => { if (skillPreview) return () => URL.revokeObjectURL(skillPreview); }, [skillPreview]);
  useEffect(() => { if (socialPreview) return () => URL.revokeObjectURL(socialPreview); }, [socialPreview]);
  useEffect(() => { if (postCoverPreview) return () => URL.revokeObjectURL(postCoverPreview); }, [postCoverPreview]);
  useEffect(() => { if (projectImagePreview) return () => URL.revokeObjectURL(projectImagePreview); }, [projectImagePreview]);
  const formAction = (event, endpoint, transform = (form) => Object.fromEntries(new FormData(form).entries())) => { event.preventDefault(); const form = event.currentTarget; const payload = transform(form); run(async () => { await api(endpoint, { method: 'POST', body: JSON.stringify(payload) }); form.reset(); if (endpoint === '/api/admin/setup' || endpoint === '/api/admin/login') { setAuthenticated(true); await refresh(); } if (endpoint === '/api/admin/posts' || endpoint === '/api/admin/projects' || endpoint === '/api/admin/skills') await refresh(); notify(lang === 'fa' ? 'تغییرات ذخیره شد.' : 'Changes saved.'); }); };
  const remove = (endpoint) => run(async () => { await api(endpoint, { method: 'DELETE' }); await refresh(); });
  const saveProject = (event) => { event.preventDefault(); const form = event.currentTarget; const fields = new FormData(form); const payload = Object.fromEntries(fields.entries()); payload.skillsUsed = fields.getAll('skillsUsed'); const position = payload.position; delete payload.position; const imageFile = fields.get('imageFile'); delete payload.imageFile; run(async () => { if (imageFile?.size) payload.image = await uploadImage(imageFile, 'project-image'); const savedProject = await api(editingProject ? `/api/admin/projects/${encodeURIComponent(editingProject.id)}` : '/api/admin/projects', { method: editingProject ? 'PUT' : 'POST', body: JSON.stringify(payload) }); const ordered = data.projects.filter((item) => item.id !== savedProject.id); const insertAt = position === 'first' ? 0 : Math.max(0, ordered.findIndex((item) => item.id === position) + 1); ordered.splice(insertAt, 0, savedProject); await api('/api/admin/projects/order', { method: 'PUT', body: JSON.stringify({ ids: ordered.map((item) => item.id) }) }); setEditingProject(null); setProjectImagePreview(''); setProjectFormVersion((version) => version + 1); await refresh(); notify(savedProject.translationStatus === 'pending' ? (lang === 'fa' ? 'پروژه ذخیره شد؛ ترجمهٔ انگلیسی در انتظار است. برای تلاش دوباره، پروژه را ویرایش و ذخیره کن.' : 'Project saved; English translation is pending. Edit and save again to retry.') : (lang === 'fa' ? 'پروژه و ترجمهٔ انگلیسی آن ذخیره شد.' : 'Project and English translation saved.')); }); };
  const savePost = (event) => {
    event.preventDefault();
      const form = event.currentTarget;
    if (form.querySelector('.editor-upload input:disabled')) { notify(lang === 'fa' ? 'صبر کن تا بارگذاری تصویر تمام شود.' : 'Wait for the image upload to finish.'); return; }
    const fields = new FormData(form);
    const payload = Object.fromEntries(fields.entries());
    const coverFile = fields.get('coverFile');
    const endpoint = editingPost ? `/api/admin/posts/${encodeURIComponent(editingPost.id)}` : '/api/admin/posts';
    run(async () => {
      if (coverFile?.size) payload.image = await uploadImage(coverFile, 'post-image');
      if (!payload.image) throw new Error(lang === 'fa' ? 'برای هر نوشته یک پوستر انتخاب یا بارگذاری کن.' : 'Choose or upload a poster for this post.');
      const savedPost = await api(endpoint, { method: editingPost ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      setEditingPost(null);
      setPostCoverPreview('');
      setPostFormVersion((version) => version + 1);
      await refresh();
      notify(savedPost.translationStatus === 'pending'
        ? (lang === 'fa' ? 'نوشته ذخیره شد؛ ترجمهٔ انگلیسی در انتظار است. برای تلاش دوباره، نوشته را ویرایش و ذخیره کن.' : 'Post saved; English translation is pending. Edit and save again to retry.')
        : (lang === 'fa' ? 'نوشته ذخیره شد.' : 'Post saved.'));
    });
  };
  const saveSkill = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const file = fields.get('logoFile');
    run(async () => {
      const iconUrl = file?.size ? await uploadImage(file, 'skill-logo') : String(fields.get('iconUrl') || '').trim();
      if (!iconUrl) throw new Error(lang === 'fa' ? 'یک لوگو بارگذاری کن یا لینک مستقیم تصویر بده.' : 'Upload a logo or enter a direct image URL.');
      const endpoint = editingSkill ? `/api/admin/skills/${encodeURIComponent(editingSkill.id)}` : '/api/admin/skills';
      await api(endpoint, { method: editingSkill ? 'PUT' : 'POST', body: JSON.stringify({ name: fields.get('name'), iconUrl }) });
      setEditingSkill(null); setSkillPreview(''); setSkillFormVersion((version) => version + 1); form.reset(); await refresh(); setSavedScope('skill'); notify(lang === 'fa' ? 'مهارت ذخیره شد.' : 'Skill saved.');
    }, 'skill');
  };
  const saveSocial = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const file = fields.get('logoFile');
    run(async () => {
      const iconUrl = file?.size ? await uploadImage(file, 'social-logo') : String(fields.get('iconUrl') || '').trim();
      if (!iconUrl) throw new Error(lang === 'fa' ? 'لوگوی شبکه را بارگذاری کن یا لینک مستقیم تصویر بده.' : 'Upload an icon or enter a direct image URL.');
      const endpoint = editingSocial ? `/api/admin/socials/${encodeURIComponent(editingSocial.id)}` : '/api/admin/socials';
      await api(endpoint, { method: editingSocial ? 'PUT' : 'POST', body: JSON.stringify({ href: fields.get('href'), iconUrl }) });
      form.reset(); setSocialPreview(''); setEditingSocial(null); setSocialFormVersion((version) => version + 1); await refresh(); setSavedScope('social'); notify(lang === 'fa' ? 'پیوند شبکه اجتماعی ذخیره شد.' : 'Social link saved.');
    }, 'social');
  };
  const postLabels = lang === 'fa'
    ? { title: 'عنوان فارسی', excerpt: 'خلاصه فارسی', body: 'متن فارسی', tags: 'هشتگ‌ها', translation: 'ترجمهٔ انگلیسی با سرویس محلی ساخته می‌شود؛ اگر سرویس خاموش باشد، متن فارسی ذخیره و ترجمه در ویرایش بعدی دوباره امتحان می‌شود.' }
    : { title: 'Persian title', excerpt: 'Persian summary', body: 'Persian article', tags: 'Hashtags', translation: 'English is generated by a local translation service. If it is offline, Persian is saved and translation can be retried by editing and saving again.' };
  if (!status) return <main className="admin-main"><p>{t.loading}</p></main>;
  if (status.unavailable) return <main className="admin-main"><div className="admin-card"><h1>{t.admin}</h1><p>{lang === 'fa' ? 'سرور مدیریت در دسترس نیست. طبق README، API را اجرا کن.' : 'The admin API is not running. Start the API as described in the README.'}</p></div></main>;
  if (status.outdated) return <main className="admin-main"><div className="admin-card"><h1>{t.admin}</h1><p role="alert">{lang === 'fa' ? 'نسخهٔ قدیمی سرور مدیریت هنوز در حال اجراست. ترمینال‌های قبلی سایت و API را متوقف کن، سپس npm start را اجرا و صفحه را تازه‌سازی کن.' : 'An older admin API is still running. Stop the previous website and API processes, run npm start, and refresh this page.'}</p></div></main>;
  if (!authenticated) return <main className="admin-main"><form className="admin-card auth-card" onSubmit={(event) => formAction(event, status.configured ? '/api/admin/login' : '/api/admin/setup')}><Link to="/" className="back-link">{lang === 'fa' ? 'بازگشت به سایت' : 'Back to site'}</Link><span className="eyebrow">SECURE AREA</span><h1>{status.configured ? t.loginTitle : t.setupTitle}</h1><p>{status.configured ? (lang === 'fa' ? 'برای مدیریت محتوا وارد حساب خودت شو.' : 'Sign in to manage your portfolio content.') : t.setupHelp}</p>{!status.configured && <Field label={t.setupKey} name="setupKey" type="password" required autoComplete="off" />}<Field label={t.username} name="username" required autoComplete="username" minLength="3" maxLength="32" /><Field label={t.password} name="password" type="password" required autoComplete={status.configured ? 'current-password' : 'new-password'} minLength="12" /><button className="button button-primary" disabled={busy}>{status.configured ? t.login : t.createAdmin}</button>{!status.configured && !status.setupAvailable && <p className="field-hint">{t.setupMissing}</p>}{error && <p className="error-text" role="alert">{error}</p>}</form></main>;
  return <main className="admin-main">
    <div className="admin-heading"><div><span className="eyebrow">SECURE AREA</span><h1>{t.panel}</h1></div><button className="button button-outline" onClick={() => run(async () => { await api('/api/admin/logout', { method: 'POST', body: '{}' }); setAuthenticated(false); await refresh(); await loadStatus(); })}>{t.logout}</button></div>
    <div className="admin-tabs" role="tablist" aria-label={lang === 'fa' ? 'بخش‌های پنل مدیریت' : 'Admin sections'}>
      {[['manage', lang === 'fa' ? 'مهارت‌ها، پروژه‌ها و دموساز' : 'Skills, projects & demo builder'], ['posts', lang === 'fa' ? 'انتشار نوشته' : 'Publish posts'], ['inbox', lang === 'fa' ? 'تماس‌ها و دیدگاه‌ها' : 'Messages & comments'], ['promotion', lang === 'fa' ? 'تبلیغات و پوش نوتیف' : 'Ads & push notifications'], ['notices', lang === 'fa' ? 'گزارش خطاها' : 'Issue reports']].map(([tab, label]) => {
        const count = tab === 'notices' ? unresolvedNoticeCount : tab === 'inbox' ? inboxCount : 0;
        return <button key={tab} role="tab" aria-selected={activeTab === tab} aria-label={count ? `${label}: ${count}` : label} className={`${activeTab === tab ? 'is-active' : ''}${count ? ' has-notices' : ''}`} onClick={() => setActiveTab(tab)}>{count > 0 && <span className="admin-tab-count" aria-hidden="true">{count > 99 ? '99+' : count}</span>}{label}</button>;
      })}
    </div>
    {activeTab === 'manage' && <div className="admin-grid">
      <section className="admin-card"><div className="admin-section-title"><h2>{editingSkill ? (lang === 'fa' ? 'ویرایش مهارت' : 'Edit skill') : t.addSkill}</h2>{editingSkill && <button className="text-link" type="button" onClick={() => { setEditingSkill(null); setSkillPreview(''); }}>{lang === 'fa' ? 'لغو ویرایش' : 'Cancel edit'}</button>}</div><form key={`${editingSkill?.id || 'new-skill'}-${skillFormVersion}`} onSubmit={saveSkill}><Field label={t.skillName} name="name" required maxLength="40" defaultValue={editingSkill?.name || ''} /><ImageUrlField key={`${editingSkill?.id || 'new-skill-url'}-${skillFormVersion}`} label={lang === 'fa' ? 'لینک مستقیم تصویر لوگو (اختیاری)' : 'Direct logo image URL (optional)'} name="iconUrl" placeholder="https://.../logo.png" defaultValue={editingSkill?.iconUrl || ''} lang={lang} /><ImageUpload lang={lang} preview={skillPreview} setPreview={setSkillPreview} /><button className="button button-primary" disabled={busy}>{busy ? (lang === 'fa' ? 'در حال بارگذاری و ذخیره...' : 'Uploading and saving...') : editingSkill ? (lang === 'fa' ? 'ذخیره تغییرات' : 'Save changes') : t.add}</button>{error && errorScope === 'skill' && <p className="error-text" role="alert">{error}</p>}{savedScope === 'skill' && <p className="success-text" role="status">{lang === 'fa' ? 'مهارت ثبت شد و در فهرست پایین دیده می‌شود.' : 'Skill saved and shown in the list below.'}</p>}</form><SortableList items={data.skills} lang={lang} busy={busy} onReorder={(ids) => saveOrder('skills', ids)} renderItem={(skill) => <><span className="admin-skill"><AdaptiveLogo src={skill.iconUrl || skillLogos[skill.name]} alt="" />{skill.name}</span><span className="post-admin-actions"><button className="edit-action" onClick={() => setEditingSkill(skill)}>{lang === 'fa' ? 'ویرایش' : 'Edit'}</button><button onClick={() => remove(`/api/admin/skills/${encodeURIComponent(skill.id)}`)} aria-label={t.delete}>×</button></span></>} /></section>
      <section className="admin-card"><div className="admin-section-title"><h2>{editingProject ? (lang === 'fa' ? 'ویرایش پروژه' : 'Edit project') : t.newProject}</h2>{editingProject && <button className="text-link" type="button" onClick={() => { setEditingProject(null); setProjectImagePreview(''); setProjectFormVersion((version) => version + 1); }}>{lang === 'fa' ? 'لغو ویرایش' : 'Cancel edit'}</button>}</div><p className="field-hint">{lang === 'fa' ? 'عنوان و توضیحات را فارسی بنویس؛ نسخهٔ انگلیسی با مترجم محلی ساخته می‌شود.' : 'Write the title and description in Persian; the local translation service creates the English version.'}</p><form key={`${editingProject?.id || 'new-project'}-${projectFormVersion}`} onSubmit={saveProject}><div className="form-columns"><Field label={t.titleFa} name="titleFa" required maxLength="160" defaultValue={localized(editingProject?.title, 'fa')} /><Field label={t.descriptionFa} name="descriptionFa" required maxLength="800" multiline defaultValue={localized(editingProject?.description, 'fa')} /></div><ProjectSkillsField skills={data.skills} selectedSkills={editingProject?.skillsUsed || []} lang={lang} /><ProjectImageFields lang={lang} defaultValue={editingProject?.image || ''} preview={projectImagePreview} setPreview={setProjectImagePreview} /><Field label={t.demoUrl} name="demoUrl" type="url" placeholder="https://..." defaultValue={editingProject?.demoUrl || ''} /><Field label={t.repoUrl} name="repoUrl" type="url" placeholder="https://..." defaultValue={editingProject?.repoUrl || ''} /><label className="field-label">{lang === 'fa' ? 'جایگاه نمایش پروژه' : 'Project position'}<select name="position" defaultValue={editingProject ? (data.projects[data.projects.findIndex((item) => item.id === editingProject.id) - 1]?.id || 'first') : 'first'}><option value="first">{lang === 'fa' ? 'ابتدای فهرست' : 'At the top'}</option>{data.projects.filter((item) => item.id !== editingProject?.id).map((item) => <option key={item.id} value={item.id}>{lang === 'fa' ? `بعد از ${localized(item.title, 'fa')}` : `After ${localized(item.title, 'en')}`}</option>)}</select></label><button className="button button-primary" disabled={busy}>{editingProject ? (lang === 'fa' ? 'ذخیره تغییرات' : 'Save changes') : t.addProject}</button></form><SortableList items={data.projects} lang={lang} busy={busy} onReorder={(ids) => saveOrder("projects", ids)} renderItem={(project) => <><span>{localized(project.title, lang)}{project.translationStatus === 'pending' && <small>{lang === 'fa' ? 'ترجمهٔ انگلیسی در انتظار' : 'English translation pending'}</small>}</span><span className="post-admin-actions"><button className="edit-action" type="button" disabled={busy} onClick={() => { setEditingProject(project); setProjectImagePreview(''); setProjectFormVersion((version) => version + 1); }}>{lang === 'fa' ? 'ویرایش' : 'Edit'}</button><button className="delete-action" type="button" disabled={busy} onClick={() => remove(`/api/admin/projects/${encodeURIComponent(project.id)}`)} aria-label={t.delete}>×</button></span></>} /></section>
      <ProjectDeployments projects={data.projects} lang={lang} refresh={refresh} />
      <CareerAdmin career={data.career} skills={data.skills} lang={lang} onCareerSaved={onCareerSaved} notify={notify} />
      <section className="admin-card admin-wide" id="resume-management"><h2>{t.uploadResume}</h2><p>{data.resume || t.noResume}</p><form onSubmit={(event) => { event.preventDefault(); const file = event.currentTarget.elements.resume.files[0]; if (!file) return; run(async () => { const response = await fetch('/api/admin/resume', { method: 'POST', body: file, headers: { 'Content-Type': 'application/pdf', 'X-File-Name': file.name }, credentials: 'same-origin' }); const result = await response.json(); if (!response.ok) throw Object.assign(new Error(result.error || 'Upload failed'), { status: response.status }); await refresh(); notify(lang === 'fa' ? 'رزومه بارگذاری شد.' : 'Résumé uploaded.'); }); }}><input type="file" name="resume" accept="application/pdf,.pdf" required /><button className="button button-primary" disabled={busy}>{lang === 'fa' ? 'بارگذاری' : 'Upload'}</button></form></section>
      <section className="admin-card"><div className="admin-section-title"><h2>{lang === 'fa' ? 'پیوندهای شبکه‌های اجتماعی' : 'Social links'}</h2>{editingSocial && <button className="text-link" type="button" onClick={() => setEditingSocial(null)}>{lang === 'fa' ? 'لغو ویرایش' : 'Cancel edit'}</button>}</div><form key={`${editingSocial?.id || 'new-social'}-${socialFormVersion}`} onSubmit={saveSocial}><Field label={lang === 'fa' ? 'آدرس صفحه' : 'Profile URL'} name="href" type="text" required placeholder="https://..." defaultValue={editingSocial?.href || ''} /><ImageUrlField key={`${editingSocial?.id || 'new-social-url'}-${socialFormVersion}`} label={lang === 'fa' ? 'لینک مستقیم تصویر لوگو (اختیاری)' : 'Direct icon image URL (optional)'} name="iconUrl" type="text" placeholder="https://.../icon.png" defaultValue={editingSocial?.iconUrl || ''} lang={lang} /><ImageUpload lang={lang} preview={socialPreview} setPreview={setSocialPreview} /><button className="button button-primary" disabled={busy}>{busy ? (lang === 'fa' ? 'در حال بارگذاری و ذخیره...' : 'Uploading and saving...') : editingSocial ? (lang === 'fa' ? 'ذخیره تغییرات' : 'Save changes') : (lang === 'fa' ? 'افزودن پیوند' : 'Add link')}</button>{error && errorScope === 'social' && <p className="error-text" role="alert">{error}</p>}{savedScope === 'social' && <p className="success-text" role="status">{lang === 'fa' ? 'پیوند ثبت شد و در فهرست پایین دیده می‌شود.' : 'Link saved and shown in the list below.'}</p>}</form><SortableList items={data.socials} lang={lang} busy={busy} onReorder={(ids) => saveOrder('socials', ids)} renderItem={(account) => <><span className="admin-social"><AdaptiveLogo src={account.iconUrl} alt="" /><span dir="ltr">{account.href}</span></span><span className="post-admin-actions"><button className="edit-action" onClick={() => setEditingSocial(account)}>{lang === 'fa' ? 'ویرایش' : 'Edit'}</button><button onClick={() => remove(`/api/admin/socials/${encodeURIComponent(account.id)}`)} aria-label={t.delete}>×</button></span></>} /></section>
    </div>}
    {activeTab === 'posts' && <div className="admin-grid"><section className="admin-card admin-wide" id="post-management"><div className="admin-section-title"><h2>{editingPost ? (lang === 'fa' ? 'ویرایش نوشته' : 'Edit post') : t.newPost}</h2>{editingPost && <button className="text-link" type="button" onClick={() => { setEditingPost(null); setPostCoverPreview(''); }}>{lang === 'fa' ? 'لغو ویرایش' : 'Cancel edit'}</button>}</div>
        <form key={`${editingPost?.id || 'new-post'}-${postFormVersion}`} onSubmit={savePost}>
          <div className="form-columns"><Field label={postLabels.title} name="title" dir="rtl" required maxLength="160" defaultValue={localized(editingPost?.title, 'fa')} /><Field label={postLabels.excerpt} name="excerpt" dir="rtl" required maxLength="500" defaultValue={localized(editingPost?.excerpt, 'fa')} /></div>
          <ArticleEditor label={postLabels.body} name="body" lang="fa" defaultValue={localized(editingPost?.body, 'fa')} onUpload={(file) => uploadImage(file, 'post-image')} />
          <Field label={postLabels.tags} name="tags" defaultValue={(editingPost?.tags?.fa || editingPost?.tags?.en || []).join(', ')} placeholder="#design, #React" />
          <PostCoverField lang={lang} defaultValue={editingPost?.image || ''} preview={postCoverPreview} setPreview={setPostCoverPreview} />
          <p className="field-hint translation-hint">{postLabels.translation}</p>
          <label className="checkbox-label"><input type="checkbox" name="published" defaultChecked={editingPost ? editingPost.published : true} /> {lang === 'fa' ? '\u0627\u0646\u062a\u0634\u0627\u0631 \u0639\u0645\u0648\u0645\u06cc' : 'Publish publicly'}</label>
          <button className="button button-primary" disabled={busy}>{editingPost ? (lang === 'fa' ? '\u0630\u062e\u06cc\u0631\u0647 \u0648\u06cc\u0631\u0627\u06cc\u0634' : 'Save changes') : t.publish}</button>
        </form>
        <h3 className="admin-subheading">{lang === 'fa' ? 'مطالب منتشرشده و پیش‌نویس‌ها' : 'Published posts and drafts'}</h3><ul className="admin-list">{data.posts.map((post) => <li key={post.id}><span>{localized(post.title, lang)}{!post.published && <small>{lang === 'fa' ? 'پیش‌نویس' : 'Draft'}</small>}{post.translationStatus === 'pending' && <small>{lang === 'fa' ? 'ترجمهٔ انگلیسی در انتظار' : 'English translation pending'}</small>}</span><span className="post-admin-actions"><button className="edit-action" onClick={() => { setEditingPost(post); setPostCoverPreview(''); document.getElementById('post-management')?.scrollIntoView({ behavior: 'smooth' }); }}>{lang === 'fa' ? 'ویرایش' : 'Edit'}</button><button onClick={() => remove(`/api/admin/posts/${encodeURIComponent(post.id)}`)} aria-label={t.delete}>×</button></span></li>)}</ul>
      </section></div>}
    {activeTab === 'inbox' && <div className="admin-grid"><AdminMessages messages={data.messages || []} lang={lang} refresh={refresh} /><AdminComments posts={data.posts} lang={lang} refresh={refresh} /></div>}
    {activeTab === 'promotion' && <div className="admin-grid"><AdminAd ads={data.ads} lang={lang} refresh={refresh} /><AdminPush lang={lang} posts={data.posts} /></div>}
    {activeTab === 'notices' && <div className="admin-grid admin-single"><AdminNotices lang={lang} onCountChange={setUnresolvedNoticeCount} /></div>}
    {error && !errorScope && <p className="error-text" role="alert">{error}</p>}
  </main>;
}
function Field({ label, name, type = 'text', required = false, autoComplete, minLength, maxLength, multiline = false, defaultValue, placeholder, dir }) { const Tag = multiline ? 'textarea' : 'input'; return <label className="field-label">{label}<Tag name={name} type={multiline ? undefined : type} required={required} autoComplete={autoComplete} minLength={minLength} maxLength={maxLength} rows={multiline ? 4 : undefined} defaultValue={defaultValue} placeholder={placeholder} dir={dir} /></label>; }

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
  return <form ref={formRef} className="contact-form" onSubmit={submit}>
    <div className="form-columns"><label className="field-label">{t.name}<input name="name" required maxLength="80" autoComplete="name" /></label><label className="field-label">{t.email}<input type="email" name="email" maxLength="254" autoComplete="email" /></label><label className="field-label">{lang === 'fa' ? 'شماره تلفن' : 'Phone number'}<input type="tel" name="phone" maxLength="30" autoComplete="tel" /></label></div>
    <label className="field-label">{t.message}<textarea name="message" required minLength="4" maxLength="5000" rows="5" /></label><input className="contact-honeypot" type="text" name="website" tabIndex="-1" autoComplete="off" aria-hidden="true" />
    <button className="button button-light" disabled={sending}>{sending ? t.sending : t.sendMessage}</button>
    {status && <p className="contact-status" role="status">{status}</p>}
  </form>;
}

function ProjectSkillsField({ skills = [], selectedSkills = [], lang }) {
  const selected = new Set(selectedSkills.map((skill) => typeof skill === 'string' ? skill : skill.id || skill.name));
  return <fieldset className="project-skills-picker">
    <legend>{lang === 'fa' ? 'تکنولوژی‌های استفاده‌شده در پروژه' : 'Technologies used in this project'}</legend>
    {!skills.length ? <p className="field-hint">{lang === 'fa' ? 'ابتدا مهارت‌ها را در بخش مدیریت مهارت اضافه کن.' : 'Add skills in the skills manager first.'}</p> : <div className="project-skills-options">{skills.map((skill) => <label className="project-skill-option" key={skill.id}>
      <input type="checkbox" name="skillsUsed" value={skill.id} defaultChecked={selected.has(skill.id) || selected.has(skill.name)} />
      {skill.iconUrl && <img src={skill.iconUrl} alt="" loading="lazy" />}
      <span>{skill.name}</span>
    </label>)}</div>}
  </fieldset>;
}

function ProjectImageFields({ lang, defaultValue = '', preview, setPreview }) {
  const [url, setUrl] = useState(defaultValue);
  return <div className="project-image-fields">
    <label className="field-label">{lang === 'fa' ? 'لینک مستقیم پوستر پروژه (اختیاری)' : 'Project cover image URL (optional)'}<input type="text" name="image" value={url} placeholder="https://.../cover.jpg" onChange={(event) => setUrl(event.target.value)} /></label>
    <label className="image-upload-label">{lang === 'fa' ? 'یا فایل پوستر را بارگذاری کن (PNG، JPG یا WebP؛ حداکثر ۳ مگابایت)' : 'Or upload a project cover (PNG, JPG or WebP; up to 3 MB)'}<input type="file" name="imageFile" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files[0]; setPreview(file ? URL.createObjectURL(file) : ''); }} /></label>
    {(preview || url) && <img className="project-image-preview" src={preview || url} alt={lang === 'fa' ? 'پیش‌نمایش پوستر پروژه' : 'Project cover preview'} />}
  </div>;
}

function ImageUrlField({ label, name, defaultValue = '', placeholder, lang }) {
  const [value, setValue] = useState(defaultValue);
  const [failed, setFailed] = useState(false);
  return <div className="image-url-wrap"><label className="field-label">{label}<input type="text" name={name} value={value} placeholder={placeholder} onChange={(event) => { setValue(event.target.value); setFailed(false); }} /></label>{value && (failed ? <small className="upload-hint">{lang === 'fa' ? 'پیش‌نمایش باز نشد. لینک ذخیره می‌شود، اما ممکن است لوگو نمایش داده نشود؛ می‌توانی فایل لوگو را بارگذاری کنی.' : 'Preview could not load. The link can be saved, but the logo may not display; you can upload the file instead.'}</small> : <img className="upload-preview" src={value} alt="Preview" onError={() => setFailed(true)} />)}</div>;
}

function ImageUpload({ lang, preview, setPreview }) {
  return <label className="image-upload-label">{lang === 'fa' ? 'یا فایل لوگو را بارگذاری کن (PNG، JPG، WebP یا SVG؛ حداکثر ۳ مگابایت)' : 'Or upload a logo (PNG, JPG, WebP or SVG; up to 3 MB)'}<input type="file" name="logoFile" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" onChange={(event) => { const file = event.target.files[0]; setPreview(file ? URL.createObjectURL(file) : ''); }} />{preview && <img className="upload-preview" src={preview} alt="" />}</label>;
}

function PostCoverField({ lang, defaultValue = '', preview, setPreview }) {
  const [url, setUrl] = useState(defaultValue);
  const [failed, setFailed] = useState(false);
  const source = preview || url;
  return <div className="post-cover-field"><label className="field-label">{lang === 'fa' ? 'پوستر نوشته (اجباری)' : 'Post poster (required)'}<input name="image" type="text" value={url} onChange={(event) => { setUrl(event.target.value); setFailed(false); }} placeholder="https://.../poster.jpg" /></label><label className="image-upload-label">{lang === 'fa' ? 'یا پوستر را بارگذاری کن (PNG، JPG یا WebP؛ حداکثر ۳ مگابایت؛ اندازه پیشنهادی ۱۲۰۰×۶۲۷)' : 'Or upload a poster (PNG, JPG or WebP; up to 3 MB; recommended size 1200 × 627 px)'}<input type="file" name="coverFile" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files[0]; setPreview(file ? URL.createObjectURL(file) : ''); setFailed(false); }} /></label>{source && !failed && <img className="post-cover-preview" src={source} alt="Poster preview" onError={() => setFailed(true)} />}{source && failed && <small className="upload-hint">{lang === 'fa' ? 'پیش‌نمایش پوستر بارگذاری نشد؛ لینک یا فایل را بررسی کن.' : 'Poster preview failed to load. Check the URL or upload a file.'}</small>}</div>;
}
