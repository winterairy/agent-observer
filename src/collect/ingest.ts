/**
 * 수집 유스케이스: 검증된 이벤트를 저장소에 적용한다(설계 9절 수집 3).
 * Store 인터페이스만 알고 구현(memory/file/DB)은 모른다.
 */
import { parsePayload } from '@/collect/schema';
import type { SessionState } from '@/domain/types';
import { applyEvent } from '@/state/reducer';
import type { Store } from '@/store/Store';

export type IngestResult =
  | { ok: true; session: SessionState }
  | { ok: false; issues: string[] };

export async function ingest(store: Store, raw: unknown, now: number): Promise<IngestResult> {
  const parsed = parsePayload(raw, now);
  if (!parsed.ok) return parsed;
  const session = await store.applyEvent(parsed.event, applyEvent);
  return { ok: true, session };
}
