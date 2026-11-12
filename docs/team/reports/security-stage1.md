# 보안 점검 보고서 — 1단계

- 브랜치: ccr-8787a7c0-5ou4xy / 날짜: 2026-11-12 / 점검자: security BOT(읽기 전용)

## 요약

- **판정: FAIL** (High 1건)
- 심각도별: Critical 0 / High 1 / Medium 0 / Low 4 / Info 4
- 점검표: 공통 항목 + `.claude/team/checklists/security-web.md`
- 범위: app/, src/, proxy.ts, instrumentation.ts, next.config.ts, package.json·pnpm-lock.yaml·.npmrc, .gitignore, .env.example, config/, `.claude/team/observe/statusline.mjs`·`observe.mjs`(수집 쪽 위험만), `git ls-files` 전체

## 이슈

### SEC-01 (High) 객체 키 `__proto__`로 Object.prototype 오염 → 서버 전체가 500 (로그인 화면 포함)

- 위치: `src/state/reducer.ts:122-127`(`s.agents[key]`), `:155-158`(`bySkill[ev.skill]`), `:161-162`(`calls[ev.subagent_type]`), `src/store/core.ts:98,112,139,146`(`this.data.sessions[key]`), `src/collect/schema.ts:23-37`(값 제한 없음)
- 설명: 저장소 상태(`sessions`, `events`, `agents`, `skills`, `agentCalls`)가 일반 객체 `{}`이고 키로 외부 문자열을 그대로 쓴다. `agent_id`나 `skill`이 `"__proto__"`이면 `s.agents["__proto__"]`가 `Object.prototype`을 돌려주고, reducer가 그 객체에 `status`·`lastEventTs`·`count` 같은 필드를 쓴다. 그러면 프로세스 안의 모든 객체가 오염된다.
- 재현(검증 서버 127.0.0.1:3000, 임시 토큰 사용):
  ```
  curl --noproxy '*' -H 'Authorization: Bearer verify-token-0123456789abcdef' -H 'Content-Type: application/json' \
    -d '{"v":1,"event":"PreToolUse","ts":"<지금 ISO>","session_id":"secprobe","project":"secprobe","agent_id":"__proto__","tool":"Skill","skill":"__proto__"}' \
    http://127.0.0.1:3000/api/events
  ```
  결과: 이 요청이 500을 돌려주고, 그 뒤로 `/login` 500, `/api/auth/login` 500, `/api/sessions`·`/api/projects` 500. 서버 로그에는 `TypeError: Getter must be a function: 1794454529000`, `RangeError: init["status"] must be in the range of 200 to 599`가 남는다. `Object.prototype.get`·`status`가 오염된 것이다. 프로세스를 다시 시작하기 전까지 복구되지 않는다(state.json에는 남지 않음).
- 악용 시나리오: 토큰은 필요하다. 하지만 `skill`·`subagent_type`은 observe.mjs가 모델의 `tool_input`에서 그대로 가져온다(`observe.mjs:185-187`). 그래서 프롬프트 인젝션으로 모델이 `Skill(name="__proto__")`를 호출하게 만들면 PreToolUse hook이 이 값을 보내고, 공격자가 토큰을 몰라도 관측 서버가 죽는다. 같은 원인으로 로그인한 사용자의 `POST /api/sessions/__proto__/dismiss`도 `Object.prototype.dismissedAtTs`를 쓴다. 2단계에서 서버를 공개 배포하면 영향 범위가 더 넓어진다.
- 권장 수정: (1) 키로 쓰는 맵을 `Object.create(null)`이나 `Map`으로 바꾼다. JSON에서 읽을 때도 null-prototype 객체로 옮긴다. (2) 조회·쓰기 전에 `Object.hasOwn`으로 확인한다. (3) 스키마에서 `__proto__`·`constructor`·`prototype` 값을 거부한다(이중 방어). (4) 세 필드와 세션 키 `__proto__`로 회귀 테스트를 추가한다.

