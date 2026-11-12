/**
 * 로그인 후 이동할 경로 확인. proxy.ts(서버)와 로그인 화면(브라우저)이 같이 쓴다.
 * `/`로 시작하는 내부 경로만 허용(`//host`, `/\host` 같은 외부 이동 차단).
 */
export function safeNextPath(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\')) return '/';
  return path;
}
