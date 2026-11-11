/**
 * API 환산 비용 단가표와 계산(T1-3, 설계 6절). 순수 함수.
 *
 * 계산 방식(캐시 읽기 = 입력 단가 × 배수, 캐시 쓰기 = 입력 단가 × 1.25, 소수 5자리 반올림)은
 * Pixel Agent Desk `src/pricing.js`(MIT, https://github.com/Mgpixelart/pixel-agent-desk)를
 * 옮겨 고친 것이다. 단가 값은 옮기지 않고 아래 출처에서 다시 확인했다. THIRD_PARTY_NOTICES.md 참고.
 *
 * 출처: https://platform.claude.com/docs/en/about-claude/pricing (Model pricing 표)
 * 기준일: 2026-11-11 (curl로 받은 페이지에서 확인)
 * - 단위: USD / 100만 토큰(MTok).
 * - 캐시 쓰기는 5분 캐시 단가(입력 × 1.25)다. 1시간 캐시(입력 × 2)는 payload에서 구분할 수 없어 반영하지 않는다.
 * - 캐시 읽기는 기본 입력 × 0.1이고, Opus 5.5·Sonnet 5.5는 페이지 각주대로 입력 × 0.05다.
 * - Haiku 5.5는 프롬프트 길이(100,000토큰 이하/초과)에 따라 단가가 다르다. payload는 누적 합계만 있어
 *   요청별 길이를 알 수 없으므로 100,000토큰 이하 단가를 쓴다(과소 추정 가능).
 */
import type { Usage } from '@/domain/types';

export interface ModelPrice {
  /** USD / 1M 입력 토큰 */
  input: number;
  /** USD / 1M 출력 토큰 */
  output: number;
  /** 캐시 읽기 배수(입력 단가 기준). 없으면 0.1 */
  cacheReadMultiplier?: number;
}

export interface PricingTable {
  asOf: string;
  source: string;
  /** 단가표에 없는 모델에 쓸 키(D-11: Sonnet 최신) */
  defaultModel: string;
  models: Record<string, ModelPrice>;
}

export const CACHE_READ_MULTIPLIER = 0.1;
export const CACHE_WRITE_MULTIPLIER = 1.25;

export const PRICING: PricingTable = {
  asOf: '2026-11-11',
  source: 'https://platform.claude.com/docs/en/about-claude/pricing',
  defaultModel: 'claude-sonnet-5-5',
  models: {
    // Opus
    'claude-opus-5-5': { input: 4, output: 20, cacheReadMultiplier: 0.05 },
    'claude-opus-5': { input: 5, output: 25 },
    'claude-opus-4-8': { input: 5, output: 25 },
    'claude-opus-4-7': { input: 5, output: 25 },
    'claude-opus-4-6': { input: 5, output: 25 },
    'claude-opus-4-5': { input: 5, output: 25 },
    // Sonnet
    'claude-sonnet-5-5': { input: 2, output: 10, cacheReadMultiplier: 0.05 },
    'claude-sonnet-5': { input: 2, output: 10 },
    'claude-sonnet-4-6': { input: 3, output: 15 },
    'claude-sonnet-4-5': { input: 3, output: 15 },
    // Haiku (5.5는 100,000토큰 이하 단가)
    'claude-haiku-5-5': { input: 0.1, output: 0.5 },
    'claude-haiku-4-5': { input: 1, output: 5 },
  },
};

export interface CostResult {
  usd: number;
  /** 단가표에 없는 모델이라 기본 단가로 계산함 */
  estimated: boolean;
  /** 실제로 쓴 단가표 키 */
  pricingModel: string;
}

export function roundCost(x: number): number {
  return Math.round(x * 1e5) / 1e5;
}

/** 정확히 같은 키 → 날짜 접미사(-20251001 등)를 뗀 키 → 없으면 null */
export function resolvePricingModel(model: string | null | undefined, table: PricingTable = PRICING): string | null {
  if (!model) return null;
  if (table.models[model]) return model;
  const stripped = model.replace(/-\d{8}$/, '');
  if (table.models[stripped]) return stripped;
  return null;
}

type TokenCounts = Pick<Usage, 'input' | 'output' | 'cache_creation' | 'cache_read'>;

/** 반올림하지 않은 비용(합계 계산용) */
export function rawCost(tokens: TokenCounts, price: ModelPrice): number {
  const perIn = price.input / 1_000_000;
  const perOut = price.output / 1_000_000;
  return (
    tokens.input * perIn +
    tokens.cache_read * perIn * (price.cacheReadMultiplier ?? CACHE_READ_MULTIPLIER) +
    tokens.cache_creation * perIn * CACHE_WRITE_MULTIPLIER +
    tokens.output * perOut
  );
}

export function calcCost(usage: TokenCounts & { model: string | null }, table: PricingTable = PRICING): CostResult {
  const matched = resolvePricingModel(usage.model, table);
  const pricingModel = matched ?? table.defaultModel;
  return {
    usd: roundCost(rawCost(usage, table.models[pricingModel])),
    estimated: matched === null,
    pricingModel,
  };
}
