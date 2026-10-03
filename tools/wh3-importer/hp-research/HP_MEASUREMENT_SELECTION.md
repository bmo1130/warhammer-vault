# HP 가설 판별용 최소 표본 선정 — 2026-10-03

> 이 문서는 5종 기반의 과거 조사/측정 전 예측이다. 신규 4종 실측과 H1–H4 재평가는 [ARTILLERY_VEHICLE_FOLLOWUP.md](./ARTILLERY_VEHICLE_FOLLOWUP.md)를 참조한다. 현재 직접 runtime HP는 9종이며 기존 숫자 예측은 보존한다.

Tier 1은 **Field Trebuchets + Screaming Skull Catapults**다. Tier 2는 조건부 **Plagueclaw Catapults + Doom-Flayers**다. 총 4종 중 첫 1종만으로 아래 네 engine-only 확장 가설을 구분할 수 있고, 두 번째는 다른 engine HP 값에서 교차 검증한다. 이 선정만으로 WH3 범용 HP 규칙을 확정할 수는 없다.

이번 작업은 static 조사·후보 선정이다. 실제 측정/게임 실행/새 runtime evidence/인게임 작업을 요구하는 코드·workflow 변경이 없다. Production 101 / Sample 5 / 직접 ULTRA HP 5 / 공석 96, HP policy와 모든 기존 evidence를 유지한다. 본 문서의 숫자는 **미검증 예측**이며 admission 입력이 아니다.

## 가설의 범위와 기존 정답

기준 commit: `88e11e5cb1c121929ae6a582e17863a844ecb34d`. 원본 [HP 조사](./HP_DERIVATION.md), [report.json](./report.json), 실제 raw ULTRA replay를 그대로 검증한다. 동일 game `9.0.2.0`, staticSnapshotId `c7bd67f50bb4df4f16254e5e9615324e615debf434c865de014e77e4483471e5`의 exact schema/pack/source trace만 사용한다. 외부 HP 수치는 사용하지 않았다.

기호: N=`main.num_men`, B=`land.bonus_hit_points`, U=`land.num_mounts`, G=`land.num_engines`, M/H/E/A=각 man/mount/engine/articulation entity의 `battle_entities.hit_points`, C=예상 logical NumEntitiesInitial.

현재 5종과 양립하는 공통 **후보**:

| Static shape | 계산 후보 | 예상 C | 기존 양립 사례 |
| --- | --- | --- | --- |
| MAN_ONLY | `(B+M)*N` | N | Swordsmen 8280/120, Dragon Ogres 9856/16 |
| MOUNTED | `B*U+M*N+H*U` | U | Yeomen 5520/60, Dread Saurian 15088/1 |
| ARTICULATED | `B*G+M*N+H*U*G+E*G+A*G` | G | Skeleton Chariots 7032/12 |

이들은 의미가 확정된 normalizer 규칙이 아니다. 특히 U를 mounted shape에서는 전체 mount 수, articulated shape에서는 engine당 draught 수로 해석하는 가정이 있다. 기존 5개의 관측과 양립할 뿐 전체 class에 검증된 것은 아니다.

### 아직 분리되지 않는 source 기여도

| 적용 범위 | 경쟁 식 | 필요한 fields | 예측이 달라지는 조건 | 기존 양립 사례 |
| --- | --- | --- | --- | --- |
| MOUNTED | `B*U+M*N+H*U` / `B*U+M*(N+U)` / `B*U+H*(N+U)` | B,N,U,M,H | M≠H이고 관련 count가 양수 | Yeomen, Dread 모두 M=H=8 |
| ARTICULATED | 공통 crew/draught 항 + `(E+A)*G` / `2*E*G` | B,N,U,G,M,H,E,A | E≠A | Chariots E=A=8 |

`2*E`는 물리적 engine 두 개라는 뜻이 아니라 기존 연구의 **비식별성 반례**다. 새 component나 multiplicity를 발명하지 않는다. 이 두 경쟁군은 101종의 현재 exact 주요 trace에서도 분리할 표본이 없다. Mounted rider-only/mount-only에 B를 더하는 단순 후보는 Yeomen 5040, Dread 14992/179904 등 기존 관측과 불일치하므로 공통 규칙 후보로 다시 추천하지 않는다.

### 판별할 네 engine-only 확장

ENGINE shape는 nonempty engine reference, **명시적으로 빈 mount/articulated reference**를 가진 경우다. 기존 5종에는 이 shape가 하나도 없다. 따라서 아래 가설은 기존 정답에 검증된 규칙이 아니라, 위 공통 branch와 함께 기존 5종에 모순되지 않는 **미측정 branch의 유한한 대안**이다. 관측하지 않은 unit type을 임의 예외로 무한 증식하지 않는다. HP가 별도 crew pool인지 chassis pool인지, bonus가 어느 logical count에 붙는지를 현재 존재하는 source 역할과 count만으로 비교한다.

