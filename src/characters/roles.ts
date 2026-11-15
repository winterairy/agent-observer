/**
 * 역할 매핑과 캐릭터 설정 읽기(T1-6, 설계 7절).
 * roleKeyFor는 vendor/pixel-agent-desk/src/roleConfig.js의 roleKeyFor(플러그인 접두사 처리)를
 * 옮겨 고친 것이다(MIT, THIRD_PARTY_NOTICES.md). 원본은 서브에이전트·팀원 구분을 받지만 여기서는
 * agent_type이 null이면 lead로 본다.
 *
 * 파일 위치: OBSERVER_CHARACTERS_DIR(기본 <cwd>/characters)
 * - roles.json: { "<역할키>": { "name": "책임자", "character": "lead" } }. 없으면 config/roles.example.json
 * - <id>/character.json + 그림 파일(png/webp)
 * 파일 mtime이 바뀌면 다시 읽는다(D-20: 새로고침으로 반영). 오류는 서버 로그에만 남기고 응답에는 넣지 않는다.
 */
import fs from 'node:fs';
import { setOwn } from '@/domain/dict';
import path from 'node:path';
import { z } from 'zod';
import type { RoleInfo, RoleResolver } from '@/query/views';
import { ACTIONS, parseSpriteConfig, resolveAction, type ResolvedAction, type SpriteConfig } from '@/characters/spriteConfig';

export const CHARACTER_ID_RE = /^[a-z0-9_-]{1,64}$/;
export const LEAD_DISPLAY_NAME = '책임자';

export interface RoleEntry {
  name?: string;
  character?: string | null;
}
export type RolesMap = Record<string, RoleEntry>;

const rolesSchema = z.record(
  z.string().min(1).max(64),
  z.object({ name: z.string().min(1).max(64).optional(), character: z.string().regex(CHARACTER_ID_RE).nullable().optional() }),
);

/** null → lead, 원문 키 → 원문, `plugin:planner` → planner(있을 때), 그 외 원문 */
export function roleKeyFor(agentType: string | null, roles: RolesMap): string {
  if (agentType === null) return 'lead';
  if (Object.hasOwn(roles, agentType)) return agentType;
  const short = agentType.split(':').pop() ?? agentType;
  if (short && Object.hasOwn(roles, short)) return short;
  return agentType;
}

export function roleInfoFor(agentType: string | null, roles: RolesMap): RoleInfo {
  const role = roleKeyFor(agentType, roles);
  const entry = Object.hasOwn(roles, role) ? roles[role] : undefined;
  const fallbackName = role === 'lead' ? LEAD_DISPLAY_NAME : (agentType ?? role);
  return { role, displayName: entry?.name ?? fallbackName, characterId: entry?.character ?? null };
}

export function makeRoleResolver(roles: RolesMap): RoleResolver {
  return (agentType) => roleInfoFor(agentType, roles);
}

// ---------- 파일 읽기 ----------

export function charactersDir(env: NodeJS.ProcessEnv = process.env): string {
  return path.resolve(/*turbopackIgnore: true*/ env.OBSERVER_CHARACTERS_DIR || path.join(process.cwd(), 'characters'));
}

const EXAMPLE_ROLES = () => path.join(process.cwd(), 'config', 'roles.example.json');

interface Cached<T> {
  mtimeMs: number;
  value: T;
}
const cache = new Map<string, Cached<unknown>>();

/** mtime이 같으면 이전 결과. 파일이 없으면 undefined */
function readCached<T>(file: string, parse: (text: string) => T): T | undefined {
  let st: fs.Stats;
  try {
    st = fs.statSync(file);
  } catch {
    cache.delete(file);
    return undefined;
  }
  const hit = cache.get(file) as Cached<T> | undefined;
  if (hit && hit.mtimeMs === st.mtimeMs) return hit.value;
  const value = parse(fs.readFileSync(file, 'utf8'));
  cache.set(file, { mtimeMs: st.mtimeMs, value });
  return value;
}

