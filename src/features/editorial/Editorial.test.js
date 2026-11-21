import { act, render } from '@testing-library/react';
import { ProjectCard, TimedAd, resolveProjectDemoUrl } from './Editorial';

test('uses the isolated local demo port on desktop and LAN devices', () => {
  const project = { demoSubdomain: 'musicplayer', deployment: { status: 'running', url: 'http://musicplayer.localhost:5000', localPreviewPath: '/demo/musicplayer/', localPreviewPort: 5001 } };
  expect(resolveProjectDemoUrl(project, '192.168.1.20')).toBe('http://192.168.1.20:5001/demo/musicplayer/');
  expect(resolveProjectDemoUrl(project, 'localhost')).toBe('http://localhost:5001/demo/musicplayer/');
  expect(resolveProjectDemoUrl({ ...project, deployment: { ...project.deployment, url: '' } }, '192.168.1.20')).toBe('http://192.168.1.20:5001/demo/musicplayer/');
  expect(resolveProjectDemoUrl(project, 'portfolio.example')).toBe('');
});

test('links running demos to their own forwarded port on a VS Code tunnel', () => {
  const project = { deployment: { status: 'running', url: 'http://musicplayer.localhost:5000', localPreviewPath: '/demo/musicplayer/', localPreviewPort: 5002 } };
  expect(resolveProjectDemoUrl(project, 'sample-id-3000.eun1.devtunnels.ms')).toBe('https://sample-id-5002.eun1.devtunnels.ms/demo/musicplayer/');
  expect(resolveProjectDemoUrl(project, 'sample-id-3000.devtunnels.ms')).toBe('https://sample-id-5002.devtunnels.ms/demo/musicplayer/');
  expect(resolveProjectDemoUrl(project, 'sample-id-3000.devtunnels.ms.example.org')).toBe('');
  expect(resolveProjectDemoUrl({ ...project, demoUrl: 'https://demos.example.org/music' }, 'sample-id-3000.eun1.devtunnels.ms')).toBe('https://demos.example.org/music');
});

test('uses the optimized cover and prioritizes the first visible project', () => {
  const project = { id: 'demo', title: 'Demo', image: '/original.png', displayImage: '/optimized.webp' };
  const { container, rerender } = render(<ProjectCard project={project} lang="en" t={{}} />);
  expect(container.querySelector('.project-cover')).toHaveAttribute('src', project.displayImage);
  expect(container.querySelector('.project-cover')).toHaveAttribute('loading', 'lazy');
  rerender(<ProjectCard project={project} lang="en" t={{}} priority />);
  expect(container.querySelector('.project-cover')).toHaveAttribute('fetchpriority', 'high');
  expect(container.querySelector('.project-cover')).toHaveAttribute('loading', 'eager');
});

test('starts fetching the ad image shortly after the slot approaches the viewport', () => {
  const originalObserver = window.IntersectionObserver;
  let intersect;
  const disconnect = jest.fn();
  window.IntersectionObserver = jest.fn((callback) => {
    intersect = callback;
    return { observe: jest.fn(), disconnect };
  });
  jest.useFakeTimers();
  try {
    const ad = { href: 'https://example.org', imageUrl: '/uploads/ad-image-test.png' };
    const { container, unmount } = render(<TimedAd ad={ad} lang="en" />);
    expect(container.querySelector('img')).toBeNull();
    expect(window.IntersectionObserver.mock.calls[0][1].rootMargin).toBe('480px 0px');
    act(() => intersect([{ isIntersecting: true }]));
    act(() => jest.advanceTimersByTime(120));
    const image = container.querySelector('img');
    expect(image).toHaveAttribute('src', ad.imageUrl);
    expect(image).toHaveAttribute('loading', 'eager');
    expect(disconnect).toHaveBeenCalled();
    unmount();
  } finally {
    jest.useRealTimers();
    window.IntersectionObserver = originalObserver;
  }
});
