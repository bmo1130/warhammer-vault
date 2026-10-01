# Runtime evidence and evening recording workflow

This pipeline prepares observations; it does not run WH3 or import production Units. `productionEligible` remains false. UI, `units.json`, factions and CA field provenance are unchanged.

## Contract and trust boundary

`runtime-evidence/contract.mjs` and `contract.d.mts` define `warhammer-vault-runtime-evidence-v1`. `validate.mjs` provides bounded JSON loading, validation, conflict detection and scoped resolution proposals. `static-index.mjs` replays saved entity/missile contracts against their schema evidence and traces, re-evaluates curated catalog decisions, and requires a common game/schema/named-pack fingerprint before preparing the index.

Static evidence contains exact main/land identities, curated contexts, CA rows, localisation and sidecars. Runtime evidence has separate `RUNTIME_MANUAL` provenance, observer/time/references, actual setup and observations. No runtime function calls a Unit writer or changes static provenance. An index digest detects accidental changes; it is not a cryptographic signature proving an untrusted artifact genuine. Prepare only from trusted reviewed artifacts.

Every observation includes exact `sourceMainKey`, `sourceLandKey`, `contextId` (explicit null only for a preserved pilot diagnostic source), `catalogEntryId`, actual `gameVersion`, static snapshot ID, scenario/trial IDs, Unit Size, setup, sample point, subject/component label and typed result. The catalog ID and CA main key are different identities. A display name cannot connect evidence. The prepared index includes 19 reviewed contexts and 8 diagnostic comparison sources; null is not a new roster context or production identity.

**Expected identity is not observed identity.** Jobs prefill the source being investigated. Card name/faction alone do not prove the live main key, or which DB weapon path is active. Record these observations as `CONTEXT_ONLY`; validation preserves them as `VALIDATED_IDENTITY_PENDING`. Mark `EXACT_SOURCE_OBSERVED` only with a trustworthy reference exposing that identity. No known repo console/mod command supplies it. Availability and name collisions must not be settled by inventing a command or guessing the key. Component/weapon observations likewise distinguish `COMPONENT_ROLE_ONLY` from `EXACT_PATH_OBSERVED`. Static path IDs are candidate anchors, not activation proof.

## Observation taxonomy

| Domain | Types |
| --- | --- |
| Entity | CARD_MODEL_COUNT, CARD_HEALTH, VISIBLE_COMPONENT_COUNT, TARGETABLE_COMPONENT, COMPONENT_CASUALTY, COMPONENT_DEATH, COMPONENT_WEAPON_DISABLE, UNIT_SIZE_COMPARISON |
| Missile | PROJECTILE_PROFILE_ACTIVE, WEAPON_PATH_ACTIVE, WEAPON_REPLACEMENT, WEAPON_COEXISTENCE, OVERRIDE_PRECEDENCE, AMMO_POOL_CONSUMPTION, AMMO_POOL_SHARING, FIRE_IN_MELEE, RIDER_LOSS_WEAPON_DISABLE |
| Availability | RECRUITMENT_AVAILABLE, SUMMONED_MAIN_IDENTITY, SUMMONED_DURATION, SUPPLY_VARIANT_AVAILABILITY, ARKHAN_VARIANT_AVAILABILITY, NONSTANDARD_SCENARIO_AVAILABILITY |

Results are typed numbers with units, states, descriptions, relationships, raw before/after ammo counters, or separate setting values. `INCONCLUSIVE` is valid. Confidence is `OBSERVED_ONCE`, `REPEATED`, `CROSS_SETTING_CONFIRMED` or `INCONCLUSIVE`. Count is an integer; HP/duration/ammo must be finite and nonnegative (bounded at 1e9). No derived formula payload is accepted.

Setup records battle mode, faction, lord, unit rank, skill/ritual/effect/technology/building states, summoned/Supply status, difficulty, mods, save reference and session phase. Unknown is explicitly `NOT_RECORDED`/`UNKNOWN`, not absent. Human condition names stay labels; they are never parsed into CA keys. Exact effect keys must exist in the reviewed static set. An effect observed on a Supply unit may be recorded even when that source has no weapon junction: its weapon paths remain those of the exact Supply main only.

