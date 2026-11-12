/**
 * 세션 목록 Panel(S), 종료 세션 접기(E), 숨긴 세션 접기(HS). 명세 3.6·3.6.1·4.2, DESIGN.md 6절 SessionRow·HiddenSessions.
 * 행은 <li> 안에 링크와 버튼을 형제로 둔다(버튼 중첩 금지). key = 세션 키(폴링 후에도 포커스 유지).
 */
'use client';

import type { MouseEvent, RefObject } from 'react';
import { StatusBadge, badgeExtra } from '@/ui/StatusBadge';
import { Icon } from '@/ui/icons';
import { absoluteText, agoText, waitedText } from '@/ui/format';
import type { SessionListItem } from '@/ui/types';
import c from '@/ui/common.module.css';
import s from '@/ui/SessionList.module.css';

export interface RowError {
  key: string;
  message: string;
}

interface RowProps {
  item: SessionListItem;
  nowMs: number;
  filtered: boolean;
  selected: boolean;
  variant: 'normal' | 'hidden';
  busy: boolean;
  error: string | null;
  onSelect: (key: string) => void;
  onAction: (item: SessionListItem) => void;
}

export function sessionTitle(item: SessionListItem, filtered: boolean): string {
  return filtered ? item.sessionId.slice(0, 8) : item.project;
}

function SessionRow({ item, nowMs, filtered, selected, variant, busy, error, onSelect, onAction }: RowProps) {
  const title = sessionTitle(item, filtered);
  const extra = badgeExtra(item.status, { waitingSince: item.waitingSince, nowMs, waitedText });
  const withCount = item.status === 'waiting' && item.waitingCount > 1 ? `${extra ?? ''}${extra ? ' · ' : ''}BOT ${item.waitingCount}개` : extra;
  const bar =
    variant === 'hidden' || item.status !== 'waiting' ? undefined : item.stale ? 'var(--color-status-stale-fg)' : 'var(--color-status-waiting-fg)';
  const barColor = bar ?? (selected ? 'var(--color-selected-bar)' : 'transparent');
  const lastMs = Date.parse(item.lastEventAt);
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onSelect(item.key);
  };
  const actionLabel = variant === 'hidden' ? (busy ? '다시 표시 중…' : '다시 표시') : '정리';
  return (
    <li className={`${s.row} ${selected ? s.selected : ''}`} data-session-key={item.key} data-variant={variant} style={{ borderLeftColor: barColor }}>
      <div className={s.rowMain}>
        <a
          href={`?session=${encodeURIComponent(item.key)}`}
          className={s.link}
          aria-current={selected ? 'true' : undefined}
          onClick={onClick}
          data-row-link={item.key}
        >
          <span className={s.line1}>
            <span className={`${c.h3} ${c.ellipsis} ${filtered ? c.mono : ''} ${selected ? s.strong : ''}`} title={filtered ? item.sessionId : item.project}>
              {title}
            </span>
            {item.remote ? <span className={c.cloud}>클라우드</span> : null}
          </span>
          <span className={s.line2}>
            <StatusBadge status={item.status} stale={item.stale} extra={withCount} />
          </span>
          <span className={`${s.line3} ${c.small} ${c.muted}`}>
            {item.branch ? (
              <span className={`${c.mono} ${c.ellipsis} ${s.branch}`} title={item.branch}>
                {item.branch}
              </span>
            ) : null}
            <span>BOT {item.agentCount}</span>
            <time dateTime={item.lastEventAt} title={absoluteText(lastMs)}>
              {agoText(lastMs, nowMs)}
            </time>
          </span>
        </a>
        <button
          type="button"
          className={`${c.btn} ${c.secondary} ${s.action}`}
          aria-label={variant === 'hidden' ? `${title} 세션 다시 표시` : `${title} 세션 정리`}
          disabled={busy}
          onClick={() => onAction(item)}
          data-row-action={item.key}
        >
          {actionLabel}
        </button>
      </div>
      {error ? <p className={c.danger}>{error}</p> : null}
    </li>
  );
}

export interface SessionListProps {
  loaded: boolean;
  sessions: SessionListItem[];
  hiddenCount: number;
  hidden: SessionListItem[] | null;
  nowMs: number;
  filtered: boolean;
  selectedKey: string | null;
  endedOpen: boolean;
  hiddenOpen: boolean;
  busyKeys: Set<string>;
  rowErrors: Record<string, string>;
  dismissNote: boolean;
  restoreNote: string | null;
  titleRef: RefObject<HTMLHeadingElement | null>;
  hiddenToggleRef: RefObject<HTMLButtonElement | null>;
  onSelect: (key: string) => void;
  onDismiss: (item: SessionListItem) => void;
  onRestore: (item: SessionListItem) => void;
  onToggleEnded: () => void;
  onToggleHidden: () => void;
  onShowAll: () => void;
}

