/**
 * 서명 쿠키 만들기·검증(T1-4, 설계 4절, ADR A5).
 * 값: `v1.<만료 epoch초>.<base64url HMAC-SHA256("v1."+만료)>`.
 * 키: OBSERVER_SESSION_SECRET, 없으면 HMAC(OBSERVER_PASSWORD, "agent-observer-cookie")
 * → 비밀번호를 바꾸면 기존 쿠키가 모두 무효가 된다.
 *
 * Web Crypto(crypto.subtle)만 쓴다. proxy와 route handler 런타임과 무관하게 같은 코드를 쓴다.
 * 비밀번호·비밀 키·쿠키 값은 로그에 남기지 않는다.
 */
import { config } from '@/config';

export const COOKIE_VERSION = 'v1';
const DERIVE_LABEL = 'agent-observer-cookie';

export interface AuthEnv {
  OBSERVER_PASSWORD?: string;
  OBSERVER_SESSION_SECRET?: string;
}

const enc = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]+$/.test(s)) return null;
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function hmacKey(raw: Uint8Array<ArrayBuffer>, usages: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, usages);
}

/** 로그인 가능 여부. 비밀번호가 비었으면 로그인도, 쿠키 검증도 하지 않는다(열린 상태로 시작하지 않음) */
export function isPasswordConfigured(env: AuthEnv): env is AuthEnv & { OBSERVER_PASSWORD: string } {
  return typeof env.OBSERVER_PASSWORD === 'string' && env.OBSERVER_PASSWORD.length > 0;
}

/** 서명 키(raw 바이트). 비밀번호가 없으면 null */
async function signingKeyBytes(env: AuthEnv): Promise<Uint8Array<ArrayBuffer> | null> {
  if (!isPasswordConfigured(env)) return null;
  if (env.OBSERVER_SESSION_SECRET) return enc.encode(env.OBSERVER_SESSION_SECRET);
  const k = await hmacKey(enc.encode(env.OBSERVER_PASSWORD), ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(DERIVE_LABEL)));
}

/** 서명 쿠키 값을 만든다. 비밀번호가 없으면 null */
export async function createSessionCookieValue(env: AuthEnv, nowMs: number): Promise<string | null> {
  const raw = await signingKeyBytes(env);
  if (!raw) return null;
  const exp = Math.floor((nowMs + config.cookieMaxAgeMs) / 1000);
  const payload = `${COOKIE_VERSION}.${exp}`;
  const key = await hmacKey(raw, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(payload)));
  return `${payload}.${toBase64Url(sig)}`;
}

/** 서명과 만료를 확인한다. 형식이 틀리거나 위조·만료면 false */
export async function verifySessionCookieValue(
  value: string | null | undefined,
  env: AuthEnv,
  nowMs: number,
): Promise<boolean> {
  if (!value || value.length > 256) return false;
  const m = /^v1\.(\d{1,12})\.([A-Za-z0-9_-]{43})$/.exec(value);
  if (!m) return false;
  const exp = Number(m[1]);
  if (!Number.isSafeInteger(exp) || exp * 1000 <= nowMs) return false;
  const sig = fromBase64Url(m[2]);
  if (!sig || sig.length !== 32) return false;
  const raw = await signingKeyBytes(env);
  if (!raw) return false;
  const key = await hmacKey(raw, ['verify']);
  // crypto.subtle.verify는 상수 시간 비교
  return crypto.subtle.verify('HMAC', key, sig, enc.encode(`${COOKIE_VERSION}.${m[1]}`));
}

/** Cookie 헤더에서 이름이 같은 값 하나를 꺼낸다 */
export function readCookie(cookieHeader: string | null, name: string = config.cookieName): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() !== name) continue;
    return part.slice(i + 1).trim();
  }
  return null;
}

/** 요청이 https인지(x-forwarded-proto 또는 URL). Secure 속성은 https일 때만 붙인다 */
export function isHttps(req: Request): boolean {
  const proto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase();
  if (proto) return proto === 'https';
  try {
    return new URL(req.url).protocol === 'https:';
  } catch {
    return false;
  }
}

function attrs(req: Request, maxAgeSec: number): string {
  const parts = ['Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSec}`];
  if (isHttps(req)) parts.push('Secure');
  return parts.join('; ');
}

export function sessionSetCookie(req: Request, value: string): string {
  return `${config.cookieName}=${value}; ${attrs(req, Math.floor(config.cookieMaxAgeMs / 1000))}`;
}

export function clearSetCookie(req: Request): string {
  return `${config.cookieName}=; ${attrs(req, 0)}`;
}
