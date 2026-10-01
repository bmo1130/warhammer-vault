import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { args, saveJSON } from './cli.mjs';
import { json, verifyIndex } from './static-index.mjs';
import { FORMAT, OBSERVATION_TYPES } from './contract.mjs';
import { validateRuntimeEvidence } from './validate.mjs';

// All outputs are new diagnostic files. No game process, shell commands or Unit writer.
export async function record(bundleDir, io) {
  const index = verifyIndex(await json(resolve(bundleDir, 'static-index.json'))), jobs = await json(resolve(bundleDir, 'runtime-jobs.json')), template = await json(resolve(bundleDir, 'recording-template.json'));
  const ask = async (prompt, fallback = '') => (await io.question(`${prompt}${fallback !== '' ? ` [${fallback}]` : ''}: `)).trim() || fallback;
  const observations = [], session = new Date().toISOString().replace(/[:.]/g, '-');
  const gameVersion = await ask('게임의 실제 version (준비 기준과 같아야 함)', index.snapshot.gameVersion);
  if (gameVersion !== index.snapshot.gameVersion) throw new Error('Game version drift; keep existing evidence and re-review/re-prepare static snapshot.');
  const observer = await ask('관찰자', 'manual-observer');
  for (;;) {
    io.write(jobs.jobs.map((j, i) => `${i + 1}. ${j.priority} ${j.subject} / ${j.contextId ?? 'pilot diagnostic'} / ${j.scenarioId} / ${j.unitSize}`).join('\n') + '\n');
    const selection = await ask('job 번호 (종료: q)', 'q'); if (selection === 'q') break;
    const job = jobs.jobs[Number(selection) - 1]; if (!job) { io.write('잘못된 번호입니다.\n'); continue; }
    io.write(job.steps.join('\n') + '\n');
    io.write(`Static effect links (활성 여부 증거 아님): ${job.requiredSetup.staticLinkedEffectKeys.join(', ') || '이 source에서 없음'}\n`);
    const unitSize = await ask('실제로 적용한 Unit Size SMALL/MEDIUM/LARGE/ULTRA', job.unitSize);
    const trialId = await ask('독립 battle/trial 식별자', `trial-${session}-${observations.length}`);
    const phase = await ask('관찰 시점 (손실 전/후는 서로 다른 이름)', 'BATTLE_START');
    const reference = await ask('screenshot/video 파일 경로 또는 reference (없으면 빈칸)');
    const exactReference = await ask('실제 exact main key를 보여준 신뢰 가능한 reference (카드 이름뿐이면 빈칸)');
    const setup = structuredClone(template.jobs.find(j => j.jobId === job.id).observations[0].setup);
    setup.factionId = await ask('실제 faction registry context (모르면 NOT_RECORDED)', setup.factionId);
    setup.battleMode = await ask('battle mode CUSTOM_BATTLE/CAMPAIGN_BATTLE/CAMPAIGN/PROLOGUE', job.priority === 'P0' || job.priority === 'P2' ? 'CUSTOM_BATTLE' : 'NOT_RECORDED');
    setup.lord = await ask('lord (모르면 NOT_RECORDED)', 'NOT_RECORDED'); setup.rank = null;
    const rank = await ask('unit rank (모르면 빈칸)'); if (rank !== '') setup.rank = Number(rank);
    setup.mods.status = await ask('mods NONE/ENABLED/NOT_RECORDED', 'NOT_RECORDED');
    if (setup.mods.status === 'ENABLED') setup.mods.ids = (await ask('mod IDs/이름, 쉼표 구분')).split(',').map(s => s.trim()).filter(Boolean);
    for (const key of ['skills', 'rituals', 'effects', 'technologies', 'buildings']) {
      const state = await ask(`${key}: 모두 없으면 NONE, 상태 알면 이름/ID 쉼표 구분, 모르면 UNKNOWN`, 'UNKNOWN');
      if (state !== 'UNKNOWN') {
        setup[key].status = 'KNOWN'; setup[key].labels = state === 'NONE' ? [] : state.split(',').map(s => s.trim()).filter(Boolean);
        // Human labels remain labels. Exact effect IDs require later explicit JSON review.
      }
    }
    setup.summoned = await ask('summoned YES/NO/UNKNOWN', 'UNKNOWN'); setup.supplyVariant = await ask('Supply YES/NO/UNKNOWN', 'UNKNOWN');
    setup.difficulty = await ask('difficulty', 'NOT_RECORDED'); setup.saveReference = await ask('save/scenario reference', 'NOT_RECORDED'); setup.sessionPhase = phase;
    const rows = template.jobs.find(j => j.jobId === job.id).observations;
    for (const [i, original] of rows.entries()) {
      const o = structuredClone(original), field = job.fieldsToRecord[i];
      io.write(`\n${field.type}: ${field.prompt}\n`);
      if (await ask('기록할까요? y/n', 'y') !== 'y') continue;
      o.id = `${original.id}:${session}:${observations.length}`; o.gameVersion = gameVersion; o.unitSize = unitSize; o.trialId = trialId; o.setup = structuredClone(setup); o.samplePoint = phase;
      o.subjectLabel = await ask('component/subject (값 비교 시 같은 label 사용)', ['CARD_MODEL_COUNT', 'CARD_HEALTH'].includes(field.type) ? 'whole unit' : 'NOT_RECORDED');
      o.identityVerification = { level: exactReference ? 'EXACT_SOURCE_OBSERVED' : 'CONTEXT_ONLY', reference: exactReference || null };
      o.provenance = { kind: 'RUNTIME_MANUAL', observer, observedAt: new Date().toISOString(), references: reference ? [reference] : [], notes: '' };
      const shape = OBSERVATION_TYPES[field.type];
      const value = await ask(shape === 'number' ? '관찰 숫자 (모르면 빈칸)' : shape === 'state' ? '관찰 상태 ACTIVE/INACTIVE/YES/NO/OBSERVED/NOT_OBSERVED (모르면 빈칸)' : shape === 'ammo' ? '같은 표시 counter의 before,after,poolLabel (쉼표 구분)' : shape === 'relationship' ? 'REPLACES/COEXISTS/PRECEDES/SHARES/SEPARATE/DISABLES/UNCHANGED (모르면 빈칸)' : shape === 'comparison' ? '각 설정 결과 ID/메모 (수치 비교는 별도 설정 기록으로 유지)' : '관찰 묘사 (모르면 빈칸)');
      if (value && shape !== 'comparison') {
        o.confidence = 'OBSERVED_ONCE'; o.observation = { result: 'CONCLUSIVE' };
        if (shape === 'number') { o.observation.value = Number(value); o.observation.unit = field.type === 'CARD_HEALTH' ? 'hp' : field.type === 'SUMMONED_DURATION' ? 'seconds' : 'models'; }
        else if (shape === 'state') o.observation.state = value;
        else if (shape === 'ammo') { const [before, after, ...label] = value.split(','); o.observation = { result: 'CONCLUSIVE', before: Number(before), after: Number(after), poolLabel: label.join(',').trim() }; }
        else if (shape === 'relationship') o.observation.relationship = value;
        else o.observation.description = value;
      }
      o.observation.notes = await ask('보인 사실/제약/손실 후 HP 및 count 변화/영상 시점 메모', shape === 'comparison' ? value : '');
      if (!['CARD_MODEL_COUNT', 'CARD_HEALTH', 'UNIT_SIZE_COMPARISON'].includes(field.type)) {
        const paths = [...job.expectedStaticEvidence.entityPaths.map(p => ({ ...p, kind: 'entity' })), ...job.expectedStaticEvidence.missilePaths.map(p => ({ ...p, kind: 'missile' }))];
        if (await ask('신뢰 가능한 runtime 도구로 exact path를 직접 확인했나요? y/n (발사 위치만 보였으면 n)', 'n') === 'y') {
          io.write(paths.map((p, n) => `${n + 1}. ${p.kind} ${p.role} ${p.entityKey ?? p.weaponKey}`).join('\n') + '\n');
          const selected = (await ask('확인한 path 번호들, 쉼표 구분')).split(',').map(x => paths[Number(x.trim()) - 1]).filter(Boolean);
          o.entityPathIds = selected.filter(p => p.kind === 'entity').map(p => p.pathId); o.missilePathIds = selected.filter(p => p.kind === 'missile').map(p => p.pathId);
          if (selected.length && reference) o.pathBinding = 'EXACT_PATH_OBSERVED';
        } else o.pathBinding = 'COMPONENT_ROLE_ONLY';
      }
      const validation = validateRuntimeEvidence({ format: FORMAT, observations: [o] }, index);
      if (validation.status === 'REJECTED') { io.write(`유효하지 않은 기록: ${JSON.stringify(validation.errors)}\n`); o.recordingErrors = validation.errors; }
      observations.push(o); // Preserve invalid manual input too; ingestion rejects it.
      // Save after every answer so a long battle session does not lose its evidence.
      await saveJSON(bundleDir, `recording-${session}-${observations.length}.json`, { format: FORMAT, observations });
    }
    io.write(`지금까지 ${observations.length}건 저장. 같은 job을 다시 선택하면 독립 repetition을 기록할 수 있습니다. 다른 component/손실 후 관찰도 다시 선택하고 subject/samplePoint를 구별하세요.\n`);
  }
  return { observations: observations.length, latestFile: observations.length ? resolve(bundleDir, `recording-${session}-${observations.length}.json`) : null };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const rl = createInterface({ input: stdin, output: stdout });
  const io = { question: q => rl.question(q), write: s => stdout.write(s) };
  try { const { options } = args(['record', ...process.argv.slice(2)]); if (!options['bundle-dir']) throw new Error('record.mjs --bundle-dir <prepared directory>'); console.log(await record(options['bundle-dir'], io)); }
  catch (e) { console.error(e.message); process.exitCode = 1; } finally { rl.close(); }
}
