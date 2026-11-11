# 개발 노트 (developer)

## 1단계 개발 1차 (2026-11-11)

범위: 프로젝트 기반, T1-1 수집 API·저장소, T1-2 상태 계산, T1-3 토큰 누적·API 환산 비용·스킬 기록, 해당 단위·API 테스트.
이번 차수에서 하지 않은 것: 로그인(T1-4), 조회 API·화면(T1-5), 캐릭터(T1-6), Playwright E2E·observe.mjs 통합 테스트(T1-7 일부).

### 구현 내용

| 파일 | 내용 |
|---|---|
| `package.json`, `pnpm-lock.yaml`, `.npmrc` | 설계 12절 의존성만 정확한 버전 고정(`save-exact=true`). engines `node >=22`, `packageManager pnpm@10.28.0`. 스크립트 dev/build/start/typecheck/test/test:e2e(설계 13절) |
| `tsconfig.json`, `next.config.ts`, `vitest.config.ts` | `@/*` → `src/*`. Vitest는 `tests/unit`, `tests/api`만 |
| `.gitignore`, `.env.example` | `.data/`, `next-env.d.ts`, `*.tsbuildinfo` 추가. 예시 파일은 이름만 |
| `src/config.ts` | 설계 11절 상수 한곳 |
| `src/domain/types.ts` | 설계 2절 타입, `sessionKey()`(base64url, 외부 의존 없음), `LEAD_KEY='__lead__'` |
| `src/collect/schema.ts` | zod(기본 strip) 검증 → `IncomingEvent`. 미래 ts 보정, 빈 project → `(unknown)`, 실패 시 필드 경로만 |
| `src/collect/ingest.ts` | 검증 → `store.applyEvent(ev, applyEvent)` |
| `src/store/Store.ts` | 저장소 인터페이스(설계 3절 그대로, dismiss/restore 포함) |
| `src/store/core.ts` | memory·file 공통 메모리 상태, Promise 체인 뮤텍스, 세션별 보관 한도(D-4) |
| `src/store/memoryStore.ts`, `fileStore.ts`, `index.ts` | 메모리 구현, JSON 파일 구현, `getStore()`(globalThis 1개) |
| `src/auth/token.ts` | Bearer 확인(`timingSafeEqual`), 서버 토큰 16자 검사, 시작 경고 |
| `instrumentation.ts` | 서버 시작 시 `OBSERVER_TOKEN` 무효 경고(값 출력 안 함) |
| `app/api/events/route.ts` | POST 수집. 405/401/413/400/202/500 |
| `src/state/reducer.ts`, `status.ts`, `usage.ts` | 상태 전이, 조회 시점 상태(시간 초과·응답 없음), usage 병합 |
| `src/cost/pricing.ts` | 단가표(기준일·출처), `calcCost()` |
| `src/aggregate/totals.ts` | 에이전트·세션·역할·프로젝트·전체 합계, 스킬 집계, 부른 BOT 목록 |

검증
- `pnpm typecheck` 통과, `pnpm test` 181개 통과(5개 파일).
- `pnpm build` 통과(Next 16.4.6 Turbopack, TypeScript 7.0.2).
- 수동 확인: `next start`(임시 포트·임시 데이터 폴더)에 curl로 202/401/405/413 확인, `.claude/team/observe/observe.mjs`로 SessionStart → PreToolUse → PostToolUse → Stop 전송 후 `state.json`에 lead `done`, usage 6/398/12285/100229가 저장되고 `prompt` 필드가 없음을 확인. 자동 테스트(E2E)는 다음 차수.

### 단가 확인 결과(설계 6절)

- 출처: https://platform.claude.com/docs/en/about-claude/pricing (`docs.claude.com/...` 주소가 이 주소로 넘어감). 2026-11-11에 curl로 받은 페이지의 "Model pricing" 표.
- 넣은 모델(USD/MTok, 입력/출력): Opus 5.5 4/20, Opus 5·4.8·4.7·4.6·4.5 5/25, Sonnet 5.5 2/10, Sonnet 5 2/10, Sonnet 4.6·4.5 3/15, Haiku 5.5 0.1/0.5(100,000토큰 이하), Haiku 4.5 1/5.
- 미확인 모델: 없음. D-10 대상(Opus·Sonnet·Haiku 최신 5.x, `claude-haiku-5-5`, 4.5, 4.6)은 모두 페이지에서 확인했다.
- vendor 값은 옮기지 않았다(vendor의 Opus 4.5/4.6 $15/$75, Haiku $0.8/$4는 현재 값과 다름).

### 설계와 달라진 점과 이유

