/**
 * 스킬·BOT 호출 기록(T1-3 수용 기준). tests/unit/cost.test.ts에서 옮겼다(설계 16절 R-9).
 */
import { describe, expect, it } from 'vitest';
import { calledAgents, skillSummary, skillUses } from '@/aggregate/totals';
import { SEC, T0, ev, last, run } from '../helpers/events';

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
