# WH3 static HP 조사 — 2026-10-03

5개 실제 ULTRA capture의 HealthMax를 모두 재현하는 **계산 후보**를 찾았다. 그러나 현재 자료만으로 static field의 기여도·component multiplicity·전체 catalog의 ULTRA count mapping을 유일하게 결정할 수 없다. 수치 일치와 의미 확정을 구분하며, 새 Production HP 및 static admission은 없다.

기준 commit: `69f23ddf001222915087a09e094dea68c53868b9`. Production 101 / Sample 5, 직접 runtime HP 5 / 공석 96, 기존 HP policy와 MEDIUM evidence를 보존한다.

## 재현 및 증거 범위

```powershell
node scripts/research-wh3-hp.mjs --check
node --test tests/wh3-hp-research.test.cjs
node scripts/promote-ultra-hp.mjs --check
```

`--write`는 이 폴더의 `report.json`만 재생성한다. 게임·RPFM·generated 파일 없이 재현 가능하다. research helper는 기존 named-field selector, processed-schema join, compact decoder와 runtime replay를 재사용한다. HP policy/normalizer/production projection을 변경하지 않는다.

- [report.json](./report.json): 5개 비교표의 모든 입력 fact/row ID/schema version/join path, 후보식·결과·confidence, 101개 exact identity와 source pointer/분류.
- [articulation.source.json](./articulation.source.json): **이미 저장된 static capture**에서 8개 원본 row, 관련 4개 full processed schema, 원본 relationship을 제한 투영한 연구 fixture. Chariots와 Black Coach의 main → land → articulation → entity 경로만 포함한다. 새 extraction/runtime 측정이 아니다.
- [baseline.json](./baseline.json): Production/Sample 전체 JSON, diagnostics/shared identity, HP policy/admission/raw inputs와 기존 runtime/CCO 코드·manifest 등 32개 보호 파일. JSON/raw는 byte SHA256, 코드 text는 checkout CRLF 차이를 허용하는 LF-normalized SHA256으로 확인한다. 실제 작업의 원본 byte 보존은 Git diff 및 stored regression도 확인한다.
- 기존 직접 HP 증거는 [HP review](../hp-policy/review.json)와 original raw input SHA 검증을 그대로 재사용한다. semantic fixture나 사용자 서술을 새 runtime 증거로 만들지 않는다.

공통 snapshot:

| 항목 | exact 값 |
| --- | --- |
| game | `9.0.2.0` |
| schema SHA256 | `5d628a0167b34a096752c5c21acd16493834a987c80dc9f02364617f796ba2a4` |
| db.pack SHA256 | `d0fafac984b3985ec47cec0ea957591424f1077e52ef61941dbf2dc46e6cf723` |
| local_en.pack SHA256 | `f979527a5aaecf293a4e66afc25ed6c760e4107ef4920b73bd56e10e2652fd6a` |
| staticSnapshotId | `c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5` |

Articulation 원본: `generated/wh3/runtime-evidence/cco-p0-9.0.2/static-candidates.json`, byte SHA256 `6bc6b193cdbe652f7b4f93728522e5ca1c54be64923ccc32c3afcd6c494dd05a`. Fixture의 `projectionPointers`가 각 원본 JSON pointer를 보존한다. 기존 row ID가 다른 추출의 같은 key와 달라도 rebase하지 않는다. snapshot, main/land key, num_men, bonus, mount/engine count, articulated_record를 대조한 뒤 연구 비교에만 사용한다. 원본 generated capture가 있으면 테스트가 모든 투영 row/schema/edge의 exact equality도 검사한다.

## 5개 조사표

모든 main/land identity는 아래 key와 같으며 Production ID는 `ca_unit_` 접두사다. `—`는 schema-checked 빈 reference이며 추정된 zero HP가 아니다. 모든 nonempty reference는 정확한 schema join을 통과한다.

