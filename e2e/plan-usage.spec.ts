/**
 * 플랜 사용량 통합(T1-7, 설계 6.6 "통합"): 이 저장소에 설치된 statusline.mjs 사본에 rate_limits가 든 stdin을 넣어
 * 실제로 보내고(분리된 자식 → curl) 조회 API와 화면에서 확인한다. 틀린 토큰이면 값이 바뀌지 않는다.
 * 앞선 plan-screen 프로젝트가 같은 서버에 보낸 값보다 resets_at을 60초 넘게 늦춰 새 창으로 들어가게 한다(D-27).
 */
import { expect, test } from '@playwright/test';
import { STATUSLINE, apiLogin, nowSec, requireFile, runNode, senderEnv, tmpDir, uiLogin } from './helpers';

type Plan = { windows: Record<string, { status: string; usedPercentage?: number; resetsAtEpoch?: number; receivedAt?: string }> };

function stdinFor(sessionId: string, five: { p: number; r: number }, seven: { p: number; r: number }): string {
  // 실제 Claude Code statusLine 입력과 같은 모양(공식 문서의 필드). 경로·모델·비용은 보내지 않아야 한다
  return JSON.stringify({
    hook_event_name: 'Status',
    session_id: sessionId,
    transcript_path: '/home/someone/.claude/projects/x/transcript.jsonl',
    cwd: '/home/someone/secret-project',
    model: { id: 'claude-opus-5-5', display_name: 'Opus 5.5' },
    workspace: { current_dir: '/home/someone/secret-project', project_dir: '/home/someone/secret-project' },
    version: '2.1.322',
    output_style: { name: 'default' },
    cost: { total_cost_usd: 1.2345, total_duration_ms: 1000, total_api_duration_ms: 800, total_lines_added: 3, total_lines_removed: 1 },
    exceeds_200k_tokens: false,
    rate_limits: {
      five_hour: { used_percentage: five.p, resets_at: five.r },
      seven_day: { used_percentage: seven.p, resets_at: seven.r },
    },
  });
}

test('statusline.mjs로 42% / 13%를 보내면 조회 API와 화면에 같은 값이 보인다', async ({ request, page }) => {
  requireFile(STATUSLINE);
  await apiLogin(request);
  const five = { p: 42, r: nowSec() + 4 * 3600 };
  const seven = { p: 13, r: nowSec() + 5 * 86400 };
  const dir = tmpDir('sl-');
  const t0 = Date.now();
  const res = await runNode(STATUSLINE, stdinFor('it-plan-1', five, seven), senderEnv(dir), dir);
  expect(res.code).toBe(0);
  expect(Date.now() - t0).toBeLessThan(3000);
  // 감싼 명령이 없으므로 기본 한 줄
  expect(res.stdout).toBe('5h 42% · 7d 13%\n');

  let plan: Plan | null = null;
  await expect
    .poll(
      async () => {
        plan = (await (await request.get('/api/plan-usage')).json()) as Plan;
        return [plan.windows.five_hour.usedPercentage, plan.windows.seven_day.usedPercentage];
      },
      { timeout: 5000, intervals: [200] },
    )
    .toEqual([42, 13]);
  const p = plan as unknown as Plan;
  expect(p.windows.five_hour).toMatchObject({ status: 'ok', resetsAtEpoch: five.r });
  expect(p.windows.seven_day).toMatchObject({ status: 'ok', resetsAtEpoch: seven.r });
  const text = JSON.stringify(p);
  for (const leak of ['secret-project', 'transcript', 'opus', '1.2345']) expect(text).not.toContain(leak);

  await uiLogin(page);
  const panel = page.locator('section[aria-labelledby="plan-usage-title"]');
  await expect(panel.locator('[data-window="five_hour"]')).toContainText('42%');
  await expect(panel.locator('[data-window="seven_day"]')).toContainText('13%');
});

test('틀린 토큰으로 보내면 플랜 사용량이 바뀌지 않는다', async ({ request }) => {
  requireFile(STATUSLINE);
  await apiLogin(request);
  const before = await (await request.get('/api/plan-usage')).json();
  const dir = tmpDir('sl-bad-');
  const res = await runNode(
    STATUSLINE,
    stdinFor('it-plan-bad', { p: 55, r: nowSec() + 6 * 3600 }, { p: 20, r: nowSec() + 6 * 86400 }),
    senderEnv(dir, { AGENT_OBSERVER_TOKEN: 'wrong-token-0123456789' }),
    dir,
  );
  expect(res.code).toBe(0);
  await new Promise((r) => setTimeout(r, 2500));
  const after = await (await request.get('/api/plan-usage')).json();
  expect(after.windows).toEqual(before.windows);
});
