# Android 위키 MVP 운영 안내

> 이 문서는 mobile MVP baseline `0205595`의 기록입니다. 최신 roster 수량과 완료 상태는 [ROSTERS.md](../tools/wh3-importer/faction-rosters/ROSTERS.md)와 `npm run data:status`를 확인하세요.

감사 기준: main `93130d543cc927cdd69cb8b920dc3553538b69f0` (2026-10-05).
기존 React/Vite/Router, IndexedDB v2, JSON backup v1, Modifier 엔진을 유지했다.
CA 원본·review·admission·runtime evidence는 변경하지 않았다.

## 휴대폰 사용과 배포

GitHub Pages 배포가 완료되면 Android Chrome에서
`https://bmo1130.github.io/warhammer-vault/`를 연다. **이번 작업에서는 push와 실제 배포를 하지 않았다.**
이 주소는 저장소 remote에 따른 예상 주소이며, 실제 주소는 Actions의 github-pages environment에서 확인한다.

1. GitHub 저장소 **Settings → Pages → Build and deployment → Source: GitHub Actions**를 선택한다.
2. 사용자가 로컬 commit을 main에 올린다: `git push origin main`.
3. **Actions → Deploy 전쟁 서고**의 build/deploy 성공과 environment URL을 확인한다.
   이미 main에 올라간 코드의 재배포는 같은 workflow의 **Run workflow → main**으로 실행한다.
4. 폰에서 홈, `/warhammer-vault/units/ca_unit_wh_main_brt_cav_grail_knights`,
   `/warhammer-vault/calculator?unit=ca_unit_wh_dlc07_brt_inf_foot_squires_0`,
   `/warhammer-vault/compare?left=ca_unit_wh_main_brt_cav_grail_knights&right=ca_unit_wh_main_brt_cav_knights_of_the_realm`
   를 직접 열고 새로고침한다.

Vite base와 Router basename은 `/warhammer-vault/`다. 정적 `404.html`이 원래 path/query/hash를
base index로 전달하고 index의 작은 스크립트가 React 실행 전에 복원한다.
404 응답 후 한 번 이동하는 Pages fallback이며 서버나 backend는 필요 없다.
저장소 이름을 바꾸면 `vite.config.ts`, `public/404.html`, `scripts/check-pages.mjs`의 base도 함께 바꾼다.
workflow는 npm ci → test → check:data → build → Pages routing 검사 → 정적 artifact 배포 순서다.

사용자는 홈 검색 → 상세 → **내 기록으로** → **기록 시작/편집**으로 평가·운용법·장단점을 쓴다.
자유 메모에는 조합과 생각을 별도로 쓴다. **저장하기**가 성공해야 IndexedDB 기록이 확정된다.
화면을 옮겼다가 같은 탭에서 돌아오면 sessionStorage의 임시 초안을 복구한다.
저장/취소/삭제 상태를 표시하고 초안 폐기·삭제·복원은 화면 안에서 확인한다.
초안은 백업에 포함되지 않으며 탭 종료 후 보존을 보장하지 않는다. 이동 전 저장이 가장 확실하다.

개인 데이터는 **브라우저·접속 origin별로 별도**다. PC 개발 주소에서 Pages 또는 폰으로 옮길 때
기존 주소의 백업 화면에서 JSON 다운로드 → 새 주소에서 파일 선택 → 항목 수 확인 → **복원 확정**한다.
복원은 현재 개인 데이터를 교체하며 게임 JSON은 건드리지 않는다.
이전 v1 백업에 Profile 필드가 없으면 기존 수동 Profile도 빈 목록으로 교체하는 기존 계약을 유지한다.
자동 동기화·로그인·오프라인 설치·APK는 제공하지 않는다.

## 실제 데이터와 계산기

| 항목 | 현재 값 |
|---|---:|
| Production / Sample | 101 / 5 |
| HP 확인 / 공석 | 13 / 88 |
| Speed 확인 / 공석 | 81 / 20 |
| Research technologies / effects / Modifier | 10 / 15 / 96 |
| Research exact Production targets | 22 |
| Calculator admitted Skills | 3 (모두 rank 1) |
| Bretonnia full static scan Skills / represented ranks / junctions | 226 / 434 / 840 |

