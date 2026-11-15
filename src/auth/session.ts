/**
 * 화면·조회 API의 로그인 확인(T1-4, 설계 4절).
 * - requireSession: route handler 안에서 한 번 더 쿠키를 확인한다(proxy 설정 실수 대비 이중 방어).
 *   Bearer 헤더는 보지 않는다(D-16: 쿠키와 토큰의 역할을 섞지 않음).
 * - checkSameOrigin: 쿠키로 상태를 바꾸는 POST는 Origin이 다른 호스트면 403.
 * - verifyPassword: 양쪽을 SHA-256 한 뒤 상수 시간 비교(길이 노출 방지).
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { isPasswordConfigured, readCookie, verifySessionCookieValue, type AuthEnv } from '@/auth/cookie';
import { json } from '@/http/response';

export function authEnv(env: NodeJS.ProcessEnv = process.env): AuthEnv {
  return { OBSERVER_PASSWORD: env.OBSERVER_PASSWORD, OBSERVER_SESSION_SECRET: env.OBSERVER_SESSION_SECRET };
}

export async function hasValidSession(req: Request, now: number = Date.now()): Promise<boolean> {
  return verifySessionCookieValue(readCookie(req.headers.get('cookie')), authEnv(), now);
}

export function unauthorized(): Response {
  return json(401, { error: 'unauthorized', message: '로그인이 필요합니다' });
}

/** 로그인돼 있으면 null, 아니면 401 응답 */
export async function requireSession(req: Request): Promise<Response | null> {
  return (await hasValidSession(req)) ? null : unauthorized();
}

/** 요청이 받은 호스트(Host 헤더, 없으면 URL) */
function requestHost(req: Request): string | null {
  const host = req.headers.get('host');
  if (host) return host.toLowerCase();
  try {
    return new URL(req.url).host.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Origin이 없으면 통과(브라우저가 아닌 클라이언트. 브라우저는 POST에 Origin을 붙인다).
 * Origin이 있으면 호스트(포트 포함)가 같아야 한다. `null`이나 해석할 수 없는 값은 거부.
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (origin === null) return true;
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }
  return originHost !== '' && originHost === requestHost(req);
}

/** 같은 호스트면 null, 아니면 403 응답 */
export function checkSameOrigin(req: Request): Response | null {
  return isSameOrigin(req) ? null : json(403, { error: 'forbidden_origin', message: '다른 사이트에서 온 요청은 받지 않습니다' });
}

export function verifyPassword(given: string, env: AuthEnv = authEnv()): boolean {
  if (!isPasswordConfigured(env)) return false;
  const a = createHash('sha256').update(given, 'utf8').digest();
  const b = createHash('sha256').update(env.OBSERVER_PASSWORD, 'utf8').digest();
  return timingSafeEqual(a, b);
}