### SEC-02 (Low) 전역 로그인 실패 제한으로 소유자 잠금 가능
- 위치: `src/auth/rateLimit.ts:47-50`, `src/config.ts`(global 20/분)
- 설명: 인증 없이 1분에 20번 틀리면 모든 IP의 로그인이 429가 된다. 공격자는 x-forwarded-for를 바꿔 IP별 제한을 피할 수 있지만 전역 제한이 무차별 대입을 1분 20회로 막는다. 이 설계는 의도대로 동작한다. 대신 그 제한을 이용해 소유자를 계속 잠가 둘 수 있다.
- 1단계(127.0.0.1)에서는 허용한다. 2단계에서는 플랫폼이 주는 IP만 믿고(XFF 첫 값 대신 Vercel의 `x-real-ip`나 마지막 hop), 저장소를 공유하는 제한으로 바꾼다.

### SEC-03 (Low) 보안 헤더 없음(CSP, X-Frame-Options/frame-ancestors, Referrer-Policy)
- 위치: `next.config.ts:3-5`
- 설명: 대시보드를 iframe에 넣을 수 있어 정리 버튼 클릭재킹이 가능하다. XSS 싱크(`dangerouslySetInnerHTML`·`innerHTML`)는 없고 React가 escape한다. 로컬 범위라 Low로 본다.
- 권장: `headers()`에 `frame-ancestors 'none'`이 들어간 CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`을 넣는다. 2단계에서 HSTS를 추가한다.

### SEC-04 (Low) 수집 스크립트가 토큰을 curl 명령줄 인자로 넘김
- 위치: `.claude/team/observe/statusline.mjs:326-332`(observe.mjs의 send도 같음)
- 설명: `-H "Authorization: Bearer <token>"`이 프로세스 목록(`ps`)에 보여서 같은 기기의 다른 사용자가 읽을 수 있다.
- 권장(설치본이라 kit 쪽에 전달): `-H @-`나 `--config -`로 stdin에서 헤더를 넘긴다.

### SEC-05 (Low) 세션 무효화 수단 없음(서명 쿠키 30일)
- 위치: `src/auth/cookie.ts`, `app/api/auth/logout/route.ts`
- 설명: 설계 15절에서 인정한 리스크다. 쿠키가 유출되면 로그아웃해도 만료될 때까지 유효하다. 로컬 범위라 허용한다. 2단계에서 `OBSERVER_SESSION_SECRET` 교체 절차를 문서로 남기거나 기간을 줄인다.

### Info
- I-1 Origin 없는 POST 통과(개발 2차 결정): **1단계에서는 타당하다.** 현대 브라우저는 다른 출처로 보내는 POST(fetch와 form 모두)에 Origin을 붙이고, `Origin: null`은 403이다. 같은 사이트의 다른 포트(localhost:다른포트)는 SameSite=Lax로 막지 못하지만 Origin 호스트:포트 비교로 막힌다. login CSRF도 Origin 검사로 막힌다. 2단계에서는 비교 기준을 `Host` 대신 설정된 공개 호스트(또는 `x-forwarded-host` 검증)로 바꾸고, 가능하면 `Sec-Fetch-Site`도 함께 확인할 것을 권고한다. DNS rebinding은 쿠키가 원래 호스트에 묶여 있고 로그인·토큰이 필요해 1단계에서는 영향이 없다.
- I-2 `statusline.mjs`의 `plan-usage.json`은 mode를 지정하지 않는다(:296). 내용은 퍼센트와 시각뿐이라 민감하지 않다. `AGENT_OBSERVER_DEBUG=1`이면 stdin 전체(cwd, transcript 경로 포함)를 0600 로그로 남긴다(:262-266). 디버그 전용이라는 점을 문서에 적어 둔다.
- I-3 감싼 statusLine 명령은 `/bin/sh`로 실행된다(:188-192). 명령 출처는 사용자 자신의 `settings.json`·`statusline.json`이라 신뢰 경계가 늘지 않는다.
- I-4 캐릭터 폴더 안 심볼릭 링크는 `path.resolve` 접두사 검사를 통과한다(`src/characters/roles.ts:135-152`). 폴더는 운영자가 관리하므로 Info로 둔다. 필요하면 `fs.realpath`로 비교한다.

## 통과 항목
- Bearer: `^Bearer (\S+)$`, `timingSafeEqual`(길이가 다르면 바로 false — 토큰 길이만 노출되어 허용). 서버 토큰이 없거나 16자 미만이면 모든 요청을 401 `server_token_invalid`로 거부하고, 시작할 때 값 없이 경고한다.
- 서명 쿠키: HMAC-SHA256, 형식 정규식과 256자 제한, 만료 확인, `crypto.subtle.verify`(상수 시간). 비밀번호가 비었으면 쿠키를 만들지도 검증하지도 않는다(열린 상태로 시작하지 않음). 속성은 HttpOnly, SameSite=Lax, https일 때 Secure.
- 비밀번호 비교: 양쪽 SHA-256 뒤 `timingSafeEqual`.
- proxy 보호 범위: 공개는 수집 2개·login·logout·/login·정적 경로뿐이다. 모든 조회 route에서 `requireSession`으로 이중 확인한다. 조회에는 Bearer를 무시한다(Bearer만 보낸 요청은 401). `next` 리다이렉트는 `//`, `/\`를 차단한다.
- 입력: Content-Length와 스트림 16KB(로그인 4KB)로 제한한다. UTF-8 fatal 디코딩, zod strip(prompt/tool_input/usage 버림), 문자열 256자, 미래 ts는 서버 시각으로 보정, plan-usage는 0–100·초 단위 범위를 검증한다. 400 응답에는 필드 경로만 넣고 값은 넣지 않는다.
- 캐릭터 이미지: id 정규식, resolve 뒤 접두사 확인, png/webp만, nosniff, 쿠키 필요.
- 로그·응답: 토큰·비밀번호·본문 값·스택을 남기지 않는다(`e.name`만 기록). state.json·lock·tmp는 0600, 데이터 폴더는 0700으로 만든다(이미 있는 폴더의 권한은 바꾸지 않음).
- .gitignore: `.env*`(예시 제외), `.data/`, `/characters/`, `public/characters/*`. 커밋된 파일에 비밀값·실제 데이터·원본 그림이 없다. `sample/sheet.png`는 32×32 단색 테스트 그림으로, 원본 Pixel Agent Desk 그림이 아니다(README 기재와 일치). `.env.example`은 값이 비어 있다.
- statusline.mjs 전송 본문: `{v, ts, remote, rate_limits}`만 보낸다. cwd·세션 ID·transcript 경로는 보내지 않는다(세션 ID는 해시로 바꿔 파일 이름에만 씀). 세션 파일은 0600, 폴더는 0700.
- 서버 전용 비밀값이 클라이언트로 가지 않는다(`NEXT_PUBLIC_` 없음). `poweredByHeader: false`.

