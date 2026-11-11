/** 테스트용 이벤트 생성 도우미. 실제 토큰·수집 데이터는 쓰지 않는다. */
import type { EventName, IncomingEvent, NormalizedEvent, SessionState, Usage } from '@/domain/types';
import { applyEvent } from '@/state/reducer';

export const T0 = Date.parse('2026-11-11T10:00:00.000Z');
export const SEC = 1000;
export const MIN = 60 * SEC;
export const HOUR = 60 * MIN;

let seq = 0;

export function ev(
  event: EventName,
  over: Partial<NormalizedEvent> & { at?: number } = {},
): NormalizedEvent {
  const { at, ...rest } = over;
  const tsMs = at ?? rest.tsMs ?? T0;
  return {
    v: 1,
    event,
    ts: new Date(tsMs).toISOString(),
    tsMs,
    seq: ++seq,
    session_id: 'S1',
    agent_id: null,
    agent_type: null,
    project: 'P1',
    branch: 'main',
    remote: false,
    remote_session_id: null,
    ...rest,
  };
}

export function usage(p: Partial<Usage> = {}): Usage {
  return { input: 0, output: 0, cache_creation: 0, cache_read: 0, model: null, messages: 0, ...p };
}

/** 이벤트를 차례로 적용하고 각 단계의 세션을 돌려준다 */
export function run(events: NormalizedEvent[], start: SessionState | null = null): SessionState[] {
  const out: SessionState[] = [];
  let s = start;
  for (const e of events) {
    s = applyEvent(s, e);
    out.push(s);
  }
  return out;
}

export function last<T>(xs: T[]): T {
  return xs[xs.length - 1];
}

/** 저장소에 넘기는 이벤트(seq 없음) */
export function inc(event: EventName, over: Partial<NormalizedEvent> & { at?: number } = {}): IncomingEvent {
  const { seq: _seq, ...rest } = ev(event, over);
  return rest;
}
