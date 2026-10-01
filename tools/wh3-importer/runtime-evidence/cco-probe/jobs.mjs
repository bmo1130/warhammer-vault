export function generateProbeJobs(manifest) {
  const factionLabels = { vampire_counts: 'Vampire Counts / 뱀파이어 카운트', tomb_kings: 'Tomb Kings / 툼 킹',
    lizardmen: 'Lizardmen / 리자드맨', vampire_coast: 'Vampire Coast / 뱀파이어 코스트' };
  const jobs = ['MEDIUM', 'ULTRA'].flatMap(unitSize => manifest.units.map(u => ({
    id: `cco-p0:${u.sourceMainKey}:${unitSize}`, priority: 'P0', status: 'PENDING', sourceMainKey: u.sourceMainKey,
    sourceLandKey: u.sourceLandKey, contextId: u.contextId, subject: u.displayName, unitSize,
    requiredSetup: { battleMode: 'CUSTOM_BATTLE', unitSize, factionId: u.subject.factionId, mods: ['Execute External Lua File'],
      note: 'Record all other enabled mods; do not assume vanilla. Rank/effects/lord remain NOT_RECORDED unless supplied.' },
    steps: [
      `게임 설정 Unit Size를 ${unitSize}로 지정하고 helper의 -UnitSize도 ${unitSize}로 설치/갱신한다.`,
      `Custom Battle에서 ${factionLabels[u.subject.factionId] ?? u.subject.factionId} 진영의 ${u.displayName}을 고른다. 공격받기 전 해당 유닛 하나를 선택하고 F9를 누른다.`,
      '카메라를 가까이 옮기고 rider/crew/body/horse 등 보이는 부분에 마우스를 올린 채 F9를 누른다. 각 부분에서 반복한다. DB key를 읽거나 고르지 않는다.',
      ...(u.subject.missile.paths.length ? ['적에게 사격을 명령하고 전투를 재생한 상태에서 F10을 누른 뒤 5초 기다린다. 필요하면 반복한다.'] : []),
      '전투 종료 후 script log를 보존한다. 다른 Unit Size에서도 새 session 설치 후 반복한다.',
    ],
    fieldsToRecordAutomatically: ['NumEntities', 'NumEntitiesInitial', 'HealthValue', 'HealthMax', 'ManList', 'MountList', 'EngineList', 'EntityList', 'cursor entity identity',
      ...(u.subject.missile.paths.length ? ['ActiveProjectileContext.Key', 'IsFiringMissiles', 'entity reload state', 'PrimaryAmmoPercent', 'SecondaryAmmoPercent'] : [])],
    observationsNotRequiredFromUser: ['DB identity inference', 'rider/model count guessing', 'weapon/ammo pool identification by eye'],
    remainingManualContext: ['Actual Unit Size must match installer declaration', 'All enabled mods', 'Game version/update matching', 'Setup if buffs/skills are enabled'],
    runtimeLimits: ['NumEntities is a CCO logical count, not an admitted card count.', 'HealthMax does not identify component HP contribution.',
      'List membership and cursor hit do not prove independent targetability/casualty.', 'Single ActiveProjectileContext does not prove simultaneous source activation.'],
  })));
  const phase2 = manifest.units.map(u => ({ sourceMainKey: u.sourceMainKey, contextId: u.contextId, status: 'DEFERRED_UNTIL_CCO_OBSERVATIONS',
    trigger: 'CCO identity/list/projectile/reload/pool evidence cannot isolate component HP contribution or weapon-source attribution.',
    policy: { candidateChangesPerTest: 1, sharedVanillaEdits: false, recordClonePrefix: 'zz_runtime_probe_', candidateEdgeOnly: true },
    tests: u.subject.entity.paths.map(p => ({ candidatePathId: p.pathId, intervention: 'Clone the exact schema-connected candidate record; explicit reviewed HP delta only.',
      expectedObservation: 'Compare HealthMax and component/list presence against identical baseline; no HP aggregation formula.',
      rollback: 'Disable/remove the future dedicated pack and repeat baseline. Never alter vanilla pack.' })).concat(u.subject.missile.paths.map(p => ({ candidatePathId: p.pathId,
      intervention: 'Unique weapon/projectile clone with one reviewed range/reload/projectile fingerprint; repoint only this candidate edge.',
      expectedObservation: 'CCO projectile context/reload/pool change within the same setup; shared projectile remains attribution-limited.',
      rollback: 'Disable/remove future dedicated pack and repeat baseline.' }))),
    packGenerated: false }));
  return { format: 'warhammer-vault-cco-p0-jobs-v1', jobs, phase2, gameExecuted: false, packGenerated: false };
}
export function jobsMarkdown(plan) {
  return '# P0 battle CCO 관찰\n\nF9: 선택한 플레이어 유닛 snapshot + 현재 마우스 아래 entity. 첫 F9 이후 F10: 100ms 간격, 명목상 5초 missile trace. 전투 중 pause/배속과 실제 callback 지연은 그대로 로그에 남는다.\n\n' +
    plan.jobs.map(j => `## ${j.subject} / ${j.unitSize}\n\nJob: \`${j.id}\`\n\n${j.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n`).join('\n') +
    '\n카드 count/HP와 CCO count/HP의 동일성, component HP 분담, 독립 사망/targetability, 동시 다중 weapon은 이 probe가 자동 확정하지 않는다. Phase 2 pack은 관찰 이후에도 후보를 구분하지 못할 때만 검토한다.\n';
}
