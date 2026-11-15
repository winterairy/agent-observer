/**
 * 세션 상세 Panel(DT). 명세 3.7·4.1·4.3, DESIGN.md 6절 AgentRow·DataTable.
 * BOT 목록은 표와 AgentRow 목록을 함께 그리고 컨테이너 너비(560px)로 하나만 보인다.
 */
'use client';

import type { RefObject } from 'react';
import { StatusBadge, badgeExtra } from '@/ui/StatusBadge';
import { absoluteText, agoText, waitedText } from '@/ui/format';
import type { AgentView, SessionDetailView } from '@/ui/types';
import c from '@/ui/common.module.css';
import s from '@/ui/SessionDetail.module.css';

export type DetailState =
  | { kind: 'none' }
  | { kind: 'loading' }
  | { kind: 'notFound' }
  | { kind: 'ok'; data: SessionDetailView };

interface Props {
  state: DetailState;
  hidden: boolean;
  busy: boolean;
  error: string | null;
  titleRef: RefObject<HTMLHeadingElement | null>;
  actionRef: RefObject<HTMLButtonElement | null>;
  onBackToList: () => void;
  onDismiss: () => void;
  onRestore: () => void;
  onClose: () => void;
}

function Skills({ a }: { a: AgentView }) {
  if (a.skills.length === 0 && a.calledAgents.length === 0) return null;
  return (
    <div className={s.extra}>
      {a.skills.length > 0 ? (
        <span className={s.extraGroup}>
          <span className={`${c.caption}`}>스킬</span>
          {a.skills.map((k) => (
            <span key={k.skill} className={c.chip}>
              {k.skill} ×{k.count}
            </span>
          ))}
        </span>
      ) : null}
      {a.calledAgents.length > 0 ? (
        <span className={s.extraGroup}>
          <span className={c.caption}>부른 BOT</span>
          <span className={c.small}>{a.calledAgents.map((x) => `${x.subagentType} ×${x.count}`).join(', ')}</span>
        </span>
      ) : null}
    </div>
  );
}

function agentBadge(a: AgentView, nowMs: number) {
  return (
    <StatusBadge status={a.status} stale={a.stale} extra={badgeExtra(a.status, { currentTool: a.currentTool, waitingSince: a.waitingSince, nowMs, waitedText })} />
  );
}

export function SessionDetail(p: Props) {
  const st = p.state;
  const actionButton =
    st.kind === 'ok' ? (
      <button
        type="button"
        ref={p.actionRef}
        className={`${c.btn} ${c.secondary}`}
        disabled={p.busy}
        onClick={p.hidden ? p.onRestore : p.onDismiss}
        data-detail-action
      >
        {p.hidden ? (p.busy ? '다시 표시 중…' : '다시 표시') : '정리'}
      </button>
    ) : null;
  return (
    <section className={`${c.panel} ${s.panel}`} aria-labelledby="session-detail-title" aria-busy={st.kind === 'loading' ? 'true' : undefined}>
      <div className={c.panelHead}>
        <h2 id="session-detail-title" className={c.panelTitle} tabIndex={-1} ref={p.titleRef}>
          세션 상세
        </h2>
        <span className={s.headActions}>
          {st.kind !== 'none' ? (
            <button type="button" className={`${c.btn} ${c.ghost} ${s.backButton}`} onClick={p.onBackToList}>
              목록으로
            </button>
          ) : null}
          {actionButton}
        </span>
      </div>
      {p.error ? <p className={c.danger}>{p.error}</p> : null}
      {st.kind === 'none' ? (
        <p className={`${c.small} ${c.muted}`}>
          <span className={s.wide}>왼쪽 목록에서 세션을 고르세요.</span>
          <span className={s.narrow}>위 목록에서 세션을 고르세요.</span>
        </p>
      ) : st.kind === 'loading' ? (
        <div className={s.skeleton}>
          <span className={c.skeleton} style={{ width: '50%' }} />
          <span className={c.skeleton} style={{ width: '30%' }} />
          <span className={c.skeleton} style={{ width: '40%' }} />
          <span className={c.skeleton} style={{ width: '100%', height: 32 }} />
          <span className={c.skeleton} style={{ width: '100%', height: 32 }} />
          <span className={c.skeleton} style={{ width: '100%', height: 32 }} />
        </div>
      ) : st.kind === 'notFound' ? (
        <div className={s.notFound}>
          <p className={c.small}>이 세션을 찾을 수 없습니다. 정리되었거나 보관 기간이 지났을 수 있습니다.</p>
          <button type="button" className={`${c.btn} ${c.ghost}`} onClick={p.onClose}>
            닫기
          </button>
        </div>
      ) : (
        <DetailBody data={st.data} />
      )}
    </section>
  );
}

