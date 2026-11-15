/** T1-6 역할 매핑과 동작 대체(D-19). 순수 함수만 다룬다. */
import { describe, expect, it } from 'vitest';
import { makeRoleResolver, roleInfoFor, roleKeyFor, type RolesMap } from '@/characters/roles';
import { actionChain, parseSpriteConfig, resolveAction, type SpriteConfig } from '@/characters/spriteConfig';

const ROLES: RolesMap = {
  lead: { name: '책임자', character: 'lead' },
  planner: { name: '기획', character: 'planner' },
  qa: { name: 'QA' },
};

describe('roleKeyFor', () => {
  it('agent_type null → lead', () => {
    expect(roleKeyFor(null, ROLES)).toBe('lead');
    expect(roleKeyFor(null, {})).toBe('lead');
  });
  it('원문 키가 있으면 그대로', () => {
    expect(roleKeyFor('planner', ROLES)).toBe('planner');
  });
  it('plugin:planner → planner(접두사를 뗀다)', () => {
    expect(roleKeyFor('plugin:planner', ROLES)).toBe('planner');
    expect(roleKeyFor('dev-team-kit:qa', ROLES)).toBe('qa');
  });
  it('원문 키가 접두사 형태로 직접 있으면 원문이 우선', () => {
    expect(roleKeyFor('x:planner', { ...ROLES, 'x:planner': { name: '특별' } })).toBe('x:planner');
  });
  it('매핑에 없는 역할(unknown-bot)은 원문', () => {
    expect(roleKeyFor('unknown-bot', ROLES)).toBe('unknown-bot');
    expect(roleKeyFor('plugin:unknown', ROLES)).toBe('plugin:unknown');
  });
  it('Object 기본 속성 이름(constructor 등)을 역할로 오인하지 않는다', () => {
    expect(roleKeyFor('constructor', ROLES)).toBe('constructor');
    expect(roleInfoFor('toString', ROLES)).toEqual({ role: 'toString', displayName: 'toString', characterId: null });
  });
});

describe('roleInfoFor / makeRoleResolver', () => {
  it('lead는 설정의 이름·캐릭터', () => {
    expect(roleInfoFor(null, ROLES)).toEqual({ role: 'lead', displayName: '책임자', characterId: 'lead' });
  });
  it('plugin:planner → 기획, planner 캐릭터', () => {
    expect(makeRoleResolver(ROLES)('plugin:planner')).toEqual({ role: 'planner', displayName: '기획', characterId: 'planner' });
  });
  it('unknown-bot → 원문 이름, 기본 캐릭터(null = 사각형)', () => {
    expect(roleInfoFor('unknown-bot', ROLES)).toEqual({ role: 'unknown-bot', displayName: 'unknown-bot', characterId: null });
  });
  it('캐릭터 없는 역할은 characterId null', () => {
    expect(roleInfoFor('qa', ROLES)).toEqual({ role: 'qa', displayName: 'QA', characterId: null });
  });
  it('roles가 비어도 lead는 "책임자"', () => {
    expect(roleInfoFor(null, {})).toEqual({ role: 'lead', displayName: '책임자', characterId: null });
  });
});

function cfg(rows: SpriteConfig['rows'], fps = 6): SpriteConfig {
  return { image: 'sheet.png', frameWidth: 16, frameHeight: 16, fps, rows };
}

describe('resolveAction (D-19)', () => {
  const idleOnly = cfg([
    { action: 'idle', direction: 'down', frames: 4 },
    { action: 'walk', direction: 'down', frames: 6, fps: 10 },
  ]);

  it('sit_work가 없으면 idle 줄·프레임', () => {
    expect(resolveAction(idleOnly, 'sit_work')).toEqual({ row: 0, frames: 4, fps: 6 });
  });
  it('있는 동작은 그 줄, 줄별 fps 우선', () => {
    expect(resolveAction(idleOnly, 'walk')).toEqual({ row: 1, frames: 6, fps: 10 });
  });
  it('sit_work 없음 + sit 있음 → sit', () => {
    const c = cfg([
      { action: 'idle', direction: 'down', frames: 4 },
      { action: 'sit', direction: 'down', frames: 2 },
    ]);
    expect(resolveAction(c, 'sit_work')).toEqual({ row: 1, frames: 2, fps: 6 });
  });
  it('요청 방향 → down → 체인 순서', () => {
    const c = cfg([
      { action: 'idle', direction: 'left', frames: 1 },
      { action: 'sit', direction: 'down', frames: 2 },
      { action: 'sit_work', direction: 'up', frames: 3 },
    ]);
    expect(resolveAction(c, 'sit_work', 'up')).toEqual({ row: 2, frames: 3, fps: 6 });
    // left: sit_work(left, down) 없음 → sit(left 없음, down 있음)
    expect(resolveAction(c, 'sit_work', 'left')).toEqual({ row: 1, frames: 2, fps: 6 });
    // idle 요청 left는 left 줄
    expect(resolveAction(c, 'idle', 'left')).toEqual({ row: 0, frames: 1, fps: 6 });
    // idle down 없음 → null
    expect(resolveAction(c, 'idle', 'down')).toBeNull();
  });
  it('alert·done·walk 체인은 자기 자신 → idle', () => {
    expect(actionChain('alert')).toEqual(['alert', 'idle']);
    expect(actionChain('done')).toEqual(['done', 'idle']);
    expect(actionChain('walk')).toEqual(['walk', 'idle']);
    expect(actionChain('sit_work')).toEqual(['sit_work', 'sit', 'idle']);
    expect(resolveAction(idleOnly, 'alert')).toEqual({ row: 0, frames: 4, fps: 6 });
  });
  it('끝까지 없으면 null(사각형)', () => {
    expect(resolveAction(cfg([{ action: 'walk', direction: 'down', frames: 2 }]), 'sit_work')).toBeNull();
  });
});

describe('parseSpriteConfig', () => {
  it('올바른 설정, direction·fps 기본값', () => {
    const r = parseSpriteConfig({ image: 'a.png', frameWidth: 48, frameHeight: 64, rows: [{ action: 'idle', frames: 4 }] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.config.fps).toBe(6);
      expect(r.config.rows[0].direction).toBe('down');
    }
  });
  it.each([
    ['경로가 든 그림 이름', { image: '../x.png', frameWidth: 1, frameHeight: 1, rows: [{ action: 'idle', frames: 1 }] }],
    ['하위 폴더', { image: 'a/b.png', frameWidth: 1, frameHeight: 1, rows: [{ action: 'idle', frames: 1 }] }],
    ['png/webp 아님', { image: 'a.gif', frameWidth: 1, frameHeight: 1, rows: [{ action: 'idle', frames: 1 }] }],
    ['모르는 동작', { image: 'a.png', frameWidth: 1, frameHeight: 1, rows: [{ action: 'dance', frames: 1 }] }],
    ['frames 0', { image: 'a.png', frameWidth: 1, frameHeight: 1, rows: [{ action: 'idle', frames: 0 }] }],
    ['rows 없음', { image: 'a.png', frameWidth: 1, frameHeight: 1, rows: [] }],
    ['문자열 크기', { image: 'a.png', frameWidth: '16', frameHeight: 1, rows: [{ action: 'idle', frames: 1 }] }],
  ])('%s → 실패', (_n, raw) => {
    expect(parseSpriteConfig(raw).ok).toBe(false);
  });
});
