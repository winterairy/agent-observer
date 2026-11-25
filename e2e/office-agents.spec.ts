/**
 * LIVE-04(R12a·R14): 실제 서버에 ts를 과거로 보내 만든다(서버 시계는 바꾸지 않는다).
 * 내부 에이전트(SubagentStop만 옴)는 BOT 수에 안 잡히고, 끝난 지 60초가 지난 BOT은 상세에서 빠진다.
 */
import { expect, test, type APIRequestContext } from '@playwright/test';
import { BASE, apiLogin, postEvent } from './helpers';

const P = 'winterairy/live-agents';
const SID = 'la000000-0000-live';

const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

interface Detail {
  session: { agentCount: number; model: string | null };
  agents: { agentKey: string; status: string }[];
  hiddenAgentCount: number;
}

async function detail(request: APIRequestContext): Promise<Detail> {
  const list = await (await request.get(`${BASE}/api/sessions?project=${encodeURIComponent(P)}`)).json();
  const key = list.sessions.find((s: { sessionId: string }) => s.sessionId === SID).key;
  return (await request.get(`${BASE}/api/sessions/${key}`)).json();
}

test('R14 유예와 R12a 무시가 실제 서버에서 동작한다', async ({ request }) => {
  await apiLogin(request);
  const send = async (o: Record<string, unknown>, status = 202) =>
    expect(await postEvent(request, { session_id: SID, project: P, ...o })).toBe(status);

  await send({ event: 'SessionStart', model: 'claude-opus-5-5', ts: ago(300_000) });
  // 2분 전에 시작하고 110초 전에 끝난 BOT: 이미 60초를 넘겨 빠진다
  await send({ event: 'SubagentStart', agent_id: 'old-1', agent_type: 'qa', ts: ago(120_000) });
  await send({ event: 'SubagentStop', agent_id: 'old-1', agent_type: 'qa', ts: ago(110_000) });
  // 10초 전에 끝난 BOT은 아직 남는다
  await send({ event: 'SubagentStart', agent_id: 'new-1', agent_type: 'architect', ts: ago(20_000) });
  await send({ event: 'SubagentStop', agent_id: 'new-1', agent_type: 'architect', ts: ago(10_000) });
  // SubagentStop만 온 내부 에이전트는 만들지 않는다
  const res = await request.post(`${BASE}/api/events`, {
    headers: { authorization: `Bearer ${process.env.E2E_TOKEN}` },
    data: { v: 1, event: 'SubagentStop', session_id: SID, project: P, agent_id: 'ghost', ts: ago(5_000) },
  });
  expect(res.status()).toBe(202);
  expect(await res.json()).toEqual({ ok: true, session: null, ignored: true });

  const d = await detail(request);
  expect(d.agents.map((a) => a.agentKey).sort()).toEqual(['__lead__', 'new-1']);
  expect(d.agents.find((a) => a.agentKey === 'new-1')?.status).toBe('done');
  expect(d.hiddenAgentCount).toBe(1);
  expect(d.session.agentCount).toBe(2);
  expect(d.session.model).toBe('claude-opus-5-5');
});
