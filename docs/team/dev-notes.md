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

## 1단계 개발 2차 (2026-11-11)

범위: T1-4 로그인(서명 쿠키, 실패 제한, proxy 보호, login/logout), T1-5 조회 API(웹 화면 제외), T1-2 정리·다시 표시 route, 해당 단위·API 테스트.
이번 차수에서 하지 않은 것: 웹 화면(`app/page.tsx`, `/login` 화면), T1-6 캐릭터(`/api/characters*`, `roles.ts`), Playwright E2E.

**범위 변경 반영(사용자 결정 2026-11-11, 책임자 전달)**: 토큰 사용량·API 환산 비용 기능을 1단계에서 뺀다. 그래서 조회 응답에 `usage`·`cost`·`totals`·`pricing`을 넣지 않았고 `GET /api/summary`는 만들지 않았다(보류). 1차의 `cost/pricing.ts`, `aggregate/totals.ts`의 토큰·비용 함수는 지시대로 지우지 않았다(조회 경로에서는 `calledAgents`·`skillSummary`만 쓴다). 저장소·reducer의 usage 병합도 그대로다.

### 구현 내용

| 파일 | 내용 |
|---|---|
| `src/auth/cookie.ts` | Web Crypto HMAC-SHA256 서명 쿠키 `v1.<만료초>.<서명>`. 키는 `OBSERVER_SESSION_SECRET`, 없으면 `HMAC(OBSERVER_PASSWORD, "agent-observer-cookie")`. 검증은 `crypto.subtle.verify`(상수 시간). Set-Cookie: HttpOnly, SameSite=Lax, Path=/, Max-Age 30일, Secure는 https(`x-forwarded-proto` 또는 URL)일 때만 |
| `src/auth/rateLimit.ts` | 메모리 슬라이딩 윈도. IP(`x-forwarded-for` 첫 값, 없으면 `local`)별 1분 5회, 전역 1분 20회. 쌓이면 다음 시도부터 429 + `Retry-After`. 성공 시 그 IP만 초기화. 429로 거부된 시도는 세지 않음. globalThis에 1개 |
| `src/auth/session.ts` | `requireSession`(쿠키만 확인, Bearer 무시), `checkSameOrigin`(Origin 다른 호스트 → 403), `verifyPassword`(양쪽 SHA-256 후 `timingSafeEqual`) |
| `proxy.ts` | 설계 4절 보호 범위 표. `/api/*` 401 JSON, 화면 경로는 `/login?next=<내부 경로>` 302. matcher는 `_next/static`, `_next/image`, `favicon.ico`만 제외 → `public/` 정적 파일도 쿠키 필요 |
| `app/api/auth/login`, `logout` | 순서: Origin 403 → 실패 제한 429 → 본문 4KB 413 → 비밀번호 401 → 204 + Set-Cookie. JSON·form-urlencoded. 로그아웃은 Max-Age=0, 쿠키 없어도 204 |
| `src/http/response.ts` | `json`, `noContent`, `methodNotAllowed`, `readLimited`. 1차 `app/api/events/route.ts`에 있던 것을 옮겨 같이 쓴다(동작 같음) |
| `src/query/views.ts` | 순수 DTO 변환(`now` 주입). `sessionsView`(ended 필터, hidden=only, hiddenCount, 정렬), `sessionDetailView`, `projectsView`, `skillsView`. 역할 매핑은 `RoleResolver` 인자(기본 null → lead "책임자", 그 외 원문, characterId null) |
| `src/query/hide.ts` | dismiss/restore 공통: 401 → 403 → 404 → 204 |
| `app/api/projects`, `sessions`, `sessions/[key]`, `sessions/[key]/dismiss`, `restore`, `skills` | 모든 route에서 `requireSession` 이중 확인. 처리 안 된 예외는 500 `{"error":"internal"}` + 오류 이름만 로그 |
| `src/config.ts` | `cookieName`, `loginMaxBodyBytes`(4KB), `loginWindowMs`(1분) 추가 |

