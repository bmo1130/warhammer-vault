# Black Coach와 10종 ULTRA HP 재평가 — 2026-10-03

Black Coach의 원본 ULTRA 로그는 기존 `DIRECT_ULTRA_RUNTIME` policy를 통과했다. Production 101 / Sample 5를 유지하며 direct HP는 **9 → 10**, 공석은 **92 → 91**이다. Production 변경은 Black Coach `entities.totalHealth=5980` 하나뿐이다. 기존 9종·비HP 값·순서·MEDIUM evidence·HP policy는 보존했다. Static-derived admission/projection은 구현하지 않았다.

기준 commit: `35fb5f3174328dae303b574875f385ac844640ad`. 모든 비교는 game `9.0.2.0`, staticSnapshotId `c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5`의 exact committed source trace와 원본 probe에 근거한다. 웹 수치를 사용하지 않았고 게임·새 측정·probe 변경은 수행하지 않았다.

## 원본 admission

원본: `generated/wh3/runtime-evidence/manual-ultra-hp/script_log_031026_1359.txt`.

- 원래 파일명 그대로 `hp-policy/inputs/script_log_031026_1359.txt`에 **32685 bytes**를 보존했다.
- SHA256: `e30d36fca619cb18fdd894a718181cda61c945a6b809b583441a712238f9acba`.
- Exact main/land 모두 `wh_main_vmp_veh_black_coach`.
- 28 events, complete snapshot 2개, parse/run problems·held·quarantine 0.
- 모든 record가 ULTRA / DECLARED_SETUP, game/static snapshot 일치.
- 두 snapshot 모두 VALUE HealthMax=HealthValue=5980, NumEntitiesInitial=NumEntities=1.
- Man/Mount/Engine/Entity list counts는 각각 1/2/1/1.
- Engine entity=`wh_main_vehicle_vmp_black_coach_chariot`, EntityList entity=`wh_main_vehicle_vmp_black_coach_chariot_articulation`, Mount entity=`wh_main_vehicle_vmp_black_coach_chariot_nightmare_draught`.

두 snapshot은 동일 event session의 `snapshot-1`/`snapshot-2`다. **독립 session 1, unit-profile 표본 가중치 1**로 계산한다. 반복 관측은 안정성 확인이며 독립 표본 두 개로 세지 않는다. 두 원본 reference(`:88`, `:102`)는 모두 admission에 보존한다.

## 5980 / 5988을 만든 실제 식

기호: N=`main.num_men`, B=`land.bonus_hit_points`, U=`land.num_mounts`, G=`land.num_engines`, M/H/E/A=man/mount/engine/articulation entity의 `battle_entities.hit_points`.

기존 [followup.mjs](./followup.mjs)의 V_N/V_UG와 [측정 전 forecast](./followup.json)를 그대로 사용했다.

- V_N: `B*G + M*N + H*U*G + E*G + A*G`.
- V_UG: `B*G + M*(U*G) + H*U*G + E*G + A*G`.
- Black Coach: N=1, B=5940, U=2, G=1, M=H=E=A=8.
- 공통 항: `5940 + 16 + 8 + 8 = 5972`.
- 차이는 man 기여 수뿐: V_N은 `8*1=8`, V_UG는 `8*(2*1)=16`.
- 결과: **5980 / 5988**, 차이 **8 HP**. 실측 5980/1은 V_N과 일치하고 V_UG를 기각한다.

Skeleton Chariots에서는 N=U*G=24라서 두 식이 모두 7032였다. Black Coach가 그 동률을 해소했다. 이는 기존의 제한된 두 가설 사이의 판별이며, 물리적인 parent mapping이나 모든 chariot의 HP 소유권을 확정하지 않는다.

## 구조별 최소 계산 후보

`CONFIRMED_FOR_TESTED_STRUCTURE`는 표본의 HP/count 계산 재현과 명시적 구조 범위에 대한 confidence다. 전체 class의 Production 자동화를 허용한다는 뜻이 아니다. M/H 및 E/A source alias는 현재 HP가 같으므로 별도의 의미적 ambiguity로 보존한다.