export function SessionList(p: SessionListProps) {
  const active = p.sessions.filter((x) => x.status !== 'ended');
  const ended = p.sessions.filter((x) => x.status === 'ended');
  const row = (item: SessionListItem, variant: 'normal' | 'hidden') => (
    <SessionRow
      key={item.key}
      item={item}
      nowMs={p.nowMs}
      filtered={p.filtered}
      selected={p.selectedKey === item.key}
      variant={variant}
      busy={p.busyKeys.has(item.key)}
      error={p.rowErrors[item.key] ?? null}
      onSelect={p.onSelect}
      onAction={variant === 'hidden' ? p.onRestore : p.onDismiss}
    />
  );
  const showHiddenToggle = p.hiddenOpen || p.hiddenCount > 0;

  let empty: React.ReactNode = null;
  if (p.loaded && p.sessions.length === 0) {
    if (p.hiddenCount > 0) {
      empty = (
        <div className={s.empty}>
          <p className={c.h3}>보이는 세션이 없습니다</p>
          <p className={`${c.small} ${c.muted}`}>정리한 세션 {p.hiddenCount}개는 아래 &apos;숨긴 세션 보기&apos;에서 다시 표시할 수 있습니다.</p>
        </div>
      );
    } else if (p.filtered) {
      empty = (
        <div className={s.empty}>
          <p className={`${c.small} ${c.muted}`}>이 프로젝트에 최근 24시간 세션이 없습니다.</p>
          <button type="button" className={`${c.btn} ${c.ghost}`} onClick={p.onShowAll}>
            전체 보기
          </button>
        </div>
      );
    } else {
      empty = (
        <div className={s.empty}>
          <p className={c.h3}>아직 받은 세션이 없습니다</p>
          <p className={`${c.small} ${c.muted}`}>
            Claude Code의 observe hook이 이 서버(<code className={c.mono}>/api/events</code>)로 이벤트를 보내면 여기에 세션이 나타납니다. hook의{' '}
            <code className={c.mono}>AGENT_OBSERVER_URL</code>과 토큰 설정을 확인하세요.
          </p>
        </div>
      );
    }
  } else if (p.loaded && active.length === 0 && ended.length > 0) {
    empty = <p className={`${c.small} ${c.muted} ${s.empty}`}>활성 세션이 없습니다.</p>;
  }

  return (
    <section className={`${c.panel} ${s.panel}`} aria-labelledby="session-list-title">
      <div className={c.panelHead}>
        <h2 id="session-list-title" className={c.panelTitle} tabIndex={-1} ref={p.titleRef}>
          세션 목록
        </h2>
        {p.loaded ? <span className={c.caption}>활성 {active.length}</span> : null}
      </div>
      {!p.loaded ? (
        <ul className={s.list} aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className={s.skeletonRow}>
              <span className={c.skeleton} style={{ width: '60%' }} />
              <span className={c.skeleton} style={{ width: '40%' }} />
            </li>
          ))}
        </ul>
      ) : (
        <>
          {empty}
          {active.length > 0 ? <ul className={s.list}>{active.map((x) => row(x, 'normal'))}</ul> : null}
          {ended.length > 0 ? (
            <div className={s.fold}>
              <button
                type="button"
                className={`${c.btn} ${c.ghost} ${s.foldButton}`}
                aria-expanded={p.endedOpen}
                aria-controls="ended-sessions"
                onClick={p.onToggleEnded}
              >
                <Icon name={p.endedOpen ? 'chevronDown' : 'chevronRight'} />
                종료된 세션 ({ended.length})
              </button>
              <ul id="ended-sessions" className={s.list} hidden={!p.endedOpen}>
                {p.endedOpen ? ended.map((x) => row(x, 'normal')) : null}
              </ul>
            </div>
          ) : null}
          {p.dismissNote ? (
            <p className={`${c.note} ${s.noteLine}`} role="status">
              <Icon name="info" />
              <span>정리한 세션은 새 이벤트가 오면 다시 보입니다. 아래 &apos;숨긴 세션 보기&apos;에서 바로 되돌릴 수도 있습니다.</span>
            </p>
          ) : null}
          {showHiddenToggle ? (
            <div className={s.fold}>
              <button
                type="button"
                ref={p.hiddenToggleRef}
                className={`${c.btn} ${c.ghost} ${s.foldButton}`}
                aria-expanded={p.hiddenOpen}
                aria-controls="hidden-sessions"
                onClick={p.onToggleHidden}
                data-hidden-toggle
              >
                <Icon name={p.hiddenOpen ? 'chevronDown' : 'chevronRight'} />
                숨긴 세션 {p.hiddenCount}개 {p.hiddenOpen ? '접기' : '보기'}
              </button>
              {p.hiddenOpen ? (
                <div className={s.hiddenArea}>
                  {p.restoreNote ? (
                    <p className={`${c.note} ${s.noteLine}`} role="status">
                      <Icon name="info" />
                      <span>{p.restoreNote}</span>
                    </p>
                  ) : null}
                  {p.hidden !== null && p.hidden.length === 0 ? (
                    <p className={`${c.small} ${c.muted}`}>숨긴 세션이 없습니다.</p>
                  ) : null}
                  <ul id="hidden-sessions" className={s.list} aria-label="숨긴 세션">
                    {(p.hidden ?? []).map((x) => row(x, 'hidden'))}
                  </ul>
                </div>
              ) : (
                <ul id="hidden-sessions" hidden aria-label="숨긴 세션" />
              )}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