검증
- `pnpm typecheck` 통과, `pnpm test` 256개 통과 + todo 2개(8개 파일. 2차 추가 75개: `tests/unit/auth.test.ts` 14, `tests/api/auth.test.ts` 26, `tests/api/query.test.ts` 35(memory·file 두 구현) — 수는 vitest 출력 기준).
- `pnpm build` 통과(`ƒ Proxy (Middleware)` 인식 확인).
- 수동 확인: `next start`(임시 포트·임시 데이터 폴더)에서 쿠키 없이 `/` → 302 `/login`, `/api/sessions` → 401, Bearer만 → 401, 다른 Origin 로그인 → 403, 로그인 후 `/api/sessions` 200. 서버 로그에 비밀번호·토큰 없음.

### 설계와 달라진 점과 이유

1. **응답에서 토큰·비용 필드를 뺐고 `/api/summary`를 만들지 않았다.** 위 범위 변경 때문이다. 설계 5절 예시의 `totals`, 에이전트 `usage`·`cost`, 최상위 `pricing`이 없다. 기획·설계 개정 후 플랜 사용량 API를 따로 만든다.
2. **`/api/auth/logout`을 proxy 공개 경로에 넣었다.** 설계 4절 표는 `/api/*` 나머지를 401로 막지만 5절은 "쿠키가 없어도 204"라 proxy를 거치면 그 규칙에 닿지 않는다. 쿠키를 지우는 것뿐이라 공개해도 위험이 없어 5절을 따랐다. 로그아웃도 Origin 검사를 한다.
3. **Origin 헤더가 없는 POST는 통과시킨다.** 브라우저는 POST에 Origin을 붙이므로 CSRF는 막히고, curl·테스트 같은 비브라우저 클라이언트는 쓸 수 있다. `Origin: null`과 해석할 수 없는 값은 403. 비교 대상은 `Host` 헤더(포트 포함).
4. **`OBSERVER_PASSWORD`가 비어 있으면 쿠키 검증도 항상 실패한다.** `OBSERVER_SESSION_SECRET`만 있고 비밀번호를 지운 경우에 예전 쿠키로 열리지 않게 하려는 것이다("열린 상태로 시작하지 않는다").
5. **세션 목록 항목에 `dismissedAt`(ISO|null)을 더했다.** `ended=all`에는 숨긴 세션도 섞이므로 화면이 구분할 수 있어야 한다.
6. **목록 정렬은 승인 대기 → 다른 활성 → 종료 순**이다. 설계는 앞의 둘만 정해 종료 세션의 자리를 적지 않아서 맨 뒤(그 안에서 마지막 이벤트 내림차순)로 두었다.
7. **`ended`·`hidden` 값이 정의 밖이면 400 `invalid_query`**로 답한다(설계에 없음).
8. **역할 매핑 기본값은 `null → lead`, 그 외 원문**이다. 설계 5절의 `plugin:qa → qa`는 roles.ts(T1-6)가 있어야 하므로 3차에 `RoleResolver`로 넘긴다. 지금 `displayName`은 lead만 "책임자", 나머지는 원문이고 `characterId`는 모두 null.
9. **에이전트 `skills` 정렬은 횟수 내림차순, 같으면 이름순**(설계에 없음).

### 알려진 제한

- 로그인 실패 제한은 메모리라 재시작하면 초기화된다(설계 리스크 절).
- `x-forwarded-for`는 그대로 믿는다. 위조로 IP별 제한을 피해도 전역 20회 제한은 남는다(설계 리스크 절).
- 로그인 성공 응답은 204라 HTML form을 JS 없이 제출하면 화면이 바뀌지 않는다. 3차 로그인 화면은 `fetch`로 부르고 `next`로 이동해야 한다.
- 캐릭터 route가 아직 없어 `/api/characters*` 401은 proxy 테스트로만 확인했다. route handler 테스트는 `it.todo` 2개로 남겼다.

### 다음 차수에 넘길 것

