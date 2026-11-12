/**
 * 플랜 사용량 영역(PlanUsagePanel/PlanUsageMeter)과 사무실 계기판(PlanUsageMini). DESIGN.md 6절, 명세 3.8·3.9.
 * status·level은 서버 값을 그대로 쓴다(화면에서 다시 판정하지 않음). 시간 문구는 응답 now 기준.
 */
import { Icon } from '@/ui/icons';
import { absoluteText, agoText, percentText, remainingText, resetAtText } from '@/ui/format';
import type { PlanUsageView, PlanWindowView } from '@/ui/types';
import c from '@/ui/common.module.css';
import s from '@/ui/PlanUsage.module.css';

type WindowName = 'five_hour' | 'seven_day';
const WINDOWS: { name: WindowName; label: string; short: string }[] = [
  { name: 'five_hour', label: '5시간', short: '5h' },
  { name: 'seven_day', label: '주간', short: '7d' },
];

function fillWidth(used: number): string {
  const p = Math.min(Math.max(used, 0), 100);
  if (p > 0 && p < 1) return 'max(2px, 1%)';
  return `${p}%`;
}

function fillColor(level: string | null): string {
  if (level === 'reached') return 'var(--color-meter-reached)';
  if (level === 'near') return 'var(--color-meter-near)';
  return 'var(--color-meter-normal)';
}

export function bothNone(plan: PlanUsageView): boolean {
  return plan.windows.five_hour.status === 'none' && plan.windows.seven_day.status === 'none';
}

function LevelBadge({ level }: { level: 'near' | 'reached' }) {
  const near = level === 'near';
  return (
    <span
      className={c.badge}
      style={
        near
          ? { background: 'var(--color-status-waiting-bg)', color: 'var(--color-status-waiting-fg)' }
          : {
              background: 'var(--color-status-stale-bg)',
              color: 'var(--color-status-stale-fg)',
              border: '1px solid var(--color-status-stale-fg)',
            }
      }
    >
      <Icon name={near ? 'circleBang' : 'triangleBang'} />
      {near ? '한도 가까움' : '한도 도달'}
    </span>
  );
}

function Meter({ name, label, w, nowMs }: { name: WindowName; label: string; w: PlanWindowView; nowMs: number }) {
  const labelId = `plan-${name}-label`;
  if (w.status === 'none') {
    return (
      <div className={s.meter} data-window={name} data-status="none">
        <div className={s.row1}>
          <h3 id={labelId} className={c.h3}>{label}</h3>
          <span className={c.caption}>정보 없음</span>
        </div>
        <div className={s.track} aria-hidden="true" />
      </div>
    );
  }
  const resetMs = Date.parse(w.resetsAt);
  const recvMs = Date.parse(w.receivedAt);
  const measured = (
    <span className={s.metaPart}>
      마지막 측정{' '}
      <time dateTime={w.receivedAt} title={absoluteText(recvMs)}>
        {agoText(recvMs, nowMs)}
      </time>
    </span>
  );
  if (w.status === 'expired') {
    return (
      <div className={s.meter} data-window={name} data-status="expired">
        <div className={s.row1}>
          <h3 id={labelId} className={c.h3}>{label}</h3>
          <span className={`${c.caption} ${s.expiredMark}`}>
            <Icon name="ring" />
            초기화됨
          </span>
        </div>
        <div className={s.track} aria-hidden="true" />
        <p className={s.meta}>
          <span className={s.metaPart}>초기화됨 — 다음 작업 때 갱신</span>
          <span className={s.sep} aria-hidden="true"> · </span>
          {measured}
        </p>
      </div>
    );
  }
  const level = w.level;
  const resetText = `${resetAtText(name, resetMs, nowMs)} 초기화`;
  const remain = remainingText(resetMs, nowMs);
  const pct = percentText(w.usedPercentage);
  const levelText = level === 'near' ? '한도 가까움, ' : level === 'reached' ? '한도 도달, ' : '';
  return (
    <div className={s.meter} data-window={name} data-status="ok" data-level={level ?? ''}>
      <div className={s.row1}>
        <h3 id={labelId} className={c.h3}>{label}</h3>
        <span className={s.right}>
          {level === 'near' || level === 'reached' ? <LevelBadge level={level} /> : null}
          <span className={s.pct}>{pct}</span>
        </span>
      </div>
      <div
        className={s.track}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(w.usedPercentage, 100)}
        aria-labelledby={labelId}
        aria-valuetext={`${pct}, ${levelText}${resetText}, ${remain}`}
      >
        <div className={s.fill} style={{ width: fillWidth(w.usedPercentage), background: fillColor(level) }} />
      </div>
      <p className={s.meta}>
        <span className={s.metaPart}>
          <time dateTime={w.resetsAt} title={absoluteText(resetMs)}>
            {resetText}
          </time>
          {' · '}
          {remain}
        </span>
        <span className={s.sep} aria-hidden="true"> · </span>
        {measured}
      </p>
    </div>
  );
}

