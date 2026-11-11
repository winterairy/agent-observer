/**
 * 토큰 누적·API 환산 비용·스킬 기록(T1-3 수용 기준).
 */
import { describe, expect, it } from 'vitest';
import { LEAD_KEY, type SessionState } from '@/domain/types';
import { calcCost, PRICING, resolvePricingModel } from '@/cost/pricing';
import {
  agentTotals,
  calledAgents,
  overallTotals,
  projectTotals,
  roleTotals,
  sessionTotals,
  skillSummary,
  skillUses,
} from '@/aggregate/totals';
import { applyEvent } from '@/state/reducer';
import { mergeUsage } from '@/state/usage';
import { SEC, T0, ev, last, run, usage } from '../helpers/events';

const lead = (s: SessionState) => s.agents[LEAD_KEY];

describe('usage 누적(덮어쓰기, 항목별 max)', () => {
  it('output 100 → 300 → 200 순서로 받으면 300', () => {
    const s = last(
      run([
        ev('PostToolUse', { at: T0, usage: usage({ output: 100 }) }),
        ev('PostToolUse', { at: T0 + SEC, usage: usage({ output: 300 }) }),
        ev('PostToolUse', { at: T0 + 2 * SEC, usage: usage({ output: 200 }) }),
      ]),
    );
    expect(lead(s).usage.output).toBe(300);
  });

  it('output 100 → 300이면 합계는 400이 아니라 300', () => {
    const s = last(
      run([
        ev('PostToolUse', { at: T0, usage: usage({ output: 100 }) }),
        ev('Stop', { at: T0 + SEC, usage: usage({ output: 300 }) }),
      ]),
    );
    expect(sessionTotals(s).output).toBe(300);
    expect(overallTotals([s]).output).toBe(300);
  });

  it('항목별로 따로 판정: (input 10, output 300) 다음 (input 20, output 200) → (20, 300)', () => {
    const merged = mergeUsage(usage({ input: 10, output: 300 }), usage({ input: 20, output: 200 }));
    expect(merged).toMatchObject({ input: 20, output: 300 });
    const s = last(
      run([
        ev('PostToolUse', { usage: usage({ input: 10, output: 300 }) }),
        ev('PostToolUse', { at: T0 + SEC, usage: usage({ input: 20, output: 200 }) }),
      ]),
    );
    expect(lead(s).usage).toMatchObject({ input: 20, output: 300 });
  });

  it('model은 새 값이 null이 아니면 새 값(D-12)', () => {
    expect(mergeUsage(usage({ model: 'a' }), usage({ model: null })).model).toBe('a');
    expect(mergeUsage(usage({ model: 'a' }), usage({ model: 'b' })).model).toBe('b');
  });

  it('SubagentStop 후에도, SessionEnd 후에도 에이전트·역할 합계에 토큰이 남는다', () => {
    const steps = run([
      ev('SubagentStart', { agent_id: 'A1', agent_type: 'qa' }),
      ev('PostToolUse', { at: T0 + SEC, agent_id: 'A1', agent_type: 'qa', usage: usage({ output: 150 }) }),
      ev('SubagentStop', { at: T0 + 2 * SEC, agent_id: 'A1', agent_type: 'qa', usage: usage({ output: 140 }) }),
      ev('SessionEnd', { at: T0 + 3 * SEC }),
    ]);
    const afterStop = steps[2];
    expect(afterStop.agents.A1.status).toBe('done');
    expect(afterStop.agents.A1.usage.output).toBe(150);
    expect(roleTotals([afterStop]).find((r) => r.role === 'qa')?.output).toBe(150);
    const afterEnd = steps[3];
    expect(afterEnd.agents.A1.status).toBe('ended');
    expect(afterEnd.agents.A1.usage.output).toBe(150);
    expect(roleTotals([afterEnd]).find((r) => r.role === 'qa')?.output).toBe(150);
  });

  it('qa 에이전트 두 개(output 100, 200) → qa 역할 합계 output 300, agents 2', () => {
    const s = last(
      run([
        ev('SubagentStop', { agent_id: 'Q1', agent_type: 'qa', usage: usage({ output: 100 }) }),
        ev('SubagentStop', { at: T0 + SEC, agent_id: 'Q2', agent_type: 'qa', usage: usage({ output: 200 }) }),
        ev('Stop', { at: T0 + 2 * SEC, usage: usage({ output: 7 }) }),
      ]),
    );
    const roles = roleTotals([s]);
    expect(roles.find((r) => r.role === 'qa')).toMatchObject({ output: 300, agents: 2 });
    expect(roles.find((r) => r.role === 'lead')).toMatchObject({ output: 7, agents: 1 });
    expect(roles[0].role).toBe('lead');
  });

  it('여러 세션의 같은 역할도 더한다(역할 매핑 함수 주입)', () => {
    const s1 = applyEvent(null, ev('SubagentStop', { agent_id: 'Q1', agent_type: 'qa', usage: usage({ output: 1 }) }));
    const s2 = applyEvent(null, ev('SubagentStop', { session_id: 'S2', agent_id: 'Q2', agent_type: 'plugin:qa', usage: usage({ output: 2 }) }));
    const roleOf = (t: string | null) => (t === null ? 'lead' : (t.split(':').pop() ?? t));
    expect(roleTotals([s1, s2], roleOf).find((r) => r.role === 'qa')).toMatchObject({ output: 3, agents: 2 });
  });

  it('프로젝트 P1·P2 세션의 토큰이 프로젝트별 합계에 섞이지 않는다', () => {
    const p1 = applyEvent(null, ev('Stop', { project: 'P1', usage: usage({ input: 10, output: 100 }) }));
    const p2 = applyEvent(null, ev('Stop', { project: 'P2', usage: usage({ input: 20, output: 200 }) }));
    const p1b = applyEvent(null, ev('Stop', { project: 'P1', session_id: 'S2', usage: usage({ input: 1, output: 1 }) }));
    const totals = projectTotals([p1, p2, p1b]);
    expect(totals.find((t) => t.project === 'P1')).toMatchObject({ input: 11, output: 101, sessions: 2 });
    expect(totals.find((t) => t.project === 'P2')).toMatchObject({ input: 20, output: 200, sessions: 1 });
  });

  it('부모 PostToolUse의 subagent.usage는 그 서브에이전트에 반영되고 lead에는 더해지지 않는다', () => {
    const s = last(
      run([
        ev('PostToolUse', { at: T0, usage: usage({ output: 50 }) }),
        ev('PostToolUse', {
          at: T0 + SEC,
          tool: 'Agent',
          usage: usage({ output: 60 }),
          subagent: { agent_id: 'A1', agent_type: 'qa', status: 'completed', usage: usage({ output: 500, model: 'claude-haiku-5-5' }) },
        }),
      ]),
    );
    expect(lead(s).usage.output).toBe(60);
    expect(s.agents.A1.usage.output).toBe(500);
    expect(s.agents.A1.agentType).toBe('qa');
    expect(s.agents.A1.status).toBe('done');
    expect(sessionTotals(s).output).toBe(560);
  });

  it('subagent.usage와 SubagentStop usage는 같은 규칙(같거나 큰 값)으로 합쳐진다', () => {
    const s = last(
      run([
        ev('SubagentStop', { agent_id: 'A1', agent_type: 'qa', usage: usage({ input: 5, output: 400 }) }),
        ev('PostToolUse', { at: T0 + SEC, subagent: { agent_id: 'A1', agent_type: 'qa', status: null, usage: usage({ input: 9, output: 380 }) } }),
      ]),
    );
    expect(s.agents.A1.usage).toMatchObject({ input: 9, output: 400 });
  });
});

