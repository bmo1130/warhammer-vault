# Canonical campaign stats through parent details

기준 `b61c19a6ec352b4d8fe2cb377b45d7d619f1e305`. Multi-rank **UNKNOWN**, admission 0.
기존 stat-fix / stat-items 도구와 모든 historical source/artifact는 수정하지 않았다.
성공한 parent scalar 경로를 사용하는 별도 최소 확장을 기존 collector에 삽입한다.

## 실제 1150 근거

원본 `C:\Users\lsh12\OneDrive\Desktop\script_log_051026_1150.txt`, 336,250 bytes,
SHA256 `cff2b578c290745b238721b4ba5823faf04259ac78a4eec232b4b9ea9c6852fd`.
유일한 capture는 3004행이며 원문은 `runtime-1150-original.jsonl`에 줄 끝까지 보존했다.

두 Unit의 details context 및 main/land/instance identity가 일치한다. 각 목록은 size 7이다.
14개 item context의 `.At(i)`는 NULL/luaType=nil이며, 모든 parent scalar Key/Value는 VALUE다.
요청 key는 목록에 실제 존재한다. 이 bounded capture에서는 key 불일치가 실패 원인이 아니다.
context handle materialization과 parent scalar evaluation의 결과가 다르다. 엔진 내부 원인은 추론하지 않는다.

| 실제 observed Key | Men-at-Arms | Foot Squires |
|---|---:|---:|
|stat_armour|30|70|
|stat_morale|52|72|
|scalar_speed|30|28|
|stat_melee_attack|22|28|
|stat_melee_defence|40|26|
|stat_weapon_damage|25|35|
|stat_charge_bonus|6|18|

이는 실제 parent-path 관찰값이다. 이전 capture의 UNAVAILABLE을 CAPTURED로 소급 변경하지 않는다.
새 canonical probe의 실게임 첫 capture는 아직 **NOT_OBSERVED**다. 수치를 새 capture에 대입하지 않는다.

## 최소 canonical 추출

기존 diagnostic collector가 기록하는 각 row의 `viaDetails.Key` / `viaDetails.Value`를 재사용한다.
모든 row의 실제 Key가 유효하고 유일한지 확인한 뒤, 네 요청 key를 **exact-match**한다.
index는 실제 Value query와 Key query의 위치 provenance로만 저장한다. stat 의미나 순서를 하드코딩하지 않는다.
목록 크기는 관찰된 size를 사용하고 0..128의 기존 범위로 제한한다. 7을 collector에 하드코딩하지 않는다.
중복(요청/비요청 key 모두), 누락 요청 key, NULL/UNSUPPORTED/잘못된 타입/nonfinite 값은 fail closed다.
실제 VALUE 0은 유지하고, unknown을 0으로 채우지 않는다. tooltip/base/display/alias fallback은 없다.

`units.rows[].stats`는 canonical Key/Value/index/keyQuery/query/source를 기록한다.
`statExtraction.status`와 기존 `statStatus`는 모두 COMPLETE여야 한다.
이전 direct-key 결과는 `directLookup`으로 이동하여 그대로 보존한다.
기존 statItems(At handle/Key/Value/viaDetails), statScan, detailsAccess, owner/rank/roster/제어값도 보존한다.
At context가 NULL이라서 `statItems.status=PARTIAL`인 것은 diagnostic 상태다. canonical gate는 parent 경로만 검사한다.
root marker는 `statExtractionRevision=campaign-parent-details-stats-v1`이다.

새 validator는 모든 parent row Key/Value, 중복, 순서(index)와 정확한 query를 검사하고,
canonical stats가 실제 source row와 완전히 일치하는지 확인한다. 기존 identity/rank/controls/resolver를 재사용한다.
observation provenance는 실제 `.StatList.At(observedIndex).Value`와 `.Key`, rowIndex 및 extraction revision이다.
다른 stat 키를 같은 index라는 이유로 받아들이지 않는다.

## 첫 0/0: F9 한 번만

준비된 bundle: `C:\codex\totalwar\generated\wh3\skill-rank-parent-stats-01\bundle` (ULTRA).
이번 작업에서 실제 게임 파일을 자동 변경하지 않았다. 기존 installer/backup을 재사용한다.
게임 종료 상태에서 기존 소유 probe를 제거한 뒤 새 bundle을 설치한다.

```powershell
$rankTool = 'C:\codex\totalwar\tools\wh3-importer\skill-rank-runtime-resolution'
$parentTool = 'C:\codex\totalwar\tools\wh3-importer\skill-rank-runtime-parent-stats'
$rankGame = 'C:\Program Files (x86)\Steam\steamapps\common\Total War WARHAMMER III'
$parentBundle = 'C:\codex\totalwar\generated\wh3\skill-rank-parent-stats-01\bundle'
powershell -NoProfile -ExecutionPolicy Bypass -File "$rankTool\install.ps1" -GamePath "$rankGame" -Bundle "$parentBundle" -Uninstall
powershell -NoProfile -ExecutionPolicy Bypass -File "$rankTool\install.ps1" -GamePath "$rankGame" -Bundle "$parentBundle" -BackupExistingCampaignScript
```

