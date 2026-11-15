/**
 * 플랜 사용량 화면 5상태(설계 6.6 순서, T1-8 화면 수용 기준). 조회 응답을 가짜로 바꾸지 않고
 * 실제 서버(3100, 새 데이터 폴더)에 POST /api/plan-usage/report로 값을 보내 만든다.
 * D-27 병합 때문에 순서가 결과를 정하므로 serial.
 */
import { expect, test, type Page } from '@playwright/test';
import { apiLogin, nowSec, noHorizontalScroll, postEvent, postPlan, uiLogin } from './helpers';

test.describe.configure({ mode: 'serial' });

const panel = (page: Page) => page.locator('section[aria-labelledby="plan-usage-title"]');
const meter = (page: Page, w: 'five_hour' | 'seven_day') => panel(page).locator(`[data-window="${w}"]`);
const mini = (page: Page) => page.getByTestId('plan-mini');

let page: Page;
let fiveReset = 0;

test.beforeAll(async ({ browser, request }) => {
  await apiLogin(request);
  // 사무실 계기판을 보려면 세션이 하나 있어야 한다(바닥이 그려질 때만 계기판이 있다)
  expect(await postEvent(request, { event: 'PreToolUse', session_id: 'plan-screen-1', project: 'plan-screen', tool: 'Read' })).toBe(202);
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await uiLogin(page);
});

test.afterAll(async () => {
  await page.close();
});

test('1. 없음: 받은 값이 없으면 "플랜 사용량 정보 없음"과 설정 안내, 계기판은 두 창 모두 –', async () => {
  await expect(panel(page).getByRole('heading', { name: '플랜 사용량 정보 없음' })).toBeVisible();
  await expect(panel(page)).toContainText('Claude 구독 계정(Pro·Max 로그인)에서만 값이 있습니다');
  await expect(panel(page)).toContainText('statusLine 스크립트를 설치하면');
  await expect(panel(page).locator('[role="meter"]')).toHaveCount(0);
  await expect(panel(page)).not.toContainText('0%');
  await page.locator('[data-row-link]').first().click();
  await expect(page.getByTestId('office-floor')).toBeVisible();
  // QA-01: 두 창 모두 없음이어도 계기판을 "5h – · 7d –"로 그린다(T1-5)
  await expect(mini(page)).toBeVisible();
  for (const w of ['five_hour', 'seven_day']) {
    await expect(mini(page).locator(`[data-window="${w}"]`)).toHaveAttribute('data-status', 'none');
    await expect(mini(page).locator(`[data-window="${w}"]`)).toContainText('–');
  }
  await expect(mini(page)).not.toContainText('0%');
});

test('2. 만료: 지난 resets_at → "초기화됨 — 다음 작업 때 갱신", 숫자 없음, 다른 창은 "정보 없음"', async ({ request }) => {
  expect(await postPlan(request, { five_hour: { used_percentage: 42, resets_at: nowSec() - 3600 } })).toBe(202);
  const five = meter(page, 'five_hour');
  await expect(five).toHaveAttribute('data-status', 'expired', { timeout: 4000 + 1000 });
  await expect(five).toContainText('초기화됨 — 다음 작업 때 갱신');
  await expect(five).toContainText('마지막 측정 방금');
  await expect(five).not.toContainText('42%');
  await expect(five.locator('[role="meter"]')).toHaveCount(0);
  await expect(meter(page, 'seven_day')).toContainText('정보 없음');
  await expect(mini(page).locator('[data-window="five_hour"]')).toHaveAttribute('data-status', 'expired');
  await expect(mini(page).locator('[data-window="seven_day"]')).toContainText('–');
});

