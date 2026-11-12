/**
 * 대시보드 `/`(명세 3절). 3초 폴링: /api/sessions, /api/plan-usage, /api/projects, (선택 시) /api/sessions/[key],
 * (숨긴 세션을 펼쳤으면) /api/sessions?hidden=only. 탭이 숨겨지면 멈추고 보이면 즉시 1회(설계 8절).
 * 401이면 /login?next=… 로 이동한다. DOM 순서 = Tab 순서(명세 6절): 건너뛰기 → 로그아웃 → 승인 대기 띠 → 필터 → 목록 → 상세.
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getJson, goLogin, postEmpty, Unauthorized } from '@/ui/api';
import { agoText } from '@/ui/format';
import { Icon } from '@/ui/icons';
import { Office } from '@/ui/Office';
import { PlanUsagePanel } from '@/ui/PlanUsage';
import { SessionDetail, type DetailState } from '@/ui/SessionDetail';
import { SessionList, sessionTitle } from '@/ui/SessionList';
import type { CharactersView, PlanUsageView, ProjectView, SessionDetailView, SessionListItem, SessionsView } from '@/ui/types';
import c from '@/ui/common.module.css';
import s from '@/ui/Dashboard.module.css';

const POLL_MS = 3000;
const FAIL_BAR_AFTER = 3;
const PROJECT_KEY = 'obs.project';

function readUrl(): { project: string | null; session: string | null } {
  const q = new URLSearchParams(window.location.search);
  return { project: q.get('project'), session: q.get('session') };
}

function writeUrl(project: string, session: string | null): void {
  const q = new URLSearchParams(window.location.search);
  if (project) q.set('project', project);
  else q.delete('project');
  if (session) q.set('session', session);
  else q.delete('session');
  const qs = q.toString();
  window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
}

const isDesktop = () => window.matchMedia('(min-width: 1024px)').matches;
const isMobile = () => window.matchMedia('(max-width: 767px)').matches;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function focusSelector(sel: string): boolean {
  const el = document.querySelector<HTMLElement>(sel);
  if (!el) return false;
  el.focus();
  return true;
}

export function Dashboard() {
  const [ready, setReady] = useState(false);
  const [project, setProject] = useState('');
  const [projects, setProjects] = useState<ProjectView[] | null>(null);
  const [list, setList] = useState<SessionsView | null>(null);
  const [hidden, setHidden] = useState<SessionListItem[] | null>(null);
  const [plan, setPlan] = useState<PlanUsageView | null>(null);
  const [characters, setCharacters] = useState<CharactersView | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState>({ kind: 'none' });
  const [failCount, setFailCount] = useState(0);
  const [lastOkAt, setLastOkAt] = useState<number | null>(null);
  const [endedOpen, setEndedOpen] = useState(false);
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set());
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [dismissNote, setDismissNote] = useState(false);
  const [restoreNote, setRestoreNote] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [, setTick] = useState(0);

  const listTitleRef = useRef<HTMLHeadingElement>(null);
  const detailTitleRef = useRef<HTMLHeadingElement>(null);
  const detailActionRef = useRef<HTMLButtonElement>(null);
  const hiddenToggleRef = useRef<HTMLButtonElement>(null);
  const detailSectionRef = useRef<HTMLDivElement>(null);
  const live = useRef({ project: '', selectedKey: null as string | null, hiddenOpen: false, detailKind: 'none' as DetailState['kind'] });
  live.current.project = project;
  live.current.selectedKey = selectedKey;
  live.current.hiddenOpen = hiddenOpen;
  live.current.detailKind = detail.kind;
  const stopped = useRef(false);
  const autoSelected = useRef(false);
  const lastFocusedRow = useRef<string | null>(null);

  const handle401 = useCallback((e: unknown): boolean => {
    if (e instanceof Unauthorized) {
      stopped.current = true;
      goLogin();
      return true;
    }
    return false;
  }, []);

  const sessionsUrl = (p: string, hiddenOnly = false) => {
    const q = new URLSearchParams();
    if (p) q.set('project', p);
    if (hiddenOnly) q.set('hidden', 'only');
    const qs = q.toString();
    return `/api/sessions${qs ? `?${qs}` : ''}`;
  };

  const loadDetail = useCallback(
    async (key: string) => {
      try {
        const d = await getJson<SessionDetailView>(`/api/sessions/${encodeURIComponent(key)}`);
        if (live.current.selectedKey === key) setDetail({ kind: 'ok', data: d });
      } catch (e) {
        if (handle401(e)) return;
        if (e instanceof Error && 'status' in e && (e as { status: number }).status === 404) {
          if (live.current.selectedKey === key) setDetail({ kind: 'notFound' });
          return;
        }
        throw e;
      }
    },
    [handle401],
  );

  const loadList = useCallback(async (p: string) => {
    const v = await getJson<SessionsView>(sessionsUrl(p));
    if (live.current.project === p) setList(v);
    return v;
  }, []);

  const loadHidden = useCallback(async (p: string) => {
    const v = await getJson<SessionsView>(sessionsUrl(p, true));
    if (live.current.project === p) setHidden(v.sessions);
    return v.sessions;
  }, []);

  /** 폴링 1회. scheduled=true(주기 폴링)면 정리·다시 표시 안내를 지운다(명세: 다음 폴링 때 사라짐) */
  const refresh = useCallback(
    async (scheduled: boolean) => {
      if (stopped.current) return;
      const { project: p, selectedKey: key, hiddenOpen: hOpen, detailKind } = live.current;
      try {
        const jobs: Promise<unknown>[] = [
          loadList(p),
          getJson<PlanUsageView>('/api/plan-usage').then(setPlan),
          getJson<{ projects: ProjectView[] }>('/api/projects').then((r) => setProjects(r.projects)),
        ];
        if (key && detailKind !== 'notFound') jobs.push(loadDetail(key));
        if (hOpen) jobs.push(loadHidden(p));
        await Promise.all(jobs);
        setFailCount(0);
        setLastOkAt(Date.now());
        if (scheduled) {
          setDismissNote(false);
          setRestoreNote(null);
        }
      } catch (e) {
        if (handle401(e)) return;
        setFailCount((n) => n + 1);
      }
    },
    [handle401, loadDetail, loadHidden, loadList],
  );

  // 시작: URL → localStorage → 전체, 캐릭터 설정 1회
  useEffect(() => {
    const u = readUrl();
    let p = u.project ?? '';
    if (!u.project) {
      try {
        p = window.localStorage.getItem(PROJECT_KEY) ?? '';
      } catch {
        p = '';
      }
    }
    live.current.project = p;
    setProject(p);
    if (u.session) {
      live.current.selectedKey = u.session;
      live.current.detailKind = 'loading';
      setSelectedKey(u.session);
      setDetail({ kind: 'loading' });
      autoSelected.current = true;
    }
    writeUrl(p, u.session);
    setReady(true);
    getJson<CharactersView>('/api/characters')
      .then(setCharacters)
      .catch((e) => handle401(e));
  }, [handle401]);

  // 폴링: 숨긴 탭에서는 멈추고, 보이면 즉시 1회
  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) clearInterval(timer);
      timer = setInterval(() => void refresh(true), POLL_MS);
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        if (timer) clearInterval(timer);
        timer = null;
      } else {
        void refresh(false);
        start();
      }
    };
    void refresh(false);
    if (document.visibilityState !== 'hidden') start();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [ready, refresh]);

  // 실패 표시의 "N초 전"을 갱신
  useEffect(() => {
    if (failCount === 0) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [failCount]);

  // 저장된 프로젝트가 목록에 없으면 전체로
  useEffect(() => {
    if (!projects || !project) return;
    if (!projects.some((x) => x.project === project)) changeProject('');
  }, [projects]);

  // 포커스된 행이 폴링으로 사라지면 목록 제목으로(명세 6절)
  useEffect(() => {
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      lastFocusedRow.current = el?.closest('[data-session-key]')?.getAttribute('data-session-key') ?? null;
    };
    document.addEventListener('focusin', onFocus);
    return () => document.removeEventListener('focusin', onFocus);
  }, []);
  useEffect(() => {
    const key = lastFocusedRow.current;
    if (!key || document.activeElement !== document.body) return;
    if (!document.querySelector(`[data-session-key="${CSS.escape(key)}"]`)) {
      lastFocusedRow.current = null;
      listTitleRef.current?.focus();
    }
  }, [list, hidden]);

  const select = useCallback(
    (key: string | null, opts: { focusDetail?: boolean } = {}) => {
      live.current.selectedKey = key;
      setSelectedKey(key);
      setDetailError(null);
      writeUrl(live.current.project, key);
      if (!key) {
        live.current.detailKind = 'none';
        setDetail({ kind: 'none' });
        return;
      }
      live.current.detailKind = 'loading';
      setDetail({ kind: 'loading' });
      loadDetail(key).catch(() => setFailCount((n) => n + 1));
      if (opts.focusDetail && isMobile()) {
        requestAnimationFrame(() => {
          detailSectionRef.current?.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
          detailTitleRef.current?.focus({ preventScroll: true });
        });
      }
    },
    [loadDetail],
  );

  // 1280: 처음 진입 시 첫 세션 자동 선택(390은 하지 않음)
  useEffect(() => {
    if (autoSelected.current || !list) return;
    autoSelected.current = true;
    if (list.sessions.length > 0 && isDesktop()) select(list.sessions[0].key);
  }, [list, select]);

  function changeProject(p: string) {
    live.current.project = p;
    setProject(p);
    try {
      window.localStorage.setItem(PROJECT_KEY, p);
    } catch {
      /* 저장 못 해도 동작 */
    }
    writeUrl(p, live.current.selectedKey);
    setList(null);
    setHidden(null);
    loadList(p)
      .then((v) => {
        const key = live.current.selectedKey;
        // 선택 세션이 새 필터에 없으면 상세를 닫는다(숨긴 세션이라 목록에 없어도 같은 프로젝트면 둔다)
        const sameProject = detail.kind === 'ok' && detail.data.session.project === p;
        if (key && p && !v.sessions.some((x) => x.key === key) && !sameProject) select(null);
      })
      .catch((e) => {
        if (!handle401(e)) setFailCount((n) => n + 1);
      });
    if (live.current.hiddenOpen) loadHidden(p).catch(() => undefined);
  }

  const setBusy = (key: string, on: boolean) =>
    setBusyKeys((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  const setRowError = (key: string, msg: string | null) =>
    setRowErrors((prev) => {
      const next = { ...prev };
      if (msg) next[key] = msg;
      else delete next[key];
      return next;
    });

  async function dismiss(item: SessionListItem, fromDetail = false) {
    const visible = list ? list.sessions : [];
    const idx = visible.findIndex((x) => x.key === item.key);
    setRowError(item.key, null);
    setDetailError(null);
    let status: number;
    try {
      status = await postEmpty(`/api/sessions/${encodeURIComponent(item.key)}/dismiss`);
    } catch (e) {
      if (handle401(e)) return;
      status = 0;
    }
    if (status !== 204) {
      if (fromDetail) setDetailError('정리하지 못했습니다');
      else setRowError(item.key, '정리하지 못했습니다');
      return;
    }
    setList((prev) =>
      prev ? { ...prev, hiddenCount: prev.hiddenCount + 1, sessions: prev.sessions.filter((x) => x.key !== item.key) } : prev,
    );
    setDismissNote(true);
    const wasSelected = live.current.selectedKey === item.key;
    if (wasSelected) select(null);
    if (live.current.hiddenOpen) loadHidden(live.current.project).catch(() => undefined);
    // 포커스: 다음 행 → 이전 행 → 목록 제목
    const next = visible[idx + 1] ?? visible[idx - 1];
    requestAnimationFrame(() => {
      if (!(next && focusSelector(`[data-row-link="${CSS.escape(next.key)}"]`))) listTitleRef.current?.focus();
    });
  }

  async function restore(item: SessionListItem, fromDetail = false) {
    const rows = hidden ?? [];
    const idx = rows.findIndex((x) => x.key === item.key);
    const title = sessionTitle(item, Boolean(project));
    setBusy(item.key, true);
    setRowError(item.key, null);
    setDetailError(null);
    let status: number;
    try {
      status = await postEmpty(`/api/sessions/${encodeURIComponent(item.key)}/restore`);
    } catch (e) {
      if (handle401(e)) return;
      status = 0;
    }
    setBusy(item.key, false);
    if (status !== 204) {
      const msg = status === 404 ? '이 세션을 찾을 수 없습니다. 보관 기간이 지났을 수 있습니다.' : '다시 표시하지 못했습니다.';
      if (fromDetail) setDetailError(msg);
      else setRowError(item.key, msg);
      return;
    }
    setHidden((prev) => (prev ? prev.filter((x) => x.key !== item.key) : prev));
    setList((prev) => (prev ? { ...prev, hiddenCount: Math.max(0, prev.hiddenCount - 1) } : prev));
    let shown = true;
    try {
      const v = await loadList(live.current.project);
      shown = v.sessions.some((x) => x.key === item.key);
    } catch (e) {
      handle401(e);
    }
    if (live.current.hiddenOpen) {
      setRestoreNote(shown ? `${title} 세션을 다시 표시했습니다.` : '다시 표시했습니다. 24시간이 지난 종료 세션이라 목록에는 보이지 않습니다.');
    }
    if (live.current.selectedKey === item.key) loadDetail(item.key).catch(() => undefined);
    requestAnimationFrame(() => {
      if (fromDetail) {
        detailActionRef.current?.focus();
        return;
      }
      const next = rows[idx + 1] ?? rows[idx - 1];
      if (!(next && focusSelector(`[data-row-action="${CSS.escape(next.key)}"]`))) hiddenToggleRef.current?.focus();
    });
  }

  function toggleHidden() {
    const open = !hiddenOpen;
    live.current.hiddenOpen = open;
    setHiddenOpen(open);
    setRestoreNote(null);
    if (open) loadHidden(live.current.project).catch((e) => handle401(e));
    else setHidden(null);
  }

  function backToList() {
    const key = live.current.selectedKey;
    const el = key ? document.querySelector<HTMLElement>(`[data-row-link="${CSS.escape(key)}"]`) : null;
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
      el.focus({ preventScroll: true });
    } else listTitleRef.current?.focus();
  }

  function closeDetail() {
    const key = live.current.selectedKey;
    select(null);
    requestAnimationFrame(() => {
      if (!(key && focusSelector(`[data-row-link="${CSS.escape(key)}"]`))) listTitleRef.current?.focus();
    });
  }

  async function logout() {
    stopped.current = true;
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch {
      /* 결과와 무관하게 이동 */
    }
    window.location.assign('/login');
  }

  const sessions = list?.sessions ?? [];
  const waiting = useMemo(() => sessions.filter((x) => x.status === 'waiting'), [sessions]);
  const staleCount = waiting.filter((x) => x.stale).length;
  const nowMs = list ? Date.parse(list.now) : 0;
  const detailData = detail.kind === 'ok' ? detail.data : null;
  const detailHidden = detailData ? detailData.session.dismissedAt !== null : false;

  const syncText =
    failCount === 0
      ? lastOkAt === null
        ? '3초마다 갱신'
        : `3초마다 갱신 · ${agoText(lastOkAt, Date.now())}`
      : lastOkAt === null
        ? '갱신 실패'
        : `갱신 실패 · ${Math.max(0, Math.floor((Date.now() - lastOkAt) / 1000))}초 전 데이터`;

  return (
    <>
      <a href="#session-list-title" className={s.skip}>
        본문으로 건너뛰기
      </a>
      <header className={s.header}>
        <div className={s.headerInner}>
          <h1 className={s.title}>agent-observer</h1>
          <span className={`${s.sync} ${failCount > 0 ? s.syncFail : ''}`} data-testid="sync">
            {failCount > 0 ? <Icon name="triangleBang" /> : null}
            {syncText}
          </span>
          <button type="button" className={`${c.btn} ${c.secondary} ${s.logout}`} onClick={logout}>
            로그아웃
          </button>
        </div>
      </header>
      <main className={s.main}>
        {failCount >= FAIL_BAR_AFTER ? (
          <div className={c.errorBar} role="alert">
            <span>
              <Icon name="triangleBang" />
              서버에서 데이터를 가져오지 못하고 있습니다. 마지막으로 받은 데이터를 보여 주는 중입니다.
            </span>
            <button type="button" className={`${c.btn} ${c.secondary}`} onClick={() => void refresh(false)}>
              다시 시도
            </button>
          </div>
        ) : null}
        <div role="status" aria-live="polite" className={s.bannerSlot}>
          {waiting.length > 0 ? (
            <button type="button" className={s.banner} onClick={() => select(waiting[0].key, { focusDetail: true })}>
              <Icon name="circleBang" />
              <span className={c.h3}>
                승인 대기 {waiting.length}개 세션{staleCount > 0 ? ` (응답 없음 ${staleCount}개 포함)` : ''}
              </span>
              <Icon name="chevronRight" className={s.bannerChevron} />
            </button>
          ) : null}
        </div>
        <PlanUsagePanel plan={plan} />
        <div className={s.filter}>
          <label htmlFor="project-filter" className={s.filterLabel}>
            프로젝트
          </label>
          <select id="project-filter" className={s.select} value={project} onChange={(e) => changeProject(e.target.value)}>
            <option value="">전체 ({projects?.length ?? 0})</option>
            {(projects ?? []).map((x) => (
              <option key={x.project} value={x.project}>
                {x.project} — 활성 {x.active}/{x.sessions}
              </option>
            ))}
            {project && projects && !projects.some((x) => x.project === project) ? <option value={project}>{project}</option> : null}
            {project && !projects ? <option value={project}>{project}</option> : null}
          </select>
        </div>
        <div className={s.grid}>
          <div className={s.colList}>
            <SessionList
              loaded={list !== null}
              sessions={sessions}
              hiddenCount={list?.hiddenCount ?? 0}
              hidden={hidden}
              nowMs={nowMs}
              filtered={Boolean(project)}
              selectedKey={selectedKey}
              endedOpen={endedOpen}
              hiddenOpen={hiddenOpen}
              busyKeys={busyKeys}
              rowErrors={rowErrors}
              dismissNote={dismissNote}
              restoreNote={restoreNote}
              titleRef={listTitleRef}
              hiddenToggleRef={hiddenToggleRef}
              onSelect={(key) => select(key, { focusDetail: true })}
              onDismiss={(item) => void dismiss(item)}
              onRestore={(item) => void restore(item)}
              onToggleEnded={() => setEndedOpen((v) => !v)}
              onToggleHidden={toggleHidden}
              onShowAll={() => changeProject('')}
            />
          </div>
          <div className={s.colDetail} ref={detailSectionRef}>
            <SessionDetail
              state={detail}
              hidden={detailHidden}
              busy={selectedKey ? busyKeys.has(selectedKey) : false}
              error={detailError}
              titleRef={detailTitleRef}
              actionRef={detailActionRef}
              onBackToList={backToList}
              onDismiss={() => detailData && void dismiss(detailData.session, true)}
              onRestore={() => detailData && void restore(detailData.session, true)}
              onClose={closeDetail}
            />
          </div>
          <div className={s.colOffice}>
            <Office detail={detailData} plan={plan} characters={characters} />
          </div>
        </div>
      </main>
    </>
  );
}
