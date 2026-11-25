/**
 * R14 표시 규칙(isListedAgent). now를 인자로 주입해 실제로 기다리지 않는다.
 */
import { describe, expect, it } from 'vitest';
import { LEAD_KEY, type AgentState, type SessionState } from '@/domain/types';
import { sessionDetailView } from '@/query/views';
import { isListedAgent } from '@/state/status';
import { HOUR, MIN, SEC, T0 } from '../helpers/events';

function agent(over: Partial<AgentState>): AgentState {
  return {
    agentId: 'A1',
    agentType: 'qa',
    status: 'done',
    currentTool: null,
    waitingSinceTs: null,
    lastEventTs: T0,
    lastSeq: 1,
    firstSeenTs: T0,
    model: null,
    ...over,
  };
}

describe('isListedAgent (R14)', () => {
  it('lead는 어떤 상태·시간에도 항상 보인다', () => {
    expect(isListedAgent(agent({ agentId: null, status: 'ended' }), T0 + 100 * HOUR)).toBe(true);
    expect(isListedAgent(agent({ agentId: null, status: 'done' }), T0 + HOUR)).toBe(true);
  });

  it('승인 대기는 24시간이 지나도 보인다', () => {
    const w = agent({ status: 'waiting', waitingSinceTs: T0 });
    expect(isListedAgent(w, T0 + 25 * HOUR)).toBe(true);
  });

  it('working·thinking은 10분 안이면 보인다', () => {
    expect(isListedAgent(agent({ status: 'working' }), T0 + 9 * MIN)).toBe(true);
    expect(isListedAgent(agent({ status: 'thinking' }), T0 + 9 * MIN)).toBe(true);
  });

  it('done은 60초 정각까지 보이고 60.001초부터 빠진다', () => {
    expect(isListedAgent(agent({}), T0 + 59 * SEC)).toBe(true);
    expect(isListedAgent(agent({}), T0 + 60 * SEC)).toBe(true);
    expect(isListedAgent(agent({}), T0 + 60 * SEC + 1)).toBe(false);
  });

  it('ended(SessionEnd 직후)는 60초 안이면 보이고 그 뒤 빠진다', () => {
    const e = agent({ status: 'ended' });
    expect(isListedAgent(e, T0 + 30 * SEC)).toBe(true);
    expect(isListedAgent(e, T0 + 61 * SEC)).toBe(false);
  });

  it('10분 넘은 working(시간 초과로 ended)은 즉시 빠진다', () => {
    expect(isListedAgent(agent({ status: 'working' }), T0 + 10 * MIN + 1)).toBe(false);
  });

  it('graceMs를 인자로 바꿀 수 있다', () => {
    expect(isListedAgent(agent({}), T0 + 5 * SEC, 4 * SEC)).toBe(false);
  });
});

describe('기존 .data의 유령 BOT (마이그레이션 없음)', () => {
  it('model 필드가 없는 오래된 done·agent_type null BOT은 R14로 사라지고 model은 null', () => {
    const legacy = (id: string | null): AgentState => {
      const { model: _m, ...rest } = agent({ agentId: id, agentType: null });
      return rest;
    };
    const s: SessionState = {
      key: 'k',
      sessionId: 'S',
      project: 'P',
      branch: null,
      remote: false,
      remoteSessionId: null,
      model: null,
      ended: false,
      dismissedAtTs: null,
      restoredAtTs: null,
      lastEventTs: T0,
      agents: { [LEAD_KEY]: legacy(null), ghost1: legacy('ghost1'), ghost2: legacy('ghost2') },
      skills: {},
      agentCalls: {},
    };
    const d = sessionDetailView(s, { now: T0 + 5 * MIN });
    expect(d.agents.map((a) => a.agentKey)).toEqual([LEAD_KEY]);
    expect(d.agents[0].model).toBeNull();
    expect(d.hiddenAgentCount).toBe(2);
    expect(d.session.agentCount).toBe(1);
  });
});
