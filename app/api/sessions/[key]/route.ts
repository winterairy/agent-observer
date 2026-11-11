/** GET /api/sessions/[key] — 세션 상세와 에이전트 목록(T1-5, 설계 5절). 쿠키 필요. 없으면 404. */
import { requireSession } from '@/auth/session';
import { json } from '@/http/response';
import { sessionDetailView } from '@/query/views';
import { getStore } from '@/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, ctx: { params: Promise<{ key: string }> }): Promise<Response> {
  const denied = await requireSession(req);
  if (denied) return denied;
  const { key } = await ctx.params;
  try {
    const s = await getStore().getSession(key);
    if (!s) return json(404, { error: 'not_found', message: '세션이 없습니다' });
    return json(200, sessionDetailView(s, { now: Date.now() }));
  } catch (e) {
    console.error('[session] 조회 실패', e instanceof Error ? e.name : 'unknown');
    return json(500, { error: 'internal' });
  }
}
