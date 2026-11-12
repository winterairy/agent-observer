/**
 * statusLine 수집 스크립트(T1-8 (가), 설계 6.6 "스크립트"). 이 저장소의 설치 사본
 * `.claude/team/observe/statusline.mjs`(dev-team-kit 0.1.3, 수정 금지)를 node로 실행해 서버 쪽에서 확인한다.
 * - 받는 쪽: 테스트 안 node:http 서버(127.0.0.1 임의 포트).
 * - "보냄"은 최대 3초 폴링, "안 보냄"은 디버그 stderr에 본문 없음 + 1초 기다려 요청 0개.
 * - 시각 조절: 상태 파일 plan-usage.json의 lastSentAt을 과거로 고쳐 쓴다(스크립트에 시계 주입 없음).
 * - 멈춤 판단 지문은 설치 사본의 FINGERPRINT_IGNORE(cost.total_duration_ms)를 빼고 계산하므로, 재개가 필요할 때는
 *   설계 6.6의 cost.total_duration_ms 대신 cost.total_api_duration_ms를 바꾼다.
 * 감싸기·멈춤 묶음은 사본과 statusline.json을 임시 폴더에 복사해 실행한다(사본은 읽기만 한다).
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const INSTALLED = path.join(process.cwd(), '.claude', 'team', 'observe', 'statusline.mjs');
if (!fs.existsSync(INSTALLED)) {
  throw new Error(`${INSTALLED}이 없습니다. dev-team-kit을 설치(0.1.3 이상)해 statusline.mjs 사본을 받은 뒤 실행하세요.`);
}

type Mod = {
  extractRateLimits: (i: unknown) => Record<string, { used_percentage: number; resets_at: number }>;
  decideSend: (s: unknown, c: unknown, now: number, o?: { minIntervalMs?: number }) => boolean;
  formatDefault: (c: unknown) => string;
  sessionKeyOf: (i: unknown, cwd?: string) => string;
  inputFingerprint: (raw: string) => string;
  buildBody: (c: unknown, env?: NodeJS.ProcessEnv, now?: Date) => Record<string, unknown>;
  FINGERPRINT_IGNORE: string[][];
};
let mod: Mod;

const TOKEN = `sl-test-${Math.random().toString(36).slice(2)}-0123456789`;
const RESET5 = 1_794_398_400;
const RESET7 = 1_794_700_800;
const posix = process.platform !== 'win32';

interface Req {
  url: string;
  auth: string | undefined;
  body: string;
}
const received: Req[] = [];
let server: http.Server;
let hangServer: http.Server;
let port = 0;
let hangPort = 0;
let root = '';

beforeAll(async () => {
  mod = (await import(pathToFileURL(INSTALLED).href)) as Mod;
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'obs-sl-'));
  server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      received.push({ url: req.url ?? '', auth: req.headers.authorization, body });
      res.writeHead(202, { 'content-type': 'application/json' }).end('{"ok":true}');
    });
  });
  hangServer = http.createServer(() => {
    /* 받기만 하고 응답하지 않는다 */
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  await new Promise<void>((r) => hangServer.listen(0, '127.0.0.1', r));
  port = (server.address() as AddressInfo).port;
  hangPort = (hangServer.address() as AddressInfo).port;
});

afterAll(async () => {
  hangServer.closeAllConnections();
  await new Promise((r) => hangServer.close(r));
  await new Promise((r) => server.close(r));
  fs.rmSync(root, { recursive: true, force: true });
});

let dir = '';
/** 테스트마다 토큰을 바꿔 앞 테스트의 늦게 도착한 전송과 섞이지 않게 한다 */
let testToken = TOKEN;
const mine = () => received.filter((r) => r.auth === `Bearer ${testToken}`);
beforeEach(() => {
  testToken = `${TOKEN}-${Math.random().toString(36).slice(2)}`;
  dir = fs.mkdtempSync(path.join(root, 't-'));
  fs.mkdirSync(path.join(dir, 'tmp'));
  fs.mkdirSync(path.join(dir, 'home'));
  fs.mkdirSync(path.join(dir, 'cwd'));
  received.length = 0;
});

