# vendor/pixel-agent-desk

[Mgpixelart/pixel-agent-desk](https://github.com/Mgpixelart/pixel-agent-desk)에서 가져온 **참고용 코드**입니다. 그대로 빌드에 넣지 않고, 필요한 부분을 `src/`로 옮겨 고쳐 씁니다. 옮긴 파일에는 출처 주석을 남깁니다.

- 코드 라이선스: MIT (`LICENSE`, Copyright (c) 2025 geunilbae)
- 이 폴더에 있는 것: 사무실 렌더러·캐릭터·길찾기(`src/office/`), 역할 매핑(`src/roleConfig.js`, 이 프로젝트 사용자가 추가한 기능), 토큰 단가(`src/pricing.js`), 프레임 정의(`public/shared/`)
- **없는 것**: 원본의 캐릭터·사무실 그림(`public/characters/`, `public/office/`). 원본 그림 라이선스는 수정·재배포·서비스 포함을 금지하므로 가져오지 않았습니다.
- 사무실 렌더러는 원본 그림(`office_xy.webp` 좌표 이미지, `office_collision.webp` 충돌 이미지, 배경·전경 레이어)에서 좌석 좌표와 이동 가능 영역을 읽습니다. 새 사무실 그림을 만들 때 이 입력을 이미지 대신 데이터 파일(JSON)로 바꿔야 합니다.
- `ROLES.ko.md`의 "기존 캐릭터 시트 위에 덧그리기" 안내는 원본 그림 라이선스(수정 금지)에 어긋납니다. 따르지 마세요.
