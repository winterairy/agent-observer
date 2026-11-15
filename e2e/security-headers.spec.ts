/** SEC-03: 보안 헤더가 붙고, CSP 위반 없이 로그인·대시보드가 그려진다 */
import { expect, test } from '@playwright/test';
import { uiLogin } from './helpers';

test('화면·API 응답에 보안 헤더가 있고 CSP 위반이 없다', async ({ page, request }) => {
  for (const p of ['/login', '/api/sessions']) {
    const res = await request.get(p, { maxRedirects: 0 });
    const h = res.headers();
    expect(h['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['referrer-policy']).toBe('same-origin');
  }
  const violations: string[] = [];
  page.on('console', (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) violations.push(m.text());
  });
  await uiLogin(page);
  await expect(page.getByRole('main')).toBeVisible();
  expect(violations).toEqual([]);
});
