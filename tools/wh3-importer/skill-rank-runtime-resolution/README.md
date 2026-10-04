# Multi-rank runtime experiment v1

**현재 판정: E — UNKNOWN 유지. 실게임 capture 0개.**
실험 도구는 준비되었지만 게임에서 CCO 경로가 실제 접근되는지는 아직 확인되지 않았다.
기존 rank 연구의 UNKNOWN, app schema/model, Modifier engine, admission은 변경하지 않는다.
기준 커밋은 `9f63a7662f7d71638aa580cb2f0227b7b26d8fac`이며 기존 498개 파일을 해시로 보존한다.

## 기존 기능 감사와 최소 확장

기존 battle probe는 exact main/land key, Unit identity, HP/entity/ammunition/reload를 기록한다.
Lord learned Skill rank와 이번 네 능력치가 없다. 이전 audit의 134개 로그 경로 / 50개 고유 파일 /
5,976개 probe event에는 이번 판정을 만족하는 관찰이 없었다. 이 audit을 다시 쓰거나 재해석하지 않았다.
rank/owner/class-selector 연구, Bretonnia full production 결과와 NEXT_BLOCKERS를 참조했다.
기존 static rank rows는 `experiment.mjs`의 예상값 검산에만 사용한다.

기존 설치된 loadfile mod의 **campaign F9 → game-root `exec.lua`** 경로를 재사용한다.
기존 battle `exec_battle.lua` / F10 trace는 수정하지 않는다. 새 수집기는 읽기 전용이며,
포인트 추가·제거, commit, 저장·불러오기, 턴 진행을 호출하지 않는다.

| 필요 항목 | 기존 battle capture | 새 campaign 수집 경로 |
| --- | --- | --- |
| Lord subtype / instance | 해당 증거 없음 | 선택한 player Character의 AgentSubtypeRecordContext.Key / CQI |
| exact Skill / learned rank | 없음 | SkillList: Key / Level / CharacterContext.CQI |
| Unit main / land / instance | 재사용 가능 | UnitRecordContext.Key / UnitLandRecordContext.Key / UniqueUiId |
| Leadership / Defence / Armour / Attack | 없음 | UnitDetailsContext.PreBonusUnitDetailsContext.StatList: Key / Value |
| active bundle identity | 해당 증거 없음 | EffectBundleUnfilteredList.Key, 보조 정보만 |

