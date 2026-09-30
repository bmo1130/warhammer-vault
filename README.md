# 전쟁 서고

Total War: Warhammer III 개인 위키의 첫 버전입니다. 원본 게임 데이터와 개인 기록을 분리했습니다.

## 실행

```bash
npm install
npm run dev
```

화면에 표시되는 주소를 브라우저에서 엽니다. 같은 네트워크의 휴대폰에서 열려면 PC의 LAN 주소와 표시된 포트를 사용하고, 방화벽에서 접속을 허용해야 합니다. 개인 기록은 **접속한 브라우저마다 별도**로 저장됩니다. 설정 화면의 JSON 백업과 복원으로 옮길 수 있습니다.

## 구조

- `src/data`: 읽기 전용 WH3 샘플 JSON. 실제 수치는 아직 검증되지 않아 비워 뒀습니다.
- `src/domain/types.ts`: WH3 엔티티와 향후 Modifier, ModProfile, CampaignProfile, Roster 타입.
- `src/repositories/gameRepository.ts`: 게임 원본 조회와 이름 검색.
- `src/repositories/wikiRepository.ts`: IndexedDB에 개인 서술, 메모, 즐겨찾기, 최근 항목 저장. 백업 검증 및 복원.
- `src/App.tsx`: 라우트와 화면. 유닛 및 군주는 ID를 이용하는 공통 페이지 템플릿.

## 현재 범위

팩션, 군주, 유닛 검색과 상세 조회, 개인 서술 및 메모의 생성·수정·삭제, 즐겨찾기, 최근 본 항목, JSON 백업·복원을 지원합니다. 게임 원본 데이터는 UI에서 수정할 수 없습니다.

세이브 파싱, 계산기, 비교기, 모드 오버라이드 편집, 동기화, APK는 아직 구현하지 않았습니다. 향후 계산기는 `Modifier` 타입을 바탕으로 별도 계산 모듈을 만들고 `gameRepository`가 제공하는 기본 스탯과 선택한 캠페인·모드 문맥을 입력으로 받도록 확장할 수 있습니다.
