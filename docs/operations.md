# 운영 문서 (1단계: 로컬 실행)

1단계는 한 PC의 127.0.0.1에서만 돌린다. 배포는 하지 않는다(2단계 준비는 [deploy-vercel.md](deploy-vercel.md)).

## 1. 준비

- Node.js 22 이상, pnpm 10.28.0(`package.json`의 `packageManager`. `corepack enable`이면 자동으로 맞춰진다)
- `pnpm install --frozen-lockfile`
- `cp .env.example .env.local` 후 값을 채운다. `.env.local`은 gitignore돼 커밋되지 않는다.

### 서버 환경 변수(이름과 용도만)

| 이름 | 필수 | 용도 |
|---|---|---|
| `OBSERVER_TOKEN` | 예 | 수집 API Bearer 토큰(16자 이상). 없으면 수집이 모두 401 |
| `OBSERVER_PASSWORD` | 예 | 화면 로그인 비밀번호. 없으면 로그인 불가 |
| `OBSERVER_SESSION_SECRET` | 아니오 | 쿠키 서명 키(32자 이상 권장). 없으면 비밀번호에서 파생 |
| `OBSERVER_STORE` | 아니오 | `file`(기본) 또는 `memory` |
| `OBSERVER_DATA_DIR` | 아니오 | 파일 저장소 폴더(기본 `./.data`) |
| `OBSERVER_CHARACTERS_DIR` | 아니오 | 역할·캐릭터 설정 폴더(기본 `./characters`) |

보내는 PC 쪽 변수(`AGENT_OBSERVER_URL`, `AGENT_OBSERVER_TOKEN`, `AGENT_OBSERVER_DISABLE`, `AGENT_OBSERVER_DEBUG`, `NO_PROXY`)는 README "수집 연결"을 본다.

비밀값 보관: 서버 값은 `.env.local`에만, 보내는 쪽 토큰은 Claude Code를 띄우는 셸 환경이나 `.claude/settings.local.json`의 `env`(커밋 안 됨)에만 둔다. 저장소·이슈·로그에 붙여 넣지 않는다.

## 2. 시작과 정지

| 용도 | 시작 | 주소 |
|---|---|---|
| 개발 | `pnpm dev` | http://127.0.0.1:3000 |
| 빌드해서 실행 | `pnpm build && pnpm start` | http://127.0.0.1:3000 |

- 정지: 실행한 터미널에서 Ctrl+C. 데이터는 매 저장마다 `.data`에 쓰이므로 정지로 잃지 않는다(`OBSERVER_STORE=memory`면 사라진다).
- 포트 3000이 이미 쓰이고 있으면 먼저 떠 있는 서버를 끈다(`ss -ltnp | grep 3000` 또는 `lsof -i :3000`).
- 확인: `curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/login` → `200`.

## 3. 데이터 폴더(`.data`)

- `state.json`: 세션·이벤트·플랜 사용량 상태. 프롬프트·응답·도구 입력은 저장하지 않는다.
- `state.json.bak-<시각>`: 저장 형식 버전이 다르거나 파일이 깨졌을 때 서버가 옮겨 둔 백업. 서버는 다시 읽지 않는다. 필요 없으면 지운다. schemaVersion 1 백업에는 옛 토큰 수가 들어 있을 수 있다.
- 초기화: 서버를 끄고 `.data/state.json`을 지운 뒤 다시 시작하면 빈 상태로 시작한다.
- 백업하려면 서버를 끈 상태에서 `.data`를 통째로 복사한다.
- `pnpm dev`와 `pnpm start`를 같은 `.data`로 동시에 띄우지 않는다(서로 덮어쓴다).

## 4. 로그

로그 파일은 따로 없다. 서버를 띄운 터미널의 표준 출력·오류에 남는다. 접두어로 찾는다.

| 접두어 | 뜻 |
|---|---|
| `[events] 검증 실패: …` | 수집 payload가 스키마에 맞지 않음(보내는 쪽 버전 확인) |
| `[events] 저장 실패` / `[skills]`·`[projects]` 조회 실패 | 저장소 오류. `.data` 권한·디스크 확인 |
| `[store] 알 수 없는 OBSERVER_STORE 값` | 오타. file 저장소로 동작 중 |
| `[characters] …` | 캐릭터 설정 오류(화면에서는 사각형으로 보임) |

오류 로그에는 예외 이름만 남고 payload 내용은 남지 않는다. 남기려면 `pnpm dev 2>&1 | tee observer.log`(`*.log`는 gitignore됨). 프로젝트 경로·세션 정보가 남을 수 있으니 공유하지 말고 확인 후 지운다.

## 5. 토큰·비밀번호 교체

1. 새 값 만들기: `openssl rand -hex 32`
2. 서버를 끄고 `.env.local`의 값을 바꾼 뒤 다시 시작한다(환경 변수는 시작할 때만 읽는다).
3. `OBSERVER_TOKEN`을 바꿨으면 보내는 PC의 `AGENT_OBSERVER_TOKEN`도 같은 값으로 바꾸고 Claude Code를 다시 띄운다. 안 바꾸면 수집이 401로 조용히 실패한다.
4. `OBSERVER_PASSWORD` 또는 `OBSERVER_SESSION_SECRET`을 바꾸면 기존 로그인 쿠키가 모두 무효가 되어 다시 로그인해야 한다. 쿠키가 유출됐다고 의심되면 이 방법으로 끊는다(로그아웃만으로는 만료 30일까지 유효).

