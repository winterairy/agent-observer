name: agent-observer
status: draft            # draft(초안, 승인 대기) | approved(승인됨)
description: |
  여러 Claude Code 세션과 BOT의 상태·토큰·비용을 한눈에 보는 개인용 관찰 도구.
  색 계열은 "따뜻한 크림색 사무실"이다(사용자 제공 분위기 참고 이미지에서 색 계열만 가져옴, 11절). 크림 표면, 남색 잉크, 주황빨강(테라코타) 포인트, 머스터드·초록은 사무실 그림 영역에서만 쓴다.
  포인트 색(primary)은 주요 버튼·탭 선택 막대에만 쓰고, 포커스 링과 선택 막대는 남색 잉크로 칠해 상태 색과 겹치지 않게 한다.
  장식보다 정보 밀도와 상태 구분(색 + 아이콘 + 문구)을 우선한다. 라이트/다크 모두 지원한다.

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
  # 외부 폰트 파일을 추가하지 않는다. 운영체제 기본 글꼴만 쓴다.
  font-display: "system-ui, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', 'Segoe UI', Roboto, sans-serif"
  font-body: "system-ui, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Noto Sans KR', 'Segoe UI', Roboto, sans-serif"
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
- **피해야 할 인상**: 장난스러운 게임 화면, 과한 색, 알림 남발. 따뜻한 색 계열은 표면·포인트·사무실 영역에 한정하고, 패널·표·배지는 여전히 정보 도구처럼 보이게 한다. 1단계 임시 사무실도 장식 없이 사각형으로만 표현한다.

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
- **다크 모드**: 지원. `prefers-color-scheme: dark`를 따른다(수동 전환 버튼은 1단계 범위 밖). 같은 계열의 "저녁 사무실" — 크림 대신 따뜻한 갈색 숯빛 표면, 잉크는 밝은 크림, 포인트는 밝은 테라코타(위 글자는 어두운 색). 값은 아래.

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
| office-wall | #E9E5CE | #3B382C | 사무실 벽면 |
| office-wall-trim | #CFC8A1 | #4D4936 | 벽 아래 띠, 기둥 옆면 |
| office-floor-a | #D9D5BD | #34312A | 바닥 밝은 칸, 1단계 임시 바닥 |
| office-floor-b | #BCB797 | #2A2822 | 바닥 어두운 칸(글자 금지) |
| office-edge | #9D9879 | #1C1A15 | 방 외곽·벽 아래 그림자 |
| office-accent | #CF6236 | #C65A32 | 소파 등 큰 가구 포인트(장식) |
| office-accent-shade | #A33D1C | #93401F | office-accent 그늘면 |
| office-mustard | #D8C362 | #B8A249 | 탁자, 방석 |
| office-mustard-light | #F5E0A6 | #8A7A3E | 러그, 방석 밝은 면 |
| office-plant | #6B8E34 | #6B8E34 | 화분 잎 그늘 |
| office-plant-light | #A6CB6E | #8FB05A | 화분 잎 밝은 면 |
| office-furniture | #363B55 | #7880A8 | 남색 가구, 1단계 임시 책상 막대 |
| office-wood | #8C6D55 | #6E5543 | 나무 가구, 화분 받침 |

- **대비 검증** (WCAG 2.2 상대 휘도 공식으로 계산, 본문 4.5:1 / 큰 글자·비텍스트 3:1). 모든 행 통과. 장식(border, office 가구끼리)은 대비 요구가 없어 넣지 않았다.

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
| ink / office-floor-a (아바타 이름) | 9.62 | 10.77 | 텍스트 4.5 |
| ink-muted / office-floor-a (구역 이름, 상태 문구) | 4.77 | 5.38 | 텍스트 4.5 |
| ink / office-floor-b | 7.01 | 12.23 | 텍스트 4.5 (글자 금지 규칙은 유지) |
| ink / office-wall | 11.22 | 9.75 | 텍스트 4.5 |
| ink-muted / office-wall | 5.56 | 4.87 | 텍스트 4.5 |
| working fg / office-floor-a (아바타 테두리) | 4.78 | 6.21 | 비텍스트 3 |
| thinking fg / office-floor-a | 5.16 | 6.68 | 비텍스트 3 |
| waiting fg / office-floor-a | 5.05 | 7.61 | 비텍스트 3 |
| stale fg / office-floor-a | 4.63 | 5.97 | 비텍스트 3 |
| done fg / office-floor-a | 4.85 | 7.37 | 비텍스트 3 |
| ended fg / office-floor-a | 4.77 | 5.38 | 비텍스트 3 |
| office-furniture / office-floor-a (임시 책상 막대) | 7.42 | 3.37 | 비텍스트 3 |
| office-furniture / office-floor-b | 5.41 | 3.83 | 비텍스트 3 |

