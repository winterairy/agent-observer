/**
 * POST /api/events — 수집 API(T1-1, 설계 5절). 인증은 Bearer 토큰만.
 * 처리 순서: 메서드 → Bearer → 크기(Content-Length, 스트림 16KB) → JSON → zod 검증 → 저장.
 * 응답·로그에 토큰 값, payload 값, 스택을 넣지 않는다.
 */
import { checkBearer, SERVER_TOKEN_INVALID_MESSAGE } from '@/auth/token';
import { ingest } from '@/collect/ingest';
import { config } from '@/config';
import { getStore } from '@/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

class TooLarge extends Error {}

/** 본문을 최대 max 바이트까지만 읽는다. 넘으면 TooLarge */
async function readLimited(req: Request, max: number): Promise<Uint8Array> {
  if (!req.body) return new Uint8Array();
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => undefined);
      throw new TooLarge();
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out;
}

export async function POST(req: Request): Promise<Response> {
  const auth = checkBearer(req.headers.get('authorization'), process.env.OBSERVER_TOKEN);
  if (auth === 'server_token_invalid') {
    return json(401, { error: 'server_token_invalid', message: SERVER_TOKEN_INVALID_MESSAGE });
  }
  if (auth !== 'ok') return json(401, { error: 'unauthorized' });

  const declared = req.headers.get('content-length');
  if (declared !== null && Number(declared) > config.maxBodyBytes) {
    return json(413, { error: 'payload_too_large' });
  }

  let raw: unknown;
  try {
    const bytes = await readLimited(req, config.maxBodyBytes);
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    raw = JSON.parse(text);
  } catch (e) {
    if (e instanceof TooLarge) return json(413, { error: 'payload_too_large' });
    return json(400, { error: 'invalid_payload', message: '본문이 JSON이 아닙니다', issues: [] });
  }

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

function methodNotAllowed(_req?: Request): Response {
  return json(405, { error: 'method_not_allowed', message: 'POST만 허용합니다' }, { Allow: 'POST' });
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
