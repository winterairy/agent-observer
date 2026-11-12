/**
 * Playwright(설계 13·14절, 6.6). Chromium만. 서버는 테스트용 env로 띄운다.
 * - 3100: 메인 서버(next build 후 start). 새 임시 데이터 폴더, 테스트용 토큰·비밀번호, 임시 캐릭터 폴더.
 * - 3101: "마지막 측정 42분 전" 확인용. 시작 전에 state.json(schemaVersion 2)을 써 둔다(설계 6.6).
 * 임시 폴더·비밀값은 설정 파일이 처음 읽힐 때 한 번 만들고 process.env로 워커에 넘긴다(워커가 다시 만들지 않게).
 * 실제 토큰·비밀번호·수집 데이터는 쓰지 않는다.
 */
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defineConfig } from '@playwright/test';

const ROOT = process.cwd();

function once(name: string, make: () => string): string {
  if (!process.env[name]) process.env[name] = make();
  return process.env[name] as string;
}

const tmpRoot = once('E2E_TMP', () => fs.mkdtempSync(path.join(os.tmpdir(), 'obs-e2e-')));
const token = once('E2E_TOKEN', () => `e2e-${randomBytes(16).toString('hex')}`);
const password = once('E2E_PASSWORD', () => `pw-${randomBytes(8).toString('hex')}`);
const dataDir = once('E2E_DATA_DIR', () => {
  const d = path.join(tmpRoot, 'data');
  fs.mkdirSync(d, { recursive: true });
  return d;
});
const charsDir = once('E2E_CHARS_DIR', () => {
  // 예시 캐릭터(코드로 만든 단색 테스트 그림)를 복사하고 lead에 지정한다
  const d = path.join(tmpRoot, 'characters');
  fs.cpSync(path.join(ROOT, 'config', 'characters.example', 'sample'), path.join(d, 'sample'), { recursive: true });
  const roles = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'roles.example.json'), 'utf8'));
  roles.lead.character = 'sample';
  fs.writeFileSync(path.join(d, 'roles.json'), JSON.stringify(roles));
  return d;
});
const seedDir = once('E2E_SEED_DIR', () => {
  const d = path.join(tmpRoot, 'seed');
  fs.mkdirSync(d, { recursive: true });
  const now = Date.now();
  const state = {
    schemaVersion: 2,
    seq: 0,
    sessions: {},
    events: {},
    planUsage: {
      five_hour: { usedPercentage: 42, resetsAtSec: Math.floor(now / 1000) + 2 * 3600, receivedTs: now - 42 * 60_000, remote: false },
      seven_day: null,
    },
  };
  fs.writeFileSync(path.join(d, 'state.json'), JSON.stringify(state));
  return d;
});

const chromium = process.env.PW_CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const serverEnv = (dir: string) => ({
  OBSERVER_TOKEN: token,
  OBSERVER_PASSWORD: password,
  OBSERVER_STORE: 'file',
  OBSERVER_DATA_DIR: dir,
  OBSERVER_CHARACTERS_DIR: charsDir,
  NEXT_TELEMETRY_DISABLED: '1',
});

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    launchOptions: chromium ? { executablePath: chromium } : {},
  },
  projects: [
    // 플랜 사용량 화면 상태는 보내는 순서가 결과를 정하므로(D-27) 다른 테스트보다 먼저 빈 서버에서 돌린다
    { name: 'plan-screen', testMatch: /plan-usage-screen\.spec\.ts/ },
    { name: 'main', testIgnore: /plan-usage-screen\.spec\.ts/, dependencies: ['plan-screen'] },
  ],
  webServer: [
    {
      command: 'pnpm build && pnpm exec next start -H 127.0.0.1 -p 3100',
      url: 'http://127.0.0.1:3100/login',
      env: serverEnv(dataDir),
      reuseExistingServer: false,
      timeout: 240_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'node e2e/wait-for.mjs http://127.0.0.1:3100/login && pnpm exec next start -H 127.0.0.1 -p 3101',
      url: 'http://127.0.0.1:3101/login',
      env: serverEnv(seedDir),
      reuseExistingServer: false,
      timeout: 300_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});