## 6. observe·statusLine 연결 확인

1. 서버가 떠 있는지 확인(2절의 curl).
2. 토큰 확인(값을 화면에 찍지 않도록 변수로):
   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' -X POST http://127.0.0.1:3000/api/events \
     -H "Authorization: Bearer $AGENT_OBSERVER_TOKEN" -H 'Content-Type: application/json' -d '{}'
   ```
   `401`이면 토큰 불일치, `400`이면 토큰은 맞고 본문만 틀린 것(정상), `000`이면 연결 실패(프록시·주소 확인).
3. hook: `AGENT_OBSERVER_DEBUG=1`로 Claude Code를 띄우면 observe.mjs가 보낼 본문을 stderr에 쓴다(프로젝트 경로·세션 정보가 남을 수 있으니 공유하지 말고 확인 후 지운다). 화면에 세션이 3초 안에 나타나는지 본다. `.claude/settings.json`의 `hooks`에 observe.mjs가 있는지 확인한다.
4. statusLine: `.claude/settings.json`의 `statusLine.command`가 `statusline.mjs`를 가리키는지 확인한다. 값은 Claude 구독 로그인 세션의 첫 응답 이후에만 생기고, 바뀔 때만 최대 1분에 1회 보낸다. "마지막 측정 N분 전"이 오래돼도 한가하면 정상이다.
5. `AGENT_OBSERVER_DISABLE=1`이 남아 있지 않은지, `AGENT_OBSERVER_URL`이 설정돼 있는지 확인한다.

## 7. 문제 해결

| 증상 | 원인과 조치 |
|---|---|
| `pnpm dev` 화면이 갑자기 깨짐(청크 404, 모듈 없음 오류) | 개발 서버가 떠 있는 동안 `pnpm build`나 `pnpm test:e2e`(내부에서 build)를 돌려 `.next`를 덮어씀. **build·E2E와 dev를 동시에 돌리지 않는다.** 복구: dev를 끄고 `rm -rf .next` 후 `pnpm dev` |
| 보내는 쪽 요청이 실패(`000`, 프록시 오류) | `HTTPS_PROXY`·`HTTP_PROXY`가 있는 환경. `NO_PROXY=127.0.0.1,localhost`와 `no_proxy`를 같은 값으로 설정 |
| 수집이 모두 401 | 서버 `OBSERVER_TOKEN` 미설정 또는 보내는 쪽 토큰 불일치(5절) |
| 로그인이 429 | 1분 안 실패가 많음. 1분 기다린다 |
| 서버 시작 후 이전 데이터가 없음 | `state.json`이 깨졌거나 형식 버전이 달라 `.bak-<시각>`으로 옮겨짐(3절). 또는 `OBSERVER_STORE=memory` |
| BOT이 사각형으로만 보임 | 캐릭터 설정 없음 또는 오류. `[characters]` 로그 확인 |
| E2E가 Chromium을 못 찾음 | `pnpm exec playwright install chromium` 또는 `PW_CHROMIUM_PATH` 지정 |

## 8. 되돌리기

1단계는 배포가 없으므로 되돌리기는 코드와 데이터 두 가지다.
- 코드: 문제가 생긴 커밋 이전으로 `git checkout <커밋>` 후 `pnpm install --frozen-lockfile && pnpm build`.
- 데이터: 서버를 끄고 3절에서 복사해 둔 `.data`로 바꾼다.

## 9. CI

`.github/workflows/ci.yml`: push·pull_request마다
- `check` job: Node 22, pnpm(packageManager), `pnpm install --frozen-lockfile` → `pnpm typecheck` → `pnpm test` → `pnpm build`
- `e2e` job(check 성공 후): `pnpm exec playwright install --with-deps chromium` → `pnpm test:e2e -- --trace off`. 필수 검사로 둔다(1단계 수용 기준이 화면·통합 흐름이므로).

CI는 비밀값을 쓰지 않는다. job env의 `OBSERVER_TOKEN`·`OBSERVER_PASSWORD`는 CI 전용 임시 문자열이고, E2E 토큰은 playwright.config.ts가 실행 때 무작위로 만든다.

## 10. 사용자 확인 필요

- GitHub Actions에서 첫 CI 실행 결과(이 환경에서는 로컬에서 같은 명령만 확인).
- E2E job이 GitHub 러너에서 시간 안에 끝나는지(build 2회 포함). 불안정하면 `continue-on-error: true`로 낮출지 결정.
- 휴대폰에서 볼 때 `-H 0.0.0.0`으로 직접 여는 것(같은 네트워크 누구나 로그인 화면에 접근 가능). HTTP 평문이라 같은 네트워크에서 쿠키·토큰이 보인다. 공용 Wi-Fi에서는 쓰지 않는다.
