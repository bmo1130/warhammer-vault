# 첫 0/0 capture: 실제 stat 항목 진단

기준 커밋 `4bd04c314e1eb8f16d88d60c64f8dad3fbab0dd9`의 direct-key probe를 최소 확장했다.
기존 README / failure-analysis / runtime-resolution artifact는 과거 기록으로 보존한다.

## 실제 원본에서 확인한 것

사용자가 지정한 원본은 `C:\Users\lsh12\OneDrive\Desktop\script_log_051026_1132.txt`다.
330,847 bytes, SHA256 `658cb1eb33b6ce84e9035958365cc15398e899e68196c02f59ea9341e1d03564`.
게임 root의 동명 파일(460 bytes 종료 로그)과 다른 파일이다.
3038행의 유일한 capture를 `stat-items-original-capture.jsonl`에 줄 끝까지 원문으로 보존했다.

- owner `wh_main_brt_lord`, CQI 1065 / force CQI 949.
- 두 Skill rank 0/0. Men-at-Arms `8078`, Foot Squires `8079`; main/land/details identity 일치.
- 두 `detailsAccess`는 CONTEXT, 두 `StatList.Size`는 VALUE 7.
- 네 `StatContextFromKey`는 두 Unit 모두 NULL. 이후 Key/Value의 nil-context 오류는 stat 값이 아니다.
- 실제 7개 항목은 기존 collector가 기록하지 않았다. 원본 전체에서 관련 query는 이 한 행에만 있다.
  따라서 실제 항목 key/구조/Value 경로는 **아직 NOT_OBSERVED**이며 추정으로 복원할 수 없다.
- `force.IsPreviewingStance=true`라는 별도 control blocker가 있다. 이 값을 false로 보정하지 않는다.

이 capture는 앞선 일반적인 목록 접근 불가 가설을 지지하지 않는다.
가능성은 요청 key 불일치/visibility/lookup 동작 차이 등이지만 어느 것도 정답으로 선택하지 않았다.
[CA-generated CCO 문서](https://chadvandy.github.io/tw_modding_resources/WH3/cco/documentation.html)는
StatList의 항목을 CcoUnitStat, Key를 String, Value를 Float로 문서화한다. 문서는 실게임 성공의 증명이 아니다.

## 추가 출력과 검증

root에 `statDiagnosticRevision=campaign-stat-items-v1`을 추가한다.
기존 probeRevision, owner/rank/roster, detailsAccess, statScan, 네 direct lookup, statStatus를 유지한다.
추가 `units.rows[].statItems`는 **관찰된 size만큼** `.At(0..size-1)`를 열거한다. size 범위는 0..128이며,
없거나 잘못된 size에서는 임의로 7을 만들지 않는다.

각 row는 index, `.At(i)` access/error, Lua 반환 타입, item의 Key/Value,
부모 details의 `StatList.At(i).Key/Value`, 두 필드의 전체 query 경로를 기록한다.
항목 실패에도 나머지를 계속 읽는다. 값이 없으면 NULL/UNSUPPORTED/INVALID_NUMBER가 유지된다.
DB 기본값, tooltip, DisplayedValue, ValueBase, key 별칭 및 row 순서에 따른 stat 매핑을 사용하지 않는다.
열거된 숫자를 기존 `stats`에 대입하지 않는다.

새 `diagnose`는 제공한 1132 원본의 owner/army/Unit instance와 XP/health/Skill 0/0 등을 pin한다.
틀린 Lord/Unit/rank/source/size는 REJECTED다. 항목 누락 또는 두 조회 경로 불일치는 PARTIAL로 남는다.
출력 COMPLETE는 **7개 항목 진단이 완료됨**만 뜻하며 `rankTrialEligible=false`, `productionEligible=false`다.
stance preview는 별도 controlIssues에 남고 기존 rank resolver는 계속 거부한다.

**전체 capture의 status는 여전히 UNAVAILABLE일 수 있다.** 기존 exact key가 NULL이면 기존 gate가 유지된다.
이번 첫 capture의 확인 대상은 두 `statItems.rows` 7개와 실제 Key/Value/access다.
실제 항목 키를 확인하기 전까지 새 stat 경로/alias 또는 rank model을 승인하지 않는다.

## 사용자 조작: 같은 baseline에서 F9 한 번

준비된 bundle: `C:\codex\totalwar\generated\wh3\skill-rank-stat-items-01\bundle` (현재 save와 같은 ULTRA).
게임 종료 상태에서 아래 두 명령으로 기존 소유 probe를 제거하고 수정 probe를 설치한다.
installer와 backup은 기존 것을 재사용하며, 이번 작업에서 실제 게임 파일을 자동 변경하지 않았다.

```powershell
$rankTool = 'C:\codex\totalwar\tools\wh3-importer\skill-rank-runtime-resolution'
$statTool = 'C:\codex\totalwar\tools\wh3-importer\skill-rank-runtime-stat-fix'
$rankGame = 'C:\Program Files (x86)\Steam\steamapps\common\Total War WARHAMMER III'
$statBundle = 'C:\codex\totalwar\generated\wh3\skill-rank-stat-items-01\bundle'
powershell -NoProfile -ExecutionPolicy Bypass -File "$rankTool\install.ps1" -GamePath "$rankGame" -Bundle "$statBundle" -Uninstall
powershell -NoProfile -ExecutionPolicy Bypass -File "$rankTool\install.ps1" -GamePath "$rankGame" -Bundle "$statBundle" -BackupExistingCampaignScript
```

1. 같은 0/0 baseline save를 로드한다. owner/army/두 Unit 및 경험치/연구/장비/traits/mods/turn을 유지한다.
2. 해당 Lord를 선택하고 Skill/stance 선택창을 닫아 campaign map 상태로 돌아온다. 스탠스 변경은 하지 않는다.
3. F9를 **한 번** 누른다. Skill point를 소비하거나 rank 1~3로 진행하지 않는다.
4. 새 `script_log*.txt`를 종료 전에 별도 복사하고 실제 파일 경로를 전달한다.

로그를 자동 검사할 때 FILE은 실제 새 원본으로 바꾼다. 이전 1132 로그와 새 capture를 섞지 않는다.

```powershell
node "$statTool\cli.mjs" diagnose --setup "$statBundle\setup.json" --log 'C:\captures\NEW-BASELINE.txt' --out 'generated/wh3/skill-rank-stat-items-01/diagnostic'
```

raw 사본 / parsed.json / diagnostic-report.json에 원본 hash와 line/capture provenance가 보존된다.
결과는 관찰된 keys와 두 Value 경로, missing/conflict, controlIssues를 그대로 보여준다.
새 실게임 로그가 도착하면 실제 구조를 보고 다음 접근 수정이 필요한지 결정한다.

수집 후 게임 종료 및 원본 스크립트 복원:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$rankTool\install.ps1" -GamePath "$rankGame" -Bundle "$statBundle" -Uninstall
```

새 bundle을 만들 때 `node "$statTool\cli.mjs" prepare --unit-size ULTRA --out NEW_DIRECTORY`를 사용한다.
기존 8-capture 절차는 실제 stat identity/경로가 검증된 후 진행한다. 지금은 F9 한 번만 필요하다.
Multi-rank UNKNOWN / 신규 admission 0 / app 및 Modifier 변경 0.
