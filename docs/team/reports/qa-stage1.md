# QA 보고서 — 1단계 (T1-1 ~ T1-8)

브랜치 `ccr-8787a7c0-5ou4xy`, 2026-11-12.

## 요약
- 판정: **PASS** (Blocker 0, High 0)
- 수용 기준 98개: PASS 90 · FAIL 0 · 미확인 8(`[사용자 확인]` 7, 다른 저장소 dev-team-kit 문서 1)
- 자동 테스트: 단위·API 417/417, E2E 16/16 (+ QA 보강 2개 포함 18/18)
- 이슈: Low 2개 (QA-01, QA-02)

## 검증 환경
- OS: Linux 6.18 (클라우드 컨테이너), Node 22.23.4, pnpm (lock 파일은 `pnpm-lock.yaml` 하나뿐, 다른 관리자 lock 없음)
- 브라우저: Chromium headless (`/opt/pw-browsers/chromium`), Playwright 1.65
- 개발 서버: 책임자가 띄운 `http://127.0.0.1:3000` (샘플 데이터). E2E는 자체 서버 3100·3101

| 명령 | 결과 |
|---|---|
| `pnpm typecheck` | exit 0 |
| `pnpm test` | 14 files, 417 passed, exit 0 (18.4s) |
| `pnpm build` | exit 0 |
| `pnpm test:e2e -- --trace off` | 16 passed, exit 0 (37.7s) |
| `pnpm test:e2e -- --trace off e2e/qa-stage1.spec.ts` (QA 보강 추가 후) | 18 passed, exit 0 |
| 개발 서버 직접 확인 | curl(`--noproxy '*'`) + Playwright 스크립트(scratchpad, 커밋 안 함) |

참고: 직접 확인 중 한때 3000의 모든 경로가 500이었다. 책임자 확인 결과 보안 BOT의 SEC-01 재현 때문이었다(보안 보고서에 있음). 재시작 뒤 모든 직접 확인을 다시 했고, 아래 결과는 재시작한 뒤의 값이다.

### QA가 추가한 테스트
`e2e/qa-stage1.spec.ts`
- "승인 대기 정렬·기다린 시간, 토큰·비용 없음, 사무실 BOT 수와 상태 변화": 3시간째·30분째 승인 대기 세션과 방금 활성 세션을 넣고 API·화면 순서(3시간 → 30분 → 활성)와 "승인 대기 · 3시간째/30분째" 문구를 확인. `usage`·`subagent.usage` 숫자가 응답과 화면에 없는지, 사무실 칸 수 = BOT 수, PreToolUse 뒤 lead가 책상 구역에서 working이 되는지 확인
- "사무실 계기판 = 상단 영역(정상·한도 가까움·한도 도달)": 42/85/100%를 보내고 상단 영역과 계기판의 값, 수준 아이콘을 비교

### 개발 서버(3000) 직접 확인 결과
- 로그인 없이: `/`, `/?project=x` → 302 `/login?next=…`. `/api/projects`, `/api/sessions`, `/api/sessions/<key>`, `/api/skills`, `/api/plan-usage`, `/api/characters`, `/api/characters/lead/image` → 401 JSON. POST `dismiss`·`restore` → 401. `/characters/lead/sheet.png`, `/config/characters.example/sample/sheet.png` → 302 로그인(정적 경로로 그림이 나가지 않음). Bearer 토큰으로 `/api/sessions` → 401
- 로그인: 틀린 비밀번호 → 401 `invalid_password`, 쿠키 없음. 맞는 비밀번호 → 204, `HttpOnly; SameSite=Lax; Max-Age=2592000`
- 정렬: `/api/sessions` 첫 항목이 승인 대기 demo-1(`waitingSince` 있음), 다음이 생각 중 demo-2. 화면 행 "승인 대기 · 4분째"
- 정리→숨긴 세션→다시 표시(demo-2): dismiss 204 → 목록 [demo-1], hiddenCount 1, `hidden=only`=[demo-2] → restore 204 → 목록 [demo-1, demo-2], hiddenCount 0, hidden [] (샘플 데이터는 원래대로 돌려놓음). 다른 Origin의 dismiss → 403
- 잘못된 쿼리 `ended=bad`, `hidden=x` → 400. `GET /api/events` → 405. 틀린 Bearer → 401 `unauthorized`. JSON이 아닌 본문 → 400
- 플랜 사용량: API는 five_hour 42% normal, seven_day 84% near. 상단 영역은 "42%", "한도 가까움 84%", 초기화 시각·남은 시간·"마지막 측정 4분 전". 계기판은 "5h 42% / 7d 84%"로 같다. `role=meter` aria-valuetext "42%, 05:34 초기화, …", "84%, 한도 가까움, …"
- 가로 스크롤: 1280 → scrollWidth 1280 = clientWidth, 390(상세 연 상태) → 390 = 390
- 키보드: Tab으로 `#project-filter`에 도달 → ArrowDown으로 winterairy/demo 선택 → 행 1개 → Tab으로 세션 링크 → Enter → URL에 `session=` 추가
- 응답 7종(projects, sessions all, 상세, skills, plan-usage, characters, hidden=only)에 `verify-pass`, `verify-token…`, `usage`, `cost`, `totals`, `pricing`, `cache_read` 없음. 화면 본문(390·1280)에 "토큰", "비용", `$숫자`, 비밀번호, 토큰 없음

