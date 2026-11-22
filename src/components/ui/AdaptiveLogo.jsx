import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import PropTypes from 'prop-types';

const wikimediaThumbnails = 'https://thumb.wikimedia.org/wikipedia/commons/thumb';
const localSocialLogos = new Map([
  ['https://cdn.simpleicons.org/github/181717', '/icons/social-github.webp'],
  ['https://cdn.simpleicons.org/telegram/26A5E4', '/icons/social-telegram.webp'],
  ['https://cdn.simpleicons.org/whatsapp/25D366', '/icons/social-whatsapp.webp'],
  [`${wikimediaThumbnails}/8/81/LinkedIn_icon.svg/1280px-LinkedIn_icon.svg.png`, '/icons/social-linkedin.webp'],
  [`${wikimediaThumbnails}/7/7e/Gmail_icon_%282020%29.svg/3840px-Gmail_icon_%282020%29.svg.png`, '/icons/social-gmail.webp'],
  [`${wikimediaThumbnails}/9/95/Instagram_logo_2022.svg/1280px-Instagram_logo_2022.svg.png`, '/icons/social-instagram.webp'],
]);

const logoToneCache = new Map(Array.from(localSocialLogos.values(), (source) => [source, source === '/icons/social-github.webp']));
const themeListeners = new Set();
let themeObserver;

function isDarkTheme() { return document.documentElement.dataset.theme === 'dark'; }
function subscribeTheme(listener) {
  themeListeners.add(listener);
  if (!themeObserver && typeof MutationObserver !== 'undefined') {
    themeObserver = new MutationObserver(() => themeListeners.forEach((notify) => notify()));
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }
  return () => {
    themeListeners.delete(listener);
    if (!themeListeners.size && themeObserver) { themeObserver.disconnect(); themeObserver = undefined; }
  };
}

function isMostlyBlack(image) {
  const canvas = document.createElement('canvas');
  const size = 32;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas is unavailable.');
  context.drawImage(image, 0, 0, size, size);
  const pixels = context.getImageData(0, 0, size, size).data;
  let visible = 0;
  let darkNeutral = 0;
  let luminanceTotal = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < 48) continue;
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    visible += 1;
    const max = Math.max(red, green, blue);
    const min = Math.min(red, green, blue);
    const luminance = (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
    luminanceTotal += luminance;
    if (luminance < 100 && max - min < 48) darkNeutral += 1;
  }
  return visible > 0 && luminanceTotal / visible < 125 && darkNeutral / visible > 0.62;
}

export default function AdaptiveLogo({ src, alt = '', className = '', loading }) {
  const stockSource = src?.replace(/\?utm_source=commons\.wikimedia\.org&utm_campaign=index&utm_content=thumbnail$/, '');
  const source = localSocialLogos.get(stockSource) || src;
  const [tone, setTone] = useState(null);
  const image = useRef(null);
  const darkTheme = useSyncExternalStore(subscribeTheme, isDarkTheme, () => false);
  const needsLightBacking = tone && tone.source === source ? tone.dark : logoToneCache.get(source);

  useEffect(() => {
    const current = image.current;
    if (!source || !darkTheme || !current || logoToneCache.has(source)) return undefined;
    let probe;
    const remember = (dark) => {
      logoToneCache.set(source, dark);
      setTone({ source, dark });
    };
    const inspect = () => {
      try {
        remember(isMostlyBlack(current));
      } catch (error) {
        if (error.name !== 'SecurityError') {
          remember(true);
          return;
        }
        probe = new Image();
        probe.crossOrigin = 'anonymous';
        probe.onload = () => {
          try { remember(isMostlyBlack(probe)); } catch (_) { remember(true); }
        };
        probe.onerror = () => remember(true);
        probe.src = source;
      }
    };
    if (current.complete && current.naturalWidth) inspect();
    else current.addEventListener('load', inspect, { once: true });
    return () => {
      current.removeEventListener('load', inspect);
      if (probe) {
        probe.onload = null;
        probe.onerror = null;
      }
    };
  }, [source, darkTheme]);

  return <span className={`adaptive-logo${needsLightBacking ? ' has-light-backing' : ''}`}>
    <img ref={image} className={className} src={source} alt={alt} loading={loading} decoding="async" />
  </span>;
}

AdaptiveLogo.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  className: PropTypes.string,
  loading: PropTypes.oneOf(['eager', 'lazy']),
};