## Validation, contradictions and proposals

Loader accepts canonical JSON and a filled recording template. Templates use PENDING / RECORDED / INCONCLUSIVE job status; pending jobs produce no evidence. Validation rejects unknown identities/types/settings, game/snapshot/land/catalog drift, missing setup, invalid numeric values, duplicate IDs and foreign entity/missile path IDs. Malformed JSON/oversized files reject; a batch with any invalid record produces no resolution proposals. Rejected/manual records remain in their original file; nothing modifies static data.

Conflict scope is exact snapshot + source/context/catalog + observation type + Unit Size + setup + sample point + subject label + sorted referenced path sets. Condition and mod order is irrelevant. Trial/scenario names, timestamps, confidence and repetition counts do not select a winner. Different independent battles with the same complete setup can conflict. Unknown setups can produce a provisional conflict requiring clarification; they cannot confirm a resolution. Notes are retained but do not hide numeric/state contradictions. Pre-loss and post-loss require distinct sample points; label separate components consistently. Medium and Ultra remain separate scopes.

`CONFLICTING_RUNTIME_EVIDENCE` retains every value and has `NO_AUTOMATIC_WINNER`. A single observation, claimed `repetitions: 10`, newest value or majority never creates a global rule. Proposals require at least two independent trial IDs, exact runtime identity, recorded references/time/observer, known relevant setup, no mods, and matching exact entity/weapon path binding for component/missile observations. Card/availability observations do not require a component path. Repeated card count/HP produces `RUNTIME_CONFIRMED_PER_SETTING`; other repeated observations produce `REPEATED_SCOPED_OBSERVATION`. All proposals require human review, remain scoped to the exact setup, and carry `formula: null` and `productionEligible: false`. Replacement observations do not create a global precedence formula. Per-setting confirmation does not establish a Unit Size scaling formula.

## 집에 가서 할 일

준비된 bundle: `generated/wh3/runtime-evidence/evening-final-v2/`. 실측값은 0건이며 모든 jobs는 PENDING입니다. game version 기준은 **9.0.1.0**입니다. 실제 게임이 업데이트됐다면 기존 기준과 다르다고 기록하고 ingestion을 중단합니다. static snapshot을 다시 검토해야 합니다.

1. WH3를 실행하고 실제 version, mods, Unit Size를 확인합니다. 첫 관찰은 Medium입니다. 가능하면 mods를 끄고, 조건을 모르면 UNKNOWN으로 기록합니다.
2. Custom Battle에서 아래 faction/unit을 찾습니다. 선택 목록에 없으면 같은 이름의 다른 source를 대신 고르지 말고 manual campaign setup으로 보류합니다. faction 이름은 diagnostic registry ID이며 실제 번역 이름과 다를 수 있습니다.
3. 피해 없는 전투 시작 직후 카드 count/HP 및 설정 화면 screenshot을 저장합니다. 본체와 승무원/말을 확대해 visible count를 별도로 관찰합니다. raw count를 카드 수 대신 적지 않습니다.
4. 동일한 lord/rank/조건으로 새 battle에서 반복합니다. 독립 trial ID와 screenshot을 남깁니다. 손실 후 관찰은 `POST_LOSS` 등 다른 sample point로 구별합니다. 독립 targetability를 확인 못하면 INCONCLUSIVE입니다.
5. Ultra로 바꾼 뒤 **새 battle**에서 같은 작업을 반복합니다. Medium의 관찰을 덮어쓰지 않습니다. 필요하면 difficulty/lord/rank 차이도 기록합니다.
6. 아래 recorder를 실행하면 job 번호, 설정, 관찰값과 reference를 차례로 묻습니다. 카드를 보고도 exact main key를 확인할 수 없으면 key reference 질문은 비워 둡니다. 이 경우 기록은 보존되고 resolution은 보류됩니다. 콘솔 명령어가 필요하지 않습니다.

