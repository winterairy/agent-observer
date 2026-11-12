/**
 * 화면 문구 계산(DESIGN.md 3절·6절 "시간 문구", 명세 3.9). 순수 함수: 기준 시각(응답 now)을 인자로 받는다.
 * 시각 표시는 브라우저 시간대(Date의 지역 시각)를 쓴다.
 */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 사용률: 정수 버림(79.9 → 79). 반올림하지 않는다 */
export function percentText(used: number): string {
  return `${Math.floor(used)}%`;
}

/** 승인 대기 기다린 시간: 방금 / N분째 / N시간째(일 단위로 바꾸지 않음) */
export function waitedText(sinceMs: number, nowMs: number): string {
  const d = Math.max(0, nowMs - sinceMs);
  if (d < MIN) return '방금';
  if (d < HOUR) return `${Math.floor(d / MIN)}분째`;
  return `${Math.floor(d / HOUR)}시간째`;
}

/** 지난 시각: 방금 / N분 전 / N시간 전 / N일 전 (마지막 측정, 마지막 이벤트) */
export function agoText(pastMs: number, nowMs: number): string {
  const d = Math.max(0, nowMs - pastMs);
  if (d < MIN) return '방금';
  if (d < HOUR) return `${Math.floor(d / MIN)}분 전`;
  if (d < DAY) return `${Math.floor(d / HOUR)}시간 전`;
  return `${Math.floor(d / DAY)}일 전`;
}

/** 남은 시간: 1분 안 / N분 후 / N시간 M분 후(M=0이면 N시간 후) / N일 M시간 후 */
export function remainingText(targetMs: number, nowMs: number): string {
  const d = Math.max(0, targetMs - nowMs);
  if (d < MIN) return '1분 안';
  if (d < HOUR) return `${Math.floor(d / MIN)}분 후`;
  if (d < DAY) {
    const h = Math.floor(d / HOUR);
    const m = Math.floor((d % HOUR) / MIN);
    return m === 0 ? `${h}시간 후` : `${h}시간 ${m}분 후`;
  }
  const days = Math.floor(d / DAY);
  const h = Math.floor((d % DAY) / HOUR);
  return `${days}일 ${h}시간 후`;
}

const pad = (n: number) => String(n).padStart(2, '0');

function hhmm(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dateText(d: Date): string {
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${WEEKDAYS[d.getDay()]})`;
}

/**
 * 초기화 시각.
 * - 5시간 창: 오늘이면 "18:00", 내일이면 "내일 01:30", 그 밖은 "11월 15일(토) 09:00"
 * - 주간 창: "11월 15일(토) 09:00"
 * 뒤에 " 초기화"는 붙이지 않는다(호출하는 쪽이 붙인다).
 */
export function resetAtText(window: 'five_hour' | 'seven_day', resetMs: number, nowMs: number): string {
  const r = new Date(resetMs);
  if (window === 'seven_day') return `${dateText(r)} ${hhmm(r)}`;
  const now = new Date(nowMs);
  if (sameLocalDay(r, now)) return hhmm(r);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (sameLocalDay(r, tomorrow)) return `내일 ${hhmm(r)}`;
  return `${dateText(r)} ${hhmm(r)}`;
}

/** title 속성용 현지 절대 시각(초까지) */
export function absoluteText(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${hhmm(d)}:${pad(d.getSeconds())}`;
}