## 실행한 도구와 결과
- `pnpm audit`: **No known vulnerabilities found**. 버전은 정확히 고정되어 있다(`.npmrc save-exact=true`, next 16.4.6 / react 19.3.1 / zod 4.6.7).
- 비밀값 패턴 grep(`git ls-files` 전체): 발견 없음.
- 검증 서버(127.0.0.1:3000)에 curl 프로브: SEC-01 재현. **프로브 뒤 검증 서버 프로세스가 오염된 상태라 재시작해야 한다**(데이터 파일은 그대로).

## 재검증 결과
- 이전 보안 보고서 없음(첫 점검).

## 2단계(Vercel 배포)에서 다시 볼 항목
- SEC-01 수정 확인(공개 수집 엔드포인트가 되므로 필수).
- Origin 비교 기준(Host와 x-forwarded-host), `isHttps`의 x-forwarded-proto 신뢰, Secure 쿠키 강제.
- 로그인 제한의 IP 출처(플랫폼 헤더)와 공유 저장소, 잠금 DoS.
- 보안 헤더(CSP, HSTS, frame-ancestors).
- `OBSERVER_SESSION_SECRET` 필수화와 교체 절차, 쿠키 기간.
- 파일 저장소 대신 쓸 저장소의 접근 권한과 비밀값 관리(Vercel env).
- Next.js 16.x 보안 공지를 배포 시점에 다시 확인.
