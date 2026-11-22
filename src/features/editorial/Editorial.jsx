/* eslint-disable react/prop-types */
import React, { memo, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import portrait from '../../assets/images/Abbas-mobile.webp';
import { filterPostsByTag, getPublishedPosts, getSelectedTag, newestFirst } from './listing';
import { demoTunnelHostname, demoTunnelPath } from './demoTunnel';
import './Editorial.css';

export const localized = (value, lang) => typeof value === 'string' ? value : value?.[lang] || value?.en || value?.fa || '';
export { newestFirst };
const imageAllowed = (url) => { if (/^\/uploads\/post-image-[A-Za-z0-9-]+\.(?:png|jpe?g|webp)$/.test(url)) return true; try { return ['http:', 'https:'].includes(new URL(url).protocol); } catch { return false; } };
const postUrl = (post) => `/blog/${encodeURIComponent(post.slug || post.id)}`;
const tagsFor = (post, lang) => post.tags?.[lang]?.length ? post.tags[lang] : post.tags?.[lang === 'fa' ? 'en' : 'fa'] || [];
const postDateFormats = {};

function formatPostDate(value, lang) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return '';
  const locale = lang === 'fa' ? 'fa-IR' : 'en-US';
  const formatter = postDateFormats[locale] ||= new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Tehran' });
  return formatter.format(timestamp);
}

function PostTags({ post, lang }) {
  const tags = tagsFor(post, lang);
  return tags.length > 0 && <div className="post-tags" aria-label={lang === 'fa' ? 'هشتگ‌ها' : 'Hashtags'}>{tags.map((tag) => <Link key={tag} to={`/blog?tag=${encodeURIComponent(tag)}`} target="_blank" rel="noopener noreferrer">#{tag}</Link>)}</div>;
}

function InlineText({ text }) {
  return String(text).split(/(\*\*[^*\n]+\*\*)/g).map((part, index) => part.startsWith('**') && part.endsWith('**')
    ? <strong key={index}>{part.slice(2, -2)}</strong> : <React.Fragment key={index}>{part}</React.Fragment>);
}

export const ArticleBody = React.memo(function ArticleBody({ body }) {
  const blocks = [];
  let paragraph = [];
  const flush = () => { if (paragraph.length) { blocks.push({ type: 'paragraph', text: paragraph.join('\n') }); paragraph = []; } };
  for (const line of String(body || '').replace(/\r\n/g, '\n').split('\n')) {
    const trimmed = line.trim();
    const image = trimmed.match(/^!\[([^\]\n]*)\]\(([^\s)]+)\)$/);
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (image && imageAllowed(image[2])) { flush(); blocks.push({ type: 'image', caption: image[1], url: image[2] }); }
    else if (heading) { flush(); blocks.push({ type: 'heading', text: heading[2] }); }
    else if (!trimmed) flush();
    else paragraph.push(line);
  }
  flush();
  return <div className="article-content">{blocks.map((block, index) => block.type === 'image'
    ? <figure key={index}><img src={block.url} alt={block.caption} loading="lazy" decoding="async" />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>
    : block.type === 'heading' ? <h2 key={index}><InlineText text={block.text} /></h2>
      : <p key={index}><InlineText text={block.text} /></p>)}</div>;
});

