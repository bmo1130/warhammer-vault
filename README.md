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
- `src/domain/types.ts`: WH3 엔티티와 향후 Modifier, ModProfile, CampaignProfile, Roster 타입. 팩션 소속 관계는 각 엔티티의 `factionId`만 사용합니다.
- `src/domain/unit.ts`: 의미별 유닛 스키마와 원본 숫자 필드의 `UnitStatPath` 타입.
- `src/domain/unitCalculations.ts`: 확인된 기본·관통 피해 합계를 계산하는 순수 함수.
- `src/domain/unitLabels.ts`: 능력·공격·유닛 속성의 ID별 한국어 표시 이름.
- `src/domain/unitValidation.ts`: 타입이 확인된 유닛 데이터의 기본 무결성 검사.
- `src/domain/entities.ts`: 엔티티 타입과 명시적 URL 매핑, 경로 생성 및 표시 이름.
- `src/domain/appIdentity.ts`: 내부 앱 이름과 백업 식별자.
- `src/repositories/gameRepository.ts`: ID 및 팩션별 Map 인덱스로 게임 원본 조회, 이름 검색.
- `src/repositories/wikiRepository.ts`: IndexedDB에 개인 서술, 메모, 즐겨찾기, 최근 항목 저장. 백업 검증 및 복원.
- `src/App.tsx`: 앱 셸과 라우팅.
- `src/pages`: 홈, 팩션 목록 및 상세, 군주·유닛 상세, 메모, 백업, 없는 항목 화면.
- `src/components`: 검색, 목록 행, 개인 기록 편집기 등 공통 UI.
- `src/hooks`: 즐겨찾기 조회·토글(`useBookmark`), 상세 페이지 방문 기록(`useRecordView`).

내부 식별자는 `warhammer-vault`입니다. IndexedDB는 `warhammer-vault`, JSON 백업 형식은 `warhammer-vault-backup`, 파일 이름은 `warhammer-vault-backup.json`을 사용합니다. 초기 버전의 기존 저장소 마이그레이션은 제공하지 않습니다.

## 유닛 데이터 계약

ID, 이름, `factionId`, 설명과 출처 메타데이터는 최상위에 유지합니다. 전투·캠페인 원본값은 다음 그룹으로 나눕니다.

| 그룹 | 책임 |
| --- | --- |
| `classification` | 분류, 역할, 티어 |
| `entities` | 개체 수, 부대 규모, 개체 크기, 생명력, 질량, 스플래시 대상 판정 |
| `movement` | 속도, 지상·돌격 속도, 비행·질주·산병전 가능 여부 |
| `defense` | 장갑, 근접 방어, 리더십, 방패, 배리어, 저항, 발사체 관통 저항 |
| `melee` | 근접 공격, 돌격, 기본·관통 피해, 보너스, 공격 주기, 무기 길이, 스플래시, 공격 속성 |
| `missile` | 탄약, 사거리, 직격 투사체, 관통, 폭발, 정확도, 장전 원본값 |
| `terrainModifiers` | 지형 ID와 부호 있는 백분율 변화 |
| `abilities` / `passiveAbilities` / `attributes` | 액티브 능력 / 지속 능력 / 유닛 특성의 ID |
| `campaign` / `customBattle` | 모집·유지비·기간·조건·상한 / 커스텀 전투 비용 |
| `strengthsAndWeaknesses` / `sources` | 원본 설명의 장단점 / 공개·숨은·캠페인 데이터별 출처 |

필수 그룹은 `classification`, `entities`, `movement`, `defense`, `melee`이며, `melee.damage`도 객체로 존재합니다. 미확인 수치와 선택적 그룹은 생략합니다. 기존 샘플에서 개체 수도 확인되지 않았으므로 `entities.count` 역시 optional입니다. 확인된 개체 수만 양의 정수로 입력합니다. `0`은 확인된 실제 값이고, 생략은 미확인 상태입니다. `missile`의 생략도 사격 불가능 확정을 뜻하지 않습니다.

`unitScale`은 화면의 소형/대형 부대 분류, `entitySize`는 개체 판정 크기입니다. `totalHealth`는 기존 화면의 총 생명력입니다. `healthPerEntity`는 DB에서 독립적으로 확인한 값이 있을 때만 저장하며 계산으로 생성해 함께 저장하지 않습니다. 방패·저항의 `35`는 35%이고, 지형의 `-20`은 -20%입니다. 공격·장전 시간은 초 단위입니다.

`campaign.recruitmentRequirements`의 항목 간에는 OR, 한 항목 안의 건물·팩션·조건들 사이에는 AND를 적용합니다. 건물과 특수 조건은 `buildingId`, `conditionIds`로 보관합니다. 분류와 기존 `tags`는 표시용 텍스트를 유지하지만 구조화된 능력·특성·공격 속성은 소문자 snake_case ID로 저장합니다. `unitLabels.ts`의 ID는 앱 내부 ID이며 실제 WH3 DB 키라는 뜻은 아닙니다. 표시 이름이 없는 ID는 ID 자체로 표시합니다.

총 무기 피해, 총 직격·폭발 피해, 사격 위력, 현재 장전 시간은 저장 필드가 아닙니다. `getTotalDamage` / `getMeleeWeaponDamage`는 기본 피해와 관통 피해가 모두 확인되었을 때만 합계를 반환하며, 하나라도 없으면 `undefined`를 반환합니다. `getMissileDirectDamage`와 `getExplosionDamage`는 직격과 폭발을 분리합니다. 대형·보병 보너스는 조건부이므로 합계에 넣지 않습니다. 장전 공식과 DPS 계산은 구현하지 않았습니다.

