/**
 * QA 1단계 보강(T1-5·T1-8): 기존 E2E가 직접 보지 않는 항목.
 * - 승인 대기 세션 정렬(기다린 시간이 긴 순)과 화면의 기다린 시간 문구
 * - usage가 든 이벤트 뒤 화면·응답에 토큰 수·비용 없음
 * - 임시 사무실 BOT 수 = 상세 BOT 수, 상태 변화에 따라 구역 이동
 * - 사무실 계기판이 상단 영역과 같은 값·수준(한도 가까움·한도 도달)
 * 데이터는 테스트 안에서 만든 값이다.
 */
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { BASE, SCREENS, apiLogin, nowSec, postEvent, postPlan, uiLogin } from './helpers';

const P = 'qa/stage1';
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

test.describe.configure({ mode: 'serial' });

test('승인 대기 정렬·기다린 시간, 토큰·비용 없음, 사무실 BOT 수와 상태 변화', async ({ page, request }) => {
  await apiLogin(request);
  const send = async (o: Record<string, unknown>) => expect(await postEvent(request, { project: P, ...o })).toBe(202);
  // W1: 3시간째 승인 대기, W2: 30분째 승인 대기, A: 방금 작업 중(가장 최근 이벤트)
  await send({ event: 'Notification', session_id: 'qa-w2-0000', notification_type: 'permission_prompt', ts: ago(30 * 60_000) });
  await send({ event: 'Notification', session_id: 'qa-w1-0000', notification_type: 'permission_prompt', ts: ago(3 * 3600_000) });
  await send({ event: 'PreToolUse', session_id: 'qa-act-000', tool: 'Read', ts: ago(1000) });
  await send({ event: 'SubagentStart', session_id: 'qa-act-000', agent_id: 'q1', agent_type: 'qa', ts: ago(900) });
  await send({
    event: 'PostToolUse', session_id: 'qa-act-000', tool: 'Read', ts: ago(800),
    usage: { input: 123457, output: 98765, cache_creation: 55555, cache_read: 77777, messages: 3 },
    subagent: { usage: { input: 424242, output: 313131 } },
  });

  const list = await (await request.get(`${BASE}/api/sessions?project=${encodeURIComponent(P)}`)).json();
  expect(list.sessions.map((s: { sessionId: string }) => s.sessionId)).toEqual(['qa-w1-0000', 'qa-w2-0000', 'qa-act-000']);
  const raw = JSON.stringify(list) + JSON.stringify(await (await request.get(`${BASE}/api/sessions/${list.sessions[2].key}`)).json());
  for (const n of ['123457', '98765', '55555', '77777', '424242', '313131']) expect(raw).not.toContain(n);
  expect(raw).not.toMatch(/"(usage|cost|totals|pricing)"/);

  await page.setViewportSize({ width: 1280, height: 900 });
  await uiLogin(page, undefined, `/?project=${encodeURIComponent(P)}`);
  const rows = page.locator('li[data-session-key]');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText(/승인 대기 · 3시간째/);
  await expect(rows.nth(1)).toContainText(/승인 대기 · 30분째/);
  const body = page.locator('body');
  await expect(body).not.toContainText(/토큰|비용|\$\s?\d|123,?457|98,?765|424,?242/);

  // 활성 세션 상세: lead + qa 두 BOT, 사무실 칸도 2개
  await rows.nth(2).locator('a[href*="session="]').click();
  const floor = page.getByTestId('office-floor');
  await expect(floor.locator('li[data-agent-key]')).toHaveCount(2);
  await expect(floor.locator('li[data-agent-key="__lead__"]')).toHaveAttribute('data-status', 'thinking');
  // 상태 변화: lead PreToolUse → 작업 중(책상 구역)
  await send({ event: 'PreToolUse', session_id: 'qa-act-000', tool: 'Bash' });
  await expect(floor.locator('[data-zone="desk"] li[data-agent-key="__lead__"]')).toHaveAttribute('data-status', 'working', { timeout: 5000 });
  await page.screenshot({ path: path.join(SCREENS, 'qa-waiting-order-1280.png'), fullPage: true });
});

test('사무실 계기판 = 상단 영역(정상·한도 가까움·한도 도달)', async ({ page, request }) => {
  await apiLogin(request);
  await page.setViewportSize({ width: 1280, height: 900 });
  await uiLogin(page, undefined, `/?project=${encodeURIComponent(P)}`);
  await page.locator('li[data-session-key] a[href*="session="]').first().click();
  const panel = page.locator('section[aria-labelledby="plan-usage-title"]');
  const mini = page.getByTestId('plan-mini');
  // 새 창(61초보다 늦은 resets_at)으로 보내 D-27에서 값이 바뀌게 한다
  const base = nowSec() + 4 * 3600;
  const cases: Array<[number, string, string]> = [[42, 'ok', ''], [85, 'near', '한도 가까움'], [100, 'reached', '한도 도달']];
  let i = 0;
  for (const [pct, , label] of cases) {
    expect(await postPlan(request, { five_hour: { used_percentage: pct, resets_at: base + i * 120 }, seven_day: { used_percentage: 13, resets_at: nowSec() + 3 * 86400 } })).toBe(202);
    i += 1;
    const five = panel.locator('[data-window="five_hour"]');
    await expect(five).toContainText(`${pct}%`, { timeout: 5000 });
    if (label) await expect(five).toContainText(label);
    await expect(mini.locator('[data-window="five_hour"]')).toContainText(`${pct}%`);
    await expect(mini.locator('[data-window="seven_day"]')).toContainText('13%');
    expect(await mini.locator('[data-window="five_hour"] svg').count()).toBe(label ? 1 : 0);
  }
  await page.screenshot({ path: path.join(SCREENS, 'qa-plan-reached-1280.png'), fullPage: true });
});
