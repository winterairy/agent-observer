# 인수인계: agent-observer

상태: 결정된 내용과 1단계 범위. 아직 구현된 것은 없습니다.

이 문서는 `/task docs/HANDOFF.md 읽고 관찰 서버 1단계 진행`의 입력입니다. 이전 대화(BOT 세트 설계, Pixel Agent Desk 검토)에서 정한 내용을 정리했습니다.

## 목표

여러 프로젝트에서 도는 Claude Code 세션과 dev-team-kit BOT(책임자, planner, architect, designer, developer, qa, security, devops)의 활동을 한 화면에서 본다. 클라우드 세션도 포함하고, 휴대폰과 다른 PC에서도 본다.

- 픽셀 사무실 화면에서 BOT마다 지정한 캐릭터가 움직인다.
- BOT별 사용한 스킬, 승인 대기 상태를 본다.
- Claude 플랜 사용량(5시간·주간 한도 대비 %)을 본다. 원래 목적이던 사용량 측정은 BOT별 토큰 대신 플랜 사용량으로 한다(사용자 결정 2026-11-11).

## 결정 사항

| 항목 | 결정 | 이유 |
|---|---|---|
| 구조 | 각 세션이 hook으로 서버에 이벤트를 보낸다(push) | 클라우드 세션은 사용자 PC의 앱에 닿지 못하고, 서버가 컨테이너 파일을 읽을 수 없다 |
| 서버 | Next.js, Vercel 배포 | 사용자가 Next.js·Vercel에 익숙하다 |
| 데스크톱 | Electron 창이 배포된 웹 화면을 띄운다(`desktop/`). 항상 위 작은 창, 트레이, 승인 대기 알림 | PWA보다 Electron을 선택함 |
| 오프라인 | 지원하지 않는다 | 인터넷 없는 환경이 거의 없음 |
| 저장소 공개 | 개발 중 공개, 배포 전 비공개로 전환 | |
| 캐릭터 | 사용자가 그림 파일을 넣고 BOT마다 지정한다 | |
| 사무실 그림 | 캐릭터가 정해진 뒤 Claude가 새로 그린다 | 원본 그림은 라이선스상 쓸 수 없다 |
| 원본 코드 | Pixel Agent Desk의 일부 코드만 출처를 표시해 가져온다 | Electron·로컬 파일 기반 부분은 이 구조에서 쓸 수 없다 |

## 데이터 수집 (이미 구현됨, dev-team-kit)