describe('API 환산 비용', () => {
  it('단가표에 기준일과 출처가 있다', () => {
    expect(PRICING.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(PRICING.source).toMatch(/^https:\/\/.*anthropic|claude/);
    expect(PRICING.models[PRICING.defaultModel]).toBeDefined();
  });

  it('D-10 대상 모델이 단가표에 있다', () => {
    for (const m of [
      'claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5',
      'claude-opus-4-6', 'claude-sonnet-4-6', 'claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5',
    ]) {
      expect(PRICING.models[m], m).toBeDefined();
    }
  });

  // 손계산: 단가 USD/MTok. 캐시 쓰기 = 입력 × 1.25, 캐시 읽기 = 입력 × 0.1(Opus·Sonnet 5.5는 × 0.05)
  it.each([
    {
      name: 'claude-haiku-5-5 (입력 0.1, 출력 0.5)',
      u: { input: 6, output: 398, cache_creation: 12285, cache_read: 100229, model: 'claude-haiku-5-5' },
      // 6×0.1 + 398×0.5 + 12285×0.125 + 100229×0.01 = 0.6 + 199 + 1535.625 + 1002.29 = 2737.515 (×1e-6)
      usd: 0.00274,
    },
    {
      name: 'claude-opus-5-5 (입력 4, 출력 20, 캐시 읽기 ×0.05)',
      u: { input: 1000, output: 2000, cache_creation: 10000, cache_read: 100000, model: 'claude-opus-5-5' },
      // 1000×4 + 2000×20 + 10000×5 + 100000×0.2 = 4000 + 40000 + 50000 + 20000 = 114000 (×1e-6)
      usd: 0.114,
    },
    {
      name: 'claude-sonnet-4-6 (입력 3, 출력 15)',
      u: { input: 12345, output: 6789, cache_creation: 1111, cache_read: 55555, model: 'claude-sonnet-4-6' },
      // 37035 + 101835 + 4166.25 + 16666.5 = 159702.75 (×1e-6)
      usd: 0.1597,
    },
    {
      name: '날짜 접미사 claude-haiku-4-5-20251001 → claude-haiku-4-5 (입력 1, 출력 5)',
      u: { input: 100, output: 200, cache_creation: 400, cache_read: 1000, model: 'claude-haiku-4-5-20251001' },
      // 100 + 1000 + 500 + 100 = 1700 (×1e-6)
      usd: 0.0017,
    },
  ])('$name 비용이 손계산과 소수 5자리까지 같다', ({ u, usd }) => {
    const c = calcCost(u);
    expect(c.usd.toFixed(5)).toBe(usd.toFixed(5));
    expect(c.estimated).toBe(false);
  });

  it('단가표에 없는 모델은 Sonnet 최신 단가로 계산하고 추정 표시', () => {
    const u = { input: 1000, output: 1000, cache_creation: 1000, cache_read: 10000 };
    // Sonnet 5.5: 1000×2 + 1000×10 + 1000×2.5 + 10000×0.1 = 15500 (×1e-6)
    for (const model of ['some-new-model', null]) {
      const c = calcCost({ ...u, model });
      expect(c).toEqual({ usd: 0.0155, estimated: true, pricingModel: 'claude-sonnet-5-5' });
    }
  });

  it('모델 이름 매칭: 정확히 → 날짜 접미사 제거 → 없음', () => {
    expect(resolvePricingModel('claude-opus-4-6')).toBe('claude-opus-4-6');
    expect(resolvePricingModel('claude-sonnet-4-5-20250929')).toBe('claude-sonnet-4-5');
    expect(resolvePricingModel('claude-unknown-9')).toBeNull();
    expect(resolvePricingModel(null)).toBeNull();
  });

  it('합계 비용은 에이전트별 비용(각자 모델)의 합, 추정이 하나라도 있으면 estimated', () => {
    const s = last(
      run([
        ev('Stop', { usage: usage({ input: 1000, output: 2000, cache_creation: 10000, cache_read: 100000, model: 'claude-opus-5-5' }) }),
        ev('SubagentStop', { at: T0 + SEC, agent_id: 'A1', agent_type: 'qa', usage: usage({ input: 100, output: 200, cache_creation: 400, cache_read: 1000, model: 'claude-haiku-4-5' }) }),
      ]),
    );
    expect(agentTotals(lead(s)).costUsd).toBe(0.114);
    const t = sessionTotals(s);
    expect(t.costUsd.toFixed(5)).toBe((0.114 + 0.0017).toFixed(5));
    expect(t.estimated).toBe(false);
    const s2 = applyEvent(s, ev('SubagentStop', { at: T0 + 2 * SEC, agent_id: 'A2', agent_type: 'qa', usage: usage({ output: 1000, model: 'mystery' }) }));
    const t2 = sessionTotals(s2);
    expect(t2.estimated).toBe(true);
    expect(t2.costUsd.toFixed(5)).toBe((0.114 + 0.0017 + 0.01).toFixed(5));
    expect(roleTotals([s2]).find((r) => r.role === 'qa')?.estimated).toBe(true);
    expect(roleTotals([s2]).find((r) => r.role === 'lead')?.estimated).toBe(false);
  });

  it('토큰이 없는 에이전트(모델 없음)는 합계를 추정으로 만들지 않는다', () => {
    const s = applyEvent(null, ev('SessionStart'));
    expect(sessionTotals(s)).toEqual({ input: 0, output: 0, cache_creation: 0, cache_read: 0, costUsd: 0, estimated: false });
  });
});

describe('스킬·BOT 호출 기록', () => {
  it('Skill PreToolUse 3번(같은 스킬 2번, 다른 스킬 1번) → 스킬별 2, 1', () => {
    const s = last(
      run([
        ev('PreToolUse', { at: T0, tool: 'Skill', skill: 'playwright-cli' }),
        ev('PostToolUse', { at: T0 + SEC, tool: 'Skill', skill: 'playwright-cli' }),
        ev('PreToolUse', { at: T0 + 2 * SEC, tool: 'Skill', skill: 'playwright-cli' }),
        ev('PreToolUse', { at: T0 + 3 * SEC, agent_id: 'A1', agent_type: 'qa', tool: 'Skill', skill: 'code-review' }),
      ]),
    );
    const summary = skillSummary([s]);
    expect(summary.map((x) => [x.skill, x.count])).toEqual([
      ['playwright-cli', 2],
      ['code-review', 1],
    ]);
    expect(summary[0].byRole).toEqual({ lead: 2 });
    expect(summary[0].lastTs).toBe(T0 + 2 * SEC);
    expect(summary[1].byRole).toEqual({ qa: 1 });
    const uses = skillUses([s]);
    expect(uses.find((u) => u.skill === 'code-review')).toMatchObject({ agentKey: 'A1', role: 'qa', count: 1, project: 'P1', sessionKey: s.key });
  });

  it('skill 이름이 없거나 Skill 도구가 아니면 기록하지 않는다', () => {
    const s = last(run([ev('PreToolUse', { tool: 'Skill', skill: null }), ev('PreToolUse', { at: T0 + SEC, tool: 'Read', skill: 'x' })]));
    expect(s.skills).toEqual({});
  });

  it('Agent·Task 도구 호출(subagent_type)을 어떤 BOT을 불렀는지 기록한다', () => {
    const s = last(
      run([
        ev('PreToolUse', { at: T0, tool: 'Agent', subagent_type: 'qa' }),
        ev('PostToolUse', { at: T0 + SEC, tool: 'Agent', subagent_type: 'qa' }),
        ev('PreToolUse', { at: T0 + 2 * SEC, tool: 'Task', subagent_type: 'developer' }),
        ev('PreToolUse', { at: T0 + 3 * SEC, tool: 'Agent', subagent_type: 'qa' }),
      ]),
    );
    expect(calledAgents(s)).toEqual([
      { subagentType: 'qa', count: 2 },
      { subagentType: 'developer', count: 1 },
    ]);
  });
});
