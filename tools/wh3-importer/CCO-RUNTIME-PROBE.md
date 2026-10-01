# P0 battle CCO probe

This adds read-only runtime collection to the existing runtime-evidence pipeline. It does not change normalization, CA field provenance, production eligibility, Unit JSON, faction registration or UI. The normalizer still withholds unresolved composite presentation values. No diagnostic DB pack is generated.

`runtime-evidence/cco-probe/exec_battle.lua` is the canonical external-file script. Each field is queried inside `pcall`; VALUE, NULL, UNSUPPORTED, UNSERIALIZABLE and INVALID_NUMBER are distinct. Component rows are emitted separately with `WH3_RUNTIME_PROBE|` JSON lines. Raw log events, comparisons and validated evidence are separate files.

## 집에서 실행할 순서

게임 실행 **전**, 저장소 루트 PowerShell에서:

```powershell
./tools/wh3-importer/runtime-evidence/cco-probe/install.ps1 -BundleDirectory ./generated/wh3/runtime-evidence/cco-p0-9.0.2 -UnitSize MEDIUM
```

게임 경로는 기존 ignored importer config에서 읽는다. 없으면 `-GamePath '실제 게임 폴더'`를 붙인다. 기본 설치 위치는 게임의 `exec/exec_battle.lua`이다. 다른 working directory를 쓰는 mod manager에서는 `-ExecDirectory '실제 실행 기준 폴더/exec'`로 지정한다. 기존 외부 Lua 파일이나 root 파일이 probe를 가리는 경우 helper가 중단하며 그 파일은 보존한다. 기존 파일을 자동 덮어쓰지 않는다.

