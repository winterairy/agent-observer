# 프로젝트 설정 (dev-team-kit)

`/team-init`이 저장소를 읽고 초안을 만든다. BOT은 작업 전에 이 파일을 읽는다.
값을 모르면 `(없음)`으로 두고, 추측한 값에는 `(추정)`을 붙인다.

## 프로젝트
- 이름: agent-observer
- 한 줄 설명: Claude Code 세션과 dev-team-kit BOT의 활동·스킬 사용과 플랜 사용량을 픽셀 사무실 화면으로 보는 관찰 서버
- 플랫폼: web (Next.js). 2단계에 electron 창(`desktop/`) 추가 예정
- 문서 언어: 한국어

## 문서 위치
- 계획 문서: docs/HANDOFF.md#1단계-범위-이번-과업
- 설계 문서: docs/HANDOFF.md#결정-사항
- 디자인 기준: (없음) — 1단계에서 designer가 만든다 (추정: DESIGN.md)
- 구현 범위 문서: README.md (추정: "현재 구현 범위" 절을 새로 만든다)
- 상태 파일: docs/00-status.md
- BOT 산출물 폴더: docs/team/
- 보고서 폴더: docs/team/reports/

## 명령
- 패키지 관리자: pnpm (정확한 버전 고정: `pnpm add -E`, `.npmrc` save-exact)
- 설치: pnpm install
- 타입 검사: pnpm typecheck (= tsc --noEmit)
- 린트: (없음) — 설계 12절에서 선택. 아직 넣지 않음
- 단위 테스트: pnpm test (= vitest run, tests/unit·tests/api·tests/script)
- E2E 테스트: pnpm test:e2e -- --trace off (= playwright test, 포트 3100, Chromium은 /opt/pw-browsers/chromium 또는 PW_CHROMIUM_PATH)
- 빌드: pnpm build
- 개발 서버: pnpm dev → http://127.0.0.1:3000

## 검증 환경
- 클라우드에서 검증 가능한 것: Next.js 서버 실행, API 테스트, Playwright(Chromium) 화면 확인, observe.mjs로 실제 이벤트 전송 통합 테스트
- 이 환경에서 검증할 수 없는 것: Electron 창 실행(2단계), Vercel 실제 배포, 외부 DB 연결

## 디자인
- 리뷰 화면 너비: 390, 1280 (추정: 휴대폰과 PC에서 본다)
- 페이지 유형: 앱 화면만

## 보안
- 점검표: web (2단계부터 electron 추가)
- 추가 보안 조건: Bearer 토큰 인증(`OBSERVER_TOKEN`), payload 검증·크기 제한, 로그인 쿠키로 화면·조회 API 보호, 프롬프트·응답·도구 입력 미저장

## 배포
- 방식: vercel (1단계에서는 배포하지 않음)
- 배포 명령: (없음) — BOT은 실행하지 않음
- 메모: 2단계에 Vercel 배포와 DB(Neon Postgres 또는 Upstash Redis) 연결. 배포 전 저장소를 비공개로 전환

## 브랜치와 커밋
- 기본 브랜치: main
- 작업 브랜치 규칙: `<종류>/<내용>` (종류: feature, fix, docs, chore, refactor, test). 예: `feature/collect-api`, `fix/token-overwrite`. 클라우드 세션에서는 세션이 지정한 브랜치를 쓴다
- 작업 브랜치 push: 허용 (main 직접 push·force push는 settings.json에서 막힘)
- 커밋 형식: Conventional Commits + 한국어. `<종류>(<범위>): <요약>` + 이유를 적은 본문
  - 연결된 이슈가 있으면 범위 자리에 이슈 번호를 넣는다: `feat(#12): 이벤트 수집 API 추가`
  - 이슈가 없으면 모듈 이름을 넣는다: `feat(api): 이벤트 수집 API 추가`
  - 본문 마지막 줄에 `Refs #12`(진행 중) 또는 `Closes #12`(이슈 완료)를 적는다

## GitHub 이슈와 마일스톤
- 기획(planner)·설계(architect) 단계가 끝나면, 개발을 시작하기 전에 GitHub에 마일스톤을 만든다. 예: `agent-observer v1`
- 그 마일스톤 아래에 스테이지별 이슈를 만든다. 예: `1단계: 로컬 수집 서버와 화면`, `2단계: Vercel 배포·DB·Electron 창`, `3단계: 사무실 그림과 좌표 데이터`
- 이슈 본문에는 해당 스테이지의 Task 목록(체크박스)과 수용 기준, 기획·설계 문서 링크를 적는다.
- 개발 커밋은 해당 스테이지 이슈 번호를 커밋 형식에 맞춰 단다. 스테이지가 끝나면 마지막 커밋이나 PR에서 `Closes #번호`로 닫는다.
- 마일스톤·이슈 생성은 외부에 공개되는 작업이므로 만들기 전에 목록을 사용자에게 보여 주고 승인받는다.

- 커밋 작성자: `winterairy`. 클라우드 환경 기본값(Claude)을 쓰지 않는다. Default 환경 변수 GIT_AUTHOR_*/GIT_COMMITTER_*로 설정됨(2026-11-11). 2026-11-11 이전 작업 브랜치 커밋은 작성자가 Claude로 남아 있다.
- 기본 브랜치 병합: Squash and merge로 한다(작업 브랜치 이력은 다시 쓰지 않는다).

## 기타 규칙
- 저장소가 공개인 동안 캐릭터 그림, 토큰, 실제 수집 데이터를 커밋하지 않는다(`characters/`, `public/characters/*`, `.env*` 는 gitignore).
- 원본 Pixel Agent Desk 그림을 쓰거나 본떠 그리지 않는다. `vendor/` 코드는 바로 쓰지 말고 옮겨 고치며 출처를 표시한다(THIRD_PARTY_NOTICES.md).
- payload의 `usage`(토큰)는 받되 저장하지 않는다. 사용량은 statusLine의 플랜 사용량(rate_limits)으로 본다.
- 저장소는 인터페이스로 분리해 메모리/파일 구현을 나중에 Postgres·Redis로 바꿀 수 있게 한다.
- 로그인한 사용자만 화면을 볼 수 있어야 한다.
