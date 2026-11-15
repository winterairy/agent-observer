# 2단계 Vercel 배포 준비 메모

**1단계에서는 배포하지 않는다.** 이 문서는 2단계 작업 목록이다. 아래 명령은 책임자 승인 후 사람이 실행한다. BOT은 실행하지 않는다.

## 1. 파일 저장소가 Vercel에서 동작하지 않는 이유

- 현재 기본 저장소는 `OBSERVER_STORE=file`로 `.data/state.json`에 쓴다. Vercel 함수의 파일 시스템은 읽기 전용(쓰기는 `/tmp`만)이고 `/tmp`도 인스턴스마다 따로이며 언제든 사라진다.
- 함수 인스턴스가 여러 개 뜨면 메모리 상태(`memory` 저장소, 로그인 실패 제한 카운터)도 공유되지 않는다.
- 그래서 저장소 인터페이스(`src/store`) 뒤에 외부 DB 구현을 새로 넣어야 한다. 후보: Neon Postgres 또는 Upstash Redis(profile 메모). null-prototype 사전 규칙(`src/domain/dict.ts`, SEC-01)을 새 구현에서도 지키고 `tests/api/protoKeys.test.ts`를 유지한다.

## 2. 필요한 환경 변수(Vercel Project Settings > Environment Variables, 값은 문서에 쓰지 않음)

| 이름 | 2단계 | 비고 |
|---|---|---|
| `OBSERVER_TOKEN` | 필수 | Sensitive로 저장. 로컬과 다른 값 |
| `OBSERVER_PASSWORD` | 필수 | Sensitive |
| `OBSERVER_SESSION_SECRET` | **필수로 바꿈** | 비밀번호 파생 대신 별도 32자 이상. 없으면 시작 실패하게 코드 변경 필요 |
| `OBSERVER_STORE` | 필수 | 새 DB 구현 이름(예정) |
| DB 연결 변수 | 필수 | 예: `DATABASE_URL` 또는 `UPSTASH_REDIS_REST_URL`/`_TOKEN`(선택한 DB에 따름, 이름은 구현 때 확정) |
| `OBSERVER_CHARACTERS_DIR` | 검토 | 캐릭터 그림은 저장소에 커밋하지 않으므로 배포본에 어떻게 넣을지 결정 필요 |

보내는 PC의 `AGENT_OBSERVER_URL`은 배포 주소(https)로 바꾼다.

## 3. 보안 보고서(security-stage1.md)의 2단계 항목

- **nonce 기반 CSP**: proxy(middleware)에서 요청마다 nonce를 만들어 `'unsafe-inline'`을 없앤다. 운영 빌드에 `'unsafe-eval'`이 없는지 확인. `frame-ancestors 'none'` 유지.
- **HSTS**: `Strict-Transport-Security` 추가.
- **`OBSERVER_SESSION_SECRET` 필수화**와 교체 절차, 쿠키 기간(30일) 단축 검토.
- **로그인 제한 저장소**: 현재 메모리 카운터라 인스턴스 간 공유가 안 됨. 공유 저장소(DB/Redis)로 옮기고 잠금 DoS도 검토.
- **x-forwarded-for**: 지금은 첫 값을 IP로 쓴다(`src/auth/rateLimit.ts`). 위조 가능하므로 Vercel이 넣는 `x-real-ip`나 마지막 hop만 믿도록 바꾼다.
- Origin 비교 기준을 `Host` 대신 설정된 공개 호스트로, `Sec-Fetch-Site` 함께 확인. `isHttps`의 x-forwarded-proto 신뢰 범위 확인, Secure 쿠키 강제.
- SEC-01 수정 유지 확인(공개 수집 엔드포인트가 되므로 필수).
- 배포 시점에 Next.js 16.x 보안 공지 재확인.

## 4. 저장소 비공개 전환

배포 전에 GitHub 저장소를 비공개로 전환한다(profile 메모). 저장소 소유자가 Settings > General > Danger Zone > Change visibility에서 직접 한다. 전환 전 커밋 이력에 비밀값이 없는지 다시 확인한다.

## 5. 배포 절차 초안(승인 후 사람이 실행)

1. 위 1·3절 코드 변경을 머지하고 CI 통과 확인.
2. Vercel 프로젝트 연결(대시보드 Import 또는 `vercel link`), 2절 환경 변수 등록.
3. Preview 배포로 확인: `/login` 200, 수집 401/202, 보안 헤더(`e2e/security-headers.spec.ts` 기준).
4. Production 승격.
5. 되돌리기: Vercel 대시보드 Deployments에서 이전 배포를 Promote(또는 `vercel rollback`). DB 스키마를 바꿨으면 이전 코드와 호환되는지 먼저 확인.

## 6. 사용자 확인 필요

- DB 선택(Neon Postgres / Upstash Redis)과 요금제.
- 캐릭터 그림을 배포본에 넣는 방법.
- 저장소 비공개 전환 시점.
