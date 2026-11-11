name: agent-observer
status: draft            # draft(초안, 승인 대기) | approved(승인됨)
description: |
  여러 Claude Code 세션과 BOT의 상태·토큰·비용을 한눈에 보는 개인용 관찰 도구.
  무채색 표면 위에 상태 색 6가지만 의미를 갖고, 포인트 색(파랑)은 선택·주요 동작에만 쓴다.
  장식보다 정보 밀도와 상태 구분(색 + 아이콘 + 문구)을 우선한다. 라이트/다크 모두 지원한다.

colors:
  # 라이트 값. 다크 값은 2절 표. 컴포넌트는 반드시 CSS 변수 이름(--color-<역할>)으로만 참조한다.
  primary: "#2F5BD3"          # 주요 버튼, 링크, 선택된 세션·필터, 포커스 링
  primary-on: "#FFFFFF"       # primary 위의 텍스트
  canvas: "#F6F7F9"           # 페이지 배경
  surface: "#FFFFFF"          # 카드, 패널
  surface-elevated: "#FFFFFF" # 툴팁, 드롭다운(그림자로 구분)
  surface-sunken: "#EEF0F3"   # 표 머리줄, 임시 사무실 바닥, 스켈레톤
  ink: "#1A1D23"              # 제목, 본문
  ink-muted: "#5B6270"        # 보조 텍스트(시각, 브랜치, 단위)
  border: "#D5D9E0"           # 구분선, 카드 테두리(장식용, 대비 요구 없음)
  border-strong: "#8A919E"    # 입력창·버튼 테두리(비텍스트 3:1)
  success: "#166534"
  warning: "#7A4A00"
  danger: "#B42318"
  info: "#1D4ED8"
  # 상태 색: 각 상태는 fg(글자·아이콘)와 bg(배지 배경) 한 쌍
  status-working-fg: "#1D4ED8"
  status-working-bg: "#E6EEFF"
  status-thinking-fg: "#6D28D9"
  status-thinking-bg: "#F1EAFE"
  status-waiting-fg: "#7A4A00"
  status-waiting-bg: "#FFF4D6"
  status-stale-fg: "#B42318"
  status-stale-bg: "#FDECEA"
  status-done-fg: "#166534"
  status-done-bg: "#E7F6EC"
  status-ended-fg: "#5B6270"
  status-ended-bg: "#EEF0F3"

typography:
  # 외부 폰트 파일을 추가하지 않는다. 운영체제 기본 글꼴만 쓴다.
  font-display: "system-ui, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', 'Segoe UI', Roboto, sans-serif"
  font-body: "system-ui, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', 'Segoe UI', Roboto, sans-serif"
  font-mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'D2Coding', monospace"
  scale:          # 크기 / 줄간격 / 굵기 / 자간
    h1: "20px / 1.3 / 700 / -0.01em"     # 헤더 제목, 로그인 제목
    h2: "16px / 1.4 / 700 / 0"           # 패널 제목(세션 목록, 세션 상세, 합계, 사무실)
    h3: "14px / 1.4 / 600 / 0"           # 카드 안 제목(세션 이름, BOT 이름)
    body: "14px / 1.6 / 400 / 0"
    small: "13px / 1.5 / 400 / 0"
    caption: "12px / 1.4 / 500 / 0.01em" # 배지, 각주, 단위
    number: "14px / 1.4 / 500 / 0"       # 토큰·비용. font-variant-numeric: tabular-nums

spacing:
  base: "4px"
  scale: "4, 8, 12, 16, 24, 32, 48"

radius:
  sm: "4px"       # 배지, 사무실 사각형
  md: "6px"       # 버튼, 입력창, 선택 상자
  lg: "10px"      # 카드, 패널
  full: "9999px"  # 상태 점

shadow:
  sm: "0 1px 2px rgba(16,24,40,0.06)"     # 카드(라이트만)
  md: "0 4px 12px rgba(16,24,40,0.12)"    # 툴팁