function envFor(over: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const k of ['AGENT_OBSERVER_DISABLE', 'CLAUDE_CODE_REMOTE', 'AGENT_OBSERVER_STATUSLINE_INNER', 'AGENT_OBSERVER_URL', 'AGENT_OBSERVER_TOKEN']) delete env[k];
  const out: NodeJS.ProcessEnv = {
    ...env,
    AGENT_OBSERVER_URL: `http://127.0.0.1:${port}`,
    AGENT_OBSERVER_TOKEN: testToken,
    AGENT_OBSERVER_DEBUG: '1',
    TMPDIR: path.join(dir, 'tmp'),
    HOME: path.join(dir, 'home'),
    CLAUDE_CONFIG_DIR: path.join(dir, 'home'),
    NO_PROXY: '127.0.0.1,localhost',
    no_proxy: '127.0.0.1,localhost',
    COUNT_FILE: path.join(dir, 'count'),
  };
  for (const [k, v] of Object.entries(over)) {
    if (v === undefined) delete out[k];
    else out[k] = v;
  }
  return out;
}

interface Run {
  code: number | null;
  stdout: string;
  stderr: string;
  ms: number;
}

function run(stdin: string, opts: { env?: NodeJS.ProcessEnv; script?: string; cwd?: string } = {}): Promise<Run> {
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [opts.script ?? INSTALLED], {
      env: opts.env ?? envFor(),
      cwd: opts.cwd ?? path.join(dir, 'cwd'),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => (stdout += c));
    child.stderr.on('data', (c) => (stderr += c));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr, ms: Date.now() - t0 }));
    child.stdin.end(stdin);
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitSent(n: number): Promise<void> {
  const until = Date.now() + 3000;
  while (mine().length < n && Date.now() < until) await sleep(50);
  expect(mine().length).toBe(n);
}

/** 안 보냄: 디버그 stderr에 본문 없음 + 1초 기다려 새 요청 0개 */
async function expectNotSent(r: Run, before: number): Promise<void> {
  expect(r.stderr).not.toContain('"rate_limits"');
  await sleep(1000);
  expect(mine().length).toBe(before);
}

interface StdinOpts {
  sessionId?: string | null;
  five?: [number, number] | null;
  seven?: [number, number] | null;
  apiMs?: number;
  durationMs?: number;
}

/** 실제 Claude Code statusLine 입력 모양(공식 문서 필드) */
function stdin(o: StdinOpts = {}): string {
  const rl: Record<string, unknown> = {};
  const five = o.five === undefined ? [42, RESET5] : o.five;
  const seven = o.seven === undefined ? [13, RESET7] : o.seven;
  if (five) rl.five_hour = { used_percentage: five[0], resets_at: five[1] };
  if (seven) rl.seven_day = { used_percentage: seven[0], resets_at: seven[1] };
  const input: Record<string, unknown> = {
    hook_event_name: 'Status',
    transcript_path: '/home/someone/.claude/projects/secret-proj/abc.jsonl',
    cwd: '/home/someone/secret-proj',
    model: { id: 'claude-opus-5-5', display_name: 'Opus 5.5' },
    workspace: { current_dir: '/home/someone/secret-proj', project_dir: '/home/someone/secret-proj' },
    version: '2.1.322',
    output_style: { name: 'default' },
    cost: {
      total_cost_usd: 0.98765,
      total_duration_ms: o.durationMs ?? 5000,
      total_api_duration_ms: o.apiMs ?? 3000,
      total_lines_added: 1,
      total_lines_removed: 0,
    },
    exceeds_200k_tokens: false,
  };
  if (o.sessionId !== null) input.session_id = o.sessionId ?? 'sess-default';
  if (o.five !== null || o.seven !== null) input.rate_limits = rl;
  return JSON.stringify(input);
}

const stateFile = () => path.join(dir, 'tmp', 'dev-team-kit-observe', 'plan-usage.json');
function shiftLastSent(msAgo: number): void {
  const s = JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
  s.lastSentAt = Date.now() - msAgo;
  fs.writeFileSync(stateFile(), JSON.stringify(s));
}

/** 감싸기용: 사본과 statusline.json을 임시 폴더에 복사 */
function kitCopy(wrapCommand: string | null): string {
  const kit = path.join(dir, 'kit');
  fs.mkdirSync(kit, { recursive: true });
  const script = path.join(kit, 'statusline.mjs');
  fs.copyFileSync(INSTALLED, script);
  if (wrapCommand !== null) {
    fs.writeFileSync(
      path.join(kit, 'statusline.json'),
      JSON.stringify({ v: 1, savedAt: new Date().toISOString(), wrap: { type: 'command', command: wrapCommand } }),
    );
  }
  return script;
}