스크린샷(`docs/team/reports/screens/qa/`, 테스트·샘플 데이터만): `qa-dev-1280.png`, `qa-dev-390.png`(개발 서버), `dashboard-1280.png`, `dashboard-390.png`, `dashboard-390-list.png`(E2E flow), `qa-waiting-order-1280.png`, `qa-plan-reached-1280.png`(QA 보강).

## 수용 기준 커버리지

표기: U=`tests/unit`, A=`tests/api`, S=`tests/script/statusline.test.ts`, E=`e2e`, D=개발 서버 직접 확인.

### T1-1 수집 API
| 기준 | 판정 | 근거 |
|---|---|---|
| 올바른 토큰·payload → 2xx, 저장 | PASS | A events "올바른 토큰과 payload면 202…" (memory·file 둘 다) |
| 헤더 없음·틀린 토큰 → 401, 저장 없음 | PASS | A "Authorization 헤더가 없으면 401…" + it.each, D |
| 서버 토큰 비었거나 16자 미만 → 401 server_token_invalid, 토큰 값 없음 | PASS | A "서버 OBSERVER_TOKEN이 %s이면…", U token "시작 경고는 토큰 값을 출력하지 않는다" |
| 틀린 토큰은 unauthorized만 | PASS | U "checkBearer: 맞는 토큰만 ok…", D |
| 5분 넘은 미래 ts → 서버 시각 | PASS | A "ts가 서버 시각보다 5분 넘게 미래면…" |
| v·event·ts·session_id 오류 → 400, 저장 없음 | PASS | A it.each 검증 실패 묶음 |
| JSON 아님 → 400 | PASS | A "JSON 배열·숫자도 400" 외, D |
| 크기 초과 → 413 | PASS | A "16KB를 넘으면 413…"(Content-Length 있음·없음) |
| 정의 안 된 필드 미저장 | PASS | A "prompt·tool_input 등 정의 안 된 필드는…" |
| usage·subagent.usage → 2xx, 토큰 수 없음 | PASS | A "subagent.usage가 든…", E observe.spec, E qa-stage1 |
| 저장소 교체 시 동작 같음 | PASS | A events `describe.each` memoryStore/fileStore, U "FileStore는 Store 인터페이스 구현이다". 코드 수정 불필요 여부는 설계 리뷰 몫 |
| 에러 응답에 토큰·스택 없음 | PASS | A "저장 실패는 500 internal이고 스택이 나오지 않는다", "검증 실패 응답·로그에 값이 아니라 경로만" |
| 다른 메서드 405 | PASS | A "%s는 405이고 Allow: POST", D |

### T1-2 상태 계산
| 기준 | 판정 | 근거 |
|---|---|---|
| S-01~S-14(S-11b, S-11c 포함) 단위 테스트 | PASS | U state "시나리오 S-01~S-14" 17개 |
| R1~R13(R11a) 각 1개 이상 | PASS | U state "전이표 R1~R13" |
| 시간 초과를 시각을 바꿔 검증 | PASS | U S-09·S-10·S-11, R11 (now 인자) |
| 같은 이벤트 두 번 → 같은 상태 | PASS | U "R3 멱등성…", "멱등성: 같은 Stop·SubagentStop·permission_prompt…" |

