/**
 * 로그인 실패 제한(T1-4, D-15, 설계 4절). 메모리 슬라이딩 윈도.
 * - IP별: 1분 안 실패 5회가 쌓이면 다음 시도(6번째)부터 429.
 * - 전역: IP와 관계없이 1분 안 실패 20회가 쌓이면 다음 시도부터 429(x-forwarded-for 위조 대비).
 * - 성공하면 그 IP 카운터만 초기화한다. 서버 재시작 시 초기화(허용, 리스크 절).
 * - 거부된(429) 시도는 실패로 세지 않는다.
 */
import { config } from '@/config';

export interface RateLimitOptions {
  windowMs: number;
  perKey: number;
  global: number;
}

export type RateDecision = { ok: true } | { ok: false; retryAfterSec: number };

export class LoginRateLimiter {
  private readonly byKey = new Map<string, number[]>();
  private globalFails: number[] = [];

  constructor(private readonly opts: RateLimitOptions) {}

  private prune(now: number): void {
    const cutoff = now - this.opts.windowMs;
    this.globalFails = this.globalFails.filter((t) => t > cutoff);
    for (const [k, list] of this.byKey) {
      const kept = list.filter((t) => t > cutoff);
      if (kept.length) this.byKey.set(k, kept);
      else this.byKey.delete(k);
    }
  }

  private retryAfter(oldest: number, now: number): number {
    return Math.max(1, Math.ceil((oldest + this.opts.windowMs - now) / 1000));
  }

  /** 시도해도 되는지. 비밀번호를 확인하기 전에 부른다 */
  check(key: string, now: number): RateDecision {
    this.prune(now);
    const list = this.byKey.get(key) ?? [];
    let retry = 0;
    if (list.length >= this.opts.perKey) retry = this.retryAfter(list[list.length - this.opts.perKey], now);
    if (this.globalFails.length >= this.opts.global) {
      retry = Math.max(retry, this.retryAfter(this.globalFails[this.globalFails.length - this.opts.global], now));
    }
    return retry > 0 ? { ok: false, retryAfterSec: retry } : { ok: true };
  }

  recordFailure(key: string, now: number): void {
    const list = this.byKey.get(key) ?? [];
    list.push(now);
    this.byKey.set(key, list);
    this.globalFails.push(now);
  }

  recordSuccess(key: string): void {
    this.byKey.delete(key);
  }

  reset(): void {
    this.byKey.clear();
    this.globalFails = [];
  }
}

/** 클라이언트 IP 키: x-forwarded-for 첫 값, 없으면 "local" */
export function clientKey(req: Request): string {
  const first = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return first ? first.slice(0, 64) : 'local';
}

const KEY = Symbol.for('agent-observer.loginRateLimiter');
type Holder = { [KEY]?: LoginRateLimiter };

/** 프로세스당 1개(핫 리로드에도 하나) */
export function getLoginRateLimiter(): LoginRateLimiter {
  const g = globalThis as Holder;
  g[KEY] ??= new LoginRateLimiter({
    windowMs: config.loginWindowMs,
    perKey: config.loginFailuresPerMinute,
    global: config.loginGlobalFailuresPerMinute,
  });
  return g[KEY];
}