/** 실행할 때마다 count 파일에 한 줄 덧붙이고 LINE-<줄 수>를 출력 */
const COUNT_CMD = `echo x >> "$COUNT_FILE"; printf 'LINE-%s\\n' "$(wc -l < "$COUNT_FILE" | tr -d ' ')"`;
const countLines = () => (fs.existsSync(path.join(dir, 'count')) ? fs.readFileSync(path.join(dir, 'count'), 'utf8').split('\n').filter(Boolean).length : 0);

// ---------------------------------------------------------------------------

describe('순수 함수(설치 사본을 import)', () => {
  it('extractRateLimits: 두 창, 틀린 창은 없는 것으로, spend_limit 무시', () => {
    expect(mod.extractRateLimits(JSON.parse(stdin()))).toEqual({
      five_hour: { used_percentage: 42, resets_at: RESET5 },
      seven_day: { used_percentage: 13, resets_at: RESET7 },
    });
    expect(
      mod.extractRateLimits({
        rate_limits: { five_hour: { used_percentage: 101, resets_at: 1 }, seven_day: { used_percentage: 5, resets_at: 1.5 }, spend_limit: { x: 1 } },
      }),
    ).toEqual({});
    expect(mod.extractRateLimits(null)).toEqual({});
  });

  it('decideSend: 처음 보냄, 1분 안 안 보냄, 바뀐 값은 1분 뒤, 같은 값은 재전송 없음, 시계 역행', () => {
    const cur = { five_hour: { used_percentage: 42, resets_at: RESET5 } };
    const now = 10_000_000;
    expect(mod.decideSend(null, cur, now)).toBe(true);
    const st = { lastSentAt: now, lastSent: cur };
    expect(mod.decideSend(st, cur, now + 59_000)).toBe(false);
    const changed = { five_hour: { used_percentage: 43, resets_at: RESET5 } };
    expect(mod.decideSend(st, changed, now + 59_999)).toBe(false);
    expect(mod.decideSend(st, changed, now + 60_000)).toBe(true);
    expect(mod.decideSend(st, cur, now + 24 * 3600_000)).toBe(false);
    expect(mod.decideSend(st, changed, now - 1000)).toBe(true);
    expect(mod.decideSend(st, {}, now + 120_000)).toBe(false);
  });

  it('formatDefault: 있는 창만, 반올림, 없으면 빈 줄', () => {
    expect(mod.formatDefault({ five_hour: { used_percentage: 41.6 }, seven_day: { used_percentage: 13 } })).toBe('5h 42% · 7d 13%\n');
    expect(mod.formatDefault({ seven_day: { used_percentage: 13 } })).toBe('7d 13%\n');
    expect(mod.formatDefault({})).toBe('\n');
  });

  it('sessionKeyOf·inputFingerprint', () => {
    expect(mod.sessionKeyOf({ session_id: 'A' })).toMatch(/^s-[0-9a-f]{32}$/);
    expect(mod.sessionKeyOf({ session_id: 'A' })).toBe(mod.sessionKeyOf({ session_id: 'A' }));
    expect(mod.sessionKeyOf({}, '/x')).toMatch(/^c-[0-9a-f]{32}$/);
    expect(mod.sessionKeyOf(null, '/x')).not.toBe(mod.sessionKeyOf(null, '/y'));
    const raw = stdin();
    expect(mod.inputFingerprint(raw)).toBe(mod.inputFingerprint(raw));
    expect(mod.inputFingerprint(raw)).not.toBe(mod.inputFingerprint(stdin({ apiMs: 3001 })));
    expect(mod.inputFingerprint('not json')).not.toBe(mod.inputFingerprint('not jsoN'));
    // 설치 사본은 한가할 때 바뀌는 경과 시간(cost.total_duration_ms)을 지문에서 뺀다
    expect(mod.FINGERPRINT_IGNORE).toEqual([['cost', 'total_duration_ms']]);
    expect(mod.inputFingerprint(stdin({ durationMs: 1 }))).toBe(mod.inputFingerprint(stdin({ durationMs: 999_999 })));
  });

  it('buildBody: v, ts, remote, rate_limits만', () => {
    const b = mod.buildBody(mod.extractRateLimits(JSON.parse(stdin())), { CLAUDE_CODE_REMOTE: 'true' } as unknown as NodeJS.ProcessEnv, new Date(0));
    expect(Object.keys(b).sort()).toEqual(['rate_limits', 'remote', 'ts', 'v']);
    expect(b.remote).toBe(true);
  });
});

