/**
 * GET /api/sessions?project=&ended=recent|none|all&hidden=only (T1-5, 설계 5절). 쿠키 필요.
 * 정렬: 승인 대기 먼저(기다린 시간이 긴 순) → 다른 활성 → 종료, 그 안에서 마지막 이벤트 내림차순.
 */
import { requireSession } from '@/auth/session';
import { json } from '@/http/response';
import { sessionsView, type EndedFilter } from '@/query/views';
import { getStore } from '@/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ENDED: readonly EndedFilter[] = ['recent', 'none', 'all'];

export async function GET(req: Request): Promise<Response> {
  const denied = await requireSession(req);
  if (denied) return denied;
  const params = new URL(req.url).searchParams;
  const project = params.get('project') || undefined;
  const endedRaw = params.get('ended') ?? 'recent';
  const hidden = params.get('hidden');
  if (!ENDED.includes(endedRaw as EndedFilter) || (hidden !== null && hidden !== 'only')) {
    return json(400, { error: 'invalid_query', message: 'ended는 recent|none|all, hidden은 only만 쓸 수 있습니다' });
  }
  try {
    const sessions = await getStore().listSessions(project === undefined ? {} : { project });
    return json(
      200,
      sessionsView(sessions, { project, ended: endedRaw as EndedFilter, hiddenOnly: hidden === 'only' }, { now: Date.now() }),
    );
  } catch (e) {
    console.error('[sessions] 조회 실패', e instanceof Error ? e.name : 'unknown');
    return json(500, { error: 'internal' });
  }
}
