import { act, render } from '@testing-library/react';
import AdaptiveLogo from './AdaptiveLogo';

test('avoids image color probes in light mode and starts them in dark mode', () => {
  const originalImage = window.Image;
  const originalTheme = document.documentElement.dataset.theme;
  const probe = jest.fn(() => ({}));
  window.Image = probe;
  try {
    document.documentElement.dataset.theme = 'light';
    const { unmount } = render(<AdaptiveLogo src="https://example.com/light-test.png" />);
    expect(probe).not.toHaveBeenCalled();
    unmount();
    act(() => { document.documentElement.dataset.theme = 'dark'; });
    const darkLogo = render(<AdaptiveLogo src="https://example.com/dark-test.png" />);
    expect(probe).toHaveBeenCalledTimes(1);
    darkLogo.unmount();
  } finally {
    window.Image = originalImage;
    document.documentElement.dataset.theme = originalTheme;
  }
});

test('does not request a distant lazy logo until it approaches the viewport', () => {
  const originalObserver = window.IntersectionObserver;
  let onIntersect;
  window.IntersectionObserver = jest.fn((callback) => {
    onIntersect = callback;
    return { observe: jest.fn(), disconnect: jest.fn() };
  });
  try {
    const { container, unmount } = render(<AdaptiveLogo src="https://example.com/footer.png" loading="lazy" />);
    expect(container.querySelector('img')).toBeNull();
    act(() => onIntersect([{ isIntersecting: true }]));
    expect(container.querySelector('img').getAttribute('src')).toBe('https://example.com/footer.png');
    unmount();
  } finally {
    window.IntersectionObserver = originalObserver;
  }
});
