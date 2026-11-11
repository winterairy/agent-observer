/** auth/cookie·rateLimit·session 단위 테스트(T1-4). */
import { describe, expect, it } from 'vitest';
import {
  clearSetCookie,
  createSessionCookieValue,
  readCookie,
  sessionSetCookie,
  verifySessionCookieValue,
} from '@/auth/cookie';
import { LoginRateLimiter, clientKey } from '@/auth/rateLimit';
import { isSameOrigin, verifyPassword } from '@/auth/session';
import { config } from '@/config';

const NOW = Date.parse('2026-11-11T10:00:00Z');
const ENV = { OBSERVER_PASSWORD: 'correct horse battery staple' };

describe('auth/cookie', () => {
  it('만든 쿠키는 검증을 통과하고 형식은 v1.<만료>.<서명>이다', async () => {
    const v = await createSessionCookieValue(ENV, NOW);
    expect(v).toMatch(/^v1\.\d+\.[A-Za-z0-9_-]{43}$/);
    expect(v).not.toContain(ENV.OBSERVER_PASSWORD);
    expect(await verifySessionCookieValue(v, ENV, NOW)).toBe(true);
  });

  it('30일 뒤 만료된다', async () => {
    const v = await createSessionCookieValue(ENV, NOW);
    expect(await verifySessionCookieValue(v, ENV, NOW + config.cookieMaxAgeMs - 1000)).toBe(true);
    expect(await verifySessionCookieValue(v, ENV, NOW + config.cookieMaxAgeMs)).toBe(false);
  });

  it('값을 바꾸면 무효다(서명·만료·버전·형식)', async () => {
    const v = (await createSessionCookieValue(ENV, NOW))!;
    const [ver, exp, sig] = v.split('.');
    const flip = sig[0] === 'A' ? 'B' : 'A';
    const cases = [
      `${ver}.${exp}.${flip}${sig.slice(1)}`,
      `${ver}.${Number(exp) + 1}.${sig}`,
      `v2.${exp}.${sig}`,
      `${ver}.${exp}`,
      '',
      'garbage',
      `${v}x`,
    ];
    for (const c of cases) expect(await verifySessionCookieValue(c, ENV, NOW)).toBe(false);
    expect(await verifySessionCookieValue(null, ENV, NOW)).toBe(false);
  });

  it('비밀번호를 바꾸면 기존 쿠키가 무효다(SECRET 없을 때)', async () => {
    const v = await createSessionCookieValue(ENV, NOW);
    expect(await verifySessionCookieValue(v, { OBSERVER_PASSWORD: 'other' }, NOW)).toBe(false);
  });

  it('OBSERVER_SESSION_SECRET이 있으면 그 키로 서명한다', async () => {
    const env = { ...ENV, OBSERVER_SESSION_SECRET: 's'.repeat(32) };
    const v = await createSessionCookieValue(env, NOW);
    expect(await verifySessionCookieValue(v, env, NOW)).toBe(true);
    expect(await verifySessionCookieValue(v, ENV, NOW)).toBe(false);
    expect(await verifySessionCookieValue(v, { ...env, OBSERVER_SESSION_SECRET: 't'.repeat(32) }, NOW)).toBe(false);
  });

  it('비밀번호가 비었으면 쿠키를 만들지도 검증하지도 않는다', async () => {
    expect(await createSessionCookieValue({ OBSERVER_PASSWORD: '' }, NOW)).toBeNull();
    const v = await createSessionCookieValue({ ...ENV, OBSERVER_SESSION_SECRET: 's'.repeat(32) }, NOW);
    expect(await verifySessionCookieValue(v, { OBSERVER_SESSION_SECRET: 's'.repeat(32) }, NOW)).toBe(false);
  });

  it('readCookie는 이름이 같은 값만 꺼낸다', () => {
    expect(readCookie('a=1; obs_session=v1.2.x; b=3')).toBe('v1.2.x');
    expect(readCookie('xobs_session=1')).toBeNull();
    expect(readCookie(null)).toBeNull();
  });

  it('Set-Cookie는 HttpOnly·SameSite=Lax·Path=/·Max-Age 30일, Secure는 https일 때만', () => {
    const http = new Request('http://127.0.0.1:3000/api/auth/login');
    const sc = sessionSetCookie(http, 'v');
    expect(sc).toContain('HttpOnly');
    expect(sc).toContain('SameSite=Lax');
    expect(sc).toContain('Path=/');
    expect(sc).toContain(`Max-Age=${30 * 24 * 3600}`);
    expect(sc).not.toContain('Secure');
    expect(sessionSetCookie(new Request('https://example.test/'), 'v')).toContain('Secure');
    expect(
      sessionSetCookie(new Request('http://127.0.0.1/', { headers: { 'x-forwarded-proto': 'https' } }), 'v'),
    ).toContain('Secure');
    expect(clearSetCookie(http)).toMatch(/^obs_session=; .*Max-Age=0/);
  });
});

