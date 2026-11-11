/** POST /api/sessions/[key]/restore (T1-2·T1-5, 설계 5절). 쿠키 필요, Origin 같은 호스트만. 204, 없는 키 404. */
import { methodNotAllowed } from '@/http/response';
import { hideAction } from '@/query/hide';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function POST(req: Request, ctx: { params: Promise<{ key: string }> }): Promise<Response> {
  return hideAction(req, ctx.params, 'restore');
}

const notAllowed = methodNotAllowed('POST');
export const GET = notAllowed;
export const PUT = notAllowed;
export const PATCH = notAllowed;
export const DELETE = notAllowed;
