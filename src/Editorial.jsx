/* eslint-disable react/prop-types */
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router';
import portrait from './components/Abbas.jpg';
import './Editorial.css';

export const localized = (value, lang) => typeof value === 'string' ? value : value?.[lang] || value?.en || value?.fa || '';
export const newestFirst = (items) => [...items].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
const imageAllowed = (url) => { if (/^\/uploads\/post-image-[A-Za-z0-9-]+\.(?:png|jpe?g|webp)$/.test(url)) return true; try { return ['http:', 'https:'].includes(new URL(url).protocol); } catch (_) { return false; } };
const postUrl = (post) => `/blog/${encodeURIComponent(post.slug || post.id)}`;
const tagsFor = (post, lang) => post.tags?.[lang]?.length ? post.tags[lang] : post.tags?.[lang === 'fa' ? 'en' : 'fa'] || [];

function PostTags({ post, lang }) {
  const tags = tagsFor(post, lang);
  return tags.length > 0 && <div className="post-tags" aria-label={lang === 'fa' ? 'هشتگ‌ها' : 'Hashtags'}>{tags.map((tag) => <Link key={tag} to={`/blog?tag=${encodeURIComponent(tag)}`} target="_blank" rel="noopener noreferrer">#{tag}</Link>)}</div>;
}

function InlineText({ text }) {
  return String(text).split(/(\*\*[^*\n]+\*\*)/g).map((part, index) => part.startsWith('**') && part.endsWith('**')
    ? <strong key={index}>{part.slice(2, -2)}</strong> : <React.Fragment key={index}>{part}</React.Fragment>);
}

export function ArticleBody({ body }) {
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
    ? <figure key={index}><img src={block.url} alt={block.caption} loading="lazy" />{block.caption && <figcaption>{block.caption}</figcaption>}</figure>
    : block.type === 'heading' ? <h2 key={index}><InlineText text={block.text} /></h2>
      : <p key={index}><InlineText text={block.text} /></p>)}</div>;
}

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

export function ProjectCard({ project, lang, t, index = 0 }) {
  const demoUrl = project.deployment?.url || project.demoUrl;
  return <article className={`project-card${project.deployment?.status === 'running' ? ' has-live-demo' : ''}`}><div className={`project-art art-${index % 3}${project.image ? ' project-art-image' : ''}`}>{project.image ? <img className="project-cover" src={project.image} alt={localized(project.title, lang)} loading="lazy" /> : <div className="art-window"><i /><i /><i /><b>{localized(project.title, lang)?.slice(0, 1)}</b></div>}<span className="art-label">{lang === 'fa' ? 'پروژه منتخب' : 'Selected work'}</span></div><div className="project-info"><h3>{localized(project.title, lang)}</h3><p>{localized(project.description, lang)}</p><div className="project-links">{demoUrl && <a href={demoUrl} target="_blank" rel="noreferrer">{t.viewDemo}</a>}{project.repoUrl && <a href={project.repoUrl} target="_blank" rel="noreferrer">{t.source}</a>}{!demoUrl && !project.repoUrl && <span>{lang === 'fa' ? 'به‌زودی' : 'Coming soon'}</span>}</div></div></article>;
}