| ID | engine-only HP 식 | 예상 C | 필요한 static fields | 판별 질문 |
| --- | --- | --- | --- | --- |
| H1 | `B*N+M*N+E*G` | N | B,N,M,E,G | crew를 logical count로 보고 crew+engine HP를 포함하는가? |
| H2 | `B*G+M*N+E*G` | G | B,N,M,E,G | engine을 logical count로 보고 crew HP도 포함하는가? |
| H3 | `(B+M)*N` | N | B,N,M | HealthMax가 crew pool이며 engine HP는 별도 pool인가? |
| H4 | `(B+E)*G` | G | B,E,G | HealthMax가 chassis/body pool이며 crew HP는 제외되는가? |

H1/H2는 N≠G이고 B≠0이면 HP/count 예측이 갈린다. H1/H3는 E×G>0이면 HP가 갈린다. H2/H4는 M×N>0이면 HP가 갈린다. H3/H4는 N,G와 M,E에 따라 갈린다. N=G, M=E이면 두 쌍이 남을 수 있다. 모든 식은 정확한 입력만 사용하며 missing을 zero로 바꾸지 않는다.

공통 branch를 네 대안에 적용했을 때 기존 5개의 실제 HP/count를 모두 재현한다. 이것은 **engine-only branch의 검증이 아니라 해당 branch가 아직 관측되지 않았다는 사실**이다. 네 가설은 모든 가능한 bonus scope/물리적 배치/타입별 규칙을 망라하지 않는다.

## Production 101종 census

[selection.json](./selection.json)은 전체 101종의 exact main/land identity, source pointer, N/B/U/G, entity key/HP/row ID/schema version, classification, 추가 reachable HP row 조사, 가설별 연구 예측을 기록한다. 추천 4종에는 full named-field fact/join chain도 포함한다. 기존 compact source를 decode하고 기존 selector로 검증하며 별도 extraction 또는 evidence system을 만들지 않았다.

| 항목 | 발견 수 |
| --- | ---: |
| man HP=8 | 101 |
| mount HP=8 | 23 |
| engine HP=8 / 425 / 500 | 3 / 2 / 4 |
| articulation HP=8 | 2 |
| man≠mount / engine≠articulation | 0 / 0 |
| 높은 판별력: man≠engine, non-8 engine | 6종, HP-input profile 4개 |
| 적어도 한 가설 쌍이 갈리는 후보 | 7종 |
| 이번 주요 trace에서 추가 unclassified reachable entity HP row | 0 |

추가 row 0은 전체 게임/attachment/modifier graph가 완전하다는 주장이 아니다. 실제로 확보된 bounded source trace의 범위다. HP 입력의 absence와 의미 미확정을 구분한다.

높은 판별력 6종: Field Trebuchets, Blessed Field Trebuchets, Plagueclaw Catapults, Warp Lightning Cannons, Screaming Skull Catapults, Carronades. Doom-Flayers는 8로 같지만 engine 기여도 두 그룹을 나눌 수 있어 informative 후보 7번째다.

Field/Blessed 및 Skull/Carronades는 각각 N/B/G/M/E가 같아 네 가설의 예측 벡터도 같다. 같은 예측을 반복하는 표본을 최소 세트에 함께 넣지 않았다. Warp Lightning은 N/G/E가 Plagueclaw와 같고 B만 달라, 이미 선택한 multiplicity/HP-value 대비에 새 축을 주지 않아 제외했다.

## Tier 1 — 우선 2종

1. **Field Trebuchets** — Production `ca_unit_wh_main_brt_art_field_trebuchet`; main=land=`wh_main_brt_art_field_trebuchet`.
   Static caste/category/class=`warmachine/artillery/art_fld`. N=44, G=4, N/G=11, M=8, E=500. 네 HP 예측과 여섯 모델 쌍을 모두 분리한다. N인지 G인지 count 질문도 한 번에 판별한다.
2. **Screaming Skull Catapults** — Production `ca_unit_wh2_dlc09_tmb_art_screaming_skull_catapult_0`; main=land=`wh2_dlc09_tmb_art_screaming_skull_catapult_0`.
   동일 classification, N=44, G=4, N/G=11을 유지하며 E=425로 바뀐다. 단일 사례의 우연한 일치나 특정 engine HP 값에 종속된 패턴을 두 번째 값에서 확인하는 대조군이다.

## Tier 2 — 조건부 2종

