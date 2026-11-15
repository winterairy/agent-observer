/**
 * 플랜 사용량 병합·판정·검증(T1-8, 설계 6.6 단위). 실제 수집 데이터는 쓰지 않는다.
 */
import { describe, expect, it } from 'vitest';
import { emptyPlanUsage, type PlanUsageState, type PlanWindowState } from '@/domain/types';
import { mergePlanUsage, mergePlanWindow } from '@/plan/merge';
import { parsePlanReport } from '@/plan/schema';
import { planUsageView } from '@/plan/view';

const NOW = Date.parse('2026-11-11T10:00:00.000Z');
/** 15:00:00 UTC (epoch 초) */
const R = Date.parse('2026-11-11T15:00:00.000Z') / 1000;

const win = (usedPercentage: number, resetsAtSec: number, p: Partial<PlanWindowState> = {}): PlanWindowState => ({
  usedPercentage,
  resetsAtSec,
  receivedTs: NOW,
  remote: false,
  ...p,
});

describe('mergePlanWindow (D-27)', () => {
  it('처음 값은 그대로 저장한다', () => {
    expect(mergePlanWindow(null, { usedPercentage: 42, resetsAtSec: R }, true, NOW + 5)).toEqual(win(42, R, { receivedTs: NOW + 5, remote: true }));
  });

  it('같은 resets_at에서 50 다음 40이 오면 50이 남는다', () => {
    const r = mergePlanWindow(win(50, R), { usedPercentage: 40, resetsAtSec: R }, false, NOW + 1);
    expect(r).toMatchObject({ usedPercentage: 50, resetsAtSec: R, receivedTs: NOW + 1 });
  });

  it('15:00:00/42% 다음 15:00:03/38% → 42%, resets_at은 늦은 15:00:03', () => {
    const r = mergePlanWindow(win(42, R), { usedPercentage: 38, resetsAtSec: R + 3 }, false, NOW + 1);
    expect(r).toMatchObject({ usedPercentage: 42, resetsAtSec: R + 3 });
  });

  it('순서를 바꿔 15:00:03/38% 다음 15:00:00/42%도 같은 결과', () => {
    const r = mergePlanWindow(win(38, R + 3), { usedPercentage: 42, resetsAtSec: R }, false, NOW + 1);
    expect(r).toMatchObject({ usedPercentage: 42, resetsAtSec: R + 3 });
  });

  it('차이가 정확히 60초면 같은 창(큰 값)', () => {
    expect(mergePlanWindow(win(50, R), { usedPercentage: 5, resetsAtSec: R + 60 }, false, NOW)).toMatchObject({ usedPercentage: 50, resetsAtSec: R + 60 });
    expect(mergePlanWindow(win(50, R), { usedPercentage: 5, resetsAtSec: R - 60 }, false, NOW)).toMatchObject({ usedPercentage: 50, resetsAtSec: R });
  });

  it('61초 늦은 5%는 새 창으로 이긴다', () => {
    const r = mergePlanWindow(win(50, R, { remote: true }), { usedPercentage: 5, resetsAtSec: R + 61 }, false, NOW + 9);
    expect(r).toEqual(win(5, R + 61, { receivedTs: NOW + 9, remote: false }));
  });

  it('61초 이른 값은 무시하되 receivedTs는 갱신한다', () => {
    const old = win(30, R, { remote: true });
    const r = mergePlanWindow(old, { usedPercentage: 90, resetsAtSec: R - 61 }, false, NOW + 7);
    expect(r).toEqual({ ...old, receivedTs: NOW + 7 });
  });

  it('remote 출처: 같은 창에서 들어온 값이 더 크면 들어온 remote, 아니면 기존 remote', () => {
    expect(mergePlanWindow(win(40, R, { remote: false }), { usedPercentage: 41, resetsAtSec: R }, true, NOW).remote).toBe(true);
    expect(mergePlanWindow(win(40, R, { remote: false }), { usedPercentage: 40, resetsAtSec: R }, true, NOW).remote).toBe(false);
    expect(mergePlanWindow(win(40, R, { remote: true }), { usedPercentage: 39, resetsAtSec: R }, false, NOW).remote).toBe(true);
  });
});

describe('mergePlanUsage', () => {
  it('five_hour만 오면 seven_day는 그대로', () => {
    const prev: PlanUsageState = { five_hour: win(10, R), seven_day: win(13, R + 86400) };
    const next = mergePlanUsage(prev, { remote: false, windows: { five_hour: { usedPercentage: 42, resetsAtSec: R } } }, NOW + 1);
    expect(next.seven_day).toEqual(prev.seven_day);
    expect(next.five_hour).toMatchObject({ usedPercentage: 42, receivedTs: NOW + 1 });
  });

  it('입력 상태를 바꾸지 않는다', () => {
    const prev = emptyPlanUsage();
    mergePlanUsage(prev, { remote: false, windows: { seven_day: { usedPercentage: 1, resetsAtSec: R } } }, NOW);
    expect(prev).toEqual(emptyPlanUsage());
  });
});