| 유닛 | exact main = land key | main.num_men (N) | bonus_hit_points (B) | land.num_mounts (U) | land.num_engines (G) | runtime initial (C) | runtime HealthMax |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Swordsmen | `wh_main_emp_inf_swordsmen` | 120 | 61 | 0 | 0 | 120 | 8280 |
| Mounted Yeomen | `wh_main_brt_cav_mounted_yeomen_0` | 60 | 76 | 60 | 0 | 60 | 5520 |
| Dragon Ogres | `wh_dlc01_chs_mon_dragon_ogre` | 16 | 608 | 0 | 0 | 16 | 9856 |
| Dread Saurian | `wh2_dlc13_lzd_mon_dread_saurian_1` | 12 | 14984 | 1 | 0 | 1 | 15088 |
| Skeleton Chariots | `wh2_dlc09_tmb_veh_skeleton_chariot_0` | 24 | 538 | 2 | 12 | 12 | 7032 |

| 유닛 | man key / hit_points (M) | mount **entity** key / hit_points (H) | engine **entity** key / hit_points (E) | articulation entity key / hit_points (A) |
| --- | --- | --- | --- | --- |
| Swordsmen | `wh_main_infantry_standard_blood_dismembers` / 8 | — | — | — |
| Mounted Yeomen | `wh_main_cavalry_rider_standard_blood` / 8 | `wh_main_brt_mnt_cavalry_fast_blood` / 8 | — | — |
| Dragon Ogres | `wh_dlc01_chs_dragon_ogre_blood` / 8 | — | — | — |
| Dread Saurian | `wh_main_infantry_rider` / 8 | `wh2_dlc13_lzd_mon_dread_saurian_blood` / 8 | — | — |
| Skeleton Chariots | `wh2_dlc09_tmb_skeleton` / 8 | `wh2_dlc09_tmb_cav_skeletal_steed_chariot` / 8 | `wh2_dlc09_tmb_vehicle_chariot` / 8 | `wh2_dlc09_tmb_vehicle_chariot_horse_articulation` / 8 |

Static relationships:

| 유닛 | exact 관계 |
| --- | --- |
| Swordsmen / Dragon Ogres | main.land_unit → land.man_entity → battle entity |
| Mounted Yeomen | land.mount=`wh_main_brt_mnt_warhorse_fast` → mounts.entity → horse entity; 별도 land.man_entity → rider entity |
| Dread Saurian | land.mount=`wh2_dlc13_lzd_mnt_dread_saurian` → mounts.entity → body entity; 별도 land.man_entity → rider entity |
| Skeleton Chariots | land.mount=`wh2_dlc09_tmb_mnt_tomb_steed_chariot` → mounts.entity; land.engine=`wh2_dlc09_tmb_chariot` → battlefield_engines.battle_entity; land.articulated_record=`wh2_dlc09_tmb_chariot` → articulated_vehicles.articulated_entity; 별도 man_entity |

