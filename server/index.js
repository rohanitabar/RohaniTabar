'use strict';

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const webPush = require('web-push');
const API_VERSION = require('../src/lib/apiVersion');
const { DEPLOYMENTS_DIR, validateSubdomain, deployProject, removeRuntime, proxyRequest, deploymentForHost, isDemoHost } = require('./deployments');
const { publicOrigin, renderHtml, sitemapXml, robotsText } = require('./seo');
const { translateToEnglish } = require('./translation');
const { demoTunnelHostname, demoTunnelPath } = require('../src/features/editorial/demoTunnel');

const ROOT = path.resolve(__dirname, '..');
const buildRoot = path.join(ROOT, 'build');
const serverBuildDir = path.join(buildRoot, '.server');
const rendererFile = path.join(serverBuildDir, 'render.cjs');
const renderPortfolio = fs.existsSync(rendererFile) ? require(rendererFile) : null;
const HOME_ASSETS = (() => {
  try {
    const files = JSON.parse(fs.readFileSync(path.join(ROOT, 'build', 'asset-manifest.json'), 'utf8')).files || {};
    const cssPath = files['main.css'];
    if (!/^\/static\/css\/main\.[a-f0-9]+\.css$/.test(cssPath || '')) return {};
    return {
      images: { mobile: files['static/media/Abbas-mobile.webp'], desktop: files['static/media/Abbas-desktop.webp'] },
      logo: files['static/media/Logo.jpg'],
      cssPath,
      css: fs.readFileSync(path.join(ROOT, 'build', cssPath), 'utf8')
    };
  } catch (_) { return {}; }
})();
const DATA_DIR = path.resolve(process.env.PORTFOLIO_DATA_DIR || path.join(__dirname, 'data'));
const DATA_FILE = path.join(DATA_DIR, 'site.json');
const PUSH_SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'push-subscriptions.json');
const PUSH_KEYS_FILE = path.join(DATA_DIR, 'push-keys.json');
const UPLOAD_DIR = path.resolve(process.env.PORTFOLIO_UPLOAD_DIR || path.join(ROOT, 'public', 'uploads'));
const PORT = Number(process.env.PORT || 5000);
const DEMO_PORT = Number(process.env.LOCAL_DEMO_PORT || 5001);
const STATIC_CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https:; img-src 'self' https: data: blob:; font-src 'self' https: data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";
const SESSION_COOKIE = 'portfolio_session';
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
const sessions = new Map();
const attempts = new Map();
const contactAttempts = new Map();
const clientErrorAttempts = new Map();
const publicWriteAttempts = new Map();
const dataEventClients = new Set();
let store = null;
let saveChain = Promise.resolve();
let pushSaveChain = Promise.resolve();
let pushSubscriptions = [];
let pushPublicKey = '';
const defaultSocials = [
  { id: 'github', href: 'https://github.com/rohanitabar', iconUrl: 'https://cdn.simpleicons.org/github/181717' },
  { id: 'whatsapp', href: 'https://wa.me/989032991639', iconUrl: 'https://cdn.simpleicons.org/whatsapp/25D366' },
  { id: 'telegram', href: 'https://t.me/AbbasRt_1385', iconUrl: 'https://cdn.simpleicons.org/telegram/26A5E4' }
];
const defaultSkillIcons = {
  html: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/html5/html5-original.svg',
  css: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/css3/css3-original.svg',
  javascript: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg',
  bootstrap: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/bootstrap/bootstrap-original.svg',
  react: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg',
  git: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/git/git-original.svg',
  json: '/icons/json.svg'
};

function loadDotEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) return;
  for (const row of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = row.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const seed = () => ({
  admin: null,
  skills: [
    ['HTML', 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/html5/html5-original.svg'],
    ['CSS', 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/css3/css3-original.svg'],
    ['JavaScript', 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg'],
    ['Bootstrap', 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/bootstrap/bootstrap-original.svg'],
    ['React', 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/react/react-original.svg'],
    ['Git', 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/git/git-original.svg']
  ].map(([name, iconUrl]) => ({ id: name.toLowerCase(), name, iconUrl })),
  projects: [
    { id: 'ai-notes', title: { fa: 'یادداشت‌های هوش مصنوعی', en: 'AI Notes' }, description: { fa: 'مجموعه‌ای از نوشته‌ها درباره ابزارهای تازه هوش مصنوعی.', en: 'A collection of notes on emerging AI tools.' }, demoUrl: '', repoUrl: '' },
    { id: 'portfolio', title: { fa: 'پورتفولیو شخصی', en: 'Personal portfolio' }, description: { fa: 'وب‌سایتی برای معرفی مهارت‌ها، پروژه‌ها و نوشته‌ها.', en: 'A home for my skills, projects and writing.' }, demoUrl: '', repoUrl: '' }
  ],
  socials: defaultSocials,
  posts: [
    { id: 'qwen', title: { fa: 'Qwen، رقیب جدی ChatGPT', en: 'Qwen: a serious ChatGPT competitor' }, excerpt: { fa: 'نگاهی به مدل‌های Qwen و کاربردهای آن‌ها در متن، تصویر و صدا.', en: 'A look at Qwen models and their uses across text, images and audio.' }, body: { fa: 'مدل‌های Qwen مجموعه‌ای از ابزارهای هوش مصنوعی علی‌بابا هستند. در این نوشته نگاهی کوتاه به قابلیت‌ها و کاربردهای آن‌ها داریم.', en: 'Qwen is Alibaba’s family of AI models. This short article looks at some of their capabilities and practical uses.' }, image: '', likes: [], comments: [], published: true, createdAt: '2025-02-16T12:00:00.000Z' },
    { id: 'deepseek', title: { fa: 'آشنایی با DeepSeek', en: 'Getting to know DeepSeek' }, excerpt: { fa: 'چرا DeepSeek توجه زیادی را در دنیای هوش مصنوعی جلب کرد؟', en: 'Why did DeepSeek draw so much attention in the AI world?' }, body: { fa: 'DeepSeek با مدل‌های کارآمد و دسترس‌پذیر خود توجه توسعه‌دهندگان را جلب کرد. این مقاله درباره رویکرد و ابزارهای آن است.', en: 'DeepSeek drew developers’ attention with capable, accessible models. This article explores its approach and tools.' }, image: '', likes: [], comments: [], published: true, createdAt: '2025-02-15T12:00:00.000Z' }
  ],
  resume: null,
  ads: [],
  messages: [],
  career: { noExperience: false, companies: [] },
  notices: []
});

async function init() {
  loadDotEnv();
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.mkdir(UPLOAD_DIR, { recursive: true });
  await initPush();
  try { store = JSON.parse(await fsp.readFile(DATA_FILE, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') console.error('Could not read site data:', error.message); store = seed(); await persist(); }
  let migrated = false;
  if (Array.isArray(store.skills)) {
    store.skills = store.skills.map((skill) => {
      if (skill.iconUrl) return skill;
      migrated = true;
      return { ...skill, iconUrl: defaultSkillIcons[String(skill.name || '').toLowerCase()] || '/icons/skill-default.svg' };
    });
  }
  if (!Array.isArray(store.socials)) { store.socials = defaultSocials.map((account) => ({ ...account })); migrated = true; }
  if (!Array.isArray(store.messages)) { store.messages = []; migrated = true; }
  if (!store.career || typeof store.career !== 'object') { store.career = { noExperience: false, companies: [] }; migrated = true; }
  if (!Array.isArray(store.career.companies)) { store.career.companies = []; migrated = true; }
  if (typeof store.career.noExperience !== 'boolean') { store.career.noExperience = false; migrated = true; }
  if (!Array.isArray(store.notices)) { store.notices = []; migrated = true; }
  if (Array.isArray(store.projects)) {
    store.projects = store.projects.map((project) => {
      if (project.projectType === 'static' || project.projectType === 'dynamic') return project;
      migrated = true;
      return { ...project, projectType: project.deployment?.runtimeKind === 'static' ? 'static' : 'dynamic' };
    });
  }
  if (Array.isArray(store.posts)) {
    const usedSlugs = new Set();
    store.posts = store.posts.map((post) => {
      const base = post.slug || slugifyPostTitle(post.title?.en) || slugifyPostTitle(post.title?.fa) || 'post';
      let slug = base;
      let suffix = 2;
      while (usedSlugs.has(slug)) slug = `${base}-${suffix++}`;
      usedSlugs.add(slug);
      if (post.slug === slug) return post;
      migrated = true;
      return { ...post, slug };
    });
  }
  if (!Array.isArray(store.ads)) { store.ads = store.ad?.imageUrl ? [{ id: id(), ...store.ad }] : []; migrated = true; }
  if (Object.prototype.hasOwnProperty.call(store, 'ad')) { delete store.ad; migrated = true; }
  if (migrated) await persist();
}

async function initPush() {
  try {
    const saved = JSON.parse(await fsp.readFile(PUSH_KEYS_FILE, 'utf8'));
    if (saved.publicKey && saved.privateKey) ({ publicKey: pushPublicKey } = saved);
    else throw new Error('Invalid push key file.');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const keys = webPush.generateVAPIDKeys();
    pushPublicKey = keys.publicKey;
    await fsp.writeFile(PUSH_KEYS_FILE, JSON.stringify(keys), { mode: 0o600, flag: 'wx' });
  }
  try {
    const saved = JSON.parse(await fsp.readFile(PUSH_SUBSCRIPTIONS_FILE, 'utf8'));
    pushSubscriptions = Array.isArray(saved) ? saved.filter((item) => item?.endpoint && item?.keys?.p256dh && item?.keys?.auth) : [];
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const privateKey = JSON.parse(await fsp.readFile(PUSH_KEYS_FILE, 'utf8')).privateKey;
  webPush.setVapidDetails(process.env.PUSH_VAPID_SUBJECT || 'mailto:admin@example.com', pushPublicKey, privateKey);
}

function persistPushSubscriptions() {
  const snapshot = JSON.stringify(pushSubscriptions);
  pushSaveChain = pushSaveChain.then(async () => {
    const temp = `${PUSH_SUBSCRIPTIONS_FILE}.${process.pid}.tmp`;
    await fsp.writeFile(temp, snapshot, { mode: 0o600 });
    await fsp.rename(temp, PUSH_SUBSCRIPTIONS_FILE);
  });
  return pushSaveChain;
}

function persist() {
  const snapshot = JSON.stringify(store, null, 2);
  saveChain = saveChain.catch(() => {}).then(async () => {
    const temp = `${DATA_FILE}.${process.pid}.tmp`;
    await fsp.writeFile(temp, snapshot, { mode: 0o600 });
    await fsp.rename(temp, DATA_FILE);
    broadcastDataChanged();
  });
  return saveChain;
}

function broadcastDataChanged() {
  for (const client of dataEventClients) {
    if (client.destroyed || client.writableEnded) { dataEventClients.delete(client); continue; }
    client.write('event: data-change\ndata: {}\n\n');
  }
}

function streamDataEvents(res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write('retry: 3000\n: connected\n\n');
  dataEventClients.add(res);
  const heartbeat = setInterval(() => {
    if (!res.destroyed && !res.writableEnded) res.write(': keep-alive\n\n');
  }, 25000);
  heartbeat.unref?.();
  const close = () => { clearInterval(heartbeat); dataEventClients.delete(res); };
  res.on('close', close);
}

function reorderByIds(items, ids) {
  if (!Array.isArray(ids) || ids.length !== items.length || ids.some((itemId) => typeof itemId !== 'string')) return null;
  const byId = new Map(items.map((item) => [item.id, item]));
  if (byId.size !== items.length || new Set(ids).size !== items.length || ids.some((itemId) => !byId.has(itemId))) return null;
  return ids.map((itemId) => byId.get(itemId));
}

function json(res, status, value, headers = {}) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(body);
}
function publicSiteData(req, res) {
  const body = Buffer.from(JSON.stringify(visibleData(Boolean(sessionFor(req)))));
  if (body.length < 1024 || !/\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Vary': 'Accept-Encoding', 'X-Content-Type-Options': 'nosniff' });
    return res.end(body);
  }
  zlib.gzip(body, (error, compressed) => {
    if (res.destroyed) return;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', ...(error ? {} : { 'Content-Encoding': 'gzip' }), 'Cache-Control': 'no-store', 'Vary': 'Accept-Encoding', 'X-Content-Type-Options': 'nosniff' });
    res.end(error ? body : compressed);
  });
}
function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map((part) => part.trim().split(/=(.*)/s).slice(0, 2)).filter((part) => part.length === 2).map(([key, value]) => { try { return [key, decodeURIComponent(value)]; } catch (_) { return [key, '']; } }));
}
function setCookie(res, name, value, options = {}) {
  const bits = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'SameSite=Strict', 'HttpOnly'];
  if (options.maxAge !== undefined) bits.push(`Max-Age=${options.maxAge}`);
  if (process.env.NODE_ENV === 'production') bits.push('Secure');
  res.setHeader('Set-Cookie', bits.join('; '));
}
function requestOriginAllowed(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const source = new URL(origin);
    const expected = process.env.PUBLIC_ORIGIN?.replace(/\/$/, '');
    if (expected) return source.origin === expected;
    if (source.host === req.headers.host) return true;
    return process.env.NODE_ENV !== 'production' && ['localhost:3000', '127.0.0.1:3000'].includes(source.host)
      && ['localhost:5000', '127.0.0.1:5000'].includes(req.headers.host);
  } catch (_) { return false; }
}
function requireOrigin(req, res) {
  if (requestOriginAllowed(req)) return true;
  json(res, 403, { error: 'This request origin is not allowed.' });
  return false;
}
function allowPublicWrite(req, kind, limit) {
  const now = Date.now();
  const key = `${kind}:${req.socket.remoteAddress || 'unknown'}`;
  const previous = publicWriteAttempts.get(key);
  const attempt = previous && previous.resetAt > now ? previous : { count: 0, resetAt: now + 60 * 60 * 1000 };
  attempt.count += 1;
  publicWriteAttempts.set(key, attempt);
  if (publicWriteAttempts.size > 2000) {
    for (const [entry, value] of publicWriteAttempts) if (value.resetAt <= now) publicWriteAttempts.delete(entry);
    while (publicWriteAttempts.size > 2000) publicWriteAttempts.delete(publicWriteAttempts.keys().next().value);
  }
  return attempt.count <= limit;
}
function sessionFor(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const record = sessions.get(token);
  if (!record || record.expiresAt < Date.now()) { sessions.delete(token); return null; }
  return token;
}
function requireAdmin(req, res) {
  if (sessionFor(req)) return true;
  json(res, 401, { error: 'Please sign in to continue.' });
  return false;
}
function createSession(res) {
  const token = crypto.randomBytes(32).toString('base64url');
  sessions.set(token, { expiresAt: Date.now() + SESSION_TTL });
  setCookie(res, SESSION_COOKIE, token, { maxAge: SESSION_TTL / 1000 });
}
function clearSession(req, res) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (token) sessions.delete(token);
  setCookie(res, SESSION_COOKIE, '', { maxAge: 0 });
}
function readBody(req, limit = 100000) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    let tooLarge = false;
    req.on('data', (chunk) => { size += chunk.length; if (size > limit) { if (!tooLarge) reject(Object.assign(new Error('Request is too large.'), { status: 413 })); tooLarge = true; chunks.length = 0; return; } if (!tooLarge) chunks.push(chunk); });
    req.on('end', () => { if (!tooLarge) resolve(Buffer.concat(chunks)); });
    req.on('error', reject);
  });
}
async function readJson(req, maxBytes = 100000) {
  const body = await readBody(req, maxBytes);
  try { return JSON.parse(body.toString('utf8') || '{}'); }
  catch (_) { throw Object.assign(new Error('Invalid JSON body.'), { status: 400 }); }
}
const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const safeUrl = (value) => { const input = clean(value, 1000); if (!input) return ''; let parsed; try { const normalized = /^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : `https://${input}`; parsed = new URL(normalized); } catch (_) { throw Object.assign(new Error('Enter a valid HTTP or HTTPS URL.'), { status: 400 }); } if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) throw Object.assign(new Error('Enter a valid HTTP or HTTPS URL without embedded credentials.'), { status: 400 }); return parsed.toString(); };
function projectLinkKey(value, kind) {
  if (!value) return '';
  const url = new URL(value);
  url.hash = '';
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  if (kind === 'repository' && ['github.com', 'www.github.com'].includes(url.hostname)) {
    const [, owner, repository] = url.pathname.split('/');
    if (owner && repository) return `github:${owner.toLowerCase()}/${repository.replace(/\.git$/i, '').toLowerCase()}`;
  }
  url.pathname = url.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '');
  url.searchParams.sort();
  return url.toString().replace(/\/$/, '');
}
function projectLinkConflict(project, excludeId = '') {
  const checks = [
    ['repoUrl', 'repository', 'This source repository is already assigned to another project.'],
    ['demoUrl', 'demo', 'This demo URL is already assigned to another project.']
  ];
  for (const [field, kind, message] of checks) {
    const key = projectLinkKey(project[field], kind);
    if (key && store.projects.some((item) => item.id !== excludeId && projectLinkKey(item[field], kind) === key)) {
      return message;
    }
  }
  return '';
}
async function projectInput(body, previous = null) {
  const titleFa = clean(body.titleFa, 160);
  const descriptionFa = clean(body.descriptionFa, 800);
  if (!titleFa || !descriptionFa) throw Object.assign(new Error('Complete the Persian project title and description.'), { status: 400 });
  const demoSubdomain = body.demoSubdomain ? validateSubdomain(body.demoSubdomain) : previous?.demoSubdomain || '';
  const demoBranch = clean(Object.prototype.hasOwnProperty.call(body, 'demoBranch') ? body.demoBranch : previous?.demoBranch || '', 200);
  const projectType = body.projectType === 'dynamic' ? 'dynamic' : body.projectType === 'static' ? 'static' : previous?.projectType || (previous?.deployment?.runtimeKind === 'static' ? 'static' : 'dynamic');
  const featured = Object.prototype.hasOwnProperty.call(body, 'featured') ? body.featured === true || body.featured === 'on' : previous?.featured !== false;
  const demoEnabled = Object.prototype.hasOwnProperty.call(body, 'demoEnabled') ? body.demoEnabled === true || body.demoEnabled === 'on' : Boolean(previous?.demoEnabled || previous?.deployment?.status === 'running');
  const containerPort = body.containerPort ? Number(body.containerPort) : previous?.containerPort || 3000;
  const serviceName = body.serviceName !== undefined ? clean(body.serviceName, 63) : previous?.serviceName || '';
  const demoUrl = Object.prototype.hasOwnProperty.call(body, 'demoUrl') ? safeUrl(body.demoUrl) : previous?.demoUrl || '';
  const repoUrl = Object.prototype.hasOwnProperty.call(body, 'repoUrl') ? safeUrl(body.repoUrl) : previous?.repoUrl || '';
  const image = Object.prototype.hasOwnProperty.call(body, 'image') ? safeImageUrl(body.image) : previous?.image || '';
  const selectedSkillIds = Array.isArray(body.skillsUsed) ? [...new Set(body.skillsUsed.map((skillId) => clean(skillId, 80)).filter(Boolean))] : (previous?.skillsUsed || []).map((skill) => typeof skill === 'string' ? skill : skill.id).filter(Boolean);
  if (selectedSkillIds.length > 30) throw Object.assign(new Error('Select up to 30 skills for a project.'), { status: 400 });
  const skillsUsed = selectedSkillIds.map((skillId) => {
    const skill = store.skills.find((item) => item.id === skillId);
    if (!skill) throw Object.assign(new Error('A selected skill no longer exists. Refresh the page and try again.'), { status: 400 });
    return { id: skill.id, name: skill.name, iconUrl: skill.iconUrl || '' };
  });
  if (!Number.isInteger(containerPort) || containerPort < 1 || containerPort > 65535) throw Object.assign(new Error('Enter a valid app port between 1 and 65535.'), { status: 400 });
  if (serviceName && !/^[a-zA-Z0-9_-]{1,63}$/.test(serviceName)) throw Object.assign(new Error('Enter a valid Docker Compose service name.'), { status: 400 });
  if (demoEnabled && (!repoUrl || !demoSubdomain)) throw Object.assign(new Error('To enable the demo, add a public GitHub repository URL and subdomain.'), { status: 400 });
  const sources = { title: titleFa, description: descriptionFa };
  const previousPending = Array.isArray(previous?.translationPendingFields) ? previous.translationPendingFields : previous?.translationStatus === 'pending' ? ['title', 'description'] : [];
  const translations = {};
  const fieldsToTranslate = [];
  for (const [field, source] of Object.entries(sources)) {
    const prior = previous?.[field];
    if (prior?.fa === source && typeof prior.en === 'string' && !previousPending.includes(field)) translations[field] = prior.en;
    else fieldsToTranslate.push(field);
  }
  let pendingFields = [];
  if (fieldsToTranslate.length) {
    try {
      const translated = await translateToEnglish(fieldsToTranslate.map((field) => sources[field]));
      fieldsToTranslate.forEach((field, index) => { translations[field] = translated[index]; });
    } catch (error) {
      await recordNotice('translation', error.message, 'projectInput: translate Persian title and description', '/admin/projects');
      pendingFields = fieldsToTranslate;
      fieldsToTranslate.forEach((field) => { translations[field] = sources[field]; });
    }
  }
  return { title: { fa: titleFa, en: translations.title }, description: { fa: descriptionFa, en: translations.description }, featured, translationStatus: pendingFields.length ? 'pending' : 'translated', translationPendingFields: pendingFields, image, demoUrl, repoUrl, skillsUsed, demoSubdomain, demoBranch, projectType, demoEnabled, containerPort, serviceName };
}
const safeImageUrl = (value) => { const input = clean(value, 1000); if (/^\/uploads\/(?:skill-logo|social-logo|post-image|project-image|ad-image)-[A-Za-z0-9-]+\.(?:png|jpe?g|webp)$/.test(input) || /^\/icons\/(?:json|skill-default)\.svg$/.test(input)) return input; const url = safeUrl(input); if (url.startsWith('http://') && publicOrigin(process.env.PUBLIC_ORIGIN).startsWith('https://')) throw Object.assign(new Error('Use an HTTPS image link on this site, or upload the image file.'), { status: 400 }); return url; };
async function adInput(body, previous = null) {
  const imageUrl = safeImageUrl(body.imageUrl);
  const href = safeUrl(body.href);
  if (!imageUrl || !href) throw Object.assign(new Error('Enter an ad image and destination link.'), { status: 400 });
  const captionFa = clean(body.captionFa, 240);
  let captionEn = previous?.captionEn || captionFa;
  if (!captionFa) captionEn = '';
  else if (captionFa !== previous?.captionFa) {
    try { [captionEn] = await translateToEnglish([captionFa]); } catch (error) { await recordNotice('translation', error.message, 'adInput: translate advertisement caption', '/admin/advertisements'); captionEn = captionFa; }
  }
  return { imageUrl, href, altFa: clean(body.altFa, 120), altEn: clean(body.altEn, 120), captionFa, captionEn };
}
const id = () => crypto.randomUUID();
function limited(ip) {
  const entry = attempts.get(ip) || { count: 0, resetAt: Date.now() + 15 * 60 * 1000 };
  if (entry.resetAt < Date.now()) { entry.count = 0; entry.resetAt = Date.now() + 15 * 60 * 1000; }
  entry.count += 1;
  attempts.set(ip, entry);
  return entry.count > 10;
}
const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) => new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (error, key) => error ? reject(error) : resolve({ salt, hash: key.toString('hex') })));
async function passwordMatches(password, admin) {
  const candidate = await hashPassword(password, admin.salt);
  return crypto.timingSafeEqual(Buffer.from(candidate.hash, 'hex'), Buffer.from(admin.hash, 'hex'));
}
function optimizedProjectImage(url) {
  if (!/^\/uploads\/project-image-\d+-[a-f0-9]+\.(?:png|jpg|jpeg)$/.test(url || '')) return url;
  const optimized = url.replace(/\.[^.]+$/, '.optimized.webp');
  return fs.existsSync(path.join(UPLOAD_DIR, path.basename(optimized))) ? optimized : url;
}
function visibleData(includeDrafts = false) {
  const projects = store.projects.map((project) => {
    const deployment = project.deployment;
    const publicDomain = process.env.DEMO_BASE_DOMAIN;
    const subdomain = project.demoSubdomain || deployment?.subdomain || '';
    const publicDemoUrl = project.demoUrl || (publicDomain && publicDomain !== 'localhost' && subdomain ? `https://${subdomain}.${publicDomain}` : '');
    const publicDeployment = deployment ? { status: deployment.status || 'source-ready', subdomain, url: publicDemoUrl, localPreviewPort: DEMO_PORT, uploadedAt: deployment.uploadedAt || '', deployedAt: deployment.deployedAt || '', error: includeDrafts ? deployment.error || '' : '' } : null;
    return { ...project, displayImage: optimizedProjectImage(project.image), projectType: project.projectType || (deployment?.runtimeKind === 'static' ? 'static' : 'dynamic'), targetDemoUrl: project.demoUrl || '', deployment: publicDeployment };
  });
  const career = store.career || { noExperience: false, companies: [] };
  const publicCareer = !includeDrafts && career.noExperience ? { ...career, companies: [] } : career;
  return { skills: store.skills, projects, posts: store.posts.filter((post) => includeDrafts || post.published).map((post) => ({ ...post, likes: Array.isArray(post.likes) ? post.likes.length : Number(post.likes || 0), comments: post.comments || [] })), socials: store.socials || defaultSocials, resume: store.resume, career: publicCareer, ads: (store.ads || []).map((ad) => ({ ...ad, href: ad.href || ad.url || ad.link || '' })), ...(includeDrafts ? { messages: store.messages } : {}) };
}
const issueScopes = new Set(['translation', 'projects', 'posts', 'skills', 'socials', 'experience', 'advertising', 'notifications', 'messages', 'comments', 'api', 'interface', 'runtime']);
function normalizeIssueScope(scope) {
  const aliases = { project: 'projects', post: 'posts', skill: 'skills', social: 'socials', career: 'experience' };
  const normalized = aliases[scope] || scope;
  return issueScopes.has(normalized) ? normalized : 'runtime';
}
function friendlyIssueMessage(scope) {
  if (scope === 'translation') return { fa: 'ترجمهٔ خودکار انجام نشد. متن اصلی ذخیره شده و ترجمه در تلاش بعدی دوباره انجام می‌شود.', en: 'Automatic translation failed. The original text was saved and translation will be retried later.' };
  if (scope === 'projects') return { fa: 'در مدیریت یا انتشار پروژه مشکلی رخ داده است.', en: 'A problem occurred while managing or publishing a project.' };
  if (scope === 'posts') return { fa: 'در ذخیره یا نمایش نوشته مشکلی رخ داده است.', en: 'A problem occurred while saving or displaying a post.' };
  if (scope === 'experience') return { fa: 'ذخیره یا نمایش سابقهٔ کاری با مشکل روبه‌رو شده است.', en: 'Work history could not be saved or displayed.' };
  if (scope === 'skills') return { fa: 'در بارگذاری یا ذخیرهٔ مهارت‌ها مشکلی رخ داده است.', en: 'A problem occurred while loading or saving skills.' };
  if (scope === 'socials') return { fa: 'در ذخیره یا نمایش پیوند شبکه‌های اجتماعی مشکلی رخ داده است.', en: 'A problem occurred while saving or displaying social links.' };
  if (scope === 'advertising') return { fa: 'مدیریت جایگاه‌های تبلیغاتی با مشکل روبه‌رو شده است.', en: 'A problem occurred while managing advertising placements.' };
  if (scope === 'notifications') return { fa: 'تنظیم یا ارسال اعلان با مشکل روبه‌رو شده است.', en: 'A problem occurred while configuring or sending notifications.' };
  if (scope === 'messages') return { fa: 'مدیریت پیام‌های تماس با مشکل روبه‌رو شده است.', en: 'A problem occurred while managing contact messages.' };
  if (scope === 'comments') return { fa: 'مدیریت دیدگاه‌ها با مشکل روبه‌رو شده است.', en: 'A problem occurred while managing comments.' };
  if (scope === 'api') return { fa: 'ارتباط سایت با سرور با مشکل روبه‌رو شده است.', en: 'The website could not communicate with its server.' };
  if (scope === 'interface') return { fa: 'در نمایش بخشی از سایت مشکلی رخ داده است.', en: 'A problem occurred while rendering part of the website.' };
  return { fa: 'هنگام اجرای سایت مشکلی رخ داده است.', en: 'A problem occurred while the website was running.' };
}
async function recordNotice(scope, message, details = '', page = '/') {
  if (!store) return null;
  const normalizedScope = normalizeIssueScope(scope);
  const cleanPage = `/${clean(page, 300).replace(/^\/+/, '').split(/[?#]/)[0]}`.replace(/^\/\/$/, '/') || '/';
  const cleanMessage = clean(message, 500) || 'Unknown error';
  const fingerprint = crypto.createHash('sha256').update(`${normalizedScope}|${cleanPage}|${cleanMessage}`).digest('hex');
  const now = Date.now();
  const prior = (store.notices || []).find((notice) => notice.fingerprint === fingerprint);
  const recentActive = prior && !prior.resolvedAt && now - new Date(prior.createdAt).getTime() < 15 * 60 * 1000;
  const recentlyResolved = prior?.resolvedAt && now - new Date(prior.resolvedAt).getTime() < 15 * 60 * 1000;
  if (recentActive || recentlyResolved) { prior.count = Math.min(999, Number(prior.count || 1) + 1); prior.lastSeenAt = new Date().toISOString(); try { await persist(); } catch (error) { console.error('Could not persist issue report:', error.message); } return prior; }
  const notice = { id: id(), scope: normalizedScope, message: cleanMessage, details: clean(details, 1200), page: cleanPage, fingerprint, count: 1, createdAt: new Date().toISOString(), lastSeenAt: new Date().toISOString(), friendlyMessage: friendlyIssueMessage(normalizedScope) };
  store.notices = [notice, ...(store.notices || [])].slice(0, 100);
  try { await persist(); } catch (error) { console.error('Could not persist issue report:', error.message); }
  return notice;
}
async function validateCareer(body) {
  const month = (value) => {
    const date = clean(value, 10);
    if (!date) return date;
    const match = /^(\d{4})-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/.exec(date);
    if (!match) return null;
    if (match[3]) {
      const parsed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
      if (parsed.getUTCFullYear() !== Number(match[1]) || parsed.getUTCMonth() !== Number(match[2]) - 1 || parsed.getUTCDate() !== Number(match[3])) return null;
    }
    return date;
  };
  const previousCompanies = store?.career?.companies || [];
  const suppliedCompanies = Array.isArray(body.companies) ? body.companies : [];
  const companies = body.noExperience === true ? previousCompanies : suppliedCompanies;
  if (companies.length > 30) throw Object.assign(new Error('You can add up to 30 companies.'), { status: 400 });
  const cleanPeriod = (item, label) => {
    const startDate = month(item.startDate);
    const endDate = month(item.endDate);
    if (startDate === null || endDate === null) throw Object.assign(new Error(`Enter valid ${label} dates using month and year.`), { status: 400 });
    if (startDate && endDate && !item.isCurrent && endDate.slice(0, 7) < startDate.slice(0, 7)) throw Object.assign(new Error(`The ${label} end date must be after its start date.`), { status: 400 });
    return { startDate, endDate: item.isCurrent ? '' : endDate, isCurrent: item.isCurrent === true };
  };
  const result = {
    noExperience: body.noExperience === true,
    companies: companies.map((company) => {
      const name = clean(company.name, 100);
      if (!name) throw Object.assign(new Error('Enter a company name.'), { status: 400 });
      const roles = Array.isArray(company.roles) ? company.roles : [];
      if (roles.length > 20) throw Object.assign(new Error('A company can have up to 20 positions.'), { status: 400 });
      const previousCompany = previousCompanies.find((item) => item.id === company.id);
      return { id: clean(company.id, 80) || id(), name, logoUrl: safeImageUrl(company.logoUrl), ...cleanPeriod(company, 'company'), roles: roles.map((role) => {
        const titleFa = clean(typeof role.title === 'object' ? role.title.fa : role.title, 100);
        const descriptionFa = clean(typeof role.description === 'object' ? role.description.fa : role.description, 1200);
        if (!titleFa) throw Object.assign(new Error('Enter a position title.'), { status: 400 });
        const previousRole = previousCompany?.roles?.find((item) => item.id === role.id);
        const reusableEnglish = (localized, source) => {
          if (localized?.fa !== source || typeof localized.en !== 'string') return '';
          const previousEnglish = localized.en.trim();
          return previousEnglish && !/[\u0600-\u06FF]/.test(previousEnglish) ? previousEnglish : '';
        };
        const titleEn = reusableEnglish(previousRole?.title, titleFa);
        const descriptionEn = reusableEnglish(previousRole?.description, descriptionFa);
        const rawTechnologies = Array.isArray(role.technologiesUsed) ? role.technologiesUsed : previousRole?.technologiesUsed || [];
        if (rawTechnologies.length > 30) throw Object.assign(new Error('Select up to 30 technologies for a position.'), { status: 400 });
        const technologiesUsed = [...new Set(rawTechnologies.map((technology) => clean(typeof technology === 'string' ? technology : technology?.id, 80)).filter(Boolean))].map((technologyId) => {
          const skill = store.skills.find((item) => item.id === technologyId);
          const previousTechnology = previousRole?.technologiesUsed?.find((item) => item.id === technologyId);
          if (!skill && !previousTechnology) throw Object.assign(new Error('A selected technology no longer exists. Refresh the page and try again.'), { status: 400 });
          const source = skill || previousTechnology;
          return { id: technologyId, name: source.name, iconUrl: source.iconUrl || '' };
        });
        return { id: clean(role.id, 80) || id(), title: { fa: titleFa, en: titleEn }, description: { fa: descriptionFa, en: descriptionEn }, technologiesUsed, ...cleanPeriod(role, 'position') };
      }) };
    })
  };
  const fieldsToTranslate = result.companies.flatMap((company) => company.roles.flatMap((role) => [
    ...(!role.title.en ? [{ role, field: 'title', value: role.title.fa }] : []),
    ...(!role.description.en && role.description.fa ? [{ role, field: 'description', value: role.description.fa }] : [])
  ]));
  if (fieldsToTranslate.length) {
    try {
      const translations = await translateToEnglish(fieldsToTranslate.map((field) => field.value));
      fieldsToTranslate.forEach((field, index) => { field.role[field.field].en = translations[index]; });
    } catch (error) {
      await recordNotice('translation', error.message, 'validateCareer: translate position title and description', '/admin/career');
      fieldsToTranslate.forEach((field) => { field.role[field.field].en = ''; });
    }
  }
  return result;
}
function parseTags(value) {
  const tags = [...new Set(clean(value, 500).split(/[,\u060c\n]+/).map((tag) => tag.trim().replace(/^#+/, '').replace(/\s+/g, '_')).filter(Boolean))];
  if (tags.length > 12 || tags.some((tag) => tag.length > 40)) throw Object.assign(new Error('Use up to 12 hashtags, each under 40 characters.'), { status: 400 });
  return tags;
}
function slugifyPostTitle(value) {
  const persianLetters = { 'آ': 'a', 'ا': 'a', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ث': 's', 'ج': 'j', 'چ': 'ch', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'z', 'ر': 'r', 'ز': 'z', 'ژ': 'zh', 'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'z', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh', 'ف': 'f', 'ق': 'gh', 'ک': 'k', 'گ': 'g', 'ل': 'l', 'م': 'm', 'ن': 'n', 'و': 'v', 'ه': 'h', 'ی': 'y', 'ئ': 'y', 'ء': '' };
  return String(value || '').normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g, '').split('').map((letter) => persianLetters[letter] ?? letter).join('').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/g, '');
}
function uniquePostSlug(titleEn, titleFa, currentId = '') {
  const base = slugifyPostTitle(titleEn) || slugifyPostTitle(titleFa) || 'post';
  const used = new Set((store?.posts || []).filter((post) => post.id !== currentId).map((post) => post.slug).filter(Boolean));
  let slug = base;
  let suffix = 2;
  while (used.has(slug)) slug = `${base}-${suffix++}`;
  return slug;
}
function internalPushUrl(value, req, allowExternal = false) {
  const raw = clean(value, 500);
  if (!raw) return '/blog';
  const origin = req.headers.origin;
  const allowedOrigins = new Set([origin, `http://${req.headers.host || 'localhost'}`, `https://${req.headers.host || 'localhost'}`].filter(Boolean));
  try {
    if (raw.startsWith('/') && !raw.startsWith('//')) {
      const parsed = new URL(raw, 'http://internal.invalid');
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : allowExternal ? `https://${raw.replace(/^\/+/, '')}` : `${origin || `http://${req.headers.host || 'localhost'}`}/${raw.replace(/^\/+/, '')}`;
    const parsed = new URL(withScheme);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    if (!allowedOrigins.has(parsed.origin)) return allowExternal ? parsed.href : '';
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch (_) { return ''; }
}
function createFormattedTranslationTask(body, translateText) {
  const parts = [];
  const translate = (text) => {
    if (!text) return;
    const index = translateText(text);
    parts.push({ index });
  };
  const literal = (text) => { if (text) parts.push({ literal: text }); };
  for (const line of String(body).replace(/\r\n/g, '\n').split('\n')) {
    const image = line.match(/^(\s*!\[)([^\]]*)(\]\()([^)]+)(\).*)$/);
    if (image) {
      literal(image[1]); translate(image[2]); literal(`${image[3]}${image[4]}${image[5]}\n`);
      continue;
    }
    const heading = line.match(/^(\s*#{1,3}\s+)(.*)$/);
    if (heading) { literal(heading[1]); }
    let text = heading ? heading[2] : line;
    const bold = /\*\*([^*\n]+)\*\*/g;
    let cursor = 0;
    let match;
    while ((match = bold.exec(text))) {
      translate(text.slice(cursor, match.index));
      literal('**'); translate(match[1]); literal('**');
      cursor = match.index + match[0].length;
    }
    translate(text.slice(cursor));
    literal('\n');
  }
  if (parts.at(-1)?.literal === '\n') parts.pop();
  return { parts };
}
async function translatePostFields(fields, sources) {
  const texts = [];
  const tasks = {};
  for (const field of fields) {
    if (field !== 'body') {
      tasks[field] = { parts: [{ index: texts.push(sources[field]) - 1 }] };
      continue;
    }
    tasks.body = createFormattedTranslationTask(sources.body, (text) => texts.push(text) - 1);
  }
  if (!texts.length) return {};
  const translated = await translateToEnglish(texts);
  return Object.fromEntries(Object.entries(tasks).map(([field, task]) => [field, task.parts.map((part) => part.literal ?? translated[part.index]).join('')]));
}
async function validatePost(body, previous = null) {
  const titleFa = clean(body.title, 160);
  const excerptFa = clean(body.excerpt, 500);
  const bodyFa = clean(body.body, 28000);
  if (!titleFa || !excerptFa || !bodyFa) throw Object.assign(new Error('Complete the Persian title, summary and article.'), { status: 400 });
  for (const match of bodyFa.matchAll(/^!\[[^\]\n]*\]\(([^\s)]+)\)$/gm)) {
    if (!safeImageUrl(match[1])) throw Object.assign(new Error('Enter a valid article image URL.'), { status: 400 });
  }
  const image = safeImageUrl(body.image);
  if (!image) throw Object.assign(new Error('Every post needs a poster image.'), { status: 400 });
  const tags = parseTags(body.tags);
  const sources = { title: titleFa, excerpt: excerptFa, body: bodyFa };
  const previousPending = Array.isArray(previous?.translationPendingFields) ? previous.translationPendingFields : previous?.translationStatus === 'pending' ? ['title', 'excerpt', 'body'] : [];
  const translations = {};
  const fieldsToTranslate = [];
  for (const [field, source] of Object.entries(sources)) {
    const prior = previous?.[field];
    if (prior?.fa === source && typeof prior.en === 'string' && !previousPending.includes(field)) translations[field] = prior.en;
    else fieldsToTranslate.push(field);
  }
  let pendingFields = [];
  if (fieldsToTranslate.length) {
    try {
      Object.assign(translations, await translatePostFields(fieldsToTranslate, sources));
    } catch (error) {
      await recordNotice('translation', error.message, `validatePost: translate fields ${fieldsToTranslate.join(', ')}`, '/admin/posts');
      pendingFields = fieldsToTranslate;
      fieldsToTranslate.forEach((field) => { translations[field] = sources[field]; });
    }
  }
  return { id: previous?.id || id(), slug: uniquePostSlug(translations.title, titleFa, previous?.id), title: { fa: titleFa, en: translations.title }, excerpt: { fa: excerptFa, en: translations.excerpt }, body: { fa: bodyFa, en: translations.body }, translationStatus: pendingFields.length ? 'pending' : 'translated', translationPendingFields: pendingFields, tags: { fa: tags, en: tags }, image, likes: [], comments: [], published: body.published === true || body.published === 'on', createdAt: new Date().toISOString() };
}
function serveStatic(req, res, requestUrl) {
  if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { error: 'Method not allowed.' });
  const { pathname, search, hostname } = requestUrl;
  const origin = publicOrigin(process.env.PUBLIC_ORIGIN);
  if (pathname === '/robots.txt' || pathname === '/sitemap.xml') {
    if (pathname === '/sitemap.xml' && !origin) return json(res, 503, { error: 'Set PUBLIC_ORIGIN to publish a sitemap.' });
    const body = pathname === '/robots.txt' ? robotsText(origin) : sitemapXml(origin, store.posts);
    res.writeHead(200, { 'Content-Type': pathname === '/robots.txt' ? 'text/plain; charset=utf-8' : 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300', 'Content-Length': Buffer.byteLength(body), 'X-Content-Type-Options': 'nosniff' });
    return res.end(req.method === 'HEAD' ? undefined : body);
  }
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch (_) { return json(res, 400, { error: 'Invalid path.' }); }
  if (decoded === '/index.html') { res.writeHead(308, { Location: '/', 'Cache-Control': 'no-store' }); return res.end(); }
  if (decoded.startsWith('/uploads/')) {
    const filename = path.basename(decoded);
    if (!/^(?:resume-[a-zA-Z0-9-]+\.pdf|(?:skill-logo|social-logo|post-image|project-image|ad-image)-[a-zA-Z0-9-]+\.(?:png|jpe?g|webp))$/.test(filename)) return json(res, 404, { error: 'Not found.' });
    return fs.stat(path.join(UPLOAD_DIR, filename), (error, stat) => {
      if (error || !stat.isFile()) return json(res, 404, { error: 'Not found.' });
      const extension = path.extname(filename).toLowerCase();
      const contentType = extension === '.pdf' ? 'application/pdf' : extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg';
      res.writeHead(200, { 'Content-Type': contentType, 'Content-Length': stat.size, ...(extension === '.pdf' ? { 'Content-Disposition': 'inline', 'Cache-Control': 'private, no-store' } : { 'Cache-Control': 'public, max-age=31536000, immutable' }), 'X-Content-Type-Options': 'nosniff' });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(path.join(UPLOAD_DIR, filename)).on('error', () => res.destroy()).pipe(res);
    });
  }
  const file = path.resolve(buildRoot, decoded.replace(/^\/+/, ''));
  if (file !== buildRoot && !file.startsWith(buildRoot + path.sep)) return json(res, 404, { error: 'Not found.' });
  const relativePath = path.relative(buildRoot, file);
  if (relativePath.split(path.sep)[0].startsWith('.') || path.extname(file).toLowerCase() === '.cjs') return json(res, 404, { error: 'Not found.' });
  fs.stat(file, (error, stat) => {
    if ((error || !stat.isFile()) && path.extname(decoded) && !decoded.startsWith('/blog/')) return json(res, 404, { error: 'Not found.' });
    const target = !error && stat.isFile() ? file : path.join(ROOT, 'build', 'index.html');
    fs.stat(target, (readError, fileStat) => {
      if (readError || !fileStat.isFile()) return json(res, 404, { error: 'Build the website before using production mode.' });
      const extension = path.extname(target).toLowerCase();
      if (extension === '.html') {
        return fs.readFile(target, 'utf8', (htmlError, template) => {
          if (htmlError) return json(res, 500, { error: 'Could not read the website.' });
          const protocol = req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https' || (origin && origin === `https://${requestUrl.host}`) ? 'https:' : 'http:';
          const request = { renderer: renderPortfolio, location: pathname + search, search, hostname: forwardedTunnelHostname(req, hostname), protocol };
          const page = renderHtml(template, pathname, store.posts, origin, decoded === '/admin' ? null : visibleData(false), HOME_ASSETS, req.headers.cookie, request);
          const body = Buffer.from(page.html);
          const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': page.noindex ? 'no-store' : 'no-cache', 'Vary': 'Accept-Encoding, Cookie', 'Content-Security-Policy': page.structuredDataHash ? STATIC_CSP.replace("script-src 'self'", `script-src 'self' ${page.structuredDataHash}`) : STATIC_CSP, 'X-Content-Type-Options': 'nosniff', ...(page.noindex ? { 'X-Robots-Tag': 'noindex, nofollow' } : {}) };
          const send = (payload, compressed) => {
            if (res.destroyed) return;
            res.writeHead(page.status, { ...headers, 'Content-Length': payload.length, ...(compressed ? { 'Content-Encoding': 'gzip' } : {}) });
            res.end(req.method === 'HEAD' ? undefined : payload);
          };
          if (body.length > 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) return zlib.gzip(body, (gzipError, compressed) => send(gzipError ? body : compressed, !gzipError));
          return send(body, false);
        });
      }
      const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.json': 'application/json', '.woff': 'font/woff', '.woff2': 'font/woff2' };
      const cache = extension === '.html' || target === path.join(buildRoot, 'service-worker.js') ? 'no-cache' : /[.-][a-f0-9]{8,}\./i.test(path.basename(target)) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600';
      const compressible = /\.(?:js|css|svg|json)$/.test(target) && fileStat.size > 1024;
      const sendAsset = (asset, size, compressed) => {
        res.writeHead(200, { 'Content-Type': types[extension] || 'application/octet-stream', 'Content-Length': size, 'Cache-Control': cache, ...(compressible ? { Vary: 'Accept-Encoding' } : {}), ...(compressed ? { 'Content-Encoding': 'gzip' } : {}), 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY', 'Content-Security-Policy': STATIC_CSP });
        if (req.method === 'HEAD') return res.end();
        fs.createReadStream(asset).on('error', () => res.destroy()).pipe(res);
      };
      if (compressible && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
        return fs.stat(`${target}.gz`, (compressionError, compressedStat) => sendAsset(compressionError || !compressedStat.isFile() ? target : `${target}.gz`, compressionError || !compressedStat.isFile() ? fileStat.size : compressedStat.size, !compressionError && compressedStat.isFile()));
      }
      return sendAsset(target, fileStat.size, false);
    });
  });
}

async function serveDemoStatic(req, res, deployment, pathname, mountPath = '') {
  if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { error: 'Method not allowed.' });
  let decoded;
  try { decoded = decodeURIComponent(pathname); } catch (_) { return json(res, 400, { error: 'Invalid path.' }); }
  if (mountPath && decoded.split(/[\\/]+/).some((segment) => segment.startsWith('.') || segment.includes(':'))) return json(res, 404, { error: 'Not found.' });
  const root = path.resolve(deployment.sourceDir);
  let target = path.resolve(root, `.${decoded || '/'}`);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) return json(res, 404, { error: 'Not found.' });
  let stat = await fsp.stat(target).catch(() => null);
  if (stat?.isDirectory()) {
    target = path.join(target, 'index.html');
    stat = await fsp.stat(target).catch(() => null);
  }
  if (!stat?.isFile() && req.headers.accept?.includes('text/html')) {
    target = path.join(root, 'index.html');
    stat = await fsp.stat(target).catch(() => null);
  }
  if (!stat?.isFile()) return json(res, 404, { error: 'Not found.' });
  if (stat.size === 0) { res.writeHead(200, { 'Content-Length': 0, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' }); return res.end(); }
  const mimeTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp4': 'video/mp4', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject', '.pdf': 'application/pdf' };
  const extension = path.extname(target).toLowerCase();
  if (mountPath && extension === '.html') {
    const html = await fsp.readFile(target, 'utf8');
    const withPaths = html.replace(/(\s(?:src|href|action)\s*=\s*['"])\/(?!\/)/gi, (_, attribute) => `${attribute}${mountPath}`);
    const document = /<base\b/i.test(withPaths) ? withPaths : withPaths.replace(/<head\b[^>]*>/i, (head) => `${head}<base href="${mountPath}">`);
    res.writeHead(200, { 'Content-Type': mimeTypes['.html'], 'Content-Length': Buffer.byteLength(document), 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    return res.end(req.method === 'HEAD' ? undefined : document);
  }
  const canCompress = stat.size >= 1024 && /^(?:\.css|\.js|\.mjs|\.json|\.svg)$/.test(extension);
  const etag = `W/"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`;
  const headers = { 'Content-Type': mimeTypes[extension] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', ETag: etag };
  if (canCompress) headers.Vary = 'Accept-Encoding';
  const requestedTags = (req.headers['if-none-match'] || '').split(',').map((value) => value.trim());
  if (!req.headers.range && (requestedTags.includes(etag) || requestedTags.includes('*'))) {
    res.writeHead(304, headers);
    return res.end();
  }
  const acceptsGzip = (req.headers['accept-encoding'] || '').split(',').some((value) => /^gzip(?:\s*;\s*q\s*=\s*(?:1(?:\.0+)?|0\.\d*[1-9]\d*))?$/i.test(value.trim()));
  if (canCompress && !req.headers.range && acceptsGzip) {
    res.writeHead(200, { ...headers, 'Content-Encoding': 'gzip' });
    if (req.method === 'HEAD') return res.end();
    const stream = fs.createReadStream(target);
    const compressor = zlib.createGzip();
    stream.on('error', () => res.destroy());
    compressor.on('error', () => res.destroy());
    res.on('close', () => { stream.destroy(); compressor.destroy(); });
    stream.pipe(compressor).pipe(res);
    return;
  }
  let start = 0;
  let end = stat.size - 1;
  let status = 200;
  if (req.headers.range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if (!match || (!match[1] && !match[2])) { res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }); return res.end(); }
    if (!match[1]) { const suffix = Number(match[2]); start = Math.max(0, stat.size - suffix); }
    else start = Number(match[1]);
    if (match[2] && match[1]) end = Number(match[2]);
    if (start >= stat.size || end < start) { res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` }); return res.end(); }
    end = Math.min(end, stat.size - 1);
    status = 206;
    headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
  }
  headers['Content-Length'] = end - start + 1;
  res.writeHead(status, headers);
  if (req.method === 'HEAD') return res.end();
  const stream = fs.createReadStream(target, { start, end });
  stream.on('error', () => { if (!res.headersSent) json(res, 500, { error: 'Could not read demo file.' }); else res.destroy(); });
  stream.pipe(res);
}

function portfolioHostnames(req) {
  const origin = publicOrigin(process.env.PUBLIC_ORIGIN);
  const configuredHost = origin && new URL(origin).hostname;
  return new Set(['localhost', '127.0.0.1', '[::1]', req.socket.localAddress?.replace(/^::ffff:/, ''), configuredHost]);
}

function forwardedTunnelHostname(req, hostname) {
  const remote = req.socket.remoteAddress?.replace(/^::ffff:/, '');
  if (remote !== '::1' && remote !== '127.0.0.1') return hostname;
  const forwarded = String(req.headers['x-forwarded-host'] || '').toLowerCase();
  return demoTunnelHostname(forwarded, DEMO_PORT) ? forwarded : hostname;
}

async function serveTunnelDemo(req, res, pathname, search) {
  const match = /^\/demo\/([a-z0-9-]+)(\/.*)?$/.exec(pathname);
  const mountPath = demoTunnelPath(match?.[1]);
  const project = mountPath && store.projects.find(({ demoSubdomain, deployment }) => (demoSubdomain || deployment?.subdomain) === match[1]
    && deployment?.status === 'running' && deployment.runtimeKind === 'static' && deployment.sourceDir);
  if (!project) return json(res, 404, { error: 'Demo not found.' });
  if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { error: 'Method not allowed.' });
  if (!match[2]) {
    res.writeHead(308, { Location: mountPath + search });
    return res.end();
  }
  return serveDemoStatic(req, res, project.deployment, match[2], mountPath);
}

async function handleDemo(req, res) {
  try {
    const address = new URL(`http://${req.headers.host || 'localhost'}`);
    const { pathname, search } = new URL(req.url, address);
    const hostname = forwardedTunnelHostname(req, address.hostname.replace(/\.$/, ''));
    if (portfolioHostnames(req).has(hostname)) return json(res, 404, { error: 'Demo not found.' });
    if (pathname.startsWith('/demo/') && demoTunnelHostname(hostname, DEMO_PORT) === hostname) return await serveTunnelDemo(req, res, pathname, search);
    const demo = deploymentForHost(hostname, store.projects, process.env.DEMO_BASE_DOMAIN || 'localhost', req.socket.localAddress);
    if (!demo) return json(res, 404, { error: 'Demo not found.' });
    return demo.runtimeKind === 'static' ? await serveDemoStatic(req, res, demo, pathname) : proxyRequest(req, res, demo.localPort);
  } catch (error) {
    console.error('Demo request failed:', error.message);
    return res.headersSent ? res.destroy() : json(res, 500, { error: 'Could not load this demo.' });
  }
}

async function handle(req, res) {
  let address;
  let parsedUrl;
  try {
    address = new URL(`http://${req.headers.host || 'localhost'}`);
    parsedUrl = new URL(req.url, address);
  } catch (_) { return json(res, 400, { error: 'Invalid URL.' }); }
  const pathname = parsedUrl.pathname;
  const method = req.method;
  const reservedHosts = portfolioHostnames(req);
  if (!reservedHosts.has(address.hostname.replace(/\.$/, '')) && isDemoHost(address.host, store.projects, process.env.DEMO_BASE_DOMAIN || 'localhost', req.socket.localAddress)) {
    return json(res, 404, { error: 'Demo not found.' });
  }
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production' && process.env.PUBLIC_ORIGIN?.startsWith('https://')) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  if (pathname.startsWith('/api/') && !requireOrigin(req, res)) return;
  try {
    if (method === 'GET' && pathname === '/api/health') return json(res, 200, { ok: true, apiVersion: API_VERSION });
    if (method === 'GET' && pathname === '/api/events') return streamDataEvents(res);
    if (method === 'GET' && pathname === '/api/site-data') return publicSiteData(req, res);
    if (pathname === '/api/client-errors' && method === 'POST') {
      const ip = req.socket.remoteAddress || 'unknown';
      const current = clientErrorAttempts.get(ip) || { count: 0, resetAt: Date.now() + 60 * 60 * 1000 };
      if (current.resetAt < Date.now()) { current.count = 0; current.resetAt = Date.now() + 60 * 60 * 1000; }
      if (++current.count > 30) return json(res, 429, { error: 'Issue report limit reached.' });
      clientErrorAttempts.set(ip, current);
      const body = await readJson(req, 4000);
      const scope = normalizeIssueScope(body.scope);
      await recordNotice(scope, body.message, body.details, body.page);
      return json(res, 202, { recorded: true });
    }
    if (method === 'GET' && pathname === '/api/push/public-key') return json(res, 200, { publicKey: pushPublicKey });
    if (pathname === '/api/push/subscribe' && method === 'POST') {
      const subscription = await readJson(req, 12000);
      let endpoint;
      try { endpoint = new URL(clean(subscription.endpoint, 2048)); } catch (_) { return json(res, 400, { error: 'Invalid push subscription.' }); }
      const pushHost = endpoint.hostname.toLowerCase();
      const trustedPushHost = pushHost === 'fcm.googleapis.com' || pushHost.endsWith('.push.services.mozilla.com') || pushHost === 'push.services.mozilla.com' || pushHost === 'web.push.apple.com' || pushHost.endsWith('.notify.windows.com');
      if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password || !trustedPushHost || typeof subscription.keys?.p256dh !== 'string' || typeof subscription.keys?.auth !== 'string') return json(res, 400, { error: 'Invalid push subscription.' });
      const normalized = { endpoint: endpoint.toString(), expirationTime: subscription.expirationTime || null, keys: { p256dh: subscription.keys.p256dh.slice(0, 256), auth: subscription.keys.auth.slice(0, 256) } };
      const existing = pushSubscriptions.findIndex((item) => item.endpoint === normalized.endpoint);
      if (existing === -1 && pushSubscriptions.length >= 2000) return json(res, 429, { error: 'The notification subscriber limit has been reached.' });
      if (existing === -1) pushSubscriptions.push(normalized); else pushSubscriptions[existing] = normalized;
      await persistPushSubscriptions();
      return json(res, 201, { subscribed: true });
    }
    if (pathname === '/api/push/unsubscribe' && method === 'POST') {
      const endpoint = clean((await readJson(req, 4000)).endpoint, 2048);
      const before = pushSubscriptions.length;
      pushSubscriptions = pushSubscriptions.filter((item) => item.endpoint !== endpoint);
      if (pushSubscriptions.length !== before) await persistPushSubscriptions();
      return json(res, 200, { subscribed: false });
    }
    if (method === 'GET' && pathname === '/api/admin/status') return json(res, 200, { configured: Boolean(store.admin), setupAvailable: Boolean(process.env.ADMIN_SETUP_KEY), apiVersion: API_VERSION });
    if (pathname === '/api/admin/setup' && method === 'POST') {
      if (limited(req.socket.remoteAddress || 'unknown')) return json(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
      if (store.admin) return json(res, 409, { error: 'An admin account already exists.' });
      if (!process.env.ADMIN_SETUP_KEY) return json(res, 503, { error: 'Admin setup is disabled. Configure ADMIN_SETUP_KEY in .env first.' });
      const body = await readJson(req);
      const expected = Buffer.from(process.env.ADMIN_SETUP_KEY);
      const supplied = Buffer.from(clean(body.setupKey, 300));
      if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return json(res, 401, { error: 'Incorrect setup key.' });
      const username = clean(body.username, 32);
      const password = typeof body.password === 'string' ? body.password : '';
      if (username.length < 3 || !/^[a-zA-Z0-9._-]+$/.test(username)) return json(res, 400, { error: 'Use 3–32 letters, numbers, dots, underscores or hyphens for the username.' });
      if (password.length < 12 || password.length > 256) return json(res, 400, { error: 'Choose a password between 12 and 256 characters.' });
      const credential = await hashPassword(password);
      store.admin = { username, ...credential, createdAt: new Date().toISOString() };
      await persist(); createSession(res);
      return json(res, 201, { authenticated: true });
    }
    if (pathname === '/api/admin/login' && method === 'POST') {
      if (limited(req.socket.remoteAddress || 'unknown')) return json(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
      if (!store.admin) return json(res, 409, { error: 'Create the first admin account before signing in.' });
      const body = await readJson(req);
      const username = clean(body.username, 32);
      if (username !== store.admin.username || !(await passwordMatches(typeof body.password === 'string' ? body.password : '', store.admin))) return json(res, 401, { error: 'Invalid username or password.' });
      createSession(res);
      return json(res, 200, { authenticated: true });
    }
    if (pathname === '/api/admin/me' && method === 'GET') return json(res, 200, { authenticated: Boolean(sessionFor(req)) });
    if (pathname === '/api/admin/logout' && method === 'POST') { clearSession(req, res); return json(res, 200, { authenticated: false }); }
    if (!pathname.startsWith('/api/admin/')) {
      if (pathname === '/api/contact' && method === 'POST') {
        const ip = req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        const attempt = contactAttempts.get(ip) || { count: 0, resetAt: now + 60 * 60 * 1000 };
        if (attempt.resetAt < now) { attempt.count = 0; attempt.resetAt = now + 60 * 60 * 1000; }
        if (++attempt.count > 6) return json(res, 429, { error: 'Too many messages. Please try again later.' });
        contactAttempts.set(ip, attempt);
        const body = await readJson(req, 25000);
        if (body.website) return json(res, 201, { received: true });
        const name = clean(body.name, 80);
        const email = clean(body.email, 254);
        const phone = clean(body.phone, 30);
        const message = clean(body.message, 5000);
        if (!name || message.length < 4 || (!email && !phone)) return json(res, 400, { error: 'Enter your name, message, and an email address or phone number.' });
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res, 400, { error: 'Enter a valid email address.' });
        if (phone && !/^[+0-9\u06f0-\u06f9\u0660-\u0669()\s.\-]{7,30}$/.test(phone)) return json(res, 400, { error: 'Enter a valid phone number.' });
        store.messages.unshift({ id: id(), name, email, phone, body: message, createdAt: new Date().toISOString(), read: false });
        await persist();
        return json(res, 201, { received: true });
      }
      const postMatch = pathname.match(/^\/api\/posts\/([^/]+)\/(like|comments)$/);
      if (postMatch && method === 'POST') {
        const post = store.posts.find((entry) => entry.id === decodeURIComponent(postMatch[1]) && entry.published);
        if (!post) return json(res, 404, { error: 'Post not found.' });
        if (!allowPublicWrite(req, postMatch[2], postMatch[2] === 'like' ? 60 : 10)) return json(res, 429, { error: 'Too many requests. Please try again later.' });
        if (postMatch[2] === 'like') {
          const cookies = parseCookies(req);
          let visitor = cookies.portfolio_visitor;
          if (!visitor || !/^[a-f0-9-]{36}$/.test(visitor)) { visitor = id(); setCookie(res, 'portfolio_visitor', visitor, { maxAge: 365 * 24 * 60 * 60 }); }
          const body = await readJson(req);
          const liked = Array.isArray(post.likes) ? post.likes : (post.likes = []);
          if (liked.includes(visitor)) post.likes = liked.filter((value) => value !== visitor); else post.likes.push(visitor);
          await persist(); return json(res, 200, { likes: post.likes.length, liked: post.likes.includes(visitor) });
        }
        const body = await readJson(req);
        const author = clean(body.author, 60);
        const comment = clean(body.body, 2000);
        if (!author || !comment) return json(res, 400, { error: 'Name and comment are required.' });
        post.comments.push({ id: id(), author, body: comment, createdAt: new Date().toISOString() });
        await persist(); return json(res, 201, { comments: post.comments });
      }
      if ((process.env.NODE_ENV === 'production' || process.env.PORTFOLIO_SERVE_BUILD === 'true') && !pathname.startsWith('/api/')) return serveStatic(req, res, parsedUrl);
      return json(res, 404, { error: 'Not found.' });
    }
    if (!requireAdmin(req, res)) return;
    if (pathname === '/api/admin/notices' && method === 'GET') return json(res, 200, { notices: (store.notices || []).filter((notice) => !notice.resolvedAt) });
    const noticeMatch = pathname.match(/^\/api\/admin\/notices\/([^/]+)$/);
    if (noticeMatch && (method === 'PATCH' || method === 'DELETE')) {
      const notice = (store.notices || []).find((item) => item.id === decodeURIComponent(noticeMatch[1]));
      if (!notice) return json(res, 404, { error: 'Issue report not found.' });
      notice.resolvedAt = new Date().toISOString();
      await persist();
      return json(res, 200, { resolved: true });
    }
    if (pathname === '/api/admin/career' && method === 'PUT') {
      store.career = await validateCareer(await readJson(req, 50000));
      await persist();
      return json(res, 200, { career: store.career });
    }
    if (pathname === '/api/admin/push' && method === 'POST') {
      const body = await readJson(req, 5000);
      const title = clean(body.title, 90);
      const message = clean(body.body, 240);
      const kind = body.kind === 'advertisement' ? 'advertisement' : 'update';
      const url = internalPushUrl(body.url, req, kind === 'advertisement');
      const imagePost = kind === 'update' ? store.posts.find((post) => post.id === clean(body.imagePostId, 100) && post.published !== false) : null;
      const image = kind === 'advertisement' ? (body.imageUrl ? safeImageUrl(body.imageUrl) : '') : (imagePost ? safeImageUrl(imagePost.image) : '');
      if (!title || !message) return json(res, 400, { error: 'Enter a notification title and message.' });
      if (kind === 'update' && !image) return json(res, 400, { error: 'Choose a published post with a poster image for this notification.' });
      if (!url) return json(res, 400, { error: kind === 'advertisement' ? 'Enter a valid ad link, such as https://example.com.' : 'Choose a valid page on this website.' });
      const payload = JSON.stringify({ title, body: message, url, kind, image });
      let sent = 0;
      let failed = 0;
      const failureStatuses = {};
      const failureCodes = {};
      const expired = new Set();
      await Promise.all(pushSubscriptions.map(async (subscription) => {
        try { await webPush.sendNotification(subscription, payload); sent += 1; }
        catch (error) {
          if (error.statusCode === 404 || error.statusCode === 410) expired.add(subscription.endpoint);
          else { failed += 1; const status = String(Number(error.statusCode) || 'unknown'); failureStatuses[status] = (failureStatuses[status] || 0) + 1; const code = /^[A-Z0-9_]+$/.test(error.code || '') ? error.code : null; if (code) failureCodes[code] = (failureCodes[code] || 0) + 1; console.error('Push delivery failed:', { statusCode: error.statusCode || null, code, message: String(error.message || 'Push provider error').slice(0, 180) }); }
        }
      }));
      if (expired.size) {
        pushSubscriptions = pushSubscriptions.filter((subscription) => !expired.has(subscription.endpoint));
        await persistPushSubscriptions();
      }
      return json(res, 200, { sent, failed, attempted: sent + failed + expired.size, removed: expired.size, failureStatuses, failureCodes });
    }
    if (pathname === '/api/admin/media' && method === 'POST') {
      const mediaType = parsedUrl.searchParams.get('type');
      if (!['skill-logo', 'social-logo', 'post-image', 'project-image', 'ad-image'].includes(mediaType)) return json(res, 400, { error: 'Choose a supported image type.' });
      const bytes = await readBody(req, 3 * 1024 * 1024);
      let extension = '';
      if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) extension = 'png';
      else if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) extension = 'jpg';
      else if (bytes.length >= 12 && bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') extension = 'webp';
      if (!extension) return json(res, 415, { error: 'Upload a PNG, JPEG or WebP image.' });
      const filename = `${mediaType}-${Date.now()}-${crypto.randomBytes(5).toString('hex')}.${extension}`;
      await fsp.writeFile(path.join(UPLOAD_DIR, filename), bytes, { flag: 'wx' });
      return json(res, 201, { url: `/uploads/${filename}` });
    }
    const deploymentAction = pathname.match(/^\/api\/admin\/projects\/([^/]+)\/(config|deploy|stop|deployment)$/);
    if (deploymentAction) {
      const project = store.projects.find((item) => item.id === decodeURIComponent(deploymentAction[1]));
      if (!project) return json(res, 404, { error: 'Project not found.' });
      const action = deploymentAction[2];
      if (action === 'config' && method === 'POST') {
        const body = await readJson(req, 12000);
        const demoSubdomain = validateSubdomain(body.demoSubdomain);
        const containerPort = Number(body.containerPort || 3000);
        const serviceName = clean(body.serviceName, 63);
        if (!Number.isInteger(containerPort) || containerPort < 1 || containerPort > 65535) return json(res, 400, { error: 'Enter a valid app port between 1 and 65535.' });
        if (serviceName && !/^[a-zA-Z0-9_-]{1,63}$/.test(serviceName)) return json(res, 400, { error: 'Enter a valid Docker Compose service name.' });
        if (store.projects.some((item) => item.id !== project.id && item.demoSubdomain === demoSubdomain)) return json(res, 409, { error: 'This subdomain is already used by another project.' });
        project.demoSubdomain = demoSubdomain;
        project.containerPort = containerPort;
        project.serviceName = serviceName;
        await persist();
        return json(res, 200, { demoSubdomain, containerPort, serviceName });
      }
      if (action === 'stop' && method === 'POST') {
        await removeRuntime(project);
        project.demoEnabled = false;
        project.deployment = { ...(project.deployment || {}), status: 'stopped', localPort: 0, stoppedAt: new Date().toISOString() };
        await persist();
        return json(res, 200, { status: 'stopped' });
      }
      if (action === 'deployment' && method === 'DELETE') {
        await removeRuntime(project);
        await fsp.rm(path.join(DEPLOYMENTS_DIR, project.id), { recursive: true, force: true });
        project.deployment = null;
        await persist();
        return json(res, 204, {});
      }
      if (action === 'deploy' && method === 'POST') {
        if (!project.repoUrl) return json(res, 400, { error: 'Add a public GitHub repository URL before enabling this demo.' });
        if (!project.demoSubdomain) return json(res, 400, { error: 'Set your subdomain before deploying the source.' });
        if (store.projects.some((item) => item.id !== project.id && item.demoSubdomain === project.demoSubdomain)) return json(res, 409, { error: 'This subdomain is already used by another project.' });
        const parsedDemoUrl = project.demoUrl ? new URL(project.demoUrl) : null;
        if (parsedDemoUrl && parsedDemoUrl.pathname !== '/' && parsedDemoUrl.pathname !== '') return json(res, 400, { error: 'A deployed project URL must use the root of its domain.' });
        const manualHost = parsedDemoUrl?.hostname.replace(/\.$/, '') || '';
        if (manualHost && (reservedHosts.has(manualHost) || manualHost === address.hostname.replace(/\.$/, ''))) return json(res, 400, { error: 'Use a separate hostname for the deployed project.' });
        project.deployment = { ...(project.deployment || {}), status: 'building', error: '' };
        project.demoEnabled = true;
        await persist();
        try {
          const runtime = await deployProject(project, project.containerPort || 3000);
          const baseDomain = (process.env.DEMO_BASE_DOMAIN || 'localhost').toLowerCase();
          const localUrl = `http://${project.demoSubdomain}.localhost:${DEMO_PORT}`;
          const configuredUrl = baseDomain === 'localhost' ? localUrl : `https://${project.demoSubdomain}.${baseDomain}`;
          const publicUrl = parsedDemoUrl?.toString() || configuredUrl;
          project.deployment = { ...project.deployment, ...runtime, status: 'running', subdomain: project.demoSubdomain, customDomain: process.env.NODE_ENV === 'production' ? manualHost : '', localUrl, url: publicUrl, containerPort: project.containerPort || 3000, deployedAt: new Date().toISOString(), error: '' };
          await persist();
          return json(res, 200, { status: 'running', url: publicUrl, subdomain: project.demoSubdomain });
        } catch (error) {
          project.deployment = { ...project.deployment, status: 'failed', error: String(error.message || 'Deployment failed').slice(-1200) };
          await persist();
          throw error;
        }
      }
      return json(res, 405, { error: 'Method not allowed.' });
    }
    if (pathname === '/api/admin/skills' && method === 'POST') {
      const body = await readJson(req); const name = clean(body.name, 40); const iconUrl = safeImageUrl(body.iconUrl);
      if (!name || !iconUrl) return json(res, 400, { error: 'Enter a skill name and logo URL.' });
      const existing = store.skills.find((skill) => skill.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        const updated = { ...existing, name, iconUrl };
        store.skills = store.skills.map((skill) => skill.id === existing.id ? updated : skill);
        await persist(); return json(res, 200, updated);
      }
      const skill = { id: id(), name, iconUrl }; store.skills.push(skill); await persist(); return json(res, 201, skill);
    }
    if (pathname === '/api/admin/skills/order' && method === 'PUT') {
      const reordered = reorderByIds(store.skills, (await readJson(req))?.ids);
      if (!reordered) return json(res, 400, { error: 'Invalid skill order. Refresh and try again.' });
      store.skills = reordered; await persist(); return json(res, 200, { skills: store.skills });
    }
    const skillMatch = pathname.match(/^\/api\/admin\/skills\/([^/]+)$/);
    if (skillMatch && method === 'PUT') {
      const index = store.skills.findIndex((skill) => skill.id === decodeURIComponent(skillMatch[1]));
      if (index === -1) return json(res, 404, { error: 'Skill not found.' });
      const body = await readJson(req); const name = clean(body.name, 40); const iconUrl = safeImageUrl(body.iconUrl);
      if (!name || !iconUrl) return json(res, 400, { error: 'Enter a skill name and logo URL.' });
      if (store.skills.some((skill) => skill.id !== store.skills[index].id && skill.name.toLowerCase() === name.toLowerCase())) return json(res, 409, { error: 'This skill already exists.' });
      const updated = { ...store.skills[index], name, iconUrl };
      store.skills[index] = updated; await persist(); return json(res, 200, updated);
    }
    if (skillMatch && method === 'DELETE') { store.skills = store.skills.filter((skill) => skill.id !== decodeURIComponent(skillMatch[1])); await persist(); return json(res, 204, {}); }
    if (pathname === '/api/admin/socials' && method === 'POST') {
      const body = await readJson(req);
      const href = safeUrl(body.href);
      const iconUrl = safeImageUrl(body.iconUrl);
      if (!href || !iconUrl) return json(res, 400, { error: 'A profile URL and a logo are required.' });
      if (!Array.isArray(store.socials)) store.socials = defaultSocials.map((item) => ({ ...item }));
      const existing = store.socials.find((account) => account.href === href);
      if (existing) {
        const updated = { ...existing, iconUrl };
        store.socials = store.socials.map((account) => account.id === existing.id ? updated : account);
        await persist(); return json(res, 200, updated);
      }
      const account = { id: id(), href, iconUrl };
      store.socials.unshift(account);
      await persist();
      return json(res, 201, account);
    }
    if (pathname === '/api/admin/socials/order' && method === 'PUT') {
      const reordered = reorderByIds(store.socials || defaultSocials, (await readJson(req))?.ids);
      if (!reordered) return json(res, 400, { error: 'Invalid social link order. Refresh and try again.' });
      store.socials = reordered; await persist(); return json(res, 200, { socials: store.socials });
    }
    const socialMatch = pathname.match(/^\/api\/admin\/socials\/([^/]+)$/);
    if (socialMatch && method === 'PUT') {
      const account = (store.socials || defaultSocials).find((item) => item.id === decodeURIComponent(socialMatch[1]));
      if (!account) return json(res, 404, { error: 'Social link not found.' });
      const body = await readJson(req);
      const href = safeUrl(body.href);
      const iconUrl = safeImageUrl(body.iconUrl);
      if (!href || !iconUrl) return json(res, 400, { error: 'A profile URL and a logo are required.' });
      const updated = { ...account, href, iconUrl };
      store.socials = (store.socials || defaultSocials).map((item) => item.id === account.id ? updated : item);
      await persist();
      return json(res, 200, updated);
    }
    if (socialMatch && method === 'DELETE') { store.socials = (store.socials || defaultSocials).filter((account) => account.id !== decodeURIComponent(socialMatch[1])); await persist(); return json(res, 204, {}); }
    if (pathname === '/api/admin/projects' && method === 'POST') {
      const project = { id: id(), ...await projectInput(await readJson(req)), createdAt: new Date().toISOString() };
      const linkConflict = projectLinkConflict(project);
      if (linkConflict) return json(res, 409, { error: linkConflict });
      if (project.demoSubdomain && store.projects.some((item) => item.demoSubdomain === project.demoSubdomain)) return json(res, 409, { error: 'This subdomain is already used by another project.' });
      store.projects.unshift(project); await persist(); return json(res, 201, project);
    }
    if (pathname === '/api/admin/projects/order' && method === 'PUT') {
      const reordered = reorderByIds(store.projects, (await readJson(req))?.ids);
      if (!reordered) return json(res, 400, { error: 'Invalid project order. Refresh and try again.' });
      store.projects = reordered; await persist(); return json(res, 200, { projects: store.projects });
    }
    const projectMatch = pathname.match(/^\/api\/admin\/projects\/([^/]+)$/);
    if (projectMatch && ['PUT', 'DELETE'].includes(method)) {
      const index = store.projects.findIndex((project) => project.id === decodeURIComponent(projectMatch[1]));
      if (index === -1) return json(res, 404, { error: 'Project not found.' });
      if (method === 'DELETE') { const [removed] = store.projects.splice(index, 1); await removeRuntime(removed); await fsp.rm(path.join(DEPLOYMENTS_DIR, removed.id), { recursive: true, force: true }); await persist(); return json(res, 204, {}); }
      const updated = { ...store.projects[index], ...await projectInput(await readJson(req), store.projects[index]) };
      const linkConflict = projectLinkConflict(updated, updated.id);
      if (linkConflict) return json(res, 409, { error: linkConflict });
      if (updated.demoSubdomain && store.projects.some((item) => item.id !== updated.id && item.demoSubdomain === updated.demoSubdomain)) return json(res, 409, { error: 'This subdomain is already used by another project.' });
      store.projects[index] = updated;
      await persist(); return json(res, 200, store.projects[index]);
    }
    const postMatch = pathname.match(/^\/api\/admin\/posts\/([^/]+)$/);
    if (pathname === '/api/admin/posts' && method === 'POST') { const post = await validatePost(await readJson(req)); store.posts.unshift(post); await persist(); return json(res, 201, post); }
    if (postMatch && method === 'PUT') {
      const index = store.posts.findIndex((post) => post.id === decodeURIComponent(postMatch[1]));
      if (index === -1) return json(res, 404, { error: 'Post not found.' });
      const previous = store.posts[index];
      const updated = await validatePost(await readJson(req), previous);
      store.posts[index] = { ...updated, id: previous.id, createdAt: previous.createdAt, updatedAt: new Date().toISOString(), likes: previous.likes || [], comments: previous.comments || [] };
      await persist();
      return json(res, 200, store.posts[index]);
    }
    if (postMatch && method === 'DELETE') { store.posts = store.posts.filter((post) => post.id !== decodeURIComponent(postMatch[1])); await persist(); return json(res, 204, {}); }
    if (pathname === '/api/admin/comments' && method === 'GET') return json(res, 200, store.posts.flatMap((post) => post.comments.map((comment) => ({ ...comment, postId: post.id }))));
    const replyMatch = pathname.match(/^\/api\/admin\/posts\/([^/]+)\/comments\/([^/]+)\/replies$/);
    if (replyMatch && method === 'POST') {
      const post = store.posts.find((item) => item.id === decodeURIComponent(replyMatch[1]));
      const comment = post?.comments.find((item) => item.id === decodeURIComponent(replyMatch[2]));
      if (!comment) return json(res, 404, { error: 'Comment not found.' });
      const body = clean((await readJson(req)).body, 2000);
      if (!body) return json(res, 400, { error: 'Reply cannot be empty.' });
      const reply = { id: id(), author: 'عباس روحانی تبار', body, admin: true, createdAt: new Date().toISOString() };
      comment.replies = [...(comment.replies || []), reply];
      await persist(); return json(res, 201, reply);
    }
    const commentMatch = pathname.match(/^\/api\/admin\/comments\/([^/]+)$/);
    if (commentMatch && method === 'DELETE') { const commentId = decodeURIComponent(commentMatch[1]); store.posts.forEach((post) => { post.comments = post.comments.filter((comment) => comment.id !== commentId); }); await persist(); return json(res, 204, {}); }
    if (pathname === '/api/admin/ads/order' && method === 'PUT') {
      const reordered = reorderByIds(store.ads || [], (await readJson(req))?.ids);
      if (!reordered) return json(res, 400, { error: 'Invalid ad order. Refresh and try again.' });
      store.ads = reordered; await persist(); return json(res, 200, { ads: store.ads });
    }
    if (pathname === '/api/admin/ads' && method === 'POST') {
      const ad = { id: id(), ...await adInput(await readJson(req)), createdAt: new Date().toISOString() };
      store.ads.unshift(ad); await persist(); return json(res, 201, ad);
    }
    const adMatch = pathname.match(/^\/api\/admin\/ads\/([^/]+)$/);
    if (adMatch && ['PUT', 'DELETE'].includes(method)) {
      const index = (store.ads || []).findIndex((ad) => ad.id === decodeURIComponent(adMatch[1]));
      if (index === -1) return json(res, 404, { error: 'Ad not found.' });
      if (method === 'DELETE') { store.ads.splice(index, 1); await persist(); return json(res, 204, {}); }
      store.ads[index] = { ...store.ads[index], ...await adInput(await readJson(req), store.ads[index]) };
      await persist(); return json(res, 200, store.ads[index]);
    }
    const messageMatch = pathname.match(/^\/api\/admin\/messages\/([^/]+)$/);
    if (messageMatch && (method === 'PATCH' || method === 'DELETE')) {
      const index = store.messages.findIndex((item) => item.id === decodeURIComponent(messageMatch[1]));
      if (index === -1) return json(res, 404, { error: 'Message not found.' });
      if (method === 'DELETE') { store.messages.splice(index, 1); await persist(); return json(res, 204, {}); }
      store.messages[index].read = Boolean((await readJson(req)).read);
      await persist(); return json(res, 200, store.messages[index]);
    }
    if (pathname === '/api/admin/resume' && method === 'POST') {
      if (req.headers['content-type'] !== 'application/pdf') return json(res, 415, { error: 'Upload a PDF file.' });
      const file = await readBody(req, 10 * 1024 * 1024);
      if (file.length < 5 || file.subarray(0, 5).toString() !== '%PDF-') return json(res, 400, { error: 'The uploaded file is not a valid PDF.' });
      const filename = `resume-${Date.now()}-${crypto.randomBytes(5).toString('hex')}.pdf`;
      await fsp.writeFile(path.join(UPLOAD_DIR, filename), file, { flag: 'wx' });
      store.resume = `/uploads/${filename}`; await persist(); return json(res, 201, { resume: store.resume });
    }
    return json(res, 404, { error: 'Not found.' });
  } catch (error) {
    if (res.headersSent || res.destroyed) return;
    if (error instanceof TypeError && /URL/.test(error.message)) return json(res, 400, { error: 'Enter a valid HTTP or HTTPS URL.' });
    if (error.status) return json(res, error.status, { error: error.message });
    await recordNotice(pathname.includes('/posts') ? 'posts' : pathname.includes('/projects') ? 'projects' : pathname.includes('/career') ? 'experience' : pathname.includes('/translate') ? 'translation' : 'api', error.message || 'Server request failed.', error.stack || '', pathname);
    console.error(error);
    return json(res, 500, { error: 'The server could not complete the request.' });
  }
}

function listen(handler, port, address) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    server.once('error', reject);
    server.listen(port, () => { console.log(`Listening on ${address}`); resolve(); });
  });
}

init().then(() => {
  if (PORT === DEMO_PORT) throw new Error('The portfolio and demos need separate ports.');
  return Promise.all([
    listen(handle, PORT, `http://localhost:${PORT}`),
    listen(handleDemo, DEMO_PORT, `http://<demo>.localhost:${DEMO_PORT}`)
  ]);
}).catch((error) => { console.error('Could not start the portfolio server:', error); process.exit(1); });