describe.skipIf(!posix)('전송 조건(설치 사본 실행)', () => {
  it('첫 실행 1회 전송: 경로·Bearer·본문 키, stdin의 경로·모델·비용 없음', async () => {
    const r = await run(stdin());
    expect(r.code).toBe(0);
    expect(r.stdout).toBe('5h 42% · 7d 13%\n');
    await waitSent(1);
    const q = mine()[0];
    expect(q.url).toBe('/api/plan-usage/report');
    expect(q.auth).toBe(`Bearer ${testToken}`);
    const body = JSON.parse(q.body);
    expect(Object.keys(body).sort()).toEqual(['rate_limits', 'remote', 'ts', 'v']);
    expect(body.v).toBe(1);
    expect(body.remote).toBe(false);
    expect(body.rate_limits).toEqual({
      five_hour: { used_percentage: 42, resets_at: RESET5 },
      seven_day: { used_percentage: 13, resets_at: RESET7 },
    });
    for (const w of Object.values(body.rate_limits) as object[]) expect(Object.keys(w).sort()).toEqual(['resets_at', 'used_percentage']);
    for (const leak of ['secret-proj', 'abc.jsonl', 'opus', 'Opus', '0.98765', 'sess-default', 'total_']) expect(q.body).not.toContain(leak);
    // 디버그 stderr의 본문도 같다
    expect(r.stderr).toContain('"rate_limits"');
    expect(r.stderr).not.toContain('secret-proj');
  });

  it('같은 값 1분 안 재실행 안 보냄 / 바뀐 값 1분 안 안 보냄 → 61초 뒤 1회 / 같은 값 61초 후 안 보냄 / 24시간 뒤에도 재전송 없음', async () => {
    await run(stdin({ apiMs: 1 }));
    await waitSent(1);
    // 같은 rate_limits, 다른 stdin(재개되도록) → 1분 안이라 안 보냄
    await expectNotSent(await run(stdin({ apiMs: 2 })), 1);
    // 바뀐 값 1분 안 → 안 보냄
    await expectNotSent(await run(stdin({ apiMs: 3, five: [50, RESET5] })), 1);
    // 1분 지난 것으로 → 바뀐 값 1회
    shiftLastSent(61_000);
    const r = await run(stdin({ apiMs: 4, five: [50, RESET5] }));
    await waitSent(2);
    expect(JSON.parse(mine()[1].body).rate_limits.five_hour.used_percentage).toBe(50);
    expect(r.code).toBe(0);
    // 같은 값, 61초 뒤 → 안 보냄
    shiftLastSent(61_000);
    await expectNotSent(await run(stdin({ apiMs: 5, five: [50, RESET5] })), 2);
    // 같은 값, 24시간 뒤 → 재전송 없음
    shiftLastSent(24 * 3600_000);
    await expectNotSent(await run(stdin({ apiMs: 6, five: [50, RESET5] })), 2);
  });

  it('rate_limits 없음, JSON 아님 → 안 보냄, exit 0', async () => {
    const a = await run(stdin({ five: null, seven: null }));
    expect(a.code).toBe(0);
    expect(a.stdout).toBe('\n');
    await expectNotSent(a, 0);
    const b = await run('this is not json');
    expect(b.code).toBe(0);
    await expectNotSent(b, 0);
    const c = await run('');
    expect(c.code).toBe(0);
  });

  it('seven_day만 있으면 seven_day만 보낸다', async () => {
    const r = await run(stdin({ five: null }));
    expect(r.stdout).toBe('7d 13%\n');
    await waitSent(1);
    expect(Object.keys(JSON.parse(mine()[0].body).rate_limits)).toEqual(['seven_day']);
  });

  it('응답하지 않는 서버로 설정해도 1초 안에 출력하고 exit 0', async () => {
    const r = await run(stdin(), { env: envFor({ AGENT_OBSERVER_URL: `http://127.0.0.1:${hangPort}` }) });
    expect(r.code).toBe(0);
    expect(r.stdout).toBe('5h 42% · 7d 13%\n');
    expect(r.ms).toBeLessThan(1000);
  });

  it('URL 없음·DISABLE=1 → 안 보냄, 기본 한 줄은 출력', async () => {
    const a = await run(stdin({ sessionId: 'no-url' }), { env: envFor({ AGENT_OBSERVER_URL: undefined }) });
    expect(a.stdout).toBe('5h 42% · 7d 13%\n');
    await expectNotSent(a, 0);
    const b = await run(stdin({ sessionId: 'disabled' }), { env: envFor({ AGENT_OBSERVER_DISABLE: '1' }) });
    expect(b.stdout).toBe('5h 42% · 7d 13%\n');
    await expectNotSent(b, 0);
  });

  it('동시 3개 실행(바뀐 값) → 전송 최대 1회', async () => {
    const rs = await Promise.all([1, 2, 3].map((i) => run(stdin({ sessionId: `c${i}`, five: [60 + i, RESET5] }))));
    for (const r of rs) expect(r.code).toBe(0);
    await sleep(1500);
    expect(mine().length).toBeLessThanOrEqual(1);
    expect(mine().length).toBe(1);
  });
});