| 구조 | 정확한 적용 조건 | 계산 후보 | B 횟수 / logical count | 표본 unit 수 | catalog / confident | class confidence |
| --- | --- | --- | --- | ---: | --- | --- |
| MAN_ONLY | main→land→man; mount/engine/articulation refs 빈 값 | (B+M)*N | N / N | 2 | 71 / 4 | CONFIRMED_FOR_TESTED_STRUCTURE |
| MOUNTED_EQUAL_COUNTS | man, mount→entity; engine/articulation 없음; N=U | B*U+M*N+H*U | U / U | 1 | 19 / 1 | CONFIRMED_FOR_TESTED_STRUCTURE |
| ATTACHED_RIDERS | 위 mounted joins, N≠U | B*U+M*N+H*U | U / U | 1 | 2 / 0 | PLAUSIBLE_BUT_AMBIGUOUS |
| ARTILLERY | man, engine→battle_entity; mount/articulation/extra HP roles 없음; 검증된 flags/type/profile | (B+M)*N+(B+E)*G | N+G / G | 3 | 6 / 4 | CONFIRMED_FOR_TESTED_STRUCTURE |
| ENGINE_VEHICLE | engine와 man; mount/articulation 없음; 검증 N=G profile에 한정 | B*N+M*N+E*G | N(=G) / G | 1 | 1 / 0 | PLAUSIBLE_BUT_AMBIGUOUS |
| ARTICULATED | man, mount→entity, engine→battle_entity, articulation→articulated_entity | B*G+M*N+H*U*G+E*G+A*G | G / G | 2 | 2 / 1 | PLAUSIBLE_BUT_AMBIGUOUS |

Artillery는 서로 다른 B/N/E에서 같은 수치 분해가 반복됐다. **M은 세 표본 모두 8**이므로 M 변화에 따른 검증은 없었다. “crew/engine 각각에 B가 붙는 두 physical pool”과 “engine당 effective bonus”는 항등 변형이라 HP만으로 구별되지 않는다.

Doom에 artillery 식을 적용하면 12128≠6128이다. 구조를 구분해야 하지만, 그 내부 원인을 결정하는 ownership/bonus-count field는 아직 확보하지 못했다. Doom의 N=G, M=E=8은 bonus count와 source 교환을 구별하지 못한다.

## 101종의 여섯 조건 재판정

결과는 **STATIC_DERIVATION_CONFIDENT 10 / AMBIGUOUS 91 / UNAVAILABLE 0**이다. 이전의 blanket ambiguity를 그대로 재사용하지 않고 각 유닛별 여섯 boolean 조건과 실패 이유를 [black-coach.json](./black-coach.json)에 기록한다.

1. Exact identity·processed schema joins와 필요한 named HP 입력이 있고 unsupported extra HP role이 없다.
2. 같은 structural class의 runtime 검증 표본이 있다.
3. 현재 생존 가설과 기존 source/count alias가 그 profile에서 서로 다른 HP를 예측하지 않는다.
4. 동일 component HP record와 static count profile에서 role별 aggregate multiplicity가 실제 list counts와 맞는다.
5. 같은 profile에서 static N/U/G로 얻은 ULTRA logical count가 runtime Initial과 맞는다.
6. HP 입력·component HP record identities·join 구조·schema versions·snapshot·class/attachment flags가 검증된 HP-chain profile과 정확히 같다.

CONFIDENT는 **검증된 동일 HP-chain profile에 한정한 경험적 계산 confidence**다. 임의의 새로운 B/count/entity profile로 외삽하지 않는다. 서로 다른 식이 이 bounded profile에서 같은 HP를 내는 것은 의미적 alias이며, 숫자가 달라지는 competing formula와 구별한다. 알려지지 않은 모든 WH3 규칙을 배제했다는 증명은 아니다.

