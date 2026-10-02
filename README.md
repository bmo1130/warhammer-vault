# 전쟁 서고

Total War: Warhammer III 개인 위키의 첫 버전입니다. 원본 게임 데이터와 개인 기록을 분리했습니다.

## 실행

```bash
npm install
npm run dev
```

화면에 표시되는 주소를 브라우저에서 엽니다. 같은 네트워크의 휴대폰에서 열려면 PC의 LAN 주소와 표시된 포트를 사용하고, 방화벽에서 접속을 허용해야 합니다. 개인 기록은 **접속한 브라우저마다 별도**로 저장됩니다. 설정 화면의 JSON 백업과 복원으로 옮길 수 있습니다.

## 구조

- `src/data`: 읽기 전용 WH3 Unit JSON과 별도의 diagnostic 표시 자료. 구조 검증용 샘플 수치는 비워 두고, 검토된 production 부분집합만 실제 기본값을 포함합니다.
- `src/domain/types.ts`: WH3 엔티티와 향후 Modifier, ModProfile, CampaignProfile, Roster 타입. 팩션 소속 관계는 각 엔티티의 `factionId`만 사용합니다.
- `src/domain/unit.ts`: 의미별 유닛 스키마와 원본 숫자 필드의 `UnitStatPath` 타입.
- `src/domain/unitCalculations.ts`: 확인된 기본·관통 피해 합계를 계산하는 순수 함수.
- `src/domain/unitLabels.ts`: 능력·공격·유닛 속성의 ID별 한국어 표시 이름.
- `src/domain/unitValidation.ts`: 타입이 확인된 유닛 데이터의 기본 무결성 검사.
- `src/domain/entities.ts`: 엔티티 타입과 명시적 URL 매핑, 경로 생성 및 표시 이름.
- `src/domain/appIdentity.ts`: 내부 앱 이름과 백업 식별자.
- `src/repositories/gameRepository.ts`: ID 및 팩션별 Map 인덱스로 게임 원본 조회, 이름 검색.
- `src/repositories/unitCatalogRepository.ts`: 원본과 diagnostic 저장소에서 이름·ID·출처 종류만 가져오는 읽기 전용 UI 목록. 같은 ID가 충돌하면 명시적으로 오류를 내며 이름으로 합치지 않습니다.
- `src/repositories/archivePresentation.ts`: 홈 검색과 개인 기록의 표시 이름을 연결하는 작은 adapter.
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

### 유닛 상세 화면의 diagnostic 자료

홈의 **유닛 탐색**과 데스크톱·모바일의 **유닛** 메뉴에서 `/units`를 엽니다. 현재 Production 101개, Sample 5개, diagnostic evidence 5개, diagnostic-only 0개이며 unique catalog는 106개입니다. 전체 / 일반 Unit / Diagnostic evidence 있음 / Diagnostic-only로 필터링할 수 있습니다. 일반 Unit 필터에는 Production과 Sample이 함께 포함되며 각 행의 배지로 구분합니다. 검색어와 필터는 URL에 유지됩니다. 홈 검색도 팩션·군주·일반 유닛에 더해 diagnostic 이름·ID·source key를 찾습니다. Production은 기존 검색 API와 팩션 catalog에 포함되고 diagnostic evidence는 별도 repository에 유지됩니다.

Black Coach, Skeleton Chariots, Dread Saurian, Necrofex Colossus, Free Company Militia는 **Production · Evidence** shared entry입니다. 검토된 exact ID/main/land/source/snapshot allowlist만 같은 `/units/:id`에 연결하며 다른 collision은 계속 거부합니다. Production static 스탯을 먼저 표시하고 별도 diagnostic 요약·접힌 상세 evidence를 이어서 표시합니다. Runtime count/missile은 production에 합치지 않습니다. HP는 [ULTRA HP 정책](tools/wh3-importer/hp-policy/HP_POLICY.md)의 명시적 field admission만 허용합니다. Sample은 미확인 수치를 비워 둔 구조 검증용 예시라는 점을 목록과 상세 배지에 명시합니다. Diagnostic 요약의 path·case 건수는 신뢰도 점수나 실제 개체·발사 수가 아닙니다.

Diagnostic-only도 기존 `unit:<id>` 개인 기록 대상으로 즐겨찾기, 최근 본 항목, 평가·운용 메모의 작성·수정·삭제를 지원합니다. 홈은 catalog의 정확한 ID로 이름과 route를 찾습니다. 현재 목록에서 사라진 과거 ID는 연결 없는 안내 행으로 표시하고 저장 내용은 삭제하지 않습니다. 개인 기록은 evidence와 별도 영역·IndexedDB에만 저장됩니다. 기존 v1 JSON 백업에 diagnostic 기록도 그대로 포함되며, 백업 schema나 parser 변경 없이 복원합니다. 백업에는 production 데이터와 diagnostic evidence가 포함되지 않습니다. 같은 브라우저라도 접속 origin이 다르면 개인 저장소는 별개입니다.

