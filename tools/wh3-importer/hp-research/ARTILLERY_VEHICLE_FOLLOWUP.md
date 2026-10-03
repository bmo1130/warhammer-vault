# ULTRA HP 후속 조사 — artillery / vehicle, 2026-10-03

> 이 문서는 9종 기준의 과거 연구/Black Coach 측정 전 예측이다. 현재 10종 재대조와 subset 판정은 [BLACK_COACH_REASSESSMENT.md](./BLACK_COACH_REASSESSMENT.md)를 참조한다.

새 raw capture 4종 모두 기존 `DIRECT_ULTRA_RUNTIME` admission을 통과했다. Production 101 / Sample 5를 유지하며 HP 확정은 **5 → 9**, 공석은 **96 → 92**다. 기존 5종 HP, 나머지 Production 값·순서, MEDIUM evidence와 `policy.mjs`는 변경하지 않았다. Static-derived admission은 구현하지 않았다.

기준 commit: `6428d93e3d28622b64d8e6547ff5862b1d9e9d56`. 동일 game `9.0.2.0`, staticSnapshotId `c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5`의 exact static/runtime 자료만 사용한다. 모든 식은 **수치적으로 양립하는 연구 후보**이며 게임의 HP ownership 규칙으로 확정된 것이 아니다.

## 원본과 admission

원본 위치: `generated/wh3/runtime-evidence/manual-ultra-hp/`. 파일명과 bytes를 그대로 `hp-policy/inputs/`에 보존했다. 아래 SHA256는 복사 전 원본과 committed 입력이 동일하다.

| 원본 파일 | Exact main = land identity | SHA256 | HealthMax / Initial | Man / Mount / Engine / Entity |
| --- | --- | --- | --- | --- |
| script_log_031026_1244.txt | wh_main_brt_art_field_trebuchet | 5008fd675f527b34ee84360bce39a626d54628bf151ec4866d998abe782e821d | 4512 / 4 | 44 / 0 / 4 / 4 |
| script_log_031026_1246.txt | wh2_dlc09_tmb_art_screaming_skull_catapult_0 | 290354820216f6cfd25c5618f01924c5e3b5e87b43885a0bd601be683bb233f4 | 4356 / 4 | 44 / 0 / 4 / 4 |
| script_log_031026_1248.txt | wh2_main_skv_art_plagueclaw_catapult | 2fa921c196822092101ea982ec3868190d9089f1460278f9ef07efa81d78df42 | 5028 / 4 | 56 / 0 / 4 / 4 |
| script_log_031026_1251.txt | wh2_dlc12_skv_veh_doom_flayer_0 | 8ef0750d5fe07954ca9e604f5d3e98bc1ad4614b02867d242f9a11677e2c3b8e | 6128 / 8 | 8 / 0 / 8 / 8 |

각각 complete snapshot 1개, ULTRA / DECLARED_SETUP, VALUE HealthMax·NumEntitiesInitial이며 identity/snapshot conflict·quarantine·held는 없다. 신규 228 events를 기존 parser/reconstruction/HP review로 검증했다. Production HP는 raw HealthMax를 그대로 채택했다.

Artillery 3종의 static trace는 기존 pinned compact expansion 02/03에서 기존 HP reader의 bounded source 형식으로 투영했다. 각 5 rows(main → land → man, land → engine → engine entity)와 공유 processed schemas를 보존한다. row ID/payload/schema/joins, original extraction hash, compact/expanded hash를 유지하고 원래 trace와 named HP fact의 동일성을 검증한다. pack locator는 provenance에 있는 portable `db.pack`이다. Doom-Flayers는 기존 `partial-sources.json`의 `sample-17`을 재사용한다. HP policy·compact format·정상화 규칙은 변경하지 않았다.

## 9종 static / runtime 비교

N=`main.num_men`, B=`land.bonus_hit_points`, U=`land.num_mounts`, G=`land.num_engines`, M/H/E/A=man/mount/engine/articulation의 `battle_entities.hit_points`. `—`는 exact reference가 빈 역할이다. C는 runtime `NumEntitiesInitial`이다.