describe('planUsageView', () => {
  it('값이 없으면 none(다른 필드 없음)', () => {
    expect(planUsageView(emptyPlanUsage(), NOW)).toEqual({
      now: new Date(NOW).toISOString(),
      windows: { five_hour: { status: 'none' }, seven_day: { status: 'none' } },
    });
  });

  it('resets_at 정각이면 expired이고 level은 null, 값은 그대로 준다', () => {
    const v = planUsageView({ five_hour: win(90, R), seven_day: null }, R * 1000).windows.five_hour;
    expect(v).toMatchObject({ status: 'expired', level: null, usedPercentage: 90, resetsAtEpoch: R });
  });

  it('resets_at 1ms 전이면 ok', () => {
    expect(planUsageView({ five_hour: win(10, R), seven_day: null }, R * 1000 - 1).windows.five_hour.status).toBe('ok');
  });

  it('수신 후 24시간이 지나도 resets_at 전이면 ok(오래됨 상태 없음)', () => {
    const far = R + 7 * 86400;
    const v = planUsageView({ five_hour: null, seven_day: win(13, far, { receivedTs: NOW }) }, NOW + 25 * 3600_000);
    expect(v.windows.seven_day.status).toBe('ok');
    expect(JSON.stringify(v)).not.toContain('stale');
  });

  it('receivedAt은 receivedTs의 ISO, resetsAt은 resets_at의 ISO', () => {
    const v = planUsageView({ five_hour: win(42, R, { receivedTs: NOW + 1300 }), seven_day: null }, NOW).windows.five_hour;
    expect(v).toEqual({
      status: 'ok',
      usedPercentage: 42,
      level: 'normal',
      resetsAt: '2026-11-11T15:00:00.000Z',
      resetsAtEpoch: R,
      receivedAt: '2026-11-11T10:00:01.300Z',
      remote: false,
    });
  });

  it('status는 ok|expired|none 셋뿐이다', () => {
    const states: PlanUsageState[] = [emptyPlanUsage(), { five_hour: win(1, R), seven_day: win(2, 1) }];
    for (const st of states) {
      for (const now of [0, NOW, R * 1000, R * 1000 + 1]) {
        for (const w of Object.values(planUsageView(st, now).windows)) expect(['ok', 'expired', 'none']).toContain(w.status);
      }
    }
  });

  it.each([
    [79.9, 'normal'],
    [80, 'near'],
    [99.9, 'near'],
    [100, 'reached'],
  ])('level: %s%% → %s', (pct, level) => {
    const v = planUsageView({ five_hour: win(pct, R), seven_day: null }, NOW).windows.five_hour;
    expect(v).toMatchObject({ status: 'ok', level });
  });
});

describe('parsePlanReport (plan/schema)', () => {
  const base = (rl: unknown, over: Record<string, unknown> = {}) => ({ v: 1, ts: '2026-11-11T10:00:00.000Z', remote: false, rate_limits: rl, ...over });
  const fh = (p: Record<string, unknown>) => base({ five_hour: { used_percentage: 42, resets_at: R, ...p } });

  it('올바른 요청은 창 값을 돌려준다', () => {
    const r = parsePlanReport(base({ five_hour: { used_percentage: 42.5, resets_at: R }, seven_day: { used_percentage: 13, resets_at: R + 86400 } }, { remote: true }));
    expect(r).toEqual({
      ok: true,
      report: { remote: true, windows: { five_hour: { usedPercentage: 42.5, resetsAtSec: R }, seven_day: { usedPercentage: 13, resetsAtSec: R + 86400 } } },
    });
  });

  it.each([
    ['used_percentage -1', fh({ used_percentage: -1 }), 'rate_limits.five_hour.used_percentage'],
    ['used_percentage 101', fh({ used_percentage: 101 }), 'rate_limits.five_hour.used_percentage'],
    ['used_percentage "42"', fh({ used_percentage: '42' }), 'rate_limits.five_hour.used_percentage'],
    ['resets_at 1.5', fh({ resets_at: 1.5 }), 'rate_limits.five_hour.resets_at'],
    ['resets_at 0', fh({ resets_at: 0 }), 'rate_limits.five_hour.resets_at'],
    ['resets_at 밀리초 값', fh({ resets_at: R * 1000 }), 'rate_limits.five_hour.resets_at'],
    ['창 0개', base({}), 'rate_limits'],
    ['spend_limit만 있음', base({ spend_limit: { used: 1 } }), 'rate_limits'],
    ['null 창 둘', base({ five_hour: null, seven_day: null }), 'rate_limits'],
    ['rate_limits 없음', base(undefined), 'rate_limits'],
    ['v가 2', fh({}) && { ...fh({}), v: 2 }, 'v'],
    ['ts 형식 틀림', { ...fh({}), ts: '11/11/2026' }, 'ts'],
  ])('%s이면 실패', (_n, raw, issue) => {
    const r = parsePlanReport(raw);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues).toContain(issue);
  });

  it('모르는 키는 버리고 remote가 없으면 false', () => {
    const r = parsePlanReport({ v: 1, ts: '2026-11-11T10:00:00Z', cwd: '/x', rate_limits: { seven_day: { used_percentage: 1, resets_at: R, extra: 9 }, spend_limit: 3 } });
    expect(r).toEqual({ ok: true, report: { remote: false, windows: { seven_day: { usedPercentage: 1, resetsAtSec: R } } } });
  });
});
