/**
 * POST /api/plan-usage/report, GET /api/plan-usage (T1-8 서버 수용 기준, 설계 6.6 API).
 * memoryStore와 fileStore(임시 폴더) 두 구현으로 같은 테스트를 돌린다. route handler를 직접 호출한다.
 * 값은 테스트 안에서 만든 것이며 실제 수집 데이터가 아니다.
 */
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { NextRequest } from 'next/server';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as REPORT_GET, POST as REPORT, PUT as REPORT_PUT } from '../../app/api/plan-usage/report/route';
import { GET as VIEW, POST as VIEW_POST } from '../../app/api/plan-usage/route';
import { proxy } from '../../proxy';
import { getStore, resetStoreForTests } from '@/store';
import { FileStore } from '@/store/fileStore';
import { BASE, SECRET, get, login, setAuthEnv } from '../helpers/auth';

const TOKEN = `plan-${Math.random().toString(36).slice(2)}-0123456789`;
const REPORT_URL = `${BASE}/api/plan-usage/report`;
const NOW = Date.parse('2026-11-11T10:00:00.000Z');
/** 15:00:00 UTC (epoch 초) */
const R5 = Date.parse('2026-11-11T15:00:00.000Z') / 1000;
const R7 = Date.parse('2026-11-15T00:00:00.000Z') / 1000;

const tmpDirs: string[] = [];
async function tmp(): Promise<string> {
  const d = await mkdtemp(path.join(os.tmpdir(), 'obs-plan-'));
  tmpDirs.push(d);
  return d;
}
afterAll(async () => {
  for (const d of tmpDirs) await rm(d, { recursive: true, force: true });
});

const kinds = [
  { name: 'memoryStore', async setup() { process.env.OBSERVER_STORE = 'memory'; delete process.env.OBSERVER_DATA_DIR; } },
  {
    name: 'fileStore',
    async setup() {
      process.env.OBSERVER_STORE = 'file';
      process.env.OBSERVER_DATA_DIR = await tmp();
    },
  },
] as const;

type Win = { used_percentage: unknown; resets_at: unknown } | null | undefined;

function body(rl: { five_hour?: Win; seven_day?: Win } & Record<string, unknown>, over: Record<string, unknown> = {}) {
  return { v: 1, ts: new Date(NOW).toISOString(), remote: false, rate_limits: rl, ...over };
}