```powershell
Set-Location C:\codex\totalwar
node tools/wh3-importer/runtime-evidence/record.mjs --bundle-dir generated/wh3/runtime-evidence/evening-final-v2
```

번호를 선택하고 숫자만 입력해도 기록할 수 있습니다. 모르면 빈칸으로 INCONCLUSIVE를 남깁니다. 다른 component, 손실 후 또는 독립 repetition은 같은 job을 다시 고르고 subject/sample point/trial을 구별합니다. snapshot의 path를 실제로 보여주는 도구가 있는 경우에만 exact path 질문에 y를 답합니다. Recorder는 답변마다 새 `recording-<session>-<count>.json`을 저장합니다. 마지막 파일에 그 session의 모든 관찰이 있습니다. 예전 파일은 덮어쓰지 않습니다.

### 오늘의 순서와 최소 절차

| Priority | Jobs | 실제 최소 절차와 관찰 |
| --- | ---: | --- |
| P0 | 8 | Skeleton Chariots (tomb_kings) → Black Coach (vampire_counts) → Necrofex (vampire_coast) → Dread Saurian (lizardmen). 각각 Medium/Ultra 새 battle의 카드 count/HP와 visible components. |
| P1 | 16 | Free Company 4상태 → Steam Tank → Handgunners → Helstorm. 뒤의 세 유닛은 ordinary/Supply 각각 base/effect 비교. 실제 조건을 만든 campaign/save가 필요할 수 있습니다. |
| P2 | 2 | Dread/Necrofex rider 발사, ammo counter, melee, 손실 전후 발사. 독립 rider loss를 못 관찰하면 해당 항목만 보류합니다. |
| P3 | 9 | 소환 3종, Supply 3종, Arkhan 2종, nonstandard Flamers. 확보한 campaign/scenario에서 availability/key/duration을 기록합니다. 오늘 다 하지 않아도 됩니다. |

P0 세부 관찰:

- Skeleton Chariots: 전차/말/승무원 visible 수와 casualty/HP bar. raw 24/2/12에 직접 대응한다고 가정하지 않습니다.
- Black Coach: horse/coach/crew와 articulated 부분 targetability, loss와 HP bar. 카드 count에 component를 합산하지 않습니다.
- Necrofex: visible riders, loss/casualty와 rifle firing, main cannon 유지, HP bar 변화. raw man 5/mount 1은 별도 static facts입니다.
- Dread Saurian: visible riders와 blowpipe/javelin 발사 위치, targetability/loss, 본체 HP bar. 12 attachments는 실제 rider/발사 수의 증명이 아닙니다.

P1은 캠페인 조건 준비가 되지 않으면 PENDING입니다. 알려진 DB skill/effect/bundle은 manifest의 `expectedStaticEvidence`에 있으며, **DB 연결은 unlock 절차나 실제 활성의 증명이 아닙니다**.

- Free Company: no effect / Volkmar skill only / Gunnery School only / both. static skill `wh2_dlc17_skill_emp_volkmar_unique_mere_mortal_men`, bundle `wh3_dlc25_ritual_emp_don_inf_guns_3`. 실제 lord/skill/ritual 상태를 확인한 save를 사용합니다. both를 만들 수 없으면 제한을 남깁니다. 같은 거리/대상에서 projectile, 발사 위치, replacement/coexistence, ammo, battle/turn/session transition을 비교합니다.
- Steam Tank: cannon, steam gun, engineer pistol, exploding profile을 별도로 관찰합니다. condition은 `wh3_dlc25_effect_ritual_gunnery_school_steam_tank_exploding_cannon_balls`의 static link입니다. ordinary/Supply를 구별하고 visible counters만 기록합니다.
- Handgunners: ordinary/Supply base 및 Gunnery School exploding-bullets effect 상태를 비교합니다. 실제 projectile과 firing behavior가 바뀌는지 기록합니다.
- Helstorm: ordinary/Supply base 및 `wh3_dlc25_effect_ritual_gunnery_school_helstorm_rocket_split` 상태를 비교합니다. split/explosion, replacement/coexistence, ammo 및 시작 전/후 변화를 기록합니다. trigger를 만들 수 없으면 MANUAL_SETUP_REQUIRED입니다.