breakpoints:
  mobile: "390px"     # 기준 폭. 0~767px는 한 열
  tablet: "768px"     # 768~1023px: 목록+상세 두 열, 합계·사무실은 아래
  desktop: "1280px"   # 1024px 이상: 세 영역 배치(명세 참조)
---

# agent-observer 디자인 시스템

## 1. 개요

- **제품 성격**: 개발자용 개인 관찰 대시보드(앱 화면만, 마케팅 페이지 없음)
- **사용자**: 사용자 한 명. PC(1280px 내외)에서 옆에 띄워 두고, 휴대폰(390px)에서 승인 대기를 확인한다.
- **분위기 키워드**: 차분함, 한눈에 읽힘, 정확함
- **피해야 할 인상**: 장난스러운 게임 화면, 과한 색, 알림 남발. 1단계 임시 사무실도 장식 없이 사각형으로만 표현한다.

## 2. 색상

- **사용 원칙**
  - 의미를 갖는 색은 상태 색 6가지(작업 중·생각 중·승인 대기·응답 없음·완료·종료)뿐이다. 그 외 표면은 무채색이다.
  - primary는 선택 상태, 포커스, 화면의 주요 동작(로그인 버튼)에만 쓴다.
  - 상태는 **색 + 아이콘 + 문구** 세 가지를 항상 함께 보인다(6절 "상태 표현"). 색만으로 구분하지 않는다.
  - danger는 오류 메시지와 "응답 없음" 상태에만 쓴다. "정리" 버튼은 위험 동작이 아니므로(되돌아옴) danger를 쓰지 않는다.
- **다크 모드**: 지원. `prefers-color-scheme: dark`를 따른다(수동 전환 버튼은 1단계 범위 밖). 값은 아래.

| 역할 | 라이트 | 다크 |
|---|---|---|
| primary | #2F5BD3 | #7EA2FF |
| primary-on | #FFFFFF | #0F1115 |
| canvas | #F6F7F9 | #0F1115 |
| surface | #FFFFFF | #171A21 |
| surface-elevated | #FFFFFF | #1F232C |
| surface-sunken | #EEF0F3 | #12151B |
| ink | #1A1D23 | #E8EAEE |
| ink-muted | #5B6270 | #A0A7B4 |
| border | #D5D9E0 | #2E3440 |
| border-strong | #8A919E | #6B7383 |
| success | #166534 | #6FD394 |
| warning | #7A4A00 | #FFC861 |
| danger | #B42318 | #FF8A80 |
| info | #1D4ED8 | #8FB1FF |
| status-working fg / bg | #1D4ED8 / #E6EEFF | #8FB1FF / #1B2640 |
| status-thinking fg / bg | #6D28D9 / #F1EAFE | #C4A8FF / #2A1F42 |
| status-waiting fg / bg | #7A4A00 / #FFF4D6 | #FFC861 / #3A2C0E |
| status-stale fg / bg | #B42318 / #FDECEA | #FF9A8F / #3D1A17 |
| status-done fg / bg | #166534 / #E7F6EC | #6FD394 / #15301F |
| status-ended fg / bg | #5B6270 / #EEF0F3 | #A0A7B4 / #242832 |

- **대비 검증** (WCAG 상대 휘도 공식으로 계산, 본문 4.5:1 / 비텍스트 3:1)

| 조합 | 라이트 | 다크 | 통과 |
|---|---|---|---|
| ink / canvas | 15.75 | 15.69 | O |
| ink-muted / canvas | 5.72 | 7.81 | O |
| ink-muted / surface | 6.13 | 7.20 | O |
| primary-on / primary | 5.90 | 7.65 | O |
| primary / surface (링크) | 5.90 | 7.05 | O |
| danger / surface | 6.57 | 7.63 | O |
| working fg / bg | 5.76 | 7.08 | O |
| thinking fg / bg | 6.07 | 7.57 | O |
| waiting fg / bg | 6.83 | 8.85 | O |
| stale fg / bg | 5.75 | 7.56 | O |
| done fg / bg | 6.38 | 7.75 | O |
| ended fg / bg | 5.37 | 6.09 | O |
| border-strong / surface (입력 테두리) | 3.17 | 3.65 | O (비텍스트) |