중간 engine/mount/articulation record의 key 이름 자체는 HP profile 비교에서 제외한다. 각 join은 개별 유닛에서 exact하게 검증하고, 동일한 endpoint HP record·join 형식·관련 flags·count·HP 값으로 비교한다. 무관한 missile/model 차이를 HP 근거로 사용하지 않는다.

CONFIDENT 10종:

- Swordsmen — `wh_main_emp_inf_swordsmen`
- Dragon Ogres — `wh_dlc01_chs_mon_dragon_ogre`
- Mounted Yeomen — `wh_main_brt_cav_mounted_yeomen_0`
- Skeleton Chariots — `wh2_dlc09_tmb_veh_skeleton_chariot_0`
- Field Trebuchets — `wh_main_brt_art_field_trebuchet`
- Screaming Skull Catapults — `wh2_dlc09_tmb_art_screaming_skull_catapult_0`
- Plagueclaw Catapults — `wh2_main_skv_art_plagueclaw_catapult`
- Spearmen (Shields) — `wh_main_emp_inf_spearmen_1`
- Battle Pilgrims — `wh_dlc07_brt_inf_battle_pilgrims_0`
- Blessed Field Trebuchets — `wh_dlc07_brt_art_blessed_field_trebuchet_0`

마지막 세 종은 미측정이지만 각각 Swordsmen / Swordsmen / Field Trebuchets와 검증된 HP profile이 정확히 같다. 연구상 예상 HP는 8280 / 8280 / 4512다. **세 Production HP는 계속 공석이며 static admission은 없다.** 미래 자동화 검토 범위는 이 세 동일-profile 전이까지로 제한할 수 있고, 현재 코드에는 direct runtime admission만 존재한다.

## Artillery 6종의 별도 판정

모두 exact man/engine schema joins, Generic_3_Crew, mount/articulation refs 빈 값, extra joined HP 역할 0을 확인했다. Category가 같다는 사실만으로 CONFIDENT 처리하지 않았다.

| Unit | N/B/G/M/E | exact crew / engine HP 관계 | 판정 |
| --- | --- | --- | --- |
| Field Trebuchets | 44/45/4/8/500 | 직접 검증 | CONFIDENT |
| Blessed Field Trebuchets | 44/45/4/8/500 | Field와 같은 crew/engine entity rows, join 형식·HP/count/flags; 중간 engine record key는 다름 | CONFIDENT |
| Plagueclaw Catapults | 56/43/4/8/500 | 직접 검증 | CONFIDENT |
| Screaming Skull Catapults | 44/48/4/8/425 | 직접 검증 | CONFIDENT |
| Warp Lightning Cannons | 56/40/4/8/500 | crew는 Plagueclaw와 같지만 새로운 engine entity·B profile | AMBIGUOUS |
| Carronades | 44/48/4/8/425 | Skull과 숫자는 같지만 crew·engine entity records가 다름 | AMBIGUOUS |

따라서 artillery의 CONFIDENT는 **4종(직접 검증 3 + 동일 HP profile 1)**이다. 나머지 두 종의 candidate HP는 계산할 수 있어도 동일-profile 조건과 cross-entity 전이 근거가 부족하다. 보유한 static count 필드가 없다는 뜻이 아니라, 새 profile에서 그 의미를 그대로 적용할 근거가 부족하다는 판정이다.

## Rider override와 남은 ambiguity

Black Coach의 static named man은 `wh_main_infantry_standard_blood_dismembers`지만 raw ManList는 `wh_main_infantry_rider`다. 같은 static snapshot에서 후자의 HP 8은 Dread Saurian의 named man chain에 존재하지만, **Black Coach static chain의 effective rider override join**은 확보되지 않았다. 값이 같다는 이유로 그 join을 만들어 내지 않는다.

