/**
 * 임시 사무실(OfficeFloor/OfficeAvatar) + 플랜 계기판(PlanUsageMini). DESIGN.md 6절·2.1, 명세 3.8.
 * 바닥 요소에 data-office-scope를 달아 다크 모드에서도 라이트 값을 쓴다. 원본 Pixel Agent Desk 그림을 쓰지 않는다:
 * 사각형 + 글자, 캐릭터 설정이 있으면(ok:true) 사용자 그림의 프레임만 잘라 보인다.
 */
'use client';

import { useState, type CSSProperties } from 'react';
import { Icon } from '@/ui/icons';
import { PlanUsageMini } from '@/ui/PlanUsage';
import { statusStyle, toneVars } from '@/ui/statusStyle';
import { waitedText } from '@/ui/format';
import type { AgentView, CharactersView, PlanUsageView, SessionDetailView } from '@/ui/types';
import c from '@/ui/common.module.css';
import s from '@/ui/Office.module.css';

type Zone = 'waiting' | 'desk' | 'rest';
const ZONES: { id: Zone; label: string }[] = [
  { id: 'waiting', label: '승인 대기' },
  { id: 'desk', label: '책상' },
  { id: 'rest', label: '쉬는 곳' },
];

function zoneOf(a: AgentView): Zone | null {
  if (a.status === 'waiting') return 'waiting';
  if (a.status === 'working' || a.status === 'thinking') return 'desk';
  if (a.status === 'done') return 'rest';
  return null;
}

/** 상태 → 캐릭터 동작(설계 7절) */
function actionOf(a: AgentView): string {
  if (a.status === 'working') return 'sit_work';
  if (a.status === 'thinking') return 'sit';
  if (a.status === 'waiting') return 'alert';
  return 'idle';
}

const BOX = 40;

interface SpriteInfo {
  image: string;
  vars: CSSProperties;
  row: number;
  frames: number;
}

/** 캐릭터 설정이 있고(ok:true) 이 상태의 동작(대체 포함)이 있으면 프레임 정보, 아니면 null(사각형) */
function spriteFor(a: AgentView, characters: CharactersView | null): SpriteInfo | null {
  const ch = a.characterId && characters ? characters.characters[a.characterId] : undefined;
  if (!ch || !ch.ok) return null;
  const act = ch.actions[`${actionOf(a)}_down`];
  if (!act) return null;
  // 한 칸을 40px 높이에 맞춘 정수 배율(작으면 확대, 크면 1/n 축소)
  const scale = ch.frameHeight <= BOX ? Math.max(1, Math.floor(BOX / ch.frameHeight)) : 1 / Math.ceil(ch.frameHeight / BOX);
  const vars = {
    width: ch.frameWidth * scale,
    height: ch.frameHeight * scale,
    '--s': String(scale),
    '--y': `${-act.row * ch.frameHeight}px`,
    '--x-end': `${-act.frames * ch.frameWidth}px`,
    '--frames': String(act.frames),
    '--dur': `${act.frames / act.fps}s`,
  } as CSSProperties;
  return { image: ch.image, vars, row: act.row, frames: act.frames };
}

function Avatar({ a, nowMs, characters }: { a: AgentView; nowMs: number; characters: CharactersView | null }) {
  const [failed, setFailed] = useState(false);
  const st = statusStyle(a.status, a.stale);
  const v = toneVars(st.tone);
  const statusText =
    a.status === 'waiting' && a.waitingSince ? `${a.stale ? '응답 없음' : '승인 대기'} · ${waitedText(Date.parse(a.waitingSince), nowMs)}` : st.label;
  const info = failed ? null : spriteFor(a, characters);
  const sprite = info ? (
    <span className={s.sprite} style={info.vars} data-testid="avatar-sprite" data-row={info.row} data-frames={info.frames}>
      <img src={info.image} alt="" className={s.sheet} onError={() => setFailed(true)} draggable={false} />
    </span>
  ) : null;
  return (
    <li className={s.cell} data-status={a.status} data-agent-key={a.agentKey}>
      <span
        className={`${s.box} ${a.status === 'working' ? s.working : ''} ${sprite ? s.withSprite : ''}`}
        style={{ background: sprite ? 'transparent' : v.bg, borderColor: v.fg, color: v.fg }}
      >
        {sprite ?? <Icon name={st.icon} size={20} className={s.icon} />}
      </span>
      {a.status === 'working' || a.status === 'thinking' ? (
        <span className={`${s.desk} ${a.status === 'thinking' ? s.deskGap : ''}`} aria-hidden="true" />
      ) : null}
      <span className={`${s.name} ${c.ellipsis}`} title={a.displayName}>
        {a.displayName}
      </span>
      <span className={s.state}>
        <span className="visually-hidden">, </span>
        {statusText}
      </span>
    </li>
  );
}

export function Office({
  detail,
  plan,
  characters,
}: {
  detail: SessionDetailView | null;
  plan: PlanUsageView | null;
  characters: CharactersView | null;
}) {
  const visible = detail ? detail.agents.filter((a) => zoneOf(a) !== null) : [];
  const nowMs = detail ? Date.parse(detail.now) : 0;
  return (
    <section className={`${c.panel} ${s.panel}`} aria-labelledby="office-title">
      <div className={c.panelHead}>
        <h2 id="office-title" className={c.panelTitle}>
          임시 사무실
        </h2>
        <span className={c.caption}>임시 그림</span>
      </div>
      {!detail ? (
        <p className={`${c.small} ${c.muted}`}>세션을 고르면 BOT이 보입니다.</p>
      ) : visible.length === 0 ? (
        <p className={`${c.small} ${c.muted}`}>모든 BOT이 종료되었습니다.</p>
      ) : (
        <div className={s.floor} data-office-scope="" data-testid="office-floor">
          <PlanUsageMini plan={plan} />
          <ul aria-label="임시 사무실" className={s.zones}>
            {ZONES.map((z) => {
              const list = visible.filter((a) => zoneOf(a) === z.id);
              return (
                <li key={z.id} className={s.zone} data-zone={z.id}>
                  <p className={s.zoneLabel}>
                    {z.label}
                    {list.length === 0 ? <span className={s.zoneEmpty}> 없음</span> : null}
                  </p>
                  {list.length > 0 ? (
                    <ul className={s.cells} aria-label={z.label}>
                      {list.map((a) => (
                        <Avatar key={a.agentKey} a={a} nowMs={nowMs} characters={characters} />
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