describe('auth/rateLimit', () => {
  const opts = { windowMs: 60_000, perKey: 5, global: 20 };

  it('IP별 실패 5회 뒤 6번째 시도는 거부되고 1분이 지나면 풀린다', () => {
    const rl = new LoginRateLimiter(opts);
    for (let i = 0; i < 5; i++) {
      expect(rl.check('ip1', NOW + i).ok).toBe(true);
      rl.recordFailure('ip1', NOW + i);
    }
    const d = rl.check('ip1', NOW + 10);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.retryAfterSec).toBe(60);
    expect(rl.check('ip2', NOW + 10).ok).toBe(true);
    expect(rl.check('ip1', NOW + 60_001).ok).toBe(true);
  });

  it('성공하면 그 IP 카운터가 초기화된다', () => {
    const rl = new LoginRateLimiter(opts);
    for (let i = 0; i < 4; i++) rl.recordFailure('ip1', NOW);
    rl.recordSuccess('ip1');
    for (let i = 0; i < 4; i++) rl.recordFailure('ip1', NOW);
    expect(rl.check('ip1', NOW).ok).toBe(true);
  });

  it('IP와 관계없이 전체 실패 20회가 넘으면 거부된다', () => {
    const rl = new LoginRateLimiter(opts);
    for (let i = 0; i < 20; i++) rl.recordFailure(`ip${i}`, NOW);
    expect(rl.check('fresh', NOW).ok).toBe(false);
    expect(rl.check('fresh', NOW + 60_001).ok).toBe(true);
  });

  it('clientKey는 x-forwarded-for 첫 값, 없으면 local', () => {
    expect(clientKey(new Request('http://x/', { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } }))).toBe('1.2.3.4');
    expect(clientKey(new Request('http://x/'))).toBe('local');
  });
});

describe('auth/session', () => {
  it('verifyPassword는 같은 값만, 비밀번호가 비면 항상 false', () => {
    expect(verifyPassword('a', { OBSERVER_PASSWORD: 'a' })).toBe(true);
    expect(verifyPassword('a ', { OBSERVER_PASSWORD: 'a' })).toBe(false);
    expect(verifyPassword('', { OBSERVER_PASSWORD: '' })).toBe(false);
    expect(verifyPassword('', {})).toBe(false);
  });

  it('isSameOrigin: Origin 없음·같은 호스트는 통과, 다른 호스트·포트·null은 거부', () => {
    const r = (origin?: string) =>
      new Request('http://127.0.0.1:3000/api/auth/login', {
        method: 'POST',
        headers: { host: '127.0.0.1:3000', ...(origin === undefined ? {} : { origin }) },
      });
    expect(isSameOrigin(r())).toBe(true);
    expect(isSameOrigin(r('http://127.0.0.1:3000'))).toBe(true);
    expect(isSameOrigin(r('http://evil.test'))).toBe(false);
    expect(isSameOrigin(r('http://127.0.0.1:4000'))).toBe(false);
    expect(isSameOrigin(r('null'))).toBe(false);
  });
});
