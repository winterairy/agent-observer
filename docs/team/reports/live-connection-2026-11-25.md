# 실제 로컬 Claude Code 세션 연결 확인 (2026-11-25)

## 환경

- Windows 11, Node 25.1.0, pnpm 10.28.0, `pnpm dev`(127.0.0.1:3000), 파일 저장소(`.data`)
- 보내는 쪽: 이 저장소에서 띄운 Claude Code 세션 1개. `.claude/settings.local.json`의 `env`에 `AGENT_OBSERVER_URL`·`AGENT_OBSERVER_TOKEN` 지정(세션 도중 추가했고, 재시작 없이 hook·statusLine에 반영됨)
- 서버 쪽: `.env.local`에 `OBSERVER_TOKEN`·`OBSERVER_PASSWORD`

## 결과 요약

| 항목 | 결과 |
|---|---|
| 토큰 확인(`{}` POST) | 400(정상: 토큰 일치) |
| hook 이벤트 → 세션 목록·상세 | 통과. 세션이 `working`, 책임자 현재 도구 `Bash`로 보임(API로 확인) |
| statusLine → 플랜 사용량 | 값은 들어오지만 첫 전송 유실(LIVE-01), 사용자 체감 지연 있음(LIVE-02) |
| 세션 모델 | 전달 안 됨, 계속 `null`(LIVE-03) |
| BOT 목록 | 호출하지 않은 BOT이 계속 추가됨(LIVE-04) |
| 화면 구성 | 사무실이 메인이 아님(LIVE-05, 사용자 요구) |
| 화면 직접 확인 | 브라우저로는 보지 않음. API 응답으로만 확인 |

## 문제

### LIVE-01 (Medium) 플랜 사용량 첫 전송이 실패하면 값이 바뀔 때까지 다시 보내지 않음

- 현상: statusLine이 5h 2%·7d 6%를 읽고 전송 기록(`%TEMP%\dev-team-kit-observe\plan-usage.json`, 03:21:23)을 남겼지만 서버 로그에 `POST /api/plan-usage/report`가 없음. 화면은 계속 "측정 없음"
- 원인: `statusline.mjs`의 `claimSend`가 **보내기 전에** `lastSent`를 기록한다. 전송(분리 실행한 curl)이 실패해도 알 수 없어서 같은 값이면 다시 보내지 않는다. 이번에는 서버가 막 켜지던(첫 컴파일 중) 시점이라 실패한 것으로 보인다
- 영향: 서버를 Claude Code보다 늦게 켜거나 서버가 잠깐 꺼져 있으면, 사용률이 1% 오를 때까지 화면이 비거나 옛 값으로 남는다
- 임시 조치: `plan-usage.json`을 지우자 다음 갱신 때 202로 전송됨
- 수정 방향: 전송 성공(2xx)을 확인한 뒤에만 `lastSent`를 기록하거나, 실패하면 기록을 되돌린다. 또는 같은 값이라도 일정 시간(예: 10분) 지나면 다시 보낸다. 설치본이므로 dev-team-kit 쪽 수정 필요

### LIVE-02 (Medium) 플랜 값이 `/usage`보다 늦게 반영됨(사용자 관찰)

- 현상: 사용자가 `/usage`와 비교했을 때 화면 값에 지연이 있음. 지연 크기는 측정하지 않음. 서버에 저장된 마지막 값은 5h 3%·7d 6%(03:36:05 수신)
- 추정 원인(확인 필요)
  1. `rate_limits`는 statusLine stdin에 들어 있는 값으로, 마지막 API 응답 때 갱신된다. `/usage`는 그 순간 서버에서 새로 조회한다. 응답이 없는 동안에는 statusLine 값이 옛 값이다
  2. statusLine은 Claude Code가 상태 줄을 다시 그릴 때만 실행된다. 게다가 세션별 stdin이 직전과 같으면 멈춘다(사용자 결정 2026-11-12, `refreshInterval` 미사용)
  3. 값이 바뀔 때만, PC당 1분에 1회까지만 보낸다. 사용률은 정수 %라 1% 미만 변화는 보내지 않는다
  4. LIVE-01처럼 전송이 실패하면 다음 변화까지 반영되지 않는다
  5. 화면 폴링은 3초(영향 작음)
