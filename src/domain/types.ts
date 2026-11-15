/**
 * 이벤트·세션·에이전트·플랜 사용량 타입(설계 2절). 외부 의존 없음.
 */

export const EVENT_NAMES = [
  'SessionStart',
  'SessionEnd',
  'UserPromptSubmit',
  'UserPromptExpansion',
  'PreToolUse',
  'PostToolUse',
  'Notification',
  'Stop',
  'SubagentStart',
  'SubagentStop',
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

/** 검증 후 허용 필드만 남긴 이벤트. 이것만 저장한다 */
export interface NormalizedEvent {
  v: 1;
  event: EventName;
  /** ISO 8601 */
  ts: string;
  tsMs: number;
  /** 도착 순번. 저장소가 부여한다 */
  seq: number;
  session_id: string;
  agent_id: string | null;
  agent_type: string | null;
  project: string;
  branch: string | null;
  remote: boolean;
  remote_session_id: string | null;
  tool?: string | null;
  skill?: string | null;
  subagent_type?: string | null;
  command?: string | null;
  notification_type?: string | null;
  source?: string | null;
  model?: string | null;
  reason?: string | null;
}

/** 저장소에 넘기는 이벤트(seq는 저장소가 부여) */
export type IncomingEvent = Omit<NormalizedEvent, 'seq'>;

/** 화면 문구: 작업 중 / 생각 중 / 승인 대기 / 완료 / 종료 */
export type AgentStatus = 'working' | 'thinking' | 'waiting' | 'done' | 'ended';

/** lead(메인 세션)의 에이전트 키 */
export const LEAD_KEY = '__lead__';

export interface AgentState {
  /** null = lead(메인 세션) */
  agentId: string | null;
  /** 원문. 역할 키는 조회 시 계산 */
  agentType: string | null;
  /** 저장된 상태(시간 초과 미반영) */
  status: AgentStatus;
  /** working일 때만 */
  currentTool: string | null;
  /** waiting으로 바뀐 시각. waiting이 아니면 null. R6은 바꾸지 않음 */
  waitingSinceTs: number | null;
  /** 상태 전이에 반영된 마지막 ts(ms) */
  lastEventTs: number;
  lastSeq: number;
  firstSeenTs: number;
}

export interface SkillCount {
  count: number;
  lastTs: number;
}

export interface SessionState {
  /** sessionKey(project, session_id) */
  key: string;
  sessionId: string;
  project: string;
  branch: string | null;
  remote: boolean;
  remoteSessionId: string | null;
  /** SessionStart.model */
  model: string | null;
  /** SessionEnd(R10) 받음. 이후 이벤트가 오면 false */
  ended: boolean;
  /** 사용자가 "정리"한 시각. 이후 이벤트가 오면 null */
  dismissedAtTs: number | null;
  /** 사용자가 "다시 표시"한 시각 */
  restoredAtTs: number | null;
  /** 세션 내 최대 ts */
  lastEventTs: number;
  /** 키: agent_id 또는 LEAD_KEY */
  agents: Record<string, AgentState>;
  /** agentKey → skill → 횟수 */
  skills: Record<string, Record<string, SkillCount>>;
  /** agentKey → subagent_type → 횟수 */
  agentCalls: Record<string, Record<string, number>>;
}

export interface SkillUse {
  project: string;
  sessionKey: string;
  agentKey: string;
  role: string;
  skill: string;
  count: number;
  lastTs: number;
}

/** 플랜 사용량 창 이름(T1-8, 설계 6절) */
export const PLAN_WINDOW_NAMES = ['five_hour', 'seven_day'] as const;
export type PlanWindowName = (typeof PLAN_WINDOW_NAMES)[number];

export interface PlanWindowState {
  /** 0~100 */
  usedPercentage: number;
  /** Unix epoch 초(원문 단위 그대로) */
  resetsAtSec: number;
  /** 이 창이 마지막으로 보고된 서버 수신 시각(ms). D-27: 진 값이 와도 갱신 */
  receivedTs: number;
  /** 저장된 값을 보낸 요청이 클라우드 세션이었는지 */
  remote: boolean;
}

/** 계정 단위 하나. 세션·프로젝트와 관계없다(D-28) */
export interface PlanUsageState {
  five_hour: PlanWindowState | null;
  seven_day: PlanWindowState | null;
}

export interface PlanWindowReport {
  usedPercentage: number;
  resetsAtSec: number;
}

/** 검증된 수집 요청(plan/schema 결과). windows는 1개 이상 */
export interface PlanReport {
  remote: boolean;
  windows: Partial<Record<PlanWindowName, PlanWindowReport>>;
}

export function emptyPlanUsage(): PlanUsageState {
  return { five_hour: null, seven_day: null };
}

/** base64url(project + "\n" + session_id). 외부 의존 없이 UTF-8 → base64url */
export function sessionKey(project: string, sessionId: string): string {
  const bytes = new TextEncoder().encode(`${project}\n${sessionId}`);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
