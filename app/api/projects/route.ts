/** GET /api/projects — 프로젝트 목록과 세션 수(T1-5, 설계 5절). 쿠키 필요(requireSession 이중 확인). */
import { requireSession } from '@/auth/session';
import { json } from '@/http/response';
import { projectsView } from '@/query/views';
import { getStore } from '@/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const denied = await requireSession(req);
  if (denied) return denied;
  try {
    const sessions = await getStore().listSessions();
    return json(200, projectsView(sessions, { now: Date.now() }));
  } catch (e) {
    console.error('[projects] 조회 실패', e instanceof Error ? e.name : 'unknown');
    return json(500, { error: 'internal' });
  }
}
