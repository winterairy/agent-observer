/**
 * 저장소 스냅숏 → 조회 API 응답(DTO) 변환(T1-5, 설계 5절). 순수 함수: 시각은 ctx.now로 받는다.
 * - 상태: state/status의 effectiveStatus·sessionStatus(시간 초과, 승인 대기 시작 시각, 24시간 stale).
 * - 토큰·API 환산 비용(usage·cost·totals·pricing)은 응답에 넣지 않는다(2026-11-11 사용자 범위 변경:
 *   1단계에서 토큰·비용 기능을 빼고 플랜 사용량으로 바꿨다).
 * - 역할 매핑: ctx.roles. 기본은 null → lead, 그 외 원문(characters/roles.ts는 T1-6에서 넘긴다).
 * 응답에 토큰·비밀번호·쿠키 비밀값, 내부 경로를 넣지 않는다.
 */
import { config } from '@/config';
import { calledAgents, skillSummary } from '@/aggregate/totals';
import { LEAD_KEY, type AgentStatus, type SessionState } from '@/domain/types';
import { effectiveStatus, sessionStatus } from '@/state/status';
import { getOwn } from '@/domain/dict';

export interface RoleInfo {
  /** 역할 키(합계·캐릭터 매핑 기준) */
  role: string;
  displayName: string;
  /** null = 기본(임시 사각형) */
  characterId: string | null;
}

export type RoleResolver = (agentType: string | null) => RoleInfo;

/** 기본 역할 매핑: null → lead("책임자"), 그 외 원문. 캐릭터 없음 */
export const defaultRoleResolver: RoleResolver = (agentType) =>
  agentType === null
    ? { role: 'lead', displayName: '책임자', characterId: null }
    : { role: agentType, displayName: agentType, characterId: null };

export interface ViewContext {
  now: number;
  roles?: RoleResolver;
}

function iso(ms: number | null): string | null {
  return ms === null ? null : new Date(ms).toISOString();
}

function resolver(ctx: ViewContext): RoleResolver {
  return ctx.roles ?? defaultRoleResolver;
}

// ---------- 세션 목록 ----------

export interface SessionListItem {
  key: string;
  sessionId: string;
  project: string;
  branch: string | null;
  remote: boolean;
  status: AgentStatus;
  waitingSince: string | null;
  stale: boolean;
  lastEventAt: string;
  /** 사용자가 "정리"한 시각. 숨기지 않았으면 null */
  dismissedAt: string | null;
  agentCount: number;
  waitingCount: number;
}

interface ListRow {
  item: SessionListItem;
  waitingSinceTs: number | null;
  lastEventTs: number;
}

function listRow(s: SessionState, ctx: ViewContext): ListRow {
  const st = sessionStatus(s, ctx.now);
  return {
    waitingSinceTs: st.status === 'waiting' ? st.waitingSinceTs : null,
    lastEventTs: s.lastEventTs,
    item: {
      key: s.key,
      sessionId: s.sessionId,
      project: s.project,
      branch: s.branch,
      remote: s.remote,
      status: st.status,
      waitingSince: st.status === 'waiting' ? iso(st.waitingSinceTs) : null,
      stale: st.status === 'waiting' && st.stale,
      lastEventAt: new Date(s.lastEventTs).toISOString(),
      dismissedAt: iso(s.dismissedAtTs),
      agentCount: Object.keys(s.agents).length,
      waitingCount: st.waitingCount,
    },
  };
}

export function sessionListItem(s: SessionState, ctx: ViewContext): SessionListItem {
  return listRow(s, ctx).item;
}

/** 0 = 승인 대기, 1 = 다른 활성, 2 = 종료 */
function group(r: ListRow): number {
  if (r.item.status === 'waiting') return 0;
  return r.item.status === 'ended' ? 2 : 1;
}

/** 승인 대기 먼저(기다린 시간이 긴 순), 그다음 다른 활성, 종료. 같은 묶음 안에서는 lastEventTs 내림차순 */
function compareRows(a: ListRow, b: ListRow): number {
  const g = group(a) - group(b);
  if (g !== 0) return g;
  if (group(a) === 0) {
    const w = (a.waitingSinceTs ?? 0) - (b.waitingSinceTs ?? 0);
    if (w !== 0) return w;
  }
  return b.lastEventTs - a.lastEventTs || a.item.key.localeCompare(b.item.key);
}

export type EndedFilter = 'recent' | 'none' | 'all';

export interface SessionsQuery {
  project?: string;
  ended?: EndedFilter;
  /** true = 숨긴 세션만(종료 세션 24시간 제한 없음) */
  hiddenOnly?: boolean;
}

export interface SessionsView {
  now: string;
  hiddenCount: number;
  sessions: SessionListItem[];
}

/**
 * GET /api/sessions. sessions는 이미 project로 거른 목록이어도 되고 아니어도 된다.
 * - ended=recent(기본): 종료 세션은 max(lastEventTs, restoredAtTs)가 24시간 안인 것만.
 * - ended=none: 종료 세션 제외. ended=all: 종료·숨긴 세션 모두.
 * - 숨긴 세션(dismissedAtTs)은 ended=all 또는 hiddenOnly일 때만.
 * - hiddenCount = 같은 project 필터 기준 숨긴 세션 수.
 */
