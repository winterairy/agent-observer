/**
 * 인증 보호(T1-4, 설계 4절 보호 범위 표). Next 16은 proxy.ts(Node 런타임 기본).
 *
 * | 경로 | 보호 |
 * | /api/events, /api/plan-usage/report | 통과. route에서 Bearer 검사(쿠키는 보지 않음) |
 * | /api/auth/login, /api/auth/logout, /login, /_next/static/*, /_next/image/*, /favicon.ico | 공개 |
 * | /api/* 나머지 | 쿠키 없거나 무효 → 401 JSON. Bearer 헤더는 무시(D-16) |
 * | 그 외 화면 경로 | 쿠키 없거나 무효 → /login?next=<경로> 로 302 |
 *
 * route handler 안에서도 requireSession으로 한 번 더 확인한다(이중 방어).
 */
import { NextResponse, type NextRequest } from 'next/server';
import { readCookie, verifySessionCookieValue } from '@/auth/cookie';
import { safeNextPath } from '@/auth/nextPath';

const PUBLIC_EXACT = new Set(['/api/events', '/api/plan-usage/report', '/api/auth/login', '/api/auth/logout', '/login', '/favicon.ico']);
const PUBLIC_PREFIX = ['/_next/static/', '/_next/image'];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIX.some((p) => pathname.startsWith(p));
}

export { safeNextPath };

export async function proxy(request: NextRequest): Promise<Response> {
  const { pathname, search } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const ok = await verifySessionCookieValue(
    readCookie(request.headers.get('cookie')),
    { OBSERVER_PASSWORD: process.env.OBSERVER_PASSWORD, OBSERVER_SESSION_SECRET: process.env.OBSERVER_SESSION_SECRET },
    Date.now(),
  );
  if (ok) return NextResponse.next();

  if (pathname === '/api' || pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'unauthorized', message: '로그인이 필요합니다' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  const next = safeNextPath(pathname + search);
  if (next !== '/') url.searchParams.set('next', next);
  return NextResponse.redirect(url, 302);
}

export const config = {
  matcher: ['/((?!_next/static/|_next/image|favicon\\.ico$).*)'],
};
