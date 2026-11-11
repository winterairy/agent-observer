/**
 * memoryStore·fileStore가 함께 쓰는 메모리 상태와 연산.
 * 모든 연산은 Promise 체인 뮤텍스로 직렬화한다(설계 3절).
 */
import { config } from '@/config';
import { sessionKey, type IncomingEvent, type NormalizedEvent, type SessionState } from '@/domain/types';
import type { Reducer, SessionFilter, Store } from '@/store/Store';

export const SCHEMA_VERSION = 1;

export interface StoreData {
  schemaVersion: number;
  seq: number;
  sessions: Record<string, SessionState>;
  events: Record<string, NormalizedEvent[]>;
}

export function emptyData(): StoreData {
  return { schemaVersion: SCHEMA_VERSION, seq: 0, sessions: {}, events: {} };
}

export interface RetentionLimits {
  maxEventsPerSession: number;
  eventRetentionMs: number;
}

export interface CoreStoreOptions {
  limits?: Partial<RetentionLimits>;
  /** 이벤트 보관 기준 시각(쓰기 때 해당 세션 prune). 테스트에서 주입 */
  clock?: () => number;
}

/** D-4: 기간이 지난 이벤트를 지우고 최근 N개만 남긴다 */
export function pruneEvents(list: NormalizedEvent[], now: number, limits: RetentionLimits): NormalizedEvent[] {
  const cutoff = now - limits.eventRetentionMs;
  const kept = list.filter((e) => e.tsMs >= cutoff);
  return kept.length > limits.maxEventsPerSession ? kept.slice(kept.length - limits.maxEventsPerSession) : kept;
}

/** 직렬 실행 큐 */
export class Mutex {
  private tail: Promise<unknown> = Promise.resolve();
  run<T>(fn: () => T | Promise<T>): Promise<T> {
    const next = this.tail.then(fn, fn);
    this.tail = next.catch(() => undefined);
    return next;
  }
}

export abstract class CoreStore implements Store {
  protected data: StoreData = emptyData();
  protected readonly mutex = new Mutex();
  protected readonly limits: RetentionLimits;
  protected readonly clock: () => number;

  constructor(opts: CoreStoreOptions = {}) {
    this.limits = {
      maxEventsPerSession: opts.limits?.maxEventsPerSession ?? config.maxEventsPerSession,
      eventRetentionMs: opts.limits?.eventRetentionMs ?? config.eventRetentionMs,
    };
    this.clock = opts.clock ?? Date.now;
  }

  /** 데이터 준비(fileStore는 파일 읽기) */
  protected abstract ready(): Promise<void>;
  /** 변경 후 호출(fileStore는 디스크 쓰기 예약) */
  protected abstract changed(): void;

  private async write<T>(fn: () => T): Promise<T> {
    await this.ready();
    return this.mutex.run(() => {
      const r = fn();
      this.changed();
      return r;
    });
  }

  private async read<T>(fn: () => T): Promise<T> {
    await this.ready();
    // 읽기도 큐에 넣어 진행 중인 쓰기 뒤에 보이게 한다
    return this.mutex.run(fn);
  }

  applyEvent(ev: IncomingEvent, fn: Reducer): Promise<SessionState> {
    return this.write(() => {
      const full: NormalizedEvent = { ...ev, seq: this.data.seq + 1 };
      const key = sessionKey(ev.project, ev.session_id);
      const prev = this.data.sessions[key];
      // reducer가 실패하면 seq·상태를 바꾸지 않는다
      const next = fn(prev ? structuredClone(prev) : null, full);
      this.data.seq = full.seq;
      this.data.sessions[next.key] = next;
      const list = this.data.events[next.key] ?? [];
      list.push(full);
      this.data.events[next.key] = pruneEvents(list, this.clock(), this.limits);
      return structuredClone(next);
    });
  }

  getSession(key: string): Promise<SessionState | null> {
    return this.read(() => {
      const s = this.data.sessions[key];
      return s ? structuredClone(s) : null;
    });
  }

  listSessions(filter: SessionFilter = {}): Promise<SessionState[]> {
    return this.read(() =>
      Object.values(this.data.sessions)
        .filter((s) => filter.project === undefined || s.project === filter.project)
        .filter((s) => filter.sinceTs === undefined || s.lastEventTs >= filter.sinceTs)
        .map((s) => structuredClone(s)),
    );
  }

  listProjects(): Promise<string[]> {
    return this.read(() => [...new Set(Object.values(this.data.sessions).map((s) => s.project))].sort());
  }

  recentEvents(key: string, limit: number): Promise<NormalizedEvent[]> {
    return this.read(() => {
      const list = this.data.events[key] ?? [];
      return structuredClone(list.slice(Math.max(0, list.length - limit)));
    });
  }

  dismiss(key: string, now: number): Promise<void> {
    return this.write(() => {
      const s = this.data.sessions[key];
      if (s) s.dismissedAtTs = now;
    });
  }

  restore(key: string, now: number): Promise<void> {
    return this.write(() => {
      const s = this.data.sessions[key];
      if (!s) return;
      s.dismissedAtTs = null;
      s.restoredAtTs = now;
    });
  }

  prune(now: number): Promise<void> {
    return this.write(() => this.pruneAll(now));
  }

  protected pruneAll(now: number): void {
    for (const key of Object.keys(this.data.events)) {
      const kept = pruneEvents(this.data.events[key], now, this.limits);
      if (kept.length) this.data.events[key] = kept;
      else delete this.data.events[key];
    }
  }
}
