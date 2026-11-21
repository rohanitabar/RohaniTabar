const React = require('react');

const h = React.createElement;
const mobilePortraitQuery = '(max-width: 680px)';
const heroCopy = {
  fa: {
    eyebrow: 'طراحی و توسعه وب',
    title: 'من عباس روحانی‌تبار هستم.',
    slogan: 'وب را با ایده‌ها زنده می‌کنم.',
    description: 'توسعه‌دهنده فرانت‌اند؛ عاشق ساخت تجربه‌های وب سریع، ساده و کاربردی.',
    projects: 'پروژه‌های منتخب',
    contact: 'بیایید با هم کار کنیم',
    portrait: 'عباس روحانی‌تبار',
    role: 'توسعه فرانت‌اند',
    availability: 'آماده همکاری'
  },
  en: {
    eyebrow: 'Web design & development',
    title: 'I’m Abbas Rohani Tabar.',
    slogan: 'I bring ideas to the web.',
    description: 'Frontend developer who enjoys building fast, clear and useful web experiences.',
    projects: 'Selected projects',
    contact: 'Let’s work together',
    portrait: 'Abbas Rohani Tabar',
    role: 'Frontend developer',
    availability: 'Open to work'
  }
};

function Hero({ lang, images, Link = 'a' }) {
  const text = heroCopy[lang];
  const action = (path, className, label) =>
    h(Link, { [Link === 'a' ? 'href' : 'to']: path, className }, label);

  return h('section', { className: 'hero section-wrap', id: 'home' },
    h('div', { className: 'hero-copy' },
      h('span', { className: 'eyebrow' }, h('span', { className: 'status-dot' }), text.eyebrow),
      h('h1', null,
        h('span', { className: 'hero-name' }, text.title),
        h('span', { className: 'hero-slogan accent-text' }, text.slogan)),
      h('p', null, text.description),
      h('div', { className: 'hero-actions' },
        action('/featured-projects', 'button button-primary', text.projects),
        action('/contact', 'text-link', text.contact))),
    h('div', { className: 'hero-visual' },
      h('div', { className: 'portrait-glow' }),
      h('picture', { className: 'portrait-frame' },
        h('source', { media: mobilePortraitQuery, srcSet: images.mobile, type: 'image/webp' }),
        h('img', { src: images.desktop, width: 900, height: 900, alt: text.portrait, fetchPriority: 'high' })),
      h('span', { className: 'floating-chip chip-top' }, text.role),
      h('span', { className: 'floating-chip chip-bottom' }, h('span', { className: 'status-dot' }), ' ', text.availability)));
}

module.exports = { Hero, mobilePortraitQuery };