- 웹 화면(`/`, `/login`): 로그인은 `POST /api/auth/login` 후 `next`(`safeNextPath`로 다시 확인) 이동, 401이면 `/login`. 숨긴 세션은 `hiddenCount`와 `?hidden=only`.
- T1-6: `characters/roles.ts`의 `roleKeyFor`로 `RoleResolver`를 만들어 조회 route의 `ctx.roles`에 넘긴다. `/api/characters`, `/api/characters/[id]/image`에 `requireSession`을 넣고 `tests/api/query.test.ts`의 todo 2개를 실제 테스트로 바꾼다.
- 플랜 사용량 기능은 기획·설계 확정 후. 토큰·비용 코드(`cost/`, `aggregate/totals.ts`의 합계 함수, 1차 테스트) 제거는 따로 지시받는다.
- Playwright E2E, observe.mjs 통합 테스트(T1-7).

## 개발 3차-가 (2026-11-12): 토큰·비용 제거, 플랜 사용량 서버

범위: 설계 16절 R-1~R-15, T1-8 (나) 서버 저장·조회 API, 설계 6.6 서버 단위·API 테스트. 화면·캐릭터·E2E·statusline.mjs·tests/script는 3차-나 이후.

R-16: 1차 '단가 확인 결과'·'설계와 달라진 점 1, 2, 6'과 Haiku 단가 제한은 범위 변경으로 폐기한다. 2차 "다음 차수에 넘길 것"의 토큰·비용 코드 제거 항목은 이번에 끝났다.

구현
| 파일 | 내용 |
|---|---|
| `src/cost/`, `src/state/usage.ts`, `tests/unit/cost.test.ts` | 삭제. 스킬·BOT 호출 기록 테스트 3개는 `tests/unit/skills.test.ts`로 옮김 |
| `src/aggregate/totals.ts` | 합계 함수 삭제. `RoleOf`, `defaultRoleOf`, `skillUses`, `skillSummary`, `calledAgents`만 남김 |
| `src/domain/types.ts` | `Usage`, `SubagentInfo`, `Totals` 계열, `emptyUsage` 삭제. `PLAN_WINDOW_NAMES`, `PlanWindowState`, `PlanUsageState`, `PlanWindowReport`, `PlanReport`, `emptyPlanUsage` 추가 |
| `src/collect/schema.ts`, `src/state/reducer.ts` | `usage`·`subagent` 스키마와 처리 블록 삭제(D-21: 어떤 형식이어도 400 없이 버림, subagent로 에이전트를 만들지 않음) |
| `src/store/*` | `SCHEMA_VERSION = 2`, `StoreData.planUsage`, `getPlanUsage`·`applyPlanUsage`(뮤텍스 안 읽기-병합-쓰기, 병합 함수가 실패하면 저장값 불변). 버전이 다르거나 깨진 JSON이면 변환 없이 `.bak-<시각>`으로 옮기고 빈 상태. 로그는 "schemaVersion <n> 파일을 백업하고 새로 시작" |
| `src/plan/schema.ts` | 6.3 검증. 두 창 모두 없으면 `issues: ["rate_limits"]` |
| `src/plan/merge.ts` | D-27 `mergePlanWindow`·`mergePlanUsage`(60초 이하 같은 창, 경계 포함) |
| `src/plan/view.ts` | `planUsageView(state, now, opts)` → `{now, windows}`. status ok/expired/none, level normal/near/reached, expired면 level null |
| `src/http/collect.ts` | Bearer → 16KB → JSON 앞단을 묶어 `/api/events`와 `/api/plan-usage/report`가 같이 씀(6.3 "같은 helper"). `/api/events` 동작 그대로 |
| `app/api/plan-usage/report/route.ts`, `app/api/plan-usage/route.ts` | 6.3·6.4. 405는 `Allow` 헤더 포함 |
| `proxy.ts` | `PUBLIC_EXACT`에 `/api/plan-usage/report`, 머리 주석 표 갱신 |
| `src/config.ts` | `planWarnPercent` 80, `planReachedPercent` 100, `planSameWindowSec` 60 |
| `THIRD_PARTY_NOTICES.md` | pricing.ts 행 삭제. 표가 비어 "(none at the moment)" 한 줄을 둠 |

