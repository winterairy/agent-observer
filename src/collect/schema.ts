/**
 * payload v1 검증(설계 5절 POST /api/events). zod 기본 strip 모드라 정의하지 않은 키
 * (prompt, tool_input, tool_response, message 등)는 결과에 남지 않는다.
 * `usage`는 `model` 이름 하나만 읽고 버린다(토큰 수는 읽지도 저장하지도 않음). 형식이 틀려도 400이 아니다(D-21).
 * `subagent`는 스키마에 없어 검사 없이 버려진다.
 *
 * `__proto__`·`constructor`·`prototype` 값은 거부하지 않고 그대로 받는다(SEC-01). 모델이 만든 스킬 이름 하나로
 * 수집이 끊기지 않게 하려는 것이다(D-21 정신). 안전성은 저장소·reducer의 맵 접근(`@/domain/dict`)이 보장한다.
 */
import { z } from 'zod';
import { config } from '@/config';
import { EVENT_NAMES, type IncomingEvent } from '@/domain/types';

const str = z.string().max(config.maxStringLength);
const optStr = str.nullish();
const ISO_PREFIX = /^\d{4}-\d{2}-\d{2}T/;

export const payloadSchema = z.object({
  v: z.literal(1),
  event: z.enum(EVENT_NAMES),
  ts: z.string().max(64).refine((s) => ISO_PREFIX.test(s) && !Number.isNaN(Date.parse(s))),
  session_id: str.min(1),
  project: str,
  agent_id: optStr,
  agent_type: optStr,
  branch: optStr,
  remote: z.boolean().nullish(),
  remote_session_id: optStr,
  tool: optStr,
  skill: optStr,
  subagent_type: optStr,
  command: optStr,
  notification_type: optStr,
  source: optStr,
  model: optStr,
  reason: optStr,
  usage: z.unknown().optional(),
});

export type Payload = z.infer<typeof payloadSchema>;

export type ParseResult =
  | { ok: true; event: IncomingEvent }
  | { ok: false; issues: string[] };

const OPTIONAL_STRING_KEYS = [
  'tool',
  'skill',
  'subagent_type',
  'command',
  'notification_type',
  'source',
  'reason',
] as const;

/** 모델 이름 정리: trim, 1~256자, `<synthetic>` 같은 꺾쇠 값과 문자열이 아닌 값은 null */
export function cleanModel(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = v.trim();
  if (m.length < 1 || m.length > config.maxStringLength) return null;
  return m.startsWith('<') && m.endsWith('>') ? null : m;
}

/** usage가 객체이고 자기 속성 model이 있을 때만 그 값을 꺼낸다(프로토타입 경로 차단) */
function usageModel(usage: unknown): string | null {
  if (typeof usage !== 'object' || usage === null || Array.isArray(usage)) return null;
  return Object.hasOwn(usage, 'model') ? cleanModel((usage as Record<string, unknown>).model) : null;
}

/**
 * 검증하고 허용 필드만 골라 이벤트를 만든다. `now`보다 5분 넘게 미래인 ts는 now로 바꾼다.
 * 실패하면 필드 경로만 돌려준다(값은 넣지 않는다).
 */
export function parsePayload(raw: unknown, now: number): ParseResult {
  const r = payloadSchema.safeParse(raw);
  if (!r.success) {
    const issues = [...new Set(r.error.issues.map((i) => i.path.map(String).join('.') || '(root)'))];
    return { ok: false, issues };
  }
  const p = r.data;
  let tsMs = Date.parse(p.ts);
  let ts = p.ts;
  if (tsMs > now + config.futureTsToleranceMs) {
    tsMs = now;
    ts = new Date(now).toISOString();
  }
  const ev: IncomingEvent = {
    v: 1,
    event: p.event,
    ts,
    tsMs,
    session_id: p.session_id,
    agent_id: p.agent_id || null,
    agent_type: p.agent_type || null,
    project: p.project === '' ? '(unknown)' : p.project,
    branch: p.branch ?? null,
    remote: p.remote ?? false,
    remote_session_id: p.remote_session_id ?? null,
  };
  for (const k of OPTIONAL_STRING_KEYS) {
    if (p[k] !== undefined) ev[k] = p[k] ?? null;
  }
  // 최상위 model 우선, 없으면 usage.model. 꺾쇠·빈 값은 null(갱신 없음)
  const model = cleanModel(p.model) ?? usageModel(p.usage);
  if (model !== null) ev.model = model;
  return { ok: true, event: ev };
}
