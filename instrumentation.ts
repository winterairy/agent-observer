/** Next.js 서버 시작 시 한 번 실행된다. 수집 토큰 설정을 확인해 경고를 남긴다(설계 4절). */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { warnIfServerTokenInvalid } = await import('@/auth/token');
  warnIfServerTokenInvalid();
}
