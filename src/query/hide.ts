/**
 * "정리"(dismiss)·"다시 표시"(restore) route 공통 처리(T1-2, 설계 5절).
 * 순서: 쿠키(401) → Origin(403) → 없는 키(404) → 저장소 갱신 → 204.
 */
import { checkSameOrigin, requireSession } from '@/auth/session';
import { json, noContent } from '@/http/response';
import { getStore } from '@/store';

export async function hideAction(
  req: Request,
  params: Promise<{ key: string }>,
  action: 'dismiss' | 'restore',
): Promise<Response> {
  const denied = (await requireSession(req)) ?? checkSameOrigin(req);
  if (denied) return denied;
  const { key } = await params;
  try {
    const store = getStore();
    if (!(await store.getSession(key))) return json(404, { error: 'not_found', message: '세션이 없습니다' });
    await store[action](key, Date.now());
    return noContent();
  } catch (e) {
    console.error(`[${action}] 실패`, e instanceof Error ? e.name : 'unknown');
    return json(500, { error: 'internal' });
  }
}