P2: Dread의 blowpipe/javelin, Necrofex의 cannon/rifle이 같은 시점에 발사하는지 관찰합니다. 보여지는 ammo counter별 before/after를 그대로 남깁니다. rider 손실 전후에도 사거리/시야/명령/탄약 조건이 같은지 확인합니다. attachment 수·발사 수·pool flag를 곱하거나 합산하지 않습니다.

P3: summoned Bloodthirster/Crypt Horrors/Zombies의 실제 key 확인 가능 여부, duration과 despawn 조건; Supply 획득 경로와 ordinary 구분; Arkhan Crypt Horrors/Hexwraiths 모집; Flamers의 실제 nonstandard scenario를 별도로 기록합니다. exact key를 표시하는 신뢰 가능한 수단이 없으면 카드/획득 화면만 보존하고 key confirmation은 보류합니다. Arkhan 항목을 catalog에 표시할지는 runtime existence와 별개의 product policy입니다.

### JSON 직접 입력 / ingestion

`recording-template.json`을 복사해 job을 RECORDED로 바꾸고 관찰을 입력해도 됩니다. 모르는 fields는 INCONCLUSIVE/UNKNOWN입니다. `runtime-evidence.json`은 빈 canonical envelope입니다. Typed payload 예:

```json
{"result":"CONCLUSIVE","value":12,"unit":"models"}
```

이 숫자는 **형식 예시이며 실제 WH3 관찰값이 아닙니다**. 이 payload만으로 evidence가 되지는 않습니다. 전체 source/setup/reference/trial은 template에 있습니다. Path references는 `entityPathIds` / `missilePathIds`에 exact sidecar ID로 넣습니다; bare weapon 이름을 추측해 쓰지 않습니다.

기록 후 recorder가 출력한 마지막 파일을 다음처럼 검증합니다 (파일 경로를 실제 것으로 대체):

```powershell
node tools/wh3-importer/runtime-evidence/cli.mjs ingest --bundle-dir generated/wh3/runtime-evidence/evening-final-v2 --evidence "<마지막 recording JSON의 경로>"
```

여러 session/trial을 함께 검증하려면 다음 명령으로 합집합에서 충돌을 검사합니다. 각 session의 **마지막 누적 파일만** 입력합니다. 중복 ID는 거절되며 관찰을 자동 삭제하지 않습니다. 한 session씩 검사한 결과는 서로 모순이 없다는 증거가 아닙니다.

```powershell
node tools/wh3-importer/runtime-evidence/cli.mjs ingest --bundle-dir generated/wh3/runtime-evidence/evening-final-v2 --inputs "<session1 마지막 파일>|<session2 마지막 파일>"
```

## Preparing another trusted bundle

CLI `prepare` requires explicit completed run directories; it does not find a latest run heuristically or access the game. The saved entity/missile review and context/pilot paths must refer to the same game/schema/pack snapshot. It replays those proofs and emits `static-index.json`, `runtime-jobs.json`, `recording-template.json`, empty `runtime-evidence.json`, triage JSON/Markdown, admission gates and a preparation manifest. Outputs use ignored `generated/wh3/runtime-evidence/` and exclusive file creation. The documents/code are committed; machine-specific CA artifacts and actual future observations stay local.

## Triage and admission draft

Triage counts **events**, with explicit channels: every normalized omission, unmapped ID, non-info exception, omitted/unmapped/failed field coverage in 24 name + 19 context + 25 entity + 24 missile diagnostic results, plus inspected sidecar runtime facets. Channels overlap by design; they are not counts of unique bugs. A field unattempted because name identity is blocked inherits that POLICY dependency, rather than fabricating separate field failures.

