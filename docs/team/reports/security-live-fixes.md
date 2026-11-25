# 보안 재검토: 라이브 연결 수정(fix/live-agents-model, 이슈 #8)

판정: **통과** (Critical 0, High 0, Medium 0, Low 1, Info 3)

## 점검 범위
`git diff origin/main...HEAD -- src app tests e2e`, package.json·pnpm-lock.yaml, .gitignore. 점검표: security-web. 변경분만 점검.
실행: `pnpm test` 16 파일 465 테스트 통과. 서버는 띄우지 않았고 `pnpm audit`은 실행하지 않았다(의존성 변경이 없어 대상 아님).

## 발견 사항
### Low
- **L-1 모델 길이 상한 불일치**: src/collect/schema.ts:57 `cleanModel`은 256자 상한(config.maxStringLength)인데 요청 문서는 300자로 적었다. 최상위 `model`은 optStr(`str`)에서 먼저 길이를 검사해 초과 시 400, `usage.model`은 초과 시 조용히 버려진다(null). 취약점은 아니고 동작 차이다. 권고: 문서의 수치를 256으로 맞추거나 두 경로의 처리를 통일.

### Info
- **I-1 usage 입력(안전)**: schema.ts:37 `z.unknown()`, schema.ts:66 `usageModel`이 객체·비배열·null을 거르고 `Object.hasOwn`으로 자기 속성만 읽는다. `__proto__`·`constructor` 키로 오염되는 경로 없음. usage는 이벤트에 복사되지 않아 크기·깊이는 본문 16KB 상한(route의 readCollectBody) 안에서만 비용이 들고 저장되지 않는다. 문자열·숫자 model은 `typeof` 검사로 null. `<synthetic>`은 꺾쇠로 null.
- **I-2 모델 문자열 사용처(안전)**: 저장은 agent.model·session.model(최대 256자), 응답은 JSON 필드, 화면은 src/ui/SessionDetail.tsx:146-150에서 React 텍스트와 title 속성으로만 출력. src·app에 dangerouslySetInnerHTML·innerHTML 없음. 로그에는 값을 남기지 않는다(route.ts는 필드 경로·예외 이름만).
- **I-3 ignored 경로(안전)**: 202 응답은 route.ts:26에서 readCollectBody(Bearer·크기 검사) 뒤에만 나온다. src/state/reducer.ts:119-125 R12a가 null을 돌려주면 src/store/core.ts:100-108에서 seq·events·sessions·changed()(파일 쓰기 예약)를 모두 건너뛴다. 메모리·파일 저장소가 CoreStore를 공유하므로 둘 다 해당. `ignored` 판정이 세션 생성 전이라 무시 이벤트로 세션·BOT이 생기지 않는다. 기존 에이전트에 대한 이벤트는 이전처럼 처리.
- **DoS 비교**: 이전보다 나빠지지 않았다. 처음 보는 agent_id로 BOT을 만들 수 있는 이벤트가 4종으로 줄어 오히려 줄었다. 다만 토큰을 아는 공격자가 PreToolUse로 에이전트·세션을 많이 만드는 것은 이전과 같이 가능하고(세션당 에이전트 수·세션 수 상한 없음, 이벤트 수만 prune) 이번 변경 밖이다. 모델 필드로 에이전트당 최대 256자가 늘 뿐이다. 권고(별도 이슈): 세션·에이전트 개수 상한.
- **R14 조회 제외**: src/state/status.ts `isListedAgent`는 조회 때만 계산하고 저장은 그대로다. 스킬·agentCalls는 삭제되지 않고, 상세의 `skillTotals`가 숨겨진 BOT 몫까지 합산한다(views.ts:224 `skillsView([s], {}, ctx)`). 숨김 BOT 수 `hiddenAgentCount`만 노출되고 숨긴 BOT의 id·타입은 응답에 없다. 새 키(스킬명·역할)는 Map·`dict()`·`getOwn/setOwn`(totals.ts:37-50)으로 접근해 SEC-01 회귀 없음. agentCount 필터도 문제 없음.
- **의존성·비밀**: package.json·pnpm-lock.yaml 변경 없음. 변경 파일에 토큰·비밀값·실제 데이터 없음(커밋된 .env류는 .env.example뿐, 변경 없음). 추가된 png 6개는 디자인 시안 스크린샷이다. .gitignore에 `.claude/worktrees/`만 추가됐다.
- **SEC-01~09 유지**: 변경 파일에서 dict 접근(getOwn/setOwn/dict), 본문 크기 제한, 값을 남기지 않는 로그, 인증 순서가 그대로다. 되돌려진 것 없음.