3. **Plagueclaw Catapults** — Production `ca_unit_wh2_main_skv_art_plagueclaw_catapult`; main=land=`wh2_main_skv_art_plagueclaw_catapult`.
   동일 classification, E=500을 유지하고 N/G가 14로 바뀐다. Tier 1의 bonus/count 또는 crew multiplicity 해석이 남거나 두 결과가 같은 확장과 양립하지 않을 때, 새로운 비율 및 exact crew key에서 대조할 대상이다. 결과 불일치가 있으면 기존 모델을 확인된 사실로 승격하지 않는다.
4. **Doom-Flayers** — Production `ca_unit_wh2_dlc12_skv_veh_doom_flayer_0`; main=land=`wh2_dlc12_skv_veh_doom_flayer_0`.
   Static caste/category/class=`chariot/war_machine/chariot`, mount/articulation 없음, N=G=8, M=E=8. Artillery에서 얻은 해석이 non-articulated chariot-class engine에도 같은지 확인하는 조건부 transfer/control 대상이다. HP 두 그룹만 구분하며, N=G라 count source를 구분하지 못한다. Artillery와 다른 unit-type 규칙이 나와도 오류로 단정하지 않는다.

### Exact entity inputs

모든 추천에서 U=0, mount 및 articulation reference는 schema-checked empty다. 아래의 man/engine key는 record key가 아니라 **battle entity key**다.

| 대상 | N | B | G | man entity / M | engine entity / E |
| --- | ---: | ---: | ---: | --- | --- |
| Field Trebuchets | 44 | 45 | 4 | `wh2_dlc16_infantry_standard_crew_blood_dismembers` / 8 | `wh_main_brt_art_trebuchet` / 500 |
| Screaming Skull | 44 | 48 | 4 | `wh2_dlc16_tmb_skeleton_crew` / 8 | `wh2_dlc09_tmb_art_screaming_skull_catapult` / 425 |
| Plagueclaw | 56 | 43 | 4 | `wh2_dlc16_skv_infantry_crew` / 8 | `wh2_main_skv_art_plagueclaw_catapult` / 500 |
| Doom-Flayers | 8 | 750 | 8 | `wh2_main_skv_infantry` / 8 | `wh2_dlc12_skv_vehicle_doom_flayer` / 8 |

Source path는 `main_units_tables:7 → land_units_tables:54 → man_entity → battle_entities_tables:39`다. Engine은 `land.engine → battlefield_engines_tables:24 → battle_entity → battle_entities_tables:39`로 연결된다. Exact full join, row ID, source hash는 `selection.json:selected[].exactFacts`와 아래 original source pointer로 추적한다. Schema metadata/pack hash는 기존 연구 replay의 pin으로 검증한다.

| 대상 | committed source의 decoded pointer | 보존한 original extraction SHA256 |
| --- | --- | --- |
| Field | `expansion-batch-02/sources.json:/decoded/candidates/13/dump` | `50b70171db5cf94c6f512c7a4834a391e1c87551884df39b33548d5883192698` |
| Skull | `expansion-batch-03/sources.json:/decoded/candidates/23/dump` | `999f0d2be225f839263122a7059d2b4e567588d8c0db2838b4afacad61f2b6e0` |
| Plagueclaw | `expansion-batch-03/sources.json:/decoded/candidates/17/dump` | `7c1492187b831e22b8bc1ea8b954f888f5f6be59679220819ce193814d318232` |
| Doom | `promotion/partial-sources.json:/candidates/10/dump` | 기존 전체 source SHA와 named-field trace 보존; 새 raw source 복사 없음 |

## 예상 HealthMax / NumEntitiesInitial

표의 값은 **HP / C**다. runtime 정답이 아니며 byte-level Production에 반영하지 않는다.

| 대상 | H1 crew count + engine | H2 engine count + crew | H3 crew pool | H4 chassis pool |
| --- | ---: | ---: | ---: | ---: |
| Tier 1 Field Trebuchets | **4332 / 44** | **2532 / 4** | **2332 / 44** | **2180 / 4** |
| Tier 1 Screaming Skull | **4164 / 44** | **2244 / 4** | **2464 / 44** | **1892 / 4** |
| Tier 2 Plagueclaw | **4856 / 56** | **2620 / 4** | **2856 / 56** | **2172 / 4** |
| Tier 2 Doom-Flayers | **6128 / 8** | **6128 / 8** | **6064 / 8** | **6064 / 8** |

예: Field H1=45×44+8×44+500×4=4332, H2=45×4+8×44+500×4=2532.

### 결과별 살아남는 가설