- 확인 방법: `AGENT_OBSERVER_DEBUG=1`로 statusLine stdin의 `rate_limits`와 `/usage` 값을 같은 시각에 비교한다. stdin 값부터 늦으면 1·2(Claude Code 쪽 한계), stdin은 맞는데 서버가 늦으면 3·4(스크립트 쪽)
- 수정 방향: 원인을 확인한 뒤 결정. 2라면 `refreshInterval` 사용 여부를 다시 결정해야 한다(2026-11-12 결정 변경). 3·4라면 LIVE-01과 함께 고친다

### LIVE-03 (Medium) 세션 모델이 전달되지 않음

- 현상: 세션 상세 `model`이 계속 `null`
- 원인
  1. 서버는 `SessionStart` 이벤트의 `model`만 저장한다(`src/state/reducer.ts:149`). 수집 설정 전에 시작한 세션은 `SessionStart`를 놓쳐서 끝까지 `null`이다
  2. 세션 도중 `/model`로 바꿔도 반영되지 않는다
  3. `observe.mjs`는 transcript에서 모델을 읽어 `usage.model`로 보내지만, 서버는 `usage`(토큰 수)를 저장하지 않으면서 모델도 같이 버린다
- 수정 방향: 서버가 `usage.model`(모델 이름만, 토큰 수는 계속 버림)을 받아 세션·BOT 모델을 갱신한다. 또는 이벤트 payload에 `model` 필드를 따로 둔다. BOT(서브에이전트)별 모델도 같은 방식으로 표시할 수 있다

### LIVE-04 (High) 호출하지 않은 BOT이 계속 추가되고, 활동이 끝난 BOT이 남음

- 현상: 이 세션에서 Agent 도구를 한 번도 쓰지 않았는데 BOT 2개(`a746476a300578e46`, `ab675bc74a532cbfb`)가 생김. 둘 다 `SubagentStart` 없이 `SubagentStop`만 왔고 `agent_type`은 `null`. 사용자 화면에서도 BOT이 중복으로 계속 늘어남
- 원인
  1. Claude Code 내부의 보조 에이전트(사용자에게 보이지 않는 요약·제안 같은 백그라운드 작업으로 추정)도 `SubagentStop` hook을 부른다. 서버는 처음 보는 `agent_id`면 무조건 BOT을 만든다(`src/state/reducer.ts` R12)
  2. `done` BOT은 30분, 작업 중·생각 중은 10분 지나야 `ended`가 된다. 그동안 사무실 "휴식" 구역에 남는다. 저장소의 `agents`에서는 지워지지 않는다
- 사용자 요구: 활동하지 않는 BOT은 화면에서 지워져야 한다
- 수정 방향
  - `agent_type`이 없고 `SubagentStart`나 도구 이벤트 없이 `SubagentStop`만 온 에이전트는 BOT으로 만들지 않는다(또는 내부 에이전트로 표시하고 숨긴다)
  - 끝난 BOT(`done`)은 사무실·목록에서 곧바로(또는 짧은 유예 뒤) 뺀다. 스킬·BOT 호출 기록(T1-3)은 따로 보관되니 그대로 둔다
  - 같은 역할의 BOT이 여러 번 호출되면 한 자리로 합칠지 결정 필요

### LIVE-05 (사용자 요구) 사무실 영역을 메인으로, 사무실에서 모든 정보를 파악

- 현재: 화면이 세션 목록 · 세션 상세 · 사무실의 3열이고 세션 상세가 정보의 중심이다. 사무실은 선택한 세션의 BOT만 보여 준다(`src/ui/Dashboard.tsx`)
- 요구: 사무실이 화면의 주 영역이 되고, 세션 상세를 따로 보지 않아도 사무실에서 상태·승인 대기·현재 도구·스킬·모델·플랜 사용량을 모두 파악할 수 있어야 한다
- 결정 필요: 여러 세션을 사무실 하나에 함께 보일지(세션별 방·구역) 아니면 선택한 세션만 보일지, 세션 상세를 남길지(접는 패널·말풍선·툴팁으로 대체), 휴대폰(390px)에서의 배치
- 진행: 디자인 명세 변경이 필요하다(DESIGN.md, docs/team/design-spec-stage1.md). `/task`로 기획·디자인 단계부터 진행 권장

### 참고: Windows에서 `pnpm dev` 종료

- 백그라운드로 띄운 `pnpm dev`를 멈췄지만 자식 `node.exe`(next dev)가 남아 3000 포트를 계속 잡고 있었다. `taskkill /PID <pid> /T /F`로 종료. 운영 문서 2절에 Windows 확인 방법(`netstat -ano | findstr :3000`)을 추가할 만하다
