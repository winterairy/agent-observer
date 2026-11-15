# 인수인계: agent-observer

상태: 결정된 내용과 1단계 범위. 아직 구현된 것은 없습니다.

이 문서는 `/task docs/HANDOFF.md 읽고 관찰 서버 1단계 진행`의 입력입니다. 이전 대화(BOT 세트 설계, Pixel Agent Desk 검토)에서 정한 내용을 정리했습니다.

## 목표

여러 프로젝트에서 도는 Claude Code 세션과 dev-team-kit BOT(책임자, planner, architect, designer, developer, qa, security, devops)의 활동을 한 화면에서 본다. 클라우드 세션도 포함하고, 휴대폰과 다른 PC에서도 본다.

- 픽셀 사무실 화면에서 BOT마다 지정한 캐릭터가 움직인다.
- BOT별 토큰 사용량과 비용, 사용한 스킬, 승인 대기 상태를 본다.

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

- `usage`는 **누적값**이다. 서버는 더하지 말고 덮어쓴다(같거나 큰 값만 반영).
- 프롬프트, 응답, 도구 입력 내용은 오지 않는다. 서버도 저장하지 않는다.
- Claude Code 2.1.322의 실제 hook 데이터로 확인했다. 서브에이전트 토큰은 SubagentStop보다 `subagent` 필드가 정확하다.

## 1단계 범위 (이번 과업)

로컬에서 돌아가는 서버와 화면. Vercel 배포와 DB 연결은 하지 않는다.

1. **수집 API** `POST /api/events`
   - Bearer 토큰 확인(환경 변수 `OBSERVER_TOKEN`), payload 검증(v1), 크기 제한
   - 저장소는 인터페이스로 분리한다. 1단계 구현은 메모리 또는 로컬 파일. 나중에 Postgres·Redis 구현으로 바꿀 수 있게 한다.
2. **상태 계산**: 이벤트에서 세션·에이전트 상태를 만든다.
   - 상태: 작업 중(도구 사용), 생각 중, 승인 대기(Notification permission_prompt), 완료, 종료
   - 일정 시간 이벤트가 없으면 끝난 것으로 본다(프로세스 확인 대신)
   - BOT별 토큰 누적은 서브에이전트가 끝나도 지우지 않는다. 역할(agent_type)별, 프로젝트별 합계
   - 스킬 사용 기록
3. **조회 API**와 **웹 화면**
   - 프로젝트 필터, 세션 목록, 세션 안의 BOT 목록과 상태
   - BOT별·역할별 토큰과 비용(단가는 `vendor/pixel-agent-desk/src/pricing.js` 참고)
   - 픽셀 사무실 화면은 임시 그림(단색 사각형 등)으로 동작만 확인한다. 진짜 그림은 3단계.
   - 화면 갱신은 2~3초 폴링으로 충분하다.
4. **로그인**: 화면과 조회 API 보호. 1단계는 간단한 방식(예: 환경 변수 비밀번호 + 쿠키)이면 된다.
5. **캐릭터 설정**
   - `roles.json`: 역할 키(`lead`, `planner` …) → 표시 이름, 캐릭터 ID
   - 캐릭터마다 설정 파일: 그림 파일, 한 칸 크기, 줄별 방향·동작, 프레임 수. 없는 동작은 가까운 동작으로 대신한다(예: sit_work 없으면 idle).
   - 그림 파일은 `.gitignore`된 폴더에 둔다. 저장소에는 예시 설정만 커밋한다.
6. **테스트**: 수집 API 검증·인증, 상태 계산(이벤트 순서별), 토큰 누적 규칙. dev-team-kit의 observe 스크립트로 실제 전송하는 통합 테스트 하나.

## 이후 단계 (이번 범위 아님)

- 2단계: Vercel 배포, DB 연결(Neon Postgres 또는 Upstash Redis), Electron 창(`desktop/`)
- 3단계: 캐릭터를 받은 뒤 사무실 그림 제작, 사무실 좌표·이동 영역을 데이터 파일로 정의

## 참고 코드

`vendor/pixel-agent-desk/`에 출처 표시와 함께 있다(README 참고). 바로 쓰지 말고 필요한 부분을 옮겨 고친다.
- `src/office/`: 브라우저용 사무실 렌더러, 캐릭터 이동, 길찾기, 좌석 배정. 좌표·충돌 정보를 원본 그림에서 읽으므로 데이터 파일 방식으로 바꿔야 한다.
- `src/roleConfig.js`: 역할 매핑. 플러그인 접두사(`plugin:planner`) 처리 포함.
- `src/pricing.js`: 모델별 단가. 최신 모델 단가는 확인해서 갱신한다.

## 주의

- 저장소가 공개인 동안 캐릭터 그림, 토큰, 실제 수집 데이터를 커밋하지 않는다.
- 원본 Pixel Agent Desk 그림을 쓰거나 본떠 그리지 않는다.
- 로그인한 사용자만 화면을 볼 수 있어야 한다.
