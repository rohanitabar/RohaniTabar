'use strict';
const crypto = require('node:crypto');
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { Hero, mobilePortraitQuery } = require('../src/app/Hero');

const BRAND = 'Abbas Rohani Tabar';
const HOME_TITLE = 'عباس روحانی‌تبار | توسعه‌دهنده فرانت‌اند';
const HOME_DESCRIPTION = 'پروژه‌ها، مهارت‌ها، تجربه‌های کاری و نوشته‌های عباس روحانی‌تبار درباره توسعه وب.';

function publicOrigin(value) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return '';
    return url.origin;
  } catch (_) { return ''; }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

function localized(value) {
  return typeof value === 'string' ? value : value?.fa || value?.en || '';
}

function plainText(value) {
  return String(value || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/[#*_`\[\]]/g, '').replace(/\s+/g, ' ').trim();
}

function imageUrl(value, origin) {
  try {
    const url = new URL(value || '/icons/brand.jpg', origin || 'https://invalid.example');
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || (!origin && url.hostname === 'invalid.example')) return '';
    return url.href;
  } catch (_) { return ''; }
}

function pageMetadata(pathname, posts, origin) {
  const path = pathname.replace(/\/$/, '') || '/';
  const base = { title: HOME_TITLE, description: HOME_DESCRIPTION, path: '/', type: 'website', status: 200, noindex: false, image: imageUrl('/icons/brand.jpg', origin) };
  if (path === '/') return base;
  if (['/about', '/experience', '/skills', '/featured-projects', '/latest-posts', '/contact'].includes(path)) return base;
  if (path === '/blog') return { ...base, title: `وبلاگ | ${BRAND}`, description: 'مقاله‌ها و یادداشت‌های عباس روحانی‌تبار درباره طراحی و توسعه وب.', path };
  if (path === '/projects') return { ...base, title: `پروژه‌ها | ${BRAND}`, description: 'نمونه پروژه‌ها و دموهای عباس روحانی‌تبار در توسعه وب.', path };
  if (path === '/admin') return { ...base, title: `پنل مدیریت | ${BRAND}`, path, noindex: true };
  if (path.startsWith('/blog/')) {
    let slug;
    try { slug = decodeURIComponent(path.slice(6)); } catch (_) { return { ...base, status: 404, noindex: true }; }
    const post = posts.find((item) => item.published === true && (item.slug === slug || item.id === slug));
    if (post) return {
      title: `${plainText(localized(post.title))} | ${BRAND}`,
      description: plainText(localized(post.excerpt) || localized(post.body)).slice(0, 160),
      path: `/blog/${encodeURIComponent(post.slug || post.id)}`,
      type: 'article', status: 200, noindex: false, post,
      image: imageUrl(post.image, origin)
    };
  }
  return { ...base, title: `صفحه پیدا نشد | ${BRAND}`, status: 404, noindex: true };
}

function renderHome(template, assets, cookie = '') {
  const { images, css, cssPath, logo } = assets;
  const root = '<div id="root"></div>';
  const stylesheet = `<link href="${cssPath}" rel="stylesheet">`;
  const bundle = template.match(/<script defer="defer" src="(\/static\/js\/main\.[a-f0-9]+\.js)"><\/script>/);
  const isPortrait = (src) => /^\/static\/media\/[a-zA-Z0-9._-]+\.webp$/.test(src || '');
  if (!bundle || !css || !isPortrait(images?.mobile) || !isPortrait(images?.desktop) || !template.includes(root) || !template.includes(stylesheet)) return null;

  const preferences = cookie.split(';').map((value) => value.trim());
  const lang = preferences.includes('portfolio-language=en') ? 'en' : 'fa';
  const theme = preferences.includes('portfolio-theme=dark') ? 'dark' : 'light';
  const preloads = [[images.mobile, mobilePortraitQuery], [images.desktop, '(width > 680px)']].map(([src, media]) =>
    `<link rel="preload" as="image" type="image/webp" href="${src}" media="${media}" fetchpriority="high">`).join('');
  const hero = renderToStaticMarkup(createElement(Hero, { lang, images }));
  const logoPath = /^\/static\/media\/[\w.-]+\.jpg$/.test(logo || '') ? logo : '/icons/brand.jpg';
  const shell = `<div class="site-shell"><header class="topbar"><a class="brand" href="/" aria-label="Abbas home"><img src="${logoPath}" fetchpriority="low" alt=""><span>AbbasRt<span class="brand-dot">.</span></span></a></header><main>${hero}</main></div>`;
  // Let the browser paint the server-rendered portrait before React replaces the shell.
  const startup = `(() => {
    const portrait = document.querySelector('#home picture img');
    let started = false;
    let observer;
    const launch = () => {
      if (started) return;
      started = true;
      clearTimeout(timer);
      observer?.disconnect();
      window.removeEventListener('pointerdown', launch);
      window.removeEventListener('keydown', launch);
      const script = document.createElement('script');
      script.src = '${bundle[1]}';
      document.head.append(script);
    };
    const timer = setTimeout(launch, 2500);
    window.addEventListener('pointerdown', launch, { once: true, passive: true });
    window.addEventListener('keydown', launch, { once: true });
    if (!document.hidden && portrait && portrait.decode) {
      if (window.PerformanceObserver?.supportedEntryTypes.includes('largest-contentful-paint')) {
        observer = new PerformanceObserver((list) => {
          if (list.getEntries().some((entry) => entry.element === portrait)) launch();
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        portrait.decode().catch(launch);
      } else {
        portrait.decode().then(() => requestAnimationFrame(() => requestAnimationFrame(launch)), launch);
      }
    } else {
      launch();
    }
  })();`;
  const html = template
    .replace(/<html[^>]*>/i, `<html lang="${lang}" dir="${lang === 'fa' ? 'rtl' : 'ltr'}" data-theme="${theme}">`)
    .replace('<title>', `${preloads}<title>`)
    .replace(stylesheet, () => `<style>${css}</style>`)
    .replace(bundle[0], '')
    .replace(root, () => `<div id="root">${shell}</div>`);
  return { html, startup };
}

function renderHtml(template, pathname, posts, origin, publicData = null, homeAssets = {}, cookie = '') {
  const page = pageMetadata(pathname, posts, origin);
  const route = pathname.replace(/\/$/, '') || '/';
  const url = origin && !page.noindex ? `${origin}${page.path}` : '';
  const tags = [
    `<meta name="robots" content="${page.noindex ? 'noindex,nofollow' : 'index,follow'}" />`,
    `<meta property="og:type" content="${page.type}" />`,
    `<meta property="og:locale" content="fa_IR" />`,
    `<meta property="og:site_name" content="${BRAND}" />`,
    `<meta property="og:title" content="${escapeHtml(page.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(page.description)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />'
  ];
  if (route === '/projects' || route === '/featured-projects') {
    const firstProject = (publicData?.projects || []).find((project) => route === '/projects' || project.featured !== false);
    const cover = firstProject?.displayImage || firstProject?.image;
    if (/^\/uploads\/[a-zA-Z0-9._-]+$/.test(cover || '')) {
      tags.unshift(`<link rel="preload" as="image" href="${escapeHtml(cover)}" fetchpriority="high" />`);
    }
  }
  if (page.post && origin && page.image?.startsWith(`${origin}/uploads/`)) tags.push(`<link rel="preload" as="image" href="${escapeHtml(page.image)}" fetchpriority="high" />`);
  tags.push(`<meta name="twitter:title" content="${escapeHtml(page.title)}" />`, `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`);
  let structuredDataHash = '';
  if (url) tags.push(`<link rel="canonical" href="${escapeHtml(url)}" />`, `<meta property="og:url" content="${escapeHtml(url)}" />`);
  if (page.image) tags.push(`<meta property="og:image" content="${escapeHtml(page.image)}" />`, `<meta name="twitter:image" content="${escapeHtml(page.image)}" />`);
  if (url && page.post) {
    const article = { '@context': 'https://schema.org', '@type': 'BlogPosting', headline: plainText(localized(page.post.title)), description: page.description, mainEntityOfPage: url, author: { '@type': 'Person', name: BRAND }, datePublished: page.post.createdAt };
    if (page.post.updatedAt) article.dateModified = page.post.updatedAt;
    if (page.image) article.image = page.image;
    const structuredData = JSON.stringify(article).replace(/</g, '\\u003c');
    structuredDataHash = `'sha256-${crypto.createHash('sha256').update(structuredData).digest('base64')}'`;
    tags.push(`<script type="application/ld+json">${structuredData}</script>`);
  }
  let bootstrap = '';
  if (publicData && !page.noindex) {
    const data = JSON.stringify(publicData).replace(/</g, '\\u003c');
    if (Buffer.byteLength(data) < 200000) {
      structuredDataHash = `${structuredDataHash} 'sha256-${crypto.createHash('sha256').update(data).digest('base64')}'`.trim();
      bootstrap = `<script id="site-bootstrap" type="application/json">${data}</script>`;
    }
  }
  const home = route === '/' ? renderHome(template, homeAssets, cookie) : null;
  if (home) {
    structuredDataHash = `${structuredDataHash} 'sha256-${crypto.createHash('sha256').update(home.startup).digest('base64')}'`.trim();
    bootstrap += `<script>${home.startup}</script>`;
  }
  const html = (home?.html || template)
    .replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(page.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/i, `<meta name="description" content="${escapeHtml(page.description)}" />`)
    .replace('</head>', () => `    ${tags.join('\n    ')}\n  </head>`)
    .replace('</body>', () => `${bootstrap}</body>`);
  return { html, status: page.status, noindex: page.noindex, structuredDataHash };
}

function sitemapXml(origin, posts) {
  const entries = ['/', '/blog', '/projects'].map((path) => ({ path }));
  for (const post of posts) {
    if (post.published === true) entries.push({ path: `/blog/${encodeURIComponent(post.slug || post.id)}`, lastmod: post.updatedAt || post.createdAt });
  }
  const urls = entries.map(({ path, lastmod }) => {
    const date = lastmod && !Number.isNaN(Date.parse(lastmod)) ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : '';
    return `<url><loc>${escapeHtml(origin + path)}</loc>${date}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
}

function robotsText(origin) {
  const publicRules = 'Allow: /\nDisallow: /admin\nDisallow: /api/\n';
  return `User-agent: *\n${publicRules}\nUser-agent: OAI-SearchBot\nUser-agent: ChatGPT-User\n${publicRules}${origin ? `\nSitemap: ${origin}/sitemap.xml\n` : ''}`;
}

module.exports = { publicOrigin, pageMetadata, renderHtml, sitemapXml, robotsText };
