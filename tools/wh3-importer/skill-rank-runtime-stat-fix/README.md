# Campaign stat capture correction v1

Multi-rank semantics는 **UNKNOWN**, admission 0. 수정 probe의 실제 게임 성공은 **NOT_OBSERVED**다.
기존 runtime-resolution / owner / rank / selector / self-scope / resistance artifact는 수정하지 않는다.
원래 collector의 SHA256을 검사하고 stat 수집 블록만 교체해 새 bundle을 만든다.

## 확인된 실패와 남은 원인 구분

사용자가 지정한 `script_log_051026_1047.txt`는 현재 접근 가능한 첨부/게임 root에 없다.
대신 실제 게임 root의 `script_log_051026_1045.txt`에서 Low-Born 0/1/2/3 네 capture를 확인했다.
`related-runtime-events.jsonl`은 이 별도 파일의 probe 줄을 원문 그대로 보존한다.
`failure-analysis.json`에는 전체 원본 파일 SHA256, 줄 번호, capture hash와 확인 범위가 있다.
Worshippers 0/1/2/3는 사용자 보고이며 아직 원본 검증 전이다. 1045를 1047로 취급하지 않는다.

- `selectionScan.rows=[]`는 기존 callback이 row를 반환하지 않기 때문이다. 선택 Lord는 별도 배열에
  저장한다. owner/CQI와 Skill rows가 생성됐다는 것은 선택 gate를 통과했다는 뜻이다.
- `Stat list incomplete`는 `StatList.Size` 조회/범위 또는 `.At(i)` context 실패를 한 메시지로 합친다.
  assertion은 `f.units = list(...)` 대입이 완료되기 전에 발생해 Unit details 및 size 오류를 잃는다.
  기존 로그만으로 어느 query가 실패했는지는 확정할 수 없다.
