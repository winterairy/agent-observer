---
name: agent-observer
status: approved         # draft(초안, 승인 대기) | approved(승인됨). 2026-11-11 사용자 승인(색 v3, 다크 사무실, Pretendard, 로그인 각주, 숨긴 세션). 12절 사무실 시각 방향도 승인(3단계 세부는 3단계 기획 때 정함)
description: |
  여러 Claude Code 세션과 BOT의 상태·토큰·비용을 한눈에 보는 개인용 관찰 도구.
  색 계열은 "따뜻한 크림색 사무실"이다(사용자 제공 분위기 참고 이미지에서 색 계열만 가져옴, 11절). 크림 표면, 남색 잉크, 주황빨강(테라코타) 포인트, 머스터드·초록은 사무실 그림 영역에서만 쓴다.
  포인트 색(primary)은 주요 버튼·탭 선택 막대에만 쓰고, 포커스 링과 선택 막대는 남색 잉크로 칠해 상태 색과 겹치지 않게 한다.
  장식보다 정보 밀도와 상태 구분(색 + 아이콘 + 문구)을 우선한다. 라이트/다크 모두 지원한다.
  사무실 영역(OfficeFloor, 3단계 사무실 그림)은 다크 모드에서도 라이트 값을 그대로 쓴다(2절 "사무실 영역은 항상 밝게").

colors:
  # 라이트 값. 다크 값은 2절 표. 컴포넌트는 반드시 CSS 변수 이름(--color-<역할>)으로만 참조한다.
  primary: "#A8431D"          # 포인트 색(테라코타). 주요 버튼 배경, 탭 선택 막대. 포커스 링·선택 막대에는 쓰지 않는다
  primary-hover: "#8C3714"    # primary 버튼 호버
  primary-on: "#FFFFFF"       # primary 위의 텍스트
  focus-ring: "#262A3B"       # 포커스 링 (= ink)
  selected-bar: "#262A3B"     # 선택된 세션 행 왼쪽 막대 (= ink)
  canvas: "#F6F2E6"           # 페이지 배경(크림)
  surface: "#FFFDF7"          # 카드, 패널(거의 흰 크림)
  surface-elevated: "#FFFDF7" # 툴팁, 드롭다운(그림자로 구분)
  surface-sunken: "#EDE8D7"   # 표 머리줄, 스켈레톤, 호버 배경
  surface-selected: "#E7E1CB" # 선택된 세션 행 배경(막대와 함께 씀)
  ink: "#262A3B"              # 제목, 본문(남색 잉크)
  ink-muted: "#5C5949"        # 보조 텍스트(시각, 브랜치, 단위). 따뜻한 회색
  border: "#DDD6BF"           # 구분선, 카드 테두리(장식용, 대비 요구 없음)
  border-strong: "#8B8570"    # 입력창·버튼 테두리(비텍스트 3:1)
  success: "#2A6331"
  warning: "#6E5000"
  danger: "#AE1F40"           # 진홍(장미 쪽 빨강). primary 테라코타와 색상각 30도 떨어뜨림
  info: "#2A4FBF"             # = status-working-fg. 1단계 화면에서는 작업 중 상태 외에 쓰지 않는다
  # 상태 색: 각 상태는 fg(글자·아이콘)와 bg(배지 배경) 한 쌍
  status-working-fg: "#2A4FBF"
  status-working-bg: "#E7EDFC"
  status-thinking-fg: "#7A3592"
  status-thinking-bg: "#F4E9F7"
  status-waiting-fg: "#6E5000"
  status-waiting-bg: "#FBEFC6"
  status-stale-fg: "#AE1F40"
  status-stale-bg: "#FBE7EB"
  status-done-fg: "#2A6331"
  status-done-bg: "#E5F2E2"
  status-ended-fg: "#5C5949"
  status-ended-bg: "#ECE8DA"
  # 사무실 영역 전용(OfficeFloor 안에서만 쓴다. 패널·버튼·텍스트 색으로 쓰지 않는다)
  # 다크 모드 값이 없다: 라이트·다크 모두 아래 값 하나만 쓴다(2절 "사무실 영역은 항상 밝게")
  office-wall: "#E9E5CE"          # 벽면
  office-wall-trim: "#CFC8A1"     # 벽 아래 띠, 기둥 옆면
  office-floor-a: "#D9D5BD"       # 바닥 밝은 칸. 1단계 임시 사무실 바닥 단색. 바닥 위 글자는 이 칸 위에만
  office-floor-b: "#BCB797"       # 바닥 어두운 칸(체크 무늬 교차용). 위에 글자를 두지 않는다
  office-edge: "#9D9879"          # 방 외곽 그림자, 벽 아래 그림자
  office-accent: "#CF6236"        # 소파 등 큰 가구 포인트(테라코타 밝은 값). 장식 전용
  office-accent-shade: "#A33D1C"  # office-accent의 그늘면
  office-mustard: "#D8C362"       # 탁자, 방석
  office-mustard-light: "#F5E0A6" # 러그, 방석 밝은 면
  office-plant: "#6B8E34"         # 화분 잎 그늘
  office-plant-light: "#A6CB6E"   # 화분 잎 밝은 면
  office-furniture: "#363B55"     # 남색 가구(서랍장, 책상). 1단계 임시 책상 막대
  office-wood: "#8C6D55"          # 나무 가구, 화분 받침

typography:
  # 본문·제목: Pretendard 가변 웹폰트(SIL OFL 1.1) 한 파일을 저장소에 두고 next/font/local로 읽는다(3절 "웹폰트").
  # var(--font-pretendard)는 next/font가 만드는 변수. 뒤의 시스템 글꼴은 로딩 전·실패 시 대체 글꼴
  font-display: "var(--font-pretendard), system-ui, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', 'Segoe UI', Roboto, sans-serif"
  font-body: "var(--font-pretendard), system-ui, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', 'Segoe UI', Roboto, sans-serif"
  # 모노: 시스템 기본 유지(폰트 파일 없음)
  font-mono: "ui-monospace, SFMono-Regular, Menlo, Consolas, 'D2Coding', monospace"
  scale:          # 크기 / 줄간격 / 굵기 / 자간
    h1: "20px / 1.3 / 600 / -0.01em"     # 헤더 제목, 로그인 제목
    h2: "16px / 1.4 / 600 / -0.005em"           # 패널 제목(세션 목록, 세션 상세, 합계, 사무실)
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
  lg: "8px"       # 카드, 패널
  full: "9999px"  # 상태 점

shadow:
  sm: "0 1px 1px rgba(16,24,40,0.02), 0 2px 2px rgba(16,24,40,0.04)"                                  # 카드(라이트만, 테두리와 함께)
  md: "0 1px 1px rgba(16,24,40,0.02), 0 8px 16px -4px rgba(16,24,40,0.08), 0 24px 32px -8px rgba(16,24,40,0.10)"  # 툴팁(작은 그림자 여러 겹)

breakpoints:
  mobile: "390px"     # 기준 폭. 0~767px는 한 열
  tablet: "768px"     # 768~1023px: 목록+상세 두 열, 합계·사무실은 아래
  desktop: "1280px"   # 1024px 이상: 세 영역 배치(명세 참조)
---

# agent-observer 디자인 시스템

## 1. 개요

- **제품 성격**: 개발자용 개인 관찰 대시보드(앱 화면만, 마케팅 페이지 없음)
- **사용자**: 사용자 한 명. PC(1280px 내외)에서 옆에 띄워 두고, 휴대폰(390px)에서 승인 대기를 확인한다.
- **분위기 키워드**: 차분함, 한눈에 읽힘, 정확함, 따뜻함(크림색 사무실 — 색만 해당, 2절)
- **피해야 할 인상**: 장난스러운 게임 화면, 과한 색, 알림 남발. 따뜻한 색 계열은 표면·포인트·사무실 영역에 한정하고, 패널·표·배지는 여전히 정보 도구처럼 보이게 한다. 게임풍 그림(12절, 초안)은 사무실 영역 안에서만 쓰고, 패널·버튼·글꼴은 게임 화면 UI(대화창 테두리, 픽셀 글꼴 등)를 흉내 내지 않는다. 1단계 임시 사무실은 장식 없이 사각형으로만 표현한다.

## 2. 색상

- **색 계열**: "따뜻한 크림색 사무실". 크림 벽·바닥, 주황빨강(테라코타) 소파, 머스터드 탁자·방석, 초록 화분, 탁한 남색 가구 — 사용자가 준 분위기 참고 이미지의 색 계열만 가져왔다(11절). 그림·타일·가구 배치·바닥 문양은 가져오지 않는다.
- **사용 원칙**
  - 화면 색은 세 묶음으로 나눈다. (1) 표면·잉크: 크림 표면과 남색 잉크, (2) 포인트: primary 테라코타 한 가지, (3) 상태 색 6쌍. 사무실 영역 토큰(`office-*`)은 사무실 그림 안에서만 쓰는 네 번째 묶음이다.
  - **primary(테라코타)는 주요 버튼(로그인), 탭 선택 막대에만** 쓴다. 상태 배지·상태 막대 옆에 놓이는 표시(포커스 링, 선택된 세션 행 막대)에는 쓰지 않고 `focus-ring`·`selected-bar`(= ink 남색)를 쓴다. 지난 초안의 파랑 충돌(포인트 색 = 작업 중 색)과 같은 일이 테라코타와 "응답 없음" 빨강 사이에서 생기지 않게 하기 위해서다.
  - 상태 색 6가지는 포인트 색과 색상각을 떨어뜨렸다: primary 16° / 작업 중 225°(파랑) / 생각 중 285°(자두색) / 승인 대기 44°(머스터드 갈색) / 응답 없음 346°(진홍) / 완료 127°(초록) / 종료 무채(따뜻한 회색). primary와 가장 가까운 것은 승인 대기(28° 차)와 응답 없음(30° 차)인데, 이 둘은 막대·배지에 쓰이고 primary는 막대·배지 옆에 쓰지 않으므로 같은 자리에서 만나지 않는다.
  - 선택은 "표면 한 단계 올림(surface-selected) + 왼쪽 selected-bar 막대 + aria-current"로, 상태는 "상태 색 + 아이콘 + 문구"로 표현해 두 표현 방식이 서로 다른 축을 쓴다.
  - 링크는 ink 글자 + 밑줄(호버 시 밑줄 굵게). 파랑·테라코타 링크를 쓰지 않는다.
  - 상태는 **색 + 아이콘 + 문구** 세 가지를 항상 함께 보인다(6절 "상태 표현"). 색만으로 구분하지 않는다.
  - danger는 오류 메시지와 "응답 없음" 상태에만 쓴다. "정리" 버튼은 위험 동작이 아니므로(되돌아옴) danger를 쓰지 않는다.
  - `office-*` 토큰은 OfficeFloor 안(벽·바닥·가구)에서만 쓴다. 패널·버튼·글자 색으로 쓰지 않고, 상태 표현에도 쓰지 않는다. 사무실 안의 상태는 여전히 상태 색 + 아이콘 + 문구다. `office-accent`(소파 테라코타)는 primary와 같은 계열이라 의도적으로 브랜드와 사무실을 잇지만, 상태 색(응답 없음 진홍)과 헷갈리지 않도록 아바타 바로 뒤 배경으로 깔지 않는다(3단계 그림 제작 시 지킬 것).
  - 바닥 위 글자는 `office-floor-a` 위에만 둔다(`office-floor-b` 위 ink-muted는 3.48로 미달). 1단계 임시 사무실은 체크 무늬 없이 `office-floor-a` 단색 바닥이다.
