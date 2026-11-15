/**
 * POST /api/events — 수집 API(T1-1, 설계 5절). 인증은 Bearer 토큰만.
 * 처리 순서: 메서드 → Bearer → 크기(Content-Length, 스트림 16KB) → JSON → zod 검증 → 저장.
 * 응답·로그에 토큰 값, payload 값, 스택을 넣지 않는다.
 */
import { ingest } from '@/collect/ingest';
import { readCollectBody } from '@/http/collect';
import { json, methodNotAllowed as notAllowed } from '@/http/response';
import { getStore } from '@/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<Response> {
  const body = await readCollectBody(req);
  if (!body.ok) return body.response;
  const raw = body.raw;

  try {
    const result = await ingest(getStore(), raw, Date.now());
    if (!result.ok) {
      // 값은 남기지 않고 필드 경로만
      console.warn(`[events] 검증 실패: ${result.issues.join(', ')}`);
      return json(400, { error: 'invalid_payload', message: 'payload 형식이 맞지 않습니다', issues: result.issues });
    }
    return json(202, { ok: true, session: result.session.key });
  } catch (e) {
    console.error('[events] 저장 실패', e instanceof Error ? e.name : 'unknown');
    return json(500, { error: 'internal' });
  }
}

const methodNotAllowed = notAllowed('POST');

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