export function ArticleEditor({ name, label, defaultValue = '', lang, onUpload }) {
  const [value, setValue] = useState(defaultValue);
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const editor = useRef(null);
  const insert = (text, wrap = false) => {
    const field = editor.current;
    const existing = field?.value ?? value;
    const start = field?.selectionStart ?? existing.length;
    const end = field?.selectionEnd ?? start;
    const selected = existing.slice(start, end);
    const addition = wrap ? `**${selected || (lang === 'fa' ? 'متن مهم' : 'important text')}**` : text;
    setValue(existing.slice(0, start) + addition + existing.slice(end));
    requestAnimationFrame(() => { field?.focus(); field?.setSelectionRange(start + addition.length, start + addition.length); });
  };
  const insertImage = (url, imageCaption) => {
    if (!imageAllowed(url)) { setError(lang === 'fa' ? 'آدرس تصویر باید لینک معتبر HTTPS/HTTP باشد.' : 'Enter a valid HTTP or HTTPS image URL.'); return; }
    insert(`\n\n![${imageCaption.replace(/[\]\n]/g, '')}](${url})\n\n`);
    setError(''); setImageUrl(''); setCaption('');
  };
  return <div className="article-editor">
    <label className="field-label">{label}<textarea ref={editor} name={name} dir={lang === 'fa' ? 'rtl' : 'ltr'} value={value} onChange={(event) => setValue(event.target.value)} rows="12" maxLength="28000" required /></label>
    <div className="editor-toolbar">
      <button type="button" onClick={() => insert('', true)}>{lang === 'fa' ? 'بولد' : 'Bold'}</button>
      <button type="button" onClick={() => insert('\n\n## ')}>{lang === 'fa' ? 'تیتر' : 'Heading'}</button>
      <label className="editor-upload">{uploading ? (lang === 'fa' ? 'بارگذاری...' : 'Uploading...') : (lang === 'fa' ? 'بارگذاری عکس در متن' : 'Upload inline image')}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg" disabled={uploading} onChange={async (event) => {
        const file = event.target.files?.[0]; if (!file) return;
        setUploading(true); setError('');
        try { const url = await onUpload(file); insertImage(url, caption || file.name.replace(/\.[^.]+$/, '')); }
        catch (problem) { setError(problem.message); }
        finally { setUploading(false); event.target.value = ''; }
      }} /></label>
    </div>
    <div className="editor-image-row"><input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://example.com/image.jpg" aria-label={lang === 'fa' ? 'آدرس عکس داخل متن' : 'Inline image URL'} /><input value={caption} onChange={(event) => setCaption(event.target.value)} placeholder={lang === 'fa' ? 'توضیح عکس' : 'Image caption'} aria-label={lang === 'fa' ? 'توضیح عکس' : 'Image caption'} /><button type="button" disabled={!imageUrl} onClick={() => insertImage(imageUrl.trim(), caption)}>{lang === 'fa' ? 'افزودن عکس' : 'Insert image'}</button></div>
    <small className="editor-help">{lang === 'fa' ? 'برای پاراگراف تازه یک خط خالی بگذار. متن دلخواه را انتخاب کن و «بولد» را بزن. تصویر در جای نشانگر متن قرار می‌گیرد.' : 'Leave a blank line between paragraphs. Select text and choose Bold. Images appear at the cursor position.'}</small>
    {error && <p className="error-text" role="alert">{error}</p>}
    <details className="editor-preview" dir={lang === 'fa' ? 'rtl' : 'ltr'}><summary>{lang === 'fa' ? 'پیش‌نمایش متن' : 'Preview article'}</summary><ArticleBody body={value} /></details>
  </div>;
}

export function resolveProjectDemoUrl(project, hostname = globalThis.location?.hostname || '', protocol = globalThis.location?.protocol || 'http:') {
  const { deployment, demoUrl = '', demoSubdomain } = project;
  if (deployment?.status !== 'running') return demoUrl || '';

  const slug = deployment.subdomain || demoSubdomain || '';
  const port = Number(deployment.localPreviewPort);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
  const lan = /^(?:10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[01]))(?:\.\d{1,3}){2}$/.test(hostname);
  if ((loopback || lan) && /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/.test(slug) && Number.isInteger(port) && port > 0 && port <= 65535) {
    const domain = loopback ? 'localhost' : `${hostname}.nip.io`;
    return `${protocol}//${slug}.${domain}:${port}/`;
  }

  for (const address of [deployment.url, demoUrl]) {
    if (!address) continue;
    try {
      const url = new URL(address);
      if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && url.hostname !== hostname && url.hostname !== 'localhost' && !url.hostname.endsWith('.localhost')) return address;
    } catch { /* Ignore an invalid or obsolete configured address. */ }
  }
  const forwardedHost = demoTunnelHostname(hostname, port);
  const forwardedPath = demoTunnelPath(slug);
  if (project.projectType === 'static' && forwardedHost && forwardedPath) return `https://${forwardedHost}${forwardedPath}`;
  return '';
}

