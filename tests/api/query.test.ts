/**
 * T1-5 조회 API 수용 기준(API 부분)과 T1-2 정리·다시 표시. route handler를 직접 호출한다.
 * memoryStore와 fileStore(임시 폴더) 두 구현으로 같은 테스트를 돌린다.
 * 시각은 Date.now를 고정해 시간 초과·24시간 기준을 기다리지 않고 검증한다.
 */
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as PROJECTS } from '../../app/api/projects/route';
import { GET as SESSIONS } from '../../app/api/sessions/route';
import { GET as SESSION } from '../../app/api/sessions/[key]/route';
import { POST as DISMISS } from '../../app/api/sessions/[key]/dismiss/route';
import { POST as RESTORE } from '../../app/api/sessions/[key]/restore/route';
import { GET as SKILLS } from '../../app/api/skills/route';
import { sessionKey, type EventName, type NormalizedEvent } from '@/domain/types';
import { applyEvent } from '@/state/reducer';
import { getStore, resetStoreForTests } from '@/store';
import { FileStore } from '@/store/fileStore';
import { HOUR, MIN, T0, inc } from '../helpers/events';
import { PASSWORD, SECRET, get, login, post, setAuthEnv } from '../helpers/auth';

const TOKEN = `collect-${Math.random().toString(36).slice(2)}-0123456789`;
const A1 = 'agent-qa-1';
const tmpDirs: string[] = [];

const kinds = [
  { name: 'memoryStore', async setup() { process.env.OBSERVER_STORE = 'memory'; delete process.env.OBSERVER_DATA_DIR; } },
  {
    name: 'fileStore',
    async setup() {
      const dir = await mkdtemp(path.join(os.tmpdir(), 'obs-query-'));
      tmpDirs.push(dir);
      process.env.OBSERVER_STORE = 'file';
      process.env.OBSERVER_DATA_DIR = dir;
    },
  },
] as const;

afterAll(async () => {
  for (const d of tmpDirs) await rm(d, { recursive: true, force: true });
});

let now = T0;
function at(ms: number): void {
  now = ms;
}

async function send(event: EventName, over: Partial<NormalizedEvent> & { at?: number } = {}): Promise<string> {
  const s = await getStore().applyEvent(inc(event, { at: now, ...over }), applyEvent);
  return s.key;
}

function params(key: string): { params: Promise<{ key: string }> } {
  return { params: Promise.resolve({ key }) };
}