`UnitDiagnosticSection`은 기본적으로 접힌 **데이터 해석 근거**에서 정적 entity/weapon/projectile 후보, runtime context view와 논리적 수·HP, 조건별 ActiveProjectileContext, 기존 scoped precedence를 구분해 표시합니다. `OBSERVED_RUNTIME`은 record key 관찰이고 배치 확정이 아닙니다. `OBSERVED_ONCE`도 전체 게임 규칙 검증을 뜻하지 않습니다. `UNVERIFIED / INCONCLUSIVE`, capture 보류·불완전, 미검토 정적 구성은 유지합니다. 연결 수와 context view 수는 모델/발사 수로 합산하지 않습니다. 출처·snapshot·schema·pack hash·관찰 참조는 별도로 펼칩니다.

`unitDiagnosticRepository`는 정확한 diagnostic catalog ID로 `src/data/unitDiagnostics.json`만 읽습니다. 표시용 JSON은 완료된 **2026-10-01 / 9.0.2.0 batch**의 최소 projection이며, 새 checkout에서도 UI를 볼 수 있도록 커밋했습니다. 개인 절대 경로와 raw debug 객체는 포함하지 않습니다. `node scripts/project-unit-diagnostics.mjs`는 명시된 로컬 완료 batch, 검증 결과, 기존 static index/candidates가 있을 때만 이 표시 파일을 재생성합니다. 원본 SHA256도 보존합니다. 이 명령은 extraction/ingestion/normalization이나 precedence 재추론을 수행하지 않습니다. 현재 batch의 5개 항목만 지원하며 자동 최신 자료 선택이나 production 승격은 없습니다.

`tests/unit-diagnostics.test.cjs`는 기존 화면·목록의 유지, shared evidence route와 diagnostic-only fallback, 복합 구성·복수 missile source, static-only/projectile 관찰 구분, 불확실성과 provenance 표시를 검증합니다. 로컬 완료 자료가 있을 때는 원본 hash·identity·모든 candidate path·관찰값의 일치도 검사합니다.

`tests/unit-catalog.test.cjs`는 catalog 분리·ID 충돌, 검색과 필터, 상세·홈·내비게이션 렌더링, stale target 표시를 검증합니다. `tests/wiki-workflow.test.cjs`는 작은 IndexedDB 계약 double로 개인 기록 CRUD와 diagnostic·샘플·과거 ID의 v1 백업 왕복을 검사합니다. 이 double은 실제 브라우저 저장소 구현을 대체하지 않습니다.

2026-10-02 브라우저 확인: 별도 localhost origin에서 홈 검색 → Dread Saurian 상세 → 근거·provenance 열람 → 즐겨찾기·기록 저장/수정 → 홈 재진입 → JSON 내보내기/복원 → 동일 이름·route·원래 기록 복구를 확인했습니다. 일반 유닛 상세와 키보드 필터도 확인했으며, 1280px·768px·320px 화면을 점검했습니다. 320px의 기존 body 최소 너비로 생기던 가로 넘침을 제거했습니다. 실제 휴대폰·터치 키보드와 브라우저 간 동기화는 검증 범위가 아닙니다.

### 실행할 검사

```bash
npm test
npm run build
```

`npm test`는 기존 TypeScript로 앱·fixture의 타입을 검사한 뒤 Node의 기본 테스트 도구로 피해 계산, unknown/0, 명시적 경로, 검색·조회, 기존 화면 렌더링, 데이터 무결성을 검사합니다. 추가 테스트 프레임워크나 패키지는 없습니다. 컴파일 산출물 `.test-build/`는 Git에서 제외합니다. 브라우저 실조작과 IndexedDB 통합 테스트를 대체하지는 않습니다.

`tests/fixtures/units.ts`의 세 유닛은 요청에 제공된 수치를 쓰는 **스키마 검증 전용 예시**이며 실제 게임 데이터로 검증되지 않았고 앱에 포함되지 않습니다. 정식 샘플 5종은 원래 ID·설명·출처·태그·분류를 유지하고 미확인 값은 빈 하위 객체로 옮겼습니다.

