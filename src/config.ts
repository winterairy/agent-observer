/**
 * 상수 한곳(설계 11절). 환경 변수가 아니다.
 * 값의 근거: docs/HANDOFF.md "결정 필요" D-1~D-18 제안 기본값.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export const config = {
  /** D-1 요청 본문 크기 제한(바이트) */
  maxBodyBytes: 16 * 1024,
  /** D-2 문자열 필드 최대 길이 */
  maxStringLength: 256,
  /** D-4 세션당 보관 이벤트 수 */
  maxEventsPerSession: 500,
  /** D-4 이벤트 보관 기간 */
  eventRetentionMs: 7 * DAY,
  /** D-6 작업 중·생각 중 시간 초과 */
  activeTimeoutMs: 10 * MINUTE,
  /** D-6 완료 시간 초과 */
  doneTimeoutMs: 30 * MINUTE,
  /** 승인 대기 "응답 없음" 표시 기준 */
  waitingStaleMs: 24 * HOUR,
  /** 미래 ts 허용 범위. 넘으면 서버 시각으로 바꾼다 */
  futureTsToleranceMs: 5 * MINUTE,
  /** 수집 토큰 최소 길이 */
  minTokenLength: 16,
  /** D-14 로그인 쿠키 유효 기간 */
  cookieMaxAgeMs: 30 * DAY,
  /** D-15 IP별 로그인 실패 제한(1분) */
  loginFailuresPerMinute: 5,
  /** 전역 로그인 실패 제한(1분) */
  loginGlobalFailuresPerMinute: 20,
  /** D-17 종료 세션 화면 표시 기간 */
  endedSessionVisibleMs: 24 * HOUR,
  /** D-18 화면 폴링 간격 */
  pollIntervalMs: 3_000,
  /** fileStore 디스크 쓰기 디바운스 */
  fileWriteDebounceMs: 250,
  /** fileStore 전체 prune 주기 */
  pruneIntervalMs: HOUR,
} as const;

export type Config = typeof config;
