/**
 * SEC-01 회귀: `__proto__`·`constructor`·`prototype`을 agent_id·agent_type·skill·subagent_type·session_id·project·
 * dismiss/restore key로 보내도 Object.prototype이 오염되지 않고, 다른 요청이 정상이며, 값은 그대로 저장된다.
 * memoryStore와 fileStore(다시 읽기 포함) 모두 확인한다.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { POST as EVENTS } from '../../app/api/events/route';
import { POST as LOGIN } from '../../app/api/auth/login/route';
import { GET as SESSIONS } from '../../app/api/sessions/route';
import { GET as SESSION } from '../../app/api/sessions/[key]/route';
import { POST as DISMISS } from '../../app/api/sessions/[key]/dismiss/route';
import { POST as RESTORE } from '../../app/api/sessions/[key]/restore/route';
import { GET as SKILLS } from '../../app/api/skills/route';
import { sessionKey } from '@/domain/types';
import { getStore, resetStoreForTests } from '@/store';
import { FileStore } from '@/store/fileStore';
import { PASSWORD, SECRET, get, login, loginRequest, post, setAuthEnv } from '../helpers/auth';

const TOKEN = `proto-${Math.random().toString(36).slice(2)}-0123456789`;
const BAD = ['__proto__', 'constructor', 'prototype'] as const;
const tmpDirs: string[] = [];
const protoKeysBefore = Object.getOwnPropertyNames(Object.prototype).sort();

const kinds = [
  { name: 'memoryStore', async setup() { process.env.OBSERVER_STORE = 'memory'; delete process.env.OBSERVER_DATA_DIR; } },
  {
    name: 'fileStore',
    async setup() {
      const dir = await mkdtemp(path.join(os.tmpdir(), 'obs-proto-'));
      tmpDirs.push(dir);
      process.env.OBSERVER_STORE = 'file';
      process.env.OBSERVER_DATA_DIR = dir;
    },
  },
] as const;

afterAll(async () => {
  for (const d of tmpDirs) await rm(d, { recursive: true, force: true });
});

function sendEvent(over: Record<string, unknown>): Promise<Response> {
  const body = { v: 1, event: 'PreToolUse', ts: new Date().toISOString(), session_id: 's1', project: 'P', ...over };
  return EVENTS(
    new Request('http://127.0.0.1:3000/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(body),
    }),
  );
}

const params = (key: string) => ({ params: Promise.resolve({ key }) });

function expectNoPollution(): void {
  const probe = {} as Record<string, unknown>;
  for (const f of ['status', 'lastEventTs', 'count', 'lastTs', 'dismissedAtTs', 'restoredAtTs', 'agentType', 'get', 'polluted']) {
    expect(probe[f]).toBeUndefined();
  }
  expect(Object.getOwnPropertyNames(Object.prototype).sort()).toEqual(protoKeysBefore);
  expect(Object.getPrototypeOf({})).toBe(Object.prototype);
  expect(typeof Object.prototype.constructor).toBe('function');
}

describe.each(kinds)('SEC-01 프로토타입 키 ($name)', (kind) => {
  beforeEach(async () => {
    await kind.setup();
    process.env.OBSERVER_TOKEN = TOKEN;
    setAuthEnv({ secret: SECRET });
    resetStoreForTests();
  });

  afterEach(async () => {
    const store = getStore();
    if (store instanceof FileStore) await store.close();
    resetStoreForTests();
  });

  it.each(BAD)('%s 값을 모든 키 필드로 보내도 오염 없이 저장되고 다른 요청이 정상', async (bad) => {
    // 에이전트 키·스킬·세션
    expect((await sendEvent({ agent_id: bad, agent_type: bad, tool: 'Skill', skill: bad })).status).toBe(202);
    // 리드의 스킬·BOT 호출(키 __lead__ 아래 bad)
    expect((await sendEvent({ tool: 'Skill', skill: bad })).status).toBe(202);
    expect((await sendEvent({ tool: 'Agent', subagent_type: bad })).status).toBe(202);
    expect((await sendEvent({ agent_id: bad, tool: 'Agent', subagent_type: bad })).status).toBe(202);
    // session_id·project 자체
    expect((await sendEvent({ session_id: bad, project: bad, agent_id: bad, tool: bad })).status).toBe(202);
    expectNoPollution();

    const cookie = await login();
    // 경로 key로 직접(존재하지 않는 세션)
    expect((await DISMISS(post(`/api/sessions/${bad}/dismiss`, { cookie, origin: 'http://127.0.0.1:3000' }), params(bad))).status).toBeLessThan(500);
    expect((await RESTORE(post(`/api/sessions/${bad}/restore`, { cookie, origin: 'http://127.0.0.1:3000' }), params(bad))).status).toBeLessThan(500);
    expect((await SESSION(get(`/api/sessions/${bad}`, { cookie }), params(bad))).status).toBe(404);
    expectNoPollution();

    // 다른 요청 정상
    expect((await LOGIN(loginRequest(PASSWORD))).status).toBe(204);
    const list = await SESSIONS(get('/api/sessions', { cookie }));
    expect(list.status).toBe(200);
    const body = (await list.json()) as { sessions: { key: string }[] };
    expect(body.sessions.map((s) => s.key).sort()).toEqual([sessionKey('P', 's1'), sessionKey(bad, bad)].sort());

    // 값이 그대로 저장됐다
    const s = await getStore().getSession(sessionKey('P', 's1'));
    expect(s && Object.hasOwn(s.agents, bad)).toBe(true);
    expect(s!.agents[bad].agentType).toBe(bad);
    expect(s!.skills[bad][bad].count).toBe(1);
    expect(s!.skills.__lead__[bad].count).toBe(1);
    expect(s!.agentCalls.__lead__[bad]).toBe(1);
    expect(s!.agentCalls[bad][bad]).toBe(1);

    const detail = await SESSION(get(`/api/sessions/${sessionKey('P', 's1')}`, { cookie }), params(sessionKey('P', 's1')));
    expect(detail.status).toBe(200);
    const skills = await SKILLS(get('/api/skills', { cookie }));
    expect(skills.status).toBe(200);
    expect(JSON.stringify(await skills.json())).toContain(bad);
    expectNoPollution();

    // fileStore: 다시 읽어도 같은 값이고 오염 없음
    const store = getStore();
    if (store instanceof FileStore) {
      await store.close();
      resetStoreForTests();
      const again = await getStore().getSession(sessionKey('P', 's1'));
      expect(again!.skills[bad][bad].count).toBe(1);
      expect(again!.agentCalls.__lead__[bad]).toBe(1);
      expect(await getStore().getSession(bad)).toBeNull();
      expectNoPollution();
    }
  });
});
