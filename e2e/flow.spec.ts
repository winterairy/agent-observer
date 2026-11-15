/**
 * 화면 흐름(T1-5·T1-7): 로그인 → 목록 → 상세, 390·1280 스크린샷(docs/team/reports/screens/qa/),
 * 키보드 흐름, 정리·다시 표시, 캐릭터 프레임, 폴링 반영, 401 → /login, 로그아웃.
 * 데이터는 테스트 안에서 /api/events로 보낸 테스트 값이다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { SCREENS, apiLogin, noHorizontalScroll, postEvent, uiLogin } from './helpers';

const P = 'winterairy/flow-demo';
const F1 = 'f1aaaaaa-0000-flow';
const F2 = 'f2bbbbbb-0000-flow';

async function seed(request: APIRequestContext): Promise<void> {
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();
  const send = async (o: Record<string, unknown>) => expect(await postEvent(request, o)).toBe(202);
  await send({ event: 'SessionStart', session_id: F1, project: P, model: 'claude-haiku-5-5', remote: true, ts: ago(3 * 3600_000) });
  await send({ event: 'PreToolUse', session_id: F1, project: P, tool: 'Agent', subagent_type: 'qa', ts: ago(3 * 3600_000 - 1000) });
  await send({ event: 'SubagentStart', session_id: F1, project: P, agent_id: 'qa-1', agent_type: 'plugin:qa', ts: ago(3 * 3600_000 - 2000) });
  await send({ event: 'PreToolUse', session_id: F1, project: P, agent_id: 'qa-1', agent_type: 'plugin:qa', tool: 'Skill', skill: 'playwright-cli', ts: ago(3 * 3600_000 - 3000) });
  await send({ event: 'PostToolUse', session_id: F1, project: P, agent_id: 'qa-1', agent_type: 'plugin:qa', tool: 'Skill', ts: ago(3 * 3600_000 - 4000) });
  await send({ event: 'Notification', session_id: F1, project: P, notification_type: 'permission_prompt', ts: ago(2 * 3600_000) });
  await send({ event: 'PreToolUse', session_id: F1, project: P, agent_id: 'qa-1', agent_type: 'plugin:qa', tool: 'Bash', ts: ago(60_000) });
  await send({ event: 'SubagentStart', session_id: F1, project: P, agent_id: 'arch-1', agent_type: 'architect', ts: ago(30_000) });
  await send({ event: 'SessionStart', session_id: F2, project: P, branch: 'feature/flow-check', ts: ago(600_000) });
  await send({ event: 'PreToolUse', session_id: F2, project: P, branch: 'feature/flow-check', tool: 'Read', ts: ago(180_000) });
}

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  await apiLogin(request);
  await seed(request);
  fs.mkdirSync(SCREENS, { recursive: true });
});

const rowOf = (page: Page, sid: string) => page.locator(`li[data-session-key]`).filter({ has: page.locator(`a[href*="session="]`) }).filter({ hasText: sid.slice(0, 8) });

test('로그인 → 목록 → 상세(1280), 스크린샷', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await uiLogin(page, undefined, `/?project=${encodeURIComponent(P)}`);
  await expect(page).toHaveURL(new RegExp(`project=${encodeURIComponent(P).replace(/[%]/g, '%')}`));
  // 1280은 첫 세션(승인 대기)을 자동 선택
  await expect(page).toHaveURL(/session=/);
  const banner = page.getByRole('button', { name: /승인 대기 1개 세션/ });
  await expect(banner).toBeVisible();
  const detail = page.locator('section[aria-labelledby="session-detail-title"]');
  await expect(detail).toContainText(P);
  await expect(detail.getByTestId('session-model')).toHaveText('claude-haiku-5-5');
  await expect(detail).toContainText('클라우드');
  await expect(detail).toContainText(/승인 대기 · 2시간째/);
  // BOT: lead(책임자), plugin:qa → QA, architect → 설계. 스킬·부른 BOT
  await expect(detail).toContainText('책임자');
  await expect(detail).toContainText('QA');
  await expect(detail).toContainText('설계');
  await expect(detail).toContainText('작업 중 · Bash');
  await expect(detail).toContainText('playwright-cli ×1');
  await expect(detail).toContainText('qa ×1');
  await expect(page.locator('body')).not.toContainText(/토큰|비용|\$\d/);
  // 임시 사무실: 승인 대기(책임자, 캐릭터 프레임), 책상(QA 작업 중, 설계 생각 중)
  const floor = page.getByTestId('office-floor');
  await expect(floor.locator('[data-zone="waiting"]')).toContainText('책임자');
  await expect(floor.locator('[data-zone="desk"]')).toContainText('QA');
  await expect(floor.locator('[data-zone="desk"]')).toContainText('설계');
  await expect(floor.locator('[data-zone="rest"]')).toContainText('없음');
  const sprite = floor.locator('[data-zone="waiting"] [data-testid="avatar-sprite"]');
  await expect(sprite).toHaveAttribute('data-row', '1'); // alert 줄
  await expect(sprite).toHaveAttribute('data-frames', '2');
  expect(await sprite.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBe(32);
  await expect(floor.locator('[data-zone="desk"] [data-testid="avatar-sprite"]')).toHaveCount(0); // 캐릭터 없는 역할은 사각형
  await noHorizontalScroll(page);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SCREENS, 'dashboard-1280.png'), fullPage: true });
});

test('390: 목록 → 상세로 스크롤·포커스, 목록으로, 가로 스크롤 없음, 스크린샷', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await uiLogin(page, undefined, `/?project=${encodeURIComponent(P)}`);
  // 390은 자동 선택하지 않는다
  await expect(page.locator('section[aria-labelledby="session-detail-title"]')).toContainText('위 목록에서 세션을 고르세요.');
  await expect(page).not.toHaveURL(/session=/);
  await noHorizontalScroll(page);
  await page.screenshot({ path: path.join(SCREENS, 'dashboard-390-list.png'), fullPage: true });
  await rowOf(page, F1).locator('a').click();
  await expect(page).toHaveURL(/session=/);
  await expect(page.locator('#session-detail-title')).toBeFocused();
  const detail = page.locator('section[aria-labelledby="session-detail-title"]');
  await expect(detail.getByTestId('session-model')).toHaveText('claude-haiku-5-5');
  await expect(detail.locator('table')).toBeHidden(); // 390은 AgentRow 목록
  await expect(detail.getByRole('list', { name: 'BOT 목록과 상태' })).toBeVisible();
  await noHorizontalScroll(page);
  await page.mouse.move(0, 0);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SCREENS, 'dashboard-390.png'), fullPage: true });
  await detail.getByRole('button', { name: '목록으로' }).click();
  await expect(rowOf(page, F1).locator('a')).toBeFocused();
});

test('키보드만으로 필터와 세션 선택(1280 Tab 순서)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await uiLogin(page);
  await expect(page.locator('[data-row-link]').first()).toBeVisible();
  // 새로 읽어 포커스를 문서 처음으로
  await page.goto('/');
  await expect(page.locator('[data-row-link]').first()).toBeVisible();
  const order: string[] = [];
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    order.push(
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement;
        if (el.id === 'project-filter') return 'select';
        if (el.hasAttribute('data-row-link')) return 'row';
        return (el.textContent ?? '').trim();
      }),
    );
  }
  expect(order.slice(0, 2)).toEqual(['본문으로 건너뛰기', '로그아웃']);
  expect(order[2]).toMatch(/^승인 대기 \d+개 세션/);
  expect(order.slice(3)).toEqual(['select', 'row']);
  // 프로젝트 select: 화살표로 바꾸면 change로 바로 반영(네이티브)
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#project-filter')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page).toHaveURL(/project=/);
  // 필터에 맞는 목록에서 Tab → 첫 행 링크 → Enter로 선택
  await page.locator('#project-filter').selectOption(P);
  await page.locator('#project-filter').focus();
  await page.keyboard.press('Tab');
  const focused = page.locator(':focus');
  await expect(focused).toHaveAttribute('data-row-link', /.+/);
  const key = await focused.getAttribute('data-row-link');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveText('정리');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(new RegExp(`session=${key}`));
  await expect(page.locator(`[data-row-link="${key}"]`)).toHaveAttribute('aria-current', 'true');
  await expect(page.locator(`[data-row-link="${key}"]`)).toBeFocused(); // 1280은 행에 포커스 유지
  // 건너뛰기 링크 → 세션 목록 제목
  await page.locator('a', { hasText: '본문으로 건너뛰기' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#session-list-title')).toBeFocused();
});

test('폴링: 이벤트를 보내면 3초 + 1초 안에 상태가 바뀐다', async ({ page, request }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await uiLogin(page, undefined, `/?project=${encodeURIComponent(P)}`);
  const row = rowOf(page, F2);
  await expect(row).toContainText('작업 중');
  expect(await postEvent(request, { event: 'Stop', session_id: F2, project: P, branch: 'feature/flow-check' })).toBe(202);
  await expect(row).toContainText('완료', { timeout: 4000 });
});

test('정리 → 숨긴 세션 N개 보기 → 다시 표시', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await uiLogin(page, undefined, `/?project=${encodeURIComponent(P)}`);
  const row = rowOf(page, F2);
  await row.getByRole('button', { name: /세션 정리/ }).click();
  await expect(row).toHaveCount(0);
  await expect(page.getByText('정리한 세션은 새 이벤트가 오면 다시 보입니다.', { exact: false })).toBeVisible();
  const toggle = page.getByRole('button', { name: /숨긴 세션 1개 보기/ });
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.getByRole('button', { name: /숨긴 세션 1개 접기/ })).toHaveAttribute('aria-expanded', 'true');
  const hiddenList = page.getByRole('list', { name: '숨긴 세션' });
  await expect(hiddenList).toContainText(F2.slice(0, 8));
  await hiddenList.getByRole('button', { name: /세션 다시 표시/ }).click();
  await expect(page.getByText(/세션을 다시 표시했습니다/)).toBeVisible();
  await expect(rowOf(page, F2)).toHaveCount(1);
  await expect(page.getByText('숨긴 세션이 없습니다.')).toBeVisible();
  await expect(page.getByRole('button', { name: /숨긴 세션 0개 접기/ })).toBeFocused();
});

test('쿠키가 없어지면 다음 폴링에서 /login?next=… 로 이동, 로그아웃', async ({ page, context }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await uiLogin(page, undefined, `/?project=${encodeURIComponent(P)}`);
  await context.clearCookies();
  await expect(page).toHaveURL(/\/login\?next=/, { timeout: 5000 });
  await page.getByLabel('비밀번호').fill('틀린-비밀번호');
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page.getByText('비밀번호가 맞지 않습니다.')).toBeVisible();
  await expect(page.getByLabel('비밀번호')).toHaveValue('');
  await expect(page.getByLabel('비밀번호')).toBeFocused();
  // DES-01: 포커스 중에도 오류 테두리는 danger
  const [border, danger] = await page.getByLabel('비밀번호').evaluate((el) => {
    const probe = document.createElement('span');
    probe.style.color = 'var(--color-danger)';
    document.body.append(probe);
    const d = getComputedStyle(probe).color;
    probe.remove();
    return [getComputedStyle(el).borderTopColor, d];
  });
  expect(border).toBe(danger);
  await expect(page.getByText('OBSERVER_PASSWORD가 설정되어 있어야', { exact: false })).toBeVisible();
  await page.getByLabel('비밀번호').fill(process.env.E2E_PASSWORD as string);
  await page.getByRole('button', { name: '로그인' }).click();
  // next로 돌아온다(프로젝트 필터 유지)
  await expect(page).toHaveURL(/\/\?project=/);
  await page.getByRole('button', { name: '로그아웃' }).click();
  await expect(page).toHaveURL(/\/login$/);
  const res = await page.request.get('/api/sessions');
  expect(res.status()).toBe(401);
});