## 3. 타이포그래피

- **위계 원칙**: 한 화면에 h1(헤더 1개), h2(패널 제목), h3(카드 제목) 세 단계만 쓴다. 밀도 높은 도구라 본문은 14px.
- **한글 처리**: `word-break: keep-all; overflow-wrap: anywhere;`(긴 프로젝트 이름·브랜치·세션 ID가 가로 스크롤을 만들지 않게). 본문 줄간격 1.6.
- **긴 식별자**: 프로젝트·브랜치·모델 이름은 한 줄 말줄임(`text-overflow: ellipsis`)하고 `title` 속성으로 전체를 준다. 세션 ID는 font-mono로 앞 8자만 보인다.
- **숫자**: 토큰·비용·시간은 `font-variant-numeric: tabular-nums`, 표에서 오른쪽 정렬.
  - 토큰: 1,000 미만은 그대로, 이상은 `12.3K`, `1.2M`(소수 1자리). 표의 `title`에 전체 값(`12,285`).
  - 비용: `$0.0123`처럼 `$` + 소수 4자리(0.0001 미만은 `<$0.0001`). 추정이면 뒤에 "추정" 배지.
  - 시각: 상대 시간("3분 전", "2시간째"). `<time datetime>` + `title`에 현지 절대 시각.
- **글꼴 라이선스**: 운영체제 기본 글꼴만 쓴다. 웹폰트·폰트 파일을 추가하지 않는다(과업 조건). Pretendard 등은 쓰지 않는다.

## 4. 레이아웃

- **그리드**: CSS grid. 최대 폭 1440px, 좌우 여백 모바일 16px / 데스크톱 24px. 패널 사이 간격 16px(모바일 12px).
- **간격 리듬**: 컴포넌트 내부 8·12, 카드 안 여백 12(모바일)·16(데스크톱), 패널 사이 16, 섹션 사이 24.
- **여백 철학**: 정보가 많은 화면이므로 여백보다 정렬(숫자 오른쪽 정렬, 열 맞춤)로 정리한다.
- **고정 영역**: 헤더(높이 56px)는 상단 고정(`position: sticky`). 그 외는 스크롤.
- **가로 스크롤 금지**: 390px에서 어떤 요소도 뷰포트를 넘지 않는다. 표는 모바일에서 카드 목록 또는 정의 목록으로 바꾼다(9절).

## 5. 깊이와 표면

- 카드·패널은 `surface` + 1px `border`. 라이트는 shadow-sm을 더하고, 다크는 그림자 없이 테두리만.
- 툴팁은 `surface-elevated` + shadow-md(다크는 border).
- z-index: 기본 0, 헤더 10, 툴팁 20. 모달은 1단계에 없다.

## 6. 컴포넌트

CSS Module 파일 이름 기준. 모든 상호작용 요소는 포커스 링(아래)과 최소 터치 영역 44×44px(모바일)을 지킨다.

공통 포커스: `:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }` — outline을 지우지 않는다.
공통 비활성: 불투명도 0.5, `cursor: not-allowed`, `aria-disabled` 또는 `disabled`.

### 상태 표현 (StatusBadge) — 핵심 규칙