function report(b: unknown, headers: Record<string, string> = {}): Promise<Response> {
  const text = typeof b === 'string' ? b : JSON.stringify(b);
  return REPORT(
    new Request(REPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}`, ...headers },
      body: text,
    }),
  );
}

let now = NOW;

describe.each(kinds)('플랜 사용량 API ($name)', (kind) => {
  let cookie = '';

  beforeEach(async () => {
    await kind.setup();
    process.env.OBSERVER_TOKEN = TOKEN;
    setAuthEnv({ secret: SECRET });
    resetStoreForTests();
    now = NOW;
    cookie = await login();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    const store = getStore();
    if (store instanceof FileStore) await store.close();
    resetStoreForTests();
  });

  async function view(): Promise<{ now: string; windows: Record<string, Record<string, unknown>> }> {
    const res = await VIEW(get('/api/plan-usage', { cookie }));
    expect(res.status).toBe(200);
    return res.json();
  }

  async function seed(): Promise<void> {
    const res = await report(body({ five_hour: { used_percentage: 42, resets_at: R5 }, seven_day: { used_percentage: 13, resets_at: R7 } }));
    expect(res.status).toBe(202);
  }

  const seeded = () => getStore().getPlanUsage();

  it('처음엔 두 창 모두 none이다', async () => {
    expect(await view()).toEqual({ now: new Date(NOW).toISOString(), windows: { five_hour: { status: 'none' }, seven_day: { status: 'none' } } });
  });

  it('five_hour 42% / seven_day 13%를 보내면 202이고 GET이 같은 값·resetsAt·receivedAt을 돌려준다', async () => {
    now = NOW + 1300;
    const res = await report(body({ five_hour: { used_percentage: 42, resets_at: R5 }, seven_day: { used_percentage: 13, resets_at: R7 } }));
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ ok: true });
    now = NOW + 3000;
    const v = await view();
    expect(v.now).toBe(new Date(NOW + 3000).toISOString());
    expect(v.windows.five_hour).toEqual({
      status: 'ok',
      usedPercentage: 42,
      level: 'normal',
      resetsAt: '2026-11-11T15:00:00.000Z',
      resetsAtEpoch: R5,
      receivedAt: '2026-11-11T10:00:01.300Z',
      remote: false,
    });
    expect(v.windows.seven_day).toMatchObject({ status: 'ok', usedPercentage: 13, resetsAtEpoch: R7, receivedAt: '2026-11-11T10:00:01.300Z' });
    expect(JSON.stringify(v)).not.toContain('staleAfterSec');
  });

  it('remote: true로 보내면 remote가 true로 보인다', async () => {
    await report(body({ five_hour: { used_percentage: 5, resets_at: R5 } }, { remote: true }));
    expect((await view()).windows.five_hour.remote).toBe(true);
  });

  it('Authorization 헤더가 없으면 401 unauthorized, 저장값 그대로', async () => {
    await seed();
    const before = await seeded();
    const res = await REPORT(new Request(REPORT_URL, { method: 'POST', body: JSON.stringify(body({ five_hour: { used_percentage: 99, resets_at: R5 } })) }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
    expect(await seeded()).toEqual(before);
  });

  it.each([
    ['다른 토큰', `Bearer ${TOKEN}x`],
    ['Bearer 접두사 없음', TOKEN],
  ])('토큰이 틀리면(%s) 401 unauthorized, 저장값 그대로', async (_n, header) => {
    await seed();
    const before = await seeded();
    const res = await report(body({ five_hour: { used_percentage: 99, resets_at: R5 } }), { Authorization: header });
    expect(res.status).toBe(401);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: 'unauthorized' });
    expect(text).not.toContain(TOKEN);
    expect(await seeded()).toEqual(before);
  });

  it.each([
    ['비어 있음', ''],
    ['16자 미만', 'short-token'],
  ])('서버 토큰이 %s이면 401 server_token_invalid, 저장값 그대로', async (_n, serverToken) => {
    await seed();
    const before = await seeded();
    process.env.OBSERVER_TOKEN = serverToken;
    const res = await report(body({ five_hour: { used_percentage: 99, resets_at: R5 } }), { Authorization: `Bearer ${serverToken}` });
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('server_token_invalid');
    expect(await seeded()).toEqual(before);
  });

  it('쿠키만 있고 Bearer가 없으면 POST 401', async () => {
    const res = await REPORT(
      new Request(REPORT_URL, { method: 'POST', headers: { cookie }, body: JSON.stringify(body({ five_hour: { used_percentage: 1, resets_at: R5 } })) }),
    );
    expect(res.status).toBe(401);
    expect((await seeded()).five_hour).toBeNull();
  });

  it.each([
    ['used_percentage -1', body({ five_hour: { used_percentage: -1, resets_at: R5 } }), 'rate_limits.five_hour.used_percentage'],
    ['used_percentage 101', body({ five_hour: { used_percentage: 101, resets_at: R5 } }), 'rate_limits.five_hour.used_percentage'],
    ['used_percentage 문자열', body({ five_hour: { used_percentage: '42', resets_at: R5 } }), 'rate_limits.five_hour.used_percentage'],
    ['resets_at 소수', body({ seven_day: { used_percentage: 1, resets_at: 1.5 } }), 'rate_limits.seven_day.resets_at'],
    ['resets_at 0', body({ seven_day: { used_percentage: 1, resets_at: 0 } }), 'rate_limits.seven_day.resets_at'],
    ['resets_at 밀리초 값', body({ seven_day: { used_percentage: 1, resets_at: R7 * 1000 } }), 'rate_limits.seven_day.resets_at'],
    ['창 0개', body({}), 'rate_limits'],
    ['spend_limit만 있음', body({ spend_limit: { used: 3 } }), 'rate_limits'],
    ['v가 2', body({ five_hour: { used_percentage: 1, resets_at: R5 } }, { v: 2 }), 'v'],
  ])('%s이면 400이고 저장값 그대로', async (_n, b, issue) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await seed();
    const before = await seeded();
    const res = await report(b);
    expect(res.status).toBe(400);
    const j = await res.json();
    expect(j.error).toBe('invalid_payload');
    expect(j.issues).toContain(issue);
    expect(await seeded()).toEqual(before);
  });

  it('JSON이 아닌 본문은 400', async () => {
    const res = await report('not json');
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_payload');
  });

  it('본문이 16KB를 넘으면 413이고 저장 안 됨', async () => {
    const big = JSON.stringify(body({ five_hour: { used_percentage: 1, resets_at: R5 } }, { pad: 'x'.repeat(17 * 1024) }));
    const res = await report(big, { 'Content-Length': String(Buffer.byteLength(big)) });
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: 'payload_too_large' });
    expect((await seeded()).five_hour).toBeNull();
  });

  it('POST 외 메서드는 405(수집), GET 외 메서드는 405(조회)', async () => {
    for (const r of [REPORT_GET(), REPORT_PUT()]) {
      expect(r.status).toBe(405);
      expect(r.headers.get('allow')).toBe('POST');
    }
    const v = VIEW_POST();
    expect(v.status).toBe(405);
    expect(v.headers.get('allow')).toBe('GET');
  });

  it('five_hour만 보내면 seven_day 저장값은 그대로다', async () => {
    await seed();
    now = NOW + 60_000;
    await report(body({ five_hour: { used_percentage: 50, resets_at: R5 } }));
    const v = await view();
    expect(v.windows.five_hour).toMatchObject({ usedPercentage: 50, receivedAt: new Date(NOW + 60_000).toISOString() });
    expect(v.windows.seven_day).toMatchObject({ usedPercentage: 13, receivedAt: new Date(NOW).toISOString() });
  });

  it('D-27 순서: 15:00:00/42% → 15:00:03/38%는 42%, 60초 넘게 늦은 5%는 새 창, 옛 창 값은 무시하되 수신 시각 갱신', async () => {
    await report(body({ five_hour: { used_percentage: 42, resets_at: R5 } }));
    now += 1000;
    await report(body({ five_hour: { used_percentage: 38, resets_at: R5 + 3 } }));
    expect((await view()).windows.five_hour).toMatchObject({ usedPercentage: 42, resetsAtEpoch: R5 + 3 });

    now += 1000;
    await report(body({ five_hour: { used_percentage: 5, resets_at: R5 + 3 + 61 } }));
    expect((await view()).windows.five_hour).toMatchObject({ usedPercentage: 5, resetsAtEpoch: R5 + 64 });

    now += 1000;
    await report(body({ five_hour: { used_percentage: 90, resets_at: R5 } }));
    expect((await view()).windows.five_hour).toMatchObject({
      usedPercentage: 5,
      resetsAtEpoch: R5 + 64,
      receivedAt: new Date(now).toISOString(),
    });
  });

  it('동시에 온 같은 창 보고 5개는 순서와 관계없이 가장 큰 값이 남는다', async () => {
    const pcts = [42, 38, 50, 12, 47];
    const res = await Promise.all(pcts.map((p, i) => report(body({ five_hour: { used_percentage: p, resets_at: R5 + i } }))));
    expect(res.every((r) => r.status === 202)).toBe(true);
    expect((await view()).windows.five_hour).toMatchObject({ usedPercentage: 50, resetsAtEpoch: R5 + 4 });
  });

  it('resets_at이 지나면 expired(level null), 새 값이 오면 다시 ok', async () => {
    await seed();
    now = R5 * 1000;
    expect((await view()).windows.five_hour).toMatchObject({ status: 'expired', level: null, usedPercentage: 42 });
    await report(body({ five_hour: { used_percentage: 3, resets_at: R5 + 5 * 3600 } }));
    expect((await view()).windows.five_hour).toMatchObject({ status: 'ok', level: 'normal', usedPercentage: 3 });
  });

  it.each([
    [80, 'near'],
    [100, 'reached'],
  ])('%s%%를 보내면 level %s', async (pct, level) => {
    await report(body({ seven_day: { used_percentage: pct, resets_at: R7 } }));
    expect((await view()).windows.seven_day).toMatchObject({ status: 'ok', level });
  });

  it('쿠키 없이 GET 401, Bearer만으로 GET 401', async () => {
    expect((await VIEW(get('/api/plan-usage'))).status).toBe(401);
    expect((await VIEW(get('/api/plan-usage', { Authorization: `Bearer ${TOKEN}` }))).status).toBe(401);
  });

  it('저장 실패는 500 internal이고 스택이 나오지 않는다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(getStore(), 'applyPlanUsage').mockRejectedValue(new Error('boom /secret/path'));
    const res = await report(body({ five_hour: { used_percentage: 1, resets_at: R5 } }));
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: 'internal' });
    expect(text).not.toContain('boom');
  });

  if (kind.name === 'fileStore') {
    it('저장 → close() → 같은 폴더로 새 인스턴스 → GET 값 유지', async () => {
      await seed();
      await (getStore() as FileStore).close();
      resetStoreForTests();
      const v = await view();
      expect(v.windows.five_hour).toMatchObject({ status: 'ok', usedPercentage: 42, resetsAtEpoch: R5, receivedAt: new Date(NOW).toISOString() });
      expect(v.windows.seven_day).toMatchObject({ usedPercentage: 13 });
    });

    it('schemaVersion 1 state.json(usage 포함)은 변환하지 않고 bak으로 옮겨 빈 상태로 시작한다', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      await (getStore() as FileStore).close();
      resetStoreForTests();
      const dir = process.env.OBSERVER_DATA_DIR!;
      const v1 = {
        schemaVersion: 1,
        seq: 1,
        sessions: {
          k1: {
            key: 'k1', sessionId: 'S1', project: 'P1', branch: null, remote: false, remoteSessionId: null, model: null,
            ended: false, dismissedAtTs: null, restoredAtTs: null, lastEventTs: NOW, skills: {}, agentCalls: {},
            agents: { __lead__: { agentId: null, agentType: null, status: 'done', currentTool: null, waitingSinceTs: null, lastEventTs: NOW, lastSeq: 1, firstSeenTs: NOW,
              usage: { input: 1, output: 2, cache_creation: 3, cache_read: 4, model: null, messages: 1 } } },
          },
        },
        events: {},
      };
      await writeFile(path.join(dir, 'state.json'), JSON.stringify(v1));
      const store = getStore() as FileStore;
      expect(await store.listSessions()).toEqual([]);
      expect(await view()).toMatchObject({ windows: { five_hour: { status: 'none' }, seven_day: { status: 'none' } } });
      const files = await readdir(dir);
      expect(files.some((f) => f.startsWith('state.json.bak-'))).toBe(true);
      await store.applyPlanUsage({ remote: false, windows: {} }, NOW, (p) => p); // 쓰기를 한 번 일으킨다
      await store.flush();
      const fresh = await readFile(path.join(dir, 'state.json'), 'utf8');
      expect(JSON.parse(fresh).schemaVersion).toBe(2);
      expect(fresh).not.toContain('usage');
    });
  }
});

describe('proxy 보호 범위(플랜 사용량)', () => {
  beforeEach(() => setAuthEnv({ secret: SECRET }));

  it('/api/plan-usage/report는 쿠키 없이 통과하고 /api/plan-usage는 401', async () => {
    const pass = await proxy(new NextRequest(REPORT_URL, { method: 'POST' }));
    expect(pass.status).toBe(200);
    expect(pass.headers.get('x-middleware-next')).toBe('1');
    const denied = await proxy(new NextRequest(`${BASE}/api/plan-usage`));
    expect(denied.status).toBe(401);
  });
});
