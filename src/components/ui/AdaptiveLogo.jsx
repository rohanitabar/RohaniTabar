import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import PropTypes from 'prop-types';

const logoToneCache = new Map();
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
    const [red, green, blue, alpha] = pixels.slice(index, index + 4);
    if (alpha < 48) continue;
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
  const [needsLightBacking, setNeedsLightBacking] = useState(() => logoToneCache.get(src) || false);
  const [nearby, setNearby] = useState(() => loading !== 'lazy' || typeof IntersectionObserver === 'undefined');
  const wrapper = useRef(null);
  const darkTheme = useSyncExternalStore(subscribeTheme, isDarkTheme, () => false);

  useEffect(() => {
    if (nearby || !wrapper.current) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setNearby(true); observer.disconnect(); }
    }, { rootMargin: '1200px' });
    observer.observe(wrapper.current);
    return () => observer.disconnect();
  }, [nearby]);

  useEffect(() => {
    let active = true;
    if (!src || !darkTheme || !nearby) return undefined;
    if (logoToneCache.has(src)) {
      setNeedsLightBacking(logoToneCache.get(src));
      return undefined;
    }
    const inspect = () => {
      const probe = new Image();
      probe.crossOrigin = 'anonymous';
      probe.onload = () => {
        let isBlack = false;
        try { isBlack = isMostlyBlack(probe); } catch (_) { isBlack = true; }
        logoToneCache.set(src, isBlack);
        if (active) setNeedsLightBacking(isBlack);
      };
      probe.onerror = () => {
        logoToneCache.set(src, true);
        if (active) setNeedsLightBacking(true);
      };
      probe.src = src;
    };
    inspect();
    return () => { active = false; };
  }, [src, darkTheme, nearby]);

  return <span ref={wrapper} className={`adaptive-logo${needsLightBacking ? ' has-light-backing' : ''}`}>
    {nearby && <img className={className} src={src} alt={alt} loading={loading} />}
  </span>;
}

AdaptiveLogo.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  className: PropTypes.string,
  loading: PropTypes.oneOf(['eager', 'lazy']),
};