1. **단가표에 모델별 캐시 읽기 배수(`cacheReadMultiplier`)와 `defaultModel` 필드를 추가했다.** 설계 6절은 `models: {input, output}`과 고정 0.1배 식이지만, 공개 가격 페이지 각주에 "Opus 5.5·Sonnet 5.5의 캐시 읽기는 입력 × 0.05"라고 되어 있다. 0.1배로 고정하면 두 모델의 캐시 읽기 비용이 2배로 나와 "현재 공개 단가로 갱신" 요구와 어긋난다. 식의 모양은 그대로 두고 배수만 모델별로 덮어쓸 수 있게 했다(없으면 0.1). 5분 캐시 쓰기 1.25배는 페이지에서도 모든 대상 모델에 맞다. 설계 문서 6절 갱신이 필요하면 architect가 반영해 주세요.
2. **D-10 대상보다 모델을 더 넣었다.** Opus 5·4.8·4.7, Sonnet 5도 같은 페이지에서 확인되는 현행 Opus·Sonnet 모델이라 "추정"으로 보이지 않게 함께 넣었다. Fable·Mythos 계열(같은 페이지에 있음)은 D-10 대상(Opus·Sonnet·Haiku)이 아니라 넣지 않았다 → 이 모델을 쓰면 Sonnet 5.5 단가로 "추정" 표시된다(실제보다 낮게 나옴). 넣을지 결정이 필요하다.
3. **역할 매핑은 함수 인자(`roleOf`)로 받는다.** 설계는 합계의 역할 키를 `characters/roles.ts`로 계산하지만 roles.ts는 T1-6(다음 차수)이다. `aggregate/totals.ts`는 `roleOf`를 받고 기본값은 `null → lead, 나머지 원문`이다. 다음 차수에 `query/views.ts`에서 roles.ts의 `roleKeyFor`를 넘기면 된다.
4. **`subagent` 필드로 처음 만들어지는 서브에이전트의 상태는 `done`으로 둔다.** 설계는 "상태는 바꾸지 않음"이라 처음 생성될 때의 상태가 정해져 있지 않다. 부모 Agent 도구가 끝났을 때 붙는 필드이므로 완료로 만들었다.
5. **SubagentStart(R8)는 새로 만들었거나 완료·종료 상태인 에이전트에만 생각 중을 적용한다.** S-06처럼 PreToolUse가 먼저 와서 작업 중인 에이전트에 SubagentStart가 늦게 오면 작업 중을 유지한다. 같은 agent_id가 다시 시작되면(완료 후) 생각 중이 된다.
6. **토큰이 0인 에이전트는 합계의 `estimated`에 영향을 주지 않는다.** SessionStart만 받은 lead는 model이 없어 매번 "추정"이 되므로, 토큰을 쓴 에이전트만 비용·추정 판정에 넣는다(토큰 0이면 비용도 0).
7. **`recentEvents`·`dismiss`·`restore`는 설계 시그니처 그대로(`Promise<void>`)다.** 없는 키에 대한 dismiss·restore는 무시한다. 다음 차수의 dismiss/restore route는 `getSession`으로 404를 먼저 판단해야 한다.
8. **`.npmrc`(`save-exact=true`)를 추가했다.** 이후 의존성 추가도 정확한 버전으로 고정되게 하려는 것이다.

### 알려진 제한

- **Haiku 5.5 단가는 100,000토큰 이하 구간 값을 쓴다.** 페이지에는 프롬프트가 100,000토큰을 넘으면 입력 0.5/출력 2.5인 구간이 있다. payload의 usage는 에이전트 누적 합계라 요청별 프롬프트 길이를 알 수 없다. 긴 컨텍스트를 쓰면 실제보다 낮게 나온다. 화면의 "추정치" 안내 문구로 다루는 것을 제안한다.
- 1시간 캐시 쓰기(입력 × 2) 미반영(설계 리스크 절과 같음).
- 스킬 횟수는 같은 이벤트 중복 전송 시 두 번 센다(이벤트 ID 없음, 설계 리스크 절).
- 늦게 온 이벤트(ts가 에이전트 마지막 전이보다 이름)는 상태 전이를 하지 않는다(ADR A2). SessionEnd보다 이른 ts의 이벤트가 늦게 와도 세션은 종료로 남는다.
- 서브에이전트 Stop·SessionStart·UserPromptSubmit(조건 "메인")은 서브에이전트 상태를 바꾸지 않는다.
- fileStore lock은 경고만 하고 막지 않는다(설계 15절). 디바운스 중 종료 시 최대 250ms 분량 손실 허용.
- `@types/node`는 최신(26.x)을 썼다(설계 12절 "최신"). 실행 기준 Node는 22 이상이다.
- TypeScript는 최신 안정판 7.0.2(네이티브 컴파일러)를 썼다. `tsc --noEmit`과 `next build`의 타입 검사 모두 동작함을 확인했다.
- 린트(eslint)는 설계 12절에서 선택이라 이번에 넣지 않았다.

### 다음 차수에 넘길 것

- T1-4 로그인(`auth/cookie.ts`, `rateLimit.ts`, `proxy.ts`, login/logout route), T1-5 조회 API(`query/views.ts`에서 `sessionStatus`·`totals`·`calcCost`·roles 매핑 조합, `PRICING.asOf/source`를 응답에 포함), dismiss/restore route(404 판단), T1-6 캐릭터, T1-7 Playwright 화면 흐름·observe.mjs 통합 테스트.
- profile.md "명령" 절 갱신(이번에 반영함).
