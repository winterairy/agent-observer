/**
 * 메모리 저장소(테스트용, D-3). 재시작하면 사라진다.
 */
import { CoreStore, type CoreStoreOptions } from '@/store/core';

export class MemoryStore extends CoreStore {
  protected ready(): Promise<void> {
    return Promise.resolve();
  }
  protected changed(): void {}
}

export function createMemoryStore(opts?: CoreStoreOptions): MemoryStore {
  return new MemoryStore(opts);
}
