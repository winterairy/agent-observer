/**
 * 저장소 인터페이스(설계 3절). 수집·상태 계산 코드는 이 인터페이스만 안다.
 * 2단계에 Postgres·Redis 구현으로 바꿀 때 같은 경계를 쓴다.
 */
import type { IncomingEvent, NormalizedEvent, SessionState } from '@/domain/types';

export type Reducer = (s: SessionState | null, ev: NormalizedEvent) => SessionState;

export interface SessionFilter {
  project?: string;
  /** lastEventTs >= sinceTs 인 세션만 */
  sinceTs?: number;
}

export interface Store {
  /** 원자적으로 세션 스냅숏을 갱신하고 이벤트를 보관한다. fn은 순수 reducer. */
  applyEvent(ev: IncomingEvent, fn: Reducer): Promise<SessionState>;
  getSession(key: string): Promise<SessionState | null>;
  listSessions(filter?: SessionFilter): Promise<SessionState[]>;
  listProjects(): Promise<string[]>;
  /** 디버그용, API로 노출 안 함. 도착 순 마지막 limit개 */
  recentEvents(key: string, limit: number): Promise<NormalizedEvent[]>;
  /** "정리": dismissedAtTs 기록. reducer는 새 이벤트에서 null로 되돌린다. 없는 키는 무시 */
  dismiss(key: string, now: number): Promise<void>;
  /** "다시 표시": dismissedAtTs를 null로, restoredAtTs = now. 없는 키는 무시 */
  restore(key: string, now: number): Promise<void>;
  /** D-4: 세션당 최근 500개, 7일 지난 이벤트 삭제(스냅숏은 유지) */
  prune(now: number): Promise<void>;
}
