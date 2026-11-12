/**
 * 저장소 인터페이스 동작(T1-1, 설계 3절). 같은 테스트를 memoryStore와 fileStore로 돌린다.
 */
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { sessionKey } from '@/domain/types';
import { applyEvent } from '@/state/reducer';
import { createFileStore, FileStore } from '@/store/fileStore';
import { createMemoryStore } from '@/store/memoryStore';
import type { Store } from '@/store/Store';
import type { CoreStoreOptions } from '@/store/core';
import { HOUR, T0, inc } from '../helpers/events';

const DAY_MS = 24 * HOUR;

const dirs: string[] = [];
async function tmp(): Promise<string> {
  const d = await mkdtemp(path.join(os.tmpdir(), 'obs-store-'));
  dirs.push(d);
  return d;
}
afterAll(async () => {
  for (const d of dirs) await rm(d, { recursive: true, force: true });
});

const factories: { name: string; make: (opts?: CoreStoreOptions) => Promise<Store> }[] = [
  { name: 'memoryStore', make: async (opts) => createMemoryStore(opts) },
  {
    name: 'fileStore',
    make: async (opts) => createFileStore({ dataDir: await tmp(), pruneIntervalMs: 0, debounceMs: 5, ...opts }),
  },
];

describe.each(factories)('Store 공통 동작 ($name)', ({ make }) => {
  it('applyEvent가 seq를 도착 순으로 부여하고 세션 스냅숏을 돌려준다', async () => {
    const store = await make();
    const a = await store.applyEvent(inc('SessionStart'), applyEvent);
    await store.applyEvent(inc('PreToolUse', { tool: 'Read' }), applyEvent);
    const events = await store.recentEvents(a.key, 10);
    expect(events.map((e) => e.seq)).toEqual([1, 2]);
    const s = await store.getSession(a.key);
    expect(s?.agents.__lead__.status).toBe('working');
  });

  it('돌려준 객체를 바꿔도 저장소 상태는 바뀌지 않는다', async () => {
    const store = await make();
    const s = await store.applyEvent(inc('SessionStart'), applyEvent);
    s.project = 'changed';
    expect((await store.getSession(s.key))?.project).toBe('P1');
  });

  it('reducer가 실패하면 저장소가 바뀌지 않는다', async () => {
    const store = await make();
    await expect(
      store.applyEvent(inc('SessionStart'), () => {
        throw new Error('x');
      }),
    ).rejects.toThrow();
    expect(await store.listSessions()).toEqual([]);
    const s = await store.applyEvent(inc('SessionStart'), applyEvent);
    expect((await store.recentEvents(s.key, 10))[0].seq).toBe(1);
  });

  it('동시에 들어온 이벤트도 직렬로 처리된다', async () => {
    const store = await make();
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        store.applyEvent(inc('PreToolUse', { tool: 'Skill', skill: `k${i % 2}` }), applyEvent),
      ),
    );
    const s = (await store.listSessions())[0];
    expect(s.skills.__lead__.k0.count + s.skills.__lead__.k1.count).toBe(20);
    expect((await store.recentEvents(s.key, 100)).map((e) => e.seq)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it('listSessions는 project·sinceTs로 거르고 listProjects는 정렬된 목록', async () => {
    const store = await make();
    await store.applyEvent(inc('SessionStart', { project: 'P2', at: T0 }), applyEvent);
    await store.applyEvent(inc('SessionStart', { project: 'P1', at: T0 + 1000 }), applyEvent);
    await store.applyEvent(inc('SessionStart', { project: 'P1', session_id: 'S2', at: T0 + 2000 }), applyEvent);
    expect(await store.listProjects()).toEqual(['P1', 'P2']);
    expect((await store.listSessions({ project: 'P1' })).length).toBe(2);
    expect((await store.listSessions({ sinceTs: T0 + 1000 })).length).toBe(2);
    expect((await store.listSessions({ project: 'P2', sinceTs: T0 + 1 })).length).toBe(0);
  });

  it('dismiss·restore: 정리 시각·다시 표시 시각을 기록하고 새 이벤트가 오면 정리가 풀린다', async () => {
    const store = await make();
    const s = await store.applyEvent(inc('SessionStart'), applyEvent);
    await store.dismiss(s.key, T0 + 5);
    expect((await store.getSession(s.key))?.dismissedAtTs).toBe(T0 + 5);
    await store.restore(s.key, T0 + 9);
    const r = await store.getSession(s.key);
    expect(r?.dismissedAtTs).toBeNull();
    expect(r?.restoredAtTs).toBe(T0 + 9);
    await store.dismiss(s.key, T0 + 10);
    await store.applyEvent(inc('UserPromptSubmit', { at: T0 + 20 }), applyEvent);
    expect((await store.getSession(s.key))?.dismissedAtTs).toBeNull();
  });

  it('없는 키의 dismiss·restore는 아무것도 만들지 않는다', async () => {
    const store = await make();
    await store.dismiss('nope', T0);
    await store.restore('nope', T0);
    expect(await store.getSession('nope')).toBeNull();
    expect(await store.listSessions()).toEqual([]);
  });

  it('보관 한도: 세션당 최근 N개만 남기고 스냅숏(스킬)은 유지한다', async () => {
    const store = await make({ limits: { maxEventsPerSession: 5 }, clock: () => T0 });
    for (let i = 0; i < 12; i++) {
      await store.applyEvent(
        inc('PreToolUse', { tool: 'Skill', skill: 'qa-check', at: T0 + i }),
        applyEvent,
      );
    }
    const key = sessionKey('P1', 'S1');
    const events = await store.recentEvents(key, 100);
    expect(events.map((e) => e.seq)).toEqual([8, 9, 10, 11, 12]);
    const s = await store.getSession(key);
    expect(s?.skills.__lead__['qa-check'].count).toBe(12);
  });

  it('prune: 7일 지난 이벤트를 지우고 스냅숏은 남긴다', async () => {
    const store = await make({ clock: () => T0 });
    const s = await store.applyEvent(inc('SessionStart', { at: T0 }), applyEvent);
    await store.applyEvent(inc('Stop', { at: T0 + 6 * DAY_MS }), applyEvent);
    await store.prune(T0 + 7 * DAY_MS + 1);
    expect((await store.recentEvents(s.key, 10)).map((e) => e.event)).toEqual(['Stop']);
    await store.prune(T0 + 14 * DAY_MS);
    expect(await store.recentEvents(s.key, 10)).toEqual([]);
    expect(await store.getSession(s.key)).not.toBeNull();
  });
});

describe('fileStore 파일 동작', () => {
  it('flush 후 새 인스턴스가 같은 상태를 읽는다(재시작 후 유지)', async () => {
    const dataDir = await tmp();
    const a = createFileStore({ dataDir, pruneIntervalMs: 0 });
    await a.applyEvent(inc('SessionStart'), applyEvent);
    await a.applyEvent(inc('PreToolUse', { tool: 'Bash' }), applyEvent);
    await a.close();
    const b = createFileStore({ dataDir, pruneIntervalMs: 0 });
    const s = (await b.listSessions())[0];
    expect(s.agents.__lead__.currentTool).toBe('Bash');
    // seq도 이어진다
    await b.applyEvent(inc('PostToolUse'), applyEvent);
    expect((await b.recentEvents(s.key, 10)).map((e) => e.seq)).toEqual([1, 2, 3]);
    await b.close();
  });

  it('디바운스: 연속 쓰기는 모아서 쓰고 tmp 파일을 남기지 않는다. 파일 권한 0600', async () => {
    const dataDir = await tmp();
    const store = createFileStore({ dataDir, pruneIntervalMs: 0, debounceMs: 20 });
    for (let i = 0; i < 5; i++) await store.applyEvent(inc('PreToolUse', { tool: 'Read' }), applyEvent);
    await new Promise((r) => setTimeout(r, 80));
    const files = await readdir(dataDir);
    expect(files).toContain('state.json');
    expect(files).not.toContain('state.json.tmp');
    const st = await stat(path.join(dataDir, 'state.json'));
    expect(st.mode & 0o777).toBe(0o600);
    const disk = JSON.parse(await readFile(path.join(dataDir, 'state.json'), 'utf8'));
    expect(disk.schemaVersion).toBe(2);
    expect(disk.seq).toBe(5);
    await store.close();
  });

  it('schemaVersion이 다르면 bak으로 옮기고 빈 상태로 시작한다', async () => {
    const dataDir = await tmp();
    await writeFile(path.join(dataDir, 'state.json'), JSON.stringify({ schemaVersion: 99, sessions: {}, events: {} }));
    const log = { warn: vi.fn(), error: vi.fn() };
    const store = createFileStore({ dataDir, pruneIntervalMs: 0, log });
    expect(await store.listSessions()).toEqual([]);
    expect(log.warn).toHaveBeenCalled();
    const files = await readdir(dataDir);
    expect(files.some((f) => f.startsWith('state.json.bak-'))).toBe(true);
    await store.close();
  });

  it('깨진 JSON도 bak으로 옮기고 빈 상태로 시작한다', async () => {
    const dataDir = await tmp();
    await writeFile(path.join(dataDir, 'state.json'), '{not json');
    const log = { warn: vi.fn(), error: vi.fn() };
    const store = createFileStore({ dataDir, pruneIntervalMs: 0, log });
    await store.applyEvent(inc('SessionStart'), applyEvent);
    expect((await store.listSessions()).length).toBe(1);
    await store.close();
  });

  it('lock 파일에 다른 살아 있는 pid가 있으면 경고한다', async () => {
    const dataDir = await tmp();
    // 부모 프로세스(살아 있음)의 pid
    await writeFile(path.join(dataDir, 'lock'), String(process.ppid));
    const log = { warn: vi.fn(), error: vi.fn() };
    const store = createFileStore({ dataDir, pruneIntervalMs: 0, log });
    await store.listSessions();
    expect(log.warn.mock.calls.flat().join(' ')).toContain('다른 프로세스');
    expect((await readFile(path.join(dataDir, 'lock'), 'utf8')).trim()).toBe(String(process.pid));
    await store.close();
  });

  it('FileStore는 Store 인터페이스 구현이다', async () => {
    const store: Store = createFileStore({ dataDir: await tmp(), pruneIntervalMs: 0 });
    expect(store).toBeInstanceOf(FileStore);
    await (store as FileStore).close();
  });
});

