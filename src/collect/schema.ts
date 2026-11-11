/**
 * payload v1 검증(설계 5절 POST /api/events). zod 기본 strip 모드라 정의하지 않은 키
 * (prompt, tool_input, tool_response, message 등)는 결과에 남지 않는다.
 */
import { z } from 'zod';
import { config } from '@/config';
import { EVENT_NAMES, type IncomingEvent } from '@/domain/types';

const str = z.string().max(config.maxStringLength);
const optStr = str.nullish();
const count = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

const usageSchema = z.object({
  input: count,
  output: count,
  cache_creation: count,
  cache_read: count,
  model: optStr,
  messages: count,
});

const subagentSchema = z.object({
  agent_id: str.min(1),
  agent_type: optStr,
  status: optStr,
  usage: usageSchema,
});

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
  usage: usageSchema.nullish(),
  subagent: subagentSchema.nullish(),
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
  'model',
  'reason',
] as const;

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
  if (p.usage) ev.usage = { ...p.usage, model: p.usage.model ?? null };
  if (p.subagent) {
    ev.subagent = {
      agent_id: p.subagent.agent_id,
      agent_type: p.subagent.agent_type ?? null,
      status: p.subagent.status ?? null,
      usage: { ...p.subagent.usage, model: p.subagent.usage.model ?? null },
    };
  }
  return { ok: true, event: ev };
}