| Unit | N | B | U | G | M/H/E/A | 후보 계산 결과 = raw HealthMax | C |
| --- | ---: | ---: | ---: | ---: | --- | ---: | ---: |
| Swordsmen | 120 | 61 | 0 | 0 | 8/—/—/— | (61+8)×120 = **8280** | 120 |
| Mounted Yeomen | 60 | 76 | 60 | 0 | 8/8/—/— | 76×60+8×60+8×60 = **5520** | 60 |
| Dragon Ogres | 16 | 608 | 0 | 0 | 8/—/—/— | (608+8)×16 = **9856** | 16 |
| Dread Saurian | 12 | 14984 | 1 | 0 | 8/8/—/— | 14984+8×12+8 = **15088** | 1 |
| Skeleton Chariots | 24 | 538 | 2 | 12 | 8/8/8/8 | 538×12+8×24+8×2×12+8×12+8×12 = **7032** | 12 |
| Field Trebuchets | 44 | 45 | 0 | 4 | 8/—/500/— | (45+8)×44+(45+500)×4 = **4512** | 4 |
| Screaming Skull Catapults | 44 | 48 | 0 | 4 | 8/—/425/— | (48+8)×44+(48+425)×4 = **4356** | 4 |
| Plagueclaw Catapults | 56 | 43 | 0 | 4 | 8/—/500/— | (43+8)×56+(43+500)×4 = **5028** | 4 |
| Doom-Flayers | 8 | 750 | 0 | 8 | 8/—/8/— | 750×8+8×8+8×8 = **6128** | 8 |

[followup.json](./followup.json)은 exact main/land identity, static 값/source pointer, classification field provenance, runtime refs/metadata와 비교 결과를 재현한다. [report.json](./report.json)과 [selection.json](./selection.json)은 기존 5종 조사·측정 전 예측을 보존한다. `five-unit-manifest.json`은 원래 manifest의 bytes를 그대로 고정하고, 현재 review의 처음 5종이 원래 replay와 동일한지도 검증한다. protected byte guard만 허용된 신규 direct HP projection의 현재 hashes로 갱신했다.

## H1–H4 평가

H1=`B*N+M*N+E*G`, C=N. H2=`B*G+M*N+E*G`, C=G. H3=`(B+M)*N`, C=N. H4=`(B+E)*G`, C=G.

| Unit | raw HP/C | H1 HP/C | H2 HP/C | H3 HP/C | H4 HP/C |
| --- | --- | --- | --- | --- | --- |
| Field Trebuchets | 4512/4 | 4332/44 | 2532/4 | 2332/44 | 2180/4 |
| Screaming Skull | 4356/4 | 4164/44 | 2244/4 | 2464/44 | 1892/4 |
| Plagueclaw | 5028/4 | 4856/56 | 2620/4 | 2856/56 | 2172/4 |
| Doom-Flayers | 6128/8 | **6128/8** | **6128/8** | 6064/8 | 6064/8 |

전체 ENGINE 공통 규칙으로는 **H1–H4 모두 기각**한다. Artillery 3종에서 어느 HP 후보도 맞지 않는다. Doom으로 한정하면 H1/H2는 생존하며 H3/H4는 기각된다. N=G=8, M=E=8 때문에 H1/H2의 의미는 구별할 수 없다. 기존 5종을 설명했던 shared branches의 수치 일치는 유지된다.

## 작은 비교 가설 세트와 식별 한계

1. MAN_ONLY: `(B+M)*N`, C=N.
2. MOUNTED: `B*U + M*N + H*U`, C=U.
3. Artillery: `(B+M)*N + (B+E)*G`, C=G.
4. 비 articulation vehicle(현재 실측은 Doom만): `B*N+M*N+E*G`, C=G.
5. ARTICULATED: V_N=`B*G+M*N+H*U*G+E*G+A*G` 또는 V_UG=`B*G+M*(U*G)+H*U*G+E*G+A*G`, C=G.

V_N/V_UG scoped 모델은 둘 다 **9/9 HP·C에 일치**한다. Skeleton은 N=U*G=24여서 둘을 구별하지 못한다. V_UG는 man HP 기여 수의 대안 가설이며 rider/mount index 대응이나 물리적 ownership을 추론한 것이 아니다. 이 유한 세트가 가능한 모든 가설을 망라하는 것은 아니며, component 총수를 combat count로 사용하지 않는다.

Artillery 3종에서 기초항을 M*N+E*G로 놓으면 `(HealthMax−기초항)/B = N+G`가 48, 48, 60으로 재현된다. 이는 **그 기초항을 가정한 수치 관계**이며 물리적으로 독립된 crew/engine HP pool 두 개의 증명은 아니다.

`(B+M)*N+(B+E)*G = M*N+G*(E+B*(1+N/G))`는 항등 변형이다. 추가 HP 측정으로도 “두 bonus pool”과 “chassis당 effective bonus”를 구별할 수 없다. Doom에서는 `B*N+M*N+E*G = B*G+(M+E)*G = (B+2*M)*G`가 같다. Mounted의 M=H=8, Skeleton의 E=A=8 때문에 source 교환·중복 기여 대안도 남는다.