### T1-3 스킬·BOT 호출 기록
| 기준 | 판정 | 근거 |
|---|---|---|
| 같은 스킬 2, 다른 스킬 1 | PASS | U skills, A query "스킬 기록: 같은 스킬 2번…" |
| qa → qa, agent_id null → lead | PASS | A query 스킬 기록 byRole, D(`byRole:{qa:1}`) |
| P1·P2 섞이지 않음 | PASS | A query "…project·session 필터" |
| SubagentStop·SessionEnd 후 기록 유지 | PASS | U skills 1번째 테스트, U store "보관 한도…스냅숏(스킬)은 유지" |
| (Should) Agent(qa) → qa 1회 | PASS | U "Agent·Task 도구 호출…", E flow "qa ×1" |

### T1-4 로그인
| 기준 | 판정 | 근거 |
|---|---|---|
| 미로그인 화면 → 로그인 화면 | PASS | A "…/login?next=<경로>로 302", D |
| 미로그인 조회 API 401, 데이터 없음 | PASS | A "로그인하지 않으면 401이고 데이터가 없다", D |
| characters·그림·정리·다시 표시 401, public으로 못 받음 | PASS | A query "GET /api/characters…", "…/image…", "쿠키 없이 부르면 401", A auth "public 정적 경로…", D |
| 틀린 비밀번호 → 메시지, 쿠키 없음 | PASS | A "틀린 비밀번호는 401…", D |
| 맞는 비밀번호 → 열림 | PASS | A "맞는 비밀번호로 로그인하면 조회 API가 열린다", E uiLogin, D |
| 쿠키 위조 → 미로그인 | PASS | A "쿠키 값을 임의로 바꾸면…", U cookie |
| 로그아웃 후 401 | PASS | A "로그아웃하면 쿠키가 지워지고…", E flow 로그아웃 |
| 비밀번호 비면 로그인 안 됨 | PASS | U "비밀번호가 비었으면…", "verifyPassword…비밀번호가 비면 항상 false" |
| Bearer로 조회 안 열림 | PASS | A "Bearer 토큰으로는 조회 API가 열리지 않는다(D-16)", D |
| 6번째 실패 429 | PASS | A "1분 안에 6번째 실패 시도는 429…" |
| 전체 실패 20회 초과 거부 | PASS | A·U "IP와 관계없이 전체 실패…" |
| 다른 Origin POST 403 | PASS | A auth "Origin이 다른 호스트면 403", A query "정리·다시 표시는 Origin이…", D |
| 휴대폰 로그인 유지 | 미확인 | `[사용자 확인]` |

