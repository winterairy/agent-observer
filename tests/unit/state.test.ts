/**
 * 상태 계산(T1-2). 시나리오 S-01~S-14(S-11b, S-11c 포함)와 전이표 R1~R13(R11a 포함).
 * 시간 초과는 now를 바꿔 검증한다(실제로 기다리지 않는다).
 */
import { describe, expect, it } from 'vitest';
import { LEAD_KEY, sessionKey, type AgentState, type SessionState } from '@/domain/types';
import { applyEvent } from '@/state/reducer';
import { effectiveStatus, sessionStatus } from '@/state/status';
import { HOUR, MIN, SEC, T0, ev, last, run } from '../helpers/events';

const A1 = 'A1';
const lead = (s: SessionState): AgentState => s.agents[LEAD_KEY];
const a1 = (s: SessionState): AgentState => s.agents[A1];
const leadStatus = (s: SessionState, now = s.lastEventTs) => effectiveStatus(lead(s), now).status;
const sub = { agent_id: A1, agent_type: 'qa' } as const;

describe('시나리오 S-01~S-14', () => {
  it('S-01 기본 흐름: 완료 → 생각 중 → 작업 중(Read) → 생각 중 → 완료', () => {
    const steps = run([
      ev('SessionStart', { at: T0 }),
      ev('UserPromptSubmit', { at: T0 + 1 * SEC }),
      ev('PreToolUse', { at: T0 + 2 * SEC, tool: 'Read' }),
      ev('PostToolUse', { at: T0 + 3 * SEC, tool: 'Read' }),
      ev('Stop', { at: T0 + 4 * SEC }),
    ]);
    expect(steps.map((s) => lead(s).status)).toEqual(['done', 'thinking', 'working', 'thinking', 'done']);
    expect(lead(steps[2]).currentTool).toBe('Read');
    expect(lead(steps[3]).currentTool).toBeNull();
  });

  it('S-02 승인 대기: 생각 중 → 작업 중 → 승인 대기 → 생각 중', () => {
    const steps = run([
      ev('UserPromptSubmit', { at: T0 }),
      ev('PreToolUse', { at: T0 + SEC, tool: 'Bash' }),
      ev('Notification', { at: T0 + 2 * SEC, notification_type: 'permission_prompt' }),
      ev('PostToolUse', { at: T0 + 3 * SEC, tool: 'Bash' }),
    ]);
    expect(steps.map((s) => lead(s).status)).toEqual(['thinking', 'working', 'waiting', 'thinking']);
    expect(lead(steps[2]).waitingSinceTs).toBe(T0 + 2 * SEC);
    expect(lead(steps[3]).waitingSinceTs).toBeNull();
  });

  it('S-03 승인 대기 중 세션 상태: lead 승인 대기, A1 작업 중 → 세션 승인 대기', () => {
    const s = last(
      run([
        ev('UserPromptSubmit', { at: T0 }),
        ev('PreToolUse', { at: T0 + SEC, tool: 'Bash' }),
        ev('PreToolUse', { at: T0 + 2 * SEC, ...sub, tool: 'Read' }),
        ev('Notification', { at: T0 + 3 * SEC, notification_type: 'permission_prompt' }),
      ]),
    );
    expect(lead(s).status).toBe('waiting');
    expect(a1(s).status).toBe('working');
    const st = sessionStatus(s, T0 + 4 * SEC);
    expect(st.status).toBe('waiting');
    expect(st.waitingCount).toBe(1);
    expect(st.waitingSinceTs).toBe(T0 + 3 * SEC);
  });

  it('S-04 다른 알림: Stop → Notification(idle_prompt) → 완료 유지', () => {
    const steps = run([ev('Stop', { at: T0 }), ev('Notification', { at: T0 + SEC, notification_type: 'idle_prompt' })]);
    expect(steps.map((s) => lead(s).status)).toEqual(['done', 'done']);
  });

  it('S-05 서브에이전트: lead와 A1 상태 흐름, 마지막에 A1은 남고 완료', () => {
    const t = (n: number) => T0 + n * SEC;
    const steps = run([
      ev('UserPromptSubmit', { at: t(0) }),
      ev('PreToolUse', { at: t(1), tool: 'Agent', subagent_type: 'qa' }),
      ev('SubagentStart', { at: t(2), ...sub }),
      ev('PreToolUse', { at: t(3), ...sub, tool: 'Bash' }),
      ev('PostToolUse', { at: t(4), ...sub, tool: 'Bash' }),
      ev('SubagentStop', { at: t(5), ...sub }),
      ev('PostToolUse', { at: t(6), tool: 'Agent', subagent_type: 'qa' }),
      ev('Stop', { at: t(7) }),
    ]);
    expect(steps.map((s) => lead(s).status)).toEqual([
      'thinking', 'working', 'working', 'working', 'working', 'working', 'thinking', 'done',
    ]);
    expect(steps.slice(2).map((s) => a1(s).status)).toEqual(['thinking', 'working', 'thinking', 'done', 'done', 'done']);
    const end = last(steps);
    expect(Object.keys(end.agents).sort()).toEqual([A1, LEAD_KEY].sort());
    expect(a1(end).agentType).toBe('qa');
    expect(end.agentCalls[LEAD_KEY]).toEqual({ qa: 1 });
  });

  it('S-06 SubagentStart 없이 PreToolUse(A1)가 먼저 오면 A1이 생성되고 작업 중', () => {
    const s = applyEvent(null, ev('PreToolUse', { ...sub, tool: 'Read' }));
    expect(a1(s).status).toBe('working');
    expect(a1(s).agentType).toBe('qa');
    // 늦게 온 SubagentStart는 작업 중을 덮지 않는다
    const s2 = applyEvent(s, ev('SubagentStart', { at: T0 + SEC, ...sub }));
    expect(a1(s2).status).toBe('working');
  });

  it('S-07 SessionStart 없이 새 session_id로 PreToolUse → 세션 생성, lead 작업 중', () => {
    const s = applyEvent(null, ev('PreToolUse', { session_id: 'NEW', tool: 'Grep' }));
    expect(s.sessionId).toBe('NEW');
    expect(s.key).toBe(sessionKey('P1', 'NEW'));
    expect(lead(s).status).toBe('working');
    expect(lead(s).currentTool).toBe('Grep');
  });

  it('S-08 SessionEnd: 작업 중인 lead와 A1 → 세션·lead·A1 모두 종료', () => {
    const s = last(
      run([
        ev('PreToolUse', { at: T0, tool: 'Bash' }),
        ev('PreToolUse', { at: T0 + SEC, ...sub, tool: 'Read' }),
        ev('SessionEnd', { at: T0 + 2 * SEC, reason: 'exit' }),
      ]),
    );
    expect(s.ended).toBe(true);
    expect(lead(s).status).toBe('ended');
    expect(a1(s).status).toBe('ended');
    expect(lead(s).currentTool).toBeNull();
    expect(sessionStatus(s, T0 + 3 * SEC).status).toBe('ended');
  });

  it('S-09 시간 초과(작업 중): 9분 59초 작업 중, 10분 1초 종료', () => {
    const s = applyEvent(null, ev('PreToolUse', { at: T0, tool: 'Bash' }));
    expect(leadStatus(s, T0 + 9 * MIN + 59 * SEC)).toBe('working');
    expect(leadStatus(s, T0 + 10 * MIN)).toBe('working'); // 경계는 "초과"
    expect(leadStatus(s, T0 + 10 * MIN + SEC)).toBe('ended');
    expect(sessionStatus(s, T0 + 10 * MIN + SEC).status).toBe('ended');
  });

  it('S-10 시간 초과(완료): 29분 완료, 31분 종료', () => {
    const s = applyEvent(null, ev('Stop', { at: T0 }));
    expect(leadStatus(s, T0 + 29 * MIN)).toBe('done');
    expect(leadStatus(s, T0 + 31 * MIN)).toBe('ended');
  });

  it('S-11 승인 대기 장기: 61분·23시간 59분 승인 대기, 24시간 1분 응답 없음. 어느 시점에도 종료 아님', () => {
    const s = applyEvent(null, ev('Notification', { at: T0, notification_type: 'permission_prompt' }));
    const at = (ms: number) => effectiveStatus(lead(s), T0 + ms);
    expect(at(61 * MIN)).toEqual({ status: 'waiting', waitingSinceTs: T0, stale: false });
    expect(at(23 * HOUR + 59 * MIN)).toEqual({ status: 'waiting', waitingSinceTs: T0, stale: false });
    expect(at(24 * HOUR + MIN)).toEqual({ status: 'waiting', waitingSinceTs: T0, stale: true });
    for (const ms of [11 * MIN, 31 * MIN, 61 * MIN, 5 * HOUR, 24 * HOUR + MIN, 30 * 24 * HOUR]) {
      expect(at(ms).status).not.toBe('ended');
      expect(sessionStatus(s, T0 + ms).status).toBe('waiting');
    }
    expect(sessionStatus(s, T0 + 24 * HOUR + MIN).stale).toBe(true);
  });

  it('S-11b 승인 대기 중 다른 알림: 승인 대기 유지, 기다린 시간은 첫 알림 기준', () => {
    const s = last(
      run([
        ev('Notification', { at: T0, notification_type: 'permission_prompt' }),
        ev('Notification', { at: T0 + 30 * MIN, notification_type: 'idle_prompt' }),
      ]),
    );
    const e = effectiveStatus(lead(s), T0 + 31 * MIN);
    expect(e.status).toBe('waiting');
    expect(e.waitingSinceTs).toBe(T0);
    expect(lead(s).lastEventTs).toBe(T0 + 30 * MIN);
  });

  it('S-11c 응답 없음 후 재개: 24시간 1분 시점 → PostToolUse → 생각 중, 응답 없음 사라짐', () => {
    const waiting = applyEvent(null, ev('Notification', { at: T0, notification_type: 'permission_prompt' }));
    const at = T0 + 24 * HOUR + MIN;
    expect(effectiveStatus(lead(waiting), at).stale).toBe(true);
    const resumed = applyEvent(waiting, ev('PostToolUse', { at, tool: 'Bash' }));
    expect(effectiveStatus(lead(resumed), at)).toEqual({ status: 'thinking', waitingSinceTs: null, stale: false });
    expect(sessionStatus(resumed, at).stale).toBe(false);
  });

  it('S-12 종료 후 재개: S-09로 종료 → UserPromptSubmit → lead 생각 중, 세션 다시 활성', () => {
    const s = applyEvent(null, ev('PreToolUse', { at: T0, tool: 'Bash' }));
    const later = T0 + 11 * MIN;
    expect(sessionStatus(s, later).status).toBe('ended');
    const s2 = applyEvent(s, ev('UserPromptSubmit', { at: later }));
    expect(leadStatus(s2, later)).toBe('thinking');
    expect(sessionStatus(s2, later).status).toBe('thinking');
  });

  it('S-12b SessionEnd 후 새 이벤트도 세션을 되살린다', () => {
    const s = last(run([ev('Stop', { at: T0 }), ev('SessionEnd', { at: T0 + SEC })]));
    expect(s.ended).toBe(true);
    const s2 = applyEvent(s, ev('UserPromptSubmit', { at: T0 + 2 * SEC }));
    expect(s2.ended).toBe(false);
    expect(lead(s2).status).toBe('thinking');
  });

  it('S-13 순서 뒤바뀜: ts 10:00:02 Stop이 먼저, ts 10:00:01 PreToolUse가 나중에 도착 → 완료', () => {
    const s = last(
      run([
        ev('Stop', { at: Date.parse('2026-11-11T10:00:02Z') }),
        ev('PreToolUse', { at: Date.parse('2026-11-11T10:00:01Z'), tool: 'Read' }),
      ]),
    );
    expect(lead(s).status).toBe('done');
    expect(lead(s).currentTool).toBeNull();
    expect(lead(s).lastEventTs).toBe(Date.parse('2026-11-11T10:00:02Z'));
  });

  it('S-13b 같은 ts면 도착 순서(seq)로 처리한다', () => {
    const s = last(run([ev('PreToolUse', { at: T0, tool: 'Read' }), ev('PostToolUse', { at: T0, tool: 'Read' })]));
    expect(lead(s).status).toBe('thinking');
  });

  it('S-13c 늦게 온 이벤트도 스킬·세션 lastEventTs는 반영한다', () => {
    const s = last(
      run([
        ev('Stop', { at: T0 + 10 * SEC }),
        ev('PreToolUse', { at: T0, tool: 'Skill', skill: 'lint' }),
        ev('PostToolUse', { at: T0 + SEC }),
      ]),
    );
    expect(lead(s).status).toBe('done');
    expect(s.lastEventTs).toBe(T0 + 10 * SEC);
    expect(s.skills[LEAD_KEY].lint.count).toBe(1);
  });

  it('S-14 프로젝트 구분: 같은 이벤트를 P1, P2로 보내면 세션 키가 다르다', () => {
    const p1 = applyEvent(null, ev('SessionStart', { project: 'P1' }));
    const p2 = applyEvent(null, ev('SessionStart', { project: 'P2' }));
    expect(p1.key).not.toBe(p2.key);
    expect(p1.project).toBe('P1');
    expect(p2.project).toBe('P2');
    expect(p1.sessionId).toBe(p2.sessionId);
  });
});