검증
- `pnpm typecheck` 통과, `pnpm test` 347개 통과 + todo 2개(10개 파일). 이번 추가: `tests/unit/planUsage.test.ts` 34, `tests/api/planUsage.test.ts` 61(memory·file + proxy), `tests/unit/store.test.ts` 플랜 사용량 6(3×2 구현), `tests/api/events.test.ts` usage·subagent 202 테스트.
- `pnpm build` 통과(`/api/plan-usage`, `/api/plan-usage/report` 인식).
- `grep -rn "usage|Usage|cost|pricing|PRICING|Totals" src app`: `KeyUsage`(cookie.ts), 주석의 "usage는 버린다" 설명 2곳, 플랜 사용량 이름(`planUsage`, `PlanUsageState` 등)만 남음.

### 설계와 달라진 점과 이유
1. `PlanWindowReport` 타입과 `PLAN_WINDOW_NAMES`, `emptyPlanUsage()`를 더했다. 설계 2절 `PlanReport.windows`의 값 타입을 병합 함수 인자로 다시 쓰고, 창 목록을 한곳에 두기 위해서다(동작 변화 없음).
2. 같은 창 판정 60초, 경고 80%·도달 100%를 `src/config.ts` 상수로 두었다(설계 11절 "상수 한곳"). `SAME_WINDOW_SEC`는 merge.ts에서 그 값을 내보낸다.
3. `GET /api/plan-usage`에 GET 외 메서드 405 핸들러를 넣었다(설계 6.4 "405(GET 외)"). 기존 조회 route들은 Next 기본 405에 맡기고 있어 손대지 않았다.

### 알려진 제한
- 플랜 사용량 병합은 계정을 구분하지 않는다(D-28). 다른 계정 값은 D-27 규칙으로 섞일 수 있다.
- schemaVersion 1 백업 파일(`.data/state.json.bak-*`)에는 옛 토큰 값이 남는다. 자동으로 지우지 않는다(설계 3절). README 안내 문구는 이번에 넣지 않았다(3차-나 README 갱신 때).

### 3차-나에 넘길 것
- 화면: 3초 폴링에 `GET /api/plan-usage`를 더하고 응답 `now` 기준으로 남은 시간·"마지막 측정 N분 전" 계산(6.5). 상단 영역과 임시 사무실 계기판이 같은 응답을 쓴다.
- README: "`.data/state.json.bak-*`는 지워도 된다" 안내, 현재 구현 범위에 플랜 사용량 API 추가.
- `tests/script/statusline.test.ts`(설치 사본이 들어온 뒤), Playwright `e2e/plan-usage-screen.spec.ts`(실제 서버에 report를 보내 만든다).

## 개발 3차-나 (2026-11-12): 화면, Pretendard, T1-6 캐릭터, 테스트·E2E, README

범위: `/login`·`/` 화면(T1-4 화면, T1-5, T1-8 (다)), Pretendard, T1-6 캐릭터, `tests/script/statusline.test.ts`, Playwright(T1-7·T1-8 화면), README 실행 방법.

### 구현 내용