Skill은 Champions of Bordeleaux (Alberic → Knights of the Realm),
Aspiring Knights (Alberic → Foot Squires), Blessed Water (Fay Enchantress → Battle Pilgrims)다.
exact owner가 자신의 군대를 지휘한다는 기존 조건을 표시한다.
각 유닛에서 승인된 Research/Skill만 나타나며 선택 개수를 표시한다.
96개 Research Modifier와 3개 Skill 전부 exact target에서 도달 가능함을 검사했다.
Research/Skill 선택은 수동 Profile·백업에 저장되지 않는 기존 계약을 유지한다.
공석은 `—`, 미검증 의미는 UNKNOWN이다. lore나 추정 수치를 추가하지 않았다.

## PC 작업의 공통 준비

```powershell
Set-Location C:\codex\totalwar
npm ci
npm run data:status
npm run check:data
npm test
npm run build
npm run check:pages
```

위 검사는 게임/RPFM 없이 committed source로 실행한다. 선택적인 local integration만
기존 `generated/wh3`가 있을 때 추가 실행된다. 실제 extraction부터는 local WH3와 RPFM이 필요하다.
검토된 snapshot은 WH3 9.0.2.0 / RPFM 5.1.0이며 새 patch/schema/pack은 자동 승인하지 않는다.

```powershell
$env:WH3_GAME_PATH = 'YOUR_WH3_INSTALLATION_ROOT'
$env:RPFM_SERVER_PATH = 'YOUR_RPFM_DIRECTORY\rpfm_server.exe'
# server가 이미 실행 중이면 다시 시작하지 않는다.
Start-Process -FilePath $env:RPFM_SERVER_PATH -WorkingDirectory (Split-Path $env:RPFM_SERVER_PATH) -WindowStyle Hidden
```

RPFM schema와 loopback MCP 준비는 [extractor README](../tools/wh3-importer/README.md)를 따른다.
아래 extraction은 ignored raw/staging 파일을 만든다. `--write` 명령은 tracked artifact를 바꾸므로
새 source/snapshot의 **독립 review와 manifest pin 검토 후** 사용한다. 숫자가 그럴듯하다는 이유로
reviewed-input, allowlist 또는 unknown gate를 변경하면 안 된다.

### A. Unit Production expansion

기존 한 유닛 trace와 normalize (아직 Production admission은 아님):

```powershell
npm run extract:wh3-unit -- grail-knights --game-path $env:WH3_GAME_PATH
npm run normalize:wh3-unit -- grail-knights
```

기존 bounded growth catalog의 extraction → projection → deterministic review → promotion 명령:

```powershell
node scripts/extract-production-growth.mjs expansion-batch-02
node scripts/project-production-growth.mjs expansion-batch-02 --check
node scripts/review-production-growth.mjs --check
node scripts/promote-production-growth.mjs --check
```

extract/project의 batch 인자는 **expansion-batch-02, -03, -04만** 지원한다.
이 명령은 이미 검토된 고정 catalog를 재현한다. 새 유닛은 새 bounded catalog/source/review/admission
작업이 먼저 필요하며 임의 batch 이름을 주면 실패한다. 새 추출의 timestamp/bytes가 기존 source와
다르면 `--check` 실패가 정상이다. source 차이를 검토한 뒤에만 다음 write를 사용한다:

```powershell
node scripts/project-production-growth.mjs expansion-batch-02 --write
node scripts/review-production-growth.mjs --write
node scripts/promote-production-growth.mjs --write
```

promotion은 명시적으로 승인된 Production projection만 바꾼다. HP/Speed는 별도 정책이며
static Unit 확장만으로 공석을 채우지 않는다. 마지막에 공통 check:data/test/build를 실행한다.

### B. Research

