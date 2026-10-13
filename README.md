# 콕집서 (KOKJIPSEO)

1인 가구를 위한 냉장고 관리 서비스의 Figma 프로토타입 구현입니다. React·TypeScript·Vite·pnpm을 사용하며 별도의 UI 컴포넌트 라이브러리는 사용하지 않습니다.

## 실행

검증 환경: Node.js 24.21 / pnpm 11.25. Node.js 22.12 이상 권장.

```sh
pnpm install
pnpm dev
pnpm build
pnpm preview
```

개발 주소: http://127.0.0.1:5173/

## 구현한 화면

| Figma 노드 | 화면 | 로컬 주소 |
| --- | --- | --- |
| 5558:18818 | 홈 - 신규 사용자 (식재료 없음) | / |
| 5558:19292 | 냉장고 - 신규사용자 | /#5558:19292 |
| 5558:19197 | 식재료 등록 방식 | /#5558:19197 |

모바일 기준 390×844. [기본 홈 디자인](https://www.figma.com/design/yNSjwxFZv6vM3GxNPui9Mh/?node-id=5558-18818)을 읽기 전용으로 참조했습니다. Figma 원본과 디자인 시스템은 수정하지 않았습니다. 화면별 Variables·Styles·원본 이미지와 SVG를 로컬에서 사용합니다.

## 인터랙션

홈 CTA와 등록 메뉴는 등록 방식 화면으로 이동합니다. 홈에서 냉장고는 신규 사용자 냉장고 화면으로 이동합니다. 냉장고와 등록 화면의 홈 메뉴, 냉장고의 등록 CTA도 원본 연결대로 동작합니다. 화면 이동에는 Figma의 즉시 전환(transition: null)을 적용했습니다. 주소의 해시로 화면을 관리하며 브라우저 뒤로/앞으로 이동을 지원합니다.

`src/prototype/flow.ts`에 원본 목적지 ID를 보존했습니다. Figma 반응이 없는 필터·등록 방식 카드에는 임의 동작을 추가하지 않았습니다.

이번 범위는 홈·냉장고 신규 사용자·식재료 등록 방식까지입니다. 레시피와 마이페이지는 사용자 요청에 따라 제거했습니다. 하단 메뉴의 아이콘과 라벨은 유지하지만 두 메뉴는 비활성 상태입니다. 검색과 영수증 촬영 다음 단계의 원본 목적지는 보존했으며, 해당 화면도 이번 범위 밖이므로 버튼은 비활성 상태입니다.

## 초기 데이터

홈과 냉장고는 식재료 0개 상태입니다. 이전에 임의로 추가한 등록 폼, 저장 기능, 등록 목록, 완료 알림, 메뉴 안내 모달을 제거했습니다. 이전 브라우저 저장 키 `kokjipseo.ingredients.v1`도 앱 시작 시 삭제합니다. 새 식재료 데이터는 저장하지 않습니다.


## 구조

```text
src/
  App.tsx                  # 화면 구성과 해시 이동
  components/              # 공통 버튼, 헤더, 카드, 배너, 하단 내비게이션
  features/
    home/                  # 기본 빈 홈
    fridge/                # 신규 사용자 냉장고
    registration/          # 등록 방식 선택 화면
  prototype/flow.ts        # 확인된 원본 연결과 목적지
  assets/                  # Paperlogy 글꼴
  lib/assets.ts            # 배포 경로를 고려한 자산 URL
  styles/                  # Figma 토큰과 화면 CSS
public/assets/             # 원본 이미지·SVG
```

별도 디자인 시스템 링크는 제공되지 않았으므로 화면의 연결된 컴포넌트와 Variables·Styles 값을 기준으로 구성했습니다.

Paperlogy: [웹폰트 배포](https://github.com/whitedev7773/Paperlogy), [원본 배포 및 라이선스](https://freesentation.blog/paperlogyfont).

## 검증 및 배포

TypeScript 엄격 검사와 Vite 빌드, 390×844 화면 비교, 원본 자산 로딩·크기, 화면 이동, 초기 데이터 삭제를 확인했습니다.

`base: './'`와 자산 경로 헬퍼로 GitHub Pages의 저장소 하위 경로에 대응합니다. `dist/`가 배포 대상입니다. GitHub Actions 워크플로는 아직 추가하지 않았습니다.