| 상태(API) | 문구 | 아이콘(인라인 SVG 16px, currentColor) | 색 토큰 | 추가 정보 |
|---|---|---|---|---|
| working | 작업 중 | **채운 오른쪽 삼각형(재생 모양)** | status-working | 현재 도구 이름: "작업 중 · Bash" |
| thinking | 생각 중 | **점 세 개(…)** | status-thinking | — |
| waiting | 승인 대기 | **원 안의 느낌표(!)** | status-waiting | 기다린 시간: "승인 대기 · 2시간째" |
| waiting + stale | 승인 대기 (응답 없음) | **삼각형 안의 느낌표** + 굵은 테두리 1px status-stale-fg | status-stale | "승인 대기 (응답 없음) · 26시간째" |
| done | 완료 | **체크(✓) 선** | status-done | — |
| ended | 종료 | **속 빈 원** | status-ended | — |

- 배지 형태: 높이 24px, 좌우 여백 8px, radius sm, 배경 `bg`, 글자·아이콘 `fg`, caption 글자, 아이콘과 글자 사이 4px.
- 아이콘은 `aria-hidden="true"`, 문구가 접근성 이름이다. 문구를 생략한 배지(아이콘만)는 만들지 않는다. 공간이 좁으면 추가 정보(도구 이름, 시간)를 줄 바꿈하거나 말줄임하고, 상태 문구는 줄이지 않는다.
- 기다린 시간 문구: 1분 미만 "방금", 60분 미만 "N분째", 24시간 미만 "N시간째", 그 이상 "N시간째"(일 단위로 바꾸지 않음, 24시간 경계를 그대로 드러냄).
- 기다린 시간은 응답의 `now`와 `waitingSince` 차이로 계산한다(클라이언트 시계 차이 방지).
- 움직임: 1단계에서 배지는 깜박이거나 움직이지 않는다.

### 승인 대기 강조 (WaitingBanner)
- 승인 대기 세션이 1개 이상이면 세션 목록 위에 띠를 보인다: 배경 status-waiting-bg, 왼쪽 4px 막대 status-waiting-fg, 아이콘(!) + "승인 대기 N개 세션" 문구(h3). 응답 없음이 섞여 있으면 "(응답 없음 M개 포함)"을 덧붙인다.
- `role="status"`, `aria-live="polite"`. 폴링마다 개수가 같으면 다시 읽히지 않도록 문구가 바뀔 때만 DOM을 갱신한다.
- 띠를 누르면 첫 승인 대기 세션을 연다(버튼 요소).

### 버튼 (Button)
| 종류 | 용도 | 배경 | 텍스트 | 테두리 | 높이 | radius |
|---|---|---|---|---|---|---|
| primary | 로그인 | primary | primary-on | 없음 | 40px | md |
| secondary | 정리, 다시 시도, 로그아웃 | surface | ink | 1px border-strong | 32px(데스크톱) / 40px(모바일) | md |
| ghost | 접기/펼치기, 닫기 | 투명 | ink-muted | 없음 | 32px / 40px | md |

- 호버: primary는 밝기 -8%(`filter` 대신 `color-mix(in srgb, var(--color-primary) 92%, black)`), secondary·ghost는 배경 surface-sunken.
- 눌림: 호버 색 + `transform: translateY(1px)`.
- 로딩: 글자를 "로그인 중…"으로 바꾸고 비활성.
- 다크 모드 primary 호버는 `color-mix(... 90%, white)`.

### 입력창·폼 (TextField, Select)
- 높이 40px(모바일 44px), 1px border-strong, radius md, 안쪽 여백 12px, body 글자, 배경 surface.
- 라벨은 입력창 위(small, 600, 아래 간격 4px). placeholder로 라벨을 대신하지 않는다.
- 포커스: 테두리 primary + 공통 포커스 링.
- 오류: 테두리 danger, 입력창 아래 4px에 small danger 문구, 입력에 `aria-invalid="true"` + `aria-describedby`로 문구 연결.
- 프로젝트 필터는 네이티브 `<select>`(키보드·모바일 지원을 브라우저에 맡긴다).