`validateUnits(units, factionIds)`는 오류의 유닛 ID·필드 경로·메시지를 반환합니다. 개체 수, 비용·생명력의 음수/비유한 값, 개체 크기, 팩션 참조, ID 중복과 구조화된 속성 ID 등을 검사합니다. 현재 샘플과 fixture는 자동 테스트에서 이 검사를 실행합니다. 임의의 외부 JSON을 파싱하거나 모든 게임 규칙을 검증하는 함수는 아니므로 향후 importer에는 별도의 런타임 구조 검증이 필요합니다.

## 실제 WH3 데이터 입력 전 확인할 사항

첫 production batch는 **Dragon Ogres / WH3 9.0.2.0** 한 개입니다. exact CA main/land `wh_dlc01_chs_mon_dragon_ogre`에서 기존 conservative normalizer가 확인한 직접값 25개와 검토된 identity/attribute alias를 반영했습니다. 미확인 count·HP·속도·저항 변환은 생략합니다. Warriors of Chaos는 기존 permission alias에 근거한 최소 catalog 분류이며 전체 모집 가능 roster를 뜻하지 않습니다. 기존 Sample 5개와 diagnostic projection, runtime/precedence 자료, v1 개인 백업은 유지합니다.

후속 [PARTIAL 14개 필드 그룹 검토](tools/wh3-importer/promotion/PARTIAL_REVIEW.md)는 안전한 필드와 불확실한 그룹을 분리합니다. **Swordsmen, Spearmen (Shields), The Sternsmen, Doom-Flayers** 4개를 명시적 allowlist로 추가했습니다. Doom-Flayers의 entities는 빈 필수 그룹이며 count·대표 mass/size·HP·속도는 생략합니다. 미매핑 passive ability 2개는 review에 원본 ID/근거로 남기고 해당 그룹을 완전히 생략했습니다. Spearmen/Sternsmen의 7개 alias는 정확한 CA localisation/flags를 검토한 candidate 범위에만 적용하며 기존 normalizer의 전역 mapping은 바꾸지 않습니다.

실제 적용된 필드·gate·보류 사유·검증 결과는 [PARTIAL admission](tools/wh3-importer/promotion/PARTIAL_ADMISSION.md)에 정리했습니다.

기존 review에서 승인한 [deferred 5개 batch](tools/wh3-importer/promotion/DEFERRED_ADMISSION.md)로 Grail Knights, Mounted Yeomen, Pegasus Knights, Royal Altdorf Gryphites, Ratling Guns를 추가했습니다. 네 mounted 유닛의 entities는 비워 두고, Ratling만 검증된 MAN size/mass와 정적 missile 10개 필드를 저장합니다. 상세의 사격 영역은 raw/base 의미를 유지하며 실제 장전시간·DPS·관통 개체 수로 환산하지 않습니다. `node scripts/promote-deferred-units.mjs --check`로 committed review/source와 production 일치를 검사합니다. 새 mapping, schema, runtime evidence는 없습니다.

[Evidence-linked 5개 admission](tools/wh3-importer/promotion/EVIDENCE_LINKED_ADMISSION.md)은 exact shared identity registry로 기존 diagnostic 5개를 검토된 production core와 연결했습니다. `node scripts/promote-evidence-linked-units.mjs --check`로 재현하며 기존 diagnostic artifact와 `productionEligible=false`, personal target/v1 backup은 유지합니다.

[Expansion batch 01](tools/wh3-importer/expansion-batch-01/EXPANSION_BATCH_01.md)은 별도 24-name catalog에서 실제 pack localisation을 조사했습니다. Unique root 16개 중 faction alias 충돌 2개를 보류하고 14개 core static subset을 추가했습니다. 다중 root 6개·정확한 이름 미발견 2개는 자동 선택/대체하지 않습니다. 기존 15개 Production과 Sample 5개는 동일하며 mounted entity 대표값, count/HP/speed와 불완전 optional ID group은 생략했습니다. 새 mapping/faction/schema/UI/runtime 작업은 없습니다. Committed bounded source/review/admission은 `node scripts/review-expansion-batch-01.mjs --check` 및 `node scripts/promote-expansion-batch-01.mjs --check`로 로컬 게임 파일 없이 재현합니다. 원본 extraction은 ignored `generated/wh3/expansion-batch-01/`에 남습니다. 기존 representative pilot의 CLEAN 1 / PARTIAL 14 / BLOCKED 9 기록은 변경하지 않았습니다.