### T1-5 조회 API와 화면
| 기준 | 판정 | 근거 |
|---|---|---|
| 이벤트 후 3+1초 안에 화면 반영 | PASS | E flow "폴링: …3초 + 1초 안에…"(이 환경 3.9~4.1s, dev-notes에 느린 PC 주의) |
| 필터 P1 → P2 사라짐 | PASS | A query "프로젝트 필터 P1…", E 키보드·플랜 필터, D(행 2 → 1) |
| S-05 후 lead·qa, qa 완료로 남음 | PASS | A query "S-05 뒤 세션 상세에…" |
| 승인 대기 문구·기다린 시간, 목록 맨 위 | PASS | A query "승인 대기 세션이 맨 위…긴 순", E flow "승인 대기 · 2시간째", E qa-stage1, D |
| 24시간 넘은 승인 대기 "응답 없음" | PASS | A query "24시간 넘은 승인 대기는 stale…", U format "statusStyle: 응답 없음…". 화면 E2E는 서버 시계를 바꿀 수 없어 없음(dev-notes) |
| 정리 → 사라짐, 새 이벤트 → 다시 보임 | PASS | A query "정리하면 목록에서 사라지고…", U store, E flow 정리, D |
| 숨긴 세션 N개 보기(종료 포함) | PASS | A query "숨긴 세션은 hidden=only로…", E flow, D |
| 다시 표시 → 복귀, 숨긴 목록에서 빠짐 | PASS | 위 A, E flow "정리 → 숨긴 세션 N개 보기 → 다시 표시", D |
| 상세 스킬 횟수 = API | PASS | E flow "playwright-cli ×1"과 API 같은 시드, A query |
| usage 뒤 토큰·비용 없음 | PASS | E flow `not.toContainText(/토큰|비용|\$\d/)`, E qa-stage1(숫자까지), E observe, D |
| 사무실 BOT 수만큼 사각형, 상태 따라 바뀜 | PASS | E flow 구역 확인, E qa-stage1(칸 수 = BOT 수, thinking → working 책상), D |
| 사무실 계기판이 상단과 같은 값·상태 | PASS | E plan-usage-screen 2·3(만료·정상·한 창 없음 "–"), E qa-stage1(가까움·도달 아이콘), D(42/84 일치). 두 창 모두 없음일 때는 계기판을 그리지 않음 → QA-01 |
| 390·1280 가로 스크롤 없음 | PASS | E flow 2개 + 스크린샷, D |
| 세션 없으면 빈 상태 안내 | PASS | E plan-usage-screen "마지막 측정 42분 전(3101)" 안 "아직 받은 세션이 없습니다" |
| 응답에 토큰·비밀번호·쿠키 비밀값 없음 | PASS | A query "조회 API 응답에 토큰·비밀번호·쿠키 비밀값이 없다", D |
| 키보드만으로 필터·세션 선택 | PASS | E flow "키보드만으로 필터와 세션 선택", D |
| 실제 휴대폰 | 미확인 | `[사용자 확인]` |

### T1-6 캐릭터 설정
| 기준 | 판정 | 근거 |
|---|---|---|
| 예시 roles·캐릭터 설정 있음, 실제 그림 커밋 안 됨 | PASS | `config/roles.example.json`, `config/characters.example/`. `.gitignore` `/characters/`. `git ls-files`에 루트 characters 없음 (예시 테스트 그림 `sample/sheet.png`는 직접 만든 테스트 그림, QA-02) |
| null → lead, plugin:planner → planner, unknown-bot → 기본 | PASS | U characters roleKeyFor·roleInfoFor |
| sit_work 없으면 idle 줄·프레임 | PASS | U "sit_work가 없으면 idle 줄·프레임" |
| 그림 없음·JSON 깨짐 → 사각형, 나머지 정상 | PASS | A characters "설정이 깨졌거나 그림이 없거나…404", "roles.json이 깨져도 200", E flow(캐릭터 없는 역할은 사각형) |
| 한 칸 크기·프레임 수대로 자름 | PASS | E flow sprite `data-row=1`, `data-frames=2`, naturalWidth 32 |
| 사용자 그림 지정 | 미확인 | `[사용자 확인]` |

### T1-7 테스트
| 기준 | 판정 | 근거 |
|---|---|---|
| 명령 하나로 단위·API 통과 | PASS | `pnpm test` 417 passed |
| observe.mjs 통합: 완료 상태, 토큰 수 없음 | PASS | E observe.spec |
| statusLine 통합 42/13, resets_at | PASS | E plan-usage.spec 31 |
| 틀린 토큰 → 세션 없음 | PASS | E observe.spec |
| Playwright 흐름 통과, 스크린샷 2장 | PASS | E flow, `dashboard-1280.png`, `dashboard-390.png` |
| `.env`·실제 토큰 없음 | PASS | `git ls-files`는 `.env.example`뿐(값 비어 있음), `.gitignore` `.env.*`. 테스트 값은 실행할 때 무작위로 만듦 |
| 실제 로컬 세션 hook | 미확인 | `[사용자 확인]` |