- [CA-generated CCO 문서](https://chadvandy.github.io/tw_modding_resources/WH3/cco/documentation.html)에
  `CcoCampaignUnit.UnitDetailsContext`와 `CcoUnitDetails.StatList`는 ExpressionState 의존 API다.
  UI state 의존성이 의심되는 원인이다. 문서만으로 실제 접근 실패 원인을 증명한 것은 아니다.
  새 로그는 details context 실패와 stat context/value 실패를 구분한다.

## 최소 변경

같은 `UnitDetailsContext.PreBonusUnitDetailsContext`에서
`StatContextFromKey("stat_morale"/"stat_melee_defence"/"stat_armour"/"stat_melee_attack")`의
exact `Key`와 현재 `Value`를 읽는다. 이 lookup의 문서 인수는 String이다.
`StatList.Size`는 진단 정보로만 남기며 성공 조건에서 제외한다.
`detailsAccess`, stat별 `access`, exact query, `statStatus`를 먼저 저장하고 **모든 Unit row를 반환한 뒤**
실패 gate를 실행한다. 조회 불가/NULL/비정상 숫자를 0으로 보완하지 않는다.

BaseStatContextFromKey / ValueBase / DisplayedValue / tooltip / DB defaults는 사용하지 않는다.
owner, learned rank, armyRoster, purchased effects, 경험치 및 실험 제어값의 기존 수집 코드는 그대로다.
새 CLI는 기존 parser/identity/8-state/negative-control/threshold resolver를 재사용하며, direct lookup
revision 및 source query를 추가 검증하고 observation provenance를 실제 새 경로로 기록한다.
한 항목이라도 틀리면 raw만 보존하고 observations는 격리한다. productionEligible은 항상 false다.

## 다시 실행 — 동일한 8 F9

준비된 수정 bundle: `C:\codex\totalwar\generated\wh3\skill-rank-stat-fix-01\bundle`
실제 설치된 이전 설정의 Unit Size `ULTRA`를 사용했다. 다른 Unit Size/save로 바꾸면 새 prepare가 필요하다.
실제 게임 파일은 이번 작업에서 자동 변경하지 않았다. 기존 installer와 원본 backup을 재사용한다.

게임이 종료된 상태에서 저장소 root PowerShell에서 아래 명령을 실행한다.
현재 설치 state의 소유권/hash가 맞아야 제거되며, 이전 trial bundle은 보존한다.

```powershell
$rankTool = 'C:\codex\totalwar\tools\wh3-importer\skill-rank-runtime-resolution'
$statTool = 'C:\codex\totalwar\tools\wh3-importer\skill-rank-runtime-stat-fix'
$rankGame = 'C:\Program Files (x86)\Steam\steamapps\common\Total War WARHAMMER III'
$statBundle = 'C:\codex\totalwar\generated\wh3\skill-rank-stat-fix-01\bundle'
# 이미 설치된 이전 probe 제거. Bundle은 존재하는 수정 bundle이며 uninstall에서 읽지 않는다.
powershell -NoProfile -ExecutionPolicy Bypass -File "$rankTool\install.ps1" -GamePath "$rankGame" -Bundle "$statBundle" -Uninstall
powershell -NoProfile -ExecutionPolicy Bypass -File "$rankTool\install.ps1" -GamePath "$rankGame" -Bundle "$statBundle" -BackupExistingCampaignScript
```

기존 Script Debug Activator/loadfile mod, 같은 Lord/army/두 Unit/경험치/연구/ancillary/trait/difficulty/mods/
stance를 사용한다. 두 Skill 0/0인 **같은 baseline save**를 별도 보존한다.
Skill은 확정하고 창을 닫은 뒤 Lord를 다시 선택한 campaign map에서 F9를 한 번씩 누른다.

| F9 | Low-Born | Worshippers | 조작 |
|---|---:|---:|---|
|1|0|0|baseline save 로드, Lord 선택|
|2|1|0|Low-Born 1점 확정|
|3|2|0|Low-Born 다음 1점 확정|
|4|3|0|Low-Born 다음 1점 확정|
|5|0|0|같은 baseline save reload, Lord 재선택|
|6|0|1|Worshippers 1점 확정|
|7|0|2|Worshippers 다음 1점 확정|
|8|0|3|Worshippers 다음 1점 확정|

첫 F9에서 `probeRevision=campaign-exact-stat-key-v1`, `status=CAPTURED`, 두 Unit의 `statStatus=COMPLETE`를
확인한다. 실패하면 포인트를 더 쓰지 말고 새 로그를 전달한다. `detailsAccess` / `statScan.size` /
`stats[*].access/Key/Value`가 실제 실패 위치를 보여준다. 직접 lookup도 UI state 때문에 inaccessible하면
다음 API/UI-context 증거가 필요하며 성공했다고 추정하지 않는다.
reload로 로그가 나뉘면 **양쪽 원본 로그와 baseline save**를 보존한다. 8 captures 모두 새 trial이어야 한다.
이전 UNAVAILABLE capture를 새 실험에 섞지 않는다. F10이나 수동 수치 기록은 필요 없다.

수집 후 게임 종료 및 복원:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$rankTool\install.ps1" -GamePath "$rankGame" -Bundle "$statBundle" -Uninstall
```

후처리에는 반드시 새 CLI를 사용한다. FILE 경로는 실제 로그/save로 바꾼다. 출력은 새 디렉터리만 허용한다.

```powershell
node "$statTool\cli.mjs" bind --setup "$statBundle\setup.json" --log 'C:\captures\primary.txt' --save 'C:\captures\BASE.save' --out 'generated/wh3/skill-rank-stat-fix-01/bound'
node "$statTool\cli.mjs" ingest --setup 'generated/wh3/skill-rank-stat-fix-01/bound/setup.json' --log 'C:\captures\primary.txt' --log 'C:\captures\secondary.txt' --out 'generated/wh3/skill-rank-stat-fix-01/capture'
```

새 trial을 만들 때: `node "$statTool\cli.mjs" prepare --unit-size ULTRA --out NEW_DIRECTORY`.
setup/save/channel attestation과 A/B/D/E 판정 조건은 기존 runtime-resolution README와 동일하다.
이번 변경은 capture 접근 경로 수정이며 rank 의미론, schema, Modifier, production admission을 변경하지 않는다.

검증: `node --test tests/skill-rank-runtime-stat-fix.test.cjs`,
`node tools/wh3-importer/skill-rank-runtime-stat-fix/replay.mjs`, `npm test`, `npm run build`.
Lua mock 성공은 WH3 runtime 성공을 의미하지 않는다.