Expansion 저장 형식은 [compact v2 dictionary bundle](tools/wh3-importer/expansion-batch-01/COMPACT_FORMAT.md)입니다. `sources.json`에서 공통 row/schema/provenance를 참조하고, `review.json`에는 판단·field path·omission/reason·source pointer를 저장합니다. Compact source → deterministic review → explicit admission → production equality 흐름과 기존 expanded hash를 검증하며, source/review 합계는 61.29% 작아졌습니다. 전체 provenance가 포함된 review는 `node scripts/review-expansion-batch-01.mjs --verbose`로 ignored staging에 재생성할 수 있습니다. Production replay는 staging을 읽지 않습니다.

[Production growth batches 02–04](tools/wh3-importer/production-growth/VALIDATION.md)는 같은 compact 형식과 admission gate로 24개씩 72개를 검토하여 Production을 101개로 확대했습니다. 기존 29개와 Sample 5개의 값·ID·순서·serialized bytes를 보존하며, 신규 HP/speed는 모두 생략했습니다. 기존 bounded missile contract가 확인한 16개만 정적 사격 필드를 포함하고, 불확실한 18개는 missile을 보류합니다. `node scripts/review-production-growth.mjs --check`와 `node scripts/promote-production-growth.mjs --check`로 게임/generated 없이 재현합니다. 원본 result SHA256와 raw rows/schema/graph를 compact source에 유지하고, 상세 verbose review는 `--verbose`로 ignored staging에 생성합니다. 신규 source/review 합계 7.10 MB이며 측정·검증·팩션별 목록은 위 문서에 있습니다.

`node scripts/review-partial-units.mjs --check`는 pinned source에서 JSON/Markdown 검토표를 재현하고, `node scripts/promote-partial-units.mjs --check`는 4개 production record의 일치를 검증합니다. 각각의 `--write`는 검토표 재생성 또는 승인된 4개 append만 수행합니다. PARTIAL 자체를 전체 거부 사유로 사용하지 않습니다. 진단 ID 5개의 core 후보와 Necrofex 주포의 direct 값도 검토표에 보존하지만, shared catalog 연결이나 여러 missile source의 표현을 자동 해결하지 않습니다. BLOCKED 9개는 이번 검토·승격 대상이 아닙니다. Unit/composition schema, 저장된 evidence와 개인 백업 형식은 유지합니다.

선정·승격 gate·source snapshot·생략 범위·후속 blocker는 [첫 production 검토](tools/wh3-importer/promotion/PROMOTION.md)에 있습니다. 재현 입력은 실제 저장된 CA trace에서 투영한 자료이며 synthetic fixture가 아닙니다. 게임이나 로컬 generated 파일 없이 `node scripts/promote-first-unit.mjs --check`로 normalizer 재실행과 production 일치를 검사할 수 있습니다. `--write`는 이 한 유닛과 최소 faction만 추가하고 source drift·충돌·기존 값 덮어쓰기를 거부합니다. Production 상세는 검증된 기본 스탯과 기존 함수의 근접 피해 합을 표시하며, 출처·버전·생략 범위는 접힌 영역에서 확인합니다.

- 버전·부대 크기 설정에 따른 개체 수와 총 생명력, 포병의 장비·승무원 구분 및 개체당 생명력의 기준.
- 화면의 부대 규모와 실제 DB의 개체 크기 열거값 사이 매핑.
- `speed`가 나타내는 기본 표시 상태와 비행/지상 속도, 질량·무기 길이·탄착군 면적의 실제 단위.
- 투사체의 `resistanceBudget`(저항 한도), `maxPenetrations`(관통 개체 수), `stopsAtEntitySize`의 정확한 DB 의미. 저항 한도를 개체 수로 변환하거나 차감 규칙을 가정하지 않습니다.
- 방패·저항 및 지형 변화의 원본 단위, 스플래시 최대 대상·크기와 위협적 대상의 특수 판정.
- 기본 장전 시간·장전 스킬의 정확한 공식, 포병의 발사 수와 직격·폭발 피해 적용 대상. 현재 장전 시간과 DPS는 공식 검증 후 별도로 계산해야 합니다.
- 팩션별 모집 조건의 OR/AND 구성, 건물·능력·속성의 실제 DB ID, 각 수치의 출처와 게임 버전.

## WH3 원본 데이터 추적 도구

대표 24개 이름을 대상으로 실제 CA root discovery, bounded trace, conservative normalize, validation과 예외 집계를 실행하는 `npm run pilot:wh3-units`를 추가했습니다. 실제 결과는 CLEAN 1 / PARTIAL 14 / BLOCKED 9이며, 전체 import 없이 위험 구조를 기록합니다. 선정 근거·발견 key·coverage·재현 방법은 [PILOT.md](tools/wh3-importer/PILOT.md)에 있습니다. 기본 테스트 78개와 실제 통합 테스트 5개가 통과했습니다.