export function PostPreview({ post, lang, featured = false }) {
  return <article className={`magazine-card ${featured ? 'magazine-featured' : 'magazine-horizontal'}`}>
    <Link className="magazine-image" to={postUrl(post)} target="_blank" rel="noopener noreferrer" aria-label={localized(post.title, lang)}>{post.image ? <img src={post.image} alt="" loading="lazy" /> : <span className="magazine-placeholder"><small>{lang === 'fa' ? 'مجله' : 'JOURNAL'}</small><strong>{localized(post.title, lang)}</strong></span>}</Link>
    <div className="magazine-copy"><span className="magazine-kicker">{post.createdAt ? new Date(post.createdAt).toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US') : (lang === 'fa' ? 'مجله' : 'Journal')}</span><h3><Link to={postUrl(post)} target="_blank" rel="noopener noreferrer"><InlineText text={localized(post.title, lang)} /></Link></h3><p>{localized(post.excerpt, lang)}</p><PostTags post={post} lang={lang} /><Link className="magazine-read" to={postUrl(post)} target="_blank" rel="noopener noreferrer">{lang === 'fa' ? 'خواندن مطلب' : 'Read article'}</Link></div>
  </article>;
}

const adReservationHref = (socials = []) => socials.find((item) => /(?:wa\.me|whatsapp\.com)/i.test(item.href || ''))?.href || 'https://wa.me/989032991639';

export function AdReservation({ lang, socials }) {
  return <a className="sidebar-ad is-empty ad-flow-reserve" href={adReservationHref(socials)} target="_blank" rel="noopener noreferrer"><span>{lang === 'fa' ? 'محل تبلیغ شما' : 'Your ad here'}</span><small>{lang === 'fa' ? 'برای رزرو، اینجا کلیک کنید' : 'Click here to reserve'}</small></a>;
}

export function TimedAd({ ad, lang, index = 0 }) {
  const [visible, setVisible] = useState(false);
  const slot = useRef(null);
  const delay = Math.min(800 + index * 400, 2000);
  useEffect(() => {
    if (visible || !slot.current) return undefined;
    let timer;
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      clearTimeout(timer);
      if (entry.isIntersecting) timer = setTimeout(() => setVisible(true), delay);
    }, { threshold: 0.1 });
    if (observer) observer.observe(slot.current);
    else timer = setTimeout(() => setVisible(true), delay);
    return () => { clearTimeout(timer); observer?.disconnect(); };
  }, [delay, visible]);
  const caption = lang === 'fa' ? ad.captionFa || ad.captionEn : ad.captionEn || ad.captionFa;
  return <div className={`ad-flow-slot ${visible ? 'is-ready' : 'is-pending'}`} ref={slot} aria-live="polite">
    {visible ? <a className="sidebar-ad has-image" href={ad.href} target="_blank" rel="noopener noreferrer" aria-label={lang === 'fa' ? ad.altFa || 'تبلیغات' : ad.altEn || 'Advertisement'}><img src={ad.imageUrl} alt={lang === 'fa' ? ad.altFa || 'تبلیغات' : ad.altEn || 'Advertisement'} loading="lazy" />{caption && <span className="sidebar-ad-caption">{caption}</span>}</a> : <span className="ad-flow-wait">{lang === 'fa' ? 'جایگاه تبلیغ' : 'Advertisement'}</span>}
  </div>;
}

export function AdStack({ ads = [], lang, socials }) {
  return <div className="sidebar-ad-stack">
    {ads.map((ad, index) => <TimedAd key={ad.id} ad={ad} lang={lang} index={index} />)}
    <AdReservation lang={lang} socials={socials} />
  </div>;
}

export function PostSidebar({ posts, lang, ads = [], socials }) {
  const latest = newestFirst(posts).slice(0, 5);
  const popular = [...posts].sort((a, b) => (Number(b.likes || 0) + (b.comments?.length || 0)) - (Number(a.likes || 0) + (a.comments?.length || 0))).slice(0, 5);
  return <aside className="magazine-sidebar">
    <div className="sidebar-box"><h2>{lang === 'fa' ? 'تازه‌ترین مطالب' : 'Latest stories'}</h2>{latest.map((post) => <Link key={post.id} to={postUrl(post)} target="_blank" rel="noopener noreferrer">{localized(post.title, lang)}</Link>)}</div>
    <div className="sidebar-box"><h2>{lang === 'fa' ? 'محبوب‌ترین مطالب' : 'Most popular'}</h2>{popular.map((post) => <Link key={post.id} to={postUrl(post)} target="_blank" rel="noopener noreferrer">{localized(post.title, lang)}<small>{Number(post.likes || 0)} {lang === 'fa' ? 'پسند' : 'likes'}</small></Link>)}</div>
    <AdStack ads={ads} lang={lang} socials={socials} />
  </aside>;
}

