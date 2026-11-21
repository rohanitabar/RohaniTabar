const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { deploymentForHost } = require('../server/deployments');
const { renderHtml, sitemapXml } = require('../server/seo');

test('SEO output indexes only published posts and escapes editorial input', () => {
  const origin = 'https://example.com';
  const posts = [
    { id: 'public', slug: 'safe-story', published: true, title: { fa: 'عنوان <script>alert(1)</script>' }, excerpt: { fa: 'متن <b>نمونه</b>' }, image: '/uploads/post-image-123.png', createdAt: '2025-01-02T00:00:00.000Z' },
    { id: 'draft', slug: 'secret-draft', published: false, title: { fa: 'پیش‌نویس' }, createdAt: '2025-01-03T00:00:00.000Z' }
  ];
  const template = '<html><head><meta name="description" content="old" /><title>Old</title></head><body></body></html>';
  const page = renderHtml(template, '/blog/safe-story', posts, origin, { skills: [], projects: [], posts, socials: [], note: '</script><script>alert(1)</script>' });
  assert.equal(page.status, 200);
  assert.match(page.html, /rel="canonical" href="https:\/\/example\.com\/blog\/safe-story"/);
  assert.match(page.html, /property="og:image" content="https:\/\/example\.com\/uploads\/post-image-123\.png"/);
  assert.match(page.html, /rel="preload" as="image" href="https:\/\/example\.com\/uploads\/post-image-123\.png" fetchpriority="high"/);
  assert.match(page.html, /&lt;script&gt;/);
  assert.doesNotMatch(page.html, /<script>alert\(1\)<\/script>/);
  assert.match(page.html, /application\/ld\+json/);
  assert.match(page.html, /id="site-bootstrap"/);
  assert.doesNotMatch(page.html, /<\/script><script>alert\(1\)<\/script>/);
  assert.match(page.structuredDataHash, /^'sha256-/);
  assert.equal(renderHtml(template, '/blog/secret-draft', posts, origin).status, 404);
  assert.equal(renderHtml(template, '/skills', posts, origin).status, 200);
  const sitemap = sitemapXml(origin, posts);
  assert.match(sitemap, /safe-story/);
  assert.doesNotMatch(sitemap, /secret-draft/);
  assert.doesNotMatch(sitemap, /admin/);
});

test('home HTML can paint the correct portrait and theme before React starts', () => {
  const cssPath = '/static/css/main.abc123.css';
  const template = `<html><head><title>Home</title><script defer="defer" src="/static/js/main.abc123.js"></script><link href="${cssPath}" rel="stylesheet"></head><body><div id="root"></div></body></html>`;
  const assets = {
    cssPath,
    css: '.portrait-frame{width:176px}',
    images: { mobile: '/static/media/mobile.webp', desktop: '/static/media/desktop.webp' }
  };
  const { html, structuredDataHash } = renderHtml(template, '/', [], 'https://example.com', { skills: [] }, assets, 'portfolio-language=en; portfolio-theme=dark');
  assert.match(html, /<html lang="en" dir="ltr" data-theme="dark">/);
  assert.match(html, /<style>\.portrait-frame\{width:176px\}<\/style>/);
  assert.doesNotMatch(html, /rel="stylesheet"/);
  assert.equal((html.match(/rel="preload"/g) || []).length, 2);
  assert.match(html, /<picture class="portrait-frame">.*?mobile\.webp.*?desktop\.webp.*?<\/picture>/);
  assert.ok(html.indexOf('<picture') < html.indexOf('id="site-bootstrap"'));
  assert.doesNotMatch(html, /<script defer/);
  assert.match(html, /portrait\.decode\(\)/);
  assert.equal(structuredDataHash.split(' ').length, 2);
  assert.doesNotMatch(renderHtml(template, '/blog', [], 'https://example.com', null, assets).html, /<picture/);
  const projects = { projects: [{ featured: false, image: '/uploads/other.webp' }, { image: '/uploads/original.png', displayImage: '/uploads/cover.optimized.webp' }] };
  const featured = renderHtml(template, '/featured-projects', [], 'https://example.com', projects, assets).html;
  assert.doesNotMatch(featured, /<picture|rel="preload"[^>]*other\.webp/);
  assert.match(featured, /rel="preload" as="image" href="\/uploads\/cover\.optimized\.webp"/);
});

test('routes a LAN demo hostname only to the matching local address', () => {
  const deployment = { status: 'running', runtimeKind: 'static', sourceDir: 'demo' };
  const projects = [{ demoSubdomain: 'musicplayer', deployment }];
  assert.equal(deploymentForHost('musicplayer.192.168.1.20.nip.io:5000', projects, 'localhost', '192.168.1.20'), deployment);
  assert.equal(deploymentForHost('musicplayer.192.168.1.21.nip.io:5000', projects, 'localhost', '192.168.1.20'), null);
});

test('serves a project demo on the isolated local preview origin', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-demo-test-'));
  const sourceDir = path.join(dataDir, 'source');
  await fs.mkdir(sourceDir, { recursive: true });
  await fs.writeFile(path.join(sourceDir, 'index.html'), '<html><head></head><body><script src="/assets/app.js"></script></body></html>');
  const script = 'console.log(123);\n'.repeat(200);
  await fs.mkdir(path.join(sourceDir, 'assets'));
  await fs.writeFile(path.join(sourceDir, 'assets', 'app.js'), script);
  const port = await freePort();
  let demoPort = await freePort();
  while (demoPort === port) demoPort = await freePort();
  await fs.writeFile(path.join(dataDir, 'site.json'), JSON.stringify({
    admin: null, skills: [], posts: [], socials: [], resume: null, ads: [], messages: [], notices: [], career: { noExperience: false, companies: [] },
    projects: [{ id: 'demo1', demoSubdomain: 'musicplayer', projectType: 'static', deployment: { status: 'running', runtimeKind: 'static', sourceDir } }]
  }));
  const server = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), LOCAL_DEMO_PORT: String(demoPort), NODE_ENV: 'development', PORTFOLIO_DATA_DIR: dataDir, PORTFOLIO_UPLOAD_DIR: path.join(dataDir, 'uploads') },
    stdio: 'ignore'
  });
  t.after(async () => {
    if (server.exitCode === null) { const closed = new Promise((resolve) => server.once('exit', resolve)); server.kill(); await closed; }
    await fs.rm(dataDir, { recursive: true, force: true });
  });
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { if ((await fetch(`http://127.0.0.1:${demoPort}/demo/musicplayer/`)).ok) { ready = true; break; } } catch (_) { /* Wait for startup. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'demo preview server started');
  const response = await fetch(`http://127.0.0.1:${demoPort}/demo/musicplayer/`);
  const html = await response.text();
  assert.match(html, /<base href="\/demo\/musicplayer\/">/);
  assert.match(html.toLowerCase(), /src="\/demo\/musicplayer\/assets\/app\.js"/);
  const asset = `http://127.0.0.1:${demoPort}/demo/musicplayer/assets/app.js`;
  const compressed = await fetch(asset, { headers: { 'Accept-Encoding': 'gzip' } });
  assert.equal(compressed.headers.get('content-encoding'), 'gzip');
  assert.equal(await compressed.text(), script);
  const cached = await fetch(asset, { headers: { 'If-None-Match': compressed.headers.get('etag') } });
  assert.equal(cached.status, 304);
  const partial = await fetch(asset, { headers: { Range: 'bytes=0-15', 'Accept-Encoding': 'gzip' } });
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get('content-encoding'), null);
  assert.equal(await partial.text(), script.slice(0, 16));
});

async function freePort() {
  const listener = net.createServer();
  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  return port;
}

test('production API applies origin, compression and static security rules', async (t) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-api-test-'));
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, [path.join(__dirname, '..', 'server', 'index.js')], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), NODE_ENV: 'production', PUBLIC_ORIGIN: origin, PORTFOLIO_DATA_DIR: dataDir, PORTFOLIO_UPLOAD_DIR: path.join(dataDir, 'uploads') },
    stdio: 'ignore'
  });
  t.after(async () => {
    if (server.exitCode === null) {
      const closed = new Promise((resolve) => server.once('exit', resolve));
      server.kill();
      await closed;
    }
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { const response = await fetch(`${origin}/api/health`); if (response.ok) { ready = true; break; } } catch (_) { /* Wait for startup. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'API started');

  const rejected = await fetch(`${origin}/api/health`, { headers: { Origin: 'https://another.example' } });
  assert.equal(rejected.status, 403);
  const data = await fetch(`${origin}/api/site-data`, { headers: { 'Accept-Encoding': 'gzip', Origin: origin } });
  assert.equal(data.status, 200);
  assert.equal(data.headers.get('content-encoding'), 'gzip');
  assert.equal(data.headers.get('cache-control'), 'no-store');
  const siteData = await data.json();
  assert.ok(Array.isArray(siteData.projects));

  const commentUrl = `${origin}/api/posts/${siteData.posts[0].id}/comments`;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const comment = await fetch(commentUrl, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ author: 'Tester', body: 'A useful comment' }) });
    assert.equal(comment.status, 201);
  }
  const limited = await fetch(commentUrl, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ author: 'Tester', body: 'A useful comment' }) });
  assert.equal(limited.status, 429);

  const page = await fetch(`${origin}/`, { method: 'HEAD' });
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /script-src 'self'/);
  assert.equal(page.headers.get('x-frame-options'), 'DENY');
  const article = await fetch(`${origin}/blog/${encodeURIComponent(siteData.posts[0].slug)}`);
  assert.equal(article.status, 200);
  assert.match(await article.text(), /property="og:type" content="article"/);
  assert.match(article.headers.get('content-security-policy'), /sha256-/);
  const admin = await fetch(`${origin}/admin`);
  assert.equal(admin.headers.get('x-robots-tag'), 'noindex, nofollow');
  const missing = await fetch(`${origin}/blog/does-not-exist`);
  assert.equal(missing.status, 404);
  const missingAsset = await fetch(`${origin}/static/js/does-not-exist.js`);
  assert.equal(missingAsset.status, 404);
  const sitemap = await fetch(`${origin}/sitemap.xml`);
  assert.equal(sitemap.status, 200);
  assert.match(await sitemap.text(), new RegExp(siteData.posts[0].slug));
  const robots = await fetch(`${origin}/robots.txt`);
  assert.match(await robots.text(), /User-agent: OAI-SearchBot[\s\S]*User-agent: ChatGPT-User[\s\S]*Allow: \/[\s\S]*Disallow: \/admin[\s\S]*Sitemap:/);
  const asset = await fetch(`${origin}/static/js/${(await fs.readdir(path.join(__dirname, '..', 'build', 'static', 'js'))).find((name) => name.startsWith('main.') && name.endsWith('.js'))}`, { method: 'HEAD', headers: { 'Accept-Encoding': 'gzip' } });
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get('cache-control'), /immutable/);
  assert.equal(asset.headers.get('content-encoding'), 'gzip');
  assert.equal(asset.headers.get('vary'), 'Accept-Encoding');
});
