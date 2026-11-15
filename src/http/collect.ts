/**
 * 수집 API 공통 앞단(설계 5절 POST /api/events 처리 순서 ②~④, 6.3 "같은 helper").
 * Bearer → 크기(Content-Length, 스트림 16KB) → JSON. 쿠키는 보지 않는다.
 * 응답·로그에 토큰 값, 본문 값, 스택을 넣지 않는다.
 */
import { checkBearer, SERVER_TOKEN_INVALID_MESSAGE } from '@/auth/token';
import { config } from '@/config';
import { json, readLimited, TooLarge } from '@/http/response';

export type CollectBody = { ok: true; raw: unknown } | { ok: false; response: Response };

export async function readCollectBody(req: Request): Promise<CollectBody> {
  const auth = checkBearer(req.headers.get('authorization'), process.env.OBSERVER_TOKEN);
  if (auth === 'server_token_invalid') {
    return { ok: false, response: json(401, { error: 'server_token_invalid', message: SERVER_TOKEN_INVALID_MESSAGE }) };
  }
  if (auth !== 'ok') return { ok: false, response: json(401, { error: 'unauthorized' }) };

  const declared = req.headers.get('content-length');
  if (declared !== null && Number(declared) > config.maxBodyBytes) {
    return { ok: false, response: json(413, { error: 'payload_too_large' }) };
  }

  try {
    const bytes = await readLimited(req, config.maxBodyBytes);
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { ok: true, raw: JSON.parse(text) };
  } catch (e) {
    if (e instanceof TooLarge) return { ok: false, response: json(413, { error: 'payload_too_large' }) };
    return { ok: false, response: json(400, { error: 'invalid_payload', message: '본문이 JSON이 아닙니다', issues: [] }) };
  }
}