Doom static man=`wh2_main_skv_infantry`, raw man=`wh_main_infantry_rider_very_large_blood`다. Dread static man=`wh_main_infantry_rider`, raw는 `wh2_main_lzd_warbeast_rider_360_blood`와 `wh2_main_lzd_inf_skink_stegadon_rider_150_blood_dismembers`다. 이 세 종은 direct runtime HP가 유효하지만 static-only 분류는 AMBIGUOUS다. Skeleton은 현재 named static 역할과 raw key가 일치해 동일 tested profile 범위에서 CONFIDENT다.

Black/Skeleton의 mount aggregate는 U*G, man aggregate는 N, engine과 EntityList는 G로 재현된다. **이것은 aggregate cardinality 비교**이며 equal counts에서 index 대응·개별 parent mapping·동일 record의 중복 physical object를 추론하지 않는다. EntityList size 하나만으로 HP 기여도를 결정하지 않는다. E=A=8 때문에 E+A와 2E가 같은 alias는 여전히 남는다.

## 추가 측정

이번에는 **추천 0종**이다. 기존 V_N/V_UG의 유일한 HP 분기는 Black Coach로 해결됐다. 살아 있는 source/count alias를 101종 전체에 다시 계산한 결과 새 HP 차이를 예측하는 대상은 없다. 새로운 profile 전이와 effective rider source chain 문제가 남았으므로 먼저 static proof를 보강해야 한다. 미측정 유닛마다 임의의 새 계수/분기를 만들어 측정을 요구하지 않는다. 향후 일반화 실험이 유용할 수 있다는 것과 현재 가설을 구별할 추가 측정이 꼭 필요하다는 것은 다르다.

## 재현

과거 5종·9종 cohort는 `five-unit-manifest.json`과 `nine-unit-manifest.json`으로 원래 bytes/provenance를 보존하고 현재 review의 해당 부분과 equality를 확인한다. 기존 가설 함수는 변경하지 않았다. 새 report는 기존 source decoder·named fact·schema join·runtime parser/reconstruction·HP review를 재사용한다. Catalog에는 재생성 가능한 세부 source를 재복제하지 않고 기존 selection/source pointer와 profile fingerprint를 연결한다.

```powershell
node scripts/promote-ultra-hp.mjs --check
node tools/wh3-importer/hp-research/black-coach.mjs --check
node tools/wh3-importer/hp-research/followup.mjs --check
node scripts/research-wh3-hp.mjs --check
node tools/wh3-importer/hp-research/selection.mjs --check
npm test
npm run build
```

`--write`는 해당 연구 JSON만 갱신한다. Static-derived HP, speed/missile/entity policy, schema/UI 변경이나 게임 실행은 하지 않는다.

## 10종 수치·exact entity/source 대조표

아래 표는 committed `black-coach.json`에서 렌더링한다. `—`는 빈 역할 reference이며 unknown을 0으로 만든 값이 아니다. 표의 named static HP와 runtime role key 차이를 위 override 설명과 함께 읽는다.

| Unit | N | B | U | G | M/H/E/A HP | runtime Man/Mount/Engine/Entity | HP / Initial | V_N 결과 / match |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| Swordsmen | 120 | 61 | 0 | 0 | 8/—/—/— | 120/0/0/120 | 8280 / 120 | 8280 / MATCH |
| Mounted Yeomen | 60 | 76 | 60 | 0 | 8/8/—/— | 60/60/0/60 | 5520 / 60 | 5520 / MATCH |
| Dragon Ogres | 16 | 608 | 0 | 0 | 8/—/—/— | 16/0/0/16 | 9856 / 16 | 9856 / MATCH |
| Dread Saurian | 12 | 14984 | 1 | 0 | 8/8/—/— | 12/1/0/1 | 15088 / 1 | 15088 / MATCH |
| Skeleton Chariots | 24 | 538 | 2 | 12 | 8/8/8/8 | 24/24/12/12 | 7032 / 12 | 7032 / MATCH |
| Field Trebuchets | 44 | 45 | 0 | 4 | 8/—/500/— | 44/0/4/4 | 4512 / 4 | 4512 / MATCH |
| Screaming Skull Catapults | 44 | 48 | 0 | 4 | 8/—/425/— | 44/0/4/4 | 4356 / 4 | 4356 / MATCH |
| Plagueclaw Catapults | 56 | 43 | 0 | 4 | 8/—/500/— | 56/0/4/4 | 5028 / 4 | 5028 / MATCH |
| Doom-Flayers | 8 | 750 | 0 | 8 | 8/—/8/— | 8/0/8/8 | 6128 / 8 | 6128 / MATCH |
| Black Coach | 1 | 5940 | 2 | 1 | 8/8/8/8 | 1/2/1/1 | 5980 / 1 | 5980 / MATCH |

