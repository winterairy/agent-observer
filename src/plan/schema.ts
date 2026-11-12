/**
 * 플랜 사용량 수집 요청 검증(T1-8, 설계 6.3). zod strip 모드라 정의하지 않은 키
 * (spend_limit, 최상위 기타 필드)는 버린다. null 창은 "없음"과 같다.
 */
import { z } from 'zod';
import { PLAN_WINDOW_NAMES, type PlanReport } from '@/domain/types';

const ISO_PREFIX = /^\d{4}-\d{2}-\d{2}T/;

const windowSchema = z.object({
  used_percentage: z.number().finite().min(0).max(100),
  // 밀리초 값을 잘못 보낸 경우를 거른다
  resets_at: z.number().int().gt(0).lt(1e11),
});

export const planReportSchema = z.object({
  v: z.literal(1),
  // 형식만 검사하고 저장하지 않는다(서버 수신 시각을 쓴다)
  ts: z.string().max(64).refine((s) => ISO_PREFIX.test(s) && !Number.isNaN(Date.parse(s))),
  remote: z.boolean().nullish(),
  rate_limits: z.object({
    five_hour: windowSchema.nullish(),
    seven_day: windowSchema.nullish(),
  }),
});

export type PlanParseResult = { ok: true; report: PlanReport } | { ok: false; issues: string[] };

/** 실패하면 필드 경로만 돌려준다(값은 넣지 않는다) */
export function parsePlanReport(raw: unknown): PlanParseResult {
  const r = planReportSchema.safeParse(raw);
  if (!r.success) {
    const issues = [...new Set(r.error.issues.map((i) => i.path.map(String).join('.') || '(root)'))];
    return { ok: false, issues };
  }
  const report: PlanReport = { remote: r.data.remote ?? false, windows: {} };
  for (const name of PLAN_WINDOW_NAMES) {
    const w = r.data.rate_limits[name];
    if (w) report.windows[name] = { usedPercentage: w.used_percentage, resetsAtSec: w.resets_at };
  }
  if (Object.keys(report.windows).length === 0) return { ok: false, issues: ['rate_limits'] };
  return { ok: true, report };
}