### 카드·패널 (Panel)
- surface, 1px border, radius lg, 여백 12/16px. 패널 머리: h2 제목 + 오른쪽 보조 동작.
- 카드 안에 카드를 넣지 않는다. 패널 안 항목은 구분선(1px border)으로 나눈다.

### 세션 목록 항목 (SessionRow)
- 버튼처럼 동작하는 행 전체(`<button>` 또는 `<a href="?session=…">`). 최소 높이 56px.
- 1줄: 프로젝트 이름(h3, 말줄임) + 클라우드 표시(`remote`가 true일 때 텍스트 배지 "클라우드": 1px border-strong 테두리, ink-muted 글자, 투명 배경)
- 2줄: StatusBadge + 브랜치(mono, small, ink-muted) + "BOT N" + 마지막 이벤트 상대 시간
- 오른쪽: "정리" secondary 버튼(행 버튼 안에 중첩하지 않도록 행은 `<li>` 안에 링크와 정리 버튼을 형제로 둔다).
- 선택됨: 왼쪽 3px primary 막대 + 배경 `color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))`, `aria-current="true"`.
- 승인 대기 행: 왼쪽 막대 status-waiting-fg(응답 없음은 status-stale-fg). 선택됨과 겹치면 막대는 상태 색, 배경은 선택 색.

### BOT 행 (AgentRow)
- 1줄: 표시 이름(h3) + 역할 키(caption, mono, ink-muted, 예: `qa`) + StatusBadge
- 2줄: 토큰 4항목 + 비용(데스크톱은 표의 열, 모바일은 정의 목록 2열)
- 3줄(있을 때): 스킬 칩 목록, 부른 BOT("qa ×1")

### 표 (DataTable) — 합계·토큰
- 머리줄 surface-sunken, caption 600 ink-muted. 행 높이 40px, 구분선 border. 숫자 열 오른쪽 정렬.
- `<table>` + `<caption>`(시각적으로 숨겨도 됨) + `<th scope="col">`.
- 390px에서는 표를 쓰지 않고 행마다 정의 목록(`<dl>`) 카드로 바꾼다.

### 칩 (Chip) — 스킬
- 높이 24px, radius sm, 1px border, caption, ink. "playwright-cli ×2". 줄 바꿈 허용(flex-wrap).

### 추정 표시 (EstimateTag)
- 비용 옆 caption 배지 "추정", 1px border-strong 테두리, ink-muted 글자, 배경 투명. `title="단가표에 없는 모델이라 기본 단가로 계산했습니다"`.

### 각주·안내 (Note)
- small, ink-muted, 앞에 "i" 원 아이콘(aria-hidden). 비용 안내 문구 고정:
  "API 환산 비용은 같은 사용량을 API로 썼을 때의 금액입니다. 실제 청구액이 아닙니다. 단가 기준일 {asOf}"
  + 출처 링크 "단가 출처"(`source`, 새 탭, `rel="noreferrer"`).

### 피드백
- **로딩**: 첫 로딩만 스켈레톤(surface-sunken 사각형, 애니메이션 없음 또는 reduced-motion이 아니면 opacity 1.5s 왕복). 폴링 갱신은 화면을 비우지 않고 조용히 바꾼다.
- **오류 띠 (ErrorBar)**: 패널 위 또는 헤더 아래. status-stale-bg 배경, danger 글자, 아이콘(삼각형 !), 문구 + "다시 시도" secondary 버튼. `role="alert"`.
- **연결 상태 (SyncIndicator)**: 헤더 오른쪽 caption "3초마다 갱신 · 방금" / 실패 시 "갱신 실패 · 30초 전 데이터". 아이콘 + 문구.
- 토스트·모달은 쓰지 않는다.

### 아이콘
- 아이콘 라이브러리를 쓰지 않는다. 상태 아이콘 6종 + 정보(i) + 클라우드 정도만 인라인 SVG 컴포넌트로 직접 만든다(16px, 선 1.5px 또는 채움, currentColor).
- 텍스트와 간격 4px. 장식 아이콘은 `aria-hidden="true"`.

