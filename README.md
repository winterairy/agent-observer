# agent-observer

Claude Code 세션과 [dev-team-kit](https://github.com/winterairy/dev-team-kit) BOT의 활동·스킬 사용·승인 대기, 그리고 Claude 플랜 사용량(5시간·주간 한도 사용률)을 한 화면으로 보는 관찰 서버입니다.

상태: 1단계(로컬 수집 서버와 화면) 개발 중. 결정 사항과 범위는 [docs/HANDOFF.md](docs/HANDOFF.md)에 있습니다.

이 저장소에는 dev-team-kit이 설치되어 있습니다. Claude Code에서 `/team-init`으로 설정을 만든 뒤 `/task`로 진행합니다.

참고한 외부 코드와 글꼴은 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 보세요.

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

`pnpm dev`와 `pnpm start`를 같은 `.data` 폴더로 동시에 띄우지 마세요(서로 덮어씁니다).

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

E2E에는 Chromium이 필요합니다(`pnpm exec playwright install chromium`). 다른 경로의 Chromium을 쓰려면 `PW_CHROMIUM_PATH`에 실행 파일 경로를 넣습니다. 테스트는 테스트 안에서 만든 토큰·비밀번호만 쓰고, 실제 수집 데이터를 쓰지 않습니다.