- **대비 표에 없는 조합과 이유**
  - 아바타 배경(상태 bg) / office-floor-a는 1.0~1.3이라 배경만으로는 구분되지 않는다. 아바타 경계는 2px 상태 fg 테두리(위 표, 3:1 이상)가 맡는다.
  - border-strong / office-floor-a는 2.50 / 2.74로 미달이라, 바닥 위 책상 막대는 border-strong 대신 office-furniture를 쓴다(6절).
  - ink-muted / office-floor-b는 라이트 3.48로 미달 → office-floor-b 위에는 글자를 두지 않는다.
  - border-strong / surface-sunken은 라이트 3.01로 겨우 통과한다. 입력창은 surface 위에만 둔다.

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
- **글꼴 라이선스**: 운영체제 기본 글꼴만 쓴다. 폰트 파일을 저장소에 추가하지 않는다.
- **제안(미적용, 별도 판단 필요)**: 운영체제마다 한글 글꼴이 달라 화면 인상이 바뀐다. 통일하려면 Pretendard(SIL OFL, 무료) 가변 웹폰트를 본문 글꼴로, mono는 JetBrains Mono(OFL)를 검토할 수 있다. 저장소 추가 또는 CDN 사용 여부는 책임자·사용자가 정한다.

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
| secondary | 정리, 다시 시도, 로그아웃 | surface | ink | 1px border-strong | 32px(데스크톱) / 40px(모바일) | md |
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
- 바닥: office-floor-a 단색(1단계는 체크 무늬 없음), radius lg, 여백 12px. 세 구역을 위에서 아래로: "승인 대기"(waiting), "책상"(working·thinking), "쉬는 곳"(done). ended는 표시하지 않는다.
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
- 폰트·이미지·아이콘 파일을 저장소에 추가하지 않는다(웹폰트는 3절 제안 참조).
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

## 12. 미결 사항

- 다크 모드 수동 전환 여부(1단계는 시스템 설정만).
- 정리한 세션을 다시 보는 화면(API `ended=all`) 제공 여부 — 1단계 명세에는 "숨긴 세션 보기" 토글을 넣지 않았다.
- 3단계 사무실 그림이 정해지면 6절 임시 사무실 항목을 교체한다.
- 웹폰트(Pretendard, JetBrains Mono) 도입 여부(3절 제안).
- `docs/team/reports/design-palette.png`는 이전 팔레트(파랑 포인트) 기준이라 이번 값과 다르다. 승인 전 다시 만들어야 한다.
- `docs/team/design-spec-stage1.md`의 색 문구 일부가 이전 값 기준이다: Tabs "2px primary(잉크색) 막대"(→ primary 테라코타), 응답 없음 "waiting(앰버)에서 stale(빨강)"(→ 머스터드 갈색에서 진홍). 토큰 이름은 그대로라 구현에는 영향이 없으나, 다음 명세 조정 때 문구를 맞춘다.
- 간격·글꼴·컴포넌트는 이번 색 재검토에서 다루지 않았다(사용자 지시: 색 먼저, 나머지는 이후 조정).
- 3단계 사무실 그림을 새로 그릴 때 `office-*` 토큰 외의 색이 필요하면(그늘 단계 추가 등) 이 문서에 먼저 추가한다.

## 13. 이전 초안과 달라진 점

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

### 13.1 2차 재검토(색 계열) — 1차 재검토 대비 달라진 점

13. **색 계열 변경**: 무채색 회청색 표면 → 따뜻한 크림 표면(canvas #F6F2E6, surface #FFFDF7 등). 다크도 같은 계열의 따뜻한 숯빛(canvas #16150F). 근거: 사용자 제공 분위기 참고 이미지(11.4).
14. **포인트 색 부활**: primary 잉크(#1A1D23 / #E8EAEE) → 테라코타(#A8431D / #F0875A). 쓰임은 주요 버튼·탭 선택 막대로 좁혔다. 다크 primary 위 글자는 어두운 색(#1E0F08).
15. **토큰 추가 `focus-ring`, `selected-bar`**(= ink): 포커스 링·선택 막대는 primary에서 떼어 남색 잉크로 칠한다. 상태 막대·배지 옆에 테라코타가 오지 않게 해 파랑 충돌과 같은 혼동을 막는다. 6절의 해당 참조(공통 포커스, 입력 포커스 테두리, SessionRow 선택 막대)를 새 토큰으로 바꿨다.
16. **잉크**: #1A1D23 → 남색 잉크 #262A3B(남색 가구 계열). ink-muted, border, border-strong은 따뜻한 회색으로.
17. **상태 색 조정**: 작업 중 #1D4ED8 → #2A4FBF, 생각 중 보라 → 자두색 #7A3592, 승인 대기 앰버 #7A4A00 → 머스터드 갈색 #6E5000, 응답 없음·danger 빨강 #B42318 → 진홍 #AE1F40(테라코타와 색상각 30도 차), 완료 #166534 → #2A6331, 종료 → 따뜻한 회색. bg도 크림 위에서 어울리게 바꿨다. 다크 값도 같이 바꿨다.
18. **사무실 영역 토큰 13개 추가**(`office-wall`, `office-wall-trim`, `office-floor-a/b`, `office-edge`, `office-accent`, `office-accent-shade`, `office-mustard`, `office-mustard-light`, `office-plant`, `office-plant-light`, `office-furniture`, `office-wood`). 사무실 영역 밖에서는 쓰지 않는다.
19. **임시 사무실 색**: 바닥 surface-sunken → office-floor-a, 책상 막대 border-strong → office-furniture(바닥 위 border-strong 대비 2.50 미달). 모양·크기·배치는 그대로.
20. **대비 표 전면 재계산**: 모든 텍스트·비텍스트 조합을 새 값으로 다시 계산하고, 사무실 바닥 위 글자·아바타 테두리·책상 막대, 승인 대기 띠 문구, 선택+대기 막대 행을 추가했다. 미달 조합(ink-muted / office-floor-b, border-strong / office-floor-a)은 쓰지 않도록 규칙으로 적었다.
21. 11.1 표의 "주요 동작 색", "유채색 절제" 행을 이번 결정에 맞게 고쳤고, 11.4(사용자 제공 분위기 참고)를 추가했다.
