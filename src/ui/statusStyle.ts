/** 상태 → 문구·아이콘·토큰 매핑 한곳(DESIGN.md 6절 StatusBadge, 10절). StatusBadge·SessionRow·OfficeAvatar가 같이 쓴다. */
import type { IconName } from '@/ui/icons';
import type { AgentStatus } from '@/ui/types';

export interface StatusStyle {
  label: string;
  icon: IconName;
  /** CSS 변수 이름 접두사: var(--color-status-<tone>-fg|bg) */
  tone: 'working' | 'thinking' | 'waiting' | 'stale' | 'done' | 'ended';
}

export function statusStyle(status: AgentStatus, stale = false): StatusStyle {
  switch (status) {
    case 'working':
      return { label: '작업 중', icon: 'play', tone: 'working' };
    case 'thinking':
      return { label: '생각 중', icon: 'dots', tone: 'thinking' };
    case 'waiting':
      return stale
        ? { label: '승인 대기 (응답 없음)', icon: 'triangleBang', tone: 'stale' }
        : { label: '승인 대기', icon: 'circleBang', tone: 'waiting' };
    case 'done':
      return { label: '완료', icon: 'check', tone: 'done' };
    case 'ended':
    default:
      return { label: '종료', icon: 'ring', tone: 'ended' };
  }
}

export function toneVars(tone: StatusStyle['tone']): { fg: string; bg: string } {
  return { fg: `var(--color-status-${tone}-fg)`, bg: `var(--color-status-${tone}-bg)` };
}