| 파일 | 내용 |
|---|---|
| `app/fonts/PretendardVariable.woff2`, `app/fonts/OFL.txt` | 공식 릴리스 v1.3.9 `Pretendard-1.3.9.zip`의 `web/variable/woff2/PretendardVariable.woff2`(수정 없음, SHA-256 `9599f12f…00b4`)와 같은 압축의 `LICENSE.txt` 원문. `THIRD_PARTY_NOTICES.md`에 Pretendard 절 |
| `app/layout.tsx`, `app/tokens.css`, `app/globals.css` | `next/font/local`(weight 45 920, swap, preload, 시스템 fallback). 토큰은 `:root, [data-office-scope]` 라이트 + 다크 블록(office-* 없음), `color-scheme`. 리셋·포커스 링·reduced-motion |
| `app/login/*` | fetch 로그인 → 204면 `safeNextPath(next)`로 `location.replace`. 401(입력 지움·포커스), 429(Retry-After 초 카운트다운, 버튼 비활성), 403·500·네트워크(ErrorBar). 각주 항상, `aria-describedby="password-error login-note"` |
| `app/page.tsx`, `src/ui/Dashboard.tsx` | 헤더(SyncIndicator, 로그아웃) → 승인 대기 띠 → 플랜 사용량 → 필터 → 목록·상세·사무실. 3초 폴링(`/api/sessions`, `/api/plan-usage`, `/api/projects`, 선택 시 상세, 숨긴 세션 펼침 시 `hidden=only`), 숨긴 탭 정지·복귀 즉시 1회, 401 → `/login?next=`. 연속 3회 실패 ErrorBar. 필터는 URL → localStorage → 전체. 1280만 첫 세션 자동 선택. 정리·다시 표시·포커스 규칙(명세 3.6·3.6.1·6절) |
| `src/ui/PlanUsage.tsx` | PlanUsagePanel/Meter(ok·near·reached·expired·none, 두 창 none이면 안내 블록, 스켈레톤), `role="meter"`·`aria-valuetext`, 시간 문구는 응답 `now` 기준. PlanUsageMini(aria-hidden) |
| `src/ui/SessionList.tsx`, `SessionDetail.tsx`, `Office.tsx`, `StatusBadge.tsx`, `statusStyle.ts`, `icons.tsx`, `format.ts`, `api.ts`, `*.module.css` | SessionRow(`<li>` 안 링크·버튼 형제, variant hidden), 종료·숨긴 세션 접기, 빈 상태, 상세(모델 줄 `<dl>`, BOT 표 + AgentRow, `@container (max-width:560px)`), 임시 사무실(세 구역, 40px 사각형, 책상 막대, 캐릭터 프레임), 인라인 SVG 아이콘 |
| `src/auth/nextPath.ts`, `proxy.ts` | `safeNextPath`를 옮겨 proxy와 로그인 화면이 같이 쓴다(proxy는 다시 export, 동작 같음) |
| `src/characters/roles.ts` | `roleKeyFor`(null → lead, 원문 → 원문, `plugin:x` → x, 없으면 원문. vendor roleConfig.js에서 옮겨 고침, NOTICES), `makeRoleResolver`, roles.json(없으면 `config/roles.example.json`)·character.json mtime 캐시(D-20), `loadCharacter`(경로 이탈·그림 존재 확인), `charactersView` |
| `src/characters/spriteConfig.ts` | zod 설정 검증(그림 이름은 폴더 구분자 없는 png/webp), `resolveAction`(D-19) |
| `app/api/characters/route.ts`, `app/api/characters/[id]/image/route.ts` | 쿠키 필요. 그림은 id 정규식 + resolve 접두사, png/webp, `Cache-Control: private, max-age=60`, 그 외 404 |
| `app/api/sessions/[key]/route.ts`, `app/api/skills/route.ts` | `roles: getRoleResolver()` 연결 |
| `config/roles.example.json`, `config/characters.example/` | 예시 roles(캐릭터 모두 null), `sample/character.json` + `sheet.png`(코드로 만든 32×32 단색 사각형 테스트 그림, 16×16 칸 2줄×2프레임: idle, alert) |
| `tests/unit/characters.test.ts`, `tests/api/characters.test.ts`, `tests/unit/format.test.ts` | 매핑·대체·설정 검증, 캐릭터 API(경로 이탈, 깨진 설정, 그림 없음), 화면 문구 |
| `tests/api/query.test.ts` | todo 2개 → 캐릭터 두 route의 401 테스트. lead 외 표시 이름이 예시 roles로 매핑되어 qa → "QA"로 기대값 변경 |
| `tests/script/statusline.test.ts` | 설치 사본 실행(아래). `vitest.config.ts` include에 `tests/script`, `testTimeout` 20초 |
| `playwright.config.ts`, `e2e/*` | 포트 3100(빌드 후 start, 임시 데이터·캐릭터 폴더), 3101(시드 state.json). project `plan-screen` → `main`(의존). trace off |
| `.gitignore` | `characters/` → `/characters/`(아래 "바로잡은 것"), `test-results/`, `playwright-report/` |
| `README.md` | 실행 방법, 환경 변수, 테스트, observe·statusLine 연결, NO_PROXY, 캐릭터, `.data` 백업 파일 안내 |