`tools/wh3-importer/`는 설치된 RPFM server의 검증된 MCP 인터페이스로 실제 CA `db.pack`과 `local_en.pack`을 직접 읽어 성배기사, Helstorm, Bloodthirster 중 선택한 한 유닛의 원본 row와 schema 기반 join을 추적하는 개발 도구입니다. 전체 DB dump, 모드 병합, 앱 데이터·UI 변경은 하지 않습니다. 별도 보수적 normalizer는 저장된 핵심 3종 raw trace의 검증된 직접값만 `Unit`으로 옮겨 staging 결과를 생성합니다.

```powershell
npm run extract:grail-knights -- --game-path 'YOUR_WH3_INSTALLATION_ROOT'
npm run extract:wh3-unit -- helstorm --game-path 'YOUR_WH3_INSTALLATION_ROOT'
npm run extract:wh3-unit -- bloodthirster --game-path 'YOUR_WH3_INSTALLATION_ROOT'
```

게임 경로는 CLI, `WH3_GAME_PATH`, Git에서 제외한 로컬 설정으로 입력합니다. 원본 JSON과 출처·미확인 값·수동 참고값 비교 요약은 기본적으로 `generated/wh3/`에 생성되며 Git에서 제외합니다. 실행 준비, 확인한 테이블과 관계, 실제 추출 결과 및 별도 통합 테스트는 [extractor README](tools/wh3-importer/README.md)에 설명합니다. `npm test`의 작은 synthetic fixture 테스트는 게임이나 RPFM 없이 실행되며, 실제 pack 테스트는 `npm run test:wh3-integration`으로 명시적으로 실행합니다.

## 현재 범위

원본값의 의미 조사와 다음 정규화 단계의 제한은 [SEMANTICS.md](tools/wh3-importer/SEMANTICS.md)에 정리했습니다. 보병·단발 사격·추가 다발 포병 표본과 UI 통계·경험·캠페인 효과 경로를 실제 CA pack에서 확인했으며, 미확인 공식은 조사 가설로만 보관합니다. 이 파일과 기계 판독용 findings는 앱 데이터에 반영하지 않습니다. Normalizer의 gate가 findings의 조사 상태와 검토된 게임 버전을 읽으며, 승인된 파생 공식은 아직 없습니다.

보수적 normalizer의 구조·출처·생략 정책과 재현 명령은 [NORMALIZATION.md](tools/wh3-importer/NORMALIZATION.md)에 정리했습니다. `npm run normalize:wh3-unit -- grail-knights` (또는 `helstorm`, `bloodthirster`)는 `generated/wh3/normalized/`에 result JSON과 비교 요약을 생성합니다. 실제 앱의 `src/data/units.json`은 유지하며, 수동 참고값은 결과 비교에만 사용합니다. 기본 테스트 62개와 실제 CA 통합 테스트 4개가 통과했습니다.

팩션, 군주, 유닛 검색과 상세 조회, 개인 서술 및 메모의 생성·수정·삭제, 즐겨찾기, 최근 본 항목, JSON 백업·복원을 지원합니다. 게임 원본 데이터는 UI에서 수정할 수 없습니다.

세이브 파싱, 계산기, 비교기, 모드 오버라이드 편집, 동기화, APK는 아직 구현하지 않았습니다. 향후 계산기는 `Modifier` 타입을 바탕으로 별도 계산 모듈을 만들고 `gameRepository`가 제공하는 기본 스탯과 선택한 캠페인·모드 문맥을 입력으로 받도록 확장할 수 있습니다.

[ULTRA HP admission](tools/wh3-importer/hp-policy/HP_POLICY.md)은 exact main/land 및 snapshot, 모든 record의 ULTRA/DECLARED_SETUP, VALUE HealthMax/NumEntitiesInitial을 검증합니다. 현재 원본 로그가 확인된 Dread Saurian(15,088)과 Skeleton Chariots(7,032)의 totalHealth만 채웠습니다. 나머지 Production 99개와 static-derived HP는 의미가 증명되지 않아 비워 둡니다. Component list 개수는 HP multiplier로 쓰지 않으며 기존 MEDIUM evidence/속도/다른 스탯은 유지합니다. `node scripts/promote-ultra-hp.mjs --check`로 원본 log hash → static identity → HP review → 명시적 admission → Production/projection equality를 clean checkout에서 재현합니다. 기존 static promotion commands는 승인된 두 HP overlay만 분리해 원래 static gates를 확인하고 보존합니다.