### 임시 사무실 (OfficeFloor, OfficeDesk, OfficeAvatar)
- 1단계 임시 표현. **원본 Pixel Agent Desk 그림을 참고하거나 본뜨지 않는다.** 단색 사각형과 글자만 쓴다.
- 바닥: surface-sunken, radius lg, 여백 12px. 세 구역을 위에서 아래로: "승인 대기"(waiting), "책상"(working·thinking), "쉬는 곳"(done). ended는 표시하지 않는다.
- 구역 이름: caption 600 ink-muted, 구역 사이 1px 점선 border.
- 아바타: 40×40px 사각형(radius sm), 배경 = 상태 bg, 2px 테두리 = 상태 fg, 가운데 상태 아이콘(20px, fg). 아래에 표시 이름(caption, 말줄임 최대 72px) + 상태 문구(caption). 칸 너비 80px.
- 책상 구역은 아바타 아래에 책상 표시(40×8px, border-strong 단색 막대)를 둔다. working은 책상에 붙어(간격 0), thinking은 8px 떨어져 놓는다 — 위치 차이 + 문구로 구분.
- 캐릭터 설정이 있으면(`ok:true`) 사각형 대신 프레임 그림(`background-image`, `image-rendering: pixelated`)을 같은 칸 크기로 넣고, 테두리·상태 문구는 그대로 둔다.
- 움직임: 상태가 바뀌어 구역이 바뀌면 그냥 다시 그린다(이동 애니메이션은 3단계). working일 때 아이콘만 `opacity` 1↔0.6 1.2s 왕복(`prefers-reduced-motion: reduce`면 끔).
- 접근성: 바닥은 `role="img"`가 아니라 목록(`<ul aria-label="임시 사무실">`)으로 마크업한다. 각 아바타는 "{표시 이름}, {상태 문구}" 텍스트가 보인다. 아바타는 포커스 대상이 아니다(같은 정보가 BOT 목록에 있음).

## 7. 움직임

- 지속 시간 150ms(호버·배경), 그 외 없음. 가속 곡선 ease-out.
- 움직임은 상태 변화 설명에만 쓴다. `prefers-reduced-motion: reduce`면 모든 transition·animation을 끈다.

## 8. Do / Don't

### Do
- 상태는 언제나 색 + 아이콘 + 문구로 보인다.
- 비용 옆에는 항상 "API 환산 비용" 이름과 실제 청구액 아님 안내를 같은 화면에 둔다.
- 빈 상태에는 다음 행동(설정 방법)을 문구로 안내한다.
- 긴 이름은 말줄임 + `title`. 가로 스크롤을 만들지 않는다.

### Don't
- colors에 없는 색, 그라데이션, 장식 그림자를 쓰지 않는다.
- 아이콘만으로 상태를 나타내지 않는다. 배지를 깜박이게 하지 않는다.
- 외부 폰트·이미지·아이콘 파일을 추가하지 않는다.
- 원본 Pixel Agent Desk 그림을 쓰거나 본뜨지 않는다.
- 프롬프트·응답·도구 입력을 화면에 보이지 않는다(수집하지 않음).

## 9. 반응형

- **모바일(<768, 기준 390)**: 한 열. 순서: 헤더 → 필터 → 승인 대기 띠 → 세션 목록 → (세션 선택 시) 세션 상세 → 임시 사무실 → 합계. 표는 정의 목록 카드로.
- **태블릿(768~1023)**: 위 두 열(목록 320px | 상세 나머지), 아래 한 열(사무실, 합계).
- **데스크톱(≥1024, 기준 1280)**: 명세 문서의 1280 배치.
- **터치 영역**: 모바일에서 버튼·행·선택 상자 최소 44×44px.

## 10. 기술 매핑