describe('전이표 R1~R13', () => {
  it('R1 SessionStart(메인): 없음/모두 → 완료, model 기록', () => {
    const s = applyEvent(null, ev('SessionStart', { source: 'startup', model: 'claude-opus-5-5' }));
    expect(lead(s).status).toBe('done');
    expect(s.model).toBe('claude-opus-5-5');
    const working = applyEvent(null, ev('PreToolUse', { tool: 'Read' }));
    expect(lead(applyEvent(working, ev('SessionStart', { at: T0 + SEC, source: 'resume' }))).status).toBe('done');
  });

  it('R2 UserPromptSubmit·UserPromptExpansion(메인): 모두 → 생각 중', () => {
    for (const e of ['UserPromptSubmit', 'UserPromptExpansion'] as const) {
      const done = applyEvent(null, ev('Stop'));
      expect(lead(applyEvent(done, ev(e, { at: T0 + SEC }))).status).toBe('thinking');
      const waiting = applyEvent(null, ev('Notification', { notification_type: 'permission_prompt' }));
      expect(lead(applyEvent(waiting, ev(e, { at: T0 + SEC }))).status).toBe('thinking');
    }
  });

  it('R3 PreToolUse: 모두 → 작업 중(도구 이름 기록). 메인·서브 모두', () => {
    const s = applyEvent(applyEvent(null, ev('Stop')), ev('PreToolUse', { at: T0 + SEC, tool: 'Edit' }));
    expect(lead(s).status).toBe('working');
    expect(lead(s).currentTool).toBe('Edit');
    const s2 = applyEvent(s, ev('PreToolUse', { at: T0 + 2 * SEC, ...sub, tool: 'Glob' }));
    expect(a1(s2).currentTool).toBe('Glob');
  });

  it('R3 멱등성: 같은 PreToolUse를 두 번 받아도 작업 중', () => {
    const e = ev('PreToolUse', { tool: 'Read' });
    const once = applyEvent(null, e);
    const twice = applyEvent(once, { ...e, seq: e.seq + 1000 });
    expect(lead(twice).status).toBe('working');
    expect(lead(twice).currentTool).toBe('Read');
    // 완전히 같은 이벤트(같은 seq)도 상태가 같다
    expect(lead(applyEvent(once, e)).status).toBe('working');
  });

  it('멱등성: 같은 Stop·SubagentStop·permission_prompt를 두 번 받아도 같은 상태', () => {
    const w = applyEvent(null, ev('Notification', { notification_type: 'permission_prompt' }));
    const w2 = applyEvent(w, ev('Notification', { at: T0 + MIN, notification_type: 'permission_prompt' }));
    expect(lead(w2).status).toBe('waiting');
    expect(lead(w2).waitingSinceTs).toBe(T0);
    const d = last(run([ev('Stop'), ev('Stop', { at: T0 + SEC })]));
    expect(lead(d).status).toBe('done');
    const sd = last(run([ev('SubagentStop', sub), ev('SubagentStop', { ...sub, at: T0 + SEC })]));
    expect(a1(sd).status).toBe('done');
  });

  it('R4 PostToolUse: 작업 중/승인 대기 → 생각 중, 그 외는 그대로', () => {
    const fromWorking = last(run([ev('PreToolUse', { tool: 'Read' }), ev('PostToolUse', { at: T0 + SEC })]));
    expect(lead(fromWorking).status).toBe('thinking');
    const fromWaiting = last(
      run([ev('Notification', { notification_type: 'permission_prompt' }), ev('PostToolUse', { at: T0 + SEC })]),
    );
    expect(lead(fromWaiting).status).toBe('thinking');
    const fromDone = last(run([ev('Stop'), ev('PostToolUse', { at: T0 + SEC })]));
    expect(lead(fromDone).status).toBe('done');
  });

  it('R5 Notification(permission_prompt): 모두 → 승인 대기, 시작 시각 기록', () => {
    for (const first of [ev('Stop'), ev('PreToolUse', { tool: 'Bash' }), ev('UserPromptSubmit')]) {
      const s = applyEvent(applyEvent(null, first), ev('Notification', { at: T0 + 5 * SEC, notification_type: 'permission_prompt' }));
      expect(lead(s).status).toBe('waiting');
      expect(lead(s).waitingSinceTs).toBe(T0 + 5 * SEC);
      expect(lead(s).currentTool).toBeNull();
    }
    const subWaiting = applyEvent(null, ev('Notification', { ...sub, notification_type: 'permission_prompt' }));
    expect(a1(subWaiting).status).toBe('waiting');
  });

  it('R6 Notification(그 외 타입): 상태 변화 없음, lastEventTs만 갱신', () => {
    const working = applyEvent(null, ev('PreToolUse', { at: T0, tool: 'Bash' }));
    const s = applyEvent(working, ev('Notification', { at: T0 + 9 * MIN, notification_type: 'idle_prompt' }));
    expect(lead(s).status).toBe('working');
    expect(lead(s).currentTool).toBe('Bash');
    expect(lead(s).lastEventTs).toBe(T0 + 9 * MIN);
    // 시간 초과 기준도 늘어난다
    expect(leadStatus(s, T0 + 15 * MIN)).toBe('working');
    // notification_type이 없어도 변화 없음
    const s2 = applyEvent(s, ev('Notification', { at: T0 + 10 * MIN }));
    expect(lead(s2).status).toBe('working');
  });

  it('R7 Stop(메인): 모두 → 완료', () => {
    for (const first of [ev('PreToolUse', { tool: 'Bash' }), ev('UserPromptSubmit'), ev('Notification', { notification_type: 'permission_prompt' })]) {
      const s = applyEvent(applyEvent(null, first), ev('Stop', { at: T0 + SEC }));
      expect(lead(s).status).toBe('done');
      expect(lead(s).waitingSinceTs).toBeNull();
    }
  });

  it('R8 SubagentStart(agent_id 있음): 서브에이전트 생성, 생각 중', () => {
    const s = applyEvent(applyEvent(null, ev('UserPromptSubmit')), ev('SubagentStart', { at: T0 + SEC, ...sub }));
    expect(a1(s).status).toBe('thinking');
    expect(a1(s).agentType).toBe('qa');
    expect(a1(s).firstSeenTs).toBe(T0 + SEC);
    // lead 상태는 바꾸지 않는다
    expect(lead(s).status).toBe('thinking');
  });

  it('R9 SubagentStop(agent_id 있음): 모두 → 해당 서브에이전트 완료', () => {
    const s = last(
      run([ev('PreToolUse', { ...sub, tool: 'Bash' }), ev('PreToolUse', { at: T0 + SEC, tool: 'Agent' }), ev('SubagentStop', { at: T0 + 2 * SEC, ...sub })]),
    );
    expect(a1(s).status).toBe('done');
    expect(lead(s).status).toBe('working');
  });

  it('R10 SessionEnd: 세션과 모든 에이전트 종료(승인 대기 포함)', () => {
    const s = last(
      run([
        ev('Notification', { notification_type: 'permission_prompt' }),
        ev('SubagentStart', { at: T0 + SEC, ...sub }),
        ev('SessionEnd', { at: T0 + 2 * SEC }),
      ]),
    );
    expect(s.ended).toBe(true);
    expect(Object.values(s.agents).map((a) => a.status)).toEqual(['ended', 'ended']);
    expect(lead(s).waitingSinceTs).toBeNull();
  });

  it('R11 시간 경과: 작업 중·생각 중 10분, 완료 30분 초과 → 종료', () => {
    const thinking = applyEvent(null, ev('UserPromptSubmit', { at: T0 }));
    expect(leadStatus(thinking, T0 + 10 * MIN)).toBe('thinking');
    expect(leadStatus(thinking, T0 + 10 * MIN + 1)).toBe('ended');
    const done = applyEvent(null, ev('Stop', { at: T0 }));
    expect(leadStatus(done, T0 + 30 * MIN)).toBe('done');
    expect(leadStatus(done, T0 + 30 * MIN + 1)).toBe('ended');
    // 저장된 상태는 그대로(조회 시 계산)
    expect(lead(done).status).toBe('done');
  });

  it('R11a 시간 경과: 승인 대기 24시간 초과 → 승인 대기 유지 + 응답 없음', () => {
    const s = applyEvent(null, ev('Notification', { at: T0, notification_type: 'permission_prompt' }));
    expect(effectiveStatus(lead(s), T0 + 24 * HOUR)).toEqual({ status: 'waiting', waitingSinceTs: T0, stale: false });
    expect(effectiveStatus(lead(s), T0 + 24 * HOUR + 1)).toEqual({ status: 'waiting', waitingSinceTs: T0, stale: true });
    expect(lead(s).status).toBe('waiting');
  });

  it('R12 처음 보는 agent_id의 아무 이벤트: 서브에이전트를 만들고 그 이벤트 규칙 적용', () => {
    const parent = applyEvent(null, ev('UserPromptSubmit'));
    const n = applyEvent(parent, ev('Notification', { at: T0 + SEC, agent_id: 'A9', agent_type: 'security', notification_type: 'permission_prompt' }));
    expect(n.agents.A9.status).toBe('waiting');
    expect(n.agents.A9.agentType).toBe('security');
    const st = applyEvent(parent, ev('SubagentStop', { at: T0 + SEC, agent_id: 'A8', agent_type: 'qa' }));
    expect(st.agents.A8.status).toBe('done');
  });

  it('R13 처음 보는 session_id의 아무 이벤트: 세션을 만들고 그 이벤트 규칙 적용', () => {
    const s = applyEvent(null, ev('UserPromptSubmit', { session_id: 'S9', branch: 'feature/x', remote: true, remote_session_id: 'r-1' }));
    expect(s.sessionId).toBe('S9');
    expect(s.branch).toBe('feature/x');
    expect(s.remote).toBe(true);
    expect(s.remoteSessionId).toBe('r-1');
    expect(s.ended).toBe(false);
    expect(lead(s).status).toBe('thinking');
    const n = applyEvent(null, ev('Notification', { session_id: 'S8', notification_type: 'permission_prompt' }));
    expect(lead(n).status).toBe('waiting');
  });
});

