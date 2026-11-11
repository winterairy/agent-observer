/**
 * 조회 시점 상태 계산(설계 2절, ADR A3). 순수 함수: 시각은 인자 now로 받는다.
 * - R11: working/thinking은 10분, done은 30분을 "초과"하면 ended.
 * - 승인 대기(waiting)는 시간 초과로 ended가 되지 않는다.
 * - R11a: 승인 대기 시작 후 24시간을 초과하면 stale(응답 없음) 표시만 붙인다.
 */
import { config } from '@/config';
import type { AgentState, AgentStatus, SessionState } from '@/domain/types';

export interface EffectiveStatus {
  status: AgentStatus;
  /** 승인 대기를 시작한 시각(waiting일 때만) */
  waitingSinceTs: number | null;
  /** 승인 대기 24시간 초과 = "승인 대기 (응답 없음)" */
  stale: boolean;
}

/** D-5 우선순위: 승인 대기 > 작업 중 > 생각 중 > 완료 > 종료 */
export const STATUS_PRIORITY: Record<AgentStatus, number> = {
  waiting: 4,
  working: 3,
  thinking: 2,
  done: 1,
  ended: 0,
};

export interface StatusTimeouts {
  activeTimeoutMs: number;
  doneTimeoutMs: number;
  waitingStaleMs: number;
}

const DEFAULT_TIMEOUTS: StatusTimeouts = {
  activeTimeoutMs: config.activeTimeoutMs,
  doneTimeoutMs: config.doneTimeoutMs,
  waitingStaleMs: config.waitingStaleMs,
};

export function effectiveStatus(
  agent: AgentState,
  now: number,
  t: StatusTimeouts = DEFAULT_TIMEOUTS,
): EffectiveStatus {
  const idle = now - agent.lastEventTs;
  switch (agent.status) {
    case 'waiting': {
      const since = agent.waitingSinceTs ?? agent.lastEventTs;
      return { status: 'waiting', waitingSinceTs: since, stale: now - since > t.waitingStaleMs };
    }
    case 'working':
    case 'thinking':
      return { status: idle > t.activeTimeoutMs ? 'ended' : agent.status, waitingSinceTs: null, stale: false };
    case 'done':
      return { status: idle > t.doneTimeoutMs ? 'ended' : 'done', waitingSinceTs: null, stale: false };
    case 'ended':
      return { status: 'ended', waitingSinceTs: null, stale: false };
  }
}

/**
 * 세션 상태 = 에이전트 effective 상태 중 우선순위 최대값.
 * 승인 대기면 가장 오래 기다린 에이전트의 시작 시각과 그 기준 stale을 돌려준다.
 */
export function sessionStatus(
  session: SessionState,
  now: number,
  t: StatusTimeouts = DEFAULT_TIMEOUTS,
): EffectiveStatus & { waitingCount: number } {
  let best: AgentStatus = 'ended';
  let waitingSinceTs: number | null = null;
  let waitingCount = 0;
  for (const agent of Object.values(session.agents)) {
    const e = effectiveStatus(agent, now, t);
    if (STATUS_PRIORITY[e.status] > STATUS_PRIORITY[best]) best = e.status;
    if (e.status === 'waiting') {
      waitingCount += 1;
      if (waitingSinceTs === null || (e.waitingSinceTs ?? now) < waitingSinceTs) waitingSinceTs = e.waitingSinceTs;
    }
  }
  const stale = waitingSinceTs !== null && now - waitingSinceTs > t.waitingStaleMs;
  return { status: best, waitingSinceTs, stale, waitingCount };
}