describe.skipIf(!posix)('멈춤·재개(감싼 명령 count)', () => {
  it('(멈춤) 같은 stdin이면 감싼 명령을 실행하지 않고 직전 출력, 전송 없음. 61초 뒤에도 멈춤', async () => {
    const script = kitCopy(COUNT_CMD);
    const A = stdin({ sessionId: 'A' });
    const r1 = await run(A, { script });
    expect(r1.stdout).toBe('LINE-1\n');
    expect(countLines()).toBe(1);
    await waitSent(1);
    const r2 = await run(A, { script });
    expect(r2.code).toBe(0);
    expect(r2.stdout).toBe('LINE-1\n');
    expect(countLines()).toBe(1);
    await expectNotSent(r2, 1);
    shiftLastSent(61_000);
    const r3 = await run(A, { script });
    expect(r3.stdout).toBe('LINE-1\n');
    expect(countLines()).toBe(1);
    await expectNotSent(r3, 1);
  });

  it('(재개) rate_limits 외 값만 바뀌어도 감싼 명령이 다시 실행되고, 값이 바뀌고 1분이 지나면 보낸다', async () => {
    const script = kitCopy(COUNT_CMD);
    await run(stdin({ sessionId: 'A' }), { script });
    await waitSent(1);
    const r2 = await run(stdin({ sessionId: 'A', apiMs: 4321 }), { script });
    expect(r2.stdout).toBe('LINE-2\n');
    expect(countLines()).toBe(2);
    await expectNotSent(r2, 1); // rate_limits 같음
    shiftLastSent(61_000);
    const r3 = await run(stdin({ sessionId: 'A', apiMs: 4321, five: [77, RESET5] }), { script });
    expect(r3.stdout).toBe('LINE-3\n');
    await waitSent(2);
    expect(JSON.parse(mine()[1].body).rate_limits.five_hour.used_percentage).toBe(77);
  });

  it('(멈춤) 경과 시간(cost.total_duration_ms)만 바뀐 stdin도 멈춘다(설치 사본의 FINGERPRINT_IGNORE)', async () => {
    const script = kitCopy(COUNT_CMD);
    await run(stdin({ sessionId: 'A', durationMs: 1000 }), { script });
    const r = await run(stdin({ sessionId: 'A', durationMs: 65_000 }), { script });
    expect(r.stdout).toBe('LINE-1\n');
    expect(countLines()).toBe(1);
  });

  it('(세션별) A가 멈춘 동안 B는 평소대로, 이어서 A는 계속 멈추고 A의 직전 출력', async () => {
    const script = kitCopy(COUNT_CMD);
    const A = stdin({ sessionId: 'A' });
    await run(A, { script });
    expect((await run(A, { script })).stdout).toBe('LINE-1\n');
    const b = await run(stdin({ sessionId: 'B', apiMs: 99 }), { script });
    expect(b.stdout).toBe('LINE-2\n');
    expect(countLines()).toBe(2);
    const a = await run(A, { script });
    expect(a.stdout).toBe('LINE-1\n');
    expect(countLines()).toBe(2);
  });

  it('(세션 키 대체) session_id가 없으면 cwd로 구분', async () => {
    const script = kitCopy(COUNT_CMD);
    const S = stdin({ sessionId: null });
    const other = path.join(dir, 'cwd2');
    fs.mkdirSync(other);
    await run(S, { script });
    expect((await run(S, { script })).stdout).toBe('LINE-1\n');
    expect((await run(S, { script, cwd: other })).stdout).toBe('LINE-2\n');
    expect(countLines()).toBe(2);
  });

  it('(감싼 명령 없음) 같은 stdin 두 번째도 같은 기본 한 줄, 전송 없음', async () => {
    const S = stdin({ sessionId: 'plain' });
    const r1 = await run(S);
    await waitSent(1);
    const r2 = await run(S);
    expect(r2.stdout).toBe(r1.stdout);
    expect(r2.stdout).toBe('5h 42% · 7d 13%\n');
    await expectNotSent(r2, 1);
  });

  it('(정리) 25시간 지난 다른 세션 파일은 지워지고 이번 세션 파일은 남는다. 세션 파일에 경로가 없다', async () => {
    const sdir = path.join(dir, 'tmp', 'dev-team-kit-observe', 'statusline-sessions');
    fs.mkdirSync(sdir, { recursive: true });
    const old = path.join(sdir, 's-old.json');
    fs.writeFileSync(old, '{"v":1,"fp":"x","output":"y","at":0}');
    const t = (Date.now() - 25 * 3600_000) / 1000;
    fs.utimesSync(old, t, t);
    await run(stdin({ sessionId: 'prune' }));
    expect(fs.existsSync(old)).toBe(false);
    const key = mod.sessionKeyOf({ session_id: 'prune' });
    const mine = path.join(sdir, `${key}.json`);
    expect(fs.existsSync(mine)).toBe(true);
    const text = fs.readFileSync(mine, 'utf8');
    for (const leak of ['secret-proj', 'abc.jsonl', 'opus']) expect(text).not.toContain(leak);
    expect(Object.keys(JSON.parse(text)).sort()).toEqual(['at', 'fp', 'output', 'v']);
  });
});

