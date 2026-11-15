/**
 * T1-4 로그인 수용 기준(휴대폰 항목 제외). route handler와 proxy를 직접 호출한다(서버 없음).
 */
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as LOGIN_GET, POST as LOGIN } from '../../app/api/auth/login/route';
import { POST as LOGOUT } from '../../app/api/auth/logout/route';
import { GET as PROJECTS } from '../../app/api/projects/route';
import { GET as SESSIONS } from '../../app/api/sessions/route';
import { proxy, safeNextPath } from '../../proxy';
import { getStore, resetStoreForTests } from '@/store';
import { applyEvent } from '@/state/reducer';
import { inc } from '../helpers/events';
import { BASE, PASSWORD, SECRET, cookiePair, get, login, loginRequest, post, setAuthEnv } from '../helpers/auth';

beforeEach(() => {
  process.env.OBSERVER_STORE = 'memory';
  process.env.OBSERVER_TOKEN = 'collect-token-0123456789abcdef';
  resetStoreForTests();
  setAuthEnv();
});

afterEach(() => {
  resetStoreForTests();
  vi.restoreAllMocks();
});

function proxyReq(path: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`${BASE}${path}`, { headers });
}

describe('로그인 API', () => {
  it('맞는 비밀번호면 204 + HttpOnly·SameSite=Lax 쿠키, 비밀번호는 응답에 없다', async () => {
    const res = await LOGIN(loginRequest(PASSWORD));
    expect(res.status).toBe(204);
    const sc = res.headers.get('set-cookie')!;
    expect(sc).toMatch(/^obs_session=v1\.\d+\./);
    expect(sc).toContain('HttpOnly');
    expect(sc).toContain('SameSite=Lax');
    expect(sc).not.toContain('Secure');
    expect(sc).not.toContain(PASSWORD);
    expect(await res.text()).toBe('');
  });

  it('form-urlencoded 본문도 받는다', async () => {
    const res = await LOGIN(loginRequest(PASSWORD, {}, true));
    expect(res.status).toBe(204);
  });

  it('틀린 비밀번호는 401 invalid_password와 메시지, 쿠키 없음', async () => {
    const log = vi.spyOn(console, 'warn');
    const res = await LOGIN(loginRequest(`${PASSWORD}x`));
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
    const body = await res.json();
    expect(body.error).toBe('invalid_password');
    expect(body.message).toBeTruthy();
    expect(JSON.stringify(body)).not.toContain(PASSWORD);
    expect(JSON.stringify(log.mock.calls)).not.toContain(PASSWORD);
  });

  it.each([
    ['password 없음', JSON.stringify({})],
    ['password가 숫자', JSON.stringify({ password: 1 })],
    ['JSON 아님', 'password='],
  ])('본문이 이상하면(%s) 401, 쿠키 없음', async (_n, body) => {
    const res = await LOGIN(
      new Request(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }),
    );
    expect(res.status).toBe(401);
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('본문이 4KB를 넘으면 413', async () => {
    const res = await LOGIN(loginRequest('x'.repeat(5000)));
    expect(res.status).toBe(413);
  });

  it.each([
    ['미설정', null],
    ['빈 문자열', ''],
  ])('OBSERVER_PASSWORD가 %s이면 어떤 비밀번호로도 로그인되지 않는다', async (_n, pw) => {
    setAuthEnv({ password: pw, secret: SECRET });
    for (const given of ['', PASSWORD, 'anything']) {
      const res = await LOGIN(loginRequest(given));
      expect(res.status).toBe(401);
      expect(res.headers.get('set-cookie')).toBeNull();
    }
  });

  it('1분 안에 6번째 실패 시도는 429 + Retry-After(맞는 비밀번호여도)', async () => {
    const headers = { 'x-forwarded-for': '10.0.0.1' };
    for (let i = 0; i < 5; i++) expect((await LOGIN(loginRequest('wrong', headers))).status).toBe(401);
    const res = await LOGIN(loginRequest(PASSWORD, headers));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toBe('too_many_attempts');
    expect(Number(res.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(res.headers.get('set-cookie')).toBeNull();
    // 다른 IP는 아직 된다
    expect((await LOGIN(loginRequest(PASSWORD, { 'x-forwarded-for': '10.0.0.2' }))).status).toBe(204);
  });

  it('1분이 지나면 다시 시도할 수 있다', async () => {
    const t0 = Date.now();
    const now = vi.spyOn(Date, 'now').mockReturnValue(t0);
    for (let i = 0; i < 5; i++) await LOGIN(loginRequest('wrong'));
    expect((await LOGIN(loginRequest(PASSWORD))).status).toBe(429);
    now.mockReturnValue(t0 + 60_001);
    expect((await LOGIN(loginRequest(PASSWORD))).status).toBe(204);
  });

  it('IP와 관계없이 전체 실패가 1분에 20회를 넘으면 거부된다', async () => {
    for (let i = 0; i < 20; i++) {
      // IP마다 4회 이하라 IP별 제한에는 걸리지 않는다
      const res = await LOGIN(loginRequest('wrong', { 'x-forwarded-for': `10.1.${Math.floor(i / 4)}.1` }));
      expect(res.status).toBe(401);
    }
    const res = await LOGIN(loginRequest(PASSWORD, { 'x-forwarded-for': '10.9.9.9' }));
    expect(res.status).toBe(429);
  });

  it('Origin이 다른 호스트면 403, 쿠키 없음', async () => {
    const res = await LOGIN(loginRequest(PASSWORD, { origin: 'http://evil.test' }));
    expect(res.status).toBe(403);
    expect(res.headers.get('set-cookie')).toBeNull();
    expect((await LOGIN(loginRequest(PASSWORD, { origin: 'http://127.0.0.1:3000' }))).status).toBe(204);
  });

  it('POST 외 메서드는 405', async () => {
    const res = LOGIN_GET();
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
  });
});

describe('쿠키로 조회 API 열기·닫기', () => {
  beforeEach(async () => {
    await getStore().applyEvent(inc('SessionStart', { at: Date.now() }), applyEvent);
  });

  it('로그인하지 않으면 401이고 데이터가 없다', async () => {
    const res = await SESSIONS(get('/api/sessions'));
    expect(res.status).toBe(401);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: 'unauthorized', message: '로그인이 필요합니다' });
    expect(text).not.toContain('P1');
  });

  it('맞는 비밀번호로 로그인하면 조회 API가 열린다', async () => {
    const cookie = await login();
    const res = await SESSIONS(get('/api/sessions', { cookie }));
    expect(res.status).toBe(200);
    expect((await res.json()).sessions).toHaveLength(1);
  });

  it('쿠키 값을 임의로 바꾸면 로그인 안 된 상태다', async () => {
    const cookie = await login();
    const forged = [
      cookie.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')),
      cookie.replace(/v1\.(\d+)\./, (_m, e) => `v1.${Number(e) + 100}.`),
      'obs_session=v1.9999999999.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    ];
    for (const c of forged) {
      expect((await SESSIONS(get('/api/sessions', { cookie: c }))).status).toBe(401);
      expect((await proxy(proxyReq('/api/sessions', { cookie: c }))).status).toBe(401);
    }
  });

  it('로그아웃하면 쿠키가 지워지고(Max-Age=0) 그 뒤 조회 API는 401', async () => {
    await login();
    const res = await LOGOUT(post('/api/auth/logout'));
    expect(res.status).toBe(204);
    const pair = cookiePair(res);
    expect(pair).toBe('obs_session=');
    expect(res.headers.get('set-cookie')).toContain('Max-Age=0');
    // 브라우저는 지워진 쿠키를 보내지 않는다 → 빈 값으로 호출
    expect((await SESSIONS(get('/api/sessions', { cookie: pair! }))).status).toBe(401);
    expect((await PROJECTS(get('/api/projects', { cookie: pair! }))).status).toBe(401);
  });

  it('로그아웃은 쿠키가 없어도 204, Origin이 다르면 403', async () => {
    expect((await LOGOUT(post('/api/auth/logout'))).status).toBe(204);
    expect((await LOGOUT(post('/api/auth/logout', { origin: 'http://evil.test' }))).status).toBe(403);
  });

  it('Bearer 토큰으로는 조회 API가 열리지 않는다(D-16)', async () => {
    const auth = { authorization: `Bearer ${process.env.OBSERVER_TOKEN}` };
    expect((await SESSIONS(get('/api/sessions', auth))).status).toBe(401);
    expect((await proxy(proxyReq('/api/sessions', auth))).status).toBe(401);
    const cookie = await login();
    expect((await SESSIONS(get('/api/sessions', { cookie, authorization: 'Bearer wrong' }))).status).toBe(200);
  });
});

describe('proxy 보호 범위(설계 4절)', () => {
  it('로그인하지 않고 화면에 접속하면 /login?next=<경로>로 302', async () => {
    const res = await proxy(proxyReq('/?session=abc'));
    expect(res.status).toBe(302);
    const loc = new URL(res.headers.get('location')!);
    expect(loc.pathname).toBe('/login');
    expect(loc.searchParams.get('next')).toBe('/?session=abc');
    const root = await proxy(proxyReq('/'));
    expect(new URL(root.headers.get('location')!).pathname).toBe('/login');
  });

  it('/api/* 나머지는 쿠키 없으면 401 JSON', async () => {
    for (const p of ['/api/sessions', '/api/projects', '/api/skills', '/api/characters', '/api/characters/lead/image', '/api/sessions/x/dismiss', '/api/unknown']) {
      const res = await proxy(proxyReq(p));
      expect(res.status, p).toBe(401);
      expect((await res.json()).error).toBe('unauthorized');
    }
  });

  it('공개 경로는 통과한다', async () => {
    for (const p of ['/api/events', '/api/auth/login', '/api/auth/logout', '/login', '/_next/static/x.js', '/_next/image?url=x', '/favicon.ico']) {
      const res = await proxy(proxyReq(p));
      expect(res.headers.get('x-middleware-next'), p).toBe('1');
    }
  });

  it('로그인하면 화면과 API가 통과한다', async () => {
    const cookie = await login();
    for (const p of ['/', '/api/sessions', '/characters/lead/sheet.png']) {
      const res = await proxy(proxyReq(p, { cookie }));
      expect(res.headers.get('x-middleware-next'), p).toBe('1');
    }
  });

  it('public 정적 경로(캐릭터 그림 등)도 쿠키 없으면 로그인으로 이동', async () => {
    const res = await proxy(proxyReq('/characters/lead/sheet.png'));
    expect(res.status).toBe(302);
  });

  it('next는 내부 경로만 허용한다', () => {
    expect(safeNextPath('/a?b=1')).toBe('/a?b=1');
    expect(safeNextPath('//evil.test')).toBe('/');
    expect(safeNextPath('/\\evil.test')).toBe('/');
    expect(safeNextPath('http://evil.test')).toBe('/');
  });
});
