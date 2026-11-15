/**
 * T1-6 GET /api/characters, GET /api/characters/[id]/image (쿠키 있음).
 * 임시 폴더를 OBSERVER_CHARACTERS_DIR로 두고 config/characters.example/sample을 복사해 쓴다.
 */
import { cp, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as CHARACTERS } from '../../app/api/characters/route';
import { GET as CHAR_IMAGE } from '../../app/api/characters/[id]/image/route';
import { SECRET, get, login, setAuthEnv } from '../helpers/auth';

let dir = '';
let cookie = '';
const p = (id: string) => ({ params: Promise.resolve({ id }) });

beforeAll(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'obs-chars-'));
  await cp(path.join(process.cwd(), 'config', 'characters.example', 'sample'), path.join(dir, 'sample'), { recursive: true });
  // 깨진 JSON
  await mkdir(path.join(dir, 'broken'));
  await writeFile(path.join(dir, 'broken', 'character.json'), '{ not json');
  // 그림 파일 없음
  await mkdir(path.join(dir, 'noimage'));
  await writeFile(
    path.join(dir, 'noimage', 'character.json'),
    JSON.stringify({ image: 'missing.png', frameWidth: 16, frameHeight: 16, rows: [{ action: 'idle', frames: 1 }] }),
  );
  await writeFile(path.join(dir, 'secret.png'), 'outside');
  await writeFile(
    path.join(dir, 'roles.json'),
    JSON.stringify({
      lead: { name: '책임자', character: 'sample' },
      qa: { name: 'QA', character: 'broken' },
      developer: { name: '개발', character: 'noimage' },
      planner: { name: '기획', character: 'ghost' },
      designer: { name: '디자인' },
    }),
  );
  process.env.OBSERVER_CHARACTERS_DIR = dir;
});

afterAll(async () => {
  delete process.env.OBSERVER_CHARACTERS_DIR;
  await rm(dir, { recursive: true, force: true });
});

beforeEach(async () => {
  setAuthEnv({ secret: SECRET });
  cookie = await login();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('GET /api/characters', () => {
  it('역할 목록과 캐릭터별 ok, 대체가 적용된 동작', async () => {
    const res = await CHARACTERS(get('/api/characters', { cookie }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.roles).toEqual({
      lead: { displayName: '책임자', characterId: 'sample' },
      qa: { displayName: 'QA', characterId: 'broken' },
      developer: { displayName: '개발', characterId: 'noimage' },
      planner: { displayName: '기획', characterId: 'ghost' },
      designer: { displayName: '디자인', characterId: null },
    });
    expect(body.default).toEqual({ characterId: null });
    expect(body.characters.sample).toEqual({
      ok: true,
      image: '/api/characters/sample/image',
      frameWidth: 16,
      frameHeight: 16,
      actions: {
        idle_down: { row: 0, frames: 2, fps: 4 },
        // sit_work·sit·walk·done은 없으므로 idle로 대체
        sit_work_down: { row: 0, frames: 2, fps: 4 },
        sit_down: { row: 0, frames: 2, fps: 4 },
        walk_down: { row: 0, frames: 2, fps: 4 },
        done_down: { row: 0, frames: 2, fps: 4 },
        alert_down: { row: 1, frames: 2, fps: 6 },
      },
    });
    // 깨진 JSON, 그림 없음, 폴더 없음 → ok:false. 경로·오류 메시지는 응답에 없다
    expect(body.characters.broken).toEqual({ ok: false });
    expect(body.characters.noimage).toEqual({ ok: false });
    expect(body.characters.ghost).toEqual({ ok: false });
    const text = JSON.stringify(body);
    expect(text).not.toContain(dir);
    expect(text).not.toContain('missing.png');
    expect(console.warn).toHaveBeenCalled();
  });

  it('roles.json이 깨져도 200(역할 없음)', async () => {
    const other = await mkdtemp(path.join(os.tmpdir(), 'obs-chars-bad-'));
    await writeFile(path.join(other, 'roles.json'), '[[[');
    process.env.OBSERVER_CHARACTERS_DIR = other;
    try {
      const res = await CHARACTERS(get('/api/characters', { cookie }));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ roles: {}, default: { characterId: null }, characters: {} });
    } finally {
      process.env.OBSERVER_CHARACTERS_DIR = dir;
      await rm(other, { recursive: true, force: true });
    }
  });

  it('roles.json이 없으면 config/roles.example.json(그림 없음)', async () => {
    const empty = await mkdtemp(path.join(os.tmpdir(), 'obs-chars-empty-'));
    process.env.OBSERVER_CHARACTERS_DIR = empty;
    try {
      const body = await (await CHARACTERS(get('/api/characters', { cookie }))).json();
      expect(body.roles.lead).toEqual({ displayName: '책임자', characterId: null });
      expect(body.roles.qa).toEqual({ displayName: 'QA', characterId: null });
    } finally {
      process.env.OBSERVER_CHARACTERS_DIR = dir;
      await rm(empty, { recursive: true, force: true });
    }
  });
});

describe('GET /api/characters/[id]/image', () => {
  it('png를 보낸다(Cache-Control private)', async () => {
    const res = await CHAR_IMAGE(get('/api/characters/sample/image', { cookie }), p('sample'));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('cache-control')).toBe('private, max-age=60');
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.subarray(1, 4).toString()).toBe('PNG');
  });

  it.each(['..', '../sample', 'Sample', 'a/b', '%2e%2e', 'x'.repeat(65), ''])('id %j → 404', async (id) => {
    const res = await CHAR_IMAGE(get('/api/characters/x/image', { cookie }), p(id));
    expect(res.status).toBe(404);
  });

  it('설정이 깨졌거나 그림이 없거나 없는 캐릭터면 404', async () => {
    for (const id of ['broken', 'noimage', 'ghost']) {
      const res = await CHAR_IMAGE(get(`/api/characters/${id}/image`, { cookie }), p(id));
      expect(res.status).toBe(404);
    }
  });

  it('설정의 image가 폴더 밖을 가리키면 404', async () => {
    await mkdir(path.join(dir, 'escape'), { recursive: true });
    await writeFile(
      path.join(dir, 'escape', 'character.json'),
      JSON.stringify({ image: '../secret.png', frameWidth: 1, frameHeight: 1, rows: [{ action: 'idle', frames: 1 }] }),
    );
    const res = await CHAR_IMAGE(get('/api/characters/escape/image', { cookie }), p('escape'));
    expect(res.status).toBe(404);
  });
});
