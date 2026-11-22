import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AdCard, ArticlePage, ProjectCard, resolveProjectDemoUrl } from './Editorial';

test('updates the article directly from successful like and comment responses', async () => {
  const originalFetch = global.fetch;
  const comments = [{ id: 'comment-1', author: 'Reader', body: 'Helpful article' }];
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ likes: 3, liked: true }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ comments }) });

  try {
    const post = { id: 'story-1', title: 'Story', body: 'Article body', likes: 2, comments: [] };
    const onPostUpdated = jest.fn();
    const t = { like: 'Like', share: 'Share', comments: 'Comments', name: 'Name', commentPlaceholder: 'Comment', send: 'Send comment' };
    render(<MemoryRouter>
      <ArticlePage post={post} posts={[post]} lang="en" t={t} notify={jest.fn()} onPostUpdated={onPostUpdated} />
    </MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /Like/ }));
    await waitFor(() => expect(onPostUpdated).toHaveBeenCalledWith(post.id, { likes: 3 }));

    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), { target: { value: ' Reader ' } });
    const draft = screen.getByRole('textbox', { name: 'Comment' });
    fireEvent.change(draft, { target: { value: ' Helpful article ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send comment' }));
    await waitFor(() => expect(onPostUpdated).toHaveBeenCalledWith(post.id, { comments }));

    expect(global.fetch.mock.calls.map(([url]) => url)).toEqual(['/api/posts/story-1/like', '/api/posts/story-1/comments']);
    expect(global.fetch.mock.calls[1][1].body).toEqual(JSON.stringify({ author: 'Reader', body: 'Helpful article' }));
    expect(draft).toHaveValue('');
  } finally {
    global.fetch = originalFetch;
  }
});

test('links local and LAN demos to their own hostnames on the service port', () => {
  const project = { demoSubdomain: 'musicplayer', deployment: { status: 'running', url: 'http://musicplayer.localhost:5000', localPreviewPort: 5000 } };
  expect(resolveProjectDemoUrl(project, '192.168.1.20')).toBe('http://musicplayer.192.168.1.20.nip.io:5000/');
  expect(resolveProjectDemoUrl(project, 'localhost')).toBe('http://musicplayer.localhost:5000/');
  expect(resolveProjectDemoUrl(project, '127.0.0.1')).toBe('http://musicplayer.localhost:5000/');
  expect(resolveProjectDemoUrl(project, '192.168.1.20', 'https:')).toBe('https://musicplayer.192.168.1.20.nip.io:5000/');
  expect(resolveProjectDemoUrl({ deployment: { status: 'running', subdomain: 'musicplayer', localPreviewPort: 5100 } }, '10.0.0.1')).toBe('http://musicplayer.10.0.0.1.nip.io:5100/');
  expect(resolveProjectDemoUrl(project, 'portfolio.example')).toBe('');
});

test('uses a configured external demo origin when accessed through a tunnel or public hostname', () => {
  const tunnel = 'sample-id-5000.eun1.devtunnels.ms';
  const project = { deployment: { status: 'running', subdomain: 'musicplayer', url: 'http://musicplayer.localhost:5000', localPreviewPort: 5000 } };
  expect(resolveProjectDemoUrl(project, tunnel)).toBe('');
  expect(resolveProjectDemoUrl({ ...project, demoUrl: `https://${tunnel}/demo/musicplayer/` }, tunnel)).toBe('');
  expect(resolveProjectDemoUrl({ ...project, demoUrl: 'https://demos.example.org/music' }, tunnel)).toBe('https://demos.example.org/music');
  expect(resolveProjectDemoUrl({ deployment: { ...project.deployment, url: 'https://musicplayer.demo.example.org/' } }, 'portfolio.example.org')).toBe('https://musicplayer.demo.example.org/');
});

test('opens active static demos through the paired 5001 tunnel on mobile', () => {
  const project = { projectType: 'static', deployment: { status: 'running', subdomain: 'musicplayer', localPreviewPort: 5001 } };
  expect(resolveProjectDemoUrl(project, 'sample-id-5000.eun1.devtunnels.ms')).toBe('https://sample-id-5001.eun1.devtunnels.ms/demo/musicplayer/');
  expect(resolveProjectDemoUrl(project, 'sample-id-3000.eun1.devtunnels.ms')).toBe('https://sample-id-5001.eun1.devtunnels.ms/demo/musicplayer/');
  expect(resolveProjectDemoUrl(project, 'sample-id-5000.eun1.devtunnels.ms.example.org')).toBe('');
  expect(resolveProjectDemoUrl({ ...project, projectType: 'dynamic' }, 'sample-id-5000.eun1.devtunnels.ms')).toBe('');
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

test('reserves the advertisement image area immediately and lets the browser schedule the download', () => {
  const ad = { href: 'https://example.org', imageUrl: '/uploads/ad-image-test.png', altEn: 'Sponsor', captionEn: 'Read more' };
  const { getByRole, getByText } = render(<AdCard ad={ad} lang="en" />);
  const image = getByRole('img', { name: 'Sponsor' });
  expect(image).toHaveAttribute('src', ad.imageUrl);
  expect(image).toHaveAttribute('loading', 'lazy');
  expect(image).toHaveAttribute('width', '400');
  expect(image).toHaveAttribute('height', '300');
  expect(getByRole('link', { name: 'Sponsor' })).toHaveAttribute('href', ad.href);
  expect(getByText('Read more')).toBeInTheDocument();
});