- **다크 모드**: 지원. `prefers-color-scheme: dark`를 따른다(수동 전환 버튼은 1단계 범위 밖). 패널·버튼·글자는 같은 계열의 "저녁" 값 — 크림 대신 따뜻한 갈색 숯빛 표면, 잉크는 밝은 크림, 포인트는 밝은 테라코타(위 글자는 어두운 색). **사무실 영역은 다크에서도 라이트 값 그대로**다(아래 "사무실 영역은 항상 밝게"). 값은 아래.

| 역할 | 라이트 | 다크 | 용도 |
|---|---|---|---|
| primary | #A8431D | #F0875A | 주요 버튼, 탭 선택 막대 |
| primary-hover | #8C3714 | #F6A27D | primary 버튼 호버 |
| primary-on | #FFFFFF | #1E0F08 | primary 위 글자 |
| focus-ring | #262A3B | #EEEADB | 포커스 링 (= ink) |
| selected-bar | #262A3B | #EEEADB | 선택 행 왼쪽 막대 (= ink) |
| canvas | #F6F2E6 | #16150F | 페이지 배경 |
| surface | #FFFDF7 | #1E1C17 | 카드, 패널 |
| surface-elevated | #FFFDF7 | #27251E | 툴팁, 드롭다운 |
| surface-sunken | #EDE8D7 | #12110D | 표 머리줄, 스켈레톤, 호버 배경 |
| surface-selected | #E7E1CB | #2E2B22 | 선택 행 배경 |
| ink | #262A3B | #EEEADB | 제목, 본문 |
| ink-muted | #5C5949 | #ACA794 | 보조 텍스트 |
| border | #DDD6BF | #37342A | 구분선(장식) |
| border-strong | #8B8570 | #79735F | 입력·버튼 테두리 |
| success | #2A6331 | #8ED39A | = done fg |
| warning | #6E5000 | #E6C35A | = waiting fg |
| danger | #AE1F40 | #FF8EA4 | 오류, 응답 없음 |
| info | #2A4FBF | #93B2FF | = working fg |
| status-working fg / bg | #2A4FBF / #E7EDFC | #93B2FF / #1D2641 | 작업 중 |
| status-thinking fg / bg | #7A3592 / #F4E9F7 | #D8A9EC / #33223E | 생각 중 |
| status-waiting fg / bg | #6E5000 / #FBEFC6 | #E6C35A / #383010 | 승인 대기 |
| status-stale fg / bg | #AE1F40 / #FBE7EB | #FF8EA4 / #44182A | 승인 대기(응답 없음) |
| status-done fg / bg | #2A6331 / #E5F2E2 | #8ED39A / #1A3220 | 완료 |
| status-ended fg / bg | #5C5949 / #ECE8DA | #ACA794 / #2C2A22 | 종료 |
| office-wall | #E9E5CE | = 라이트 | 사무실 벽면 |
| office-wall-trim | #CFC8A1 | = 라이트 | 벽 아래 띠, 기둥 옆면 |
| office-floor-a | #D9D5BD | = 라이트 | 바닥 밝은 칸, 1단계 임시 바닥 |
| office-floor-b | #BCB797 | = 라이트 | 바닥 어두운 칸(글자 금지) |
| office-edge | #9D9879 | = 라이트 | 방 외곽·벽 아래 그림자, 다크 모드 사무실 외곽 테두리 |
| office-accent | #CF6236 | = 라이트 | 소파 등 큰 가구 포인트(장식) |
| office-accent-shade | #A33D1C | = 라이트 | office-accent 그늘면 |
| office-mustard | #D8C362 | = 라이트 | 탁자, 방석 |
| office-mustard-light | #F5E0A6 | = 라이트 | 러그, 방석 밝은 면 |
| office-plant | #6B8E34 | = 라이트 | 화분 잎 그늘 |
| office-plant-light | #A6CB6E | = 라이트 | 화분 잎 밝은 면 |
| office-furniture | #363B55 | = 라이트 | 남색 가구, 1단계 임시 책상 막대 |
| office-wood | #8C6D55 | = 라이트 | 나무 가구, 화분 받침 |

- `office-*`는 다크 값이 없다. `tokens.css`의 다크 블록에 `office-*`를 다시 선언하지 않는다(2026-11-11 사용자 결정: 다크 모드에서도 사무실은 밝은 색 유지).

- **대비 검증** (WCAG 2.2 상대 휘도 공식으로 계산, 본문 4.5:1 / 큰 글자·비텍스트 3:1). 모든 행 통과. 장식(border, office 가구끼리)은 대비 요구가 없어 넣지 않았다. 사무실 영역 행(`office-*` 위 조합)은 2.1에 따라 다크에서도 라이트 값을 쓰므로 다크 열 = 라이트 열이다(v3 초안의 다크 사무실 값과 그 대비 3.37 등은 폐기).

| 조합 | 라이트 | 다크 | 기준 |
|---|---|---|---|
| ink / canvas | 12.70 | 15.18 | 텍스트 4.5 |
| ink / surface | 13.98 | 14.13 | 텍스트 4.5 |
| ink / surface-elevated (툴팁) | 13.98 | 12.72 | 텍스트 4.5 |
| ink / surface-sunken (표 머리줄) | 11.60 | 15.68 | 텍스트 4.5 |
| ink / surface-selected (선택 행 글자) | 10.86 | 11.74 | 텍스트 4.5 |
| ink-muted / canvas | 6.30 | 7.58 | 텍스트 4.5 |
| ink-muted / surface | 6.93 | 7.06 | 텍스트 4.5 |
| ink-muted / surface-sunken | 5.75 | 7.83 | 텍스트 4.5 |
| ink-muted / surface-selected | 5.38 | 5.87 | 텍스트 4.5 |
| primary-on / primary (로그인 버튼) | 6.02 | 7.38 | 텍스트 4.5 |
| primary-on / primary-hover | 7.86 | 9.21 | 텍스트 4.5 |
| primary / surface (탭 선택 막대) | 5.92 | 6.74 | 비텍스트 3 |
| primary / canvas (로그인 버튼 외곽) | 5.38 | 7.24 | 비텍스트 3 |
| focus-ring / surface | 13.98 | 14.13 | 비텍스트 3 |
| focus-ring / canvas | 12.70 | 15.18 | 비텍스트 3 |
| selected-bar / surface-selected | 10.86 | 11.74 | 비텍스트 3 |
| danger / surface (오류 문구) | 6.73 | 7.83 | 텍스트 4.5 |
| danger / canvas | 6.11 | 8.41 | 텍스트 4.5 |
| danger / status-stale-bg (ErrorBar) | 5.78 | 6.85 | 텍스트 4.5 |
| working fg / bg | 6.03 | 7.15 | 텍스트 4.5 |
| thinking fg / bg | 6.48 | 7.51 | 텍스트 4.5 |
| waiting fg / bg | 6.50 | 7.71 | 텍스트 4.5 |
| stale fg / bg | 5.78 | 6.85 | 텍스트 4.5 |
| done fg / bg | 6.19 | 7.85 | 텍스트 4.5 |
| ended fg / bg | 5.75 | 5.96 | 텍스트 4.5 |
| ink / status-waiting-bg (WaitingBanner 문구) | 12.37 | 10.90 | 텍스트 4.5 |
| waiting fg / surface (행 막대) | 7.35 | 9.99 | 비텍스트 3 |
| waiting fg / surface-selected (선택+대기 막대) | 5.70 | 8.30 | 비텍스트 3 |
| stale fg / surface (행 막대) | 6.73 | 7.83 | 비텍스트 3 |
| stale fg / surface-selected | 5.22 | 6.50 | 비텍스트 3 |
| border-strong / surface (입력 테두리) | 3.63 | 3.59 | 비텍스트 3 |
| border-strong / canvas | 3.30 | 3.86 | 비텍스트 3 |
| ink / office-floor-a (아바타 이름) | 9.62 | 9.62 | 텍스트 4.5 |
| ink-muted / office-floor-a (구역 이름, 상태 문구) | 4.77 | 4.77 | 텍스트 4.5 |
| ink / office-floor-b | 7.01 | 7.01 | 텍스트 4.5 (글자 금지 규칙은 유지) |
| ink / office-wall | 11.22 | 11.22 | 텍스트 4.5 |
| ink-muted / office-wall | 5.56 | 5.56 | 텍스트 4.5 |
| working fg / office-floor-a (아바타 테두리) | 4.78 | 4.78 | 비텍스트 3 |
| thinking fg / office-floor-a | 5.16 | 5.16 | 비텍스트 3 |
| waiting fg / office-floor-a | 5.05 | 5.05 | 비텍스트 3 |
| stale fg / office-floor-a | 4.63 | 4.63 | 비텍스트 3 |
| done fg / office-floor-a | 4.85 | 4.85 | 비텍스트 3 |
| ended fg / office-floor-a | 4.77 | 4.77 | 비텍스트 3 |
| office-furniture / office-floor-a (임시 책상 막대) | 7.42 | 7.42 | 비텍스트 3 |
| office-furniture / office-floor-b | 5.41 | 5.41 | 비텍스트 3 |
| ink / surface (사무실 이름표 바탕, 3단계) | 13.98 | 13.98 | 텍스트 4.5 |
| ink-muted / surface (이름표 상태 문구, 3단계) | 6.93 | 6.93 | 텍스트 4.5 |
| office-floor-a / 패널 surface (다크: 바닥 경계) | — | 11.51 | 비텍스트 3 |
| office-edge / 패널 surface (다크: 사무실 외곽 테두리) | — | 5.84 | 비텍스트 3 |
| office-edge / canvas (다크: 패널 밖에 놓일 때) | — | 6.27 | 비텍스트 3 |

