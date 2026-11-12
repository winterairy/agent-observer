# 디자인 리뷰: 1단계 화면 (3차-나)

- 날짜: 2026-11-12
- 기준: DESIGN.md (status: approved), docs/team/design-spec-stage1.md
- 판정: **PASS** (High 0, Medium 0, Low 2)

## 검증한 환경
- 서버: 책임자가 띄운 `next dev` http://127.0.0.1:3000 (검증용 비밀번호). 보안 점검 중 서버가 잠시 모든 경로 500이었고, 재시작 뒤 전부 다시 캡처했다.
- 브라우저: Chromium 1243 (`/opt/pw-browsers/chromium-1243`), Playwright 1.65 스크립트, `colorScheme` light/dark 에뮬레이션.
- 너비: 1280, 768, 390 (높이 900, fullPage).
- 데이터: 기존 샘플(승인 대기 세션 winterairy/demo, 생각 중 세션 winterairy/other, 플랜 사용량 42% / 84%). 숨긴 세션 확인을 위해 winterairy/other를 "정리"했다가 화면에서 "다시 표시"로 되돌렸다(데이터는 원래 상태로 돌아감).
- 스크린샷 폴더: `docs/team/reports/screens/design/`

| 파일 | 내용 |
|---|---|
| login-{1280,768,390}-{light,dark}.png | 로그인 화면 |
| login-error-1280-{light,dark}.png | 잘못된 비밀번호(401) |
| dashboard-{1280,768,390}-{light,dark}.png | 대시보드(1280은 첫 세션 자동 선택) |
| dashboard-detail-390-{light,dark}.png | 390 세션 선택 후 |
| focus-skip-1280-light.png, focus-4th-1280-light.png | 포커스 링(건너뛰기 링크, 프로젝트 선택 상자) |
| hidden-sessions-{1280-light,390-dark}.png | 숨긴 세션 펼침 |
| hidden-sessions-restored-{1280-light,390-dark}.png | 마지막 숨긴 세션을 다시 표시한 뒤("0개 접기" + 빈 문구) |
| dashboard-expanded-1280-light.png | 접기 버튼 모두 펼침(이 데이터에는 종료·숨긴 세션이 없어 dashboard-1280-light와 같음) |

참고: dashboard-detail-390-*.png에서 헤더가 화면 중간에 겹쳐 보이는 것은 fullPage 캡처 중 sticky 헤더가 함께 찍힌 것으로, 실제 화면 문제가 아니다. 왼쪽 아래 "N" 원은 Next.js 개발 표시이고 제품 화면이 아니다.

## 항목별 결과

