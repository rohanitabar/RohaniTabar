import { describeIssue, monitoredFetch } from './diagnostics';

test('maps internal scopes to clear Persian and English admin labels', () => {
  expect(describeIssue('translation', 'fa')).toBe('ترجمهٔ خودکار');
  expect(describeIssue('experience', 'en')).toBe('Work history');
  expect(describeIssue('unknown', 'fa')).toBe('اجرای سایت');
});

test('gives a retried GET a fresh timeout signal', async () => {
  const previousFetch = window.fetch;
  const previousTimeout = AbortSignal.timeout;
  const first = new AbortController();
  const second = new AbortController();
  const response = { ok: true };
  AbortSignal.timeout = jest.fn().mockReturnValueOnce(first.signal).mockReturnValueOnce(second.signal);
  window.fetch = jest.fn().mockImplementationOnce(() => {
    first.abort();
    return Promise.reject(new DOMException('Request timed out', 'TimeoutError'));
  }).mockResolvedValueOnce(response);
  try {
    await expect(monitoredFetch('/api/site-data', { timeoutMs: 12000 })).resolves.toBe(response);
    expect(window.fetch).toHaveBeenNthCalledWith(1, '/api/site-data', { signal: first.signal });
    expect(window.fetch).toHaveBeenNthCalledWith(2, '/api/site-data', { signal: second.signal });
  } finally {
    window.fetch = previousFetch;
    AbortSignal.timeout = previousTimeout;
  }
});
