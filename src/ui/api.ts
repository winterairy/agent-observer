/** 화면용 fetch 도우미. 401이면 로그인 화면으로 보낸다(명세 4.3). 데이터 가져오기 라이브러리는 쓰지 않는다(설계 8절). */
export class Unauthorized extends Error {}
export class HttpError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
  }
}

export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', credentials: 'same-origin', signal });
  if (res.status === 401) throw new Unauthorized();
  if (!res.ok) throw new HttpError(res.status);
  return (await res.json()) as T;
}

export async function postEmpty(url: string): Promise<number> {
  const res = await fetch(url, { method: 'POST', credentials: 'same-origin' });
  if (res.status === 401) throw new Unauthorized();
  return res.status;
}

export function goLogin(): void {
  const next = window.location.pathname + window.location.search;
  window.location.assign(next && next !== '/' ? `/login?next=${encodeURIComponent(next)}` : '/login');
}
