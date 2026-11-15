/** E2E 공용 도우미. 값은 playwright.config.ts가 만든 테스트용 값이다. */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const BASE = 'http://127.0.0.1:3100';
export const TOKEN = process.env.E2E_TOKEN as string;
export const PASSWORD = process.env.E2E_PASSWORD as string;
export const SCREENS = path.join(process.cwd(), 'docs', 'team', 'reports', 'screens', 'qa');
export const OBSERVE = path.join(process.cwd(), '.claude', 'team', 'observe', 'observe.mjs');
export const STATUSLINE = path.join(process.cwd(), '.claude', 'team', 'observe', 'statusline.mjs');

export function requireFile(file: string): void {
  if (!fs.existsSync(file)) throw new Error(`${file}이 없습니다. dev-team-kit 설치 사본이 있어야 이 테스트를 돌릴 수 있습니다.`);
}

export function tmpDir(prefix: string): string {
  return fs.mkdtempSync(path.join(process.env.E2E_TMP || os.tmpdir(), prefix));
}

/** 서버로 보내는 자식 프로세스 env: 프록시 우회, 상태 파일 격리, 사용자 설정 격리 */
export function senderEnv(dir: string, over: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const k of ['AGENT_OBSERVER_DISABLE', 'CLAUDE_CODE_REMOTE', 'AGENT_OBSERVER_STATUSLINE_INNER', 'AGENT_OBSERVER_DEBUG']) delete env[k];
  const tmp = path.join(dir, 'tmp');
  const home = path.join(dir, 'home');
  fs.mkdirSync(tmp, { recursive: true });
  fs.mkdirSync(home, { recursive: true });
  return {
    ...env,
    AGENT_OBSERVER_URL: BASE,
    AGENT_OBSERVER_TOKEN: TOKEN,
    TMPDIR: tmp,
    HOME: home,
    CLAUDE_CONFIG_DIR: home,
    NO_PROXY: '127.0.0.1,localhost',
    no_proxy: '127.0.0.1,localhost',
    ...over,
  };
}

/** node 스크립트에 stdin을 넣어 실행하고 끝날 때까지 기다린다 */
export function runNode(script: string, stdin: string, env: NodeJS.ProcessEnv, cwd?: string): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], { env, cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (c) => (stdout += c));
    child.stderr.on('data', (c) => (stderr += c));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(stdin);
  });
}

export async function postEvent(request: APIRequestContext, body: Record<string, unknown>, token = TOKEN): Promise<number> {
  const res = await request.post(`${BASE}/api/events`, {
    headers: { authorization: `Bearer ${token}` },
    data: { v: 1, ts: new Date().toISOString(), agent_id: null, agent_type: null, branch: 'main', remote: false, ...body },
  });
  return res.status();
}

export async function postPlan(request: APIRequestContext, windows: Record<string, { used_percentage: number; resets_at: number }>, base = BASE): Promise<number> {
  const res = await request.post(`${base}/api/plan-usage/report`, {
    headers: { authorization: `Bearer ${TOKEN}` },
    data: { v: 1, ts: new Date().toISOString(), remote: false, rate_limits: windows },
  });
  return res.status();
}

/** API 요청용 로그인(쿠키는 request 컨텍스트에 남는다) */
export async function apiLogin(request: APIRequestContext, base = BASE): Promise<void> {
  const res = await request.post(`${base}/api/auth/login`, { data: { password: PASSWORD } });
  expect(res.status()).toBe(204);
}

/** 화면 로그인: /login에서 비밀번호 입력 후 대시보드 */
export async function uiLogin(page: Page, base = BASE, next = '/'): Promise<void> {
  await page.goto(`${base}${next}`);
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('비밀번호').fill(PASSWORD);
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page.getByRole('heading', { name: '세션 목록' })).toBeVisible();
}

export async function noHorizontalScroll(page: Page): Promise<void> {
  const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(sw).toBeLessThanOrEqual(cw);
}

export const nowSec = () => Math.floor(Date.now() / 1000);