### T1-8 플랜 사용량
수집 스크립트(설치 사본 `.claude/team/observe/statusline.mjs`)
| 기준 | 판정 | 근거 |
|---|---|---|
| 첫 실행 1회, 같은 값 1분 안 재전송 없음 | PASS | S "첫 실행 1회 전송…", "같은 값 1분 안 재실행 안 보냄…" |
| 바뀐 값 1분 안 안 보냄, 1분 뒤 1회 | PASS | S 같은 테스트, "decideSend…" |
| 같은 값은 얼마가 지나도 안 보냄 | PASS | S 같은 테스트(61초 후), decideSend |
| (멈춤) | PASS | S "(멈춤) 같은 stdin이면…" |
| (재개) | PASS | S "(재개) rate_limits 외 값만 바뀌어도…" |
| (세션별) | PASS | S "(세션별) A가 멈춘 동안 B는…" |
| refreshInterval 추가 안 함 | PASS | `.claude/settings.json` statusLine에 refreshInterval 없음, 스크립트에 문자열 없음. 설치기는 dev-team-kit 쪽이라 이 저장소에서 설치 과정은 보지 않음 |
| rate_limits 없음·JSON 아님 → 안 보냄, exit 0 | PASS | S "rate_limits 없음, JSON 아님…" |
| seven_day만 | PASS | S "seven_day만 있으면…" |
| 본문에 작업 폴더·transcript·모델·비용 없음 | PASS | S "첫 실행 1회 전송: …stdin의 경로·모델·비용 없음", "buildBody…" |
| 무응답 서버여도 1초 안에 exit 0 | PASS | S "응답하지 않는 서버로…" |
| URL 없음·DISABLE=1 → 안 보냄, 출력은 함 | PASS | S "URL 없음·DISABLE=1…" |
| 기존 statusLine 출력이 그대로 | PASS | S "statusline.json 없이 CLAUDE_CONFIG_DIR/settings.json의 statusLine을 감싼다", 멈춤 테스트 출력 비교. 설치기 동작은 dev-team-kit 쪽 |
| 기존 명령 실패·시간 초과 → exit 0 | PASS | S "exit 3 → 기본 한 줄…", "sleep 5 → 2.5초 안에…" |
| dev-team-kit에 스크립트·설치·문서 | 미확인 | 다른 저장소(winterairy/dev-team-kit)라 이 환경에서 확인하지 않음. 이 저장소 README는 dev-team-kit README를 가리킴 |

서버
| 기준 | 판정 | 근거 |
|---|---|---|
| 42/13 → 2xx, 같은 값·resets_at·수신 시각 | PASS | A planUsage "five_hour 42% / seven_day 13%를…" |
| 토큰 없음·틀림 → 401, 값 그대로 | PASS | A "Authorization 헤더가 없으면 401…" 외, E plan-usage "틀린 토큰…" |
| -1·101·문자열·비정수·창 없음 → 400, 값 그대로 | PASS | A planUsage 검증 it.each, U parsePlanReport |
| five_hour만 → seven_day 그대로 | PASS | A·U "five_hour만…" |
| 재시작해도 유지 | PASS | A "저장 → close() → 같은 폴더로 새 인스턴스 → GET 값 유지", E 3101(미리 써 둔 state.json) |
| D-27 | PASS | A "D-27 순서…", U mergePlanWindow 7개 |
| 쿠키 없이 조회 401 | PASS | A "쿠키 없이 GET 401…", D |

화면
| 기준 | 판정 | 근거 |
|---|---|---|
| 폴링+1초 안에 42%·13%, 초기화 시각·남은 시간 | PASS | E plan-usage-screen 3, D |
| "마지막 측정 N분 전", 경고·"오래됨" 없음 | PASS | E 3·"42분 전(3101)", U "수신 후 24시간이 지나도…ok", D("마지막 측정 4분 전") |
| 지난 resets_at → "초기화됨 — 다음 작업 때 갱신", 새 값이면 복귀 | PASS | E 2·3 |
| 값 없음 → "플랜 사용량 정보 없음"과 안내 | PASS | E 1 |
| 80%·100% 경고 글자 | PASS | E 4("한도 가까움", "한도 도달"), D(84% "한도 가까움") |
| 필터 바꿔도 같은 값 | PASS | E "프로젝트 필터를 바꿔도…" |
| 390·1280 가로 스크롤 없음 | PASS | E "390·1280에서…", D |
| 막대마다 사용률 글자(스크린 리더) | PASS | E 3·4 `role=meter` aria-valuenow·aria-valuetext, D |
| 실제 구독 계정 값이 `/usage`와 같음 | 미확인 | `[사용자 확인]` |
| 기존 statusLine PC 설치 | 미확인 | `[사용자 확인]` |
| 클라우드 세션 statusLine | 미확인 | `[사용자 확인]`(2단계) |