### 검증
- `pnpm typecheck` 통과.
- `pnpm test` 417개 통과(14개 파일). 이번 추가·변경: unit characters 25, unit format 6, api characters 13, api query 37(+2, todo 없음), script statusline 24.
- `pnpm build` 통과(경고 0. 캐릭터 경로의 동적 fs 접근에 `turbopackIgnore` 주석).
- `pnpm test:e2e --trace off` 16개 통과(plan-screen 7, flow 6, observe 1, plan-usage 2). Chromium은 `/opt/pw-browsers/chromium`(설치된 @playwright/test 1.65가 기대하는 headless shell 1254가 없어 executablePath 사용). `playwright install`은 하지 않았다.
- 스크린샷: `docs/team/reports/screens/qa/dashboard-1280.png`, `dashboard-390.png`(상세 열림), `dashboard-390-list.png`(목록). 테스트 데이터만 보인다.
- 다크 모드는 수동으로 390·1280 스크린샷을 찍어 사무실이 라이트 값으로 보이고 2px office-edge 테두리가 생기는 것을 눈으로 확인했다(자동 테스트 아님, 저장 안 함).

### statusline 멈춤 확인(설계 6.1 [구현 시 확인 필요], 이 환경 범위)
- 설치 사본(0.1.3)을 임시 폴더에 복사하고, 감싼 명령을 "실행 흔적을 파일에 남기고 stdin의 `model.display_name`을 출력"하는 명령으로 두어, 실제 Claude Code statusLine 입력과 같은 모양의 stdin(`session_id`, `transcript_path`, `cwd`, `model`, `workspace`, `version`, `output_style`, `cost`, `exceeds_200k_tokens`, `rate_limits`)을 넣었다.
  - 같은 stdin 두 번: 두 번째는 감싼 명령이 실행되지 않고(흔적 1줄 그대로) 같은 출력 `[Opus 5.5]`, exit 0 → **멈춤 확인**.
  - `cost.total_duration_ms`만 바뀐 stdin: 역시 멈춤(설치 사본의 `FINGERPRINT_IGNORE`).
  - `cost.total_api_duration_ms`가 바뀐 stdin: 감싼 명령이 다시 실행됨(재개).
- 같은 내용을 `tests/script/statusline.test.ts`가 자동으로 확인한다.
- 이 환경에 Claude Code 2.1.322 CLI가 있지만 지시대로 실제 세션을 띄워 `CLAUDE_PROJECT_DIR`·한가할 때 stdin 변화를 기록하지는 않았다. 설치 사본 주석에 "2.1.322에서 확인: 한가할 때 바뀌는 것은 세션 경과 시간뿐"이라고 되어 있다(kit 쪽 확인 결과).

