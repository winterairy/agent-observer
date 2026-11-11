/**
 * route handler 공통 응답 도우미(설계 5절 공통 규칙).
 * 오류 형식 `{ error, message }`. 스택·토큰·비밀번호·내부 경로를 넣지 않는다.
 */

export function json(status: number, body: unknown, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
}

export function noContent(headers?: Record<string, string>): Response {
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store', ...headers } });
}

export function methodNotAllowed(allow: string): (_req?: Request) => Response {
  return () => json(405, { error: 'method_not_allowed', message: `${allow}만 허용합니다` }, { Allow: allow });
}

export class TooLarge extends Error {}

/** 본문을 최대 max 바이트까지만 읽는다. 넘으면 TooLarge */
export async function readLimited(req: Request, max: number): Promise<Uint8Array> {
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