function parseRoles(text: string, label: string): RolesMap {
  try {
    const r = rolesSchema.safeParse(JSON.parse(text));
    if (r.success) return r.data;
    console.warn(`[characters] ${label} 형식 오류: ${r.error.issues.map((i) => i.path.join('.')).join(', ')}`);
  } catch {
    console.warn(`[characters] ${label} JSON을 읽지 못했습니다`);
  }
  return {};
}

export function loadRoles(env: NodeJS.ProcessEnv = process.env): RolesMap {
  try {
    const own = readCached(path.join(charactersDir(env), 'roles.json'), (t) => parseRoles(t, 'roles.json'));
    if (own !== undefined) return own;
    return readCached(EXAMPLE_ROLES(), (t) => parseRoles(t, 'roles.example.json')) ?? {};
  } catch {
    console.warn('[characters] 역할 설정을 읽지 못했습니다');
    return {};
  }
}

export function getRoleResolver(env: NodeJS.ProcessEnv = process.env): RoleResolver {
  return makeRoleResolver(loadRoles(env));
}

export type CharacterLoad = { ok: true; config: SpriteConfig; imagePath: string } | { ok: false };

/** characters/<id>/character.json 검증 + 그림 파일 존재·경로 이탈 확인 */
export function loadCharacter(id: string, env: NodeJS.ProcessEnv = process.env): CharacterLoad {
  if (!CHARACTER_ID_RE.test(id)) return { ok: false };
  const root = charactersDir(env);
  const dir = path.resolve(root, id);
  if (!dir.startsWith(root + path.sep)) return { ok: false };
  try {
    const parsed = readCached(path.join(dir, 'character.json'), (t) => {
      try {
        return parseSpriteConfig(JSON.parse(t));
      } catch {
        return { ok: false as const, issues: ['(json)'] };
      }
    });
    if (parsed === undefined) {
      console.warn(`[characters] ${id}: character.json이 없습니다`);
      return { ok: false };
    }
    if (!parsed.ok) {
      console.warn(`[characters] ${id}: character.json 형식 오류 (${parsed.issues.join(', ')})`);
      return { ok: false };
    }
    const imagePath = path.resolve(dir, parsed.config.image);
    if (!imagePath.startsWith(dir + path.sep)) return { ok: false };
    if (!fs.statSync(/*turbopackIgnore: true*/ imagePath, { throwIfNoEntry: false })?.isFile()) {
      console.warn(`[characters] ${id}: 그림 파일이 없습니다`);
      return { ok: false };
    }
    return { ok: true, config: parsed.config, imagePath };
  } catch {
    console.warn(`[characters] ${id}: 설정을 읽지 못했습니다`);
    return { ok: false };
  }
}

// ---------- GET /api/characters 응답 ----------

export type CharacterView =
  | { ok: true; image: string; frameWidth: number; frameHeight: number; actions: Record<string, ResolvedAction> }
  | { ok: false };

export interface CharactersView {
  roles: Record<string, { displayName: string; characterId: string | null }>;
  default: { characterId: null };
  characters: Record<string, CharacterView>;
}

/** actions에는 D-19 대체까지 적용한 결과를 `<동작>_down` 키로 넣는다(없는 동작은 빠짐 → 화면은 사각형) */
export function characterView(id: string, c: CharacterLoad): CharacterView {
  if (!c.ok) return { ok: false };
  const actions: Record<string, ResolvedAction> = {};
  for (const a of ACTIONS) {
    const r = resolveAction(c.config, a, 'down');
    if (r) actions[`${a}_down`] = r;
  }
  return {
    ok: true,
    image: `/api/characters/${id}/image`,
    frameWidth: c.config.frameWidth,
    frameHeight: c.config.frameHeight,
    actions,
  };
}

export function charactersView(env: NodeJS.ProcessEnv = process.env): CharactersView {
  const roles = loadRoles(env);
  const out: CharactersView = { roles: {}, default: { characterId: null }, characters: {} };
  const ids = new Set<string>();
  for (const key of Object.keys(roles)) {
    const info = roleInfoFor(key === 'lead' ? null : key, roles);
    setOwn(out.roles, key, { displayName: info.displayName, characterId: info.characterId });
    if (info.characterId) ids.add(info.characterId);
  }
  for (const id of ids) setOwn(out.characters, id, characterView(id, loadCharacter(id, env)));
  return out;
}
