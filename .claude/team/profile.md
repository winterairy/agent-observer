# 프로젝트 설정 (dev-team-kit)

`/team-init`이 저장소를 읽고 초안을 만든다. BOT은 작업 전에 이 파일을 읽는다.
값을 모르면 `(없음)`으로 두고, 추측한 값에는 `(추정)`을 붙인다.

## 프로젝트
- 이름: agent-observer
- 한 줄 설명: Claude Code 세션과 dev-team-kit BOT의 활동·토큰·스킬 사용을 픽셀 사무실 화면으로 보는 관찰 서버
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
아직 코드와 package.json이 없다. 아래는 1단계 구현 후 정해질 값이다.
- 패키지 관리자: pnpm
- 설치: pnpm install
- 타입 검사: (없음) (추정: pnpm exec tsc --noEmit)
- 린트: (없음)
- 단위 테스트: (없음) (추정: Vitest)
- E2E 테스트: (없음) (추정: Playwright)
- 빌드: (없음) (추정: pnpm build)
- 개발 서버: (없음) (추정: pnpm dev → http://127.0.0.1:3000)

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
- 작업 브랜치 규칙: (추정) 세션이 지정한 브랜치(예: `ccr-*`) 사용
- 작업 브랜치 push: 허용 (main 직접 push·force push는 settings.json에서 막힘)
- 커밋 형식: 영어 명령문 제목 + 이유를 적은 본문

## 기타 규칙
- 저장소가 공개인 동안 캐릭터 그림, 토큰, 실제 수집 데이터를 커밋하지 않는다(`characters/`, `public/characters/*`, `.env*` 는 gitignore).
- 원본 Pixel Agent Desk 그림을 쓰거나 본떠 그리지 않는다. `vendor/` 코드는 바로 쓰지 말고 옮겨 고치며 출처를 표시한다(THIRD_PARTY_NOTICES.md).
- `usage`는 누적값이므로 더하지 않고 덮어쓴다(같거나 큰 값만 반영).
- 저장소는 인터페이스로 분리해 메모리/파일 구현을 나중에 Postgres·Redis로 바꿀 수 있게 한다.
- 로그인한 사용자만 화면을 볼 수 있어야 한다.