- **대비 표에 없는 조합과 이유**
  - 아바타 배경(상태 bg) / office-floor-a는 1.0~1.3이라 배경만으로는 구분되지 않는다. 아바타 경계는 2px 상태 fg 테두리(위 표, 3:1 이상)가 맡는다.
  - border-strong / office-floor-a는 2.50 / 2.74로 미달이라, 바닥 위 책상 막대는 border-strong 대신 office-furniture를 쓴다(6절).
  - ink-muted / office-floor-b는 라이트 3.48로 미달 → office-floor-b 위에는 글자를 두지 않는다.
  - 사무실 이름표 바탕(surface #FFFDF7) / office-floor-a는 1.45라 바탕만으로는 바닥과 구분되지 않는다. 3단계 이름표는 1px ink 테두리(ink / office-floor-a 9.62)를 두른다(12.6). border-strong은 바닥 위 2.50이라 쓰지 않는다.
  - **다크 값을 그대로 두면 생기는 문제(이 결정의 근거)**: 다크 ink #EEEADB / office-floor-a 1.23, 다크 ink-muted 1.63, 다크 작업 중 fg #93B2FF 1.41 — 모두 미달. 그래서 사무실 안은 2.1의 범위 지정으로 라이트 값을 받는다.
  - border-strong / surface-sunken은 라이트 3.01로 겨우 통과한다. 입력창은 surface 위에만 둔다.

### 2.1 사무실 영역은 항상 밝게 (다크 모드)

다크 모드에서도 사무실 영역(1단계 OfficeFloor, 3단계 사무실 그림)은 라이트 화면과 똑같이 보인다. 바닥만 밝고 그 위 글자·배지가 다크 값이면 대비가 무너지므로(아래 "다크 값을 그대로 두면"), **사무실 영역 안은 통째로 라이트 팔레트**를 쓴다.

- **범위 지정**: OfficeFloor 바깥 요소(3단계는 canvas를 감싼 요소)에 `data-office-scope` 속성을 단다. 이 요소와 그 안은 라이트 값을 쓴다.
- **구현 방법**(`tokens.css`): 라이트 값 블록의 선택자를 `:root, [data-office-scope]`로 쓰고, 다크 블록은 지금처럼 `@media (prefers-color-scheme: dark) { :root { … } }`만 둔다. `[data-office-scope]` 요소에 라이트 값이 직접 선언되므로 다크에서 `:root`가 바뀌어도 그 안은 라이트 값을 받는다. 이 요소에는 `color-scheme: light`도 지정한다. 별도 토큰 이름(`--color-office-ink` 같은)을 새로 만들지 않는다.
- **사무실 안에서 라이트 값으로 고정되는 것**: ink, ink-muted, surface(이름표 바탕), border, border-strong, focus-ring, status-* 12개, `office-*` 전부. 즉 사무실 안의 이름·상태 문구·아바타 테두리·상태 배지는 다크 모드에서도 라이트 값이다. 대비는 아래 대비 표의 라이트 열과 같다.
- **사무실 바깥(다크 값)**: 패널(Panel) 배경·테두리, 패널 제목 "임시 사무실", caption "임시 그림", 바닥을 그리지 않을 때의 빈 상태 문구("세션을 고르면 BOT이 보입니다", "모든 BOT이 종료되었습니다"). 이 문구들은 바닥 밖 패널 표면에 두고 다크 토큰을 쓴다.
- **같은 상태가 두 가지 톤으로 보인다**: 다크 모드에서 세션 목록·상세의 상태 배지는 다크 값, 사무실 안 배지는 라이트 값이다. 아이콘·문구가 같으므로 의미는 같게 읽힌다(의도한 차이). 상태 → 토큰 매핑 함수(`statusStyle`)는 그대로 하나만 쓴다 — 값은 CSS 변수가 범위에 따라 바꿔 준다.
- **외곽 테두리**: 다크 모드에서만 바닥 바깥에 2px `office-edge` 테두리를 둔다(`box-sizing: border-box`, 여백 12px 유지). 밝은 바닥이 어두운 패널에 바로 붙어 번쩍이는 느낌을 한 단계 누그러뜨리고, 3단계 그림의 "방 외곽 그림자"와 같은 색이다. 라이트 모드는 지금처럼 테두리 없음. radius lg 유지.
- **밝기 낮춤 금지**: 사무실 영역에 `filter: brightness()`, `opacity`, 어두운 반투명 덮개를 씌우지 않는다. 대비 표의 값이 그대로 유지되어야 한다.
- **3단계 canvas**: 이름표·말풍선 색을 코드 상수로 적지 않고 `getComputedStyle(scopeElement)`로 CSS 변수 값을 읽어 쓴다(값의 출처는 `tokens.css` 하나).

## 3. 타이포그래피

- **위계 원칙**: 한 화면에 h1(헤더 1개), h2(패널 제목), h3(카드 제목) 세 단계만 쓴다. 밀도 높은 도구라 본문은 14px.
- **한글 처리**: `word-break: keep-all; overflow-wrap: anywhere;`(긴 프로젝트 이름·브랜치·세션 ID가 가로 스크롤을 만들지 않게). 본문 줄간격 1.6.
- **긴 식별자**: 프로젝트·브랜치·모델 이름은 한 줄 말줄임(`text-overflow: ellipsis`)하고 `title` 속성으로 전체를 준다. 세션 ID는 font-mono로 앞 8자만 보인다.
- **숫자**: 토큰·비용·시간은 `font-variant-numeric: tabular-nums`, 표에서 오른쪽 정렬.
  - 토큰: 1,000 미만은 그대로, 이상은 `12.3K`, `1.2M`(소수 1자리). 표의 `title`에 전체 값(`12,285`).
  - 비용: `$0.0123`처럼 `$` + 소수 4자리(0.0001 미만은 `<$0.0001`). 추정이면 뒤에 "추정" 배지.
  - 시각: 상대 시간("3분 전", "2시간째"). `<time datetime>` + `title`에 현지 절대 시각.
- **굵기 상한 600**: 제목도 600을 넘지 않는다(레퍼런스 Vercel·Linear의 공통 원칙, 차분한 인상). 강조는 크기·색이 아니라 굵기 500/600으로.
- **mono는 기술 식별자에만**: 세션 ID, 브랜치, 역할 키(`qa`), 모델 이름. 본문·문구에는 쓰지 않는다.
- **mono는 시스템 기본**: `font-mono`는 운영체제 기본 고정폭 글꼴 그대로다. 모노 웹폰트 파일은 넣지 않는다(2026-11-11 사용자 결정).

### 3.1 웹폰트 (Pretendard) — 확정 2026-11-11

운영체제마다 한글 글꼴이 달라 화면 인상이 바뀌는 문제를 없애려고 본문·제목 글꼴을 Pretendard로 통일한다(사용자 결정). 폰트 파일은 개발 BOT이 넣는다. 아래가 그 기준이다.

| 항목 | 기준 |
|---|---|
| 글꼴 | Pretendard **가변(Variable)** 한 파일. 이 화면은 400·500·600 세 굵기만 쓰지만 굵기별 파일 3개보다 가변 1개가 관리가 쉽다 |
| 받을 곳 | 공식 저장소 https://github.com/orioncactus/pretendard 의 릴리스(작성 시점 최신 v1.3.9) 압축 파일 안 `web/variable/woff2/PretendardVariable.woff2`. 받은 버전을 THIRD_PARTY_NOTICES.md에 적는다 |
| 저장소 위치 | `app/fonts/PretendardVariable.woff2` (HANDOFF 설계 1절의 `app/` 바로 아래. `public/`에 두지 않는다 — 빌드가 해시 붙은 경로로 내보낸다) |
| 형식 | woff2 하나만. woff·ttf·otf는 넣지 않는다 |
| 파일 수정 금지 | 받은 파일을 그대로 쓴다. 직접 서브셋(글자 줄이기)·이름 바꾸기를 하지 않는다 — 라이선스에 예약 글꼴 이름(Reserved Font Name "Pretendard")이 있어 고친 파일에는 이 이름을 쓸 수 없다. 용량을 줄이려면 공식 릴리스가 제공하는 서브셋 파일을 그대로 쓰는 것만 허용한다(1단계는 전체 파일로 시작, 약 2MB 안팎(추정) — 한 번 받으면 캐시된다) |
| 로딩 | `next/font/local`: `localFont({ src: './fonts/PretendardVariable.woff2', weight: '45 920', style: 'normal', display: 'swap', variable: '--font-pretendard', preload: true, fallback: [시스템 글꼴 목록] })`. 루트 `app/layout.tsx`의 `<html className={pretendard.variable}>`에 단다. CDN(jsDelivr 등)은 쓰지 않는다 — 외부 요청을 만들지 않는다 |
| font-display | `swap`. 글꼴이 오기 전에는 시스템 글꼴로 먼저 그린다(글자가 안 보이는 시간 없음). 로그인 화면도 같다 |
| 대체 글꼴 | frontmatter `font-body`의 `var(--font-pretendard)` 뒤 시스템 목록. `next/font`의 기본 `adjustFontFallback`을 켜 둬 글꼴이 바뀔 때 줄 높이가 덜 흔들리게 한다 |
| 적용 범위 | `--font-body`(본문·제목 공통). `--font-mono`에는 넣지 않는다. 사무실 이름표(3단계 canvas)도 `--font-body`를 쓴다 — 픽셀 글꼴을 따로 넣지 않는다 |
| 한글 조판 | 크기·줄간격·자간은 frontmatter `scale` 그대로(이번에 바꾸지 않음). `word-break: keep-all` 유지 |
| 라이선스 고지 | (1) `app/fonts/OFL.txt` — 공식 저장소 `LICENSE` 원문 전체(저작권 줄 4개와 예약 글꼴 이름 줄 포함)를 그대로 복사. OFL은 글꼴을 재배포할 때 라이선스 원문을 함께 두라고 요구한다. (2) `THIRD_PARTY_NOTICES.md`에 "Pretendard" 절 추가: 출처 URL, 버전, 파일 경로 `app/fonts/PretendardVariable.woff2`, "SIL Open Font License 1.1, 전문은 app/fonts/OFL.txt", Copyright (c) 2021 Kil Hyung-jin 외. (3) 화면에는 고지를 두지 않는다(OFL은 화면 표시를 요구하지 않음) |
| gitignore | `app/fonts/`는 커밋한다(그림·토큰과 달리 공개 저장소에 두어도 되는 OFL 파일) |

## 4. 레이아웃

- **그리드**: CSS grid. 최대 폭 1440px, 좌우 여백 모바일 16px / 데스크톱 24px. 패널 사이 간격 16px(모바일 12px).
- **간격 리듬**: 컴포넌트 내부 8·12, 카드 안 여백 12(모바일)·16(데스크톱), 패널 사이 16, 섹션 사이 24.
- **여백 철학**: 정보가 많은 화면이므로 여백보다 정렬(숫자 오른쪽 정렬, 열 맞춤)로 정리한다.
- **고정 영역**: 헤더(높이 56px)는 상단 고정(`position: sticky`). 그 외는 스크롤.
- **가로 스크롤 금지**: 390px에서 어떤 요소도 뷰포트를 넘지 않는다. 표는 모바일에서 카드 목록 또는 정의 목록으로 바꾼다(9절).

## 5. 깊이와 표면

- 카드·패널은 `surface` + 1px `border`. 라이트는 shadow-sm(작은 그림자 두 겹)을 더하고, 다크는 그림자 없이 테두리와 표면 단계(canvas → surface → surface-elevated)로만 깊이를 준다.
- 표면 단계: canvas(페이지) < surface(패널) < surface-selected(선택 행) < surface-elevated(툴팁). 단계를 건너뛰어 섞지 않는다.
- 툴팁은 `surface-elevated` + shadow-md(다크는 border).
- z-index: 기본 0, 헤더 10, 툴팁 20. 모달은 1단계에 없다.

## 6. 컴포넌트

CSS Module 파일 이름 기준. 모든 상호작용 요소는 포커스 링(아래)과 최소 터치 영역 44×44px(모바일)을 지킨다.

공통 포커스: `:focus-visible { outline: 2px solid var(--color-focus-ring); outline-offset: 2px; }` — outline을 지우지 않는다. focus-ring은 남색 잉크(= ink)이므로 어떤 상태 배지·상태 막대와도 색이 겹치지 않는다(primary 테라코타를 포커스 링에 쓰지 않는다).
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
| secondary | 정리, 다시 표시, 다시 시도, 로그아웃 | surface | ink | 1px border-strong | 32px(데스크톱) / 40px(모바일) | md |
| ghost | 접기/펼치기, 닫기 | 투명 | ink-muted | 없음 | 32px / 40px | md |

- 호버: primary는 배경 primary-hover, secondary·ghost는 배경 surface-sunken.
- 눌림: 호버 색 + `transform: translateY(1px)`.
- 로딩: 글자를 "로그인 중…"으로 바꾸고 비활성.
- 다크 모드에서도 같은 토큰(primary-hover)을 쓴다. color-mix로 색을 만들지 않는다.

### 입력창·폼 (TextField, Select)
- 높이 40px(모바일 44px), 1px border-strong, radius md, 안쪽 여백 12px, body 글자, 배경 surface.
- 라벨은 입력창 위(small, 600, 아래 간격 4px). placeholder로 라벨을 대신하지 않는다.
- 포커스: 테두리 focus-ring + 공통 포커스 링.
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
- 선택됨: 왼쪽 3px selected-bar(남색 잉크) 막대 + 배경 surface-selected + 프로젝트 이름 600, `aria-current="true"`.
- 승인 대기 행: 왼쪽 막대 status-waiting-fg(응답 없음은 status-stale-fg). 선택됨과 겹치면 막대는 상태 색, 배경은 surface-selected, 이름 600 — 선택은 배경·굵기로, 상태는 막대·배지로 읽힌다.
- 작업 중 행은 막대를 두지 않는다(배지로 충분). 따라서 파란 막대는 화면 어디에도 없다.
- 숨긴 세션 행(`variant="hidden"`): 아래 HiddenSessions 참조. 내용 줄은 같고, 오른쪽 버튼이 "정리" 대신 "다시 표시"이며 상태 막대를 두지 않는다.

### 숨긴 세션 (HiddenSessions) — 확정 2026-11-11
"정리"로 숨긴 세션을 다시 보고 되돌리는 접기 영역. 세션 목록 Panel 안, 맨 아래(종료 세션 접기 다음)에 둔다. 동작·문구는 명세 3.6.1.
- 접기 버튼: ghost 버튼, 종료 세션 접기와 같은 모양(왼쪽 펼침 표시 아이콘 + 문구). 문구 "숨긴 세션 {N}개 보기" / 펼침 "숨긴 세션 {N}개 접기". `aria-expanded`, `aria-controls`. 높이 32px(데스크톱) / 44px(모바일), 폭은 패널 안쪽 전체, 글자 왼쪽 정렬.
- 펼친 영역: 위 1px border 구분선, 위아래 여백 8px. 안의 행은 SessionRow `variant="hidden"`을 1px border 구분선으로 나열한다(카드 안 카드 금지 규칙 유지).
- 숨긴 행: 배경 surface(선택되면 surface-selected + selected-bar, 일반 행과 같음). 왼쪽 상태 막대(승인 대기·응답 없음)를 두지 않는다 — 숨긴 세션은 강조 대상이 아니다. StatusBadge(색 + 아이콘 + 문구)는 그대로 보인다. 흐리게(opacity) 만들지 않는다(대비 유지).
- "다시 표시" 버튼: secondary. 처리 중에는 "다시 표시 중…" + 비활성. 실패 문구는 행 아래 small danger.
- 빈 상태: 펼친 영역 안 small ink-muted "숨긴 세션이 없습니다."
- 새 토큰·새 색 없음. 기존 Button·SessionRow·Note 토큰만 쓴다.

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
- 1단계 임시 표현. **원본 Pixel Agent Desk 그림을 참고하거나 본뜨지 않는다.** 단색 사각형과 글자만 쓴다. 3단계 그림 방향과의 관계는 12.7.
- 바닥: office-floor-a 단색(1단계는 체크 무늬 없음), radius lg, 여백 12px. 바닥 요소에 `data-office-scope`를 달아 안쪽은 다크 모드에서도 라이트 값을 쓴다(2.1). 다크 모드에서만 2px office-edge 테두리(`box-sizing: border-box`). 세 구역을 위에서 아래로: "승인 대기"(waiting), "책상"(working·thinking), "쉬는 곳"(done). ended는 표시하지 않는다.
- 구역 이름: caption 600 ink-muted, 구역 사이 1px 점선 border.
- 아바타: 40×40px 사각형(radius sm), 배경 = 상태 bg, 2px 테두리 = 상태 fg, 가운데 상태 아이콘(20px, fg). 아래에 표시 이름(caption, 말줄임 최대 72px) + 상태 문구(caption). 칸 너비 80px.
- 책상 구역은 아바타 아래에 책상 표시(40×8px, office-furniture 단색 막대. border-strong은 바닥 위 대비 미달)를 둔다. working은 책상에 붙어(간격 0), thinking은 8px 떨어져 놓는다 — 위치 차이 + 문구로 구분.
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
- colors에 없는 색, 그라데이션, 장식 그림자를 쓰지 않는다. 그림자는 작은 그림자 여러 겹(shadow 토큰)만.
- 포커스 링·선택 막대에 primary(테라코타)나 상태 색을 쓰지 않는다(focus-ring·selected-bar = 남색 잉크). primary는 주요 버튼·탭 선택 막대에만.
- `office-*` 토큰을 사무실 영역 밖(패널, 버튼, 글자)에 쓰지 않는다.
- 제목에 700 이상 굵기, 전부 대문자 표기를 쓰지 않는다.
- 탭·버튼을 알약(pill) 모양으로 만들지 않는다. 버튼은 radius md(6px).
- 아이콘만으로 상태를 나타내지 않는다. 배지를 깜박이게 하지 않는다.
- 폰트·이미지·아이콘 파일을 저장소에 추가하지 않는다. 예외는 Pretendard 가변 woff2 한 파일과 그 라이선스 원문(3.1)뿐이다.
- 원본 Pixel Agent Desk 그림을 쓰거나 본뜨지 않는다.
- 사무실 영역을 다크 값으로 칠하거나 어둡게 덮지 않는다(2.1).
- 특정 게임의 캐릭터·몬스터·엠블럼·기계·로고·타일·가구 그림·화면 UI를 넣거나 재현하지 않는다(12절).
- 프롬프트·응답·도구 입력을 화면에 보이지 않는다(수집하지 않음).

## 9. 반응형

- **모바일(<768, 기준 390)**: 한 열. 순서: 헤더 → 필터 → 승인 대기 띠 → 세션 목록 → (세션 선택 시) 세션 상세 → 임시 사무실 → 합계. 표는 정의 목록 카드로.
- **태블릿(768~1023)**: 위 두 열(목록 320px | 상세 나머지), 아래 한 열(사무실, 합계).
- **데스크톱(≥1024, 기준 1280)**: 명세 문서의 1280 배치.
- **터치 영역**: 모바일에서 버튼·행·선택 상자 최소 44×44px.

## 10. 기술 매핑

- **UI 라이브러리**: 없음. CSS Modules(`*.module.css`) + 전역 `app/tokens.css`(CSS 변수) + `app/globals.css`(리셋, 글꼴, 포커스). 경로는 HANDOFF 설계 1절의 `app/`(루트)을 따른다(v3 초안의 `src/app/` 표기를 바로잡음). 글꼴 파일은 `app/fonts/`(3.1).
- **토큰 위치**: `tokens.css`의 `:root, [data-office-scope]`(라이트)와 `@media (prefers-color-scheme: dark) { :root { … } }`(다크, `office-*` 제외). `:root`에 `color-scheme: light dark`, `[data-office-scope]`에 `color-scheme: light` 지정(2.1).
- **토큰 이름 규칙**: `--color-<역할>`(예 `--color-status-waiting-fg`), `--space-1`(4px)~`--space-7`(48px) = 4·8·12·16·24·32·48, `--radius-sm|md|lg|full`, `--shadow-sm|md`, `--font-body|mono`, `--text-<단계>-size/-line/-weight`.
- 상태 → 토큰 매핑은 한 곳(`statusStyle(status, stale)`)에 두고 StatusBadge·SessionRow·OfficeAvatar가 같이 쓴다.

## 11. 레퍼런스

2026-11-11 재검토에서 awesome-design-md 컬렉션(https://github.com/VoltAgent/awesome-design-md) 목록을 읽고, 개발자 도구 계열 후보(Linear, Vercel, Sentry, Supabase, PostHog, Raycast) 가운데 아래 두 개를 골라 원문 DESIGN.md 전체를 읽었다. 이 문서들은 각 회사의 **마케팅 사이트**를 분석한 것이라, 앱 화면에 맞는 원칙(색 역할, 타이포 위계, 간격, 깊이, 컴포넌트 형태, Do/Don't)만 가져왔다. 로고, 고유 이름, 고유 글꼴, 브랜드 그라데이션, 특정 화면 배치는 쓰지 않았다.

| 레퍼런스 | 원문 | 고른 이유 |
|---|---|---|
| Linear | `design-md/linear.app/DESIGN.md` | 엔지니어용 도구, "촘촘하고 정밀한" 성격. 유채색 포인트를 포커스·주요 버튼에만 아껴 쓰고, 깊이를 그림자 대신 표면 단계와 가는 테두리로 만든다 — 다크 모드와 상태 밀도가 높은 이 제품에 맞다 |
| Vercel | `design-md/vercel/DESIGN.md` | 개발 플랫폼(배포 대시보드). 주요 버튼이 유채색이 아닌 잉크색이고, 상태(성공·경고·오류)용 색을 따로 둔다 — 이번 파랑 충돌의 해법이 여기서 나왔다. 라이트 표면 단계(흰 카드 / 98% 바탕 / 95% 안쪽)가 현재 초안과 같은 구조라 비교가 쉬웠다 |

Sentry 원문은 앞부분(색 토큰, 글꼴)만 훑었고, 마케팅용 장식 색(라임·핑크)이 중심이라 고르지 않았다. 나머지 후보는 목록 설명만 읽었다.

### 11.1 가져온 것과 다르게 한 것

| 영역 | 가져온 것 (출처) | 다르게 한 것 |
|---|---|---|
| 주요 동작 색 | 상태 옆에 놓이는 표시(포커스·선택)를 잉크색으로 칠하고 유채색과 분리 (Vercel `primary #171717`) | 2차 재검토(11.4)에서 주요 버튼은 테라코타 primary로 바꾸고, 잉크색은 `focus-ring`·`selected-bar`에 남겼다. 파랑은 "작업 중" 전용, 링크는 잉크+밑줄 유지 |
| 유채색 절제 | 유채색 포인트는 포커스·주요 버튼에만, 장식 금지 (Linear Do/Don't "lavender ONLY for…", "Don't introduce a second chromatic accent") | 1차 재검토에서는 포인트 색을 없앴으나, 2차 재검토(11.4)에서 Linear처럼 포인트 색 하나(테라코타)를 두고 쓰임을 주요 버튼·탭 선택 막대로 좁혔다 |
| 선택 표현 | "선택 = 표면 한 단계 올림" (Linear pricing-tab-selected: surface-2 배경) | surface-selected 토큰을 새로 두고 왼쪽 잉크 막대·aria-current를 더했다(색 대비 1.29 / 1.20이라 배경만으로는 부족) |
| 깊이 | 표면 단계 + 1px 테두리, 다크에서 그림자 거의 없음 (Linear Elevation 표) / 작은 그림자 여러 겹 (Vercel Level 2·5) | 다크는 그림자 0, 라이트는 shadow-sm 두 겹·shadow-md 세 겹. Vercel의 inset 테두리 대신 실제 1px border 유지 |
| 글자 굵기 | 제목 굵기 상한 600, 700 이상 금지 (Vercel Principles, Linear Do "resists 700+") | h1·h2를 700 → 600. 큰 제목의 강한 음수 자간은 가져오지 않았다(20px 이하 제목뿐이고 한글은 자간을 크게 줄이면 읽기 어렵다) |
| mono 역할 | mono는 기술 레이어(ID, 코드, 기술 라벨)에만, 본문 금지 (Vercel Principles, Linear "status / ID tokens") | 기존 규칙과 같아 명시만 했다. Vercel의 mono 눈썹 제목(eyebrow)은 쓰지 않았다 |
| 간격 | 4px 기준, 4·8·12·16·24·32·48 (두 문서 공통) | 이미 같은 척도였다. 마케팅용 64·96px 이상은 앱 화면에 필요 없어 넣지 않았다 |
| 모서리 | 버튼·입력 6px, 카드 8px, 상태 배지 4px (Vercel `--geist-radius` 6 / marketing 8, Linear xs 4) | 카드 10 → 8px. 알약형 CTA(Vercel 100px, Linear pill)는 앱 화면에 맞지 않아 금지로 적었다 |
| 입력 높이 | 40px 기본, 촘촘한 곳 32px (Vercel form-input / -sm) | 모바일은 44px 유지(WCAG 2.5.5) |
| 헤더 | 상단 고정, 높이 56px (Linear top-nav) | 기존 값과 같다 |
| 상태 배지 | 작은 배지, caption 글자 (Linear status-badge) | Linear는 무채색 알약 배지지만, 여기서는 상태 색 bg/fg + 아이콘 + 문구를 유지했다(WCAG 1.4.1) |

### 11.2 레퍼런스와 무관하게 유지한 기준

| 영역 | 기준 |
|---|---|
| 색 대비 | WCAG 2.2 1.4.3·1.4.11 (https://www.w3.org/TR/WCAG22/#contrast-minimum). 2절 표는 상대 휘도 공식으로 직접 계산했다 |
| 상태 표현 | WCAG 2.2 1.4.1 색 사용 — 색 + 아이콘 + 문구 세 겹 |
| 탭 | WAI-ARIA APG Tabs 패턴 |
| 포커스·키보드 | WCAG 2.2 2.4.7, 2.4.3, 2.4.1 |
| 터치 영역 | WCAG 2.2 2.5.5(모바일 44×44), 데스크톱 32px 버튼은 2.5.8(24px) 만족 |
| 움직임·다크 | `prefers-reduced-motion`, `prefers-color-scheme` |
| 상태 색 배정·아이콘 6종·배치·임시 사무실 | 레퍼런스 없이 HANDOFF T1-5와 일반 관례로 직접 정했다. **원본 Pixel Agent Desk 그림·화면은 보지도 참고하지도 본뜨지도 않았다** |

### 11.3 쓰지 않은 것

- 두 브랜드의 로고, 이름, 고유 글꼴(Geist, Linear 전용 글꼴), Vercel 메시 그라데이션, Linear 라벤더 색, 제품 스크린숏 중심 배치.
- Linear의 다크 전용 원칙("light mode 없음") — 이 제품은 라이트/다크 모두 지원한다.

### 11.4 사용자 제공 분위기 참고 (색 계열만)

2026-11-11 2차 재검토. 사용자가 대화에 첨부한 이미지 1장(픽셀 그림 실내 화면: 크림색 벽과 체크 무늬 바닥, 주황빨강 소파, 머스터드 탁자·방석, 초록 화분, 탁한 남색 가구)을 "사무실이 이런 분위기였으면 좋겠다"는 참고로 받았다. 기존 게임 화면으로 보이므로 **색 계열과 분위기만** 참고했다.

- **저장소에 넣지 않음**: 이미지 파일은 저장소에 복사·커밋하지 않았다(HANDOFF "주의" — 공개 저장소 기간 그림 커밋 금지). 출처 경로를 남기지 않는다.
- **가져온 것**: 이미지에서 픽셀 색을 세어 뽑은 주요 색 계열(아래 표)과 "따뜻한 크림 + 테라코타 + 머스터드 + 초록 + 남색" 조합. 토큰 값은 이 색을 그대로 쓰지 않고 색상·명도를 조정해 대비 기준에 맞춘 값이다.
- **가져오지 않은 것**: 그림, 타일, 가구 모양과 배치, 방 구조, 바닥 문양(가운데 원형 엠블럼 포함), 창문·가전 등 소품. 3단계 사무실 그림은 이 이미지를 본뜨지 않고 새로 그린다(HANDOFF "결정 사항"). `office-*` 토큰은 색 이름표일 뿐 배치를 정하지 않는다.

| 이미지에서 뽑은 색 | hex(측정값) | 반영한 토큰 |
|---|---|---|
| 벽면 크림 | #E8E8D0 | office-wall #E9E5CE, canvas #F6F2E6(더 밝게, 노랑 쪽으로) |
| 벽 아래 띠 | #D0D0A0 | office-wall-trim #CFC8A1 |
| 바닥 밝은 칸 | #D0D0B8 | office-floor-a #D9D5BD |
| 바닥 어두운 칸 | #B0B090 | office-floor-b #BCB797 |
| 외곽 그림자 | #989878 | office-edge #9D9879 |
| 소파 주황빨강 | #D06030 | office-accent #CF6236, primary #A8431D(흰 글자 4.5:1 위해 어둡게) |
| 소파 그늘 | #A03818 | office-accent-shade #A33D1C |
| 탁자 머스터드 | #D8C868 | office-mustard #D8C362, 승인 대기 계열(#6E5000 / #FBEFC6) |
| 방석·러그 밝은 노랑 | #F8E0A0 | office-mustard-light #F5E0A6 |
| 화분 잎 | #688830 / #A0C868 | office-plant #6B8E34 / office-plant-light #A6CB6E, 완료 계열은 더 순한 초록(#2A6331) |
| 남색 가구 | #313852 / #505068 | ink #262A3B, office-furniture #363B55, 작업 중 파랑(#2A4FBF)은 더 밝고 채도 높게 떨어뜨림 |
| 나무 가구 | #8E6D55 | office-wood #8C6D55 |

## 12. 사무실 시각 방향 — 승인됨 (3단계 그림 기준)

> 상태: **승인됨**(2026-11-11). 세부(화면 속 크기, 좌석 초과, 그림 커밋 여부)는 3단계 기획 때 정한다. 2026-11-11 사용자 지시(기존 Pixel Agent Desk의 디자인을 살리되 특정 휴대용 게임 풍으로 — 이 문서에는 게임 이름 대신 장르로 적는다)를 책임자와 designer가 해석해 적은 것이다. 사용자 승인 전에는 3단계 그림 제작을 이 절로 시작하지 않는다. 1단계 구현에는 영향이 없다(12.7).

한 줄 방향: **Pixel Agent Desk의 사무실 구조(좌석·상태별 동작·레이어·이동)를 그대로 살리고, 그림은 "GBA 시절 탑다운 RPG 실내풍"으로 새로 그린다.** 색은 `office-*` 토큰(2절)이다.

### 12.1 살리는 것과 쓰지 않는 것

| 구분 | 내용 | 근거 |
|---|---|---|
| 살림: 크기 | 타일 32px, 캐릭터 프레임 48×64px, 시트 8열(`OFFICE.TILE_SIZE`, `FRAME_W/H`, `COLS`) | vendor `office-config.js`, `sprite-frames.json` (MIT 코드) |
| 살림: 좌석 | 좌석 목록과 종류(책상 desk / 회의 meeting / 쉬는 자리 idle), 좌석마다 바라보는 방향과 자세(`SEAT_MAP`: dir + sit/stand), 쉬는 자리별 쉬는 동작(`IDLE_SEAT_MAP`), 노트북 자리와 좌석 연결(`LAPTOP_ID_MAP`) | vendor `office-config.js`, `office-coords.js` |
| 살림: 상태별 동작 | 작업 중 = 책상에 앉아 일함(sit_work), 생각 중 = 책상에 앉아 있음(sit), 책상에 누가 일하면 그 자리 노트북이 열림(열림/닫힘 그림 두 벌) | vendor `office-renderer.js` |
| 살림: 레이어 | 1 배경(바닥·벽·고정 가구) → 2 노트북(상태에 따라 바뀜) → 3 캐릭터(발 y좌표 순 정렬) + 이름표·말풍선 → 4 전경(캐릭터 앞을 가리는 가구 부분) → 5 효과 | vendor `office-renderer.js`, `office-layers.js` |
| 살림: 이동 | 좌석 사이를 길찾기로 걸어서 이동, 속도 110px/s(1배 기준), 도착 판정 2px, 걷기 4방향 | vendor `office-pathfinder.js`, `office-character.js` |
| 바꿈: 입력 형식 | 좌석 좌표·이동 가능 영역을 그림(`office_xy.webp`, `office_collision.webp`)이 아니라 데이터 파일(JSON)로 둔다(12.5) | vendor README |
| 바꿈: 상태 → 구역 | vendor는 승인 대기를 쉬는 구역에 보낸다. 여기서는 **승인 대기 자리**를 따로 둔다(1단계 임시 사무실과 같은 3구역). 완료 = 쉬는 곳, 종료 = 문으로 나가 사라짐 | HANDOFF T1-5, 설계 7절 상태 → 동작 |
| 바꿈: 상태 색 | vendor `STATE_COLORS`(주황 작업 중 등)는 쓰지 않는다. 상태는 2절 상태 토큰 + 아이콘 + 문구 | 2절, 6절 상태 표현 |
| 바꿈: 서브에이전트 0.85배 | vendor는 서브에이전트를 0.85배로 줄여 그린다. 정수 픽셀 규칙(12.2)에 어긋나므로 쓰지 않는다. 모든 캐릭터 같은 크기 | 12.2 |
| 바꿈: 말풍선 | vendor의 반투명 흰 둥근 말풍선(`rgba(255,255,255,0.95)`, radius 8) 대신 불투명 상태 배지형(12.6) | 2.1, 대비 |
| 쓰지 않음 | 원본 캐릭터·사무실 그림 전부. 우리 저장소에 없고 라이선스(수정·재배포·서비스 포함 금지)상 쓸 수 없다. 원본 그림의 구도·가구 모양을 떠올려 따라 그리지도 않는다 | HANDOFF "주의", vendor README |
| 쓰지 않음 | 특정 게임의 고유 요소: 캐릭터, 몬스터, 공 모양 엠블럼, 회복 기계, 로고, 특정 타일·가구 그림, 대화창·메뉴 등 화면 UI. 사용자 참고 이미지의 가구 모양·배치(L자 소파, 팔각 탁자, 바닥 가운데 원형 문양, 왼쪽 부엌, 오른쪽 TV 장식장, 문 양옆 화분 한 쌍, 대각선 마름모 바닥 격자)도 재현하지 않는다. **장르 스타일만** 따른다 | HANDOFF "결정 사항"(사무실 그림은 새로 그림), 11.4 |

### 12.2 픽셀 규칙

| 항목 | 규칙 |
|---|---|
| 시점 | 위에서 비스듬히 내려다본 탑다운(3/4). 물체는 **윗면 + 앞면**만 보이고 옆면은 그리지 않는다. 위쪽 벽은 앞면이 2칸(64px) 높이로 보이고, 좌우·아래 벽은 반 칸(16px) 두께의 윗면 띠로만 보인다 |
| 아트 픽셀 크기 | **1 아트 픽셀 = 2×2 화면 px(1배 기준)**. 타일 32px = 16×16 아트 픽셀, 캐릭터 48×64 = 24×32 아트 픽셀. 그림 파일은 2배로 키운 상태(화면 px 크기)로 저장해 vendor 좌표 체계(32px 타일)를 그대로 쓴다 |
| 표시 배율 | 사무실 전체를 0.5·1·1.5·2배 중 칸에 들어가는 가장 큰 값으로 그린다. 어느 배율이든 아트 픽셀이 정수 CSS px(1·2·3·4px)이 된다. 그 밖의 배율(0.56배 등)은 쓰지 않는다. `ctx.imageSmoothingEnabled = false`, CSS `image-rendering: pixelated`, 그리기 좌표는 정수로 반올림 |
| 외곽선 | 물체·캐릭터 바깥 실루엣에 **1 아트 픽셀 어두운 외곽선**, 색 `office-outline`(12.3 제안, #262A3B = ink 값). 물체 안쪽의 면 경계는 외곽선 대신 그 재질의 그늘색으로 긋는다(바깥만 굵고 어둡게) |
| 명암 | 재질마다 **밝은 면 · 기본 · 그늘 3단**(작은 물체는 2단 허용) + 외곽선. 빛은 왼쪽 위에서. 윗면 = 밝은 면, 앞면 = 기본, 앞면 아래 끝과 오른쪽 끝 = 그늘. 반짝임(하이라이트)은 화면·유리에만 1 아트 픽셀 |
| 바닥 그림자 | 가구 아래쪽에 1~2 아트 px 높이로 `office-floor-b`(불투명). 반투명 검정 그림자 금지 |
| 바닥 무늬 | 타일(32px) 단위로 반복. 기본 무늬는 **`office-floor-a` 바탕 + 오른쪽·아래 1 아트 px `office-floor-b` 줄눈**(바둑판 줄눈). 쉬는 곳에는 러그(`office-mustard-light` 바탕 + `office-mustard` 1 아트 px 테두리, 안쪽 무늬 없음 또는 단순 줄무늬). 대각선 마름모 격자, 바닥 가운데 문양은 쓰지 않는다 |
| 벽 | 앞면 `office-wall`, 아래 띠 `office-wall-trim`(4 아트 px), 벽과 바닥 사이 1 아트 px `office-edge`. 방 외곽 바깥 테두리는 `office-edge` |
| 색 | 장면 전체를 `office-*` 토큰(2절 13개 + 12.3 제안)으로만 칠한다. 새 색이 필요하면 이 문서에 먼저 추가한다 |
| 금지 | 안티앨리어싱, 반투명 픽셀(알파는 0 또는 255만), 그라데이션, 블러·글로우, 회전, 정수가 아닌 확대·축소, 디더링(바닥·러그 같은 반복 무늬 밖에서) |
| 움직임 | 걷기·앉아 일하기 프레임 애니메이션만. 깜박임·번쩍임 효과 없음(6절 "배지를 깜박이게 하지 않는다"와 같음). `prefers-reduced-motion: reduce`면 걷지 않고 목적지로 바로 옮기며, 동작은 첫 프레임에 멈춘다 |

### 12.3 색 단계와 제안 토큰 (초안)

3단 명암을 맞추려면 2절 토큰에 몇 단계가 빈다. 아래는 **제안**이며 승인 전에는 `tokens.css`에 넣지 않는다(기존 값은 바꾸지 않는다).

| 재질 | 밝은 면 | 기본 | 그늘 | 쓰는 곳 |
|---|---|---|---|---|
| 벽 | — | office-wall #E9E5CE | office-wall-trim #CFC8A1 | 위쪽 벽 앞면, 기둥 |
| 바닥 | office-floor-a #D9D5BD | (같음) | office-floor-b #BCB797 / office-edge #9D9879 | 바닥, 줄눈, 가구 그림자, 방 외곽 |
| 큰 가구 포인트 | 제안 office-accent-light #E8875A | office-accent #CF6236 | office-accent-shade #A33D1C | 소파, 방석 하나 |
| 머스터드 | office-mustard-light #F5E0A6 | office-mustard #D8C362 | 제안 office-mustard-shade #A8923C | 낮은 탁자, 방석, 러그, 켜진 노트북 화면 |
| 식물 | office-plant-light #A6CB6E | office-plant #6B8E34 | (2단) | 화분 잎 |
| 남색 가구 | 제안 office-furniture-light #565C7D | office-furniture #363B55 | (기본이 가장 어두움, 외곽선으로 구분) | 책상 다리, 서랍장, 노트북 몸체, 의자 |
| 나무 | 제안 office-wood-light #AD8C70 | office-wood #8C6D55 | 제안 office-wood-shade #6A4F3D | 책상 상판, 책장, 화분 받침 |
| 외곽선 | — | 제안 office-outline #262A3B | — | 모든 물체·캐릭터 실루엣 (= ink 값, 이름만 사무실용) |

- 켜진 노트북 화면은 새 색(하늘색 등)을 만들지 않고 `office-mustard-light` + 1 아트 px `office-wall` 반짝임으로 그린다. 작업 중 상태 색(파랑)과 헷갈리지 않게 하기 위해서다.
- 제안 값의 대비: 장식이라 대비 요구는 없다. 글자는 사무실 바닥·가구 위에 직접 쓰지 않고 이름표(12.6) 위에만 쓴다.

### 12.4 가구 목록과 구역 배치

방 크기 권장: **20×13칸(640×416px, 1배)**. 1단계 배치에서 사무실 칸 안쪽 폭은 약 334px라 0.5배(320×208px)로 그려진다. 사무실을 더 크게 보일지(패널 배치 변경)는 3단계에서 정한다(13절 미결).

| 가구 | 크기(칸, 권장) | 재질·색 | 역할 |
|---|---|---|---|
| 책상 | 2×1 (상판 + 앞면) | 나무 상판, 남색 다리 | 작업 중·생각 중 좌석. 책상 하나에 좌석 하나 |
| 의자 | 1×1 | 남색 가구 | 책상 좌석. 등받이는 전경 레이어(캐릭터 앞) |
| 노트북 | 1×1 안 (열림/닫힘 2벌 × 방향 4) | 남색 몸체, 켜진 화면 머스터드 밝은 색 | 앉은 BOT이 작업 중·생각 중이면 열림, 아니면 닫힘(vendor 방식) |
| 소파 | 3×1, 직선형 | office-accent 3단 | 쉬는 곳 좌석 3개 |
| 낮은 탁자 | 2×1, 직사각형 | 머스터드 3단 | 쉬는 곳 가운데. 앉는 자리 아님 |
| 방석 | 1×1 | 머스터드 밝은 면 / 하나는 accent | 쉬는 곳 좌석 |
| 러그 | 4×3 | 머스터드 밝은 면 + 테두리 | 쉬는 곳 바닥 표시 |
| 화분 | 1×1 (잎은 1칸 위로 넘침) | 식물 2단 + 나무 받침 | 장식. 방 모서리·통로 끝. 잎 윗부분은 전경 |
| 책장 | 2×2 (벽에 붙임) | 나무 3단, 책등은 2절 색 중 office-accent·mustard·plant·furniture | 장식. 위쪽 벽 앞 |
| 서랍장 | 1×1 (벽에 붙임) | 남색 가구 | 장식 |
| 창문 | 2×1 (위쪽 벽 앞면) | 벽 색 틀 + 밝은 면 유리 | 장식 |
| 승인 대기 게시판 | 3×1 (위쪽 벽 앞면) | 나무 틀 + office-wall 종이 몇 장 | **승인 대기 자리 표시**. 그 아래 바닥에 서는 자리 4개 |
| 문 | 2×1 (아래쪽 벽 가운데) | 문 매트 office-mustard-light | BOT이 들어오고 나가는 곳 |

배치 원칙
- **세 구역 = 1단계와 같은 상태 구분**: (1) 위쪽 벽 앞 **승인 대기 자리** — 게시판 아래 서는 자리 4개, 앞(아래)을 보고 `alert` 동작. 방에 들어서면 가장 먼저 눈이 가는 위쪽에 둔다. (2) 왼쪽~가운데 **책상 구역** — 책상 2개씩 마주 보는 책상 섬, 기본 8좌석(역할 8개: 책임자·planner·architect·designer·developer·qa·security·devops), 최대 12좌석. (3) 오른쪽 **쉬는 곳** — 러그 위 소파 + 낮은 탁자 + 방석, 좌석 5개 이상.
- 통로: 문 → 세 구역이 폭 1칸 이상 통로로 이어진다. 좌석 앞 1칸은 비워 둔다(앉으러 걸어갈 자리).
- 좌석 방향: 책상 좌석은 위·아래를 보게 배치한다(앞모습·뒷모습 프레임). 좌우를 보는 좌석은 책상 섬 끝에만.
- 겹침: 캐릭터 머리 위 1칸(말풍선 자리)에는 전경 가구를 두지 않는다. 이름표 자리(발 아래 반 칸)는 통로나 바닥이 되게 한다.
- 장식은 구역 경계에만(화분, 책장). 책상 구역 한가운데에 장식을 두지 않는다 — 정보(누가 어디서 일하는지)가 먼저 보여야 한다.
- 좌석이 모자라면(같은 역할 BOT이 많을 때): 책상 구역 가장자리 서는 자리에 `idle`로 둔다(규칙 확정은 3단계, 13절 미결).

### 12.5 데이터 파일 (그림 대신 좌표)

vendor가 그림에서 읽던 좌석 좌표·이동 가능 영역을 JSON으로 둔다. 형식은 3단계 설계에서 확정하되, 디자인상 필요한 항목은 다음과 같다.
- 방 크기(칸 수), 타일 크기 32.
- 이동 가능 격자: 칸마다 통과 가능/불가.
- 좌석: `id`, `zone`(`waiting` | `desk` | `idle`), 발 기준 좌표(px), 바라보는 방향, 자세(`sit` | `stand`), 쉬는 동작(쉬는 곳만, `idle` 또는 `done`).
- 노트북 자리: 좌표, 방향, 연결된 책상 좌석 `id`.
- 문 좌표(들어오기·나가기).
- 레이어 그림: 배경 1장, 전경 1장, 노트북 열림·닫힘 × 방향.

### 12.6 이름표·상태 말풍선 (사무실 안 UI)

사무실 안의 글자는 그림이 아니라 UI 요소다. 그림 배율과 관계없이 CSS px로 그리고, 2.1에 따라 다크 모드에서도 라이트 값이다.
- **이름표**: 발 아래 4px. 바탕 surface, 1px ink 테두리(바닥 위 9.62. border-strong은 바닥 위 2.50이라 쓰지 않음), radius sm, 좌우 여백 4px, caption 600 ink "{표시 이름}", 최대 폭 80px 말줄임. 글꼴은 `--font-body`(Pretendard). 픽셀 글꼴을 쓰지 않는다.
- **상태 말풍선**: 머리 위 4px. 상태 bg 바탕 + 1px 상태 fg 테두리 + 상태 아이콘(16px) + 상태 문구(caption fg, 예 "승인 대기 · 2시간째"). 불투명. 6절 StatusBadge와 같은 색·아이콘·문구 — 사무실에서도 상태는 색 + 아이콘 + 문구다. 작업 중은 문구 생략 없이 "작업 중 · Bash".
- 생각 중은 말풍선 아이콘이 점 세 개. 완료는 말풍선 없이 이름표만 둘지 3단계에서 정한다(쉬는 곳에 많을 때 복잡도).
- 접근성: canvas는 `aria-hidden="true"`, 같은 내용을 1단계와 같은 목록(`<ul aria-label="사무실">`, 시각적으로 숨김)으로 둔다.

### 12.7 1단계 임시 사무실과의 관계

1단계는 그림 없이 사각형이며, 이번 결정으로 모양·간격을 바꾸지 않는다(사용자 지시: 나머지는 그 후 조정). 대신 다음 점이 3단계 방향과 이미 맞물린다.

| 3단계 방향 | 1단계 근사 |
|---|---|
| 세 구역: 위 승인 대기 자리 / 책상 구역 / 쉬는 곳 | OfficeFloor 세 구역을 같은 순서(승인 대기 → 책상 → 쉬는 곳)로 위에서 아래로 쌓는다 |
| 작업 중 = 책상에 앉아 일함, 생각 중 = 책상에 앉아 있음 | 책상 막대(office-furniture)에 working은 붙어서, thinking은 8px 떨어져 |
| 굵은 어두운 외곽선 | 아바타 2px 상태 fg 테두리(외곽선 역할) |
| 바닥 office-floor-a + 줄눈 | office-floor-a 단색(줄눈 없음) |
| 다크에서도 밝은 방 + 외곽 office-edge | 같다(`data-office-scope`, 다크 2px office-edge 테두리) |
| 이름표 + 상태 말풍선(색 + 아이콘 + 문구) | 사각형 아래 이름 + 상태 문구, 사각형 안 상태 아이콘 |
| 캐릭터 프레임 48×64 정수 배율 | 캐릭터 설정이 있으면 프레임을 40px 높이에 맞춘 정수 배율로(명세 3.8) |
| 이동 애니메이션 | 없음(구역이 바뀌면 다시 그림) |

### 12.8 캐릭터 스타일 권장 규격 (사용자가 그림을 넣을 때)

사용자가 직접 넣는 그림이라 강제하지 않는다. 사무실 그림과 어울리게 하려면 아래를 권한다. 형식(설정 파일)은 HANDOFF 설계 7절을 따른다.

| 항목 | 권장 |
|---|---|
| 프레임 | 48×64px(설정 `frameWidth`/`frameHeight`. 다른 크기도 동작하지만 좌석 좌표가 48×64 기준) |
| 픽셀 밀도 | 24×32 아트 픽셀로 그려 2배(2×2 블록)로 키운 그림. 48×64를 1:1로 촘촘히 그리면 배경보다 세밀해 겉돈다 |
| 기준점 | 발이 프레임 아래 가운데, 아래 여백 2~4px. 머리 위 여백 4px 이상(말풍선은 프레임 밖에 그린다) |
| 비율 | 머리가 큰 2~2.5등신. 몸 폭 16 아트 픽셀(타일 한 칸) 이하 |
| 선과 명암 | 1 아트 픽셀 어두운 외곽선(권장 #262A3B), 색마다 3단 명암, 빛은 왼쪽 위 |
| 색 | 캐릭터 하나에 16색 이하. 옷 전체를 상태 색(작업 중 파랑 #2A4FBF, 응답 없음 진홍 #AE1F40 등)으로 칠하지 않기 — 상태 표시와 헷갈린다 |
| 파일 | PNG 또는 WebP 무손실, 배경 투명, 반투명 픽셀 없음, 안티앨리어싱 없음 |
| 줄(동작) | `idle`·`walk` 4방향 각 4프레임, `sit`·`sit_work` 4방향(또는 down만 — 없는 방향은 대체 규칙 D-19로 down을 씀), `alert` down, `done` down. fps: idle 2~4, walk·sit_work 6~8 |
| 앉은 그림 | 좌석 기준점(발 위치)에 놓았을 때 의자에 앉아 보이도록. 의자 등받이는 전경 레이어가 덮는다 |
| 하지 않을 것 | 원본 Pixel Agent Desk 캐릭터 시트 위에 덧그리기(vendor README), 기존 게임 캐릭터 복제 |

## 13. 미결 사항

해결됨(2026-11-11 사용자 결정): 색 v3 승인, 다크 모드 사무실 색(2.1), 웹폰트 도입(3.1 — Pretendard만, 모노는 시스템), 숨긴 세션 보기(6절 HiddenSessions, 명세 3.6.1), 로그인 비밀번호 안내 각주(명세 2절). 명세의 옛 색 문구(Tabs 막대, 응답 없음 색)는 이미 새 값으로 맞춰져 있음을 확인했다.

남은 것
- **12절 사무실 시각 방향 전체가 사용자 승인 전(초안)**. 특히 확인할 것: 승인 대기를 따로 "게시판 앞 자리"로 보내는 것(vendor는 쉬는 구역), 바닥 무늬(줄눈), 제안 토큰 6개 값(12.3), 방 크기 20×13칸.
- 3단계 사무실을 지금 배치(1280에서 오른쪽 360px 열)에 0.5배로 둘지, 더 넓은 자리로 옮길지. 0.5배면 캐릭터가 24×32 CSS px로 작다.
- 좌석보다 BOT이 많을 때 규칙(12.4 마지막 줄), 완료 BOT의 말풍선 표시 여부(12.6).
- 새로 그린 사무실 그림 파일을 공개 저장소 기간에 커밋할지(우리가 새로 그린 그림이라 라이선스 문제는 없으나, HANDOFF "주의"는 캐릭터 그림만 금지로 적고 사무실 그림은 정하지 않음).
- 다크 모드 수동 전환 여부(1단계는 시스템 설정만).
- 숨긴 세션 API 세부(명세 9절): `hidden=only`의 `project` 필터 적용 여부, 접기 버튼 개수(N)를 얻는 방법(폴링마다 `hidden=only`를 부를지 목록 응답에 `hiddenCount`를 넣을지), 24시간이 지난 종료 세션을 다시 표시했을 때 목록에 보이지 않는 문제.
- `docs/team/reports/design-palette.png`는 이전 팔레트(파랑 포인트) 기준이라 지금 값과 다르다. 쓰지 말고 필요하면 다시 만든다.
- 간격·컴포넌트는 숨긴 세션 외에는 이번에도 다루지 않았다(사용자 지시: 나머지는 그 후 조정).

## 14. 이전 초안과 달라진 점

1. **파랑 충돌 해결**: primary #2F5BD3 / #7EA2FF(파랑) → 잉크색 #1A1D23 / #E8EAEE. 파랑(#1D4ED8 / #8FB1FF)은 "작업 중" 상태 전용이 됐다. 선택·포커스·주요 버튼에는 유채색을 쓰지 않는다.
2. 토큰 추가: `primary-hover`(#33373F / #FFFFFF), `surface-selected`(#E9ECF1 / #232833). color-mix로 호버 색을 만들던 규칙 삭제.
3. 선택된 세션 행: primary 8% 섞은 파란 배경 → surface-selected 배경 + 왼쪽 잉크 막대 + 이름 600.
4. 링크: 파랑 글자 → ink 글자 + 밑줄.
5. 탭 선택 막대: 파랑 → 잉크(명세 반영).
6. 대비 표 갱신: primary 관련 행을 새 값으로 다시 계산하고, 선택 행 글자·포커스 링 행 추가.
7. 글자 굵기: h1·h2 700 → 600, 굵기 상한 600 규칙 추가. mono 사용 범위 명시.
8. 모서리: 카드·패널 radius lg 10 → 8px. 알약형 버튼·탭 금지.
9. 그림자: 한 겹 → 작은 그림자 여러 겹(shadow-sm 두 겹, shadow-md 세 겹). 다크는 그림자 없이 표면 단계로 깊이.
10. 표면 단계 순서(canvas < surface < surface-selected < surface-elevated)를 명시.
11. 웹폰트를 "금지"에서 "파일 추가 없이 쓰되, 도입은 제안으로 남김"으로 바꿈.
12. 11절 레퍼런스: "외부 레퍼런스 없음" → Linear·Vercel 원문을 읽고 가져온 것·다르게 한 것을 표로 정리.

### 14.1 2차 재검토(색 계열) — 1차 재검토 대비 달라진 점

13. **색 계열 변경**: 무채색 회청색 표면 → 따뜻한 크림 표면(canvas #F6F2E6, surface #FFFDF7 등). 다크도 같은 계열의 따뜻한 숯빛(canvas #16150F). 근거: 사용자 제공 분위기 참고 이미지(11.4).
14. **포인트 색 부활**: primary 잉크(#1A1D23 / #E8EAEE) → 테라코타(#A8431D / #F0875A). 쓰임은 주요 버튼·탭 선택 막대로 좁혔다. 다크 primary 위 글자는 어두운 색(#1E0F08).
15. **토큰 추가 `focus-ring`, `selected-bar`**(= ink): 포커스 링·선택 막대는 primary에서 떼어 남색 잉크로 칠한다. 상태 막대·배지 옆에 테라코타가 오지 않게 해 파랑 충돌과 같은 혼동을 막는다. 6절의 해당 참조(공통 포커스, 입력 포커스 테두리, SessionRow 선택 막대)를 새 토큰으로 바꿨다.
16. **잉크**: #1A1D23 → 남색 잉크 #262A3B(남색 가구 계열). ink-muted, border, border-strong은 따뜻한 회색으로.
17. **상태 색 조정**: 작업 중 #1D4ED8 → #2A4FBF, 생각 중 보라 → 자두색 #7A3592, 승인 대기 앰버 #7A4A00 → 머스터드 갈색 #6E5000, 응답 없음·danger 빨강 #B42318 → 진홍 #AE1F40(테라코타와 색상각 30도 차), 완료 #166534 → #2A6331, 종료 → 따뜻한 회색. bg도 크림 위에서 어울리게 바꿨다. 다크 값도 같이 바꿨다.
18. **사무실 영역 토큰 13개 추가**(`office-wall`, `office-wall-trim`, `office-floor-a/b`, `office-edge`, `office-accent`, `office-accent-shade`, `office-mustard`, `office-mustard-light`, `office-plant`, `office-plant-light`, `office-furniture`, `office-wood`). 사무실 영역 밖에서는 쓰지 않는다.
19. **임시 사무실 색**: 바닥 surface-sunken → office-floor-a, 책상 막대 border-strong → office-furniture(바닥 위 border-strong 대비 2.50 미달). 모양·크기·배치는 그대로.
20. **대비 표 전면 재계산**: 모든 텍스트·비텍스트 조합을 새 값으로 다시 계산하고, 사무실 바닥 위 글자·아바타 테두리·책상 막대, 승인 대기 띠 문구, 선택+대기 막대 행을 추가했다. 미달 조합(ink-muted / office-floor-b, border-strong / office-floor-a)은 쓰지 않도록 규칙으로 적었다.
21. 11.1 표의 "주요 동작 색", "유채색 절제" 행을 이번 결정에 맞게 고쳤고, 11.4(사용자 제공 분위기 참고)를 추가했다.

### 14.2 사용자 결정 반영(2026-11-11) — v3 초안 대비 달라진 점

22. **status: draft → approved**. 색 값은 바꾸지 않았다. frontmatter 여는 줄(`---`)이 빠져 있던 것을 넣었다.
23. **다크 모드 사무실**: `office-*` 다크 값 13개 삭제(다크에서도 라이트 값). 사무실 안은 `data-office-scope`로 ink·상태 색 등까지 라이트 값을 받는다(2.1). 다크 모드에서만 사무실 바깥 2px office-edge 테두리. 대비 표의 사무실 행 다크 열을 라이트 값으로 바꾸고, 바닥 경계·외곽 테두리·이름표 행을 추가했다.
24. **Pretendard 웹폰트**: 본문·제목 글꼴을 Pretendard 가변 woff2 한 파일로(3.1). 위치 `app/fonts/`, `next/font/local` + `display: swap`, 라이선스 원문 `app/fonts/OFL.txt` + THIRD_PARTY_NOTICES.md. 모노는 시스템 기본(JetBrains Mono 제안 삭제). Don't의 "폰트 파일 금지"에 이 한 파일 예외를 적었다.
25. **숨긴 세션**: 6절에 HiddenSessions 컴포넌트와 SessionRow `variant="hidden"` 추가, secondary 버튼 용도에 "다시 표시" 추가.
26. **12절 사무실 시각 방향(초안)** 새로 씀. 1절 "피해야 할 인상"에 게임풍은 사무실 안에서만이라고 적고, Don't에 특정 게임 고유 요소 금지를 추가했다.
27. 10절 경로 표기 `src/app/` → `app/`(HANDOFF 설계 1절과 맞춤).
