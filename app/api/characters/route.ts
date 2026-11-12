/** GET /api/characters — 역할·캐릭터 설정(T1-6, 설계 5·7절). 쿠키 필요. 오류 원인은 서버 로그에만. */
import { requireSession } from '@/auth/session';
import { charactersView } from '@/characters/roles';
import { json } from '@/http/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const denied = await requireSession(req);
  if (denied) return denied;
  try {
    return json(200, charactersView());
  } catch (e) {
    console.error('[characters] 조회 실패', e instanceof Error ? e.name : 'unknown');
    return json(500, { error: 'internal' });
  }
}