처음 두 단계는 **local extraction과 검토된 raw의 materialization**이다.
materialize는 tracked source와 manifest를 갱신하므로 일반 조회용 명령이 아니다.

```powershell
node scripts/extract-bretonnia-research-scan.mjs --game-path $env:WH3_GAME_PATH
# raw/source snapshot을 검토한 뒤에만:
node scripts/materialize-bretonnia-research-scan.mjs
```

그 뒤 committed source의 scan/classification/review/admission은 게임 없이 재현한다:

```powershell
node scripts/scan-bretonnia-research.mjs
node scripts/classify-bretonnia-research.mjs
node scripts/review-research-mappings.mjs
node scripts/review-research-scopes.mjs
node scripts/admit-bretonnia-research.mjs
```

classify는 기존 bounded 표본 분류 replay이고 scan은 full scan이다. 기본은 검사다.
검토한 derived artifact 갱신은 각 명령의 `--write`로 수행한다.
admit의 `--write`는 별도 reviewed-input과 source/target/scope/hash gate를 통과한 경우에만
`src/data/caResearchEffect.json` projection을 쓴다. UI는 그 projection을 자동 읽는다.
DIRECT 분류 하나만으로 승인되지 않는다. unsupported 효과·selector·scope는 제외/보류한다.

### C. Skill

full static extraction은 환경변수의 WH3 경로와 local RPFM을 사용한다 (CLI game-path 인자 없음):

```powershell
node scripts/extract-skill-production-bretonnia.mjs
```

ignored `generated/wh3/skill-production-bretonnia/raw.json`만 만들며 앱 admission은 늘리지 않는다.
기존 deterministic commands는 다음과 같다:

```powershell
node scripts/review-skill-production-bretonnia.mjs
# 원래 추출의 exact hash도 대조할 때만:
node scripts/review-skill-production-bretonnia.mjs --check-raw
node scripts/review-skill-slice-01.mjs
node scripts/review-skill-batch-01.mjs
node scripts/review-skill-batch-02.mjs
```

새 full raw를 committed compact source로 자동 승격하는 CLI나 일반적인 Skill `--write` admission CLI는 없다.
source.mjs의 projectExtraction/encodeSource/serializeSource와 selection/review/manifest를 별도 검토하는
기존 개발 절차가 필요하다. 현재 full gate는 기존 complete 3개와 exact projection 일치만 승인하며
새 admission은 0이다. [FULL_REVIEW](../tools/wh3-importer/skill-production-bretonnia/FULL_REVIEW.md),
[NEXT_BLOCKERS](../tools/wh3-importer/skill-production-bretonnia/NEXT_BLOCKERS.md)를 기준으로 한다.
multi-rank, character-self, conditional/unresolved selector, unsupported operation/resistance,
owner/availability, mixed whole-Skill gate를 추정으로 열지 않는다.

### Historical replay와 현재 앱 변경의 관계

과거 evidence manifest는 당시 앱/CSS/test 파일까지 고정한다. 따라서 위 과거 replay를 현재 UI
checkout에서 직접 실행하면 의도적인 historical file drift 오류가 날 수 있다.
**현재 상태의 운영 검사는 `npm run check:data`를 사용한다.** 17개의 동일한 기존 replay를
기준 commit의 격리된 파일 view에서 수행하고, 현재의 baseline tracked source/data/policy가
같은지 먼저 검증한다. 허용된 frontend/build/doc 변경 목록만 분리하며 evidence hash는 바꾸지 않는다.
Windows의 historical raw EOL도 Git baseline 내용과 원래 manifest SHA에 맞춰 재현한다.
`npm test`는 현재 앱/저장소/계산기 검사와 기존 전체 623-test replay를 모두 수행한다.
full history가 필요하므로 Pages checkout은 fetch-depth 0이다.

이는 **현재 승인 데이터의 동결 검증**이다. 새 데이터 투입 시 과거 manifest를 일괄 재해시하는
명령이 아니다. 위 write 절차와 새 source/review/admission, 격리 검사의 기준 갱신도 별도로 검토해야 한다.
historical 원본 replay와 신규 현재 projection 검사를 함께 유지한다.

