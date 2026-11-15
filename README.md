# agent-observer

Claude Code 세션과 [dev-team-kit](https://github.com/winterairy/dev-team-kit) BOT의 활동·스킬 사용·승인 대기, 그리고 Claude 플랜 사용량(5시간·주간 한도 사용률)을 한 화면으로 보는 관찰 서버입니다.

상태: 1단계(로컬 수집 서버와 화면) 구현·자동 검증 완료, 사용자 확인 항목 남음(아래 "현재 구현 범위"). 결정 사항과 범위는 [docs/HANDOFF.md](docs/HANDOFF.md)에 있습니다.

이 저장소에는 dev-team-kit이 설치되어 있습니다. Claude Code에서 `/team-init`으로 설정을 만든 뒤 `/task`로 진행합니다.

참고한 외부 코드와 글꼴은 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 보세요.

## 현재 구현 범위

1단계(로컬 전용) 기준입니다. QA 수용 기준 98개 중 90개 통과, 8개는 이 환경에서 확인할 수 없어 사용자 확인이 남았습니다(자세한 판정은 [docs/team/reports/qa-stage1.md](docs/team/reports/qa-stage1.md)).

### 구현·검증된 기능

| 기능 | 내용 |
|---|---|
| 수집 API | `POST /api/events`가 payload v1을 Bearer 토큰(`OBSERVER_TOKEN`, 16자 이상)으로 받는다. 형식 검증(400), 크기 제한 16KB(413), 정의되지 않은 필드와 `usage`(토큰 수)는 저장하지 않는다. 저장은 로컬 파일(테스트용 메모리 저장소 있음) |
| 상태 계산 | 세션·BOT별 작업 중/생각 중/승인 대기/완료/종료. 시간 초과 종료(작업·생각 10분, 완료 30분), 승인 대기는 종료하지 않고 기다린 시간 표시, 24시간 넘으면 "응답 없음" |
| 스킬·BOT 호출 기록 | 세션·역할·프로젝트별 스킬 횟수, Agent 도구로 부른 BOT 기록. BOT·세션이 끝나도 남는다 |
| 로그인 | 비밀번호 하나(`OBSERVER_PASSWORD`), 서명 쿠키 30일, 실패 제한(1분 5회, 전체 20회), 다른 Origin POST 거부. 화면·조회 API·캐릭터 그림 모두 로그인 필요 |
| 조회 API·화면 | 프로젝트 필터, 세션 목록(승인 대기가 맨 위), 세션 상세(BOT 목록·상태·스킬·모델), 정리·숨긴 세션 보기·다시 표시, 3초 폴링. 토큰 수·비용은 표시하지 않는다. 390·1280px 가로 스크롤 없음, 키보드 조작 |
| 플랜 사용량 | 설치된 `statusline.mjs`가 5시간·주간 사용률을 값이 바뀔 때만(PC당 최대 1분 1회) 보낸다. 서버는 창별 마지막 값만 저장(재시작 후 유지, 여러 보고는 D-27 규칙으로 병합). 화면에 막대·사용률·초기화 시각·"마지막 측정 N분 전", 80% "한도 가까움"·100% "한도 도달", 만료 시 "초기화됨" |
| 캐릭터 설정 | `characters/`의 `roles.json`과 캐릭터 설정으로 BOT에 그림 프레임 지정. 역할 매핑·동작 대체, 설정 오류 시 사각형으로 대체 |
| 임시 사무실 | BOT마다 사각형(또는 캐릭터 프레임)과 이름, 상태에 따라 위치·표시가 바뀐다. 벽 자리에 플랜 사용량 계기판 |

### 검증 환경

Linux(클라우드 컨테이너), Node 22, Chromium headless(Playwright), 로컬 서버(127.0.0.1)에서 `pnpm typecheck`, `pnpm test`(423개), `pnpm build`, `pnpm test:e2e`(19개)가 통과했고 개발 서버를 직접 확인했습니다. 실제 휴대폰, macOS·Windows, 다른 브라우저, 실제 Claude Code 세션 연결은 검증하지 않았습니다.

### 알려진 한계

- **사용자 확인 필요(미검증)**: 휴대폰 로그인 유지, 실제 휴대폰 화면, 자기 그림 지정, 실제 로컬 Claude Code hook 연결, 구독 계정 플랜 값이 `/usage`와 같은지, 기존 statusLine이 있는 PC 설치, 클라우드 세션 statusLine(2단계), dev-team-kit 저장소 문서
- 플랜 사용량은 작업 중일 때만 보내므로, 한가한 동안 다른 곳(다른 PC, 웹 등)에서 쓴 사용량은 다음 작업 전까지 반영되지 않는다
- 사용자 한 명, Claude 계정 하나를 가정한다. 다른 계정 값이 오면 섞일 수 있다
- 1단계는 로컬(127.0.0.1) 전용이다. 배포·HTTPS·DB·클라우드 세션 수집은 없다
- 보안 Low 항목: CSP에 `script-src 'unsafe-inline'`(Next inline script 때문), 전역 로그인 실패 제한으로 소유자가 잠길 수 있음, 로그아웃해도 유출된 쿠키는 만료까지 유효, 수집 스크립트가 토큰을 curl 명령줄 인자로 넘김(dev-team-kit 쪽 수정 필요)
- 사무실은 임시 그림이다(단색 사각형). 진짜 사무실 그림은 3단계
- E2E 폴링 테스트가 4초 기준에 가까워(이 환경 3.8~4.1초) 느린 PC에서 가끔 실패할 수 있다

### 다음 단계(계획, 미구현)

- 2단계: Vercel 배포, DB, Electron 창·알림, 휴대폰 푸시, 클라우드 세션 수집
- 3단계: 진짜 픽셀 사무실 그림, 좌표·이동, 캐릭터 길찾기

## 실행 방법

필요한 것: Node.js 22 이상, pnpm 10(`packageManager` 필드 버전), 수집 스크립트 전송용 `curl`(없으면 `fetch`로 대신 보냄).

```bash
pnpm install
cp .env.example .env.local   # 값을 채운다(.env.local은 커밋되지 않는다)
pnpm dev                     # http://127.0.0.1:3000
```

빌드해서 실행하려면 `pnpm build && pnpm start`(같은 주소)입니다. 서버는 127.0.0.1에서만 열립니다.

### 환경 변수(서버)

| 이름 | 필수 | 기본 | 설명 |
|---|---|---|---|
| `OBSERVER_TOKEN` | 예 | 없음 → 수집 요청이 모두 401 | 수집 API의 Bearer 토큰. 16자 이상. 예: `openssl rand -hex 32` |
| `OBSERVER_PASSWORD` | 예 | 없음 → 로그인 불가 | 화면 로그인 비밀번호 |
| `OBSERVER_SESSION_SECRET` | 아니오 | 비밀번호에서 파생 | 로그인 쿠키 서명 키(32자 이상 권장) |
| `OBSERVER_STORE` | 아니오 | `file` | `file` 또는 `memory`(재시작하면 사라짐) |
| `OBSERVER_DATA_DIR` | 아니오 | `./.data` | 파일 저장소 폴더 |
| `OBSERVER_CHARACTERS_DIR` | 아니오 | `./characters` | 역할·캐릭터 설정 폴더 |

`pnpm dev`와 `pnpm start`를 같은 `.data` 폴더로 동시에 띄우지 마세요(서로 덮어씁니다). `pnpm dev`가 떠 있는 동안 `pnpm build`(또는 `pnpm test:e2e`)도 돌리지 마세요. 같은 `.next` 폴더를 덮어써 개발 서버가 깨집니다.

### `.data` 백업 파일

저장 형식 버전이 바뀌었거나 `state.json`이 깨져 있으면, 서버는 변환하지 않고 그 파일을 `.data/state.json.bak-<시각>`으로 옮긴 뒤 빈 상태로 시작합니다. 백업 파일은 직접 확인하는 용도로만 남기며 서버가 다시 읽지 않습니다. 필요 없으면 지워도 됩니다. 옛 형식(schemaVersion 1) 백업에는 그때 모은 토큰 수가 들어 있을 수 있습니다.

## 수집 연결(보내는 PC)

Claude Code 쪽에서는 dev-team-kit이 설치한 두 스크립트가 이 서버로 보냅니다. 둘 다 같은 환경 변수를 씁니다.

| 이름 | 설명 |
|---|---|
| `AGENT_OBSERVER_URL` | 예: `http://127.0.0.1:3000`. 없으면 보내지 않는다 |
| `AGENT_OBSERVER_TOKEN` | 서버의 `OBSERVER_TOKEN`과 같은 값 |
| `AGENT_OBSERVER_DISABLE` | `1`이면 보내지 않는다 |
| `AGENT_OBSERVER_DEBUG` | `1`이면 보낼 본문을 stderr에 쓴다 |

- **hook(`observe.mjs`)**: 세션·BOT 상태와 스킬 사용을 `POST /api/events`로 보냅니다. dev-team-kit 설치기가 `.claude/settings.json`의 `hooks`에 넣어 둡니다. 프롬프트·응답·도구 입력은 보내지 않습니다.
- **statusLine(`statusline.mjs`)**: 플랜 사용량(`rate_limits`의 5시간·주간 사용률과 초기화 시각)만 `POST /api/plan-usage/report`로 보냅니다. 설치기가 `.claude/settings.json`에 아래처럼 넣습니다. 이미 쓰던 statusLine이 있으면 설치기가 감싸서 원래 출력이 그대로 보입니다(자세한 내용은 dev-team-kit README).
  ```json
  "statusLine": { "type": "command", "command": "node \"${CLAUDE_PROJECT_DIR:-.}/.claude/team/observe/statusline.mjs\"" }
  ```
  - 값은 Claude 구독 계정(Pro·Max 로그인)에서만 있고, 세션의 첫 응답 이후에 생깁니다. API 키로 쓰는 세션은 값이 없습니다.
  - 값이 바뀌었을 때만, 같은 PC에서 최대 1분에 1회 보냅니다. 한가한 동안(직전과 같은 입력)은 멈춰 보내지 않습니다. 그래서 화면의 "마지막 측정 N분 전"이 오래돼도 정상입니다.

환경 변수는 Claude Code를 띄우는 셸에 두거나 `.claude/settings.local.json`의 `env`에 둡니다(토큰을 커밋하지 마세요).

### 프록시 환경(`NO_PROXY`)

보내는 PC에 `HTTPS_PROXY`·`HTTP_PROXY`가 설정돼 있으면 `curl`이 로컬 서버로 가는 요청도 프록시로 보내 실패합니다. 이때는 `NO_PROXY=127.0.0.1,localhost`(그리고 같은 값의 `no_proxy`)를 함께 설정하세요.

## 캐릭터 설정(선택)

설정이 없으면 임시 사무실의 BOT은 단색 사각형으로 보입니다. 자기 그림을 쓰려면 `config/characters.example/README.md`를 참고해 `characters/`(커밋되지 않음)에 `roles.json`과 `<id>/character.json` + 그림(png·webp)을 둡니다. 그림은 로그인한 사용자에게만 `/api/characters/<id>/image`로 보내집니다. 설정 오류는 화면에 문구 없이 사각형으로 보이고 원인은 서버 로그에 남습니다.

## 테스트

| 명령 | 내용 |
|---|---|
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest: 단위(`tests/unit`), API(`tests/api`, route handler 직접 호출), 스크립트(`tests/script`, 설치된 `statusline.mjs`를 실행. Linux·macOS 셸 필요) |
| `pnpm test:e2e` | Playwright(Chromium): 빌드 후 테스트용 서버를 3100·3101 포트에 임시 데이터 폴더로 띄워 화면 흐름, observe.mjs·statusline.mjs 통합, 플랜 사용량 화면 상태를 확인한다. 스크린샷은 `docs/team/reports/screens/qa/` |

E2E에는 Chromium이 필요합니다(`pnpm exec playwright install chromium`, Linux에서 시스템 라이브러리까지 필요하면 `--with-deps`). 기본 경로는 `/opt/pw-browsers/chromium`이 있으면 그것, 없으면 Playwright가 설치한 Chromium입니다. 다른 경로의 Chromium을 쓰려면 `PW_CHROMIUM_PATH`에 실행 파일 경로를 넣습니다. 테스트는 테스트 안에서 만든 토큰·비밀번호만 쓰고, 실제 수집 데이터를 쓰지 않습니다.

CI(`.github/workflows/ci.yml`)는 push·pull_request마다 Node 22에서 `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm build`를 돌리고, 이어서 E2E job에서 Chromium을 설치해 `pnpm test:e2e`를 돌립니다. 비밀값은 쓰지 않습니다.

## 운영 문서

- 로컬 운영(시작·정지, 데이터, 로그, 비밀값 교체, 문제 해결): [docs/operations.md](docs/operations.md)
- 2단계 Vercel 배포 준비 메모(아직 배포하지 않음): [docs/deploy-vercel.md](docs/deploy-vercel.md)
