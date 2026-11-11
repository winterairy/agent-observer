# 다른 세션용 프롬프트: dev-team-kit statusLine 추가

아래 블록 전체를 winterairy/dev-team-kit 저장소를 연 새 Claude Code 세션에 붙여 넣는다.

````text
winterairy/dev-team-kit 저장소에 플랜 사용량 수집용 statusLine 스크립트를 추가하고 설치기를 고친다. 이 기능을 쓰는 쪽은 agent-observer 관찰 서버다. 서버 쪽 구현은 다른 세션이 맡는다.

## 기준 문서
설계는 agent-observer 저장소 docs/HANDOFF.md의 "### 6. 플랜 사용량 (T1-8)" 절에 있다. 그중 6.1(스크립트), 6.2(설치기), 6.3(전송 형식)을 따른다.
https://github.com/winterairy/agent-observer/blob/ccr-8787a7c0-5ou4xy/docs/HANDOFF.md
같은 문서의 "결정 필요" 표 D-21~D-30도 참고한다.
설계와 다르게 해야 하면 임의로 바꾸지 말고 이유와 함께 멈추고 보고한다.

## 배경 (확인된 사실)
- Claude Code 2.1.322 기준으로 hook 입력에는 플랜 사용량이 없다.
- statusLine 명령의 stdin JSON에는 구독 사용자일 때만 `rate_limits`가 들어온다.
  - 형식: `rate_limits.five_hour` / `rate_limits.seven_day` = `{ used_percentage: 0~100, resets_at: Unix epoch 초 }`
  - API가 보고하는 동안만, 그리고 첫 API 응답 이후에만 들어온다.
- statusLine 설정에는 `refreshInterval`(N초마다 다시 실행)이 있다.
- stdin에는 `cwd`와 `workspace.project_dir`도 들어온다.

## 할 일
1. `kit/team/observe/statusline.mjs`를 새로 만든다. 설계 6.1을 따르고 Node 내장 모듈만 쓴다.
   - stdin을 읽고 `rate_limits`를 추출한다.
   - 기존 statusLine 명령을 감싸서 같은 stdin으로 실행하고, 그 출력을 그대로 보여 준다. 제한 시간은 2초이고, 넘거나 실패하면 기본 한 줄 `5h 42% · 7d 13%`을 출력한다.
   - 전송은 값이 바뀌었을 때만, 최대 1분에 1회 한다. 값이 그대로이면 10분마다 다시 보낸다. tmpdir의 상태 파일과 잠금 파일로 제어한다.
   - 전송은 분리된 자식 프로세스로 `POST {AGENT_OBSERVER_URL}/api/plan-usage/report`에 보낸다. 출력을 기다리게 하지 않는다.
   - `send` 코드는 observe.mjs에서 복사한다. observe.mjs는 고치지 않는다.
   - 본문은 `{v:1, ts, remote, rate_limits}`만 담는다. 작업 폴더, 세션 ID, transcript 경로, 모델, 비용은 넣지 않는다.
   - 어떤 경우에도 exit 0으로 끝난다.
2. `bin/cli.mjs` 설치기에 statusLine 처리를 넣는다. 설계 6.2를 따른다.
   - 프로젝트 settings.json에 statusLine이 없을 때, 이미 kit 명령일 때, 다른 명령일 때, type이 command가 아닐 때를 각각 처리한다.
   - 다른 명령을 감쌀 때는 원래 값을 `.claude/team/observe/statusline.json`에 보존한다.
   - `--statusline=wrap|skip` 옵션을 둔다. 지정하지 않으면 TTY에서는 y/N으로 묻고, TTY가 아니면 건너뛴다.
   - settings.local.json이나 사용자 설정에 statusLine이 있으면 알림을 출력한다.
   - 되돌리는 방법을 안내한다. 자동 되돌리기 명령은 Should다.
3. 함께 고칠 버그가 하나 있다.
   - 증상: `npx --yes github:winterairy/dev-team-kit install`이 아무 출력 없이 exit 0으로 끝나고 설치하지 않는다.
   - 원인: 파일 끝의 "직접 실행일 때만 main" 검사가 `path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)`이다. npx는 심볼릭 링크로 실행하므로 두 경로가 다르다.
   - 고치는 법: 두 경로를 `fs.realpathSync`로 실제 경로로 바꾼 뒤 비교한다.
   - statusline.mjs도 같은 패턴을 쓰므로 같이 적용한다.
4. 테스트(`node --test`)를 추가한다.
   - statusline.mjs: `extractRateLimits`, `decideSend`(1분 제한, 변경, 10분 재전송, 시계 역행), `formatDefault`, `resolveWrapCommand`(자기 자신 제외, INNER 환경 변수).
   - 감싸기 실행: 정상, 2초 초과, 실패.
   - 로컬 HTTP 서버로 실제 전송: 본문 키가 정해진 것뿐인지 확인한다.
   - 설치기: mergeSettings statusLine 표의 각 행, `--statusline` 세 값, settings.local.json 알림, npx 실행 경로(심볼릭 링크) 회귀 테스트.
5. README에 statusLine 설명을 쓴다. 보내는 값, 전송 간격, 환경 변수, 기존 statusLine과 함께 쓰는 법, 되돌리기, `NO_PROXY=127.0.0.1,localhost`, 구독 계정만 해당한다는 점을 담는다.
6. package.json 버전을 올린다(예: 0.1.2).

## 먼저 확인할 것 (구현 전)
- statusLine 명령 환경에서 `CLAUDE_PROJECT_DIR`가 설정되는지, 명령 문자열의 `${CLAUDE_PROJECT_DIR:-.}`이 동작하는지 확인한다.
  - 방법: 스크립트가 `process.env.CLAUDE_PROJECT_DIR`와 `process.cwd()`를 디버그 파일에 적게 해서 실제 Claude Code 세션에서 본다.
  - 둘 다 안 되면 프로젝트 절대 경로를 넣지 말고 멈추고 보고한다. 절대 경로는 클라우드나 다른 PC에서 깨진다.

## 아직 사용자 결정 대기인 것 (기본값을 넣지 말고 옵션으로만 만든다)
- 설치기가 statusLine에 `refreshInterval: 60`을 함께 넣을지.
  - 세션이 한가하면 statusLine이 실행되지 않아 서버에서 15분 뒤 "오래됨"으로 보이는 문제의 해결책이다.
  - 지금은 `--refresh-interval=<초>` 옵션만 만들고, 기본은 넣지 않음으로 둔다.

## 하지 말 것
- observe.mjs 수정 금지(설계 6.1).
- 새 런타임 의존성 추가 금지(설계 6.1, Node 내장 모듈만).
- 사용자 설정(~/.claude/settings.json)과 settings.local.json 수정 금지(설계 6.2).
- 토큰, 실제 수집 데이터, 개인 경로 커밋 금지.
- 기본 브랜치에 직접 push하거나 force push 금지. 작업 브랜치에서 하고 PR은 사용자가 요청할 때만 만든다.

## 완료 기준
- `npm test`가 통과한다.
- `node bin/cli.mjs install --target <임시 git 폴더> --dry-run`과 실제 설치가 위 표대로 동작한다.
- 심볼릭 링크로 실행해도 설치가 된다.
- 마지막에 바뀐 파일, 테스트 결과, CLAUDE_PROJECT_DIR 확인 결과, 설계와 다르게 한 점을 보고한다.
````
