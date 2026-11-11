import { describe, expect, it, vi } from 'vitest';
import { checkBearer, isServerTokenValid, safeEqual, warnIfServerTokenInvalid } from '@/auth/token';

const SERVER = 'server-token-0123456789abcdef';

describe('auth/token', () => {
  it('서버 토큰은 16자 이상이어야 유효하다', () => {
    expect(isServerTokenValid(undefined)).toBe(false);
    expect(isServerTokenValid('')).toBe(false);
    expect(isServerTokenValid('a'.repeat(15))).toBe(false);
    expect(isServerTokenValid('a'.repeat(16))).toBe(true);
  });

  it('checkBearer: 서버 토큰이 무효면 보낸 값과 관계없이 server_token_invalid', () => {
    expect(checkBearer('Bearer short', 'short')).toBe('server_token_invalid');
    expect(checkBearer(null, undefined)).toBe('server_token_invalid');
  });

  it('checkBearer: 맞는 토큰만 ok, 나머지는 모두 unauthorized', () => {
    expect(checkBearer(`Bearer ${SERVER}`, SERVER)).toBe('ok');
    expect(checkBearer(null, SERVER)).toBe('unauthorized');
    expect(checkBearer('', SERVER)).toBe('unauthorized');
    expect(checkBearer(`Bearer ${SERVER}x`, SERVER)).toBe('unauthorized');
    expect(checkBearer(`bearer ${SERVER}`, SERVER)).toBe('unauthorized');
    expect(checkBearer(`Bearer  ${SERVER}`, SERVER)).toBe('unauthorized');
  });

  it('safeEqual은 길이가 다르면 false', () => {
    expect(safeEqual('abc', 'abcd')).toBe(false);
    expect(safeEqual('abc', 'abc')).toBe(true);
  });

  it('시작 경고는 토큰 값을 출력하지 않는다', () => {
    const log = { warn: vi.fn() };
    warnIfServerTokenInvalid({ OBSERVER_TOKEN: 'tiny-secret' }, log);
    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(log.warn.mock.calls)).not.toContain('tiny-secret');
  });
});