| Unit / exact main → land | M/H/E/A exact entity keys (HP) | 현재 계산식 | Source trace |
| --- | --- | --- | --- |
| Swordsmen<br>`wh_main_emp_inf_swordsmen` → `wh_main_emp_inf_swordsmen` | man: `wh_main_infantry_standard_blood_dismembers` (8)<br>mount: —<br>engine: —<br>articulation: — | `(B+M)*N` | `tools/wh3-importer/promotion/partial-sources.json`<br>`/candidates/1/dump` |
| Mounted Yeomen<br>`wh_main_brt_cav_mounted_yeomen_0` → `wh_main_brt_cav_mounted_yeomen_0` | man: `wh_main_cavalry_rider_standard_blood` (8)<br>mount: `wh_main_brt_mnt_cavalry_fast_blood` (8)<br>engine: —<br>articulation: — | `B*U + M*N + H*U` | `tools/wh3-importer/promotion/partial-sources.json`<br>`/candidates/4/dump` |
| Dragon Ogres<br>`wh_dlc01_chs_mon_dragon_ogre` → `wh_dlc01_chs_mon_dragon_ogre` | man: `wh_dlc01_chs_dragon_ogre_blood` (8)<br>mount: —<br>engine: —<br>articulation: — | `(B+M)*N` | `tools/wh3-importer/promotion/dragon-ogres.source.json`<br>`/dump` |
| Dread Saurian<br>`wh2_dlc13_lzd_mon_dread_saurian_1` → `wh2_dlc13_lzd_mon_dread_saurian_1` | man: `wh_main_infantry_rider` (8)<br>mount: `wh2_dlc13_lzd_mon_dread_saurian_blood` (8)<br>engine: —<br>articulation: — | `B*U + M*N + H*U` | `tools/wh3-importer/promotion/partial-sources.json`<br>`/candidates/13/dump` |
| Skeleton Chariots<br>`wh2_dlc09_tmb_veh_skeleton_chariot_0` → `wh2_dlc09_tmb_veh_skeleton_chariot_0` | man: `wh2_dlc09_tmb_skeleton` (8)<br>mount: `wh2_dlc09_tmb_cav_skeletal_steed_chariot` (8)<br>engine: `wh2_dlc09_tmb_vehicle_chariot` (8)<br>articulation: `wh2_dlc09_tmb_vehicle_chariot_horse_articulation` (8) | `B*G + M*N + H*U*G + E*G + A*G` | `tools/wh3-importer/promotion/partial-sources.json`<br>`/candidates/8/dump`<br>+ `articulation.source.json` |
| Field Trebuchets<br>`wh_main_brt_art_field_trebuchet` → `wh_main_brt_art_field_trebuchet` | man: `wh2_dlc16_infantry_standard_crew_blood_dismembers` (8)<br>mount: —<br>engine: `wh_main_brt_art_trebuchet` (500)<br>articulation: — | `(B+M)*N + (B+E)*G` | `tools/wh3-importer/expansion-batch-02/sources.json`<br>`/decoded/candidates/13/dump` |
| Screaming Skull Catapults<br>`wh2_dlc09_tmb_art_screaming_skull_catapult_0` → `wh2_dlc09_tmb_art_screaming_skull_catapult_0` | man: `wh2_dlc16_tmb_skeleton_crew` (8)<br>mount: —<br>engine: `wh2_dlc09_tmb_art_screaming_skull_catapult` (425)<br>articulation: — | `(B+M)*N + (B+E)*G` | `tools/wh3-importer/expansion-batch-03/sources.json`<br>`/decoded/candidates/23/dump` |
| Plagueclaw Catapults<br>`wh2_main_skv_art_plagueclaw_catapult` → `wh2_main_skv_art_plagueclaw_catapult` | man: `wh2_dlc16_skv_infantry_crew` (8)<br>mount: —<br>engine: `wh2_main_skv_art_plagueclaw_catapult` (500)<br>articulation: — | `(B+M)*N + (B+E)*G` | `tools/wh3-importer/expansion-batch-03/sources.json`<br>`/decoded/candidates/17/dump` |
| Doom-Flayers<br>`wh2_dlc12_skv_veh_doom_flayer_0` → `wh2_dlc12_skv_veh_doom_flayer_0` | man: `wh2_main_skv_infantry` (8)<br>mount: —<br>engine: `wh2_dlc12_skv_vehicle_doom_flayer` (8)<br>articulation: — | `B*N + M*N + E*G` | `tools/wh3-importer/promotion/partial-sources.json`<br>`/candidates/10/dump` |
| Black Coach<br>`wh_main_vmp_veh_black_coach` → `wh_main_vmp_veh_black_coach` | man: `wh_main_infantry_standard_blood_dismembers` (8)<br>mount: `wh_main_vehicle_vmp_black_coach_chariot_nightmare_draught` (8)<br>engine: `wh_main_vehicle_vmp_black_coach_chariot` (8)<br>articulation: `wh_main_vehicle_vmp_black_coach_chariot_articulation` (8) | `B*G + M*N + H*U*G + E*G + A*G` | `tools/wh3-importer/promotion/partial-sources.json`<br>`/candidates/7/dump`<br>+ `articulation.source.json` |

