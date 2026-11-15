/**
 * 로그인 화면(명세 2절). fetch로 POST /api/auth/login → 204면 next(safeNextPath로 다시 확인)로 location.replace.
 * 각주(Note)는 항상 보이고 입력창 aria-describedby에 연결한다.
 */
'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { safeNextPath } from '@/auth/nextPath';
import { Icon } from '@/ui/icons';
import c from '@/ui/common.module.css';
import s from './login.module.css';

type Err = { kind: 'none' } | { kind: 'invalid' } | { kind: 'wait'; until: number } | { kind: 'fail' };

export function LoginForm() {
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<Err>({ kind: 'none' });
  const [, setTick] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const remaining = err.kind === 'wait' ? Math.max(0, Math.ceil((err.until - Date.now()) / 1000)) : 0;

  useEffect(() => {
    if (err.kind !== 'wait') return;
    const t = setInterval(() => {
      if (Date.now() >= err.until) setErr({ kind: 'none' });
      else setTick((n) => n + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [err]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || err.kind === 'wait') return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password }),
      });
      if (res.status === 204) {
        const next = new URLSearchParams(window.location.search).get('next') ?? '/';
        window.location.replace(safeNextPath(next));
        return;
      }
      if (res.status === 401) {
        setErr({ kind: 'invalid' });
        setPassword('');
        requestAnimationFrame(() => inputRef.current?.focus());
      } else if (res.status === 429) {
        const sec = Math.max(1, Number(res.headers.get('retry-after')) || 60);
        setErr({ kind: 'wait', until: Date.now() + sec * 1000 });
      } else {
        setErr({ kind: 'fail' });
      }
    } catch {
      setErr({ kind: 'fail' });
    }
    setSubmitting(false);
  }

  const fieldError =
    err.kind === 'invalid' ? '비밀번호가 맞지 않습니다.' : err.kind === 'wait' ? `시도가 너무 많습니다. ${remaining}초 후에 다시 시도하세요.` : null;
  const describedBy = fieldError ? 'password-error login-note' : 'login-note';

  return (
    <main className={s.page}>
      <div className={s.wrap}>
        {err.kind === 'fail' ? (
          <div className={c.errorBar} role="alert">
            <span>
              <Icon name="triangleBang" />
              로그인 요청을 처리하지 못했습니다. 잠시 후 다시 시도하세요.
            </span>
          </div>
        ) : null}
        <form className={`${c.panel} ${s.card}`} onSubmit={onSubmit} noValidate={false}>
          <h1 className={s.title}>agent-observer</h1>
          <p className={`${c.small} ${c.muted}`}>관찰 화면에 들어가려면 비밀번호를 입력하세요.</p>
          <div className={s.field}>
            <label htmlFor="password" className={s.label}>
              비밀번호
            </label>
            <input
              ref={inputRef}
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
              readOnly={submitting}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${s.input} ${fieldError ? s.inputError : ''}`}
              aria-invalid={fieldError ? 'true' : undefined}
              aria-describedby={describedBy}
            />
            {fieldError ? (
              <p id="password-error" className={c.danger} role="alert">
                {fieldError}
              </p>
            ) : null}
          </div>
          <button type="submit" className={`${c.btn} ${c.primary} ${s.submit}`} disabled={submitting || err.kind === 'wait'}>
            {submitting ? '로그인 중…' : '로그인'}
          </button>
        </form>
        <p id="login-note" className={`${c.note} ${s.note}`}>
          <Icon name="info" />
          <span>
            서버에 <code className={c.mono}>OBSERVER_PASSWORD</code>가 설정되어 있어야 로그인할 수 있습니다.
          </span>
        </p>
      </div>
    </main>
  );
}
