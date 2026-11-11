/**
 * 이벤트·세션·에이전트·합계 타입(설계 2절). 외부 의존 없음.
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

/** 에이전트별 누적 토큰. 정수 >= 0 */
export interface Usage {
  input: number;
  output: number;
  cache_creation: number;
  cache_read: number;
  model: string | null;
  messages: number;
}

export interface SubagentInfo {
  agent_id: string;
  agent_type: string | null;
  status: string | null;
  usage: Usage;
}

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
  usage?: Usage;
  subagent?: SubagentInfo;
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
  /** 누적, 항목별 max */
  usage: Usage;
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

export interface Totals {
  input: number;
  output: number;
  cache_creation: number;
  cache_read: number;
  costUsd: number;
  /** 추정 단가가 하나라도 섞임 */
  estimated: boolean;
}

export interface RoleTotal extends Totals {
  role: string;
  agents: number;
}

export interface ProjectTotal extends Totals {
  project: string;
  sessions: number;
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

export function emptyUsage(): Usage {
  return { input: 0, output: 0, cache_creation: 0, cache_read: 0, model: null, messages: 0 };
}

/** base64url(project + "\n" + session_id). 외부 의존 없이 UTF-8 → base64url */
export function sessionKey(project: string, sessionId: string): string {
  const bytes = new TextEncoder().encode(`${project}\n${sessionId}`);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