test('3. 정상·재표시: 42% / 13%, 초기화 시각·남은 시간·마지막 측정, "오래됨" 없음', async ({ request }) => {
  fiveReset = nowSec() + 2 * 3600;
  const t0 = Date.now();
  expect(await postPlan(request, { five_hour: { used_percentage: 42, resets_at: fiveReset }, seven_day: { used_percentage: 13, resets_at: nowSec() + 3 * 86400 } })).toBe(202);
  const five = meter(page, 'five_hour');
  await expect(five).toContainText('42%', { timeout: 4000 });
  expect(Date.now() - t0).toBeLessThan(4000);
  await expect(meter(page, 'seven_day')).toContainText('13%');
  await expect(five).toContainText(/\d{2}:\d{2} 초기화|내일 \d{2}:\d{2} 초기화/);
  await expect(five).toContainText(/(1시간 5\d분|2시간) 후/);
  await expect(meter(page, 'seven_day')).toContainText(/\d+월 \d+일\(.\) \d{2}:\d{2} 초기화/);
  await expect(meter(page, 'seven_day')).toContainText(/(2일 23시간|3일 0시간) 후/);
  for (const w of ['five_hour', 'seven_day'] as const) await expect(meter(page, w)).toContainText('마지막 측정 방금');
  const m = five.getByRole('meter');
  await expect(m).toHaveAttribute('aria-valuenow', '42');
  await expect(m).toHaveAttribute('aria-valuetext', /^42%, .*초기화, .*후$/);
  await expect(meter(page, 'seven_day').getByRole('meter')).toHaveAttribute('aria-valuenow', '13');
  await expect(page.locator('body')).not.toContainText('오래됨');
  await expect(five).not.toContainText('한도');
  await expect(mini(page).locator('[data-window="five_hour"]')).toContainText('42%');
  await expect(mini(page).locator('[data-window="seven_day"]')).toContainText('13%');
  await expect(mini(page)).toHaveAttribute('aria-hidden', 'true');
});

test('4. 경고: 80% → "한도 가까움", 100% → "한도 도달"(글자로)', async ({ request }) => {
  expect(await postPlan(request, { five_hour: { used_percentage: 80, resets_at: fiveReset } })).toBe(202);
  const five = meter(page, 'five_hour');
  await expect(five).toContainText('한도 가까움', { timeout: 4000 });
  await expect(five).toContainText('80%');
  await expect(five).toHaveAttribute('data-level', 'near');
  await expect(five.getByRole('meter')).toHaveAttribute('aria-valuetext', /^80%, 한도 가까움, /);
  await expect(meter(page, 'seven_day')).not.toContainText('한도');
  await page.screenshot({ path: test.info().outputPath('near.png') });

  expect(await postPlan(request, { five_hour: { used_percentage: 100, resets_at: fiveReset } })).toBe(202);
  await expect(five).toContainText('한도 도달', { timeout: 4000 });
  await expect(five).toContainText('100%');
  await expect(five).toHaveAttribute('data-level', 'reached');
  await expect(five.getByRole('meter')).toHaveAttribute('aria-valuetext', /^100%, 한도 도달, /);
});

test('프로젝트 필터를 바꿔도 플랜 사용량 값이 같다', async ({ request }) => {
  expect(await postEvent(request, { event: 'PreToolUse', session_id: 'plan-screen-2', project: 'plan-other', tool: 'Read' })).toBe(202);
  await expect(page.locator('#project-filter option', { hasText: 'plan-other' })).toHaveCount(1, { timeout: 5000 });
  const before = await panel(page).innerText();
  await page.locator('#project-filter').selectOption('plan-other');
  await expect(page.locator('[data-row-link]')).toHaveCount(1);
  expect(await panel(page).innerText()).toBe(before);
  await page.locator('#project-filter').selectOption('');
});

test('390·1280에서 가로 스크롤 없이 플랜 사용량 영역이 보인다', async () => {
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(panel(page)).toBeVisible();
    await noHorizontalScroll(page);
    const box = await panel(page).boundingBox();
    expect(box && box.x >= 0 && box.x + box.width <= width).toBeTruthy();
  }
});

test('마지막 측정 42분 전(시작 전에 써 둔 state.json, 3101)', async ({ browser, request }) => {
  await apiLogin(request, 'http://127.0.0.1:3101');
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await uiLogin(p, 'http://127.0.0.1:3101');
  const five = meter(p, 'five_hour');
  await expect(five).toContainText('42%');
  await expect(five).toContainText(/마지막 측정 4[123]분 전/);
  await expect(p.locator('body')).not.toContainText('오래됨');
  await expect(meter(p, 'seven_day')).toContainText('정보 없음');
  // 세션이 하나도 없으면 빈 상태 안내
  await expect(p.getByText('아직 받은 세션이 없습니다')).toBeVisible();
  await expect(p.locator('section[aria-labelledby="session-detail-title"]')).toContainText('왼쪽 목록에서 세션을 고르세요.');
  await p.close();
});
