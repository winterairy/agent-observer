/** GET /api/skills?project=&session=<key> — 스킬별 사용 횟수(T1-5, 설계 5절). 쿠키 필요. */
import { requireSession } from '@/auth/session';
import { json } from '@/http/response';
import { skillsView } from '@/query/views';
import { getStore } from '@/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const denied = await requireSession(req);
  if (denied) return denied;
  const params = new URL(req.url).searchParams;
  const project = params.get('project') || undefined;
  const session = params.get('session') || undefined;
  try {
    const sessions = await getStore().listSessions(project === undefined ? {} : { project });
    return json(200, skillsView(sessions, { project, session }, { now: Date.now() }));
  } catch (e) {
    console.error('[skills] 조회 실패', e instanceof Error ? e.name : 'unknown');
    return json(500, { error: 'internal' });
  }
}