새 경로의 근거는 [CA CCO API 문서](https://chadvandy.github.io/tw_modding_resources/WH3/cco/documentation.html)다.
`api-contract.json`은 문서의 반환형과 출처 해시를 기록한다. 문서에 있다는 사실은 런타임 성공이나
rank semantics의 증명이 아니다. PreBonus는 preview를 제외한 채널로 문서화되어 있으나,
실제 committed campaign bonuses가 이 Value에 반영되는지 첫 실제 capture에서 검토해야 한다.
Tooltip / DisplayedValue / ValueBase / static unit 값을 관찰로 대체하지 않는다.
`UNSUPPORTED`, `NULL`, `UNAVAILABLE`은 raw log에 남고 validator가 해당 trial을 거부한다. 0으로 치환하지 않는다.

## 준비할 save — 현재 지정되지 않음

싱글플레이 campaign, 플레이어 턴, 일반 Bretonnia Lord **`wh_main_brt_lord`** 한 명을 사용한다.
이 Lord의 같은 army 안에 아래 대상이 정확히 1부대씩 있어야 한다.

| 실험 | Skill exact key | Unit main = land key | 관찰 |
| --- | --- | --- | --- |
| Primary | wh2_dlc11_skill_brt_army_buff_low_born_militia | wh_main_brt_inf_men_at_arms | Leadership, Melee Defence |
| Secondary | wh2_dlc11_skill_brt_army_buff_worshippers_of_the_grail | wh_dlc07_brt_inf_foot_squires_0 | Armour, Melee Attack |

두 Skill 모두 rank 0이며 필요한 선행 Skill은 이미 열려 있어야 한다. 미사용 포인트 **최소 3개**를
준비한다. 각 branch는 같은 rank-0 save에서 출발하므로 6개를 소비할 필요가 없다.
base save를 별도 복제하고 자동 저장으로 덮어쓰지 않는다. 턴/이동/전투/모집/장비 교체/레벨업 없이 진행한다.
Lord, army 구성, Unit instance/experience, 연구, ancillary, trait, difficulty, mods, campaign modifier,
stance, Unit Size를 고정한다. baseline을 만들기 위해 respec했다면 모든 변경을 완료한 후 저장한다.
실험 중 respec으로 두 번째 branch를 만들지 말고 **같은 base save를 reload**한다.

## 설치와 게임 조작

현재 게임 폴더 root `exec.lua`(291 bytes)에는 기존 재무·의식 변경 코드가 있다.
수집기 설치 전 F9를 누르면 기존 코드가 실행된다. 아래 installer는 원본을 백업하고 나중에 복원한다.
현재 작업에서는 실제 게임 파일을 바꾸지 않았다. `exec2.lua` / battle probe는 건드리지 않는다.

저장소 root PowerShell에서 아래 명령을 사용한다. `ULTRA`는 예시이며 **save의 실제 Unit Size**로 지정한다.
출력 디렉터리는 존재하지 않는 새 경로여야 한다. 다른 trial은 다른 디렉터리를 사용한다.

```powershell
$rankTool = 'C:\codex\totalwar\tools\wh3-importer\skill-rank-runtime-resolution'
$rankGame = 'C:\Program Files (x86)\Steam\steamapps\common\Total War WARHAMMER III'
$rankBundle = 'C:\codex\totalwar\generated\wh3\skill-rank-trial-01\bundle'
node "$rankTool\cli.mjs" prepare --unit-size ULTRA --out "$rankBundle"
# 게임을 종료한 상태에서 실행한다. 설치된 exe ProductVersion 9.0.2.0을 검사한다.
powershell -NoProfile -ExecutionPolicy Bypass -File "$rankTool\install.ps1" -GamePath "$rankGame" -Bundle "$rankBundle" -BackupExistingCampaignScript
```

기존 Script Debug Activator/loadfile mod를 켜고 base save를 불러온다.
각 포인트는 **적용을 확정하고 Skill 화면을 닫은 후**, 해당 Lord를 선택한 campaign map에서 F9를 한 번 누른다.

| F9 순서 | Low-Born rank | Worshippers rank | 수행 |
| --- | ---: | ---: | --- |
| 1 | 0 | 0 | base save, Lord 선택 → F9 |
| 2 | 1 | 0 | Low-Born 1점 확정 → F9 |
| 3 | 2 | 0 | Low-Born 다음 1점 확정 → F9 |
| 4 | 3 | 0 | Low-Born 다음 1점 확정 → F9 |
| 5 | 0 | 0 | 같은 base save reload, Lord 재선택 → F9 |
| 6 | 0 | 1 | Worshippers 1점 확정 → F9 |
| 7 | 0 | 2 | Worshippers 다음 1점 확정 → F9 |
| 8 | 0 | 3 | Worshippers 다음 1점 확정 → F9 |

숫자를 수기로 적거나 rank별 screenshot을 만들 필요 없다. 매 F9가 두 유닛을 함께 읽는다.
기존 `script_log*.txt` 로그에서 `WH3_SKILL_RANK_PROBE|` 줄이 출력된다. 게임 root에 생성된 해당 로그들을
게임 종료 전에 별도 복사하고, base save 사본과 함께 전달한다. reload로 로그가 나뉘면 양쪽 파일을 모두 보존한다.
첫 F9에 이 접두사가 없거나 UNAVAILABLE이면 나머지 포인트를 쓰기 전에 그 로그만 전달해 API 경로를 확인한다.
실험은 F9만 사용하며 campaign F10은 이 collector에 연결하지 않는다.

수집 후 게임을 종료하고 원래 campaign 스크립트를 복원한다.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$rankTool\install.ps1" -GamePath "$rankGame" -Bundle "$rankBundle" -Uninstall
```

## 수집 후 자동 검증 (도구 운영 단계)

아래 경로의 `BASE.save` / `branch-primary.txt` / `branch-secondary.txt`는 실제 전달받은 파일 경로로 바꾼다.
하나의 로그에 8회가 전부 있으면 `--log`도 하나만 쓴다. 여러 로그는 실제 시간순으로 지정한다.

```powershell
node "$rankTool\cli.mjs" bind --setup "$rankBundle\setup.json" --log 'C:\captures\branch-primary.txt' --save 'C:\captures\BASE.save' --out 'generated/wh3/skill-rank-trial-01/bound'
node "$rankTool\cli.mjs" ingest --setup 'generated/wh3/skill-rank-trial-01/bound/setup.json' --log 'C:\captures\branch-primary.txt' --log 'C:\captures\branch-secondary.txt' --out 'generated/wh3/skill-rank-trial-01/capture'
```

`bind`는 첫 유효한 0/0 capture의 Lord CQI, force CQI, Unit instance, campaign/turn과
canonical capture SHA256을 pin하고, 전달된 binary save SHA256을 별도로 보존한다.
CCO는 현재 로드된 파일명을 증명하지 않는다. **save 해시는 전달 파일을 식별하며 로드 증명은 아니다.**
기존 pin과 다른 save/capture/identity/rank는 fail closed한다. 처음 pin하는 대상이 지정 save인지,
research/difficulty/modifier가 고정되었는지는 bound review가 필요하다. 미확인 상태는 최대 PROVISIONAL이다.

ingest는 raw 파일 사본, 원본 SHA256+line provenance, `parsed.json`, `observations.jsonl`,
`resolution.json`, 미승인 `review-template.json`을 새 디렉터리에만 쓴다.
parsed raw에는 접근 실패 상태도 보존된다. invalid trial의 observations는 비워서 오인 사용을 막는다.
이미 생성된 evidence를 덮어쓰지 않는다. 중복 동일 capture는 합치고 충돌/잘못된 JSON은 전체 trial을 격리한다.

검토자는 실제 log와 실험 조건을 확인한 후 review-template의 loadedSaveAttested/controlledSetup,
currentValuesNotTooltipOrPreview, reviewer/evidenceNote를 작성한다. reviewer note에 research/difficulty/mods/
campaign modifiers 고정 및 현재 값 채널 검증 근거를 남긴다. 같은 raw 파일을 검토된 setup으로 다시 ingest한다.
검토는 정확한 8개 capture hash에 묶인다. 단순 checkbox나 mock은 게임 관찰을 대신하지 않는다.

## Candidate comparison

아래 값은 각 Skill 대상 유닛의 **실측 rank-0 기준값에 더하는 예측 delta**다. 관찰값이 아니다.

| Skill / 모델 | rank 0 | rank 1 | rank 2 | rank 3 |
| --- | --- | --- | --- | --- |
| Low-Born current-only (Leadership, Defence) | 0,0 | 4,0 | 4,4 | 6,6 |
| Low-Born cumulative | 0,0 | 4,0 | 8,4 | 14,10 |
| Worshippers current-only (Armour, Attack) | 0,0 | 6,0 | 9,4 | 12,6 |
| Worshippers cumulative | 0,0 | 6,0 | 15,4 | 27,10 |

resolver는 rank 0/1/2/3 전부, 각 Skill의 두 stat 전부를 **정확 일치**로 비교한다. 반올림 허용오차나
예상값 보정은 없다. rank 1만은 모호하다. rank 3만 있어도 baseline/sequence 검증에 실패한다.
Skill별 / stat별 후보를 남기며, 다른 유닛의 네 stat은 negative control이다. 두 번째 0/0은 모든 값이
첫 baseline으로 복원되어야 한다. Lord/army/Unit/XP/다른 Skill/traits/ancillaries/turn/stance 변경은 격리한다.

한 Skill만 일치하면 D PROVISIONAL. 두 Skill이 다르면 공통 semantics UNKNOWN이며 D PROVISIONAL.
effect별 혼합 또는 어느 모델에도 맞지 않으면 OTHER 관찰로 남고 새로운 upgrade 식을 추측하지 않는다.
완전한 두 series, 동일 semantics, 복원 baseline, rank/source identity, 고정 조건 및 채널 검토가 모두
충족되어야 A/B의 bounded runtime-supported 판정을 낸다. 이 두 Skill 밖의 엔진 전체로 일반화하지 않는다.
현재 도구의 `productionEligible`은 항상 false다. 증명 이후 별도 bounded model/admission 구현과
rank 감소/제거·wrong owner/unit·Research/Manual 병합 회귀가 필요하다.

## 현재 결과와 보존 범위

`observation-status.json`: 두 Skill rank 0/1/2/3 모두 NOT_OBSERVED, value null.
`resolution.json`: E / UNKNOWN / NOT_OBSERVED, rule null, admission 0.
실제 관찰이 없으므로 schema/model, rank projection, 중복 방지 정책을 도입하지 않았다.
가짜 game log를 committed evidence로 만들지 않았다. 테스트 fixture는 메모리와 테스트 전용 임시 폴더에서만 생성한다.

Production 101 / Sample 5 / HP 13 / Speed 81 / Research 10 technologies·15 effects·96 modifiers /
admitted Skill 3 / Bretonnia 226 Skills·434 ranks·840 junctions는 그대로다.
DIRECT 10 / LIMITED 2 / REVIEW_REQUIRED 82 / UNSUPPORTED 7 / NON_UNIT_STAT 739도 그대로다.
IndexedDB, backup, comparison, runtime evidence, owner/selector/rank historical artifacts와 full classifier는 수정하지 않았다.
성공 시 잠재 후보는 whole Skills 2개, junction 12개, unique effects 5개이며 자동 admission을 뜻하지 않는다.
그중 10개 junction은 두 대상 Skill 내부, 나머지 2개는 Glorfinial's Progeny의 다른 blocker가 남는다.

```powershell
node scripts/review-skill-rank-runtime-resolution.mjs
node --test tests/skill-rank-runtime-resolution.test.cjs
node scripts/verify-skill-production-bretonnia.mjs
```

새 테스트는 양쪽 모델, ambiguous/partial/mixed 결과, wrong identity/rank/stat, unavailable,
preview, changed controls, raw conflicts, bound save/review drift와 실제 Lua 코드의 mock 실행을 검증한다.
Lua mock 성공은 게임 API 성공이라는 뜻이 아니다. API 접근 실패 시 raw log의 정확한 누락 경로를 먼저 해결한다.
