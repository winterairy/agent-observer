/**
 * POST /api/auth/login — 비밀번호 로그인(T1-4, 설계 4·5절). 공개 경로.
 * 순서: Origin(403) → 실패 제한(429) → 본문 4KB(413) → 비밀번호 확인(401) → 204 + Set-Cookie.
 * 비밀번호·쿠키 값은 응답·로그에 넣지 않는다.
 */
import { createSessionCookieValue, sessionSetCookie } from '@/auth/cookie';
import { clientKey, getLoginRateLimiter } from '@/auth/rateLimit';
import { authEnv, checkSameOrigin, verifyPassword } from '@/auth/session';
import { config } from '@/config';
import { json, methodNotAllowed, noContent, readLimited, TooLarge } from '@/http/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** JSON 또는 form-urlencoded에서 password를 꺼낸다. 없거나 문자열이 아니면 null */
function parsePassword(contentType: string, text: string): string | null {
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return new URLSearchParams(text).get('password');
  }
  try {
    const body: unknown = JSON.parse(text);
    if (body && typeof body === 'object' && typeof (body as { password?: unknown }).password === 'string') {
      return (body as { password: string }).password;
    }
  } catch {
    // JSON 아님 → 실패로 처리
  }
  return null;
}

export async function POST(req: Request): Promise<Response> {
  const denied = checkSameOrigin(req);
  if (denied) return denied;

  const limiter = getLoginRateLimiter();
  const key = clientKey(req);
  const now = Date.now();
  const decision = limiter.check(key, now);
  if (!decision.ok) {
    return json(
      429,
      { error: 'too_many_attempts', message: '로그인 시도가 너무 많습니다. 잠시 뒤 다시 시도하세요' },
      { 'Retry-After': String(decision.retryAfterSec) },
    );
  }

  const declared = req.headers.get('content-length');
  if (declared !== null && Number(declared) > config.loginMaxBodyBytes) {
    return json(413, { error: 'payload_too_large' });
  }
  let password: string | null;
  try {
    const bytes = await readLimited(req, config.loginMaxBodyBytes);
    const text = new TextDecoder('utf-8').decode(bytes);
    password = parsePassword(req.headers.get('content-type') ?? '', text);
  } catch (e) {
    if (e instanceof TooLarge) return json(413, { error: 'payload_too_large' });
    password = null;
  }

  const env = authEnv();
  if (password === null || !verifyPassword(password, env)) {
    limiter.recordFailure(key, now);
    return json(401, { error: 'invalid_password', message: '비밀번호가 맞지 않습니다' });
  }

  const value = await createSessionCookieValue(env, now);
  if (!value) return json(401, { error: 'invalid_password', message: '비밀번호가 맞지 않습니다' });
  limiter.recordSuccess(key);
  return noContent({ 'Set-Cookie': sessionSetCookie(req, value) });
}

const notAllowed = methodNotAllowed('POST');
export const GET = notAllowed;
export const PUT = notAllowed;
export const PATCH = notAllowed;
export const DELETE = notAllowed;
