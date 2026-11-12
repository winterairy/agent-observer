/**
 * GET /api/characters/[id]/image — 캐릭터 그림(T1-6, 설계 5절). 쿠키 필요.
 * id는 ^[a-z0-9_-]{1,64}$만, 그림은 characters/<id>/ 안의 png/webp만(resolve 후 접두사 확인).
 */
import fs from 'node:fs/promises';
import { requireSession } from '@/auth/session';
import { CHARACTER_ID_RE, loadCharacter } from '@/characters/roles';
import { json } from '@/http/response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TYPES: Record<string, string> = { png: 'image/png', webp: 'image/webp' };

function notFound(): Response {
  return json(404, { error: 'not_found' });
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const denied = await requireSession(req);
  if (denied) return denied;
  const { id } = await ctx.params;
  if (!CHARACTER_ID_RE.test(id)) return notFound();
  try {
    const c = loadCharacter(id);
    if (!c.ok) return notFound();
    const ext = c.imagePath.slice(c.imagePath.lastIndexOf('.') + 1).toLowerCase();
    const type = TYPES[ext];
    if (!type) return notFound();
    const body = await fs.readFile(c.imagePath);
    return new Response(new Uint8Array(body), {
      status: 200,
      headers: { 'Content-Type': type, 'Cache-Control': 'private, max-age=60', 'X-Content-Type-Options': 'nosniff' },
    });
  } catch (e) {
    console.error('[characters] 그림 읽기 실패', e instanceof Error ? e.name : 'unknown');
    return notFound();
  }
}