| 항목 | 결과 | 근거 |
|---|---|---|
| 색 토큰 | 통과 | 1280 라이트·다크, 390 다크에서 계산된 색(글자·배경·테두리)을 모두 모아 DESIGN.md 2절 hex와 대조했다. 기준에 없는 색은 Next.js 개발 표시(#000, #757575)뿐이다. 그라데이션 없음. 다크 그림자 없음 |
| 대비 | 통과 | 쓰인 조합이 모두 2절 대비 표에 있는 토큰 쌍이다. 사무실 안 글자는 다크에서도 라이트 ink(#262a3b) / office-floor-a(#d9d5bd) |
| 상태 표현 | 통과 | 승인 대기(원 안 !, 머스터드, "승인 대기 · 3분째"), 생각 중(점 세 개, 자두색), 작업 중(삼각형, 파랑, "작업 중 · Skill")이 모두 색 + 아이콘 + 문구. 승인 대기 행 왼쪽 막대 status-waiting-fg, 선택은 surface-selected 배경. 작업 중 행에 막대 없음 |
| 플랜 사용량 | 통과 | 채움 색: 정상 meter-normal(라이트 #8b8570, 다크 #aca794), 한도 가까움 meter-near(#b86e00 / #e6a23c). 84%에 "한도 가까움" 배지(원 안 !, status-waiting 쌍). "마지막 측정 N분 전" 두 창 모두 항상 표시. `role="meter"` + `aria-valuetext`("84%, 한도 가까움, …"). 1280·768은 2열, 390은 위아래 + 메타 2줄 |
| 플랜 5상태 | 일부만 화면 확인 | 이번 데이터에서는 ok+normal, ok+near만 봤다. reached·expired·none·두 창 none은 E2E `plan-screen`(7개 통과, dev-notes 3차-나)이 다룬다. 이번 리뷰에서 직접 보지는 않았다 |
| 승인 대기 띠 위치 | 통과 | 모든 너비에서 헤더 → 승인 대기 띠 → 플랜 사용량 → 필터 순서. 전체 폭, 왼쪽 4px 막대, 버튼(Tab 3번째) |
| 임시 사무실 | 통과 | 구역 "승인 대기 / 책상 / 쉬는 곳"(빈 구역 "쉬는 곳 없음"), 40px 사각형 + 2px 상태 테두리 + 아이콘, working은 책상 막대(office-furniture)에 붙음. PlanUsageMini "5h / 7d" 막대 + near 아이콘. 다크에서 바닥·글자 라이트 값 유지, 2px office-edge(#9d9879) 테두리는 다크에서만 |
| 글꼴 | 통과 | `document.fonts`에서 pretendard 로드됨, body font-family 맨 앞 pretendard. 제목 h1 20/600, h2 16/600, h3 14/600. mono는 브랜치·역할 키·모델·세션 ID에만 |
| 간격·모서리 | 통과 | 쓰인 radius는 4·6·8px(+0)뿐. 패널 사이 16px, 좌우 24px(1280) / 16px(390) |
| 포커스 링 | 통과 | 모든 Tab 대상이 `outline: 2px solid #262a3b`, offset 2px (focus-ring = ink). primary를 쓰지 않음 |
| 키보드 순서(1280) | 통과 | 본문으로 건너뛰기 → 로그아웃 → 승인 대기 띠 → 프로젝트 → [세션 링크 → 정리] × 2 → 상세 정리. 플랜 사용량·사무실은 Tab에 없음. 로그인은 진입 시 비밀번호에 포커스 |
| 390 선택 후 포커스 | 통과 | 세션을 누르면 "세션 상세" 제목으로 포커스, "목록으로" 버튼이 정리 앞에 있다 |
| 숨긴 세션 | 통과 | "숨긴 세션 1개 보기/접기" ghost 버튼(1280 높이 32px, 390 44px), 숨긴 행은 상태 막대 없이 배지 유지, "다시 표시" secondary(32 / 44px). 마지막 행을 되돌리면 "숨긴 세션 0개 접기" + "숨긴 세션이 없습니다."이고, 포커스는 접기 버튼으로 간다(명세 3.6.1) |
| 빈 상태 | 일부 확인 | 상세 "위 목록에서 세션을 고르세요."(390) / "왼쪽 목록에서 세션을 고르세요."(768), 사무실 "세션을 고르면 BOT이 보입니다.", 숨긴 세션 빈 문구는 확인했다. 세션 0개 화면과 ErrorBar는 데이터를 비울 수 없어 이번에 보지 않았다(E2E flow가 다룸) |
| 가로 스크롤 | 통과 | 모든 너비·모드에서 scrollWidth = clientWidth (1280/768/390, 390 상세 열린 상태 포함) |
| 터치 영역(390) | 통과 | 로그아웃·정리·다시 표시·접기 버튼 44px, select 44px |

## 이슈

| ID | 심각도 | 위치 | 기대 | 실제 | 수정 제안 | 스크린샷 |
|---|---|---|---|---|---|---|
| DES-01 | Low | 로그인 401 직후 비밀번호 입력창 (`app/login/*`) | DESIGN.md 6절 입력창: 오류일 때 테두리 danger | 401 뒤 입력창에 바로 포커스가 가서 focus-ring(ink) 테두리와 링만 보이고 danger 테두리가 보이지 않는다. 오류 문구(danger)와 `aria-invalid`는 있어 정보 손실은 없다 | 오류 상태에서는 포커스 중에도 테두리를 danger로 두고 바깥 링만 focus-ring으로(`[aria-invalid=true]` 규칙을 :focus 규칙 뒤에) | login-error-1280-light.png, login-error-1280-dark.png |
| DES-02 | Low | 1280 상세 BOT 목록 | 명세 5절 "1280: DataTable" | AgentRow 목록(560px 규칙) | 코드 수정 없음. 아래 (a) 결정으로 명세를 고쳐 해결 | dashboard-1280-light.png |

High·Medium 이슈는 없다.

## 개발 BOT 질문에 대한 결정

### (a) 1280에서 BOT 목록: 표 vs AgentRow → **560px 컨테이너 규칙이 기준. 1280은 AgentRow**
- 이유: 1280에서 가운데 열은 1280 − 48(좌우) − 720(양쪽 열) − 32(열 간격) = 약 480px, 패널 안쪽은 약 448px이다. 이 폭에 BOT | 상태 표 + 스킬 보조 행을 넣으면 "작업 중 · {도구}" 배지와 칩이 줄바꿈되어 표의 장점(열 맞춤)이 사라진다. 560px 규칙은 이런 이유로 만든 것이고, 명세 5절의 "1280: DataTable"은 계산을 잘못한 것이다. 양쪽 열 360px과 3열 배치는 승인된 배치이므로 바꾸지 않는다.
- 문서 변경:
  - DESIGN.md 6절 DataTable: "기준 폭 1280에서는 가운데 열이 약 480px라 AgentRow가 기준 화면이고, 표는 가운데 열 560px 이상(창 약 1360px 이상)에서만 보인다"를 덧붙였다.
  - design-spec-stage1.md 3.2 마지막 항목, 3.7 BOT 목록 첫 항목, 5절 표 "BOT 목록" 행을 같은 내용으로 고쳤다.
- 구현은 이미 이 결정과 같아서 코드를 고칠 필요가 없다.

### (b) `config/characters.example/sample/sheet.png` 커밋 → **기준 문구를 고친다(예외 추가)**
- 이유: 8절 금지 항목은 화면 자산(그림·아이콘)과 외부 그림이 공개 저장소에 들어가는 것을 막으려는 규칙이다. HANDOFF T1-6은 예시 설정과 직접 만든 테스트 그림을 요구한다. 이 파일은 코드로 만든 144바이트짜리 단색 사각형이라, 막으려던 위험(외부 그림·복제·화면 자산)에 해당하지 않는다.
- 문서 변경: DESIGN.md 8절 Don't의 예외 목록에 (2)를 더했다. "캐릭터 설정 형식을 보이고 테스트하기 위한 예시 그림 `config/characters.example/*/sheet.png`. 코드로 만든 단색 사각형만 허용(본뜬 모양·외부 그림 금지, 12.8 칸 크기만 맞춤). 화면 자산이 아니며 기본 설정에서 쓰지 않는다. 근거 HANDOFF T1-6."
- 실제 그림을 넣는 `characters/`(루트)는 계속 gitignore 대상이고, 이 예외에 들어가지 않는다.

## 확인하지 못한 것
- 플랜 사용량 reached·expired·none·두 창 none, 세션 0개 빈 상태, ErrorBar, 응답 없음(stale) 배지: 이번 데이터로는 화면에서 보지 않았다(E2E 범위).
- 실제 휴대폰 기기, 화면 낭독기 실제 읽기.
