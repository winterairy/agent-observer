/** 로그인 테스트 도우미. 값은 테스트 안에서 만든 것이며 실제 비밀번호가 아니다. */
import { POST as LOGIN } from '../../app/api/auth/login/route';
import { getLoginRateLimiter } from '@/auth/rateLimit';

export const PASSWORD = `pw-${Math.random().toString(36).slice(2)}-테스트`;
export const SECRET = `secret-${Math.random().toString(36).slice(2)}-0123456789abcdef0123`;
export const BASE = 'http://127.0.0.1:3000';

export function setAuthEnv(opts: { password?: string | null; secret?: string | null } = {}): void {
  const pw = opts.password === undefined ? PASSWORD : opts.password;
  const sec = opts.secret === undefined ? null : opts.secret;
  if (pw === null) delete process.env.OBSERVER_PASSWORD;
  else process.env.OBSERVER_PASSWORD = pw;
  if (sec === null) delete process.env.OBSERVER_SESSION_SECRET;
  else process.env.OBSERVER_SESSION_SECRET = sec;
  getLoginRateLimiter().reset();
}

export function loginRequest(
  password: unknown,
  headers: Record<string, string> = {},
  form = false,
): Request {
  const body = form
    ? new URLSearchParams({ password: String(password) }).toString()
    : JSON.stringify({ password });
  return new Request(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json',
      host: '127.0.0.1:3000',
      ...headers,
    },
    body,
  });
}

/** Set-Cookie 헤더에서 `obs_session=값`만 */
export function cookiePair(res: Response): string | null {
  const sc = res.headers.get('set-cookie');
  if (!sc) return null;
  return sc.split(';')[0];
}

/** 맞는 비밀번호로 로그인해 Cookie 헤더 값을 돌려준다 */
export async function login(): Promise<string> {
  const res = await LOGIN(loginRequest(PASSWORD));
  if (res.status !== 204) throw new Error(`login failed: ${res.status}`);
  const pair = cookiePair(res);
  if (!pair) throw new Error('no cookie');
  return pair;
}

export function get(path: string, headers: Record<string, string> = {}): Request {
  return new Request(`${BASE}${path}`, { headers: { host: '127.0.0.1:3000', ...headers } });
}

export function post(path: string, headers: Record<string, string> = {}): Request {
  return new Request(`${BASE}${path}`, { method: 'POST', headers: { host: '127.0.0.1:3000', ...headers } });
}
