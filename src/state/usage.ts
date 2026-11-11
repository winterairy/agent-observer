/**
 * usage 병합(설계 2절, T1-3). usage는 누적값이라 더하지 않는다.
 * 네 항목과 messages는 각각 max, model은 새 값이 null이 아니면 새 값(D-12: 마지막 모델).
 */
import type { Usage } from '@/domain/types';

export function mergeUsage(old: Usage, next: Usage): Usage {
  return {
    input: Math.max(old.input, next.input),
    output: Math.max(old.output, next.output),
    cache_creation: Math.max(old.cache_creation, next.cache_creation),
    cache_read: Math.max(old.cache_read, next.cache_read),
    messages: Math.max(old.messages, next.messages),
    model: next.model ?? old.model,
  };
}