| 유닛 | 비교한 계산 후보 | 결과 | runtime 일치 | 해석 confidence |
| --- | --- | ---: | --- | --- |
| Swordsmen | `(B+M)*N = (61+8)*120` | 8280 | YES | 관측 일치; 같은 모양 전체에 대한 의미/ULTRA mapping은 미확정 |
| Swordsmen | `B*N` | 7320 | NO | 해당 후보 반증 |
| Dragon Ogres | `(B+M)*N = (608+8)*16` | 9856 | YES | 관측 일치; 보병과 같은 후보식 |
| Dragon Ogres | `B*N` | 9728 | NO | 해당 후보 반증 |
| Mounted Yeomen | `(B+M)*N` 또는 `(B+H)*U` | 5040 | NO | rider만 / horse만 후보 반증 |
| Mounted Yeomen | `(B+M+H)*U = (76+8+8)*60` | 5520 | YES | 합산 후보 지지; M=H 때문에 기여 source는 비식별 |
| Mounted Yeomen | `(B+2*M)*U` | 5520 | YES | 동일 결과의 반례; 합산 의미 확정 불가 |
| Dread Saurian | `(B+H)*U` | 14992 | NO | body만으로 96 부족 |
| Dread Saurian | `(B+M+H)*U` | 15000 | NO | rider 하나만으로 88 부족 |
| Dread Saurian | `B*U+M*N+H*U = 14984+12*8+8` | 15088 | YES | 전체 crew HP 합산과 양립; 인과 기여도는 미확정 |
| Dread Saurian | `B*U+H*(N+U)` | 15088 | YES | M=H로 crew/base source 구분 불가 |
| Dread Saurian | `(B+M)*N` | 179904 | NO | N을 logical combat count로 쓰는 후보 반증 |
| Skeleton Chariots | `(B+E)*G` | 6552 | NO | engine만 기준 후보 반증 |
| Skeleton Chariots | `(B+M+H+E)*G` | 6744 | NO | component 종류당 하나 합산 후보 반증 |
| Skeleton Chariots | `B*G+M*N+H*U*G+E*G` | 6936 | NO | 2 crew + 2 horse + 1 engine 후보, 총 96 부족 |
| Skeleton Chariots | `B*G+M*N+H*U*G+E*G+A*G` | 7032 | YES | articulation당 8 추가 후보와 양립; multiplicity 미확정 |
| Skeleton Chariots | `B*G+M*N+H*U*G+2*E*G` | 7032 | YES | E=A=8로 articulation source 자체는 비식별 |

전체 후보와 source fact는 report.json에 있다. 후보는 사전에 명시한 산술 비교이며, fitting/최적 후보 선택/자동 공식을 구현하지 않았다. 후보 목록이 가능한 모든 함수를 망라하지도 않는다.

## 무엇이 확인되었고 무엇이 가설인가

**HealthMax / initial count**: 5개 관측의 비율은 각각 69, 92, 616, 15088, 586이다. 관측값을 C로 나누어 얻은 비율이며, static-derived per-entity stat을 새로 추가하지 않는다. C는 snapshot의 NumEntitiesInitial이다.

**bonus_hit_points**: B 단독은 검증된 unit HP가 아니다. 다섯 일치 후보 모두 B를 additive baseline으로 쓰며, 보병/monstrous infantry는 N회, cavalry/body는 U회, chariot은 G회 적용한다. 이 적용 횟수는 현재 사례와 양립하는 가설이다. 단일 snapshot에는 B 변화에 대한 독립적인 대조가 없으므로, 모든 타입에 대한 per-combat-entity bonus 의미나 modifier 적용 순서를 확정할 수 없다. 보병·Dragon Ogres에서 `runtime/C − B = 8`, Yeomen에서 16, Dread에서 104, Chariot에서 48이라는 **수치 잔차**가 확인된다.

**N과 ULTRA count**: Swordsmen/Yeomen/Dragon Ogres에서는 N=C. Dread에서는 N=12, C=U=1. Chariot에서는 N=24, C=G=12이고 N/G=2다. 따라서 `N=C`를 범용 규칙으로 적용하면 틀린다. 이 자료로 MEDIUM→ULTRA 배율, 다른 유닛의 base setting, rounding/최소 count 등을 유도하지 않는다. 기존 global unit-size 조사도 source count에 scalar를 적용할 의미를 확정하지 못했다.

**Mounted Yeomen**: runtime ManList=60 / MountList=60 / EntityList=60. Rider-only 및 horse-only에 B를 더한 후보는 모두 5040이므로 5520을 설명하지 못한다. Rider+horse 후보는 일치하지만 rider와 horse가 모두 8이다. `2*M`, `2*H`, `M+H`를 이 관측 하나로 구분할 수 없다. 두 list의 index 대응/물리적 소유 관계를 HP 조사에서 새로 추론하지 않는다.

**Dread Saurian**: runtime ManList=12 / MountList=1 / EntityList=1. Body-only 잔차 96은 12×man HP와 정확히 같다. 승무원 HP가 unit 총합에 기여한다는 가설을 지지하지만, man/body 모두 8인 단일 관측은 그 source attribution을 확정하지 못한다. crew 없이 body만이라는 단순 후보는 반증되었다. ManList 12를 combat count로 사용하지 않는다.

