/** 상태 배지: 색 + 아이콘 + 문구(DESIGN.md 6절). 아이콘은 aria-hidden, 문구가 접근성 이름. */
import { Icon } from '@/ui/icons';
import { statusStyle, toneVars } from '@/ui/statusStyle';
import type { AgentStatus } from '@/ui/types';
import c from '@/ui/common.module.css';

export function StatusBadge({ status, stale = false, extra }: { status: AgentStatus; stale?: boolean; extra?: string | null }) {
  const s = statusStyle(status, stale);
  const v = toneVars(s.tone);
  const text = extra ? `${s.label} · ${extra}` : s.label;
  return (
    <span
      className={c.badge}
      style={{ background: v.bg, color: v.fg, border: s.tone === 'stale' ? `1px solid ${v.fg}` : undefined }}
      title={text}
    >
      <Icon name={s.icon} />
      <span className={c.badgeText}>{text}</span>
    </span>
  );
}

/** 배지에 붙일 추가 정보: 작업 중이면 도구 이름, 승인 대기면 기다린 시간 */
export function badgeExtra(
  status: AgentStatus,
  opts: { currentTool?: string | null; waitingSince?: string | null; nowMs: number; waitedText: (since: number, now: number) => string },
): string | null {
  if (status === 'working' && opts.currentTool) return opts.currentTool;
  if (status === 'waiting' && opts.waitingSince) return opts.waitedText(Date.parse(opts.waitingSince), opts.nowMs);
  return null;
}