function ProjectCover({ src, alt, priority, eager }) {
  return <span className="project-cover-container">
    <img className="project-cover" src={src} alt={alt} loading={priority || eager ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" />
  </span>;
}

export function ProjectCard({ project, lang, t, index = 0, priority = false, eager = false, hostname, protocol }) {
  const cover = project.displayImage || project.image;
  const demoUrl = resolveProjectDemoUrl(project, hostname, protocol);
  return <article className={`project-card${project.deployment?.status === 'running' ? ' has-live-demo' : ''}`}><div className={`project-art art-${index % 3}${cover ? ' project-art-image' : ''}`}>{cover ? <ProjectCover src={cover} alt={localized(project.title, lang)} priority={priority} eager={eager} /> : <div className="art-window"><i /><i /><i /><b>{localized(project.title, lang)?.slice(0, 1)}</b></div>}{project.featured !== false && <span className="art-label">{lang === 'fa' ? '\u067E\u0631\u0648\u0698\u0647 \u0645\u0646\u062A\u062E\u0628' : 'Selected work'}</span>}</div><div className="project-info"><h3>{localized(project.title, lang)}</h3><p>{localized(project.description, lang)}</p>{project.skillsUsed?.length > 0 && <ul className="project-tech-list" aria-label={lang === 'fa' ? 'مهارت‌های استفاده‌شده' : 'Technologies used'}>{project.skillsUsed.map((skill) => <li key={skill.id || skill.name}>{skill.iconUrl && <img src={skill.iconUrl} alt="" loading="lazy" />}<span>{skill.name || skill}</span></li>)}</ul>}<div className="project-links">{demoUrl && <a href={demoUrl} target="_blank" rel="noreferrer">{t.viewDemo}</a>}{project.repoUrl && <a href={project.repoUrl} target="_blank" rel="noreferrer">{t.source}</a>}{!demoUrl && !project.repoUrl && <span>{lang === 'fa' ? 'به‌زودی' : 'Coming soon'}</span>}</div></div></article>;
}

export const PostPreview = memo(function PostPreview({ post, lang, featured = false, priority = featured }) {
  return <article className={`magazine-card ${featured ? 'magazine-featured' : 'magazine-horizontal'}`}>
    <Link className="magazine-image" to={postUrl(post)} target="_blank" rel="noopener noreferrer" aria-label={localized(post.title, lang)}>{post.image ? <img src={post.image} alt="" loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" /> : <span className="magazine-placeholder"><small>{lang === 'fa' ? 'مجله' : 'JOURNAL'}</small><strong>{localized(post.title, lang)}</strong></span>}</Link>
    <div className="magazine-copy"><span className="magazine-kicker">{formatPostDate(post.createdAt, lang) || (lang === 'fa' ? 'مجله' : 'Journal')}</span><h3><Link to={postUrl(post)} target="_blank" rel="noopener noreferrer"><InlineText text={localized(post.title, lang)} /></Link></h3><p>{localized(post.excerpt, lang)}</p><PostTags post={post} lang={lang} /><Link className="magazine-read" to={postUrl(post)} target="_blank" rel="noopener noreferrer">{lang === 'fa' ? 'خواندن مطلب' : 'Read article'}</Link></div>
  </article>;
});

const adReservationHref = (socials = []) => socials.find((item) => /(?:wa\.me|whatsapp\.com)/i.test(item.href || ''))?.href || 'https://wa.me/989032991639';

export function AdReservation({ lang, socials }) {
  return <a className="sidebar-ad is-empty ad-flow-reserve" href={adReservationHref(socials)} target="_blank" rel="noopener noreferrer"><span>{lang === 'fa' ? 'محل تبلیغ شما' : 'Your ad here'}</span><small>{lang === 'fa' ? 'برای رزرو، اینجا کلیک کنید' : 'Click here to reserve'}</small></a>;
}

export function AdCard({ ad, lang }) {
  const alt = lang === 'fa' ? ad.altFa || 'تبلیغات' : ad.altEn || 'Advertisement';
  const caption = lang === 'fa' ? ad.captionFa || ad.captionEn : ad.captionEn || ad.captionFa;
  return <a className="sidebar-ad has-image ad-flow-slot" href={ad.href} target="_blank" rel="noopener noreferrer" aria-label={alt}>
    <img src={ad.imageUrl} alt={alt} loading="lazy" decoding="async" fetchPriority="low" width="400" height="300" />
    {caption && <span className="sidebar-ad-caption">{caption}</span>}
  </a>;
}

export function AdStack({ ads = [], lang, socials }) {
  return <div className="sidebar-ad-stack">
    {ads.map((ad) => <AdCard key={ad.id} ad={ad} lang={lang} />)}
    <AdReservation lang={lang} socials={socials} />
  </div>;
}

const postEngagement = (post) => Number(post.likes || 0) + (post.comments?.length ?? post.commentCount ?? 0);

export function PostSidebar({ posts, lang, ads = [], socials }) {
  const latest = newestFirst(posts).slice(0, 5);
  const popular = [...posts].sort((a, b) => postEngagement(b) - postEngagement(a)).slice(0, 5);
  return <aside className="magazine-sidebar">
    <div className="sidebar-box"><h2>{lang === 'fa' ? 'تازه‌ترین مطالب' : 'Latest stories'}</h2>{latest.map((post) => <Link key={post.id} to={postUrl(post)} target="_blank" rel="noopener noreferrer">{localized(post.title, lang)}</Link>)}</div>
    <div className="sidebar-box"><h2>{lang === 'fa' ? 'محبوب‌ترین مطالب' : 'Most popular'}</h2>{popular.map((post) => <Link key={post.id} to={postUrl(post)} target="_blank" rel="noopener noreferrer">{localized(post.title, lang)}<small>{Number(post.likes || 0)} {lang === 'fa' ? 'پسند' : 'likes'}</small></Link>)}</div>
    <AdStack ads={ads} lang={lang} socials={socials} />
  </aside>;
}

export const BlogPage = memo(function BlogPage({ posts, lang, t, ads = [], socials }) {
  const { search } = useLocation();
  const selectedTag = getSelectedTag(search);
  const published = useMemo(() => getPublishedPosts(posts), [posts]);
  const matchingPosts = useMemo(() => filterPostsByTag(published, selectedTag), [published, selectedTag]);

  return <main className="editorial-page section-wrap">
    <div className="editorial-header">
      <span className="eyebrow">{lang === 'fa' ? 'مجله' : 'Journal'}</span>
      <h1>{lang === 'fa' ? 'مقاله‌ها و خبرهای تازه' : 'Stories and fresh ideas'}</h1>
      <p>{lang === 'fa' ? 'نوشته‌هایی درباره طراحی، توسعه وب و ابزارهایی که ارزش دنبال کردن دارند.' : 'Writing about design, web development and tools worth following.'}</p>
      {selectedTag && <Link className="tag-filter" to="/blog" target="_blank" rel="noopener noreferrer">#{selectedTag} &times;</Link>}
    </div>
    <div className="magazine-layout">
      <div className="magazine-main">{matchingPosts.length ? <div className="magazine-grid">
        {matchingPosts.map((post, index) => <PostPreview key={post.id} post={post} lang={lang} featured={index === 0} />)}
      </div> : <p className="empty-state">{t.emptyPosts}</p>}
      </div>
      <PostSidebar posts={published} lang={lang} ads={ads} socials={socials} />
    </div>
  </main>;
});

async function request(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Request failed.');
  return result;
}

function ArticleInteractions({ post, lang, t, notify, onPostUpdated }) {
  const [sending, setSending] = useState(false);
  const comments = post.comments || [];
  const act = async (action, field, payload) => {
    if (sending) return false;
    setSending(true);
    try {
      const result = await request(`/api/posts/${encodeURIComponent(post.id)}/${action}`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      onPostUpdated(post.id, { [field]: result[field] });
      return true;
    } catch (error) {
      notify(error.message);
      return false;
    } finally {
      setSending(false);
    }
  };

  const submitComment = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const draft = fields.get('comment');
    const sent = await act('comments', 'comments', { author: fields.get('author').trim(), body: draft.trim() });
    if (sent && form.elements.comment.value === draft) form.elements.comment.value = '';
  };

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: localized(post.title, lang), url: window.location.href });
      else {
        await navigator.clipboard.writeText(window.location.href);
        notify(lang === 'fa' ? 'لینک کپی شد.' : 'Link copied.');
      }
    } catch { /* Share sheet was closed. */ }
  };

  return <>
    <div className="post-actions">
      <button type="button" disabled={sending} onClick={() => void act('like', 'likes', {})}>♡ {t.like} · {Number(post.likes || 0)}</button>
      <button type="button" onClick={share}>{t.share}</button>
    </div>
    <section className="article-comments">
      <h2>{t.comments} ({comments.length})</h2>
      <form className="comment-form" method="post" onSubmit={submitComment}>
        <input name="author" placeholder={t.name} aria-label={t.name} maxLength="60" required />
        <textarea name="comment" placeholder={t.commentPlaceholder} aria-label={t.commentPlaceholder} maxLength="2000" required />
        <button type="submit" className="button button-primary" disabled={sending}>{t.send}</button>
      </form>
      {comments.map((item) => <div className="comment-thread" key={item.id}>
        <div className="comment-item"><b>{item.author}</b><p>{item.body}</p></div>
        {(item.replies || []).map((reply) => <div className="comment-item admin-reply" key={reply.id}>
          <img src={portrait} alt="" width="38" height="38" loading="lazy" decoding="async" />
          <div><b>عباس روحانی تبار</b><p>{reply.body}</p></div>
        </div>)}
      </div>)}
    </section>
  </>;
}

