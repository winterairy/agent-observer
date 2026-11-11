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
