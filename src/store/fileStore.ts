/**
 * 로컬 JSON 파일 저장소(1단계 기본, 설계 3절·ADR A4).
 * - `<dataDir>/state.json` 하나. 메모리에 전체 상태를 들고 쓰기는 250ms 디바운스로 모은다.
 * - `state.json.tmp`에 쓰고 rename(같은 폴더라 원자적). 파일 권한 0600.
 * - 읽을 때 schemaVersion이 다르거나 JSON이 깨졌으면 `state.json.bak-<시각>`으로 옮기고 빈 상태로 시작한다.
 * - 프로세스 하나가 쓴다고 가정한다. `<dataDir>/lock`에 pid를 적고 다른 살아 있는 프로세스가 있으면 경고 로그.
 */
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { config } from '@/config';
import { CoreStore, SCHEMA_VERSION, emptyData, type CoreStoreOptions, type StoreData } from '@/store/core';

export interface FileStoreOptions extends CoreStoreOptions {
  dataDir: string;
  debounceMs?: number;
  /** 전체 prune 주기. 0이면 타이머를 두지 않는다 */
  pruneIntervalMs?: number;
  log?: Pick<Console, 'warn' | 'error'>;
}

const STATE_FILE = 'state.json';

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM';
  }
}

export class FileStore extends CoreStore {
  readonly dataDir: string;
  private readonly file: string;
  private readonly debounceMs: number;
  private readonly pruneIntervalMs: number;
  private readonly log: Pick<Console, 'warn' | 'error'>;
  private loading: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pruneTimer: ReturnType<typeof setInterval> | null = null;
  private writing: Promise<void> = Promise.resolve();
  private dirty = false;

  constructor(opts: FileStoreOptions) {
    super(opts);
    this.dataDir = path.resolve(opts.dataDir);
    this.file = path.join(this.dataDir, STATE_FILE);
    this.debounceMs = opts.debounceMs ?? config.fileWriteDebounceMs;
    this.pruneIntervalMs = opts.pruneIntervalMs ?? config.pruneIntervalMs;
    this.log = opts.log ?? console;
  }

  protected ready(): Promise<void> {
    this.loading ??= this.load();
    return this.loading;
  }

  private async load(): Promise<void> {
    await fsp.mkdir(this.dataDir, { recursive: true, mode: 0o700 });
    await this.checkLock();
    let text: string | null = null;
    try {
      text = await fsp.readFile(this.file, 'utf8');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    }
    if (text !== null) {
      let parsed: StoreData | null = null;
      try {
        parsed = JSON.parse(text) as StoreData;
      } catch {
        parsed = null;
      }
      if (parsed && parsed.schemaVersion === SCHEMA_VERSION && parsed.sessions && parsed.events) {
        this.data = { schemaVersion: SCHEMA_VERSION, seq: parsed.seq ?? 0, sessions: parsed.sessions, events: parsed.events };
      } else {
        const bak = `${this.file}.bak-${Date.now()}`;
        this.log.warn(
          `[fileStore] ${STATE_FILE}의 형식이나 schemaVersion이 맞지 않아 ${path.basename(bak)}로 옮기고 빈 상태로 시작합니다`,
        );
        await fsp.rename(this.file, bak);
        this.data = emptyData();
      }
    }
    this.pruneAll(this.clock());
    if (this.pruneIntervalMs > 0) {
      this.pruneTimer = setInterval(() => {
        void this.prune(this.clock()).catch((e) => this.log.error('[fileStore] prune 실패', (e as Error).message));
      }, this.pruneIntervalMs);
      this.pruneTimer.unref?.();
    }
  }

  private async checkLock(): Promise<void> {
    const lock = path.join(this.dataDir, 'lock');
    try {
      const pid = Number.parseInt(await fsp.readFile(lock, 'utf8'), 10);
      if (Number.isInteger(pid) && pid !== process.pid && isAlive(pid)) {
        this.log.warn(`[fileStore] 다른 프로세스(pid ${pid})가 같은 데이터 폴더를 쓰고 있을 수 있습니다. 서로 덮어쓸 수 있습니다`);
      }
    } catch {
      // lock 없음
    }
    try {
      await fsp.writeFile(lock, String(process.pid), { mode: 0o600 });
    } catch (e) {
      this.log.warn('[fileStore] lock 파일을 쓸 수 없습니다', (e as Error).message);
    }
  }

  protected changed(): void {
    this.dirty = true;
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.persist();
    }, this.debounceMs);
    this.timer.unref?.();
  }

  private persist(): Promise<void> {
    this.writing = this.writing.then(async () => {
      if (!this.dirty) return;
      this.dirty = false;
      const text = JSON.stringify(this.data);
      try {
        await this.writeAtomic(text);
      } catch (e) {
        // 메모리 상태는 유지하고 다음 쓰기에서 다시 시도한다
        this.dirty = true;
        this.log.error('[fileStore] 상태 파일 쓰기 실패', (e as Error).message);
      }
    });
    return this.writing;
  }

  private async writeAtomic(text: string): Promise<void> {
    const tmp = `${this.file}.tmp`;
    await fsp.writeFile(tmp, text, { mode: 0o600 });
    try {
      await fsp.rename(tmp, this.file);
    } catch {
      // Windows에서 대상 파일이 열려 있으면 실패할 수 있어 한 번 더 시도한다(설계 15절)
      await fsp.rename(tmp, this.file);
    }
  }

  /** 디바운스 중인 쓰기를 바로 디스크에 쓴다(테스트·종료용) */
  async flush(): Promise<void> {
    await this.ready();
    await this.mutex.run(() => undefined);
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.persist();
  }

  /** 타이머를 멈추고 남은 쓰기를 마친다 */
  async close(): Promise<void> {
    await this.flush();
    if (this.pruneTimer) clearInterval(this.pruneTimer);
    this.pruneTimer = null;
  }
}

export function createFileStore(opts: FileStoreOptions): FileStore {
  return new FileStore(opts);
}