같은 0/0 baseline save를 불러오고 같은 Lord/army/Unit/XP/research/ancillary/traits/mods/difficulty/turn을 유지한다.
Skill/stance 선택창을 닫고 campaign map에서 지정 Lord를 선택한 후 **F9 한 번만** 실행한다.
Skill point는 아직 쓰지 않는다. 새 로그를 종료 전에 복사하고 실제 경로를 전달한다.
0/0 확인에는 반드시 새 CLI를 사용한다. FILE은 실제 새 로그로 바꾼다.

```powershell
node "$parentTool\cli.mjs" check-baseline --setup "$parentBundle\setup.json" --log 'C:\captures\NEW-BASELINE.txt' --out 'generated/wh3/skill-rank-parent-stats-01/baseline-check'
```

이 명령은 제공한 1150의 exact owner/CQI/army/Unit instance/XP/health/다른 Skills/traits/ancillaries/campaign/turn과
네 **실측 rank-0 값**에 새 capture를 대조한다. raw bytes, input hash, line 및 capture provenance를 새 폴더에 보존한다.
두 canonical stat sets가 COMPLETE이고 원본 0/0과 일치해야 `canonicalStatus=COMPLETE`다.
그 다음 기존 rank-trial verifier를 실행한다.

- `READY_FOR_EIGHT_CAPTURE`, `trialReady=true`: first 0/0와 전체 guard 성공. 아래 8-state 실험 진행 가능.
- `CANONICAL_COMPLETE_CONTROL_BLOCKED`: stats는 성공했지만 다른 guard 실패. **추가 포인트/8-capture 진행 금지**.
- `REJECTED`: identity/rank/source/stat 실패. raw와 baseline-check.json을 검토한다.

1150에는 `IsPreviewingStance=true`가 남아 있다. 기존 verifier는 이를 거부한다.
창을 닫았다는 사용자 조작만으로 flag를 false로 바꾸거나 성공했다고 간주하지 않는다.
새 0/0에서 같은 flag가 남으면 통제 조건/API 의미를 별도 확인해야 한다. 기존 gate를 제거하지 않았다.
canonical 수집 성공과 8-state readiness를 분리해서 보고하며, 준비만으로 multi-rank를 결정하지 않는다.

## baseline check가 성공한 뒤만: 8-state 실험

성공한 첫 0/0를 step 1로 재사용한다. 총 F9는 8회이며 확인용 0/0를 추가로 찍지 않는다.

| F9 | Low-Born | Worshippers | 조작 |
|---|---:|---:|---|
|1|0|0|위에서 성공한 첫 capture|
|2|1|0|Low-Born 1점 확정, 창 닫고 Lord 선택|
|3|2|0|다음 1점 확정|
|4|3|0|다음 1점 확정|
|5|0|0|같은 baseline save reload, Lord 재선택|
|6|0|1|Worshippers 1점 확정|
|7|0|2|다음 1점 확정|
|8|0|3|다음 1점 확정|

base save와 모든 원본 로그를 보존한다. reload로 나뉜 로그는 시간순으로 입력한다.
이전 1150 diagnostic capture나 다른 trial을 섞지 않는다. binding/ingestion에도 **새 CLI**를 사용한다.

```powershell
node "$parentTool\cli.mjs" bind --setup "$parentBundle\setup.json" --log 'C:\captures\primary.txt' --save 'C:\captures\BASE.save' --out 'generated/wh3/skill-rank-parent-stats-01/bound'
node "$parentTool\cli.mjs" ingest --setup 'generated/wh3/skill-rank-parent-stats-01/bound/setup.json' --log 'C:\captures\primary.txt' --log 'C:\captures\secondary.txt' --out 'generated/wh3/skill-rank-parent-stats-01/capture'
```

기존 baseline save hash / loaded-save attestation / channel review / eight-state negative control / independent threshold는 유지한다.
한 baseline으로 rank semantics를 판정하지 않는다. productionEligible은 항상 false이며 admission은 별도 검토 대상이다.
실험 후 게임 종료 상태에서 같은 installer의 `-Uninstall`로 원래 campaign script를 복원한다.
새 trial 준비: `node "$parentTool\cli.mjs" prepare --unit-size ULTRA --out NEW_DIRECTORY`.

검증: `node --test tests/skill-rank-runtime-parent-stats.test.cjs`, `node "$parentTool\replay.mjs"`, `npm test`, `npm run build`.
Lua/CLI mock 성공은 새 게임 capture를 대신하지 않는다.