## 검증 결과와 변경 파일

전체 tests **335/335**, build PASS. 기존 first/partial/deferred/evidence-linked/expansion/growth/ULTRA HP production replay와 source/research replay 총 **12개 PASS**다. Stored context/runtime/CCO **16/16 PASS**이며 과거 CCO capture 51개/5200 events/316 observations의 bytes와 역사적 replay를 보존했다. Clean source snapshot에서도 replay 12개와 tests **334 PASS / 0 FAIL / 1 SKIP**다. Skip은 ignored local reviewed artifacts를 사용하는 기존 display projection 선택 검사다.

현재 commit의 변경 파일 20개:

- `README.md`
- `src/data/unitHpAdmissions.json`
- `src/data/units.json`
- `tests/wh3-black-coach-hp.test.cjs`
- `tests/wh3-hp-followup.test.cjs`
- `tests/wh3-hp-policy.test.cjs`
- `tests/wh3-hp-research.test.cjs`
- `tools/wh3-importer/hp-policy/HP_POLICY.md`
- `tools/wh3-importer/hp-policy/inputs/script_log_031026_1359.txt`
- `tools/wh3-importer/hp-policy/manifest.json`
- `tools/wh3-importer/hp-policy/overlay.cjs`
- `tools/wh3-importer/hp-policy/review.json`
- `tools/wh3-importer/hp-research/ARTILLERY_VEHICLE_FOLLOWUP.md`
- `tools/wh3-importer/hp-research/BLACK_COACH_REASSESSMENT.md`
- `tools/wh3-importer/hp-research/baseline.json`
- `tools/wh3-importer/hp-research/black-coach.json`
- `tools/wh3-importer/hp-research/black-coach.mjs`
- `tools/wh3-importer/hp-research/followup.json`
- `tools/wh3-importer/hp-research/followup.mjs`
- `tools/wh3-importer/hp-research/nine-unit-manifest.json`