export function sessionsView(sessions: SessionState[], q: SessionsQuery, ctx: ViewContext): SessionsView {
  const ended = q.ended ?? 'recent';
  const inProject = sessions.filter((s) => q.project === undefined || s.project === q.project);
  const hiddenCount = inProject.filter((s) => s.dismissedAtTs !== null).length;
  const rows: ListRow[] = [];
  for (const s of inProject) {
    const hidden = s.dismissedAtTs !== null;
    if (q.hiddenOnly) {
      if (!hidden) continue;
      rows.push(listRow(s, ctx));
      continue;
    }
    if (hidden && ended !== 'all') continue;
    const row = listRow(s, ctx);
    if (row.item.status === 'ended') {
      if (ended === 'none') continue;
      if (ended === 'recent') {
        const visibleFrom = Math.max(s.lastEventTs, s.restoredAtTs ?? 0);
        if (ctx.now - visibleFrom > config.endedSessionVisibleMs) continue;
      }
    }
    rows.push(row);
  }
  rows.sort(compareRows);
  return { now: new Date(ctx.now).toISOString(), hiddenCount, sessions: rows.map((r) => r.item) };
}

// ---------- 세션 상세 ----------

export interface AgentView {
  agentKey: string;
  agentId: string | null;
  agentType: string | null;
  role: string;
  displayName: string;
  characterId: string | null;
  status: AgentStatus;
  currentTool: string | null;
  waitingSince: string | null;
  stale: boolean;
  lastEventAt: string;
  skills: { skill: string; count: number; lastAt: string }[];
  calledAgents: { subagentType: string; count: number }[];
}

export interface SessionDetailView {
  now: string;
  session: SessionListItem & { model: string | null; endedByEvent: boolean };
  agents: AgentView[];
}

export function sessionDetailView(s: SessionState, ctx: ViewContext): SessionDetailView {
  const roles = resolver(ctx);
  const entries = Object.entries(s.agents).sort(([ka, a], [kb, b]) => {
    if (ka === LEAD_KEY) return -1;
    if (kb === LEAD_KEY) return 1;
    return a.firstSeenTs - b.firstSeenTs || ka.localeCompare(kb);
  });
  const agents: AgentView[] = entries.map(([agentKey, a]) => {
    const e = effectiveStatus(a, ctx.now);
    const info = roles(a.agentType);
    return {
      agentKey,
      agentId: a.agentId,
      agentType: a.agentType,
      role: info.role,
      displayName: info.displayName,
      characterId: info.characterId,
      status: e.status,
      currentTool: e.status === 'working' ? a.currentTool : null,
      waitingSince: e.status === 'waiting' ? iso(e.waitingSinceTs) : null,
      stale: e.stale,
      lastEventAt: new Date(a.lastEventTs).toISOString(),
      skills: Object.entries(getOwn(s.skills, agentKey) ?? {})
        .map(([skill, r]) => ({ skill, count: r.count, lastAt: new Date(r.lastTs).toISOString() }))
        .sort((x, y) => y.count - x.count || x.skill.localeCompare(y.skill)),
      calledAgents: calledAgents(s, agentKey),
    };
  });
  return {
    now: new Date(ctx.now).toISOString(),
    session: { ...sessionListItem(s, ctx), model: s.model, endedByEvent: s.ended },
    agents,
  };
}

// ---------- 프로젝트·스킬 ----------

export interface ProjectView {
  project: string;
  sessions: number;
  /** 종료가 아닌 세션 수 */
  active: number;
}

export function projectsView(sessions: SessionState[], ctx: ViewContext): { projects: ProjectView[] } {
  const map = new Map<string, ProjectView>();
  for (const s of sessions) {
    let p = map.get(s.project);
    if (!p) {
      p = { project: s.project, sessions: 0, active: 0 };
      map.set(s.project, p);
    }
    p.sessions += 1;
    if (sessionStatus(s, ctx.now).status !== 'ended') p.active += 1;
  }
  return { projects: [...map.values()].sort((a, b) => a.project.localeCompare(b.project)) };
}

export interface SkillsView {
  skills: { skill: string; count: number; byRole: Record<string, number>; lastAt: string }[];
}

/** GET /api/skills. project·session(key) 필터 */
export function skillsView(
  sessions: SessionState[],
  filter: { project?: string; session?: string },
  ctx: ViewContext,
): SkillsView {
  const scoped = sessions.filter(
    (s) => (filter.project === undefined || s.project === filter.project) && (filter.session === undefined || s.key === filter.session),
  );
  const roles = resolver(ctx);
  return {
    skills: skillSummary(scoped, (t) => roles(t).role).map((r) => ({
      skill: r.skill,
      count: r.count,
      byRole: r.byRole,
      lastAt: new Date(r.lastTs).toISOString(),
    })),
  };
}