**Skeleton Chariots**: runtime ManList=24 / MountList=24 / EngineList=12 / EntityList=12 / C=12. Static U=2를 chariot당 draught 수로 해석하면 U×G=24, N/G=2 crew가 되어 관측 aggregate와 일치한다. articulation의 별도 exact HP=8이 96 차이를 설명하는 후보다. 그러나 같은 수치의 engine 추가 계수도 일치하므로 articulation의 실제 HP 기여 횟수는 UNKNOWN이다. Articulation/engine index를 component 개수로 쓰지 않는다. runtime list를 더해 72개로 만든 뒤 586을 곱하거나 ManList 24에 586을 곱하면 각각 42192/14064로 틀린다. 후보에 나타나는 crew/draught HP **기여 가중치**와 HealthMax를 곱하는 logical combat count를 구분한다. 기존 component view/physical entity 모델은 변경하지 않았다.

## Exact fields와 provenance

| 역할 | 테이블 / version | 필드·join |
| --- | --- | --- |
| Main / N | `main_units_tables` / 7 | `unit`, `num_men`, `land_unit → land_units.key` |
| Land / B,U,G | `land_units_tables` / 54 | `key`, `bonus_hit_points`, `num_mounts`, `num_engines`, `man_entity`, `mount`, `engine`, `articulated_record` |
| Man / M | `battle_entities_tables` / 39 | `land.man_entity → key`, `hit_points` |
| Mount / H | `mounts_tables` / 10 → `battle_entities_tables` / 39 | `land.mount → mounts.key`, `mounts.entity → battle_entities.key`, `hit_points` |
| Engine / E | `battlefield_engines_tables` / 24 → `battle_entities_tables` / 39 | `land.engine → engines.key`, `engines.battle_entity → battle_entities.key`, `hit_points` |
| Articulation / A | `land_unit_articulated_vehicles_tables` / 6 → `battle_entities_tables` / 39 | `land.articulated_record → articulated.key`, `articulated.articulated_entity → entity.key`, `hit_points` |

Dragon Ogres는 `promotion/dragon-ogres.source.json:/dump`; 나머지 4개는 `promotion/partial-sources.json`의 sample-04/08/24/15 trace다. report.json의 source pointer와 staticFacts의 full joins로 각각 추적한다. Articulation fact는 별도 원본 row ID를 보존한 supplement trace에서 나온다. 원본 source hash는 HP manifest 및 compact source pins로, 추가 투영 원본 hash는 fixture로 보존한다.

| Raw runtime input (hp-policy/inputs/) | 첫 유효 frame | initial / HP |
| --- | --- | --- |
| `script_log_021026_1931.txt` | 83 | 120 / 8280 |
| `script_log_021026_1937.txt` | 83 | 60 / 5520 |
| `script_log_021026_1942.txt` | 103, 동일 관측 151 | 16 / 9856 |
| `dread-saurian-ultra.log` | 13 | 1 / 15088 |
| `skeleton-chariots-ultra.log` | 93 | 12 / 7032 |

각 original byte SHA256, game/static identity, ULTRA/DECLARED_SETUP, valid completed snapshot, conflict 여부는 기존 [manifest](../hp-policy/manifest.json)와 replayHP가 검사한다. 과거 MEDIUM 입력을 변환하거나 수정하지 않았다.

## Production 101개 연구 분류

| 분류 | 수 | 기준 |
| --- | ---: | --- |
| DERIVATION_CONFIDENT | 0 | HP 결합과 ULTRA combat count mapping 모두 static 증거로 유일하게 확정되어야 함 |
| DERIVATION_AMBIGUOUS | 101 | 필요한 named HP/count 입력 및 exact 주요 join은 있으나 application/multiplicity/count 의미 미확정 |
| DERIVATION_UNAVAILABLE | 0 | 이번 101개에는 필수 HP/count field 또는 nonempty 주요 reference target의 부재가 없음 |