describe.skipIf(!posix)('감싸기', () => {
  it("printf 'MY-LINE' → stdout이 정확히 MY-LINE\\n, 전송도 됨", async () => {
    const script = kitCopy("printf 'MY-LINE\\n'");
    const r = await run(stdin(), { script });
    expect(r.stdout).toBe('MY-LINE\n');
    await waitSent(1);
  });

  it('exit 3 → 기본 한 줄, 전송 조건 그대로', async () => {
    const script = kitCopy('echo nope; exit 3');
    const r = await run(stdin(), { script });
    expect(r.code).toBe(0);
    expect(r.stdout).toBe('5h 42% · 7d 13%\n');
    await waitSent(1);
  });

  it('sleep 5 → 2.5초 안에 기본 한 줄, exit 0', async () => {
    const script = kitCopy('sleep 5; echo late');
    const r = await run(stdin(), { script });
    expect(r.code).toBe(0);
    expect(r.ms).toBeLessThan(2500);
    expect(r.stdout).toBe('5h 42% · 7d 13%\n');
  });

  it('statusline.json 없이 CLAUDE_CONFIG_DIR/settings.json의 statusLine을 감싼다', async () => {
    const script = kitCopy(null);
    fs.writeFileSync(path.join(dir, 'home', 'settings.json'), JSON.stringify({ statusLine: { type: 'command', command: "printf 'USER-LINE'" } }));
    const r = await run(stdin(), { script });
    expect(r.stdout).toBe('USER-LINE');
  });

  it('감쌀 명령이 statusline.mjs 자신이면 무한 실행 없이 끝난다', async () => {
    const self = `node "${path.join(dir, 'x', '.claude', 'team', 'observe', 'statusline.mjs')}"`;
    const script = kitCopy(self);
    const r = await run(stdin(), { script });
    expect(r.code).toBe(0);
    expect(r.ms).toBeLessThan(2500);
    expect(r.stdout).toBe('5h 42% · 7d 13%\n');
  });
});