Artillery 식을 무조건 Doom에 확장하면 **12128 ≠ 6128**이다. 따라서 “존재하는 모든 component pool에 B를 각각 적용한다”는 무조건적인 일반화는 기각한다. 구조별 계수를 새 admission 규칙으로 삼을 근거는 부족하다.

## Static ownership 단서

Artillery 3종은 `main.caste=warmachine`, `land.category=artillery`, `land.class=art_fld`, `engine.engine_type=Generic_3_Crew`다. Doom은 `chariot / war_machine / chariot / Generic_No_Crew_Rotate`, Skeleton도 `engine_type=Generic_No_Crew_Rotate`다. exact row/schema join으로 추적하는 구조적 상관관계이며 HP multiplicity의 직접 지정은 아니다. `Generic_3_Crew`라는 이름을 crew 수 3으로 해석하지 않는다(실제 N/G는 11 또는 14).

`land.bonus_hit_points`와 `battle_entities.hit_points`는 processed schema의 I32, `is_reference=null`이며 HP owner·적용 수 정의가 붙어 있지 않다. `engine_type`은 `gun_types_enum.key` reference지만 현재 committed bounded graph에 해당 enum의 joined row/schema는 없다. 이름으로 의미를 보충하지 않는다. `mounted_draughts`·`sync_locomotion`은 이번 artillery/Doom/Skeleton에서 모두 false여서 구별하지 못한다. 확보된 schema/HP trace에서 **bonus-pool ownership/multiplicity를 직접 결정하는 field는 확인하지 못했다**. 게임 전체 DB에 그런 정보가 없다고 단정하지 않는다.

## 다음 후보: Black Coach 1종만

101종을 같은 pinned source로 다시 검색했을 때 V_N/V_UG를 구별하는 미측정 대상은 **Black Coach**뿐이다. 다른 artillery나 같은 구조의 vehicle을 추가 측정해도 이 두 가설은 구별되지 않는다.

- Exact main/land: `wh_main_vmp_veh_black_coach`.
- Trace: `partial-sources.json /candidates/7/dump`(sample-14)와 기존 `articulation.source.json` exact supplement.
- N=1, B=5940, U=2, G=1, M=H=E=A=8.
- V_N: **5980**, Initial=**1**. V_UG: **5988**, Initial=**1**.
- 5980/1이면 V_UG, 5988/1이면 V_N을 기각한다. 다른 HP/count면 둘 모두 기각한다. 가까운 값을 채택하거나 계수를 보정하지 않는다.

미래 조사 후보일 뿐이며 게임·새 측정·probe/절차 변경은 수행하지 않았다. 전체 catalog에서 같은 M/H, E/A source alias나 항등 변형은 이 후보로도 해결되지 않는다.

## Production 자동화와 재현

현재 static derivation을 안전하게 admission할 수 있는 범위는 **NONE**이다. 입력 추적이 가능한 101종도 unique ownership·bonus multiplicity·cross-class ULTRA count contract가 미확정이므로 CONFIDENT 0 / AMBIGUOUS 101 / UNAVAILABLE 0을 유지한다. 직접 ULTRA runtime HP 9종은 유효하며 나머지 92종은 공석이다.

```powershell
node tools/wh3-importer/hp-policy/project-artillery.mjs --check
node scripts/promote-ultra-hp.mjs --check
node scripts/research-wh3-hp.mjs --check
node tools/wh3-importer/hp-research/selection.mjs --check
node tools/wh3-importer/hp-research/followup.mjs --check
npm test
npm run build
```

Source/review/research replay는 clean source snapshot에서 게임·RPFM·generated capture 없이 가능하다. 원래 raw가 있는 checkout에서는 original path bytes도 비교한다. Stored context/runtime/CCO regression은 기존 stored captures를 별도로 사용하며 과거 MEDIUM evidence bytes를 보존한다.

검증 결과: 전체 tests 329/329, build PASS, 위 replay 11개 PASS, stored context/runtime/CCO 16/16 PASS. 과거 CCO 51 capture/5200 events/316 observations는 bytes·replay EXACT_EQUALITY다. 별도 clean source snapshot에서도 replay 11개와 tests 328 PASS/0 FAIL/1 SKIP이며, skip은 ignored local reviewed artifact를 사용하는 기존 display projection 검사다. HP 원본/정책/기존 5종과 shared diagnostic registry는 보존했다.