이 분류는 **검토한 주요 static HP chain의 availability와 의미**에 대한 연구 분류다. 전체 attachment graph의 completeness나 projection 적격성을 보장하지 않는다. 확정 범위가 없는 현재 자료를 fail-closed로 평가한 결과이며, 101개에 데이터가 없다는 뜻도 아니다. 직접 runtime으로 승인된 5개도 **static-only derivation**은 ambiguous다.

Shape별: man-only 71 / mounted 21 / engine 7 / articulated 2. 두 articulated chain은 기존 capture의 bounded supplement로 확보했다. 이것이 없으면 원래 partial dump의 nonempty articulated_record target은 UNKNOWN이며 UNAVAILABLE로 남는다. missing field/row/corrupt schema를 테스트로 검증한다.

대표 이유:

- Swordsmen/Dragon Ogres 계열: `(B+M)*N`에 대한 2개의 수치 검증은 있으나 모든 동일 shape의 ULTRA count·optional contribution을 확정하지 못함.
- Mounted Yeomen 및 다른 mounted: M=H confounding, crew/body ratio와 여러 rider의 처리 규칙 미확정.
- Black Coach/Chariots: articulation multiplicity·bonus scope와 source attribution 미확정. Black Coach의 기존 MEDIUM 측정은 이번 ULTRA 정답으로 사용하지 않음.
- Artillery: Field Trebuchets/Plagueclaw/Warp Lightning engine HP=500, Screaming Skull/Carronades=425 등 검증 5개와 다른 exact static 값이 존재한다. crew/engine HP 및 bonus의 적용 대상을 검증한 ULTRA 관측은 이번 정답 세트에 없다. 숫자 8의 패턴을 여기에 일반화하지 않음.

**현재 증거로 새 Production static 자동화를 허용할 범위는 0개다.** 직접 ULTRA runtime 5개는 기존 policy 아래 그대로 유지한다. 추가 일반화를 위해 필요한 의미는 HP source 기여도 분리, bonus scope, engine/articulation HP contribution, 정확한 ULTRA count mapping이다. 이번 작업은 새로운 측정을 요구하거나 이 빈틈을 heuristic으로 채우지 않는다.

## 검증

Research regression은 actual raw replay, 다섯 비교·반례, component multiplier 반증, missing row/edge/schema fail-closed, supplemental conflict/snapshot rejection, 101 identity/order coverage, protected inputs, deterministic report를 검사한다.

2026-10-03 검증 결과:

- `npm test`: 317/317 PASS, 신규 research regression 8/8 포함.
- `npm run build`: PASS. 기존 500 kB chunk 경고 유지, 동일 app bundle 출력.
- 기존 first/partial/deferred/evidence-linked/expansion-01/production-growth replay 6종: 모두 `--check` PASS.
- 기존 ULTRA HP replay: PASS, HP 5 / 공석 96 그대로.
- Stored context/runtime/CCO integration: 16/16 PASS. 실제 게임 또는 새로운 RPFM extraction 없이 기존 saved source를 재사용.
- Historical runtime replay: 5200 events / 51 captures / 316 observations, VALIDATED, 기존 evidence/comparison/proposal 결과 EXACT_EQUALITY, original files 51개 byte 불변. 기존 stored manifest의 후속 manual 차이 `cases`/`freeCompanyMatrix`는 그대로이며 이 manifest 전체가 historical golden과 같다는 주장은 하지 않음.
- 기존 generated/game 자료 없이 별도 clean source snapshot에서 report replay 및 research test 8/8 PASS.
- 보호 파일 32개 검사 PASS. Production 101 / Sample 5 값·순서·bytes, HP policy/admission/runtime probe 및 기존 raw 로그 불변.

변경 범위: 이 연구 폴더의 report/fixture/helper, 연구 CLI, regression test. Production JSON·HP policy/admission·runtime evidence·speed/missile/다른 stats·UI·schema는 변경하지 않는다.