export const ArticlePage = memo(function ArticlePage({ post, posts, lang, t, notify, onPostUpdated, ads = [], socials }) {
  if (!post || post.published === false) return <main className="editorial-page section-wrap"><Link to="/blog" target="_blank" rel="noopener noreferrer">{lang === 'fa' ? 'بازگشت به وبلاگ' : 'Back to blog'}</Link><p>{lang === 'fa' ? 'این مطلب پیدا نشد.' : 'Article not found.'}</p></main>;
  const title = localized(post.title, lang);
  const date = formatPostDate(post.createdAt, lang);
  return <main className="editorial-page section-wrap">
    <div className="magazine-layout">
      <article className="article-page">
        <Link className="article-back" to="/blog" target="_blank" rel="noopener noreferrer">{lang === 'fa' ? 'همه مطالب' : 'All stories'}</Link>
        <span className="magazine-kicker">{date}</span>
        <h1><InlineText text={title} /></h1>
        <p className="article-deck">{localized(post.excerpt, lang)}</p>
        {post.image
          ? <img className="article-cover" src={post.image} alt="" width="1200" height="627" fetchPriority="high" decoding="async" />
          : <div className="article-cover article-poster-fallback"><span>{lang === 'fa' ? 'مجله' : 'JOURNAL'}</span><strong>{title}</strong></div>}
        <ArticleBody body={localized(post.body, lang)} />
        <PostTags post={post} lang={lang} />
        <ArticleInteractions key={post.id} post={post} lang={lang} t={t} notify={notify} onPostUpdated={onPostUpdated} />
      </article>
      <PostSidebar posts={posts.filter((item) => item.published !== false)} lang={lang} ads={ads} socials={socials} />
    </div>
  </main>;
});

export const ProjectsPage = memo(function ProjectsPage({ projects, lang, t, ads = [], socials, hostname, protocol }) {
  return <main className="editorial-page section-wrap">
    <div className="editorial-header">
      <span className="eyebrow">{lang === 'fa' ? 'نمونه‌کارها' : 'Portfolio'}</span>
      <h1>{lang === 'fa' ? 'همه پروژه‌ها' : 'All projects'}</h1>
      <p>{lang === 'fa' ? 'پروژه‌ها و تجربه‌های من در طراحی و توسعه وب.' : 'My work across web design and development.'}</p>
    </div>
    <div className="magazine-layout projects-layout">
      <div className="magazine-main">{projects.length ? <div className="project-grid">
        {projects.map((project, index) => <ProjectCard key={project.id} project={project} lang={lang} t={t} index={index} priority={index === 0} hostname={hostname} protocol={protocol} />)}
      </div> : <p className="empty-state">{t.emptyProjects}</p>}
      </div>
      <aside className="magazine-sidebar"><AdStack ads={ads} lang={lang} socials={socials} /></aside>
    </div>
  </main>;
});
