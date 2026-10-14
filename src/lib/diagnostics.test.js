import { describeIssue } from './diagnostics';

test('maps internal scopes to clear Persian and English admin labels', () => {
  expect(describeIssue('translation', 'fa')).toBe('ترجمهٔ خودکار');
  expect(describeIssue('experience', 'en')).toBe('Work history');
  expect(describeIssue('unknown', 'fa')).toBe('اجرای سایت');
});
