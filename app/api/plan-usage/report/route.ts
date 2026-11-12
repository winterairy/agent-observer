/**
 * POST /api/plan-usage/report — 플랜 사용량 수집(T1-8, 설계 6.3). 인증은 Bearer 토큰만(쿠키는 보지 않음).
 * 처리 순서: 메서드 → Bearer → 크기 16KB → JSON → zod 검증 → store.applyPlanUsage(D-27 병합, 뮤텍스).
 * 응답·로그에 토큰 값, 본문 값, 스택을 넣지 않는다.
 */
import { readCollectBody } from '@/http/collect';
import { json, methodNotAllowed as notAllowed } from '@/http/response';
import { mergePlanUsage } from '@/plan/merge';
import { parsePlanReport } from '@/plan/schema';
import { getStore } from '@/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  const body = await readCollectBody(req);
  if (!body.ok) return body.response;

  const parsed = parsePlanReport(body.raw);
  if (!parsed.ok) {
    // 값은 남기지 않고 필드 경로만
    console.warn(`[plan-usage] 검증 실패: ${parsed.issues.join(', ')}`);
    return json(400, { error: 'invalid_payload', message: '플랜 사용량 형식이 맞지 않습니다', issues: parsed.issues });
  }

  try {
    await getStore().applyPlanUsage(parsed.report, Date.now(), mergePlanUsage);
    return json(202, { ok: true });
  } catch (e) {
    console.error('[plan-usage] 저장 실패', e instanceof Error ? e.name : 'unknown');
    return json(500, { error: 'internal' });
  }
}

const methodNotAllowed = notAllowed('POST');

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
