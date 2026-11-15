# 예시 캐릭터 설정

`sample/`은 동작 확인용 예시다. `sheet.png`는 이 저장소에서 코드로 만든 단색 사각형 테스트 그림이다
(원본 Pixel Agent Desk 그림이나 다른 게임 그림이 아니다). 한 칸 16×16, 2줄 × 2프레임.

- 줄 0: `idle` down 2프레임(회색 바탕, 프레임마다 다른 위치의 남색 점)
- 줄 1: `alert` down 2프레임(노란 바탕)
- `sit_work`·`sit`이 없으므로 작업 중·생각 중에는 D-19 대체 순서에 따라 `idle` 줄이 쓰인다.

실제로 쓰려면 이 폴더를 `characters/`(gitignore됨, `OBSERVER_CHARACTERS_DIR`로 바꿀 수 있음)에 복사하고
`characters/roles.json`에서 역할에 캐릭터 ID를 지정한다(예: `"lead": { "name": "책임자", "character": "sample" }`). 형식은 `config/roles.example.json`과 같다.
`roles.json`이 없으면 서버는 `config/roles.example.json`을 읽는다(그림이 없으면 사각형으로 보인다).
