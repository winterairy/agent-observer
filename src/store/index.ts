/**
 * getStore(): 환경 변수로 구현을 고르고 프로세스당 1개만 만든다(설계 3절).
 * `next dev` 핫 리로드로 모듈이 다시 로드돼도 하나가 되도록 globalThis에 둔다.
 */
import path from 'node:path';
import { createFileStore } from '@/store/fileStore';
import { createMemoryStore } from '@/store/memoryStore';
import type { Store } from '@/store/Store';

export type { Store } from '@/store/Store';

const KEY = Symbol.for('agent-observer.store');

type Holder = { [KEY]?: Store };

function createFromEnv(env: NodeJS.ProcessEnv = process.env): Store {
  const kind = (env.OBSERVER_STORE || 'file').trim();
  if (kind === 'memory') return createMemoryStore();
  if (kind !== 'file') {
    console.warn(`[store] 알 수 없는 OBSERVER_STORE 값이라 file 저장소를 씁니다`);
  }
  const dataDir = env.OBSERVER_DATA_DIR || path.join(process.cwd(), '.data');
  return createFileStore({ dataDir });
}

export function getStore(): Store {
  const g = globalThis as Holder;
  g[KEY] ??= createFromEnv();
  return g[KEY];
}

/** 테스트용: 다음 getStore()가 환경 변수를 다시 읽어 새로 만들게 한다 */
export function resetStoreForTests(store?: Store): void {
  const g = globalThis as Holder;
  if (store) g[KEY] = store;
  else delete g[KEY];
}