[dev-team-kit](https://github.com/winterairy/dev-team-kit)의 `kit/team/observe/observe.mjs`가 모든 hook 이벤트에서 `POST {AGENT_OBSERVER_URL}/api/events`로 JSON을 보낸다. 인증은 `Authorization: Bearer <토큰>`(클라우드에서는 Network secret이 붙여 준다).

payload (v1):

```jsonc
{
  "v": 1,
  "event": "PreToolUse",            // SessionStart, SessionEnd, UserPromptSubmit, UserPromptExpansion,
                                     // PreToolUse, PostToolUse, Notification, Stop, SubagentStart, SubagentStop
  "ts": "2026-11-10T14:53:12.190Z",
  "session_id": "0c09…",             // Claude Code 세션
  "agent_id": "a2cc…" | null,        // 서브에이전트 안에서 난 이벤트면 그 에이전트 ID
  "agent_type": "qa" | null,         // 서브에이전트 이름. null이면 메인 세션(책임자)
  "project": "winterairy/epub-editor",
  "branch": "feature/ui-prototype",
  "remote": true,                    // 클라우드 세션 여부
  "remote_session_id": null,
  "tool": "Skill",                   // 도구 이벤트일 때
  "skill": "playwright-cli",         // Skill 도구일 때
  "subagent_type": "developer",      // Agent 도구로 BOT을 부를 때
  "notification_type": "permission_prompt", // Notification일 때
  "source": "startup", "model": "…", // SessionStart일 때
  "reason": "…",                     // SessionEnd일 때
  "usage": {                         // PostToolUse, Stop, SubagentStop, SessionEnd: 이 에이전트의 누적 합계
    "input": 6, "output": 398, "cache_creation": 12285, "cache_read": 100229,
    "model": "claude-haiku-5-5", "messages": 3
  },
  "subagent": {                      // 부모의 Agent 도구가 끝났을 때: 그 서브에이전트의 누적 합계
    "agent_id": "a2cc…", "agent_type": "qa", "status": "completed", "usage": { … }
  }
}
```

- **1단계에서 `usage`와 `subagent.usage`는 저장하지 않는다(사용자 결정 2026-11-11).** observe.mjs는 지금처럼 계속 보내므로 서버는 이 필드가 와도 요청을 거부하지 않고 버린다. `subagent`의 나머지 필드(`agent_id`, `agent_type`, `status`)는 BOT 호출 기록에 쓸 수 있다.
- (참고, 저장하지 않음) `usage`는 에이전트별 누적값이다.
- 프롬프트, 응답, 도구 입력 내용은 오지 않는다. 서버도 저장하지 않는다.
- Claude Code 2.1.322의 실제 hook 데이터로 확인했다.

### 플랜 사용량 (1단계에서 dev-team-kit에 추가, T1-8)

- hook 입력에는 플랜 사용량이 없다. **statusLine 명령의 stdin JSON**에 구독 사용자일 때만 `rate_limits`가 있다(책임자가 Claude Code 2.1.322에서 확인, 2026-11-11).

```jsonc
"rate_limits": {
  "five_hour": { "used_percentage": 42, "resets_at": 1762862400 },  // 0~100, Unix epoch 초
  "seven_day": { "used_percentage": 13, "resets_at": 1763251200 }
}
```

- 각 창(`five_hour`, `seven_day`)은 API가 보고했고 `resets_at`이 아직 지나지 않은 동안만 있다. 세션의 첫 API 응답 이후에 나온다. 둘 중 하나만 있을 수 있다.
- 계정 단위 값이다(세션·프로젝트·BOT별 값이 아니다).
- 클라우드 세션에서 statusLine이 실행되는지는 확인되지 않았다.

## 1단계 범위 (이번 과업)

로컬에서 돌아가는 서버와 화면. Vercel 배포와 DB 연결은 하지 않는다.

1. **수집 API** `POST /api/events`
   - Bearer 토큰 확인(환경 변수 `OBSERVER_TOKEN`), payload 검증(v1), 크기 제한
   - 저장소는 인터페이스로 분리한다. 1단계 구현은 로컬 파일(메모리 구현은 테스트용). 나중에 Postgres·Redis 구현으로 바꿀 수 있게 한다.
2. **상태 계산**: 이벤트에서 세션·에이전트 상태를 만든다.
   - 상태: 작업 중(도구 사용), 생각 중, 승인 대기(Notification permission_prompt), 완료, 종료
   - 일정 시간 이벤트가 없으면 끝난 것으로 본다(프로세스 확인 대신)
   - 스킬 사용 기록, BOT 호출 기록
3. **조회 API**와 **웹 화면**
   - 프로젝트 필터, 세션 목록, 세션 안의 BOT 목록과 상태, 사용한 스킬
   - 플랜 사용량(7번)
   - 픽셀 사무실 화면은 임시 그림(단색 사각형 등)으로 동작만 확인한다. 진짜 그림은 3단계.
   - 화면 갱신은 2~3초 폴링으로 충분하다.
4. **로그인**: 화면과 조회 API 보호. 1단계는 간단한 방식(예: 환경 변수 비밀번호 + 쿠키)이면 된다.
5. **캐릭터 설정**
   - `roles.json`: 역할 키(`lead`, `planner` …) → 표시 이름, 캐릭터 ID
   - 캐릭터마다 설정 파일: 그림 파일, 한 칸 크기, 줄별 방향·동작, 프레임 수. 없는 동작은 가까운 동작으로 대신한다(예: sit_work 없으면 idle).
   - 그림 파일은 `.gitignore`된 폴더에 둔다. 저장소에는 예시 설정만 커밋한다.
6. **테스트**: 수집 API 검증·인증, 상태 계산(이벤트 순서별), 스킬 기록, 플랜 사용량. dev-team-kit의 observe 스크립트로 실제 전송하는 통합 테스트 하나.
7. **플랜 사용량**: dev-team-kit에 statusLine 스크립트를 추가해 `rate_limits`를 서버로 보내고, 서버는 계정 단위 마지막 값을 저장해 화면에 5시간·주간 막대로 보여 준다(T1-8).

1단계에서 BOT별 토큰 사용량과 API 환산 비용은 다루지 않는다(사용자 결정 2026-11-11).

## 이후 단계 (이번 범위 아님)

- 2단계: Vercel 배포, DB 연결(Neon Postgres 또는 Upstash Redis), Electron 창(`desktop/`), 휴대폰 푸시 알림(웹 푸시. 승인 대기가 생기면 휴대폰으로 알림)
- 3단계: 캐릭터를 받은 뒤 사무실 그림 제작, 사무실 좌표·이동 영역을 데이터 파일로 정의

## 참고 코드

`vendor/pixel-agent-desk/`에 출처 표시와 함께 있다(README 참고). 바로 쓰지 말고 필요한 부분을 옮겨 고친다.
- `src/office/`: 브라우저용 사무실 렌더러, 캐릭터 이동, 길찾기, 좌석 배정. 좌표·충돌 정보를 원본 그림에서 읽으므로 데이터 파일 방식으로 바꿔야 한다.
- `src/roleConfig.js`: 역할 매핑. 플러그인 접두사(`plugin:planner`) 처리 포함.
- `src/pricing.js`: 모델별 단가. 1단계에서는 쓰지 않는다(토큰·비용 범위 제외).

## 주의

- 저장소가 공개인 동안 캐릭터 그림, 토큰, 실제 수집 데이터를 커밋하지 않는다.
- 원본 Pixel Agent Desk 그림을 쓰거나 본떠 그리지 않는다.
- 로그인한 사용자만 화면을 볼 수 있어야 한다.

## 1단계 Task

위 "1단계 범위" 7개 항목을 Task로 나눈 것이다. 기술 구현 방식(파일 구조, 라이브러리)은 설계 문서에서 정한다. `[사용자 확인]`은 이 클라우드 환경에서 검증할 수 없는 조건, `(결정 필요 D-n)`은 기본값을 제안했지만 확정되지 않은 값이다. 목록은 절 끝에 모았다.

### 1단계 범위가 아닌 것

- Vercel 배포, 실제 도메인·HTTPS 설정 (2단계)
- DB 연결(Neon Postgres, Upstash Redis). 1단계는 로컬 파일 저장만 한다 (2단계)
- Electron 창(`desktop/`), 트레이, 데스크톱 알림, 휴대폰 푸시 알림 (2단계)
- 진짜 사무실 그림, 사무실 좌표·이동 영역 데이터, 캐릭터 길찾기 (3단계). 1단계는 단색 사각형 등 임시 그림
- 여러 사용자 계정, 권한 구분, 회원가입
- 프롬프트·응답·도구 입력 내용 표시(수집하지 않는다)
- BOT별·역할별·프로젝트별 토큰 사용량, API 환산 비용, 모델 단가표 (사용자 결정 2026-11-11로 제외. 플랜 사용량으로 대신한다)
- 플랜 사용량 이력·그래프(마지막 값만 보여 준다)
- dev-team-kit `observe.mjs` 수정. payload v1을 그대로 받는다(`usage`가 계속 와도 저장하지 않는다).

dev-team-kit 변경은 1단계 범위에 **들어간다**: 별도 저장소 [winterairy/dev-team-kit](https://github.com/winterairy/dev-team-kit)에 statusLine 스크립트와 설치 방법을 추가한다(T1-8). 이 저장소(agent-observer)에는 설치한 사본을 둔다(observe.mjs가 `.claude/team/observe/`에 있는 것과 같은 방식).

### Task 목록

| ID | 이름 | 우선순위 | 의존 |
|---|---|---|---|
| T1-1 | 수집 API와 저장소 인터페이스 | Must | 없음 |
| T1-2 | 상태 계산(세션·에이전트 상태, 종료 판정) | Must | T1-1 |
| T1-3 | 스킬·BOT 호출 기록 | Must | T1-1 |
| T1-4 | 로그인 | Must | 없음 |
| T1-5 | 조회 API와 웹 화면(목록, 스킬, 임시 사무실) | Must | T1-2, T1-3, T1-4, T1-6 |
| T1-6 | 캐릭터 설정(roles.json, 캐릭터 설정 파일, 동작 대체) | Must | 없음 |
| T1-7 | 테스트(단위·통합) | Must | T1-1~T1-6, T1-8 (각 Task와 함께 작성 가능) |
| T1-8 | 플랜 사용량(dev-team-kit statusLine 수집, 서버 저장, 화면) | Must | T1-1, T1-4, T1-5 |

변경 이력: 2026-11-11 사용자 결정으로 T1-3에서 토큰 누적·API 환산 비용을, T1-5에서 토큰·비용 표시와 합계를 지웠고, T1-8을 추가했다.

### T1-1. 수집 API와 저장소 인터페이스

요구사항
- `POST /api/events`가 payload v1 JSON을 받는다.
- `Authorization: Bearer <OBSERVER_TOKEN>`이 맞을 때만 받는다. `OBSERVER_TOKEN`이 설정되지 않았으면 모든 요청을 거부한다(열린 상태로 시작하지 않는다).
- 검증: `v`가 1, `event`가 정의된 10종 중 하나, `ts`가 ISO 8601, `session_id`가 비어 있지 않은 문자열, `project`가 문자열. 나머지 필드는 선택이며 타입이 맞지 않으면 거부한다.
- 정의되지 않은 필드는 저장하지 않고 버린다. 특히 프롬프트·응답·도구 입력으로 보이는 필드(`prompt`, `tool_input`, `tool_response` 등)가 와도 저장하지 않는다.
- `usage`와 `subagent.usage`는 받되 저장하지 않는다. 이 필드 때문에 요청을 거부하지 않는다(형식 검사 여부는 결정 필요 D-21).
- 요청 본문 크기 제한: 기본 16KB (결정 필요 D-1). 문자열 필드 길이 제한: 기본 256자 (결정 필요 D-2).
- 저장소는 인터페이스로 분리하고 1단계 구현은 로컬 파일이고, 메모리 구현은 테스트용으로 둔다 (D-3). 저장 위치는 gitignore된 폴더.
- 이벤트 보관 한도: 세션당 최근 이벤트 기본 500개, 전체 기본 7일 (결정 필요 D-4). 스킬 횟수·BOT 호출 기록은 보관 한도와 별개로 유지한다.

수용 기준
- [ ] 올바른 토큰과 올바른 payload를 보내면 2xx가 오고 이벤트가 저장된다.
- [ ] Authorization 헤더가 없거나 토큰이 다르면 401이 오고 아무것도 저장되지 않는다.
- [ ] 서버의 `OBSERVER_TOKEN`이 비어 있거나 16자보다 짧으면 어떤 토큰으로 보내도 401이 오고, 응답에 "서버 수집 토큰이 설정되지 않았거나 16자보다 짧다"는 오류 메시지(`error: "server_token_invalid"`)가 있다. 토큰 값은 응답·로그에 나오지 않는다.
- [ ] 보낸 토큰이 틀린 경우는 `error: "unauthorized"`로만 답하고 이유를 구분하지 않는다.
- [ ] `ts`가 서버 시각보다 5분 넘게 미래이면 서버 시각으로 바뀌어 저장된다.
- [ ] `v`가 1이 아니거나, `event`가 목록에 없거나, `ts`·`session_id`가 없거나 형식이 틀리면 400이 오고 저장되지 않는다.
- [ ] JSON이 아닌 본문은 400이 온다.
- [ ] 본문이 크기 제한을 넘으면 413이 오고 저장되지 않는다.
- [ ] payload에 `prompt`, `tool_input` 같은 정의되지 않은 필드를 넣어 보내면 저장된 데이터·조회 결과 어디에도 그 값이 없다.
- [ ] `usage`와 `subagent.usage`가 들어 있는 payload(위 예시 그대로)를 보내면 2xx가 오고, 저장된 데이터·조회 결과 어디에도 토큰 수(`input`, `output`, `cache_creation`, `cache_read`, `messages`)가 없다.
- [ ] 같은 요청을 저장소 구현만 바꿔(메모리 ↔ 다른 구현 또는 테스트용 가짜 구현) 실행해도 API 동작이 같다. 저장소 구현 교체 시 수집·상태 계산 코드를 고치지 않아도 된다(설계 리뷰로 확인).
- [ ] 에러 응답에 토큰 값이나 내부 스택이 나오지 않는다.
- [ ] GET 등 다른 메서드는 405가 온다.

### T1-2. 상태 계산

요구사항
- 세션과 에이전트(메인 세션 = 책임자 `lead`, 서브에이전트 = `agent_id`별)마다 상태를 하나 가진다: 작업 중, 생각 중, 승인 대기, 완료, 종료.
- 이벤트는 `agent_id`가 null이면 메인 세션(책임자)에, 아니면 그 서브에이전트에 적용한다.
- 세션 상태는 그 세션 에이전트 상태 중 가장 활동적인 것으로 정한다. 우선순위: 승인 대기 > 작업 중 > 생각 중 > 완료 > 종료 (결정 필요 D-5).
- 마지막 이벤트 후 일정 시간 이벤트가 없으면 종료로 본다. 기본값: 완료 상태에서 30분, 작업 중·생각 중에서 10분 (D-6). 종료 판정은 조회 시점 기준으로 계산해도 된다.
- **승인 대기는 시간이 지나도 종료로 보지 않는다.** Claude Code는 권한 프롬프트에서 사용자 답을 무기한 기다리므로 이벤트가 없는 것이 정상이다. 승인 대기는 다음 이벤트(승인·거절 후 PostToolUse 등) 또는 SessionEnd로만 풀린다.
  - 승인 대기를 시작한 시각을 남겨 화면에 기다린 시간(예: "승인 대기 · 2시간째")을 보여 준다. permission_prompt 외 Notification(R6)은 이 시각을 바꾸지 않는다.
  - 24시간 넘게 승인 대기이면 "승인 대기 (응답 없음)"으로 표시만 바꾼다(SessionEnd 없이 터미널이 꺼지거나 클라우드 컨테이너가 회수된 경우 대비). 상태와 데이터는 그대로이고 자동으로 지우지 않는다.
  - 사용자는 화면에서 세션을 "정리"해 목록에서 숨길 수 있다. 숨긴 세션에 새 이벤트가 오면 다시 보인다.
  - 숨긴 세션은 "숨긴 세션 보기"에서 볼 수 있고 "다시 표시"로 원래 목록에 되돌린다(이미 끝나 새 이벤트가 오지 않는 세션도 다시 볼 수 있어야 한다).
- 종료된 세션에 새 이벤트가 오면 다시 살아난다(표의 규칙대로 상태가 바뀐다).
- 이벤트 순서: 도착 순서가 아니라 `ts` 순서로 계산한다. `ts`가 같으면 도착 순서 (결정 필요 D-7).
- 상태와 함께 마지막 이벤트 시각, 현재 사용 중인 도구 이름(작업 중일 때)을 남긴다.

상태 전이 규칙(에이전트 단위). "이전 상태"가 "모두"이면 이전 상태와 관계없다.

| # | 이벤트 | 조건 | 이전 상태 | 다음 상태 |
|---|---|---|---|---|
| R1 | SessionStart | 메인 | 없음/모두 | 완료(입력 대기) (결정 필요 D-8) |
| R2 | UserPromptSubmit, UserPromptExpansion | 메인 | 모두 | 생각 중 |
| R3 | PreToolUse | | 모두 | 작업 중 (도구 이름 기록) |
| R4 | PostToolUse | | 작업 중/승인 대기 | 생각 중 |
| R5 | Notification | `notification_type` = `permission_prompt` | 모두 | 승인 대기 |
| R6 | Notification | 그 외 타입(예: `idle_prompt`) | 모두 | 변화 없음 (결정 필요 D-9) |
| R7 | Stop | 메인 | 모두 | 완료 |
| R8 | SubagentStart | `agent_id` 있음 | 없음 | 해당 서브에이전트 생성, 생각 중 |
| R9 | SubagentStop | `agent_id` 있음 | 모두 | 해당 서브에이전트 완료 |
| R10 | SessionEnd | | 모두 | 세션과 모든 에이전트 종료 |
| R11 | (시간 경과) | D-6 시간 초과 | 작업 중·생각 중·완료 | 종료 |
| R11a | (시간 경과) | 승인 대기 시작 후 24시간 초과 | 승인 대기 | 승인 대기 유지, "응답 없음" 표시 |
| R12 | 처음 보는 `agent_id`의 아무 이벤트 | SubagentStart 없이 | 없음 | 서브에이전트를 만들고 그 이벤트 규칙 적용 |
| R13 | 처음 보는 `session_id`의 아무 이벤트 | SessionStart 없이 | 없음 | 세션을 만들고 그 이벤트 규칙 적용 |

QA용 이벤트 순서별 기대 상태. 세션 S1, 서브에이전트 A1(`agent_type`=qa). 시간은 첫 이벤트 기준 경과.

| 시나리오 | 이벤트 순서 | 기대 결과 |
|---|---|---|
| S-01 기본 흐름 | SessionStart → UserPromptSubmit → PreToolUse(Read) → PostToolUse → Stop | 각 단계 후 lead: 완료 → 생각 중 → 작업 중(Read) → 생각 중 → 완료 |
| S-02 승인 대기 | UserPromptSubmit → PreToolUse(Bash) → Notification(permission_prompt) → PostToolUse | lead: 생각 중 → 작업 중 → 승인 대기 → 생각 중 |
| S-03 승인 대기 중 세션 상태 | S-02의 승인 대기 시점, A1은 작업 중 | 세션 상태 = 승인 대기 |
| S-04 다른 알림 | Stop → Notification(idle_prompt) | lead 완료 유지 |
| S-05 서브에이전트 | UserPromptSubmit → PreToolUse(Agent, subagent_type=qa) → SubagentStart(A1) → PreToolUse(A1, Bash) → PostToolUse(A1) → SubagentStop(A1) → PostToolUse(lead, subagent 필드) → Stop | lead: 생각 중 → 작업 중 … → 생각 중 → 완료. A1: 생각 중 → 작업 중 → 생각 중 → 완료. 마지막에 A1은 목록에 남고 상태 완료 |
| S-06 SubagentStart 없이 이벤트 | PreToolUse(A1) 먼저 도착 | A1이 생성되고 작업 중 |
| S-07 SessionStart 없이 이벤트 | 새 session_id로 PreToolUse | 세션 생성, lead 작업 중 |
| S-08 SessionEnd | 작업 중인 lead와 A1 → SessionEnd | 세션·lead·A1 모두 종료 |
| S-09 시간 초과(작업 중) | PreToolUse 후 이벤트 없음 | 9분 59초: 작업 중, 10분 1초: 종료 |
| S-10 시간 초과(완료) | Stop 후 이벤트 없음 | 29분: 완료, 31분: 종료 |
| S-11 승인 대기 장기 | Notification(permission_prompt) 후 이벤트 없음 | 61분: 승인 대기, 23시간 59분: 승인 대기, 24시간 1분: 승인 대기(응답 없음). 어느 시점에도 종료가 아니다 |
| S-11b 승인 대기 중 다른 알림 | Notification(permission_prompt) → 30분 뒤 Notification(idle_prompt) | 승인 대기 유지, 기다린 시간은 첫 알림 기준 |
| S-11c 응답 없음 후 재개 | S-11의 24시간 1분 시점 → PostToolUse | 생각 중, "응답 없음" 표시 사라짐 |
| S-12 종료 후 재개 | S-09로 종료 → UserPromptSubmit | lead 생각 중, 세션 다시 활성 |
| S-13 순서 뒤바뀜 | ts 10:00:02 Stop이 먼저 도착, ts 10:00:01 PreToolUse가 나중에 도착 | lead 완료 (ts 순서 적용) |
| S-14 프로젝트 구분 | 같은 이벤트를 project P1, P2로 각각 보냄 | 두 세션이 각 프로젝트에 따로 보인다 |

수용 기준
- [ ] 위 시나리오 S-01~S-14(S-11b, S-11c 포함)가 단위 테스트로 있고 모두 통과한다.
- [ ] 위 전이표 R1~R13(R11a 포함) 각각을 최소 1개 테스트가 다룬다.
- [ ] 시간 초과 판정은 테스트에서 시각을 바꿔 검증할 수 있다(실제로 기다리지 않는다).
- [ ] 같은 이벤트를 두 번 받아도 상태가 달라지지 않는다(예: PreToolUse 두 번 → 작업 중).

### T1-3. 스킬·BOT 호출 기록

(2026-11-11 범위 변경: 토큰 누적, API 환산 비용, 단가표 요구와 수용 기준을 지웠다. 사용량은 T1-8 플랜 사용량으로 본다.)

요구사항
- 스킬 기록: PreToolUse에서 `tool`=`Skill`이면 세션, 에이전트, 역할(`agent_type`, null이면 `lead`), `skill`, 시각을 기록한다. 같은 스킬을 여러 번 쓰면 횟수가 늘어난다.
- BOT 호출 기록(Should): PreToolUse에서 `tool`이 `Agent`(또는 `Task`)이면 세션, 부른 에이전트, 부른 BOT 종류(`subagent_type`), 시각을 기록한다.
- 서브에이전트가 끝나거나 세션이 종료돼도 기록을 지우지 않는다. 이벤트 보관 한도(D-4)와 별개로 유지한다.
- 집계: 세션별, 역할별, 프로젝트별 스킬 횟수.

수용 기준
- [ ] Skill 도구 PreToolUse 3번(같은 스킬 2번, 다른 스킬 1번) 후 스킬 기록이 스킬별 횟수 2, 1로 조회된다.
- [ ] qa 에이전트가 쓴 스킬은 qa 역할로, `agent_id`가 null인 이벤트의 스킬은 lead로 집계된다.
- [ ] 프로젝트 P1·P2 세션의 스킬 기록이 프로젝트별 집계에 섞이지 않는다.
- [ ] SubagentStop·SessionEnd 후에도 스킬 기록이 남아 있다.
- [ ] (Should) PreToolUse(Agent, `subagent_type`=qa)를 보내면 그 세션의 BOT 호출 기록에 qa 1회가 보인다.

### T1-4. 로그인

요구사항
- 환경 변수 비밀번호(기본 이름 `OBSERVER_PASSWORD`) 하나로 로그인한다. 사용자 이름은 없다 (결정 필요 D-13).
- 로그인한 사용자만 모든 기능을 쓸 수 있다. 공개되는 것은 로그인 화면과 로그인 API, 수집 API(Bearer 토큰)뿐이다. 웹 화면, 조회 API, 정리, 캐릭터 설정 조회와 캐릭터 그림은 모두 쿠키가 있어야 한다. 수집 API는 쿠키가 아니라 Bearer 토큰만 쓴다.
- 쿠키는 HttpOnly, SameSite=Lax, 서버가 위조를 알아챌 수 있는 값(서명 등). 유효 기간 기본 30일 (결정 필요 D-14). 로컬 http에서도 동작해야 하므로 Secure는 https일 때만 (가정).
- 로그아웃하면 쿠키가 지워진다.
- 비밀번호가 설정되지 않았으면 로그인할 수 없다(열린 상태로 시작하지 않는다).
- 연속 실패 제한: 기본 1분에 5회 (결정 필요 D-15).

수용 기준
- [ ] 로그인하지 않고 웹 화면에 접속하면 로그인 화면으로 이동한다.
- [ ] 로그인하지 않고 조회 API를 부르면 401이 오고 데이터가 없다.
- [ ] 로그인하지 않고 `/api/characters`, 캐릭터 그림 주소, 정리·다시 표시 API를 부르면 401이 온다. 캐릭터 그림은 `public/` 같은 정적 경로로도 받을 수 없다.
- [ ] 틀린 비밀번호는 실패 메시지가 나오고 쿠키가 생기지 않는다.
- [ ] 맞는 비밀번호로 로그인하면 화면과 조회 API가 열린다.
- [ ] 쿠키 값을 임의로 바꾸면 로그인 안 된 상태로 처리된다.
- [ ] 로그아웃 후 조회 API가 다시 401이다.
- [ ] `OBSERVER_PASSWORD`가 비어 있으면 어떤 비밀번호로도 로그인되지 않는다.
- [ ] Bearer 토큰으로 조회 API를 불러도 열리지 않는다(쿠키와 토큰의 역할이 섞이지 않는다) (결정 필요 D-16).
- [ ] 1분 안에 6번째 실패 시도는 거부된다(429).
- [ ] IP와 관계없이 전체 실패가 1분에 20회를 넘으면 거부된다.
- [ ] 로그인·정리·다시 표시 등 쿠키로 상태를 바꾸는 POST 요청은 `Origin`이 다른 호스트면 거부된다(403).
- [ ] 휴대폰 브라우저에서 로그인이 유지된다 `[사용자 확인]`

### T1-5. 조회 API와 웹 화면

요구사항
- 조회 API로 다음을 얻는다: 프로젝트 목록, 세션 목록(프로젝트 필터, 상태, 브랜치, 클라우드 여부, 마지막 이벤트 시각), 세션 안 에이전트 목록(역할, 표시 이름, 캐릭터, 상태, 현재 도구), 스킬 사용 기록, 플랜 사용량(T1-8).
- 화면
  - 프로젝트 필터(전체 + 프로젝트별). 선택은 새로고침 후에도 유지된다(Should).
  - 세션 목록: 활성 세션이 위, 종료 세션은 아래 또는 접기. 종료 세션 표시 기간 기본 24시간 (결정 필요 D-17).
  - 세션 상세: BOT 목록과 상태, 사용한 스킬.
  - 플랜 사용량 영역(T1-8). 프로젝트 필터와 관계없이 보인다(계정 단위 값).
  - 토큰 수와 비용은 어디에도 표시하지 않는다.
  - 승인 대기 중인 BOT이 있으면 눈에 띄게 표시한다(색·문구. 색만으로 구분하지 않는다).
  - 임시 픽셀 사무실: BOT마다 단색 사각형(또는 임시 캐릭터)과 이름이 보이고, 상태에 따라 위치나 동작이 바뀐다(예: 작업 중 = 책상, 승인 대기 = 표시 아이콘, 종료 = 사라짐). 캐릭터 설정(T1-6)이 있으면 그 그림의 프레임을 쓴다.
  - 2~3초 간격 폴링으로 갱신한다. 기본 3초 (결정 필요 D-18). 탭이 보이지 않을 때는 폴링을 멈춘다(Should).
- 화면에 프롬프트·응답·도구 입력 내용은 나오지 않는다(수집하지 않으므로).

수용 기준
- [ ] 이벤트를 보낸 뒤 3초(폴링 간격) + 1초 안에 화면에 상태 변화가 보인다.
- [ ] 프로젝트 필터에서 P1을 고르면 P2 세션이 목록에서 사라진다.
- [ ] S-05 시나리오를 보낸 뒤 세션 상세에 lead와 qa가 보이고 qa는 완료 상태로 목록에 남아 있다.
- [ ] 승인 대기 BOT은 문구(예: "승인 대기")와 기다린 시간으로 표시되고, 승인 대기 세션이 목록 맨 위에 온다.
- [ ] 24시간 넘은 승인 대기는 "승인 대기 (응답 없음)"으로 표시된다.
- [ ] 세션을 "정리"하면 목록에서 사라지고, 그 세션에 새 이벤트가 오면 다시 보인다.
- [ ] 숨긴 세션은 "숨긴 세션 N개 보기"에서 목록으로 보인다(종료된 세션 포함).
- [ ] "다시 표시"를 누르면 그 세션이 원래 목록으로 돌아가고 숨긴 세션 목록에서 빠진다.
- [ ] 세션 상세의 스킬별 횟수가 조회 API 값과 같다.
- [ ] `usage`가 든 이벤트를 보낸 뒤에도 화면과 조회 API 어디에도 토큰 수나 비용(금액)이 나오지 않는다.
- [ ] 임시 사무실에서 BOT 수만큼 캐릭터(사각형)가 보이고, 상태 변화에 따라 표시가 바뀐다.
- [ ] 너비 390px와 1280px에서 가로 스크롤 없이 목록과 상세를 볼 수 있다(Playwright 스크린샷).
- [ ] 세션이 하나도 없으면 빈 상태 안내가 나온다.
- [ ] 조회 API 응답에 인증 토큰·비밀번호·쿠키 비밀값이 없다.
- [ ] 키보드만으로 필터와 세션 선택을 할 수 있다.
- [ ] 실제 휴대폰에서 화면이 보인다 `[사용자 확인]`

### T1-6. 캐릭터 설정

요구사항
- `roles.json`: 역할 키(`lead`, `planner`, `architect`, `designer`, `developer`, `qa`, `security`, `devops`) → 표시 이름, 캐릭터 ID. 저장소에는 예시(`roles.example.json` 등)만 커밋한다.
- 역할 매핑: `agent_type`이 null이면 `lead`. 플러그인 접두사(예: `plugin:planner`)는 접두사를 떼고 찾는다(`vendor/pixel-agent-desk/src/roleConfig.js` 참고). 매핑에 없는 역할은 기본 캐릭터와 `agent_type` 원문 이름으로 보인다.
- 캐릭터 설정 파일(캐릭터마다): 그림 파일, 한 칸 크기(가로·세로), 줄별 방향·동작, 동작별 프레임 수(그리고 재생 속도, Should).
- 없는 동작은 정해진 대체 순서로 바꾼다. 대체 순서(D-19): 같은 동작의 요청 방향 → 같은 동작의 down 방향 → 동작 체인(`sit_work → sit → idle`, `walk → idle`, 그 외 → `idle`)의 각 동작에 같은 방향 규칙. 끝까지 없으면 임시 사각형.
- 그림 파일과 실제 설정은 gitignore된 `characters/` 폴더에 두고, 로그인한 사용자에게만 인증된 API로 보낸다. `public/`에는 두지 않는다(Next가 인증 없이 공개함). 예시 설정만 커밋한다.
- 설정 파일이 없거나 잘못되면 화면이 깨지지 않고 임시 사각형으로 보이며, 원인이 서버 로그에 남는다.
- 설정 변경 반영: 서버 재시작 없이 새로고침으로 반영 (결정 필요 D-20, 기본: 재시작 필요해도 허용).

수용 기준
- [ ] 예시 roles 파일과 예시 캐릭터 설정이 저장소에 있고, 실제 그림 파일은 커밋되지 않는다(`git status`·`.gitignore` 확인).
- [ ] `agent_type` null → lead, `plugin:planner` → planner, `unknown-bot` → 기본 캐릭터로 매핑된다(단위 테스트).
- [ ] sit_work가 없는 캐릭터 설정에서 sit_work를 요청하면 idle 줄·프레임이 돌아온다(단위 테스트).
- [ ] 그림 파일 경로가 없거나 JSON이 깨진 설정이면 해당 BOT이 임시 사각형으로 보이고 화면 다른 부분은 정상이다.
- [ ] 설정의 한 칸 크기·프레임 수대로 프레임을 잘라 보여 준다(임시 테스트 그림으로 확인. 테스트 그림도 원본 Pixel Agent Desk 그림이 아니다).
- [ ] 사용자가 자기 그림을 넣고 BOT에 지정해 화면에 보인다 `[사용자 확인]`

### T1-7. 테스트

요구사항
- 단위·API 테스트: T1-1 수용 기준(인증, 검증, 크기 제한, 미저장 필드), T1-2 시나리오 S-01~S-14, T1-3 스킬·BOT 호출 기록, T1-4 로그인, T1-6 매핑과 동작 대체, T1-8 플랜 사용량(수신·저장·만료·오래됨 판정, statusLine 스크립트의 전송 조건).
- 통합 테스트 1개: 로컬 서버를 띄우고 이 저장소에 설치된 `.claude/team/observe/observe.mjs`(dev-team-kit의 `kit/team/observe/observe.mjs`를 설치한 것)에 hook 입력을 넣어 실제로 전송한 뒤, 조회 API에서 세션·상태가 보이는지 확인한다.
- 플랜 사용량 통합 테스트 1개: 이 저장소에 설치한 statusLine 스크립트 사본에 `rate_limits`가 든 stdin JSON을 넣어 실제로 전송한 뒤, 조회 API에서 플랜 사용량이 보이는지 확인한다(T1-8).
- 화면 확인: Playwright로 로그인 → 목록 → 상세 흐름 1개, 390·1280 스크린샷.
- 테스트는 실제 토큰·비밀번호·수집 데이터를 커밋하지 않는다(테스트용 값은 테스트 안에서 만든다).

수용 기준
- [ ] 테스트 명령 하나로 단위·API 테스트가 모두 돌고 통과한다.
- [ ] 통합 테스트에서 observe.mjs로 SessionStart → PreToolUse → PostToolUse(usage 포함) → Stop을 보내면 조회 API에 해당 세션이 완료 상태로 나오고, 조회 결과에 usage의 토큰 수가 없다.
- [ ] 통합 테스트에서 statusLine 스크립트로 `five_hour` 42%, `seven_day` 13%를 보내면 조회 API의 플랜 사용량이 같은 값과 `resets_at`으로 나온다.
- [ ] 통합 테스트에서 틀린 토큰으로 보내면 세션이 생기지 않는다.
- [ ] Playwright 흐름 테스트가 통과하고 스크린샷 2장이 `docs/team/reports/screens/qa/`에 남는다.
- [ ] 저장소에 `.env` 파일이나 실제 토큰 값이 없다.
- [ ] 실제 로컬 Claude Code 세션에서 hook으로 보낸 이벤트가 화면에 보인다 `[사용자 확인]` (클라우드 세션 확인은 2단계 배포 후)

### T1-8. 플랜 사용량

배경: 원래 목적은 사용량 측정이었다. BOT별 토큰·API 환산 비용 대신 Claude 플랜의 5시간·주간 한도 사용률을 본다(사용자 결정 2026-11-11). 값은 hook이 아니라 statusLine 명령의 stdin `rate_limits`에서만 얻을 수 있다(위 "플랜 사용량" 절).

작업 위치: (가) 수집 스크립트는 별도 저장소 winterairy/dev-team-kit에 추가하고, 이 저장소에는 설치한 사본을 둔다. (나) 서버 저장과 (다) 화면은 이 저장소.

요구사항

(가) 수집: dev-team-kit statusLine 스크립트
- dev-team-kit에 statusLine용 스크립트와 설치 방법(설정 예시, 설치 스크립트가 있으면 그 안에서)을 추가한다. 기존 `observe.mjs`와 같은 환경 변수(`AGENT_OBSERVER_URL`, `AGENT_OBSERVER_TOKEN`, `AGENT_OBSERVER_DISABLE`, `AGENT_OBSERVER_DEBUG`)를 쓴다. `AGENT_OBSERVER_URL`이 없거나 `AGENT_OBSERVER_DISABLE=1`이면 전송하지 않는다(화면 출력은 한다).
- stdin JSON의 `rate_limits`에서 `five_hour`, `seven_day` 각각의 `used_percentage`, `resets_at`만 읽어 보낸다. 함께 보내는 것은 보낸 시각과 클라우드 여부(`CLAUDE_CODE_REMOTE`)뿐이다. stdin의 다른 값(작업 폴더, transcript 경로, 모델, 세션 비용 등)은 보내지 않는다.
- `rate_limits`가 없거나 두 창이 모두 없으면 보내지 않는다. 한 창만 있으면 그 창만 보낸다. 없는 창을 0%로 보내지 않는다.
- 전송 조건: 마지막으로 보낸 값과 다를 때만(어느 창이든 `used_percentage` 또는 `resets_at`이 바뀜), 그리고 같은 PC에서 **최대 1분에 1회**. 같은 PC의 여러 세션이 이 간격을 함께 쓴다. 1분 안에 생긴 변경은 그 뒤 첫 실행 때 보낸다(D-22). 변경이 없을 때의 재전송은 결정 필요 D-23.
- 화면 출력을 막지 않는다: 전송을 기다리지 않고 출력한 뒤 끝난다. 전송 실패·서버 무응답·잘못된 stdin에도 오류 없이 끝나고(exit 0) Claude Code 작업을 막지 않는다.
- 기존 사용자 statusLine을 깨뜨리지 않는다(방안은 D-25). 기존 설정이 있는 사용자가 설치해도 기존 statusLine 출력이 그대로 보인다. 설치 과정이 기존 설정을 말없이 덮어쓰지 않는다.
- 기존 설정이 없을 때 스크립트가 보여 줄 기본 한 줄(D-26).

(나) 서버 저장
- 수집 API와 같은 Bearer 토큰(`OBSERVER_TOKEN`) 인증, 같은 크기 제한·잘못된 요청 처리(401·400·413)를 따른다. 수신 경로(기존 `/api/events`에 새 종류로 받을지, 별도 경로일지)는 설계에서 정한다.
- 검증: `used_percentage`는 0~100 숫자, `resets_at`은 0보다 큰 정수(Unix epoch 초). 창이 하나도 없으면 400.
- 계정 단위로 창별 **마지막 값 하나**만 저장한다: `used_percentage`, `resets_at`, 서버 수신 시각. 이력은 남기지 않는다. 서버를 재시작해도 유지된다(1단계 파일 저장소).
- 한 창만 온 요청은 그 창만 갱신하고 다른 창의 저장값은 그대로 둔다.
- 여러 PC·여러 세션에서 값이 올 때의 병합 규칙은 D-27, 여러 계정은 D-28.
- 조회 API로 창별 값, `resets_at`, 마지막 수신 시각과 서버가 계산한 표시 상태(정상 / 오래됨 / 만료 / 없음)를 얻는다. 로그인 쿠키가 있어야 한다(T1-4).

(다) 화면
- 대시보드에 "플랜 사용량" 영역을 둔다. 프로젝트 필터와 관계없이 같은 값을 보여 준다.
- 5시간 창과 주간 창을 막대 두 개로 보여 준다. 각각 사용률 숫자(예: "42%")와 초기화 시각(브라우저 시간대의 날짜·시각 + 남은 시간, 예: "18:00 초기화 · 2시간 13분 후")을 쓴다.
- 경고: 사용률이 D-30 기준 이상이면 문구와 색으로 표시한다(색만으로 구분하지 않는다).
- 오래된 값: 마지막 수신 후 D-24 시간이 지나면 값은 그대로 두고 "N분 전 값"처럼 마지막 수신 시각을 함께 표시한다.
- 만료: 현재 시각이 그 창의 `resets_at`을 지나면 사용률 대신 "초기화됨 · 새 값 대기"로 표시하고 막대를 비운다. 새 값이 오면 다시 정상 표시.
- 없음: 받은 값이 한 번도 없으면 "플랜 사용량 정보 없음"과 안내(구독 계정에서 statusLine을 설정해야 하고, 세션의 첫 응답 이후에 값이 생긴다)를 보여 준다. 한 창만 있으면 다른 창은 "정보 없음".
- 화면 갱신은 기존 폴링(D-18)을 따른다. 만료·오래됨 판정은 폴링 시점의 현재 시각 기준이다.
- 토큰 수·비용은 보여 주지 않는다.

수용 기준

수집 스크립트(stdin 입력을 넣어 이 환경에서 검증)
- [ ] `rate_limits`가 든 stdin으로 처음 실행하면 1회 전송된다. 같은 값으로 1분 안에 다시 실행하면 전송되지 않는다.
- [ ] 값이 바뀐 stdin으로 1분 안에 다시 실행하면 전송되지 않고, 1분이 지난 뒤 실행하면 바뀐 값이 1회 전송된다(테스트에서 시각을 바꿔 검증).
- [ ] 1분이 지나도 값이 같으면 전송되지 않는다(D-23 재전송 주기 이전).
- [ ] (D-23 기본값 채택 시) 마지막 전송 후 10분이 지나 같은 값으로 실행하면 1회 재전송된다.
- [ ] `rate_limits`가 없는 stdin, JSON이 아닌 stdin이면 전송되지 않고 exit 0으로 끝난다.
- [ ] `seven_day`만 있는 stdin이면 `seven_day`만 보내고 `five_hour`는 보내지 않는다.
- [ ] 보낸 본문(`AGENT_OBSERVER_DEBUG=1` 출력)에 stdin의 작업 폴더, transcript 경로, 모델, 비용 값이 없다.
- [ ] 응답하지 않는 서버 주소로 설정해도 스크립트가 1초 안에 출력하고 exit 0으로 끝난다(감싼 기존 명령의 실행 시간은 제외).
- [ ] `AGENT_OBSERVER_URL`이 없거나 `AGENT_OBSERVER_DISABLE=1`이면 전송하지 않고 출력은 한다.
- [ ] 기존 statusLine 명령이 설정된 상태에서 설치하면, 설치 후 출력에 기존 명령의 출력이 그대로(같은 문자열) 들어 있다(D-25 방식으로).
- [ ] 기존 statusLine 명령이 실패하거나 D-25의 제한 시간을 넘겨도 스크립트는 exit 0으로 끝나고 전송 조건은 그대로 동작한다.
- [ ] dev-team-kit 저장소에 스크립트, 설치 방법, 기존 statusLine과 함께 쓰는 방법이 문서로 있다.

서버
- [ ] 올바른 토큰으로 `five_hour` 42% / `seven_day` 13%를 보내면 2xx가 오고 조회 API가 같은 `used_percentage`·`resets_at`과 수신 시각을 돌려준다.
- [ ] 토큰이 없거나 틀리면 401이고 저장값이 바뀌지 않는다.
- [ ] `used_percentage`가 -1, 101, 문자열이거나 `resets_at`이 정수가 아니거나 창이 하나도 없으면 400이고 저장값이 바뀌지 않는다.
- [ ] `five_hour`만 보내면 `seven_day` 저장값은 그대로다.
- [ ] 서버를 재시작해도 마지막 값이 조회된다(파일 저장소).
- [ ] D-27 규칙: 같은 `resets_at`으로 50% 다음 40%가 오면 50%가 남는다. 더 늦은 `resets_at`으로 5%가 오면 5%로 바뀐다.
- [ ] 로그인 쿠키 없이 플랜 사용량 조회 API를 부르면 401이다.

화면(Playwright, 시각은 테스트에서 조절)
- [ ] 값을 보낸 뒤 폴링 간격 + 1초 안에 5시간·주간 막대에 "42%", "13%"와 각 초기화 시각·남은 시간이 보인다.
- [ ] 마지막 수신 후 D-24 시간이 지나면 "N분 전 값" 표시가 나오고 사용률은 그대로 보인다.
- [ ] 현재 시각이 `resets_at`을 지나면 그 창은 "초기화됨 · 새 값 대기"로 바뀌고 사용률 숫자가 사라진다. 새 값을 보내면 다시 사용률이 보인다.
- [ ] 값이 한 번도 오지 않았으면 "플랜 사용량 정보 없음"과 설정 안내가 보인다.
- [ ] D-30 기준 이상이면 경고 문구가 보인다(색만이 아니라 글자로).
- [ ] 프로젝트 필터를 바꿔도 플랜 사용량 값이 같다.
- [ ] 너비 390px와 1280px에서 가로 스크롤 없이 플랜 사용량 영역이 보인다.
- [ ] 막대마다 사용률이 글자로도 있다(스크린 리더가 읽을 수 있다).

사용자 확인
- [ ] 구독 계정의 실제 로컬 Claude Code 세션에서 statusLine으로 보낸 값이 화면에 보이고, Claude Code 자체 `/usage` 등의 값과 같다 `[사용자 확인]`
- [ ] 기존에 쓰던 statusLine이 있는 PC에 설치해도 원래 상태 줄이 그대로 보인다 `[사용자 확인]`
- [ ] 클라우드 세션에서 statusLine이 실행돼 값이 오는지 `[사용자 확인]` (2단계 배포 후. D-29)

### 가정

- 사용자는 한 명이다. 여러 사람이 각자 데이터를 보는 기능은 없다.
- 플랜 사용량은 Claude 계정 하나 기준이다(D-28).
- `rate_limits`의 형식은 Claude Code 2.1.322 기준이다. 형식이 바뀌면 수집 스크립트가 보내지 않고(잘못된 입력으로 처리) 화면은 "오래됨"·"없음"으로 보인다.
- 1단계 서버는 로컬(127.0.0.1)에서 돈다. 클라우드 세션이 로컬 서버로 보내는 경로(터널 등)는 1단계 필수 범위가 아니다.
- 서버를 재시작해도 데이터는 로컬 파일에 유지된다. 테스트용 메모리 저장소는 재시작하면 사라진다.
- payload v1 필드는 위 "데이터 수집" 절이 기준이다. 새 필드가 생기면 버린다.

### 결정 필요

| ID | 항목 | 제안 기본값 |
|---|---|---|
| D-1 | 요청 본문 크기 제한 | 16KB |
| D-2 | 문자열 필드 최대 길이 | 256자 (넘으면 400) |
| D-3 | 1단계 저장소 구현 | 메모리 + 선택적 로컬 파일(재시작 후 유지) 중 하나. 제안: 로컬 파일 |
| D-4 | 이벤트 보관 한도 | 세션당 최근 500개, 7일. 스킬 횟수·BOT 호출 기록은 유지 |
| D-5 | 세션 상태 우선순위 | 승인 대기 > 작업 중 > 생각 중 > 완료 > 종료 |
| D-6 | 이벤트 없을 때 종료 판정 시간 | 작업 중·생각 중 10분, 완료 30분. 승인 대기는 종료하지 않고 24시간 뒤 "응답 없음" 표시 (사용자 결정 2026-11-11) |
| D-7 | 이벤트 순서 기준 | `ts` 순, 같으면 도착 순 |
| D-8 | SessionStart 직후 상태 | 완료(입력 대기). 별도 "대기" 상태를 두지 않는다 |
| D-9 | permission_prompt 외 Notification 처리 | 상태 변화 없음(마지막 이벤트 시각만 갱신) |
| D-10 | (삭제) API 환산 비용 단가 갱신 대상 모델 | 2026-11-11 범위 변경으로 삭제. 번호는 다시 쓰지 않는다 |
| D-11 | (삭제) 단가 없는 모델의 환산 비용 | 2026-11-11 범위 변경으로 삭제 |
| D-12 | (삭제) 한 에이전트에서 모델이 바뀐 경우 | 2026-11-11 범위 변경으로 삭제 |
| D-13 | 로그인 방식 | 환경 변수 비밀번호 하나(`OBSERVER_PASSWORD`), 사용자 이름 없음 |
| D-14 | 로그인 쿠키 유효 기간 | 30일 |
| D-15 | 로그인 실패 제한 | 1분에 5회 |
| D-16 | 조회 API에 Bearer 토큰 허용 여부 | 허용하지 않음(쿠키만). 2단계 Electron에서 다시 검토 |
| D-17 | 종료 세션 화면 표시 기간 | 24시간 |
| D-18 | 화면 폴링 간격 | 3초 |
| D-19 | 동작 대체 순서 | 요청 방향 → down 방향 → 동작 체인(sit_work → sit → idle, walk → idle, 그 외 → idle) |
| D-20 | 캐릭터 설정 변경 반영 | 새로고침으로 반영(Should), 재시작 필요해도 허용 |
| D-21 | payload의 `usage`·`subagent.usage` 형식 검사 | 검사하지 않고 버린다. 형식이 틀려도 이 필드 때문에 400을 내지 않는다(observe.mjs 버전 차이로 수집이 끊기지 않게) |
| D-22 | statusLine 전송 간격 | 값이 바뀌었을 때만, 같은 PC에서 최대 1분 1회. 1분 안의 변경은 다음 실행 때 보낸다 |
| D-23 | 값이 그대로일 때 재전송 | 10분마다 1회 재전송(statusLine이 실행될 때만). 서버가 "아직 같은 값"인지 알 수 있게 한다. 재전송하지 않으면 D-24 "오래됨"이 값이 안 바뀐 정상 상황에도 뜬다 |
| D-24 | 오래된 값 기준 시간 | 마지막 수신 후 15분(D-23 10분 + 여유). 넘으면 값은 두고 "N분 전 값" 표시 |
| D-25 | 기존 사용자 statusLine 처리 | 감싸기: 설치 시 기존 명령을 보존하고, kit 스크립트가 같은 stdin으로 기존 명령을 실행해 그 출력을 그대로 보여 준다(제한 시간 2초, 넘거나 실패하면 kit 기본 한 줄). 설치는 기존 설정을 바꾸기 전에 사용자에게 알리고 원래 값을 되돌릴 수 있게 남긴다 |
| D-26 | 기존 statusLine이 없을 때 기본 출력 | 한 줄 `5h 42% · 7d 13%`. 값이 없으면 빈 줄 |
| D-27 | 여러 PC·여러 세션에서 값이 올 때 | 창별로 `resets_at`이 더 늦은 값이 이긴다. `resets_at`이 같으면 `used_percentage`가 큰 값을 남긴다(사용률은 창 안에서 줄지 않으므로 늦게 도착한 옛 값 무시). 수신 시각은 마지막 수신으로 갱신 |
| D-28 | 여러 계정에서 값이 올 때 | 1단계는 계정 하나만 가정하고 구분하지 않는다. 다른 계정 값은 D-27 규칙으로 섞일 수 있음을 알려진 한계로 둔다. statusLine 입력에 계정 식별 정보가 있는지는 설계에서 확인하고, 있어도 원문을 저장하지 않는다 |
| D-29 | 클라우드 세션 미확인 처리 | 스크립트는 클라우드에서도 같은 환경 변수·Network secret으로 보내도록 만들되, 1단계 검증은 로컬만 한다. 클라우드 동작 확인은 2단계 배포 후 `[사용자 확인]`. 클라우드에서 실행되지 않아도 로컬 값으로 같은 계정 사용률을 보므로 1단계 완료를 막지 않는다 |
| D-30 | 사용률 경고 기준 | 80% 이상 경고 문구(예: "한도 가까움"), 100%는 "한도 도달" |

## 1단계 설계

작성: architect, 2026-11-11. 전제: D-1~D-20은 모두 제안 기본값을 쓴다. 기본값을 바꾸면 설계가 크게 달라지는 항목에는 **[D-n 민감]** 표시를 붙였다.
고정 조건: Next.js(App Router) + TypeScript, pnpm, 로컬 실행만(Vercel·DB·Electron 없음), 단위 테스트 Vitest, E2E·통합 테스트 Playwright.

### 1. 디렉터리와 모듈 경계

```
app/
  layout.tsx, page.tsx            # 대시보드(클라이언트 컴포넌트로 폴링)
  login/page.tsx                  # 로그인 화면
  api/events/route.ts             # POST 수집 (T1-1)
  api/auth/login/route.ts         # POST 로그인 (T1-4)
  api/auth/logout/route.ts        # POST 로그아웃
  api/projects/route.ts           # GET 조회 (T1-5)
  api/sessions/route.ts
  api/sessions/[key]/route.ts
  api/summary/route.ts
  api/skills/route.ts
  api/characters/route.ts         # GET 역할·캐릭터 설정 (T1-6)
  api/characters/[id]/image/route.ts  # GET 캐릭터 그림(로그인 필요)
proxy.ts                          # 인증 보호(Next 15는 middleware.ts. 아래 4절)
src/
  domain/      types.ts           # 이벤트·세션·에이전트·합계 타입 (외부 의존 없음)
  collect/     schema.ts          # payload v1 검증(zod) → NormalizedEvent
               ingest.ts          # 검증된 이벤트를 저장소에 적용하는 유스케이스
  state/       reducer.ts         # 순수 함수: applyEvent(session, event) → session
               status.ts          # 순수 함수: effectiveStatus(agent, now), sessionStatus(...)
               usage.ts           # 순수 함수: mergeUsage(old, new)
  cost/        pricing.ts         # 단가표(기준일·출처 주석), calcCost()
  aggregate/   totals.ts          # 순수 함수: 역할·프로젝트·세션·전체 합계, 스킬 집계
  store/       Store.ts           # 저장소 인터페이스
               memoryStore.ts     # 메모리 구현(테스트용)
               fileStore.ts       # 1단계 기본 구현(로컬 JSON 파일)
               index.ts           # getStore(): 환경 변수로 구현 선택, 프로세스당 1개
  auth/        token.ts           # Bearer 비교(상수 시간)
               cookie.ts          # 서명 쿠키 만들기·검증(Web Crypto HMAC)
               rateLimit.ts       # 로그인 실패 제한(메모리)
  query/       views.ts           # 저장소 → 조회 API 응답(DTO) 변환, 시각 now 주입
  characters/  roles.ts           # roles.json 읽기·역할 매핑
               spriteConfig.ts    # 캐릭터 설정 검증, 동작 대체(resolveAction)
  ui/          *.tsx              # 목록, 상세, 합계, 임시 사무실(canvas 또는 div)
config/
  roles.example.json              # 커밋함
  characters.example/             # 예시 캐릭터 설정(JSON) + 직접 만든 테스트 그림(원본 아님)
characters/                       # 실제 설정·그림 (gitignore 됨)
.data/                            # 파일 저장소 (gitignore에 추가해야 함)
tests/unit/**.test.ts             # Vitest
tests/api/**.test.ts              # Vitest: route handler를 직접 호출
e2e/**.spec.ts                    # Playwright: 화면 흐름 + observe.mjs 통합
```

```mermaid
flowchart LR
  OBS[observe.mjs] -- Bearer --> EV[api/events]
  EV --> SCH[collect/schema] --> ING[collect/ingest]
  ING --> RED[state/reducer 순수] 
  ING <--> ST[(store 인터페이스)]
  ST --- FS[fileStore] & MS[memoryStore]
  UI[app/page 폴링 3초] -- 쿠키 --> PX[proxy.ts] --> Q[api/sessions·summary·skills·...]
  Q --> VW[query/views] --> STAT[state/status 순수] & AGG[aggregate/totals 순수] & COST[cost/pricing]
  VW <--> ST
  Q --> CH[characters/roles·spriteConfig]
```

경계 규칙
- `domain`, `state`, `cost`, `aggregate`, `characters/spriteConfig`의 대체 함수는 순수 함수다. Next.js·fs·Date.now를 직접 쓰지 않는다(시각은 인자 `now`로 받는다 → S-09~S-11을 기다리지 않고 테스트).
- route handler는 얇게 둔다: 인증 → 검증 → 유스케이스 호출 → 응답. 저장소는 `getStore()`로만 얻는다.
- 수집·상태 계산 코드는 `Store` 인터페이스만 안다(T1-1 "구현만 바꿔도 같은 동작"). API 테스트는 같은 테스트를 memoryStore와 fileStore(임시 폴더) 두 구현으로 돌린다.
- `vendor/` 코드는 import하지 않는다. `pricing.ts`, `roles.ts`, 사무실 렌더러에 옮긴 부분은 파일 머리에 출처 주석을 달고 `THIRD_PARTY_NOTICES.md`에 적는다.

### 2. 데이터 모델 (`src/domain/types.ts`)

```ts
type EventName = 'SessionStart'|'SessionEnd'|'UserPromptSubmit'|'UserPromptExpansion'|'PreToolUse'
  |'PostToolUse'|'Notification'|'Stop'|'SubagentStart'|'SubagentStop';

interface Usage { input: number; output: number; cache_creation: number; cache_read: number;
  model: string | null; messages: number }          // 정수 >= 0

interface NormalizedEvent {                          // 검증 후 허용 필드만 남긴 것. 이것만 저장한다
  v: 1; event: EventName; ts: string /*ISO*/; tsMs: number; seq: number /*도착 순번, 저장소가 부여*/;
  session_id: string; agent_id: string | null; agent_type: string | null;
  project: string; branch: string | null; remote: boolean; remote_session_id: string | null;
  tool?: string; skill?: string | null; subagent_type?: string | null; command?: string | null;
  notification_type?: string | null; source?: string | null; model?: string | null; reason?: string | null;
  usage?: Usage;
  subagent?: { agent_id: string; agent_type: string | null; status: string | null; usage: Usage };
}

type AgentStatus = 'working' | 'thinking' | 'waiting' | 'done' | 'ended';
// 화면 문구: 작업 중 / 생각 중 / 승인 대기 / 완료 / 종료

interface AgentState {
  agentId: string | null;          // null = lead(메인 세션)
  agentType: string | null;        // 원문. 역할 키는 조회 시 roles.ts로 계산
  status: AgentStatus;             // 저장된 상태(시간 초과 미반영)
  currentTool: string | null;      // working일 때만
  waitingSinceTs: number | null;   // waiting으로 바뀐 시각. waiting이 아니면 null. R6은 바꾸지 않음
  lastEventTs: number;             // 상태 전이에 반영된 마지막 ts (ms)
  lastSeq: number;
  usage: Usage;                    // 누적, 항목별 max
  firstSeenTs: number;
}

interface SessionState {
  key: string;                     // sessionKey(project, session_id) — 아래 참고 [S-14]
  sessionId: string; project: string; branch: string | null;
  remote: boolean; remoteSessionId: string | null;
  model: string | null;            // SessionStart.model
  ended: boolean;                  // SessionEnd(R10) 받음. 이후 이벤트가 오면 false로 (S-12)
  dismissedAtTs: number | null;    // 사용자가 "정리"한 시각. 이후 이벤트가 오면 null로
  restoredAtTs: number | null;     // 사용자가 "다시 표시"한 시각(종료 세션 24시간 표시 기준에 포함)
  lastEventTs: number;             // 세션 내 최대 ts
  agents: Record<string, AgentState>;   // 키: agent_id 또는 '__lead__'
  skills: Record<string /*agentKey*/, Record<string /*skill*/, { count: number; lastTs: number }>>;
  agentCalls: Record<string /*agentKey*/, Record<string /*subagent_type*/, number>>;  // Should
}

interface Totals { input: number; output: number; cache_creation: number; cache_read: number;
  costUsd: number; estimated: boolean /*추정 단가가 하나라도 섞임*/ }
interface RoleTotal extends Totals { role: string; agents: number }
interface ProjectTotal extends Totals { project: string; sessions: number }
interface SkillUse { project: string; sessionKey: string; agentKey: string; role: string; skill: string; count: number; lastTs: number }
```

- 세션 키: `sessionKey = base64url(project + "\n" + session_id)`. S-14가 "같은 이벤트를 P1·P2로 보냄"이므로 session_id만으로는 구분할 수 없다. URL에 그대로 쓸 수 있게 base64url로 만든다.
- 스냅숏 방식: 세션 상태는 이벤트를 받을 때마다 `applyEvent`로 갱신해 저장한다. 원본 이벤트는 보관 한도(D-4)만큼 따로 남기고(디버그·향후 재계산용), 합계·스킬 횟수는 스냅숏에 있으므로 이벤트를 지워도 사라지지 않는다.
- 버전: 저장 파일 최상위에 `schemaVersion: 1`. 읽을 때 버전이 다르면 서버 로그에 남기고 파일을 `state.json.bak-<시각>`으로 옮긴 뒤 빈 상태로 시작한다(1단계는 마이그레이션 코드 없음. 데이터 손실 허용 범위 — 가정 절 참고).

#### 상태 계산 규칙 (reducer)
- 대상 에이전트: `agent_id`가 null이면 lead, 아니면 그 ID(R12: 없으면 생성, R13: 세션 없으면 생성). SubagentStart/Stop은 observe.mjs가 subagent의 `agent_id`를 넣어 보낸다.
- **순서(D-7) [D-7 민감]**: 재생(replay) 대신 에이전트별 `(lastEventTs, lastSeq)` 비교로 처리한다. 이벤트의 `(tsMs, seq)`가 에이전트의 마지막 값보다 작으면 **상태 전이는 하지 않고** usage 병합·스킬 기록·`lastEventTs` 최대값 갱신만 한다. S-13(늦게 도착한 옛 PreToolUse)은 완료로 남는다. 늦게 온 이벤트가 끼어들어 중간 상태가 바뀌는 경우는 화면에 의미가 없어 무시한다. D-7을 "도착 순"으로 바꾸면 이 비교만 빼면 된다.
- R10 SessionEnd: 모든 에이전트 `ended`, `session.ended = true`. 이후 같은 세션에 이벤트가 오면 `ended=false`로 되돌리고 그 이벤트 규칙을 적용한다.
- R6, D-9: 상태는 그대로, `lastEventTs`만 갱신(시간 초과 기준도 늘어난다).
- 멱등성: 같은 PreToolUse 두 번 → 작업 중 그대로. 스킬 횟수는 중복 전송이면 두 번 센다(이벤트 ID가 payload에 없어 구분 불가 — 리스크 절).
- **시간 초과(R11, D-6) [D-6 민감]**: 저장하지 않고 조회 시 `effectiveStatus(agent, now)`로 계산한다. `now - lastEventTs`가 working/thinking 10분, done 30분을 넘으면 `ended`. 경계는 "초과"(정확히 10분은 아직 작업 중). **waiting은 시간 초과로 ended가 되지 않는다.** 대신 `now - waitingSinceTs`가 24시간을 넘으면 DTO에 `stale: true`("승인 대기 (응답 없음)")를 붙인다. 세션 상태는 `effectiveStatus`들 중 D-5 우선순위 최대값.
- usage 병합: `mergeUsage(old, new)` = 네 항목·messages 각각 `max`, `model`은 새 값이 null이 아니면 새 값(D-12). 대상:
  - 이벤트의 `usage` → 이벤트의 대상 에이전트.
  - `subagent.usage` → `subagent.agent_id` 에이전트(없으면 `subagent.agent_type`으로 생성, 상태는 바꾸지 않음). 부모(lead) usage에는 더하지 않는다.
- 스킬: `event=PreToolUse && tool=Skill && skill` 일 때 `skills[agentKey][skill].count++`. `tool in (Agent, Task) && subagent_type` 이면 `agentCalls` 증가.

### 3. 저장소

```ts
interface Store {
  /** 원자적으로 세션 스냅숏을 갱신하고 이벤트를 보관한다. fn은 순수 reducer. */
  applyEvent(ev: Omit<NormalizedEvent,'seq'>, fn: (s: SessionState | null, ev: NormalizedEvent) => SessionState): Promise<SessionState>;
  getSession(key: string): Promise<SessionState | null>;
  listSessions(filter?: { project?: string; sinceTs?: number }): Promise<SessionState[]>;
  listProjects(): Promise<string[]>;
  recentEvents(key: string, limit: number): Promise<NormalizedEvent[]>;   // 디버그용, API로 노출 안 함
  dismiss(key: string, now: number): Promise<void>;
  restore(key: string, now: number): Promise<void>;  // "다시 표시": dismissedAtTs를 null로, restoredAtTs = now   // "정리": dismissedAtTs 기록. reducer는 새 이벤트에서 null로 되돌림
  prune(now: number): Promise<void>;     // D-4: 세션당 500개, 7일 지난 이벤트 삭제(스냅숏은 유지)
}
```
- 합계는 저장하지 않고 조회 때 `aggregate/totals.ts`가 스냅숏에서 계산한다(1단계 규모: 세션 수백 개 이하). 2단계 DB 구현에서 느리면 그때 합계 테이블을 둔다.
- `applyEvent`가 "읽기-계산-쓰기"를 한 번에 하게 한 이유: Redis(WATCH/Lua)·Postgres(트랜잭션, `SELECT … FOR UPDATE`)로 옮길 때 같은 경계를 그대로 쓸 수 있다.
- 구현 선택: `OBSERVER_STORE=file`(기본) | `memory`.

fileStore (D-3 = 로컬 파일) **[D-3 민감: 메모리를 고르면 이 항목 전부 불필요]**
- 위치: `OBSERVER_DATA_DIR`(기본 `<프로젝트 루트>/.data`). 파일 `state.json` 하나: `{ schemaVersion, seq, sessions: {key: SessionState}, events: {key: NormalizedEvent[]} }`.
- `.gitignore`에 `.data/`를 추가한다(개발 BOT이 T1-1에서 함께 커밋).
- 동시 쓰기: 1단계는 Next 서버 프로세스 하나라고 가정한다. 프로세스 안에서는 메모리에 전체 상태를 들고, 모든 `applyEvent`를 Promise 체인 뮤텍스로 직렬화한다. 디스크 쓰기는 250ms 디바운스로 모아 `state.json.tmp`에 쓰고 `rename`(같은 폴더라 원자적). 서버 시작 시 한 번 읽는다. `next dev`의 핫 리로드로 모듈이 다시 로드돼도 인스턴스가 하나가 되도록 `globalThis`에 보관한다.
- 종료 직전 디바운스 중인 쓰기는 최대 250ms 분량을 잃을 수 있다(허용). `prune`은 쓰기 때마다 해당 세션에만, 전체는 시작 시와 1시간마다.
- 파일 권한: 0600으로 만든다.

### 4. 인증

수집(Bearer)
- `/api/events`만. `OBSERVER_TOKEN`이 비었거나 16자 미만이면 모든 요청 401 `{"error":"server_token_invalid","message":"서버 수집 토큰(OBSERVER_TOKEN)이 설정되지 않았거나 16자보다 짧습니다"}` + 서버 시작 시 경고 로그. 보낸 토큰이 틀린 경우는 401 `{"error":"unauthorized"}`로만 답하고 이유를 구분하지 않는다. 비교는 `crypto.timingSafeEqual`(길이가 다르면 바로 실패).
- 쿠키는 보지 않는다.

화면·조회(비밀번호 + 서명 쿠키)
- `POST /api/auth/login`이 `OBSERVER_PASSWORD`와 상수 시간 비교(양쪽을 SHA-256 한 뒤 비교해 길이 노출 방지). 비었으면 항상 401.
- 쿠키 이름 `obs_session`, 값 `v1.<만료 epoch초>.<base64url HMAC-SHA256("v1."+만료)>`. 키는 `OBSERVER_SESSION_SECRET`(32자 이상 권장). 없으면 `HMAC(OBSERVER_PASSWORD, "agent-observer-cookie")`로 만든다 → 비밀번호를 바꾸면 기존 쿠키가 모두 무효가 된다. HttpOnly, SameSite=Lax, Path=/, Max-Age 30일(D-14), Secure는 요청이 https(`x-forwarded-proto` 또는 URL)일 때만.
- 검증은 Web Crypto(`crypto.subtle`)로 해서 proxy/middleware 런타임과 무관하게 같은 코드를 쓴다.
- 실패 제한(D-15): 메모리 슬라이딩 윈도. 키는 클라이언트 IP(`x-forwarded-for` 첫 값, 없으면 `"local"`) + 전역 카운터 하나. 1분 안 실패 5회 넘으면 429 + `Retry-After`. 성공 시 그 IP 카운터 초기화. 서버 재시작 시 초기화(허용).
- 로그아웃: `POST /api/auth/logout` → 같은 이름 쿠키를 Max-Age=0으로. (서명 쿠키라 서버 쪽 무효화 목록은 없음 — 리스크 절)

보호 범위 (`proxy.ts`. Next 16에서는 `proxy.ts`, Next 15에서는 `middleware.ts`로 같은 내용. 설치한 버전에 맞춘다)
| 경로 | 보호 |
|---|---|
| `/api/events` | proxy 통과, route에서 Bearer 검사 |
| `/api/auth/login`, `/login`, `/_next/static/*`, `/_next/image/*`, `/favicon.ico` | 공개 |
| `/api/*` 나머지 | 쿠키 없거나 무효 → 401 JSON. Bearer 헤더는 무시(D-16) |
| 그 외 화면 경로 | 쿠키 없거나 무효 → `/login?next=<경로>`로 302 (`next`는 `/`로 시작하는 내부 경로만 허용) |
- 조회 route handler 안에서도 `requireSession(req)`를 한 번 더 부른다(proxy 설정 실수 대비 이중 방어).
- 캐릭터 그림은 `public/`에 두지 않고 `characters/`(gitignore)에서 `GET /api/characters/[id]/image`로 보낸다 → 그림도 로그인 뒤에만 보인다. `public/characters/*`는 Next가 인증 없이 정적 제공하므로 쓰지 않는다(사용자 결정 2026-11-11: 캐릭터 적용을 포함한 모든 기능은 로그인 후에만. .gitignore 항목은 실수 방지용으로 남긴다).

### 5. API 명세

공통: 응답은 JSON, 오류 형식 `{ "error": "<코드>", "message": "<한국어 짧은 설명>" }`. 스택·토큰·비밀번호·내부 경로를 넣지 않는다. 처리 안 된 예외는 500 `{"error":"internal"}` + 서버 로그.

#### POST /api/events (F: T1-1, 인증 Bearer)
요청: `Content-Type: application/json`, 본문 payload v1(위 "데이터 수집" 절).
처리 순서: ① 메서드 ② Bearer ③ `Content-Length` > 16KB면 바로 413, 없으면 스트림을 16KB까지만 읽고 넘으면 413 ④ JSON 파싱 ⑤ zod 검증 ⑥ 허용 필드만 골라 NormalizedEvent ⑦ `store.applyEvent`.
검증 규칙(zod, `strip` 모드 = 정의 안 된 키는 버림):
- 필수: `v === 1`, `event` 10종, `ts` ISO 8601(`Date.parse` 가능 + 정규식 `^\d{4}-\d{2}-\d{2}T`), `session_id` 1~256자, `project` 0~256자 문자열.
  - `project`가 빈 문자열이면 `"(unknown)"`으로 저장한다(observe.mjs는 git 없으면 폴더 이름을 넣으므로 드묾).
- 선택(null 허용): `agent_id`, `agent_type`, `branch`, `remote_session_id`, `tool`, `skill`, `subagent_type`, `command`, `notification_type`, `source`, `model`, `reason`: 문자열 ≤256자(D-2). `remote`: boolean. `usage`: 객체, 네 항목·`messages`는 0 이상 정수(≤ 2^53), `model` 문자열|null. `subagent`: `{agent_id: 문자열 필수, agent_type, status: 문자열|null, usage: Usage}`.
- `command`는 observe.mjs가 UserPromptExpansion에 넣는 필드(슬래시 명령 이름, 120자로 잘림)다. 위 payload 예시에 없지만 허용 필드에 넣는다(사용자 결정 2026-11-11, 부작용 확인함). observe.mjs는 hook 입력의 `command_name`만 보내고 명령 인자(프롬프트 일부가 될 수 있음)는 보내지 않는다. 원본 이벤트에만 저장하고 상태 계산·합계에는 쓰지 않는다.
- 그 외(`prompt`, `tool_input`, `tool_response`, `message` 등)는 모두 버린다. 저장·로그 어디에도 남기지 않는다(검증 실패 로그에도 값 대신 경로만).
- `ts`가 서버 시각보다 5분 넘게 미래면 서버 시각으로 바꾼다(시간 초과 계산이 멈추는 것 방지).

응답
| 코드 | 경우 | 본문 예 |
|---|---|---|
| 202 | 저장됨 | `{"ok":true,"session":"UDEKMGMwOQ"}` |
| 400 | JSON 아님, 검증 실패 | `{"error":"invalid_payload","message":"…","issues":["ts","usage.output"]}` (필드 경로만) |
| 401 | 헤더 없음·토큰 틀림 | `{"error":"unauthorized"}` |
| 401 | 서버 `OBSERVER_TOKEN` 미설정·16자 미만 | `{"error":"server_token_invalid","message":"…"}` |
| 405 | POST 외 | `Allow: POST` 헤더 |
| 413 | 16KB 초과 | `{"error":"payload_too_large"}` |
| 500 | 저장 실패 | `{"error":"internal"}` |

#### POST /api/auth/login (T1-4, 공개)
요청 `{"password":"…"}` (JSON 또는 `application/x-www-form-urlencoded`, 본문 4KB 제한). 응답 204 + `Set-Cookie: obs_session=…`. 실패 401 `{"error":"invalid_password"}`, 429 `{"error":"too_many_attempts"}` + `Retry-After: <초>`, 405.

#### POST /api/auth/logout (쿠키)
204 + 쿠키 삭제. 쿠키가 없어도 204.

#### GET /api/projects (쿠키)
`{"projects":[{"project":"winterairy/epub-editor","sessions":3,"active":1}]}`

#### GET /api/sessions?project=<이름>&ended=<recent|none|all> (쿠키)
- `ended` 기본 `recent` = 종료 세션은 `max(lastEventTs, restoredAtTs)`가 24시간 안인 것만(D-17). 다시 표시한 세션은 다시 표시한 때부터 24시간 보인다.
- 응답 최상위에 `hiddenCount`(같은 project 필터 기준 숨긴 세션 수)를 넣는다. 화면은 이 값으로 "숨긴 세션 N개 보기"를 그리고, 펼쳤을 때만 `hidden=only`를 부른다.
- `hidden=only`는 `project` 필터와 함께 쓸 수 있다.
- 정렬: 승인 대기 세션 먼저(기다린 시간이 긴 순), 그다음 다른 활성 세션, 그 안에서 `lastEventTs` 내림차순. `dismissedAtTs`가 있는 세션은 `ended=all`일 때만 포함.
```json
{ "now": "2026-11-11T10:00:03Z", "hiddenCount": 0,
  "sessions": [{
    "key": "UDEKMGMwOQ", "sessionId": "0c09…", "project": "P1", "branch": "main", "remote": true,
    "status": "waiting", "waitingSince": "2026-11-11T08:00:01Z", "stale": false, "lastEventAt": "2026-11-11T10:00:01Z",
    "agentCount": 2, "waitingCount": 1,
    "totals": {"input":6,"output":398,"cache_creation":12285,"cache_read":100229,"costUsd":0.0123,"estimated":false}
  }] }
```

#### GET /api/sessions/[key] (쿠키)
404 `{"error":"not_found"}` 가능.
```json
{ "session": { "...목록 항목과 같은 필드": "", "model": "…", "endedByEvent": false },
  "agents": [{
    "agentKey": "__lead__", "agentId": null, "agentType": null, "role": "lead", "displayName": "책임자",
    "characterId": "lead", "status": "working", "currentTool": "Bash", "waitingSince": null, "stale": false, "lastEventAt": "…",
    "usage": {"input":6,"output":398,"cache_creation":12285,"cache_read":100229,"model":"claude-haiku-5-5","messages":3},
    "cost": {"usd":0.01234,"estimated":false,"pricingModel":"claude-haiku-5-5"},
    "skills": [{"skill":"playwright-cli","count":2,"lastAt":"…"}],
    "calledAgents": [{"subagentType":"qa","count":1}]
  }] }
```
- 응답 최상위에 `"pricing": {"asOf": "…", "source": "…"}`를 함께 넣는다(세션 상세 화면의 단가 기준일 각주용).
- 에이전트 정렬: lead 먼저, 나머지는 `firstSeenTs` 순. 종료된 에이전트도 목록에 남긴다(토큰 유지).

#### POST /api/sessions/[key]/dismiss (쿠키)
"정리" 버튼. 204, 없는 키는 404. 쿠키는 SameSite=Lax라 다른 사이트에서의 POST에는 실리지 않지만, `Origin` 헤더가 같은 호스트인지도 확인한다(로그인 API도 같은 검사).

#### POST /api/sessions/[key]/restore (쿠키)
"다시 표시" 버튼. 204, 없는 키는 404. Origin 검사는 dismiss와 같다. 숨긴 세션 목록은 `GET /api/sessions?hidden=only`(숨긴 세션만, 종료 세션 24시간 제한을 적용하지 않음).

#### GET /api/summary?project=<이름> (쿠키)
```json
{ "total": {"…Totals"},
  "byRole": [{"role":"qa","displayName":"QA","agents":2,"input":0,"output":300,"cache_creation":0,"cache_read":0,"costUsd":0.0045,"estimated":false}],
  "byProject": [{"project":"P1","sessions":1,"…Totals"}],
  "pricing": {"asOf":"2026-11-11","source":"https://www.anthropic.com/pricing"} }
```
- 역할 키는 `roles.ts`의 매핑 결과(null → lead, `plugin:qa` → qa, 없는 역할은 원문). `project` 필터가 있으면 byRole·total은 그 프로젝트만, byProject는 그 한 줄.

#### GET /api/skills?project=&session=<key> (쿠키)
`{"skills":[{"skill":"playwright-cli","count":2,"byRole":{"qa":2},"lastAt":"…"}]}` (스킬별 합. 세션 상세에는 에이전트별이 이미 있음)

#### GET /api/characters (쿠키)
```json
{ "roles": {"lead":{"displayName":"책임자","characterId":"lead"}},
  "default": {"characterId": null},
  "characters": {"lead": {"ok": true, "image": "/api/characters/lead/image", "frameWidth":48, "frameHeight":64,
      "actions": {"idle_down":{"row":0,"frames":4,"fps":4}, "...": ""}},
    "qa": {"ok": false}} }
```
- `ok:false`면 화면은 임시 사각형. 원인은 서버 로그에만(응답에 경로·오류 메시지 안 넣음).

#### GET /api/characters/[id]/image (쿠키)
`id`는 `^[a-z0-9_-]{1,64}$`만. 설정의 `image` 파일명은 `characters/<id>/` 안의 파일만(`path.resolve` 후 접두사 확인으로 경로 이탈 차단). png/webp만, `Cache-Control: private, max-age=60`. 없으면 404.

### 6. API 환산 비용 (T1-3)
- `cost/pricing.ts`: `{ asOf: '<기준일>', source: '<URL>', models: Record<string,{input:number; output:number}> /*USD per 1M*/ }`. 계산 `input*in + cache_read*in*cacheReadMul + cache_creation*in*1.25 + output*out`. `cacheReadMul`은 모델별(기본 0.1, 가격 페이지에 따로 적힌 모델은 그 값. 예: Opus 5.5·Sonnet 5.5는 0.05 — 2026-11-11 개발 1차에서 확인), 결과 `Math.round(x*1e5)/1e5`(vendor 방식). 캐시 쓰기 1.25배는 5분 캐시 기준(1시간 캐시 2배는 payload에 구분이 없어 반영 안 함 — 리스크).
- 모델 이름 매칭: 정확히 같은 키 → 없으면 날짜 접미사(`-20251001` 등)를 뗀 키 → 없으면 Sonnet 최신 단가 + `estimated:true`(D-11). `model`이 null이어도 추정.
- 단가표 대상(D-10): Opus·Sonnet·Haiku 최신 세대(5.x, `claude-haiku-5-5` 포함)와 4.5, 4.6. 개발 BOT이 구현 시 Anthropic 공개 가격 페이지에서 값을 확인해 넣고 `asOf`·`source`를 적는다. 참고로 vendor의 Opus 4.5/4.6 값($15/$75)과 Haiku 값($0.8/$4)은 현재 공개 단가와 다르므로 그대로 옮기지 않는다.
- 합계 비용은 에이전트별 비용의 합(에이전트마다 자기 모델 단가). `estimated`는 하나라도 추정이면 true.

### 7. 캐릭터 설정 (T1-6)
- 파일 위치: `OBSERVER_CHARACTERS_DIR`(기본 `<루트>/characters`).
  - `characters/roles.json` — 형식 `{ "<역할키>": { "name": "책임자", "character": "lead" } }`. 없으면 `config/roles.example.json`을 읽는다(그림은 없으니 사각형).
  - `characters/<id>/character.json` + 그림 파일.
- 캐릭터 설정 형식(검증은 zod):
```json
{ "image": "sheet.png", "frameWidth": 48, "frameHeight": 64, "fps": 6,
  "rows": [ {"action":"idle","direction":"down","frames":4},
            {"action":"walk","direction":"down","frames":4},
            {"action":"sit_work","direction":"down","frames":4,"fps":8} ] }
```
  `rows`의 순서 = 그림의 줄 번호(0부터). 동작 이름은 `idle|walk|sit|sit_work|done|alert`, 방향 `down|left|right|up`(없으면 down).
- `resolveAction(config, action, direction) → {row, frames, fps} | null`(순수). 대체 순서(D-19): 같은 동작의 요청 방향 → down 방향 → 동작 체인(`sit_work → sit → idle`, `walk → idle`, 그 외 → `idle`) 각각에 같은 방향 규칙. 끝까지 없으면 null → 사각형.
- 상태 → 동작(화면): working=`sit_work`, thinking=`sit`, waiting=`alert`(+ "승인 대기" 문구 배지), done=`idle`(또는 `done`), ended=표시 안 함.
- 반영(D-20): `/api/characters`가 요청마다 파일 `mtime`을 보고 바뀌었으면 다시 읽는다(작은 파일이라 비용 무시) → 새로고침으로 반영.
- 역할 매핑 `roleKeyFor(agentType, roles)`: null → `lead`; 원문 키가 있으면 그것; `split(':').pop()` 키가 있으면 그것; 없으면 원문을 역할 이름으로, 캐릭터는 기본(null = 사각형).

### 8. 화면 (T1-5)
- `/` 하나에 필터·세션 목록·세션 상세·합계·임시 사무실. 상세는 `?session=<key>`로 열어 새로고침·링크에 유지. 프로젝트 필터는 `?project=` + `localStorage`(Should).
- 폴링: 클라이언트에서 3초마다 `/api/sessions`, `/api/summary`, (상세가 열려 있으면) `/api/sessions/[key]`. `document.visibilityState === 'hidden'`이면 멈추고 보이면 즉시 1회. 401이 오면 `/login`으로 이동. 데이터 가져오기 라이브러리(SWR 등)는 쓰지 않는다(`fetch` + `setInterval`로 충분).
- 임시 사무실: `<canvas>` 대신 CSS grid의 `div`(사각형 + 이름 + 상태 문구)로 시작한다. 캐릭터 설정이 있으면 `background-image` + `background-position`으로 프레임을 자른다(`image-rendering: pixelated`). 영역: 책상 줄(working·thinking), 대기 줄(done), 경고 표시(waiting). 길찾기·이동은 3단계.
- 스타일: 별도 UI 라이브러리 없이 CSS Modules(디자인은 designer 산출물을 따른다).

### 9. 주요 흐름

수집
1. observe.mjs → `POST /api/events` (curl, 5초 제한, 실패해도 hook은 exit 0).
2. route: 인증 실패 401 / 크기 413 / 검증 400 → 저장 안 함.
3. `ingest`: `store.applyEvent(ev, reduce)` — 뮤텍스 안에서 seq 부여 → reducer → 메모리 반영 → 디바운스 저장 예약.
4. 202. 디스크 쓰기 실패는 서버 로그 + 다음 쓰기에서 재시도(응답은 이미 202. 메모리 상태는 유지).

조회
1. proxy가 쿠키 검증 → route가 `requireSession` → `store.listSessions` → `views`가 `now`로 effective 상태·합계·비용·역할 매핑 계산 → DTO.

### 10. 설계 결정 (ADR)
| # | 결정 | 고려한 대안 | 이유 |
|---|---|---|---|
| A1 | 스냅숏 + reducer, 이벤트는 보관용 | 저장된 이벤트를 조회 때마다 재생 | D-4로 이벤트가 지워져도 토큰·스킬이 남아야 함. 재생은 보관 한도와 충돌 |
| A2 | 늦게 온 이벤트는 전이 생략(ts·seq 비교) | 세션 이벤트 전체를 ts로 정렬해 재계산 | S-13을 만족하면서 단순. DB 이식 시에도 행 하나 갱신 |
| A3 | 시간 초과·응답 없음 표시는 조회 시 계산 | 타이머·주기 작업으로 상태 저장 | Vercel 서버리스에 상주 타이머 없음. 테스트에서 `now` 주입 |
| A4 | 파일 저장소는 JSON 한 파일 + 메모리 캐시 + 원자적 rename | SQLite(better-sqlite3), JSONL 추가 쓰기 | 네이티브 의존성 없음. 1단계 데이터 규모 작음. 2단계에 DB로 교체 예정 |
| A5 | 쿠키는 무상태 HMAC 서명 | iron-session·next-auth, 서버 세션 저장 | 사용자 1명·비밀번호 하나. 의존성 0, proxy 런타임에서 Web Crypto로 동작 |
| A6 | 검증은 zod | 손으로 쓴 검증, valibot, ajv | 타입 추론으로 NormalizedEvent와 스키마를 하나로 유지, strip 기본. 서버에서만 쓰므로 크기 부담 없음 |
| A7 | 그림은 인증된 route로 제공 | `public/characters` 정적 제공 | "로그인한 사용자만 화면을 본다" + 공개 저장소 시기의 그림 보호 |
| A8 | 통합 테스트는 Playwright 안에서 | Vitest에서 서버 spawn | 서버 하나(webServer)를 화면 테스트와 공유. 단위·API 테스트(`pnpm test`)는 서버 없이 빠르게 |

### 11. 환경 변수
`.env.example`에 이름만 커밋한다(값 없음). 로컬 값은 `.env.local`(gitignore됨).
| 이름 | 필수 | 기본 | 설명 |
|---|---|---|---|
| `OBSERVER_TOKEN` | 예 | 없음 → 수집 전부 401 | 수집 Bearer 토큰. 16자 이상. `openssl rand -hex 32` 권장 |
| `OBSERVER_PASSWORD` | 예 | 없음 → 로그인 불가 | 로그인 비밀번호 |
| `OBSERVER_SESSION_SECRET` | 아니오 | 비밀번호에서 파생 | 쿠키 서명 키 |
| `OBSERVER_STORE` | 아니오 | `file` | `file` \| `memory` |
| `OBSERVER_DATA_DIR` | 아니오 | `./.data` | 파일 저장소 폴더 |
| `OBSERVER_CHARACTERS_DIR` | 아니오 | `./characters` | 역할·캐릭터 설정 폴더 |
상수(환경 변수 아님, `src/config.ts` 한곳): 본문 16KB, 문자열 256자, 이벤트 500개/7일, 시간 초과 10/30분, 승인 대기 응답 없음 24시간, 쿠키 30일, 실패 5회/분, 종료 세션 24시간, 폴링 3초.
observe.mjs 쪽(보내는 PC): `AGENT_OBSERVER_URL=http://127.0.0.1:3000`, `AGENT_OBSERVER_TOKEN=<OBSERVER_TOKEN과 같은 값>`.

### 12. 의존성
버전은 설치 시점의 최신 안정판을 `pnpm add -E`로 **정확한 버전 고정**하고 `pnpm-lock.yaml`을 커밋한다. 아래 메이저는 설계 기준.
| 이름 | 메이저 | 종류 | 이유 |
|---|---|---|---|
| next | 16.x (15.x도 가능, proxy/middleware 파일 이름만 다름) | 실행 | 고정 조건 |
| react, react-dom | next가 요구하는 버전 | 실행 | |
| zod | 4.x | 실행 | payload·캐릭터 설정 검증(A6) |
| typescript, @types/node, @types/react, @types/react-dom | 최신 | 개발 | |
| vitest | 3.x 이상 | 개발 | 단위·API 테스트 |
| @playwright/test | 최신 | 개발 | 화면·통합 테스트(Chromium만 설치: `pnpm exec playwright install chromium`) |
| eslint, eslint-config-next | next와 맞춤 | 개발 | 린트(선택) |
- 그 외 런타임 의존성(인증 라이브러리, 상태 관리, UI 키트, SWR, DB 드라이버)은 추가하지 않는다.
- **새 의존성이 생기므로 보안(security) 단계는 필수다.** `pnpm audit` 결과를 보안 보고서에 남긴다.
- Node 22 LTS 이상(`engines`에 적음). `packageManager` 필드에 pnpm 버전 고정.

### 13. 명령과 포트
| 용도 | 명령 |
|---|---|
| 개발 서버 | `pnpm dev` = `next dev -H 127.0.0.1 -p 3000` (포트 3000 고정, 127.0.0.1만 열기. 휴대폰 확인 시에만 사용자가 `-H 0.0.0.0`로 직접 실행 `[사용자 확인]`) |
| 빌드/실행 | `pnpm build`, `pnpm start` = `next start -H 127.0.0.1 -p 3000` |
| 타입 검사 | `pnpm typecheck` = `tsc --noEmit` |
| 단위·API 테스트 | `pnpm test` = `vitest run` (`tests/unit`, `tests/api`. 서버 없이 route handler 직접 호출) |
| 화면·통합 테스트 | `pnpm test:e2e` = `playwright test` (webServer가 `next build && next start -p 3100`을 테스트용 env로 띄움) |
- E2E는 포트 3100(개발 서버 3000과 충돌 방지), `OBSERVER_STORE=file`, `OBSERVER_DATA_DIR=<임시 폴더>`, 테스트 안에서 만든 토큰·비밀번호를 webServer `env`로 넘긴다. `reuseExistingServer: false`.
- 스크린샷(390·1280)은 QA는 `docs/team/reports/screens/qa/`, 디자인 리뷰는 `docs/team/reports/screens/design/`에 저장(실제 수집 데이터가 아니라 테스트 데이터만 보이므로 커밋 가능).
- profile.md "명령" 절은 구현 후 이 값으로 갱신한다.

### 14. observe.mjs 통합 테스트 (T1-7)
가져오는 방법: 이 저장소에 이미 dev-team-kit이 설치한 `.claude/team/observe/observe.mjs`를 **그대로 경로로 실행**한다(복사·수정 안 함. dev-team-kit 업데이트 시 같이 바뀌는 게 의도). 파일이 없으면 테스트를 실패시키고 이유를 출력한다.

`e2e/observe.spec.ts` 절차
1. 임시 폴더 `W`를 만든다. `W/transcript.jsonl`에 assistant 메시지 1~2줄을 쓴다:
   `{"type":"assistant","message":{"id":"m1","model":"claude-haiku-5-5","usage":{"input_tokens":6,"output_tokens":398,"cache_creation_input_tokens":12285,"cache_read_input_tokens":100229}}}`
2. 각 hook 입력을 stdin으로 넣어 `node .claude/team/observe/observe.mjs`를 `child_process.spawn`으로 실행하고 종료를 기다린다(exit 0은 항상이므로 결과는 조회 API로 확인).
   - hook 입력 예: `{"hook_event_name":"SessionStart","session_id":"it-<난수>","cwd":"W","transcript_path":"W/transcript.jsonl","source":"startup","model":"claude-haiku-5-5"}` → `PreToolUse`(`tool_name":"Read"`) → `PostToolUse`(같은 tool, usage 계산됨) → `Stop`.
   - 자식 env: `AGENT_OBSERVER_URL=http://127.0.0.1:3100`, `AGENT_OBSERVER_TOKEN=<테스트 토큰>`, `AGENT_OBSERVER_DISABLE` 제거, `TMPDIR=W/tmp`(observe.mjs의 상태 파일 `os.tmpdir()/dev-team-kit-observe`를 테스트마다 격리), **`NO_PROXY=127.0.0.1,localhost`와 `no_proxy` 같은 값**(클라우드 환경의 `HTTPS_PROXY`를 curl이 따라가 로컬 요청이 프록시로 가는 것 방지), `CLAUDE_CODE_REMOTE` 제거.
   - `cwd`는 git 저장소가 아니므로 `project` = 폴더 이름(`path.basename(W)`), `branch` = null. 조회 시 이 값으로 필터한다.
   - observe.mjs의 ts는 `new Date()`라 연속 실행에서 같은 ms가 될 수 있다 → 서버의 seq(도착 순, D-7)로 순서가 보장됨을 함께 확인하는 셈이다.
3. 로그인 API로 쿠키를 받아 `GET /api/sessions?project=<basename>` → 세션 1개, 상태 `done`. `GET /api/sessions/[key]` → lead usage가 `input 6, output 398, cache_creation 12285, cache_read 100229`.
4. 틀린 토큰 케이스: 새 session_id로 `AGENT_OBSERVER_TOKEN=wrong`로 SessionStart를 보내고, 조회에 그 세션이 없는지 확인.
- 전제: 실행 환경에 `curl`이 있어야 한다(없으면 observe.mjs가 `fetch`로 대체하므로 동작은 같음).
- 주의: 이 저장소의 `.claude/settings.json` hook도 observe.mjs를 부른다. 개발 중 셸에 `AGENT_OBSERVER_URL`이 설정돼 있으면 개발 BOT 자신의 활동이 개발 서버로 들어간다(무해하지만 테스트 데이터와 섞이지 않게 E2E는 별도 포트·데이터 폴더를 쓴다).

### 15. 리스크
| 리스크 | 영향 | 대응 |
|---|---|---|
| 같은 이벤트 중복 전송 시 스킬 횟수 이중 계산 | 횟수 부정확 | payload에 이벤트 ID가 없어 1단계는 허용. 2단계에 observe.mjs에 이벤트 ID 추가를 제안(이번 범위 밖) |
| 파일 저장소 디바운스 중 프로세스 종료 | 최대 250ms 이벤트 손실 | 허용. usage는 누적값이라 다음 이벤트로 회복됨 |
| 여러 프로세스가 같은 `.data` 사용(dev와 start 동시 실행) | 서로 덮어씀 | 문서로 금지. 시작 시 `.data/lock`(pid) 확인 후 다른 프로세스가 살아 있으면 경고 로그 |
| 서명 쿠키는 로그아웃해도 값이 유출되면 만료까지 유효 | 세션 탈취 | HttpOnly·SameSite. 강제 무효화는 비밀번호(또는 SECRET) 변경. 로컬 1단계에서 허용 |
| 로그인 시도 제한이 메모리 | 재시작으로 초기화 | 허용(로컬). 2단계에 Redis로 |
| 1시간 캐시 쓰기 단가 미반영, 모델 혼용(D-12) | 비용 오차 | 화면에 "추정치" 안내 문구. 단가표 기준일 표시 |
| 미래 ts | 종료 판정 지연 | 서버 시각+5분으로 보정 |
| `x-forwarded-for` 위조로 실패 제한 회피 | 무차별 대입 | 전역 카운터(분당 20회)를 함께 둔다. 로컬 127.0.0.1만 열기 |
| 경로 이탈(캐릭터 이미지) | 임의 파일 읽기 | id 정규식 + resolve 접두사 검사 |
| Next 16/15 차이(proxy vs middleware, 런타임) | 인증 우회 | route 안 `requireSession` 이중 방어 + API 테스트에서 각 조회 route를 쿠키 없이 호출해 401 확인 |
| Windows·macOS 차이 | rename 원자성(Windows는 대상 파일이 열려 있으면 실패) | 실패 시 1회 재시도 후 로그. 1단계 검증 환경은 Linux |
