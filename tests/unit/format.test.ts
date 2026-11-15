/** 화면 문구(DESIGN.md 3절·6절 시간 문구). 시간대 영향이 없게 지역 시각으로 기준을 만든다. */
import { describe, expect, it } from 'vitest';
import { agoText, percentText, remainingText, resetAtText, waitedText } from '@/ui/format';
import { statusStyle } from '@/ui/statusStyle';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe('format', () => {
  it('percentText: 정수 버림', () => {
    expect(percentText(79.9)).toBe('79%');
    expect(percentText(42)).toBe('42%');
    expect(percentText(100)).toBe('100%');
  });
  it('waitedText: 방금 / N분째 / N시간째(24시간 넘어도 시간)', () => {
    expect(waitedText(0, 59_999)).toBe('방금');
    expect(waitedText(0, 5 * MIN)).toBe('5분째');
    expect(waitedText(0, 2 * HOUR + 5 * MIN)).toBe('2시간째');
    expect(waitedText(0, 26 * HOUR)).toBe('26시간째');
  });
  it('agoText: 방금 / N분 전 / N시간 전 / N일 전', () => {
    expect(agoText(0, 30_000)).toBe('방금');
    expect(agoText(0, 42 * MIN + 10_000)).toBe('42분 전');
    expect(agoText(0, 3 * HOUR)).toBe('3시간 전');
    expect(agoText(0, 2 * DAY + HOUR)).toBe('2일 전');
  });
  it('remainingText: 1분 안 / N분 후 / N시간 M분 후 / N시간 후 / N일 M시간 후', () => {
    expect(remainingText(30_000, 0)).toBe('1분 안');
    expect(remainingText(5 * MIN, 0)).toBe('5분 후');
    expect(remainingText(2 * HOUR + 13 * MIN + 59_000, 0)).toBe('2시간 13분 후');
    expect(remainingText(3 * HOUR, 0)).toBe('3시간 후');
    expect(remainingText(2 * DAY + 21 * HOUR + 30 * MIN, 0)).toBe('2일 21시간 후');
    expect(remainingText(0, 10)).toBe('1분 안');
  });
  it('resetAtText: 오늘 / 내일 / 주간 날짜(요일)', () => {
    const now = new Date(2026, 10, 12, 15, 0).getTime();
    expect(resetAtText('five_hour', new Date(2026, 10, 12, 18, 0).getTime(), now)).toBe('18:00');
    expect(resetAtText('five_hour', new Date(2026, 10, 13, 1, 30).getTime(), now)).toBe('내일 01:30');
    expect(resetAtText('seven_day', new Date(2026, 10, 15, 9, 0).getTime(), now)).toBe('11월 15일(일) 09:00');
  });
  it('statusStyle: 응답 없음은 문구·아이콘·색이 모두 다르다', () => {
    expect(statusStyle('waiting')).toEqual({ label: '승인 대기', icon: 'circleBang', tone: 'waiting' });
    expect(statusStyle('waiting', true)).toEqual({ label: '승인 대기 (응답 없음)', icon: 'triangleBang', tone: 'stale' });
    expect(statusStyle('working').label).toBe('작업 중');
    expect(statusStyle('ended').icon).toBe('ring');
  });
});
