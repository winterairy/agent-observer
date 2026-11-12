/**
 * 순수 reducer: applyEvent(session, event) → session (설계 2절 "상태 계산 규칙").
 * Next.js·fs·Date.now를 쓰지 않는다. 입력 session은 바꾸지 않고 새 객체를 돌려준다.
 *
 * 순서(D-7): 에이전트별 (lastEventTs, lastSeq)보다 이른 이벤트는 상태 전이를 하지 않고
 * 스킬 기록·세션 lastEventTs 갱신만 한다(ADR A2).
 */
import {
  LEAD_KEY,
  sessionKey,
  type AgentState,
  type NormalizedEvent,
  type SessionState,
} from '@/domain/types';

export function agentKeyOf(agentId: string | null): string {
  return agentId ?? LEAD_KEY;
}

function newSession(ev: NormalizedEvent): SessionState {
  return {
    key: sessionKey(ev.project, ev.session_id),
    sessionId: ev.session_id,
    project: ev.project,
    branch: ev.branch,
    remote: ev.remote,
    remoteSessionId: ev.remote_session_id,
    model: null,
    ended: false,
    dismissedAtTs: null,
    restoredAtTs: null,
    lastEventTs: ev.tsMs,
    agents: {},
    skills: {},
    agentCalls: {},
  };
}

function newAgent(agentId: string | null, agentType: string | null, ev: NormalizedEvent): AgentState {
  return {
    agentId,
    agentType: agentId === null ? null : agentType,
    status: 'done',
    currentTool: null,
    waitingSinceTs: null,
    lastEventTs: ev.tsMs,
    lastSeq: ev.seq,
    firstSeenTs: ev.tsMs,
  };
}

/** (ts, seq)가 에이전트에 반영된 마지막 값보다 이르면 true */
function isStale(agent: AgentState, ev: NormalizedEvent): boolean {
  if (ev.tsMs !== agent.lastEventTs) return ev.tsMs < agent.lastEventTs;
  return ev.seq < agent.lastSeq;
}

function setStatus(agent: AgentState, status: AgentState['status'], tool: string | null = null): void {
  if (status === 'waiting') {
    // 이미 승인 대기면 시작 시각을 유지한다(중복 permission_prompt)
    if (agent.status !== 'waiting') agent.waitingSinceTs = agent.lastEventTs;
  } else {
    agent.waitingSinceTs = null;
  }
  agent.status = status;
  agent.currentTool = status === 'working' ? tool : null;
}

/** 이벤트 하나의 상태 전이(R1~R10, R12). agent.lastEventTs는 호출 전에 ev로 갱신돼 있다 */
function transition(agent: AgentState, ev: NormalizedEvent, isNew: boolean): void {
  const isLead = agent.agentId === null;
  switch (ev.event) {
    case 'SessionStart': // R1
      if (isLead) setStatus(agent, 'done');
      break;
    case 'UserPromptSubmit': // R2
    case 'UserPromptExpansion':
      if (isLead) setStatus(agent, 'thinking');
      break;
    case 'PreToolUse': // R3
      setStatus(agent, 'working', ev.tool ?? null);
      break;
    case 'PostToolUse': // R4
      if (agent.status === 'working' || agent.status === 'waiting') setStatus(agent, 'thinking');
      break;
    case 'Notification': // R5, R6
      if (ev.notification_type === 'permission_prompt') setStatus(agent, 'waiting');
      break;
    case 'Stop': // R7
      if (isLead) setStatus(agent, 'done');
      break;
    case 'SubagentStart': // R8
      // 새로 만들었거나 끝난 에이전트가 다시 시작할 때만. 이미 활동 중이면 그대로(S-06 뒤 늦은 Start)
      if (!isLead && (isNew || agent.status === 'done' || agent.status === 'ended')) {
        setStatus(agent, 'thinking');
      }
      break;
    case 'SubagentStop': // R9
      if (!isLead) setStatus(agent, 'done');
      break;
    case 'SessionEnd': // R10은 applyEvent에서 모든 에이전트에 적용
      break;
  }
}

export function applyEvent(prev: SessionState | null, ev: NormalizedEvent): SessionState {
  // R13: 처음 보는 세션이면 만든다
  const s: SessionState = prev ? structuredClone(prev) : newSession(ev);

  // 숨긴 세션에 새 이벤트가 오면 다시 보인다
  s.dismissedAtTs = null;

  const newest = ev.tsMs >= s.lastEventTs;
  s.lastEventTs = Math.max(s.lastEventTs, ev.tsMs);
  if (newest) {
    if (ev.branch !== null) s.branch = ev.branch;
    if (ev.remote) s.remote = true;
    if (ev.remote_session_id !== null) s.remoteSessionId = ev.remote_session_id;
  }

  // 대상 에이전트(R12: 처음 보는 agent_id면 만든다)
  const key = agentKeyOf(ev.agent_id);
  let agent = s.agents[key];
  const isNew = !agent;
  if (!agent) {
    agent = newAgent(ev.agent_id, ev.agent_type, ev);
    s.agents[key] = agent;
  } else if (ev.agent_id !== null && ev.agent_type && !agent.agentType) {
    agent.agentType = ev.agent_type;
  }

  const stale = !isNew && isStale(agent, ev);

  if (ev.event === 'SessionEnd') {
    // R10: 세션과 모든 에이전트 종료
    if (!stale) s.ended = true;
    for (const a of Object.values(s.agents)) {
      if (isStale(a, ev)) continue;
      a.lastEventTs = ev.tsMs;
      a.lastSeq = ev.seq;
      setStatus(a, 'ended');
    }
  } else if (!stale) {
    // 종료된 세션에 새 이벤트가 오면 다시 살아난다(S-12)
    s.ended = false;
    agent.lastEventTs = ev.tsMs;
    agent.lastSeq = ev.seq;
    transition(agent, ev, isNew);
    if (ev.event === 'SessionStart' && ev.agent_id === null && ev.model) s.model = ev.model;
  }

  // 스킬·BOT 호출 기록(PreToolUse만. PostToolUse에도 같은 필드가 와서 두 번 세지 않게)
  if (ev.event === 'PreToolUse') {
    if (ev.tool === 'Skill' && ev.skill) {
      const bySkill = (s.skills[key] ??= {});
      const rec = (bySkill[ev.skill] ??= { count: 0, lastTs: ev.tsMs });
      rec.count += 1;
      rec.lastTs = Math.max(rec.lastTs, ev.tsMs);
    }
    if ((ev.tool === 'Agent' || ev.tool === 'Task') && ev.subagent_type) {
      const calls = (s.agentCalls[key] ??= {});
      calls[ev.subagent_type] = (calls[ev.subagent_type] ?? 0) + 1;
    }
  }

  return s;
}