미확인 8개: 휴대폰 로그인, 휴대폰 화면, 사용자 그림, 실제 hook, 실제 구독 값, 기존 statusLine PC, 클라우드 statusLine, dev-team-kit 문서. 저장소 교체 시 코드 수정 불필요는 테스트 근거로 PASS로 셌고 설계 리뷰로 다시 볼 수 있다. refreshInterval·기존 출력 유지는 이 저장소의 스크립트와 설정으로 PASS로 셌고, dev-team-kit 설치기 실제 동작은 사용자 확인 표에 넣었다.

## 사용자 확인 필요
| 항목 | 확인 방법 |
|---|---|
| 휴대폰 브라우저에서 로그인 유지(T1-4) | 휴대폰으로 서버 주소에 로그인 → 브라우저 종료 후 다시 열어 로그인 화면 없이 대시보드가 보이는지 |
| 실제 휴대폰에서 화면(T1-5) | 같은 기기에서 목록 → 세션 선택 → 상세, 가로 스크롤 없는지 |
| 자기 그림을 BOT에 지정(T1-6) | `characters/<id>/`에 그림·설정, `characters/roles.json`에 역할 지정 → 새로고침 후 사무실에 프레임이 보이는지 |
| 실제 로컬 Claude Code hook(T1-7) | `AGENT_OBSERVER_URL`·`AGENT_OBSERVER_TOKEN` 설정 후 세션에서 프롬프트 1회 → 3~4초 안에 목록에 세션이 보이는지 |
| 구독 계정 플랜 값이 `/usage`와 같음(T1-8) | 작업 한 번 한 뒤 대시보드 5시간·주간 값과 Claude Code `/usage` 비교 |
| 기존 statusLine이 있는 PC 설치(T1-8) | 설치 전 상태 줄 문자열을 적어 두고 설치 후 같은 문자열이 그대로 보이는지, settings.json에 refreshInterval이 없는지 |
| 클라우드 세션 statusLine(T1-8, 2단계) | 배포 후 클라우드 세션에서 값이 오는지(`remote: true`) |
| dev-team-kit 저장소 문서(T1-8) | winterairy/dev-team-kit에 statusline 스크립트·설치 방법·기존 statusLine과 함께 쓰는 방법이 있는지 |

## 이슈
| ID | 심각도 | 내용 |
|---|---|---|
| QA-01 | Low | 두 창 모두 값이 없으면 사무실 계기판이 아예 그려지지 않는다. T1-5 수용 기준은 계기판이 "없음" 상태도 보인다고 하고, DESIGN.md 12절(3단계 벽 계기판)도 "두 창 모두 none이면 빈 칸 + –"이지만, 1단계 DESIGN.md 469행 PlanUsageMini는 "두 창 모두 none이면 띠를 그리지 않는다"이다. 구현(`src/ui/PlanUsage.tsx` `PlanUsageMini`의 `bothNone → null`)과 E2E("1. 없음… 계기판 없음")는 1단계 디자인을 따른다. 재현: 빈 서버에 세션 하나만 보내고 상세를 연다. 기대(수용 기준 문구): 계기판에 "–" 두 개. 실제: 계기판 없음, 상단 영역에 "플랜 사용량 정보 없음". 처리: 기획 문구와 디자인 중 하나로 맞추기(사용자에게 0%로 오해될 위험은 없음) |
| QA-02 | Low | 예시 테스트 그림 `config/characters.example/sample/sheet.png`가 커밋되어 있다. 수용 기준 "실제 그림 파일은 커밋되지 않는다"는 지켜지지만 DESIGN.md 8절 "이미지 파일을 저장소에 추가하지 않는다"와 문구가 부딪힌다(dev-notes 3차-나 5번에 이미 적혀 있음). 디자인 BOT·책임자 판단 필요 |

참고(이슈 아님): dev-notes에 적힌 대로 E2E 폴링 테스트가 이 환경에서 3.9~4.1초 걸려 4초 기준에 가깝다. 느린 PC에서는 가끔 실패할 수 있다.

## 재검증 결과
1단계 첫 QA라 이전 이슈 없음.