- Field/Skull/Plagueclaw에서 한 열의 HP와 C가 모두 나오면 그 열의 **제시한 joint extension**이 남고 다른 세 개는 해당 관측과 불일치한다.
- Doom-Flayers 6128/8이면 H1·H2가 남고 H3·H4는 불일치한다. 6064/8이면 H3·H4가 남고 H1·H2는 불일치한다.
- HP와 C는 먼저 별도로 비교한다. Field가 4332/**4**라면 H1의 HP 식은 수치상 맞지만 H1의 count 가정은 틀리므로 네 **joint extension**은 모두 실패한다. 이것을 모든 HP component 식의 반증이나 H2 자동 선택으로 바꾸지 않는다.
- 표에 없는 값, 서로 다른 unit-type에서 다른 열이 살아남는 결과, 예상과 다른 count는 가설/가정의 불충분성을 남긴다. nearest matching, rounding, 새 상수 fitting, 임의 default 또는 자동 admission을 하지 않는다.
- ULTRA/DECLARED_SETUP, exact identity와 static snapshot, 충돌 없는 baseline 관측이라는 기존 전제가 만족되어야 해석할 수 있다. 조건이 다른 관측은 이 연구 예측을 검증한 결과로 취급하지 않는다. 이 문서는 probe/ingest workflow를 수정하지 않는다.

## 최소 횟수와 검증 한계

네 engine-only 확장 가설 사이의 여섯 쌍을 분리하는 최소치는 **1회**다. 실제로 non-8 engine 후보 여섯 종 모두 각자 네 값이 다르다. Tier 1의 **2회**는 E=500/425에서 재현성을 확인하는 작은 교차 검증 세트다. 남는 질문에 따라 Tier 2를 포함한 **최대 4회**를 선정했다. 필요한 관측의 개수에 대한 연구 평가이며 이번 작업에서 측정을 실행하거나 새 측정을 요청하지 않는다.

범용 규칙을 확정할 최소 횟수는 현재 101종으로 산정할 수 없다. 어떤 수의 이 catalog 표본을 더 관측해도 M=H 및 E=A를 깨는 대비가 없으므로 rider/mount attribution 및 articulation/engine coefficient는 구분되지 않는다. Engine-only artillery count(N=44/56 또는 G=4)는 같이 구분할 수 있지만 단순 보병의 N=C 규칙 전반, HP modifier/rounding/optional component, 다른 unit type의 bonus scope는 남는다. 다른 source-field HP 값/semantic 근거를 가진 표본이 **현재 자료에는 없다는 한계**이며, 후보를 새로 추가하거나 외부 숫자로 대신하지 않는다.

## 재현 및 테스트

```powershell
node tools/wh3-importer/hp-research/selection.mjs --check
node --test tests/wh3-hp-selection.test.cjs
node scripts/research-wh3-hp.mjs --check
```

`--write`는 이 폴더의 selection.json만 재생성한다. 게임/RPFM/generated 없이 committed compact source와 기존 raw HP replay로 결정적으로 재현한다. 테스트는 101 identity/byte guard, 다섯 기존 정답과 scope의 구분, census/중복 profile, 독립 계산한 네 후보의 HP/count, Tier 1 pair coverage, null/type/nonfinite/missing 거부, 결과 ambiguity 보존을 검사한다.

검증 결과:

- 전체 `npm test`: **324/324 PASS**. 신규 selection regression **7/7 PASS**.
- `npm run build`: PASS, 기존 app bundle 및 500 kB chunk 경고 동일.
- First/partial/deferred/evidence-linked/expansion-01/production-growth replay 6종 및 ULTRA HP replay: 모두 PASS.
- Stored context/runtime/CCO integration: **16/16 PASS**.
- Historical runtime replay: 5200 events / 51 captures / 316 observations, VALIDATED, 기존 evidence/comparison/proposals EXACT_EQUALITY, 원본 파일 51개 byte 불변. 후속 manual 차이가 있는 stored manifest의 `cases`/`freeCompanyMatrix`를 historical golden과 같다고 재해석하지 않음.
- 게임 설치/generated 자료 없는 별도 clean source snapshot: selection replay 및 신규 regression **7/7 PASS**.
- 기존 보호 파일 32개 검사 및 이전 연구 report replay PASS. Production/Sample/HP admission JSON은 byte SHA 그대로이며 기존 tracked 파일 diff 없음. 작업 checkout의 HP policy.mjs exact byte SHA256도 `ce13f0ec90cc3e13003515ed7446d2f6927f3cd7341493a179562d46e22ef37a`로 보존.

변경 범위는 이 문서, selection.json, research-only selection.mjs, regression test다. 기존 연구 파일·Production·HP policy·speed/missile/entity semantic architecture·UI·runtime evidence는 변경하지 않는다.