## USER ACTION: 다음 실게임 관찰

original rank-resolution artifact의 rank trial capture는 0이고 verdict는 UNKNOWN이다.
더 최신 1319 실제 baseline은 canonical stats COMPLETE / errors=[]지만
`IsPreviewingStance=true`로 `trialReady=false`다. **8-rank 실험과 포인트 투입은 아직 금지다.**
준비된 다음 도구는 기존 [stance-preview README](../tools/wh3-importer/skill-stance-preview-research/README.md)의
5-state F9 진단이다. installer/backup/hash 및 collector/replay를 검사했으며 게임 설치는 변경하지 않았다.
same 1319 0/0 baseline (Lord CQI 1065, force 949)에서:

1. Lord 미선택, 상세·stance 창 닫기, 커서를 일반 map에 두고 **F9 한 번**.
2. 첫 로그를 기존 `cli.mjs inspect`로 확인한다. **errors=[]인 PARTIAL일 때만** 계속한다.
   REJECTED/UNAVAILABLE이면 멈추고 원본 로그를 전달한다.
3. 같은 Lord 선택·창 닫힘 → DEFAULT stance hover → 다른 stance **hover만** → stance 창 닫고
   같은 Lord 선택 유지, 각 상태에서 F9 한 번씩 (총 5번, 첫 capture 재사용).

이동·turn 종료·Skill point·stance 클릭/확정·save reload 없이 같은 session을 유지한다.
설치/inspect의 정확한 PowerShell 명령은 위 README의 **설치와 첫 F9 한 번** 그대로 사용한다.
원본 전체 로그와 실제 UI 조작 기록을 전달한다. diagnostic COMPLETE도 rank readiness는 아니다.
flag 의미와 current-only/cumulative는 아직 UNKNOWN이며 false gate를 무시하지 않는다.

## 검증 기록과 한계

- 현재 앱 테스트 58 + 기존 전체 replay 623, deterministic replay 17개를 검증한다.
  clean checkout은 기존 선택적 local artifact 검사 7개가 skip되며 실패가 아니다.
- 320/430/1280px에서 홈·유닛 목록/상세·팩션/군주 상세·메모·백업·비교·계산기 9개씩 총 27화면:
  body 가로 overflow 없음. 비교/계산기의 긴 표는 내부 가로 스크롤을 유지한다.
  모바일에 표시된 input/textarea/select는 16px 이상이다. 데스크톱 화면도 확인했다.
- 브라우저에서 IndexedDB 서술·메모 생성/수정/삭제 및 확인 취소, 상세 이동 후 초안 복구,
  즐겨찾기/최근 항목, 실제 JSON 다운로드 → 삭제 → 같은 파일 복원 → 내용 일치를 확인했다.
- Research/Skill on/off: Foot Squires의 Research+Aspiring Knights 총 피해 35→43.4→35,
  Knights of the Realm의 Champions 리더십 75→80, Battle Pilgrims의 Blessed Water 돌격 18→23.4.
  전체 96 Modifier/3 Skill의 exact target 연결과 비활성 base 복귀는 자동 검사했다.
- 정적 404 응답을 반환하는 시험 서버에서 deep route 직접 진입/새로고침을 확인했다.
  build asset 존재, query/hash/Unicode 보존 7개 route roundtrip, base 밖 복원 거부도 검사한다.
- 실제 Android 장치/소프트 키보드와 live GitHub Pages는 아직 미검증이다.
  Chromium viewport 검증을 Android 실기기 검증으로 간주하지 않는다.
- 기존 단일 JS chunk의 Vite 500kB 경고는 남아 있다. 데이터/기능 분할은 이번 범위에 추가하지 않았다.

배포 근거: [Vite Pages guide](https://vite.dev/guide/static-deploy.html),
[GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages),
[Pages custom 404](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-custom-404-page-for-your-github-pages-site).