describe.each(kinds)('조회 API ($name)', (kind) => {
  let cookie = '';

  beforeEach(async () => {
    await kind.setup();
    process.env.OBSERVER_TOKEN = TOKEN;
    setAuthEnv({ secret: SECRET });
    resetStoreForTests();
    now = T0;
    cookie = await login();
    vi.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    const store = getStore();
    if (store instanceof FileStore) await store.close();
    resetStoreForTests();
  });

  async function sessions(query = ''): Promise<{ now: string; hiddenCount: number; sessions: Record<string, unknown>[] }> {
    const res = await SESSIONS(get(`/api/sessions${query}`, { cookie }));
    expect(res.status).toBe(200);
    return res.json();
  }

  async function detail(key: string): Promise<{ session: Record<string, unknown>; agents: Record<string, unknown>[] } & Record<string, unknown>> {
    const res = await SESSION(get(`/api/sessions/${key}`, { cookie }), params(key));
    expect(res.status).toBe(200);
    return res.json();
  }

  it('프로젝트 필터 P1을 고르면 P2 세션이 빠진다', async () => {
    await send('PreToolUse', { project: 'P1', tool: 'Read' });
    await send('PreToolUse', { project: 'P2', tool: 'Read' });
    expect((await sessions()).sessions.map((s) => s.project).sort()).toEqual(['P1', 'P2']);
    const p1 = await sessions('?project=P1');
    expect(p1.sessions.map((s) => s.project)).toEqual(['P1']);
    const res = await PROJECTS(get('/api/projects', { cookie }));
    expect(await res.json()).toEqual({
      projects: [
        { project: 'P1', sessions: 1, active: 1 },
        { project: 'P2', sessions: 1, active: 1 },
      ],
    });
  });

  it('세션 목록 항목 필드(설계 5절)', async () => {
    const key = await send('PreToolUse', { tool: 'Bash', remote: true, branch: 'feat' });
    const body = await sessions();
    expect(body.now).toBe(new Date(T0).toISOString());
    expect(body.hiddenCount).toBe(0);
    expect(body.sessions[0]).toEqual({
      key,
      sessionId: 'S1',
      project: 'P1',
      branch: 'feat',
      remote: true,
      status: 'working',
      waitingSince: null,
      stale: false,
      lastEventAt: new Date(T0).toISOString(),
      dismissedAt: null,
      agentCount: 1,
      waitingCount: 0,
    });
  });

  it('S-05 뒤 세션 상세에 lead와 qa가 보이고 qa는 완료다(토큰·비용 필드 없음)', async () => {
    const steps: [EventName, Partial<NormalizedEvent>][] = [
      ['SessionStart', { model: 'claude-haiku-5-5' }],
      ['UserPromptSubmit', {}],
      ['PreToolUse', { tool: 'Agent', subagent_type: 'qa' }],
      ['SubagentStart', { agent_id: A1, agent_type: 'qa' }],
      ['PreToolUse', { agent_id: A1, agent_type: 'qa', tool: 'Skill', skill: 'playwright-cli' }],
      ['PostToolUse', { agent_id: A1, agent_type: 'qa', tool: 'Skill' }],
      ['SubagentStop', { agent_id: A1, agent_type: 'qa' }],
      ['PostToolUse', { tool: 'Agent' }],
      ['Stop', {}],
    ];
    let key = '';
    for (const [i, [e, over]] of steps.entries()) key = await send(e, { at: T0 + i * 1000, ...over });
    at(T0 + 20_000);
    const d = await detail(key);
    expect(d.agents.map((a) => [a.agentKey, a.role, a.displayName, a.status])).toEqual([
      ['__lead__', 'lead', '책임자', 'done'],
      [A1, 'qa', 'qa', 'done'],
    ]);
    expect(d.agents[0]).toMatchObject({ agentId: null, currentTool: null, waitingSince: null, stale: false, calledAgents: [{ subagentType: 'qa', count: 1 }] });
    expect(d.agents[1].skills).toEqual([{ skill: 'playwright-cli', count: 1, lastAt: new Date(T0 + 4000).toISOString() }]);
    expect(d.session).toMatchObject({ key, status: 'done', model: 'claude-haiku-5-5', endedByEvent: false, agentCount: 2 });
    // 2026-11-11 범위 변경: 토큰·API 환산 비용 필드는 응답에 넣지 않는다
    for (const k of ['pricing', 'totals']) {
      expect(d).not.toHaveProperty(k);
      expect(d.session).not.toHaveProperty(k);
    }
    for (const a of d.agents) {
      expect(a).not.toHaveProperty('usage');
      expect(a).not.toHaveProperty('cost');
    }
    expect((await sessions()).sessions[0]).not.toHaveProperty('totals');
  });

  it('작업 중 에이전트는 현재 도구, 10분 넘으면 종료로 보이고 도구는 null', async () => {
    const key = await send('PreToolUse', { tool: 'Bash' });
    expect((await detail(key)).agents[0]).toMatchObject({ status: 'working', currentTool: 'Bash' });
    at(T0 + 10 * MIN + 1000);
    expect((await detail(key)).agents[0]).toMatchObject({ status: 'ended', currentTool: null });
  });

  it('승인 대기 세션이 맨 위에 오고, 기다린 시간이 긴 순이다', async () => {
    await send('PreToolUse', { session_id: 'busy', tool: 'Read', at: T0 + 30 * MIN });
    await send('Notification', { session_id: 'w-short', notification_type: 'permission_prompt', at: T0 + 20 * MIN });
    await send('Notification', { session_id: 'w-long', notification_type: 'permission_prompt', at: T0 });
    await send('Stop', { session_id: 'idle', at: T0 + 31 * MIN });
    at(T0 + 35 * MIN);
    const list = (await sessions()).sessions;
    expect(list.map((s) => s.sessionId)).toEqual(['w-long', 'w-short', 'idle', 'busy']);
    expect(list[0]).toMatchObject({ status: 'waiting', waitingSince: new Date(T0).toISOString(), stale: false, waitingCount: 1 });
  });

  it('승인 대기 중 다른 알림이 와도 기다린 시간은 첫 알림 기준이다(S-11b)', async () => {
    const key = await send('Notification', { notification_type: 'permission_prompt' });
    at(T0 + 30 * MIN);
    await send('Notification', { notification_type: 'idle_prompt' });
    const d = await detail(key);
    expect(d.agents[0]).toMatchObject({ status: 'waiting', waitingSince: new Date(T0).toISOString() });
  });

  it('24시간 넘은 승인 대기는 stale(응답 없음)이고 종료가 아니다', async () => {
    const key = await send('Notification', { notification_type: 'permission_prompt' });
    at(T0 + 24 * HOUR - MIN);
    expect((await sessions()).sessions[0]).toMatchObject({ status: 'waiting', stale: false });
    at(T0 + 24 * HOUR + MIN);
    expect((await sessions()).sessions[0]).toMatchObject({ status: 'waiting', stale: true });
    expect((await detail(key)).agents[0]).toMatchObject({ status: 'waiting', stale: true });
    // S-11c: 재개하면 stale이 사라진다
    await send('PostToolUse', { tool: 'Bash' });
    expect((await sessions()).sessions[0]).toMatchObject({ status: 'thinking', stale: false, waitingSince: null });
  });

  it('ended=recent는 종료 세션을 24시간만, none은 빼고, all은 모두', async () => {
    await send('SessionEnd', { session_id: 'old', at: T0 });
    await send('SessionEnd', { session_id: 'new', at: T0 + 2 * HOUR });
    await send('PreToolUse', { session_id: 'live', tool: 'Read', at: T0 + 25 * HOUR });
    at(T0 + 25 * HOUR);
    expect((await sessions()).sessions.map((s) => s.sessionId)).toEqual(['live', 'new']);
    expect((await sessions('?ended=none')).sessions.map((s) => s.sessionId)).toEqual(['live']);
    expect((await sessions('?ended=all')).sessions.map((s) => s.sessionId)).toEqual(['live', 'new', 'old']);
    const bad = await SESSIONS(get('/api/sessions?ended=bogus', { cookie }));
    expect(bad.status).toBe(400);
    expect((await SESSIONS(get('/api/sessions?hidden=yes', { cookie }))).status).toBe(400);
  });

  it('정리하면 목록에서 사라지고 hiddenCount가 늘며, 새 이벤트가 오면 다시 보인다', async () => {
    const key = await send('PreToolUse', { tool: 'Read' });
    await send('PreToolUse', { session_id: 'other', project: 'P2', tool: 'Read' });
    const res = await DISMISS(post(`/api/sessions/${key}/dismiss`, { cookie, origin: 'http://127.0.0.1:3000' }), params(key));
    expect(res.status).toBe(204);
    const after = await sessions();
    expect(after.sessions.map((s) => s.key)).not.toContain(key);
    expect(after.hiddenCount).toBe(1);
    expect((await sessions('?project=P2')).hiddenCount).toBe(0);
    expect((await sessions('?project=P1')).hiddenCount).toBe(1);
    // ended=all이면 숨긴 세션도 포함
    const all = await sessions('?ended=all');
    expect(all.sessions.find((s) => s.key === key)?.dismissedAt).toBe(new Date(T0).toISOString());
    at(T0 + MIN);
    await send('PostToolUse', { tool: 'Read' });
    const back = await sessions();
    expect(back.sessions.map((s) => s.key)).toContain(key);
    expect(back.hiddenCount).toBe(0);
  });

  it('숨긴 세션은 hidden=only로 보이고(종료 세션·24시간 지난 것 포함), 다시 표시하면 원래 목록으로 돌아온다', async () => {
    const key = await send('SessionEnd', { at: T0 });
    await DISMISS(post(`/api/sessions/${key}/dismiss`, { cookie }), params(key));
    at(T0 + 3 * 24 * HOUR);
    const hidden = await sessions('?hidden=only');
    expect(hidden.sessions.map((s) => s.key)).toEqual([key]);
    expect(hidden.sessions[0].status).toBe('ended');
    expect(hidden.hiddenCount).toBe(1);
    expect((await sessions('?hidden=only&project=P2')).sessions).toEqual([]);

    const res = await RESTORE(post(`/api/sessions/${key}/restore`, { cookie }), params(key));
    expect(res.status).toBe(204);
    expect((await sessions('?hidden=only')).sessions).toEqual([]);
    const list = await sessions();
    expect(list.hiddenCount).toBe(0);
    // 이미 끝난 지 3일 된 세션도 다시 표시한 때부터 24시간 보인다
    expect(list.sessions.map((s) => s.key)).toEqual([key]);
    at(T0 + 4 * 24 * HOUR - MIN);
    expect((await sessions()).sessions.map((s) => s.key)).toEqual([key]);
    at(T0 + 4 * 24 * HOUR + MIN);
    expect((await sessions()).sessions).toEqual([]);
  });

  it('없는 키의 상세·정리·다시 표시는 404', async () => {
    const key = sessionKey('P1', 'nope');
    expect((await SESSION(get(`/api/sessions/${key}`, { cookie }), params(key))).status).toBe(404);
    const d = await DISMISS(post(`/api/sessions/${key}/dismiss`, { cookie }), params(key));
    expect(d.status).toBe(404);
    expect(await d.json()).toMatchObject({ error: 'not_found' });
    expect((await RESTORE(post(`/api/sessions/${key}/restore`, { cookie }), params(key))).status).toBe(404);
  });

  it('정리·다시 표시는 Origin이 다른 호스트면 403이고 상태가 바뀌지 않는다', async () => {
    const key = await send('PreToolUse', { tool: 'Read' });
    const evil = { cookie, origin: 'http://evil.test' };
    expect((await DISMISS(post(`/api/sessions/${key}/dismiss`, evil), params(key))).status).toBe(403);
    expect((await sessions()).hiddenCount).toBe(0);
    await DISMISS(post(`/api/sessions/${key}/dismiss`, { cookie }), params(key));
    expect((await RESTORE(post(`/api/sessions/${key}/restore`, evil), params(key))).status).toBe(403);
    expect((await sessions()).hiddenCount).toBe(1);
  });

  it('스킬 기록: 같은 스킬 2번, 다른 스킬 1번 → 2, 1. project·session 필터', async () => {
    const key = await send('PreToolUse', { tool: 'Skill', skill: 'a' });
    await send('PreToolUse', { tool: 'Skill', skill: 'a', agent_id: A1, agent_type: 'qa' });
    await send('PreToolUse', { tool: 'Skill', skill: 'b' });
    const k2 = await send('PreToolUse', { session_id: 'S2', project: 'P2', tool: 'Skill', skill: 'c' });
    const all = await (await SKILLS(get('/api/skills', { cookie }))).json();
    expect(all.skills.map((s: { skill: string; count: number }) => [s.skill, s.count])).toEqual([['a', 2], ['b', 1], ['c', 1]]);
    expect(all.skills[0]).toEqual({ skill: 'a', count: 2, byRole: { lead: 1, qa: 1 }, lastAt: new Date(T0).toISOString() });
    const p1 = await (await SKILLS(get('/api/skills?project=P1', { cookie }))).json();
    expect(p1.skills.map((s: { skill: string }) => s.skill)).toEqual(['a', 'b']);
    const s2 = await (await SKILLS(get(`/api/skills?session=${k2}`, { cookie }))).json();
    expect(s2.skills.map((s: { skill: string }) => s.skill)).toEqual(['c']);
    expect(key).not.toBe(k2);
  });

  it('조회 API 응답에 토큰·비밀번호·쿠키 비밀값이 없다', async () => {
    const key = await send('PreToolUse', { tool: 'Skill', skill: 'a' });
    const cookieValue = cookie.split('=')[1];
    const bodies = await Promise.all([
      PROJECTS(get('/api/projects', { cookie })),
      SESSIONS(get('/api/sessions?ended=all', { cookie })),
      SESSION(get(`/api/sessions/${key}`, { cookie }), params(key)),
      SKILLS(get('/api/skills', { cookie })),
    ]);
    for (const r of bodies) {
      expect(r.status).toBe(200);
      expect(r.headers.get('set-cookie')).toBeNull();
      const text = await r.text();
      for (const secret of [TOKEN, PASSWORD, SECRET, cookieValue]) expect(text).not.toContain(secret);
    }
  });
});

