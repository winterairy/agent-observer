/**
 * 플랜 사용량 병합(T1-8, D-27, 설계 6.4). 순수 함수.
 * - resets_at 차이가 60초 이하면 같은 창: 큰 사용률과 늦은 resets_at을 남긴다(도착 순서와 무관).
 * - 60초보다 늦으면 새 창이 이긴다. 60초보다 이르면 늦게 온 옛 창이라 값은 무시한다.
 * - receivedTs는 이기든 지든 now로 갱신한다("이 창을 마지막으로 확인한 시각").
 */
import { config } from '@/config';
import {
  PLAN_WINDOW_NAMES,
  type PlanReport,
  type PlanUsageState,
  type PlanWindowReport,
  type PlanWindowState,
} from '@/domain/types';

export const SAME_WINDOW_SEC = config.planSameWindowSec;

export function mergePlanWindow(
  old: PlanWindowState | null,
  inc: PlanWindowReport,
  remote: boolean,
  now: number,
): PlanWindowState {
  const fresh: PlanWindowState = { usedPercentage: inc.usedPercentage, resetsAtSec: inc.resetsAtSec, receivedTs: now, remote };
  if (old === null) return fresh;
  const d = inc.resetsAtSec - old.resetsAtSec;
  if (d > SAME_WINDOW_SEC) return fresh; // 새 창
  if (d < -SAME_WINDOW_SEC) return { ...old, receivedTs: now }; // 늦게 온 옛 창 무시
  // 같은 창(흔들림)
  return {
    usedPercentage: Math.max(old.usedPercentage, inc.usedPercentage),
    resetsAtSec: Math.max(old.resetsAtSec, inc.resetsAtSec),
    receivedTs: now,
    remote: inc.usedPercentage > old.usedPercentage ? remote : old.remote,
  };
}

/** report에 있는 창만 병합하고 없는 창은 prev 그대로 둔다 */
export function mergePlanUsage(prev: PlanUsageState, report: PlanReport, now: number): PlanUsageState {
  const next: PlanUsageState = { ...prev };
  for (const name of PLAN_WINDOW_NAMES) {
    const inc = report.windows[name];
    if (inc) next[name] = mergePlanWindow(prev[name], inc, report.remote, now);
  }
  return next;
}