- **UI 라이브러리**: 없음. CSS Modules(`*.module.css`) + 전역 `src/app/tokens.css`(CSS 변수) + `globals.css`(리셋, 글꼴, 포커스).
- **토큰 위치**: `tokens.css`의 `:root`(라이트)와 `@media (prefers-color-scheme: dark) { :root { … } }`(다크). `color-scheme: light dark` 지정.
- **토큰 이름 규칙**: `--color-<역할>`(예 `--color-status-waiting-fg`), `--space-1`(4px)~`--space-7`(48px) = 4·8·12·16·24·32·48, `--radius-sm|md|lg|full`, `--shadow-sm|md`, `--font-body|mono`, `--text-<단계>-size/-line/-weight`.
- 상태 → 토큰 매핑은 한 곳(`statusStyle(status, stale)`)에 두고 StatusBadge·SessionRow·OfficeAvatar가 같이 쓴다.

## 11. 레퍼런스

이번 초안은 외부 디자인 레퍼런스(이미지, 다른 제품의 DESIGN.md, 폰트·아이콘 세트)를 가져오지 않았다. 과업 조건이 "외부 이미지·폰트 파일 추가 금지"였고 `docs/design-refs/`도 없어서, 실제 기준은 공개 접근성 표준과 널리 쓰이는 웹 관례뿐이다. 특정 제품 화면을 열어 보고 따라 한 것은 없다.

### 11.1 실제로 기준으로 삼은 것

| 영역 | 레퍼런스 | 가져온 것 | 다르게 한 것 |
|---|---|---|---|
| 색 대비 | WCAG 2.2 대비 기준 1.4.3·1.4.11 — https://www.w3.org/TR/WCAG22/#contrast-minimum | 상대 휘도 공식, 본문 4.5:1과 비텍스트 3:1 기준. 2절 표의 값은 이 공식으로 직접 계산했다 | 기준보다 여유를 두어 모든 텍스트 조합을 5.3:1 이상으로 잡았다 |
| 상태 표현 | WCAG 2.2 1.4.1 색 사용 — https://www.w3.org/TR/WCAG22/#use-of-color | 색만으로 정보를 전달하지 않는다는 원칙 → 색 + 아이콘 + 문구 세 겹 | 상태마다 아이콘 모양 자체를 다르게 했다(원/삼각형 등). 색맹 시뮬레이션은 하지 않았다 |
| 탭(합계) | WAI-ARIA Authoring Practices, Tabs 패턴 — https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ | `tablist/tab/tabpanel` 역할, 화살표·Home/End 이동, 자동 활성 | 탭은 두 개뿐이라 세로 방향·수동 활성 같은 변형은 쓰지 않았다 |
| 포커스·키보드 | WCAG 2.2 2.4.7 포커스 표시, 2.4.3 포커스 순서, 2.4.1 블록 건너뛰기 | 보이는 포커스 링, DOM 순서 = Tab 순서, "본문으로 건너뛰기" 링크 | 포커스 링 색은 primary 하나로 정했다(별도 포커스 색 없음) |
| 터치 영역 | WCAG 2.2 2.5.5 대상 크기(AAA, 44×44 CSS px) — https://www.w3.org/TR/WCAG22/#target-size-enhanced | 모바일 최소 44×44px | 데스크톱은 밀도를 위해 32px 버튼을 허용했다(AA 2.5.8의 24px 이상은 만족) |
| 움직임 | CSS `prefers-reduced-motion` 미디어 기능(Media Queries Level 5) | 줄이기 설정 시 움직임 끔 | — |
| 다크 모드 | CSS `prefers-color-scheme`, `color-scheme` 속성 | 시스템 설정을 따름 | 수동 전환은 넣지 않았다(미결 사항) |
| 글꼴 | 각 운영체제 기본 글꼴(system-ui, Apple SD Gothic Neo, Malgun Gothic, Noto Sans KR) | 파일을 추가하지 않고 한글을 표시하는 시스템 글꼴 스택 | 웹폰트(Pretendard 등)는 조건 때문에 쓰지 않았다 |
| 표 마크업 | HTML 표준 `<table>`·`<caption>`·`<th scope>`, 네이티브 `<select>`·`<details>` | 브라우저 기본 접근성 동작을 그대로 쓴다 | — |