export function PlanUsagePanel({ plan }: { plan: PlanUsageView | null }) {
  const nowMs = plan ? Date.parse(plan.now) : 0;
  return (
    <section className={`${c.panel} ${s.panel}`} aria-labelledby="plan-usage-title">
      <div className={s.head}>
        <h2 id="plan-usage-title" className={c.panelTitle}>플랜 사용량</h2>
        <span className={c.caption}>계정 전체 · 프로젝트 필터와 무관</span>
      </div>
      {plan === null ? (
        <div className={s.meters} aria-busy="true">
          {WINDOWS.map((w) => (
            <div key={w.name} className={s.meter}>
              <span className={c.skeleton} style={{ width: 80 }} />
              <span className={c.skeleton} style={{ width: '100%', height: 8 }} />
              <span className={c.skeleton} style={{ width: '60%' }} />
            </div>
          ))}
        </div>
      ) : bothNone(plan) ? (
        <div className={s.none}>
          <h3 className={c.h3}>플랜 사용량 정보 없음</h3>
          <p className={c.note}>
            <Icon name="info" />
            <span>Claude 구독 계정(Pro·Max 로그인)에서만 값이 있습니다. API 키로 쓰는 세션에는 이 정보가 없습니다.</span>
          </p>
          <p className={c.note}>
            <Icon name="info" />
            <span>
              dev-team-kit의 <code className={c.mono}>statusLine</code> 스크립트를 설치하면 세션의 첫 응답 이후에 5시간·주간 사용률이 나타납니다.
            </span>
          </p>
        </div>
      ) : (
        <div className={s.meters}>
          {WINDOWS.map((w) => (
            <Meter key={w.name} name={w.name} label={w.label} w={plan.windows[w.name]} nowMs={nowMs} />
          ))}
        </div>
      )}
    </section>
  );
}

/** 사무실 바닥 맨 위 계기판. 상단 영역과 같은 값이라 aria-hidden(스크린 리더 중복 방지) */
export function PlanUsageMini({ plan }: { plan: PlanUsageView | null }) {
  if (!plan || bothNone(plan)) return null;
  return (
    <div className={s.mini} aria-hidden="true" data-testid="plan-mini">
      {WINDOWS.map(({ name, short }) => {
        const w = plan.windows[name];
        const ok = w.status === 'ok';
        return (
          <div key={name} className={s.miniItem} data-window={name} data-status={w.status}>
            <span className={s.miniLabel}>{short}</span>
            <span className={s.miniTrack}>
              {ok ? <span className={s.fill} style={{ width: fillWidth(w.usedPercentage), background: fillColor(w.level) }} /> : null}
            </span>
            <span className={s.miniPct}>{ok ? percentText(w.usedPercentage) : w.status === 'none' ? '–' : ''}</span>
            {ok && w.level === 'near' ? <Icon name="circleBang" style={{ color: 'var(--color-meter-near)' }} /> : null}
            {ok && w.level === 'reached' ? <Icon name="triangleBang" style={{ color: 'var(--color-meter-reached)' }} /> : null}
            {w.status === 'expired' ? <Icon name="ring" style={{ color: 'var(--color-ink-muted)' }} /> : null}
          </div>
        );
      })}
    </div>
  );
}