function DetailBody({ data }: { data: SessionDetailView }) {
  const nowMs = Date.parse(data.now);
  const ss = data.session;
  const lastMs = Date.parse(ss.lastEventAt);
  return (
    <div className={s.body}>
      <div className={s.meta}>
        <p className={s.line1}>
          <span className={`${c.h3} ${c.ellipsis}`} title={ss.project}>
            {ss.project}
          </span>
          {ss.branch ? (
            <>
              <span aria-hidden="true" className={c.muted}>·</span>
              <span className={`${c.mono} ${c.small} ${c.ellipsis} ${c.muted}`} title={ss.branch}>
                {ss.branch}
              </span>
            </>
          ) : null}
          {ss.remote ? <span className={c.cloud}>클라우드</span> : null}
        </p>
        <div>
          <StatusBadge status={ss.status} stale={ss.stale} extra={badgeExtra(ss.status, { waitingSince: ss.waitingSince, nowMs, waitedText })} />
        </div>
        <dl className={`${s.model} ${c.small}`}>
          <dt className={c.muted}>모델</dt>
          {ss.model ? (
            <dd className={`${c.mono} ${c.ellipsis}`} title={ss.model} data-testid="session-model">
              {ss.model}
            </dd>
          ) : (
            <dd className={c.muted} data-testid="session-model">
              알 수 없음
            </dd>
          )}
        </dl>
        <p className={`${c.small} ${c.muted}`}>
          세션 <span className={c.mono}>{ss.sessionId.slice(0, 8)}</span> · 마지막 이벤트{' '}
          <time dateTime={ss.lastEventAt} title={absoluteText(lastMs)}>
            {agoText(lastMs, nowMs)}
          </time>
        </p>
      </div>
      <div className={s.bots}>
        <h3 className={c.h3}>BOT ({data.agents.length})</h3>
        <div className={s.container}>
          <table className={s.table}>
            <caption className="visually-hidden">BOT 목록과 상태</caption>
            <thead>
              <tr>
                <th scope="col">BOT</th>
                <th scope="col">상태</th>
              </tr>
            </thead>
            <tbody>
              {data.agents.map((a) => (
                <AgentTableRows key={a.agentKey} a={a} nowMs={nowMs} />
              ))}
            </tbody>
          </table>
          <ul className={s.cards} aria-label="BOT 목록과 상태">
            {data.agents.map((a) => (
              <li key={a.agentKey} className={s.card}>
                <div className={s.cardLine}>
                  <span className={c.h3}>{a.displayName}</span>
                  <span className={`${c.caption} ${c.mono}`}>{a.role}</span>
                </div>
                <div>{agentBadge(a, nowMs)}</div>
                <Skills a={a} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function AgentTableRows({ a, nowMs }: { a: AgentView; nowMs: number }) {
  const hasExtra = a.skills.length > 0 || a.calledAgents.length > 0;
  return (
    <>
      <tr className={hasExtra ? s.noBorder : undefined} data-agent-key={a.agentKey}>
        <td>
          <span className={s.botCell}>
            <span className={c.h3}>{a.displayName}</span>
            <span className={`${c.caption} ${c.mono}`}>{a.role}</span>
          </span>
        </td>
        <td>{agentBadge(a, nowMs)}</td>
      </tr>
      {hasExtra ? (
        <tr className={s.extraRow}>
          <td colSpan={2}>
            <Skills a={a} />
          </td>
        </tr>
      ) : null}
    </>
  );
}
