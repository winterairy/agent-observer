/**
 * GET /api/plan-usage — 플랜 사용량 조회(T1-8, 설계 6.4). 쿠키 필요(requireSession 이중 확인, Bearer 무시 — D-16).
 * 계정 단위 값이라 프로젝트 필터 인자가 없다. 판정(ok/expired/none, level)은 조회 시각으로 계산한다.
 */
import { requireSession } from '@/auth/session';
import { json, methodNotAllowed as notAllowed } from '@/http/response';
import { planUsageView } from '@/plan/view';
import { getStore } from '@/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const denied = await requireSession(req);
  if (denied) return denied;
  try {
    const state = await getStore().getPlanUsage();
    return json(200, planUsageView(state, Date.now()));
  } catch (e) {
    console.error('[plan-usage] 조회 실패', e instanceof Error ? e.name : 'unknown');
    return json(500, { error: 'internal' });
  }
}

const methodNotAllowed = notAllowed('GET');

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