기존 `UnitStats`는 제거했으며 미래 `Modifier.stat`은 `melee.meleeAttack`, `entities.totalHealth` 등 원본 숫자 필드의 경로인 `UnitStatPath`를 참조합니다. 실제 modifier 적용 시스템은 아직 없습니다. 개인 기록은 유닛 ID로 연결되므로 유닛 JSON 구조 변경에 따른 IndexedDB나 백업 구조 변경은 없습니다.

## 검증

```bash
npm test
npm run build
```

`npm test`는 기존 TypeScript로 앱·fixture의 타입을 검사한 뒤 Node의 기본 테스트 도구로 피해 계산, unknown/0, 명시적 경로, 검색·조회, 기존 화면 렌더링, 데이터 무결성을 검사합니다. 추가 테스트 프레임워크나 패키지는 없습니다. 컴파일 산출물 `.test-build/`는 Git에서 제외합니다. 브라우저 실조작과 IndexedDB 통합 테스트를 대체하지는 않습니다.

`tests/fixtures/units.ts`의 세 유닛은 요청에 제공된 수치를 쓰는 **스키마 검증 전용 예시**이며 실제 게임 데이터로 검증되지 않았고 앱에 포함되지 않습니다. 정식 샘플 5종은 원래 ID·설명·출처·태그·분류를 유지하고 미확인 값은 빈 하위 객체로 옮겼습니다.

`validateUnits(units, factionIds)`는 오류의 유닛 ID·필드 경로·메시지를 반환합니다. 개체 수, 비용·생명력의 음수/비유한 값, 개체 크기, 팩션 참조, ID 중복과 구조화된 속성 ID 등을 검사합니다. 현재 샘플과 fixture는 자동 테스트에서 이 검사를 실행합니다. 임의의 외부 JSON을 파싱하거나 모든 게임 규칙을 검증하는 함수는 아니므로 향후 importer에는 별도의 런타임 구조 검증이 필요합니다.

## 실제 WH3 데이터 입력 전 확인할 사항

- 버전·부대 크기 설정에 따른 개체 수와 총 생명력, 포병의 장비·승무원 구분 및 개체당 생명력의 기준.
- 화면의 부대 규모와 실제 DB의 개체 크기 열거값 사이 매핑.
- `speed`가 나타내는 기본 표시 상태와 비행/지상 속도, 질량·무기 길이·탄착군 면적의 실제 단위.
- 투사체의 `resistanceBudget`(저항 한도), `maxPenetrations`(관통 개체 수), `stopsAtEntitySize`의 정확한 DB 의미. 저항 한도를 개체 수로 변환하거나 차감 규칙을 가정하지 않습니다.
- 방패·저항 및 지형 변화의 원본 단위, 스플래시 최대 대상·크기와 위협적 대상의 특수 판정.
- 기본 장전 시간·장전 스킬의 정확한 공식, 포병의 발사 수와 직격·폭발 피해 적용 대상. 현재 장전 시간과 DPS는 공식 검증 후 별도로 계산해야 합니다.
- 팩션별 모집 조건의 OR/AND 구성, 건물·능력·속성의 실제 DB ID, 각 수치의 출처와 게임 버전.

## WH3 원본 데이터 추적 도구

`tools/wh3-importer/`는 설치된 RPFM server의 검증된 MCP 인터페이스로 실제 CA `db.pack`과 `local_en.pack`을 직접 읽어 성배기사, Helstorm, Bloodthirster 중 선택한 한 유닛의 원본 row와 schema 기반 join을 추적하는 개발 도구입니다. `Unit` 정규화, 전체 DB dump, 모드 병합, 앱 데이터·UI 변경은 하지 않습니다.

```powershell
npm run extract:grail-knights -- --game-path 'YOUR_WH3_INSTALLATION_ROOT'
npm run extract:wh3-unit -- helstorm --game-path 'YOUR_WH3_INSTALLATION_ROOT'
npm run extract:wh3-unit -- bloodthirster --game-path 'YOUR_WH3_INSTALLATION_ROOT'
```

게임 경로는 CLI, `WH3_GAME_PATH`, Git에서 제외한 로컬 설정으로 입력합니다. 원본 JSON과 출처·미확인 값·수동 참고값 비교 요약은 기본적으로 `generated/wh3/`에 생성되며 Git에서 제외합니다. 실행 준비, 확인한 테이블과 관계, 실제 추출 결과 및 별도 통합 테스트는 [extractor README](tools/wh3-importer/README.md)에 설명합니다. `npm test`의 작은 synthetic fixture 테스트는 게임이나 RPFM 없이 실행되며, 실제 pack 테스트는 `npm run test:wh3-integration`으로 명시적으로 실행합니다.

## 현재 범위

원본값의 의미 조사와 다음 정규화 단계의 제한은 [SEMANTICS.md](tools/wh3-importer/SEMANTICS.md)에 정리했습니다. 보병·단발 사격·추가 다발 포병 표본과 UI 통계·경험·캠페인 효과 경로를 실제 CA pack에서 확인했으며, 미확인 공식은 조사 가설로만 보관합니다. 이 파일과 기계 판독용 findings는 앱 데이터에 반영하지 않습니다.

팩션, 군주, 유닛 검색과 상세 조회, 개인 서술 및 메모의 생성·수정·삭제, 즐겨찾기, 최근 본 항목, JSON 백업·복원을 지원합니다. 게임 원본 데이터는 UI에서 수정할 수 없습니다.

세이브 파싱, 계산기, 비교기, 모드 오버라이드 편집, 동기화, APK는 아직 구현하지 않았습니다. 향후 계산기는 `Modifier` 타입을 바탕으로 별도 계산 모듈을 만들고 `gameRepository`가 제공하는 기본 스탯과 선택한 캠페인·모드 문맥을 입력으로 받도록 확장할 수 있습니다.