### 11.2 레퍼런스 없이 직접 정한 것

| 결정 | 근거 |
|---|---|
| 상태 색 배정(작업 중 파랑, 생각 중 보라, 승인 대기 앰버, 응답 없음 빨강, 완료 초록, 종료 회색) | 레퍼런스 없음, 이유: 특정 시스템을 따르지 않았다. "앰버 = 주의, 빨강 = 문제, 초록 = 끝남, 회색 = 비활성"이라는 일반 관례에 맞춰 직접 골랐고, 값은 대비 계산으로만 검증했다 |
| 상태 아이콘 6종 모양 | 레퍼런스 없음, 이유: 아이콘 세트 추가가 금지돼 있어 단순한 도형(재생 삼각형, 점 셋, 원 안 느낌표, 삼각형 안 느낌표, 체크, 속 빈 원)으로 직접 정했다 |
| 무채색 표면 + 포인트 색 하나 | 레퍼런스 없음, 이유: 개발자용 대시보드에서 흔한 방식이라는 일반 지식에 기댔을 뿐, 특정 제품을 보고 정하지 않았다 |
| 배치(1280 3열 목록 | 상세 | 사무실·합계, 390 한 열) | 레퍼런스 없음, 이유: 일반적인 목록-상세 패턴을 HANDOFF 8절 요구(한 페이지 `/`, `?session=`)에 맞춰 직접 배치했다 |
| 글자 크기(본문 14px)·간격(4px 단위)·모서리 값 | 레퍼런스 없음, 이유: 정보 밀도를 우선해 직접 정했다 |
| 컴포넌트 형태(SessionRow, WaitingBanner, AgentRow 등) | 레퍼런스 없음, 이유: HANDOFF T1-5 요구와 API 응답 필드(5절)에서 직접 도출했다 |
| 임시 사무실(단색 사각형, 세 구역, 책상 막대) | 레퍼런스 없음, 이유: HANDOFF T1-5·설계 8절의 "단색 사각형, 책상 줄/대기 줄/경고 표시"만 기준으로 했다. **원본 Pixel Agent Desk 그림·화면은 보지도 참고하지도 본뜨지도 않았다** |

### 11.3 후보(미적용)

사용자가 원하면 비교해 볼 만한 공개 디자인 시스템이다. 이번 초안에는 반영하지 않았고, 원문도 읽지 않았다. 반영하려면 외부 자료 참고 허가가 필요하다.

| 후보 | 공개 URL | 비교해 볼 점 |
|---|---|---|
| GitHub Primer | https://primer.style | 개발자 도구의 상태 배지·라벨 색 체계, 촘촘한 목록 밀도 |
| IBM Carbon Design System | https://carbondesignsystem.com | 상태 표시를 색과 모양으로 함께 구분하는 규칙, 데이터 표 패턴 |
| awesome-design-md 컬렉션(개발자 도구 계열 항목) | https://github.com/VoltAgent/awesome-design-md | 팀 기본 절차의 초안 레퍼런스 출처. 어울리는 항목 2~3개를 골라 조합해 볼 수 있다 |

## 12. 미결 사항

- 다크 모드 수동 전환 여부(1단계는 시스템 설정만).
- 정리한 세션을 다시 보는 화면(API `ended=all`) 제공 여부 — 1단계 명세에는 "숨긴 세션 보기" 토글을 넣지 않았다.
- 3단계 사무실 그림이 정해지면 6절 임시 사무실 항목을 교체한다.
