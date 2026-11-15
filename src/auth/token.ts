/**
 * 수집 API Bearer 토큰 확인(설계 4절). 쿠키는 보지 않는다.
 * 토큰 값은 응답·로그에 넣지 않는다.
 */
import { timingSafeEqual } from 'node:crypto';
import { config } from '@/config';

export type BearerResult = 'ok' | 'unauthorized' | 'server_token_invalid';

export const SERVER_TOKEN_INVALID_MESSAGE =
  '서버 수집 토큰(OBSERVER_TOKEN)이 설정되지 않았거나 16자보다 짧습니다';

export function isServerTokenValid(serverToken: string | undefined): serverToken is string {
  return typeof serverToken === 'string' && serverToken.length >= config.minTokenLength;
}

/** 상수 시간 비교. 길이가 다르면 바로 실패 */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function checkBearer(authorization: string | null, serverToken: string | undefined): BearerResult {
  if (!isServerTokenValid(serverToken)) return 'server_token_invalid';
  if (!authorization) return 'unauthorized';
  const m = /^Bearer (\S+)$/.exec(authorization);
  if (!m) return 'unauthorized';
  return safeEqual(m[1], serverToken) ? 'ok' : 'unauthorized';
}

let warned = false;

/** 서버 시작 시 한 번 경고(값은 출력하지 않는다) */
export function warnIfServerTokenInvalid(env: Record<string, string | undefined> = process.env, log: Pick<Console, 'warn'> = console): void {
  if (warned || isServerTokenValid(env.OBSERVER_TOKEN)) return;
  warned = true;
  log.warn(`[auth] ${SERVER_TOKEN_INVALID_MESSAGE}. 수집 요청을 모두 거부합니다.`);
}