describe('기타 규칙', () => {
  it('세션 상태 우선순위(D-5): 승인 대기 > 작업 중 > 생각 중 > 완료 > 종료', () => {
    const base = last(run([ev('Stop', { at: T0 }), ev('SubagentStart', { at: T0 + SEC, ...sub })]));
    expect(sessionStatus(base, T0 + 2 * SEC).status).toBe('thinking');
    const w = applyEvent(base, ev('PreToolUse', { at: T0 + 2 * SEC, ...sub, tool: 'Bash' }));
    expect(sessionStatus(w, T0 + 3 * SEC).status).toBe('working');
    // A1이 시간 초과로 종료되면 lead(완료)가 남는다. lead도 30분 지나면 종료
    expect(sessionStatus(w, T0 + 11 * MIN).status).toBe('done');
    expect(sessionStatus(w, T0 + 31 * MIN).status).toBe('ended');
  });

  it('세션 승인 대기 시각은 가장 오래 기다린 에이전트 기준', () => {
    const s = last(
      run([
        ev('Notification', { at: T0 + 5 * MIN, notification_type: 'permission_prompt' }),
        ev('Notification', { at: T0, ...sub, notification_type: 'permission_prompt' }),
      ]),
    );
    expect(sessionStatus(s, T0 + 6 * MIN).waitingSinceTs).toBe(T0);
    expect(sessionStatus(s, T0 + 6 * MIN).waitingCount).toBe(2);
  });

  it('숨긴 세션에 새 이벤트가 오면 dismissedAtTs가 풀린다', () => {
    const s = { ...applyEvent(null, ev('Stop')), dismissedAtTs: T0 + 1 };
    expect(applyEvent(s, ev('UserPromptSubmit', { at: T0 + 2 })).dismissedAtTs).toBeNull();
  });

  it('applyEvent는 입력 세션을 바꾸지 않는다', () => {
    const s = applyEvent(null, ev('Stop'));
    const snapshot = structuredClone(s);
    applyEvent(s, ev('PreToolUse', { at: T0 + SEC, tool: 'Read' }));
    expect(s).toEqual(snapshot);
  });
});
