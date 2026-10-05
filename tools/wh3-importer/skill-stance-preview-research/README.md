# Bounded stance-preview investigation

기준 `5657c86fb75c0b3ec49564861c84a07f5fcc9a6f`. 기존 gate 유지, 8-capture 금지,
multi-rank **UNKNOWN**, productionEligible=false, admission 0.

## 현재 근거와 판정

1319 원본 전체 로그, 당시 setup/checker를 `evidence/`에 byte 그대로 보존했다.
로그 SHA256 `3d3779c7430074113c37eadc2775e49fabc38123f4e691523d5207e8eacbf0a8`,
3163행 capture SHA256 `30512b4658374d1221dca91bf6a16876253d4282fefd96341bdb114e1fbfcdeb`.
당시 결과를 재계산하면 canonical COMPLETE / errors=[] / trialReady=false이며
유일한 blocker는 Stance preview다. Lord 1065 / force 949 / subtype wh_main_brt_lord,
두 Skill 0/0, 두 Unit의 네 stat 값은 실제 capture에 있다. 기존 1150 결과도 변경하지 않았다.

[CCO 문서](https://chadvandy.github.io/tw_modding_resources/WH3/cco/documentation.html)는
IsPreviewingStance를 다른 stance의 UI preview와 연결한다. ActiveStanceContext는 선택된
stance context이므로 DEFAULT key와 flag=true의 공존만으로 문서 오류나 flag 무효를 증명하지 못한다.
문서는 CA API 설명의 community mirror이며 9.0.2 구현 코드/동일 버전 보장은 없다.
[Campaign model API](https://chadvandy.github.io/tw_modding_resources/WH3/scripting_doc.html)는
force의 active_stance()를 string으로 제공한다. CCO와 독립 조회하고 exact key를 비교한다.
새 diagnostic의 게임 관찰은 **NOT_OBSERVED**. 지속된 UI preview, selection 영향,
context route 차이, 버전별 API 차이는 모두 아직 가설이다. gate 유효성의 최종 판정은 보류한다.

## 최소 추가 조회

새 collector는 기존 canonical collector를 재사용하되 별도 diagnostic format/prefix로 격리한다.
Lord 미선택 상태에서도 1319의 CQI로 같은 Lord를 찾는다. 기존 selected-only rank collector는 그대로다.
owner/rank/roster/traits/ancillary/bundle/stat/provenance/direct lookup/NULL item diagnostics를 유지한다.

- 기존 materialized force, owner parent scalar, 두 exact Unit의 parent scalar에서 flag / CQI /
  commander / IsSelected / stance key / preview AP cost / preview eligibility를 읽는다.
- 기존 flag를 앞/뒤로 다시 읽어 F9 도중 변한 capture를 거부한다.
- owner IsSelected / IsDetailsOnly / IsOnMap / IsPreviewingMove / current AP / preview AP를 기록한다.
- `cm:get_military_force_by_cqi(949)`에서 model CQI / commander / active_stance() / remaining AP를 읽는다.
  CCO AP fraction과 model AP integer를 서로 환산하지 않는다.
- read-only 조회만 한다. EnablePreview/DisablePreview/Activate/Skill allocation을 호출하지 않는다.
  unavailable을 false나 0으로 바꾸지 않는다.

검증은 exact 1319 owner/force/Unit/roster/Skill 0/0, current stance DEFAULT, 동일 turn/XP/health/AP,
canonical key/value/query 연결, 선택 상태 및 순서를 확인한다. model이나 필수 flag가 NULL/UNSUPPORTED이면
fail closed하며 원본 frame은 보존한다. 실제 alternative **hover** 중 stat 채널만 바뀌는 경우는
diagnostic 변화로 따로 기록하고 rank evidence로 받아들이지 않는다. 닫힌 상태에서 stat이 바뀌면 거부한다.

step label은 계획일 뿐 UI가 실제 열렸다는 API 증거가 아니다. `uiStateVerified=false`를 유지하고,
검토용 action attestation에 실제 조작을 적는다. 자동 비교는 route 차이/flag 변화/CCO-model key 차이를
보고할 뿐 flagMeaning=UNKNOWN / KEEP_EXISTING_FALSE_GATE를 유지한다. rank resolver에 넣을 수 없는 format이다.

## 설치와 첫 F9 한 번

이미 생성한 최소 5-state bundle: `C:\codex\totalwar\generated\wh3\stance-preview-01\bundle`.
게임 종료 상태에서 기존 owned probe를 제거하고 설치한다. agent는 실제 게임 파일을 변경하지 않았다.
기존 installer가 probe/backup hash와 버전을 확인하며, 불일치하면 중단한다.

```powershell
Set-Location C:\codex\totalwar
$stanceTool = 'C:\codex\totalwar\tools\wh3-importer\skill-stance-preview-research'
$stanceBundle = 'C:\codex\totalwar\generated\wh3\stance-preview-01\bundle'
$stanceInstaller = 'C:\codex\totalwar\tools\wh3-importer\skill-rank-runtime-resolution\install.ps1'
$stanceGame = 'C:\Program Files (x86)\Steam\steamapps\common\Total War WARHAMMER III'
powershell -NoProfile -ExecutionPolicy Bypass -File $stanceInstaller -GamePath $stanceGame -Bundle $stanceBundle -Uninstall
powershell -NoProfile -ExecutionPolicy Bypass -File $stanceInstaller -GamePath $stanceGame -Bundle $stanceBundle -BackupExistingCampaignScript
```

1319와 같은 rank 0/0 baseline save를 실행한다. 기존 Script Debug Activator/loadfile mod와 F9 workflow를 쓴다.
Skill point, 이동, turn 종료, stance 활성화는 하지 않는다. 이 진단은 같은 게임 session에서 순서대로 실행한다.

**먼저 Lord를 미선택하고 units/stance 창을 닫은 일반 map에서 F9를 한 번만 누른다.**
빈 map을 좌클릭하여 미선택하고 커서를 UI에서 치운다. 우클릭 이동은 하지 않는다.
새 로그를 아래 CLI로 확인한다. `errors=[]`인 PARTIAL이면 나머지 diagnostic 네 상태만 진행할 수 있다.
REJECTED/UNAVAILABLE이면 중단하고 그 로그를 전달한다. 첫 diagnostic만으로 8-rank 실험은 허용되지 않는다.

```powershell
node "$stanceTool\cli.mjs" inspect --setup "$stanceBundle\setup.json" --log 'C:\captures\FIRST.txt' --out 'generated/wh3/stance-preview-01/first-check'
```

## 같은 baseline의 bounded UI 비교

각 상태에서 **F9 한 번씩만** 누른다. 같은 session에서 reload하지 않는다. 첫 F9는 아래 1번으로 재사용한다.

| F9 | 실제 조작 | 유지 조건 |
|---:|---|---|
|1|Lord 미선택, 창 닫힘, 커서 일반 map|두 Skill 0/0, model DEFAULT|
|2|같은 Lord 선택, stance/Unit 상세 창 닫힘, 커서 일반 map|이동/포인트 사용 없음|
|3|stance 선택 UI 열기, 현재 DEFAULT 선택지에 hover만 하기|stance 선택지를 클릭하지 않음|
|4|다른 stance 선택지에 hover만 하기, tooltip이 보이는 상태|**클릭/확정 금지**, model은 계속 DEFAULT|
|5|stance UI 닫기, 같은 Lord 선택 유지, 커서 일반 map|model DEFAULT, 원래 baseline stats 복원|

4번은 문서가 말하는 alternative preview의 양성 대조다. 실제 stance 진입이 아니다.
실수로 stance를 클릭하거나 이동/Skill 사용/추가 F9를 하면 해당 run을 중단하고 실제 조작을 기록한다.
flag를 끄는 API를 쓰거나 true를 무시하지 않는다. false가 끝까지 나오지 않아도 그대로 기록한다.

Unit panel이 selection/context에 영향을 주는지 별도 확인할 수 있으면 **설치 전에** 7-state bundle을 준비한다.
5-state 기본 bundle에 임의로 두 F9를 추가하지 않는다. 지원되는 고정 Unit 상세 panel을 직접 열고 닫을 수
있을 때만 선택한다. 숨은 UI ID/visibility를 추측하지 않으며, 조작이 불가능하면 기본 5-state를 쓴다.

```powershell
node "$stanceTool\cli.mjs" prepare --units-panel yes --out 'generated/wh3/stance-preview-with-units-01/bundle'
```

이 bundle은 2번 다음에 UNITS_PANEL_OPEN / UNITS_PANEL_CLOSED를 삽입한다.
같은 Men-at-Arms 상세 panel만 열고 닫으며 Lord 선택을 유지하고, stance 창은 닫힌 상태로 둔다.
F9는 총 7번이며 이후 DEFAULT hover → alternative hover → 닫힘 순서다.
다른 Unit/Lord 선택으로 검증이 실패하면 그대로 중단한다.

## 로그 전달/판독

첫 check 후에도 게임이 쓰는 전체 로그를 사용한다. 여러 파일이면 시간순으로 `--log`를 추가한다.
동일 capture 중복은 hash가 같을 때만 중복 제거하며 누락/다른 trial/재시작/순서 변경은 거부한다.
출력 directory는 새 경로여야 한다.

```powershell
node "$stanceTool\cli.mjs" inspect --setup "$stanceBundle\setup.json" --log 'C:\captures\FINAL.txt' --out 'generated/wh3/stance-preview-01/comparison'
```

원본 로그와 comparison.json, ui-action-attestation-template.json에 적은 실제 조작을 전달한다.
hover한 stance 이름/key가 UI에서 확인되지 않으면 unknown으로 적는다. output label만 믿고 채우지 않는다.
comparison의 COMPLETE는 bounded diagnostic 수집 완료이며 rank trial readiness가 아니다.
조작 확인과 양성 대조, model/CCO/stat의 대응을 검토한 뒤 별도 근거로 gate를 판단한다.
모든 route가 계속 true라면 내부 원인을 단정하지 않고 추가로 필요한 정보만 보고한다.

실험 뒤 게임 종료 상태에서 같은 installer의 `-Uninstall`로 원래 script를 복원한다.
fresh 5-state bundle 준비: `node "$stanceTool\cli.mjs" prepare --units-panel no --out NEW_DIRECTORY`.
과거 canonical baseline bundle과 비교 실험 bundle을 혼용하지 않는다.

## 검증/보존

`node --test tests/skill-stance-preview-research.test.cjs`, 새 replay, 기존 full Skill / self-scope /
Research / resistance / runtime replay, `npm test`, `npm run build`로 검증한다.
mock UI/model 성공은 게임 관찰이 아니다. 기존 tracked 파일 575개의 byte hash를 manifest로 보호한다.
Production 101 / Sample 5 / HP 13 / Speed 81 / Research 10·15·96 / admitted Skill 3 /
inventory 226·434·840, 기존 Modifier/schema/storage/comparison 및 historical UNKNOWN을 변경하지 않는다.
