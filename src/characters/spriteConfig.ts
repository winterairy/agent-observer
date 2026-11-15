/**
 * 캐릭터 설정 검증과 동작 대체(T1-6, 설계 7절).
 * - 설정 형식: { image, frameWidth, frameHeight, fps?, rows: [{action, direction?, frames, fps?}] }
 *   rows의 순서 = 그림의 줄 번호(0부터).
 * - resolveAction은 순수 함수다(D-19 대체 순서).
 */
import { z } from 'zod';

export const ACTIONS = ['idle', 'walk', 'sit', 'sit_work', 'done', 'alert'] as const;
export const DIRECTIONS = ['down', 'left', 'right', 'up'] as const;
export type Action = (typeof ACTIONS)[number];
export type Direction = (typeof DIRECTIONS)[number];

/** 그림 파일 이름: 폴더 구분자 없는 png/webp 하나 */
export const IMAGE_NAME_RE = /^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}\.(png|webp)$/;

const rowSchema = z.object({
  action: z.enum(ACTIONS),
  direction: z.enum(DIRECTIONS).default('down'),
  frames: z.number().int().min(1).max(64),
  fps: z.number().positive().max(60).optional(),
});

export const spriteConfigSchema = z.object({
  image: z.string().regex(IMAGE_NAME_RE),
  frameWidth: z.number().int().min(1).max(512),
  frameHeight: z.number().int().min(1).max(512),
  fps: z.number().positive().max(60).default(6),
  rows: z.array(rowSchema).min(1).max(64),
});

export type SpriteConfig = z.infer<typeof spriteConfigSchema>;

export interface ResolvedAction {
  row: number;
  frames: number;
  fps: number;
}

export type ParseResult = { ok: true; config: SpriteConfig } | { ok: false; issues: string[] };

export function parseSpriteConfig(raw: unknown): ParseResult {
  const r = spriteConfigSchema.safeParse(raw);
  if (r.success) return { ok: true, config: r.data };
  return { ok: false, issues: r.error.issues.map((i) => i.path.join('.') || '(root)') };
}

/** 동작 체인: sit_work → sit → idle, walk → idle, 그 외 → idle */
export function actionChain(action: Action): Action[] {
  if (action === 'sit_work') return ['sit_work', 'sit', 'idle'];
  if (action === 'sit') return ['sit', 'idle'];
  if (action === 'idle') return ['idle'];
  return [action, 'idle'];
}

/**
 * D-19: 체인의 각 동작마다 (요청 방향 → down 방향) 순서로 찾는다. 끝까지 없으면 null(임시 사각형).
 */
export function resolveAction(
  config: Pick<SpriteConfig, 'rows' | 'fps'>,
  action: Action,
  direction: Direction = 'down',
): ResolvedAction | null {
  const dirs: Direction[] = direction === 'down' ? ['down'] : [direction, 'down'];
  for (const a of actionChain(action)) {
    for (const d of dirs) {
      const row = config.rows.findIndex((r) => r.action === a && (r.direction ?? 'down') === d);
      if (row >= 0) {
        const r = config.rows[row];
        return { row, frames: r.frames, fps: r.fps ?? config.fps };
      }
    }
  }
  return null;
}