export function BlogPage({ posts, lang, t, ads = [], socials }) {
  const location = useLocation();
  const selectedTag = new URLSearchParams(location.search).get('tag');
  const published = newestFirst(posts.filter((post) => post.published !== false && (!selectedTag || Object.values(post.tags || {}).some((tags) => Array.isArray(tags) && tags.includes(selectedTag)))));
  return <main className="editorial-page section-wrap"><div className="editorial-header"><span className="eyebrow">{lang === 'fa' ? 'مجله' : 'Journal'}</span><h1>{lang === 'fa' ? 'مقاله‌ها و خبرهای تازه' : 'Stories and fresh ideas'}</h1><p>{lang === 'fa' ? 'نوشته‌هایی درباره طراحی، توسعه وب و ابزارهایی که ارزش دنبال کردن دارند.' : 'Writing about design, web development and tools worth following.'}</p>{selectedTag && <Link className="tag-filter" to="/blog" target="_blank" rel="noopener noreferrer">#{selectedTag} &times;</Link>}</div><div className="magazine-layout"><div className="magazine-main">{published.length ? <div className="magazine-grid">{published.map((post, index) => <PostPreview key={post.id} post={post} lang={lang} featured={index === 0} />)}</div> : <p className="empty-state">{t.emptyPosts}</p>}</div><PostSidebar posts={newestFirst(posts.filter((post) => post.published !== false))} lang={lang} ads={ads} socials={socials} /></div></main>;
}

async function request(url, options = {}) {
  const response = await fetch(url, { credentials: 'same-origin', ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'Request failed.');
  return result;
}

export function ArticlePage({ post, posts, lang, t, notify, refresh, ads = [], socials }) {
  const [author, setAuthor] = useState('');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  if (!post || post.published === false) return <main className="editorial-page section-wrap"><Link to="/blog" target="_blank" rel="noopener noreferrer">{lang === 'fa' ? 'بازگشت به وبلاگ' : 'Back to blog'}</Link><p>{lang === 'fa' ? 'این مطلب پیدا نشد.' : 'Article not found.'}</p></main>;
  const act = async (path, payload) => { setSending(true); try { await request(path, { method: 'POST', body: JSON.stringify(payload) }); await refresh(); return true; } catch (error) { notify(error.message); return false; } finally { setSending(false); } };
  const share = async () => { try { if (navigator.share) await navigator.share({ title: localized(post.title, lang), url: window.location.href }); else { await navigator.clipboard.writeText(window.location.href); notify(lang === 'fa' ? 'لینک کپی شد.' : 'Link copied.'); } } catch (_) { /* Share sheet was closed. */ } };
  return <main className="editorial-page section-wrap"><div className="magazine-layout"><article className="article-page"><Link className="article-back" to="/blog" target="_blank" rel="noopener noreferrer">{lang === 'fa' ? 'همه مطالب' : 'All stories'}</Link><span className="magazine-kicker">{post.createdAt && new Date(post.createdAt).toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US')}</span><h1><InlineText text={localized(post.title, lang)} /></h1><p className="article-deck">{localized(post.excerpt, lang)}</p>{post.image ? <img className="article-cover" src={post.image} alt="" /> : <div className="article-cover article-poster-fallback"><span>{lang === 'fa' ? '\u0645\u062c\u0644\u0647' : 'JOURNAL'}</span><strong>{localized(post.title, lang)}</strong></div>}<ArticleBody body={localized(post.body, lang)} /><PostTags post={post} lang={lang} /><div className="post-actions"><button disabled={sending} onClick={() => act(`/api/posts/${encodeURIComponent(post.id)}/like`, {})}>♡ {t.like} · {Number(post.likes || 0)}</button><button onClick={share}>{t.share}</button></div><section className="article-comments"><h2>{t.comments} ({post.comments?.length || 0})</h2><form className="comment-form" onSubmit={async (event) => { event.preventDefault(); if (await act(`/api/posts/${encodeURIComponent(post.id)}/comments`, { author: author.trim(), body: comment.trim() })) setComment(''); }}><input value={author} onChange={(event) => setAuthor(event.target.value)} placeholder={t.name} maxLength="60" required /><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder={t.commentPlaceholder} maxLength="2000" required /><button className="button button-primary" disabled={sending}>{t.send}</button></form>{(post.comments || []).map((item) => <div className="comment-thread" key={item.id}><div className="comment-item"><b>{item.author}</b><p>{item.body}</p></div>{(item.replies || []).map((reply) => <div className="comment-item admin-reply" key={reply.id}><img src={portrait} alt="" /><div><b>عباس روحانی تبار</b><p>{reply.body}</p></div></div>)}</div>)}</section></article><PostSidebar posts={posts.filter((item) => item.published !== false)} lang={lang} ads={ads} socials={socials} /></div></main>;
}

export function ProjectsPage({ projects, lang, t, ads = [], socials }) {
  const ordered = projects;
  return <main className="editorial-page section-wrap"><div className="editorial-header"><span className="eyebrow">{lang === 'fa' ? 'نمونه‌کارها' : 'Portfolio'}</span><h1>{lang === 'fa' ? 'همه پروژه‌ها' : 'All projects'}</h1><p>{lang === 'fa' ? 'پروژه‌ها و تجربه‌های من در طراحی و توسعه وب.' : 'My work across web design and development.'}</p></div><div className="magazine-layout projects-layout"><div className="magazine-main">{ordered.length ? <div className="project-grid">{ordered.map((project, index) => <ProjectCard key={project.id} project={project} lang={lang} t={t} index={index} />)}</div> : <p className="empty-state">{t.emptyProjects}</p>}</div><aside className="magazine-sidebar"><AdStack ads={ads} lang={lang} socials={socials} /></aside></div></main>;
}
