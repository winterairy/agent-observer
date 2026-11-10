# 봇별 캐릭터 지정하기

Pixel Agent Desk는 원래 에이전트마다 캐릭터를 무작위로 골라요. 이 수정판에서는 **Claude Code 서브에이전트 이름에 따라 캐릭터와 이름표를 고정**할 수 있어요.

- 메인 세션(책임자 BOT) → `lead`
- 서브에이전트 → `.claude/agents/<이름>.md`의 `name` 값 (`planner`, `qa` 등)
- `roles.json`에 없는 에이전트(예: 기본 Explore 에이전트)는 기존처럼 기본 캐릭터 중 하나가 무작위로 배정돼요.

## 1. 캐릭터 이미지 준비

캐릭터 하나는 **스프라이트 시트 이미지 한 장**이에요.

- 크기: **384 × 576 px** (가로 8칸 × 세로 9줄, 한 칸 48 × 64 px)
- 형식: WebP 또는 PNG, 배경 투명
- 칸 배치: `docs/role-sprite-template.png`를 보세요. 각 동작(정면 대기, 걷기, 앉아서 일하기, 완료 춤, 알림 점프 등)마다 4프레임씩이에요.

기존 캐릭터 시트(`public/characters/avatar_0.webp` 등)를 그래픽 툴에 열어 보면 칸마다 어떤 포즈가 들어가는지 바로 알 수 있어요. 그 위에 새 캐릭터를 덧그리는 방법이 가장 쉬워요.

완성한 파일을 `public/characters/`에 넣으세요. 예: `public/characters/security.webp`

## 2. roles.json 작성

```bash
cp public/shared/roles.example.json public/shared/roles.json
```

`public/shared/roles.json`에서 이름과 파일명을 원하는 대로 바꾸세요.

```json
{
  "lead":     { "name": "책임자", "avatar": "lead.webp" },
  "security": { "name": "보안",   "avatar": "security.webp" }
}
```

- `name`은 화면에 표시될 이름이에요.
- `avatar`를 비워 두면 이름만 바뀌고 캐릭터는 무작위로 배정돼요.

## 3. 등록과 검사

```bash
npm run roles:sync
```

이 명령은 각 이미지가 있는지, 크기가 384 × 576인지 검사해요. 통과한 이미지는 `avatars.json`에 등록돼요. 문제가 있으면 어떤 봇의 어떤 파일이 왜 틀렸는지 알려 줘요.

검사를 통과하면 앱을 다시 시작하세요 (`npm start`).

## 참고

- 역할에 지정된 캐릭터는 무작위 배정 목록에서 빠져요. 그래서 일반 세션이 봇 캐릭터를 쓰는 일은 없어요.
- 같은 역할의 서브에이전트를 동시에 여러 개 띄우면 모두 같은 캐릭터로 나와요.
- Claude Code 세션을 여러 개 동시에 열면 메인 세션은 모두 `lead` 캐릭터로 표시돼요.
- 바뀐 코드: `src/roleConfig.js`(새 파일), `src/agentManager.js`, `scripts/sync-roles.js`(새 파일), `package.json`(`roles:sync` 명령 추가)
