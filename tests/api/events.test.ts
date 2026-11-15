/**
 * POST /api/events (T1-1 수용 기준). 같은 테스트를 memoryStore와 fileStore(임시 폴더)로 돌린다.
 * route handler를 직접 호출한다(서버 없음).
 */
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, GET, PATCH, POST, PUT } from '../../app/api/events/route';
import { sessionKey } from '@/domain/types';
import { getStore, resetStoreForTests } from '@/store';
import { FileStore } from '@/store/fileStore';

// 테스트 안에서 만든 값. 실제 토큰이 아니다
const TOKEN = `test-token-${Math.random().toString(36).slice(2)}-0123456789`;
const URL_ = 'http://127.0.0.1:3000/api/events';

function payload(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    v: 1,
    event: 'PreToolUse',
    ts: new Date().toISOString(),
    session_id: 'sess-1',
    agent_id: null,
    agent_type: null,
    project: 'P1',
    branch: 'main',
    remote: false,
    remote_session_id: null,
    tool: 'Read',
    ...over,
  };
}

function post(body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return POST(
    new Request(URL_, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}`, ...headers },
      body: text,
    }),
  );
}

async function sessionCount(): Promise<number> {
  return (await getStore().listSessions()).length;
}

const tmpDirs: string[] = [];

const kinds = [
  {
    name: 'memoryStore',
    async setup() {
      process.env.OBSERVER_STORE = 'memory';
      delete process.env.OBSERVER_DATA_DIR;
    },
  },
  {
    name: 'fileStore',
    async setup() {
      const dir = await mkdtemp(path.join(os.tmpdir(), 'obs-api-'));
      tmpDirs.push(dir);
      process.env.OBSERVER_STORE = 'file';
      process.env.OBSERVER_DATA_DIR = dir;
    },
  },
] as const;

afterAll(async () => {
  for (const d of tmpDirs) await rm(d, { recursive: true, force: true });
});

/** 저장된 데이터 전체를 문자열로(fileStore는 디스크 파일까지) */
async function storedText(): Promise<string> {
  const store = getStore();
  const sessions = await store.listSessions();
  const events = await Promise.all(sessions.map((s) => store.recentEvents(s.key, 1000)));
  let text = JSON.stringify({ sessions, events });
  if (store instanceof FileStore) {
    await store.flush();
    text += await readFile(path.join(store.dataDir, 'state.json'), 'utf8');
  }
  return text;
}

describe.each(kinds)('POST /api/events ($name)', (kind) => {
  beforeEach(async () => {
    await kind.setup();
    process.env.OBSERVER_TOKEN = TOKEN;
    resetStoreForTests();
  });

  afterEach(async () => {
    const store = getStore();
    if (store instanceof FileStore) await store.close();
    resetStoreForTests();
    vi.restoreAllMocks();
  });

  it('올바른 토큰과 payload면 202이고 이벤트가 저장된다', async () => {
    const res = await post(payload());
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body).toEqual({ ok: true, session: sessionKey('P1', 'sess-1') });
    const s = await getStore().getSession(body.session);
    expect(s?.agents.__lead__.status).toBe('working');
    expect(s?.agents.__lead__.currentTool).toBe('Read');
    const events = await getStore().recentEvents(body.session, 10);
    expect(events).toHaveLength(1);
    expect(events[0].seq).toBe(1);
  });

  it('Authorization 헤더가 없으면 401 unauthorized, 저장 안 됨', async () => {
    const res = await POST(new Request(URL_, { method: 'POST', body: JSON.stringify(payload()) }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthorized' });
    expect(await sessionCount()).toBe(0);
  });

  it.each([
    ['다른 토큰', `Bearer ${TOKEN}x`],
    ['같은 길이 다른 토큰', `Bearer ${'z'.repeat(TOKEN.length)}`],
    ['Bearer 접두사 없음', TOKEN],
    ['다른 방식', `Basic ${TOKEN}`],
  ])('토큰이 틀리면(%s) 401 unauthorized만 오고 저장 안 됨', async (_n, header) => {
    const res = await post(payload(), { Authorization: header });
    expect(res.status).toBe(401);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: 'unauthorized' });
    expect(text).not.toContain(TOKEN);
    expect(await sessionCount()).toBe(0);
  });

  it.each([
    ['미설정', undefined],
    ['빈 문자열', ''],
    ['15자', 'a'.repeat(15)],
  ])('서버 OBSERVER_TOKEN이 %s이면 어떤 토큰이든 401 server_token_invalid', async (_n, serverToken) => {
    if (serverToken === undefined) delete process.env.OBSERVER_TOKEN;
    else process.env.OBSERVER_TOKEN = serverToken;
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const auth of [`Bearer ${serverToken ?? ''}`, `Bearer ${TOKEN}`, undefined]) {
      const headers: Record<string, string> = auth === undefined ? {} : { Authorization: auth };
      const res = await POST(new Request(URL_, { method: 'POST', headers, body: JSON.stringify(payload()) }));
      expect(res.status).toBe(401);
      const text = await res.text();
      const body = JSON.parse(text);
      expect(body.error).toBe('server_token_invalid');
      expect(body.message).toContain('16자보다 짧');
      if (serverToken) expect(text).not.toContain(serverToken);
      expect(text).not.toContain(TOKEN);
    }
    const logged = JSON.stringify([...log.mock.calls, ...err.mock.calls]);
    expect(logged).not.toContain(TOKEN);
    if (serverToken) expect(logged).not.toContain(serverToken);
    expect(await sessionCount()).toBe(0);
  });

  it('16자 서버 토큰은 유효하다', async () => {
    process.env.OBSERVER_TOKEN = 'b'.repeat(16);
    const res = await post(payload(), { Authorization: `Bearer ${'b'.repeat(16)}` });
    expect(res.status).toBe(202);
  });

  it('ts가 서버 시각보다 5분 넘게 미래면 서버 시각으로 바뀌어 저장된다', async () => {
    const before = Date.now();
    const future = new Date(before + 10 * 60_000).toISOString();
    const res = await post(payload({ ts: future }));
    expect(res.status).toBe(202);
    const after = Date.now();
    const [e] = await getStore().recentEvents(sessionKey('P1', 'sess-1'), 1);
    expect(e.ts).not.toBe(future);
    expect(e.tsMs).toBeGreaterThanOrEqual(before);
    expect(e.tsMs).toBeLessThanOrEqual(after);
    expect(Date.parse(e.ts)).toBe(e.tsMs);
  });

  it('5분 이내 미래 ts는 그대로 둔다', async () => {
    const near = new Date(Date.now() + 60_000).toISOString();
    await post(payload({ ts: near }));
    const [e] = await getStore().recentEvents(sessionKey('P1', 'sess-1'), 1);
    expect(e.ts).toBe(near);
  });

  it.each([
    ['v가 2', { v: 2 }, 'v'],
    ['v 없음', { v: undefined }, 'v'],
    ['event가 목록에 없음', { event: 'Unknown' }, 'event'],
    ['ts 없음', { ts: undefined }, 'ts'],
    ['ts 형식 틀림', { ts: '11/11/2026' }, 'ts'],
    ['ts가 날짜 아님', { ts: '2026-13-45Tzz' }, 'ts'],
    ['session_id 없음', { session_id: undefined }, 'session_id'],
    ['session_id 빈 문자열', { session_id: '' }, 'session_id'],
    ['session_id 숫자', { session_id: 12 }, 'session_id'],
    ['project 없음', { project: undefined }, 'project'],
    ['문자열 257자', { tool: 'x'.repeat(257) }, 'tool'],
    ['remote가 문자열', { remote: 'yes' }, 'remote'],
    ['agent_id가 숫자', { agent_id: 3 }, 'agent_id'],
  ])('%s이면 400이고 저장 안 됨', async (_n, over, issue) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await post(payload(over));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid_payload');
    expect(body.issues).toContain(issue);
    expect(await sessionCount()).toBe(0);
  });

  it.each([
    ['usage.output 음수', { usage: { input: 0, output: -1, cache_creation: 0, cache_read: 0, model: null, messages: 0 } }],
    ['usage.input 소수', { usage: { input: 1.5, output: 0, cache_creation: 0, cache_read: 0, model: null, messages: 0 } }],
    ['usage가 문자열', { usage: 'MARK-USAGE-STR' }],
  ])('%s여도 202이고 usage가 저장되지 않는다(D-21)', async (_n, over) => {
    const res = await post(payload(over));
    expect(res.status).toBe(202);
    const [e] = await getStore().recentEvents(sessionKey('P1', 'sess-1'), 1);
    expect(e).not.toHaveProperty('usage');
    const text = await storedText();
    expect(text).not.toContain('"usage"');
    expect(text).not.toContain('MARK-USAGE');
  });

  it.each([
    ['agent_id 없음', { agent_type: 'qa', status: null, usage: { input: 0, output: 0, cache_creation: 0, cache_read: 0, model: null, messages: 0 } }],
    ['agent_id 있음', { agent_id: 'MARK-SUB-A9', agent_type: 'qa', status: 'completed', usage: { input: 1, output: 2, cache_creation: 3, cache_read: 4, model: null, messages: 1 } }],
    ['문자열', 'MARK-SUB-STR'],
    ['숫자', 42],
  ])('subagent가 %s이어도 202이고 subagent 키가 없으며 서브에이전트가 생기지 않는다', async (_n, subagent) => {
    const res = await post(payload({ event: 'PostToolUse', tool: 'Agent', subagent }));
    expect(res.status).toBe(202);
    const [e] = await getStore().recentEvents(sessionKey('P1', 'sess-1'), 1);
    expect(e).not.toHaveProperty('subagent');
    const s = await getStore().getSession(sessionKey('P1', 'sess-1'));
    expect(Object.keys(s!.agents)).toEqual(['__lead__']);
    const text = await storedText();
    expect(text).not.toContain('"subagent"');
    expect(text).not.toContain('MARK-SUB');
  });

  it('검증 실패 응답·로그에 값이 아니라 경로만 나온다', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const secret = 'S3CRET-PROMPT-TEXT';
    const res = await post(payload({ tool: `${secret}${'x'.repeat(300)}` }));
    expect(res.status).toBe(400);
    expect(await res.text()).not.toContain(secret);
    expect(JSON.stringify(warn.mock.calls)).not.toContain(secret);
  });

  it.each([
    ['JSON 아님', 'not json'],
    ['잘린 JSON', '{"v":1,'],
    ['빈 본문', ''],
  ])('%s 본문은 400', async (_n, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_payload');
    expect(await sessionCount()).toBe(0);
  });

  it('JSON 배열·숫자도 400', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect((await post('[1,2]')).status).toBe(400);
    expect((await post('42')).status).toBe(400);
  });

  it('본문이 16KB를 넘으면 413이고 저장 안 됨(Content-Length 있음)', async () => {
    const big = JSON.stringify(payload({ pad: 'x'.repeat(17 * 1024) }));
    const res = await post(big, { 'Content-Length': String(Buffer.byteLength(big)) });
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: 'payload_too_large' });
    expect(await sessionCount()).toBe(0);
  });

  it('Content-Length 없이 스트림으로 16KB를 넘어도 413', async () => {
    const big = new TextEncoder().encode(JSON.stringify(payload({ pad: 'x'.repeat(17 * 1024) })));
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        for (let i = 0; i < big.length; i += 1024) c.enqueue(big.slice(i, i + 1024));
        c.close();
      },
    });
    const req = new Request(URL_, {
      method: 'POST',
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: stream,
      // @ts-expect-error Node fetch의 스트림 본문 옵션
      duplex: 'half',
    });
    expect(req.headers.get('content-length')).toBeNull();
    const res = await POST(req);
    expect(res.status).toBe(413);
    expect(await sessionCount()).toBe(0);
  });

  it('16KB 이하 본문은 받는다(정의 안 된 큰 필드는 버림)', async () => {
    const body = JSON.stringify(payload({ pad: 'x'.repeat(15 * 1024) }));
    expect(Buffer.byteLength(body)).toBeLessThanOrEqual(16 * 1024);
    const res = await post(body);
    expect(res.status).toBe(202);
  });

  it('prompt·tool_input 등 정의 안 된 필드는 저장된 데이터 어디에도 없다', async () => {
    const marks = {
      prompt: 'MARK-PROMPT-1111',
      tool_input: { command: 'MARK-TOOLINPUT-2222' },
      tool_response: { stdout: 'MARK-TOOLRESP-3333' },
      message: 'MARK-MESSAGE-4444',
      transcript_path: '/home/MARK-PATH-5555',
    };
    const res = await post(
      payload({
        ...marks,
        tool: 'Skill',
        skill: 'playwright-cli',
        usage: { input: 1, output: 2, cache_creation: 3, cache_read: 4, model: 'claude-haiku-5-5', messages: 1, extra: 'MARK-USAGE-6666' },
      }),
    );
    expect(res.status).toBe(202);
    const text = await storedText();
    for (const m of ['MARK-PROMPT', 'MARK-TOOLINPUT', 'MARK-TOOLRESP', 'MARK-MESSAGE', 'MARK-PATH', 'MARK-USAGE']) {
      expect(text).not.toContain(m);
    }
    for (const k of ['"prompt"', '"tool_input"', '"tool_response"', '"transcript_path"', '"extra"']) {
      expect(text).not.toContain(k);
    }
    const [e] = await getStore().recentEvents(sessionKey('P1', 'sess-1'), 1);
    expect(e.skill).toBe('playwright-cli');
    expect(e).not.toHaveProperty('usage');
    for (const k of ['"usage"', '"cache_read"', '"cache_creation"', '"messages"']) {
      expect(text).not.toContain(k);
    }
  });

  it('subagent.usage가 든 PostToolUse(Agent)도 토큰 수가 저장되지 않는다', async () => {
    const res = await post(
      payload({
        event: 'PostToolUse',
        tool: 'Agent',
        subagent_type: 'qa',
        usage: { input: 1, output: 2, cache_creation: 3, cache_read: 4, model: 'claude-haiku-5-5', messages: 1 },
        subagent: {
          agent_id: 'a-sub-1',
          agent_type: 'qa',
          status: 'completed',
          usage: { input: 5, output: 6, cache_creation: 7, cache_read: 8, model: 'claude-haiku-5-5', messages: 2 },
        },
      }),
    );
    expect(res.status).toBe(202);
    const text = await storedText();
    for (const k of ['"usage"', '"subagent"', '"cache_read"', '"cache_creation"', '"messages"', 'a-sub-1']) {
      expect(text).not.toContain(k);
    }
  });

  it('command 필드(UserPromptExpansion)는 원본 이벤트에 저장된다', async () => {
    await post(payload({ event: 'UserPromptExpansion', tool: undefined, command: 'task' }));
    const [e] = await getStore().recentEvents(sessionKey('P1', 'sess-1'), 1);
    expect(e.command).toBe('task');
  });

  it('project가 빈 문자열이면 (unknown)으로 저장한다', async () => {
    const res = await post(payload({ project: '' }));
    expect((await res.json()).session).toBe(sessionKey('(unknown)', 'sess-1'));
    expect(await getStore().listProjects()).toEqual(['(unknown)']);
  });

  it('저장 실패는 500 internal이고 스택이 나오지 않는다', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const store = getStore();
    vi.spyOn(store, 'applyEvent').mockRejectedValue(new Error('boom /secret/path at line 1'));
    const res = await post(payload());
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: 'internal' });
    expect(text).not.toContain('boom');
    expect(text).not.toContain(TOKEN);
    expect(err).toHaveBeenCalled();
  });

  it.each([
    ['GET', GET],
    ['PUT', PUT],
    ['PATCH', PATCH],
    ['DELETE', DELETE],
  ])('%s는 405이고 Allow: POST', async (method, handler) => {
    const res = await handler(new Request(URL_, { method }));
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
    expect(await sessionCount()).toBe(0);
  });

  it('S-14: 같은 이벤트를 다른 project로 보내면 세션이 따로 생긴다', async () => {
    await post(payload({ project: 'P1' }));
    await post(payload({ project: 'P2' }));
    const sessions = await getStore().listSessions();
    expect(sessions.map((s) => s.project).sort()).toEqual(['P1', 'P2']);
    expect((await getStore().listSessions({ project: 'P1' })).map((s) => s.key)).toEqual([sessionKey('P1', 'sess-1')]);
  });
});