### 설계·디자인과 달라진 점과 이유
1. **statusline 스크립트 테스트에서 재개를 만들 때 `cost.total_api_duration_ms`를 바꾼다.** 설계 6.6은 `cost.total_duration_ms`를 바꾸라고 했지만, 설치 사본(0.1.3)은 그 필드를 지문에서 빼므로(설계 6.1 확인 결과 반영) 그대로 하면 멈춤으로 들어간다. 그 필드만 바뀌면 멈추는 것도 따로 테스트했다. 설계 6.6 문구 갱신이 필요하다.
2. **`GET /api/characters`의 `actions`는 D-19 대체까지 적용한 결과를 `<동작>_down` 키로 준다**(설계 예시의 키 형식은 같고, 원래 줄 목록 대신 대체 결과). 화면이 zod·대체 로직을 번들에 넣지 않고 키 조회만 하면 된다. 1단계는 방향이 down뿐이다.
3. **캐릭터 프레임은 `background-image` 대신 숨김 영역 안 `<img>`를 `transform: scale() translate()`로 잘라 보인다.** 그림 전체 크기를 모르고도 정수 배율로 키울 수 있고, 그림 로딩 실패를 `onError`로 받아 사각형으로 돌아가기 위해서다(명세 3.8 "onerror도 사각형"). `image-rendering: pixelated`, 프레임은 CSS `steps()` 애니메이션(reduced-motion이면 정지).
4. **`config/roles.example.json`은 모든 역할의 캐릭터를 null로 둔다.** roles.json이 없으면 예시를 읽는데(설계 7절), 예시에서 lead를 `sample`로 지정하면 그림 폴더가 없어 요청마다 경고 로그가 남는다. 지정 방법은 `config/characters.example/README.md`와 README에 적었다. E2E는 임시 폴더에 lead → sample을 지정해 프레임 표시를 확인한다.
5. **예시 테스트 그림 `config/characters.example/sample/sheet.png`를 커밋했다.** 설계 1절·책임자 지시("직접 만든 테스트 그림")를 따랐다. DESIGN.md 8절 Don't "폰트·이미지·아이콘 파일을 저장소에 추가하지 않는다(예외 Pretendard)"와 문구가 부딪힌다. 화면 자산이 아닌 테스트용 144바이트 단색 사각형이지만, DESIGN.md 예외 목록에 넣을지 designer 확인이 필요하다.
6. **상세의 "정리/다시 표시" 판단은 상세 응답의 `session.dismissedAt`으로 한다.** 명세 3.6.1은 "세션 키가 숨긴 목록에 있는지"인데, 설계 8절대로 숨긴 목록은 펼쳤을 때만 부르므로 접힌 상태에서도 맞게 보이도록 바꿨다. 숨긴 세션 수는 명세 9절 간극대로 `hiddenCount`를 쓴다.
7. **`/api/projects`도 3초 폴링에 넣었다.** 설계 8절 폴링 목록에는 없지만 필터 옵션의 "활성 a/b"와 새 프로젝트가 화면을 새로 고치지 않아도 반영되게 하려는 것이다(작은 응답).
8. **BOT 배지의 기다린 시간·응답 없음**: 에이전트 DTO에 이미 `waitingSince`·`stale`이 있어(2차) 명세 9절 간극 없이 그대로 쓴다.
9. **승인 대기 띠**는 `role="status" aria-live="polite"` 요소를 항상 두고 그 안에 버튼을 넣는다. 띠가 처음 나타날 때도 읽히게 하려는 것이다(라이브 영역이 나중에 생기면 읽히지 않는다).
10. **남은 시간 24시간 이상에서 M=0이면 "N일 0시간 후"**로 쓴다(DESIGN.md는 시간 단위에만 M=0 예외가 있어 문구 그대로 따랐다). 5시간 창 초기화가 모레 이후면(실제로는 없음) 주간과 같은 날짜 형식을 쓴다.
11. **다크 모드 `--shadow-sm`·`--shadow-md`는 `none`**(DESIGN.md 5절 "다크는 그림자 없이").
12. **OFL.txt**: DESIGN.md 3.1은 "저작권 줄 4개"라고 했지만 v1.3.9 공식 `LICENSE.txt`의 저작권 줄은 1개다. 받은 원문을 그대로 두었다.
13. **E2E 서버 두 개**: 3101은 3100의 빌드가 끝날 때까지 `e2e/wait-for.mjs`로 기다린 뒤 같은 `.next`로 start한다(동시 빌드 방지). 플랜 사용량 화면 상태 파일은 project 의존으로 다른 테스트보다 먼저 빈 서버에서 돈다(설계 6.6 "먼저 돌리거나").
14. **로그인 429에 `Retry-After`가 없으면 60초**로 센다(서버는 항상 붙이므로 대비용).

### 바로잡은 것
- `.gitignore`의 `characters/` 규칙이 `src/characters/`·`app/api/characters/`까지 무시해, 커밋 `9594a9c`(T1-6)에 `roles.ts`·`spriteConfig.ts`·두 route가 빠졌다. 바로 다음 커밋 `310a11d`에서 규칙을 `/characters/`로 좁히고 파일을 넣었다. 따라서 `9594a9c` 하나만 체크아웃하면 타입 검사가 깨진다(이력은 다시 쓰지 않음). 루트 `characters/`는 여전히 무시된다(`git check-ignore`로 확인).

