/**
 * POST /api/auth/logout — 같은 이름 쿠키를 Max-Age=0으로(T1-4, 설계 4·5절). 쿠키가 없어도 204.
 * 서명 쿠키라 서버 쪽 무효화 목록은 없다(리스크 절). Origin이 다른 호스트면 403.
 */
import { clearSetCookie } from '@/auth/cookie';
import { checkSameOrigin } from '@/auth/session';
import { methodNotAllowed, noContent } from '@/http/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  const denied = checkSameOrigin(req);
  if (denied) return denied;
  return noContent({ 'Set-Cookie': clearSetCookie(req) });
}

const notAllowed = methodNotAllowed('POST');
export const GET = notAllowed;
export const PUT = notAllowed;
export const PATCH = notAllowed;
export const DELETE = notAllowed;