Buckets are RUNTIME_REQUIRED, STATIC_DB_FOLLOWUP, POLICY_REQUIRED, MAPPING_REQUIRED, OUT_OF_SCOPE and BLOCKED_UNKNOWN. Every event preserves its artifact/source/category/field/reason/evidence and next action. Triage classification does **not** resolve an omission. Unknown abilities/attributes retain exact CA ID, available localisation, active/passive evidence and an internal ID of null. Localisation does not prove gameplay semantics. Empty enum sentinels need policy; other raw enums remain review backlog. No production mappings/aliases are added.

`admission-gates.json` is a DRAFT_NOT_APPROVED proposal, not an admission implementation. Identity/snapshot/validation/required faction/graph completeness and mandatory semantics or explicit withholding policy are distinct conditions. Optional tags/notes need not force zero omissions. A simple single MAN source may not need composite runtime evidence; a rider/articulated or conditional missile source needs scoped confirmation or an approved withholding policy. Runtime proposal review and normalized-field admission are separate future steps. None exists automatically here.

Full import remains forbidden: whole-catalog exact-context coverage, production faction readiness, complete required graphs, approved complex presentation/runtime policy and production validator/admission readiness are not established by 19 bounded diagnostics.

## Prepared snapshot results (2026-10-01)

All 35 jobs and 182 recording slots are pending; **0 actual runtime observations**. Static index: 27 exact source/context subjects, including 19 catalog presentations. The current schema, db.pack and local_en.pack fingerprint is `aed0652f3c20ddbef26ec99511823ba44ba5c097519bb47f13081281450df2b5`.

| Triage bucket | Events | Examples / next action |
| --- | ---: | --- |
| RUNTIME_REQUIRED | 3293 | Count/HP/Unit Size, component loss, missile activation/ammo/display; scoped observation jobs |
| STATIC_DB_FOLLOWUP | 1151 | Description localisation, absent positive attribute evidence, missing joins/trace scope; bounded followup |
| POLICY_REQUIRED | 1164 | Name-only identity blocks and dependent unattempted fields, terrain/cap interpretation, empty enum sentinel |
| MAPPING_REQUIRED | 734 | Known ability/attribute IDs and raw enum review; no bulk production aliases |
| OUT_OF_SCOPE | 107 | Optional tags/notes/source groups or unsupported presentation fields |
| BLOCKED_UNKNOWN | 0 | No currently unclassified events in this bounded report; this does not resolve any omission |

Total 6449 overlapping events, not unique blockers. Exact-ID backlog has 25 abilities and 12 attributes, all with available localisation. Gameplay semantics are not inferred from those labels. Enum backlog includes empty melee splash size (sentinel policy) and raw `very_small` penetration target size (mapping/schema review). No internal mapping is injected.

| Existing diagnostic metric | Before | After preparation |
| --- | --- | --- |
| Name pilot CLEAN / PARTIAL / BLOCKED | 1 / 14 / 9 | 1 / 14 / 9 |
| Context MATERIALIZED / PARTIAL / BLOCKED | 19 / 19 / 0 | 19 / 19 / 0 |
| Context validation failures | 0 | 0 |
| Context structural / semantics / omitted field events | 79 / 284 / 658 | 79 / 284 / 658 |
| Context DIRECT / GENERATED / CURATED | 497 / 19 / 80 | 497 / 19 / 80 |
| Name pilot DIRECT / GENERATED / CURATED | 374 / 15 / 52 | 374 / 15 / 52 |
| Production eligible | 0 | 0 |

Preparation reads/replays preserved runs rather than rerunning the 24/19 importer modes; no normalized Unit values or omissions change. Saved CA regressions and installed CA integration separately check the existing pipeline. Entity evidence is inspected for 25 subjects, missile evidence for 27; Free Company and Ratling comparison subjects have no new entity inspection here. The draft marks missing entity review as NOT ready, rather than interpreting it as a broken graph or silently complete.
