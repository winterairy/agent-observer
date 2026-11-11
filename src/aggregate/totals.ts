/**
 * 합계와 스킬 집계(T1-3, 설계 2·6절). 순수 함수. 저장하지 않고 조회 때 스냅숏에서 계산한다.
 * - 토큰 합계 = 각 에이전트 누적값의 합. 끝난 에이전트·세션도 포함(지우지 않음).
 * - 비용 합계 = 에이전트별 비용(에이전트마다 자기 모델 단가)의 합. estimated는 하나라도 추정이면 true.
 * - 역할 키는 roleOf로 받는다. 1단계 조회에서는 characters/roles.ts의 매핑을 넘긴다(T1-6).
 */
import {
  LEAD_KEY,
  type AgentState,
  type ProjectTotal,
  type RoleTotal,
  type SessionState,
  type SkillUse,
  type Totals,
} from '@/domain/types';
import { calcCost, roundCost, type PricingTable, PRICING } from '@/cost/pricing';

export type RoleOf = (agentType: string | null) => string;

/** 기본 역할 매핑: null → lead, 그 외 원문 */
export const defaultRoleOf: RoleOf = (agentType) => agentType ?? 'lead';

export function emptyTotals(): Totals {
  return { input: 0, output: 0, cache_creation: 0, cache_read: 0, costUsd: 0, estimated: false };
}

export function agentTotals(agent: AgentState, table: PricingTable = PRICING): Totals {
  const u = agent.usage;
  const cost = calcCost(u, table);
  return {
    input: u.input,
    output: u.output,
    cache_creation: u.cache_creation,
    cache_read: u.cache_read,
    costUsd: cost.usd,
    estimated: cost.estimated,
  };
}

function addInto(acc: Totals, t: Totals): void {
  acc.input += t.input;
  acc.output += t.output;
  acc.cache_creation += t.cache_creation;
  acc.cache_read += t.cache_read;
  acc.costUsd = roundCost(acc.costUsd + t.costUsd);
  acc.estimated ||= t.estimated;
}

/** 토큰을 하나도 쓰지 않은 에이전트는 비용 추정 여부에 영향을 주지 않는다 */
function hasTokens(a: AgentState): boolean {
  const u = a.usage;
  return u.input + u.output + u.cache_creation + u.cache_read > 0;
}

function addAgent(acc: Totals, agent: AgentState, table: PricingTable): void {
  if (!hasTokens(agent)) return;
  addInto(acc, agentTotals(agent, table));
}

export function sessionTotals(session: SessionState, table: PricingTable = PRICING): Totals {
  const acc = emptyTotals();
  for (const a of Object.values(session.agents)) addAgent(acc, a, table);
  return acc;
}

export function overallTotals(sessions: SessionState[], table: PricingTable = PRICING): Totals {
  const acc = emptyTotals();
  for (const s of sessions) for (const a of Object.values(s.agents)) addAgent(acc, a, table);
  return acc;
}

/** 역할별 합계. agents = 그 역할 에이전트 수 */
export function roleTotals(
  sessions: SessionState[],
  roleOf: RoleOf = defaultRoleOf,
  table: PricingTable = PRICING,
): RoleTotal[] {
  const map = new Map<string, RoleTotal>();
  for (const s of sessions) {
    for (const a of Object.values(s.agents)) {
      const role = roleOf(a.agentType);
      let r = map.get(role);
      if (!r) {
        r = { role, agents: 0, ...emptyTotals() };
        map.set(role, r);
      }
      r.agents += 1;
      addAgent(r, a, table);
    }
  }
  return [...map.values()].sort((x, y) => (x.role === 'lead' ? -1 : y.role === 'lead' ? 1 : x.role.localeCompare(y.role)));
}

/** 프로젝트별 합계. sessions = 그 프로젝트 세션 수 */
export function projectTotals(sessions: SessionState[], table: PricingTable = PRICING): ProjectTotal[] {
  const map = new Map<string, ProjectTotal>();
  for (const s of sessions) {
    let p = map.get(s.project);
    if (!p) {
      p = { project: s.project, sessions: 0, ...emptyTotals() };
      map.set(s.project, p);
    }
    p.sessions += 1;
    for (const a of Object.values(s.agents)) addAgent(p, a, table);
  }
  return [...map.values()].sort((x, y) => x.project.localeCompare(y.project));
}

/** 에이전트별 스킬 사용 기록(평탄화) */
export function skillUses(sessions: SessionState[], roleOf: RoleOf = defaultRoleOf): SkillUse[] {
  const out: SkillUse[] = [];
  for (const s of sessions) {
    for (const [agentKey, bySkill] of Object.entries(s.skills)) {
      const agent = s.agents[agentKey];
      const role = roleOf(agent ? agent.agentType : null);
      for (const [skill, rec] of Object.entries(bySkill)) {
        out.push({ project: s.project, sessionKey: s.key, agentKey, role, skill, count: rec.count, lastTs: rec.lastTs });
      }
    }
  }
  return out;
}

export interface SkillSummary {
  skill: string;
  count: number;
  byRole: Record<string, number>;
  lastTs: number;
}

/** 스킬별 합(GET /api/skills용). 횟수 내림차순 */
export function skillSummary(sessions: SessionState[], roleOf: RoleOf = defaultRoleOf): SkillSummary[] {
  const map = new Map<string, SkillSummary>();
  for (const u of skillUses(sessions, roleOf)) {
    let r = map.get(u.skill);
    if (!r) {
      r = { skill: u.skill, count: 0, byRole: {}, lastTs: u.lastTs };
      map.set(u.skill, r);
    }
    r.count += u.count;
    r.byRole[u.role] = (r.byRole[u.role] ?? 0) + u.count;
    r.lastTs = Math.max(r.lastTs, u.lastTs);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill));
}

/** 에이전트가 Agent 도구로 부른 BOT 목록(Should) */
export function calledAgents(session: SessionState, agentKey: string = LEAD_KEY): { subagentType: string; count: number }[] {
  return Object.entries(session.agentCalls[agentKey] ?? {})
    .map(([subagentType, count]) => ({ subagentType, count }))
    .sort((a, b) => b.count - a.count || a.subagentType.localeCompare(b.subagentType));
}