Helper는 실행 파일의 ProductVersion과 static snapshot 버전을 비교한다. 새 session ID를 만들고 Unit Size **선언값**을 넣는다. 게임의 실제 Unit Size는 별도로 동일하게 설정해야 한다. 필요할 때 release script logging을 위해 `data/script/enable_console_logging` 빈 marker를 만든다. 기존 marker는 그대로 보존한다. 게임 자체를 실행하지 않는다. 이 marker 동작과 log 위치는 [CA scripting output 문서](https://chadvandy.github.io/tw_modding_resources/WH3/index.html)에 따른다.

1. Launcher에서 **Execute External Lua File(Modding Tool)**을 켜고 WH3를 실행한다. 다른 활성 mod도 기록한다. 설치된 mod가 많다는 사실과 이번 battle에서 활성화됐다는 사실은 구별한다.
2. Unit Size **Medium**으로 설정한다. Custom Battle에서 Black Coach, Skeleton Chariots, Dread Saurian, Necrofex Colossus를 각 해당 진영에서 선택한다. unavailable이면 다른 동명 variant를 대신 골랐다고 가정하지 말고 결과를 보류한다.
3. 공격받기 전 대상 유닛 하나를 선택하고 **F9**를 누른다. 논리 count, initial count, health와 네 component list가 자동 기록된다.
4. 카메라를 가까이 옮겨 horse/body/crew/rider 등 각 보이는 부분에 마우스를 올린 채 **F9**를 누른다. DB key나 component 종류를 직접 판정할 필요가 없다. 커서가 지면/UI를 가리키면 INCONCLUSIVE로 남는다.
5. Dread Saurian/Necrofex는 적에게 사격 명령을 내리고 전투를 재생한 상태에서 **F10**, 약 5초 대기. 필요하면 다시 누른다. F9/F10 재실행은 이 probe의 timer/listener만 교체한다.
6. 게임 binaries/실행 working directory의 script log를 보존한다. 파일 이름은 환경마다 다를 수 있다. `WH3_RUNTIME_PROBE|`가 들어 있는 log가 입력이다. prefix가 전혀 없으면 관찰 완료로 취급하지 않는다. 로그를 압축하거나 문자열을 편집하지 않아도 된다.
7. **Ultra**로도 반복한다. helper를 `-UnitSize ULTRA`로 다시 실행한 뒤 실제 게임 설정도 Ultra로 변경한다. 각 설정은 독립 session으로 남으며 변환 공식을 만들지 않는다.

[모드 작성자 안내](https://steamcommunity.com/sharedfiles/filedetails/?id=2791573994)의 F9는 `View camera bookmark 1`이다. F10은 bookmark 2에 해당한다. 설치된 `pj_loadfile.pack`의 battle script는 F9 (`camera_bookmark_view0`)만 처리한다. 이 probe의 첫 F9가 `camera_bookmark_view1`에 고유 battle F10 listener를 등록한다. campaign의 `exec2.lua`를 battle entrypoint로 오인하지 않는다. Lua 파일을 편집할 필요 없다.

로그를 가져온 뒤:

```powershell
node tools/wh3-importer/runtime-evidence/cco-probe/cli.mjs ingest --bundle-dir generated/wh3/runtime-evidence/cco-p0-9.0.2 --logs 'C:/path/medium_script_log.txt|C:/path/ultra_script_log.txt'
```

출력 directory에는 raw-probe-events, comparison-report(JSON/Markdown), runtime-evidence, validated-evidence, resolution-proposals, capture-triage가 생긴다. `runtime-evidence.json`은 기존 `runtime-evidence/cli.mjs ingest --bundle-dir ... --evidence ...`에서도 읽힌다. 기존 manual recorder/jobs와 unresolved-triage를 그대로 유지하며 CCO capture triage를 별도로 추가한다.

제거:

```powershell
./tools/wh3-importer/runtime-evidence/cco-probe/install.ps1 -Action Uninstall
```

현재 battle을 나가면 in-memory listener도 사라진다. helper는 unchanged probe-owned 파일과 자신이 만든 unchanged 빈 logging marker만 제거한다. 다른 작업 파일은 삭제하지 않는다. `-ExecDirectory`로 설치했다면 제거할 때도 같은 인자를 쓴다.

## Runtime fields

Unit: `UnitRecordContext.Key`, `UnitRecordContext.UnitLandRecordContext.Key`, `UniqueUiId`, `NumEntities`, `NumEntitiesInitial`, `HealthValue`, `HealthMax`, `PrimaryAmmoPercent`, `SecondaryAmmoPercent`, `IsFiringMissiles`, `ActiveProjectileContext.Key`, `ReloadPercentMax`; selection safety에는 `IsPlayerUnit`, 추가 상태에는 `IsInMelee`를 수집한다.

Lists: `ManList`, `MountList`, `EngineList`, `EntityList`의 `.Size`와 `.At(index)`를 조회한다. list마다 최대 512개; 초과 시 incomplete로 보존한다. 각 entity는 `Key`, `EntityRecordContext.Key`, `IsMan`, `IsEngine`, `IsAlive`, `IsReloading`, `ReloadPercent`, `ReloadRemainingTime`, `UnitContext.UniqueUiId`; snapshot/cursor에는 `Position`도 수집한다. 커서는 `CcoBattleCursorContext.EntityContext`와 unit main/land identity를 조회한다. [CA CCO symbols](https://chadvandy.github.io/tw_modding_resources/WH3/cco/documentation.html)를 기준으로 구현했다.

F10은 선택된 unit context를 고정한다. 100ms real callback을 최대 50번 등록하며 최초 sample을 포함해 정상 종료는 51 samples이다. timer 지연이 있으면 정확히 5초라고 단정하지 않는다. sample timestamp는 battle model time이며 pause/배속 시 real timer와 다를 수 있다. timestamp 접근 실패도 개별 cell로 보존한다. 동일 unit/entity state는 baseline+unchanged/change log로 압축한다. 종료/교체/오류 사유를 남긴다. 고유 named callback 취소와 generation guard를 함께 사용한다. [CA battle manager timer API](https://chadvandy.github.io/tw_modding_resources/WH3/battle/battle_manager.html)를 재사용한다. Installer session에 per-Lua-VM anchor/사용 가능한 clock token을 붙여 여러 battle의 counter reset을 구별한다. 이는 로그 namespace이며 CA identity나 gameplay time 근거가 아니다. RNG를 사용하지 않는다.

## Static candidate graph

기존 검증된 runtime static index의 entity/missile sidecar를 lossless하게 복사한다. 같은 entity/weapon key라도 attachment/path ID를 병합하지 않는다. live CA 보충 조사는 **P0 네 main key**에서만 main→land, land→extra-engine junction→engine→entity/weapon→projectiles 및 articulated record의 실제 entity FK를 bounded traversal한다. 추가 main을 발견하거나 whole importer를 실행하지 않는다. schema FK/edge가 없는 string 일치로 관계를 복원하지 않는다.

Manifest views: ManEntityContext, MountRecordContext(원본 owner/연결 entity 포함), EngineRecordContext, ExtraEnginesList 전체, ArticulatedRecordContext, attachments, primary/engine missile sources, 전체 weapon/projectile paths, Precursor, UseSecondaryAmmoPool, PrimaryAmmo/SecondaryAmmo. 원본 row, schema edges, stats owner, flags와 provenance가 subject/extraEvidence에 남는다. CCO record view와 DB origin은 동일 provenance로 합치지 않는다.

9.0.1.0 역사적 snapshot의 아래 구조는 9.0.2.0에서 재추출·비교해 동일함을 확인했다. 현재 bundle은 `cco-p0-9.0.2`이며 fingerprint와 검증 결과는 [9.0.2 refresh](SNAPSHOT-9.0.2.md)에 기록했다. 기존 `cco-p0-v2`는 보존하며 새 게임에 설치하지 않는다.

| Subject | Entity paths | Missile paths | Extra-engine rows |
| --- | ---: | ---: | ---: |
| Black Coach | 5 | 0 | 0 |
| Skeleton Chariots | 6 | 0 | 0 |
| Dread Saurian | 14 | 12 | 0 |
| Necrofex Colossus | 7 | 6 | 0 |

32 entity paths, 18 missile paths, incomplete DB chain 0. Dread retains two blowpipe and ten javelin attachment paths; Necrofex retains cannon and five rifle paths. Attachment/path counts are not model/shot multipliers. Black Coach/Skeleton Chariots have no missile candidate in this bounded snapshot; missing/unsupported runtime fields still do not become proof of absence.

재생성:

```powershell
node tools/wh3-importer/runtime-evidence/cco-probe/cli.mjs prepare --bundle-dir generated/wh3/runtime-evidence/evening-9.0.2 --out generated/wh3/runtime-evidence/cco-p0-9.0.2-new
```

Ignored generated bundles are local diagnostic artifacts. A fresh checkout first needs the existing CA extraction/materialization/runtime preparation workflow and local RPFM/game packs described in RUNTIME-EVIDENCE.md. The new code contains no hidden local module dependencies.

## Comparison and admission boundary

An exact runtime main+land pair, configured context, version and static snapshot must agree; disagreement or missing identity remains IDENTITY_PENDING, without candidate selection by display name. Installed executable version is recorded by the helper; it is **not** a live CCO game-version or loaded-pack attestation. Unit Size/setup declared by helper is likewise not a CCO-observed setting. Modified runtime records retaining identical keys cannot be proven vanilla by this probe. These limits block automatic semantic/production admission.

Component candidate status is record-key existence: OBSERVED_RUNTIME / NOT_OBSERVED / INCONCLUSIVE / CONFLICTING_RUNTIME_EVIDENCE / IDENTITY_PENDING. The report separately retains observed lists, list/index rows, repeated-key candidate paths and unresolved placement. The same record in a MAN and MOUNT/attachment path does not prove both placements. Cursor intersection does not prove independent targeting. Runtime list indices are not persistent entity identities across casualty/reordering.

Projectile context matching lists every compatible candidate path. It never declares a weapon ACTIVE just because its projectile key was seen. Multiple observed projectile keys over time prove context changes, not replacement/precedence or simultaneous firing. Reload state and individual pool decreases are observed directly; raw UseSecondaryAmmoPool flags are compared without causal weapon attribution, aggregation or ammo sharing assumptions.

Broken/partial logs retain errors and cannot establish negative coverage. Identical replayed event IDs collapse idempotently with all references retained; conflicting payloads are preserved and the capture is blocked. Existing evidence validation also checks same-setup contradictory observations and keeps all alternatives without choosing a winner. Medium/Ultra stay separate. CCO-specific observation types preserve logical counts/runtime health rather than writing CARD_MODEL_COUNT/CARD_HEALTH. Runtime provenance is RUNTIME_CCO, separate from DIRECT/GENERATED/CURATED.

No runtime observation changes static provenance or normalized Unit. No production eligibility is enabled. Existing omission/triage/admission policies remain unchanged. Full import remains prohibited.

## Phase 2 boundary

First collect the CCO observations. Component HP contribution, independent casualty/targetability and exact same-projectile weapon-source attribution can still be unresolved after CCO; no diagnostic pack is claimed necessary before those results exist. Generated jobs contain a deferred test plan only: one candidate intervention per test, unique `zz_runtime_probe_*` clones, repoint only the candidate edge, explicit HP delta or range/reload/projectile fingerprint, identical baseline setup and disable/remove-pack rollback. No vanilla shared records are modified and no pack is built.

## Verification

Offline tests execute the canonical Lua with a Fengari mock CCO/battle-manager (Lua 5.3 implementation, source uses Lua 5.1-compatible syntax). This validates pcall failures, cursor, list/path preservation, timer cancellation, changes and hot reload; it does **not** certify the installed game's bindings. Node tests cover graph construction, parser partial/malformed inputs, repeated ingestion, conflicts, identity/version drift, raw-count semantics and production/static non-mutation. Saved CA integration replays the P0 manifest alongside previous pilot/materialization/entity/missile/runtime regressions. Actual field availability, hotkeys/log delivery and collected gameplay values still require the first in-game run.

Verified for this change: basic tests 210/210 (including 21 CCO tests), saved CA regressions 41/41 (including two P0 graph tests), actual CA integration 5/5, build and runtime contract TypeScript check PASS. Helper install/update/uninstall and refusal of an unowned Lua file were checked in a temporary workspace path with game-directory logging writes disabled. Existing five user changes retain their SHA256 values. Production/UI diff is empty. Name pilot stays 1/14/9; 19 context results stay MATERIALIZED/PARTIAL with zero diagnostic validation failures and unchanged Unit field provenance. Actual runtime observations: zero; jobs are PENDING.
