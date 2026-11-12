/**
 * 스킬 집계·BOT 호출 목록(T1-3, 설계 2절). 순수 함수. 저장하지 않고 조회 때 스냅숏에서 계산한다.
 * - 끝난 에이전트·세션의 기록도 포함한다(지우지 않음).
 * - 역할 키는 roleOf로 받는다. 1단계 조회에서는 역할 매핑을 넘긴다(T1-6).
 */
import { LEAD_KEY, type SessionState, type SkillUse } from '@/domain/types';

export type RoleOf = (agentType: string | null) => string;

/** 기본 역할 매핑: null → lead, 그 외 원문 */
export const defaultRoleOf: RoleOf = (agentType) => agentType ?? 'lead';

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