describe('쿠키 없이 부르면 401(설계 15절 이중 방어)', () => {
  beforeEach(() => {
    process.env.OBSERVER_STORE = 'memory';
    resetStoreForTests();
    setAuthEnv();
  });

  afterEach(() => resetStoreForTests());

  const key = sessionKey('P1', 'S1');
  type H = Record<string, string>;
  const cases: [string, (h: H) => Promise<Response>][] = [
    ['GET /api/projects', (h) => PROJECTS(get('/api/projects', h))],
    ['GET /api/sessions', (h) => SESSIONS(get('/api/sessions', h))],
    ['GET /api/sessions?hidden=only', (h) => SESSIONS(get('/api/sessions?hidden=only', h))],
    ['GET /api/sessions/[key]', (h) => SESSION(get(`/api/sessions/${key}`, h), params(key))],
    ['GET /api/skills', (h) => SKILLS(get('/api/skills', h))],
    ['POST /api/sessions/[key]/dismiss', (h) => DISMISS(post(`/api/sessions/${key}/dismiss`, h), params(key))],
    ['POST /api/sessions/[key]/restore', (h) => RESTORE(post(`/api/sessions/${key}/restore`, h), params(key))],
  ];

  it.each(cases)('%s: 쿠키 없음, Bearer 헤더만 있음 → 모두 401', async (_n, call) => {
    process.env.OBSERVER_TOKEN = TOKEN;
    await getStore().applyEvent(inc('PreToolUse', { tool: 'Read' }), applyEvent);
    const headerSets: H[] = [{}, { authorization: `Bearer ${TOKEN}` }, { cookie: 'obs_session=forged' }];
    for (const h of headerSets) {
      const res = await call(h);
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'unauthorized', message: '로그인이 필요합니다' });
    }
    expect((await getStore().getSession(key))?.dismissedAtTs).toBeNull();
  });

  it.todo('GET /api/characters (T1-6, 개발 3차에서 route와 함께 추가)');
  it.todo('GET /api/characters/[id]/image (T1-6, 개발 3차에서 route와 함께 추가)');
});