### 알려진 제한·남은 문제
- **1280에서 세션 상세 BOT 목록이 표가 아니라 AgentRow로 보인다.** 명세 3.2 격자 `360 | 1fr | 360`, 좌우 24px, 열 간격 16px이면 1280에서 가운데 열이 약 480px(패널 안쪽은 더 좁음)라 명세의 `@container (max-width: 560px)` 규칙에 걸린다. 명세 5절 표("1280: DataTable")와 3.2 규칙이 서로 맞지 않는다. 지금은 규칙(560px)을 따랐다. 1280에서 표를 보이려면 기준 폭 또는 열 폭을 designer가 정해야 한다.
- E2E "폴링 3초 + 1초" 테스트는 이 환경에서 3.8~3.9초가 걸려 느린 PC에서는 가끔 실패할 수 있다.
- QA 스크린샷의 플랜 사용량은 앞선 화면 상태 테스트가 남긴 값(5시간 100% 한도 도달)이다. 테스트 데이터라 그대로 두었다.
- 응답 없음(24시간) 화면은 서버 시계를 바꿀 수 없어 E2E로 보지 않았다(배지 문구·아이콘은 단위 테스트, 판정은 2차 API 테스트).
- 캐릭터 설정 캐시(Map)는 지우지 않는다(파일 수만큼, 작음).
- `profile.md` "명령" 절의 E2E 항목("1단계 3차에서 설정 예정")과 `tests/script` 문구 갱신은 `.claude/` 수정 금지라 하지 않았다. 책임자가 갱신해 주세요.
- 실제 Claude Code 세션의 `CLAUDE_PROJECT_DIR`·한가할 때 stdin, 휴대폰 확인은 `[사용자 확인]`으로 남는다.

## 1단계 검증 이슈 수정

### SEC-01 (High) 프로토타입 오염
- 원인: `sessions`·`events`·`agents`·`skills`·`agentCalls`가 일반 객체이고 외부 문자열을 키로 그대로 읽고 썼다.
- 수정: `src/domain/dict.ts`를 추가했다. `dict()`(프로토타입 없는 객체), `getOwn`(`Object.hasOwn`으로 자기 속성만), `setOwn`(`defineProperty`로 써서 `__proto__` setter를 거치지 않음), `toDict`(JSON에서 읽은 객체를 옮김).
  - `src/state/reducer.ts`: 새 세션의 세 맵을 `dict()`로 만들고, 에이전트·스킬·BOT 호출 읽기·쓰기를 getOwn/setOwn으로 바꿨다.
  - `src/store/core.ts`: sessions·events 읽기·쓰기, dismiss·restore(경로 key)·getSession·recentEvents를 getOwn/setOwn으로 바꿨다.
  - `src/store/fileStore.ts`: 읽을 때 sessions·events를 `toDict`로 옮긴다. 저장 형식(JSON)은 그대로라 기존 state.json과 호환된다.
  - `src/aggregate/totals.ts`(byRole·agents·agentCalls), `src/query/views.ts`(skills), `src/characters/roles.ts`(roles·characters 출력), `src/ui/Office.tsx`(characterId 조회, `constructor` 같은 id 방지)도 같은 방식으로 바꿨다.
- 왜 Map이 아니라 helper인가: `structuredClone`·`JSON.parse`는 결과를 일반 객체로 만들기 때문에 null-prototype만으로는 부족하다. 타입(`Record`)과 저장 형식을 바꾸지 않고, 접근을 항상 자기 속성으로 제한하는 쪽이 범위가 작고 확실하다.
- 스키마 결정: `/api/events`·`/api/plan-usage/report`는 세 값을 **거부하지 않고 그대로 저장한다**. `skill`·`subagent_type`은 모델 입력에서 오므로 400으로 막으면 이벤트 하나 때문에 상태 기록이 빠진다(D-21 정신: 수집이 끊기지 않게). 근본 원인인 맵 접근을 고쳤으므로 이중 방어는 두지 않았다. 플랜 schema는 외부 문자열을 키로 쓰지 않는다(창 이름은 고정 목록).
- 테스트: `tests/api/protoKeys.test.ts`(memory·file 각 3개). 세 값을 agent_id·agent_type·skill·subagent_type·session_id·project·tool, dismiss/restore/상세 경로 key로 보낸 뒤 로그인 204·`/api/sessions` 200·상세·스킬 200, `({}).status` 등 undefined, Object.prototype 속성 목록 불변, 값이 그대로 저장됨, fileStore 다시 읽기를 확인한다. 수정 전 코드로 돌리면 6개 모두 실패한다.
