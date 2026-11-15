/**
 * 플랜 사용량 조회 판정(T1-8, 설계 6.4). 순수 함수. 저장하지 않고 조회할 때마다 now로 계산한다.
 * - status: none(값 없음) / expired(now >= resets_at) / ok. "오래됨" 상태는 없다(D-24).
 * - level(ok일 때, D-30): >= 100 reached, >= warnPercent near, 그 외 normal. expired면 null.
 */
import { config } from '@/config';
import { PLAN_WINDOW_NAMES, type PlanUsageState, type PlanWindowName, type PlanWindowState } from '@/domain/types';

export type PlanLevel = 'normal' | 'near' | 'reached';

export type PlanWindowView =
  | { status: 'none' }
  | {
      status: 'ok' | 'expired';
      usedPercentage: number;
      level: PlanLevel | null;
      resetsAt: string;
      resetsAtEpoch: number;
      receivedAt: string;
      remote: boolean;
    };

export interface PlanUsageView {
  now: string;
  windows: Record<PlanWindowName, PlanWindowView>;
}

export interface PlanViewOptions {
  warnPercent?: number;
  reachedPercent?: number;
}

export function planLevel(usedPercentage: number, opts: PlanViewOptions = {}): PlanLevel {
  if (usedPercentage >= (opts.reachedPercent ?? config.planReachedPercent)) return 'reached';
  if (usedPercentage >= (opts.warnPercent ?? config.planWarnPercent)) return 'near';
  return 'normal';
}

export function planWindowView(w: PlanWindowState | null, now: number, opts: PlanViewOptions = {}): PlanWindowView {
  if (!w) return { status: 'none' };
  const resetsAtMs = w.resetsAtSec * 1000;
  const expired = now >= resetsAtMs;
  return {
    status: expired ? 'expired' : 'ok',
    usedPercentage: w.usedPercentage,
    level: expired ? null : planLevel(w.usedPercentage, opts),
    resetsAt: new Date(resetsAtMs).toISOString(),
    resetsAtEpoch: w.resetsAtSec,
    receivedAt: new Date(w.receivedTs).toISOString(),
    remote: w.remote,
  };
}

export function planUsageView(state: PlanUsageState, now: number, opts: PlanViewOptions = {}): PlanUsageView {
  const windows = {} as Record<PlanWindowName, PlanWindowView>;
  for (const name of PLAN_WINDOW_NAMES) windows[name] = planWindowView(state[name], now, opts);
  return { now: new Date(now).toISOString(), windows };
}
