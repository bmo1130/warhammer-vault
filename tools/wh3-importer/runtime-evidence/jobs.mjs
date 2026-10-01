import { digest, observationTemplate, sourceContextKey } from './contract.mjs';

const K = {
  skeleton: 'wh2_dlc09_tmb_veh_skeleton_chariot_0', coach: 'wh_main_vmp_veh_black_coach', necro: 'wh2_dlc11_cst_mon_necrofex_colossus_0', dread: 'wh2_dlc13_lzd_mon_dread_saurian_1',
  free: 'wh_dlc04_emp_inf_free_company_militia_0', tank: 'wh_main_emp_veh_steam_tank', handgun: 'wh_main_emp_inf_handgunners', rocket: 'wh_main_emp_art_helstorm_rocket_battery',
};
const questions = {
  CARD_MODEL_COUNT: '카드에 표시된 모델 수를 그대로 기록하세요. raw count를 대신 적지 마세요.', CARD_HEALTH: '전투 시작 직후 피해 없는 유닛의 카드 HP를 기록하세요. 모호한 총 HP/개체 HP 표시는 notes에 구별해 적으세요.',
  VISIBLE_COMPONENT_COUNT: '보이는 본체/기병/말/승무원 수를 component별로 기록하세요. 가려진 경우 INCONCLUSIVE입니다.',
  TARGETABLE_COMPONENT: 'component를 따로 공격 대상으로 지정할 수 있는지 관찰하세요. 클릭 불가만으로 피해 판정 불가를 결론내리지 마세요.',
  COMPONENT_CASUALTY: '본체/말/승무원 중 실제로 사라지는 component와 카드 수 변화를 기록하세요.', COMPONENT_DEATH: 'component 사망/분리 관찰을 기록하세요. 사망 animation과 독립 casualty를 구별하세요.',
  COMPONENT_WEAPON_DISABLE: 'component 손실 전후 발사 변화를 기록하세요. 사거리·탄약·시야·명령 상태가 같지 않으면 보류하세요.',
  UNIT_SIZE_COMPARISON: 'Medium와 Ultra의 별도 기록 ID를 notes에 적으세요. 비율/공식은 만들지 마세요.',
  PROJECTILE_PROFILE_ACTIVE: '실제 보이는 탄도/폭발/분열/발사 위치를 묘사하세요. 보이는 효과만으로 DB weapon key를 확정하지 마세요.',
  WEAPON_PATH_ACTIVE: '발사하는 component/weapon을 기록하세요. exact path를 확인할 수 없으면 COMPONENT_ROLE_ONLY로 보존하세요.',
  WEAPON_REPLACEMENT: '기본 발사가 사라지고 다른 발사로 교체되는지 기록하세요. 두 path를 구별 못하면 INCONCLUSIVE입니다.',
  WEAPON_COEXISTENCE: '서로 다른 발사 위치/프로필이 같은 조건에서 함께 firing하는지 기록하세요.', OVERRIDE_PRECEDENCE: '단일 effect 상태와 both 상태를 비교하세요. 다른 조건이면 precedence를 결론내리지 마세요.',
  AMMO_POOL_CONSUMPTION: '눈에 보이는 같은 ammo counter의 before/after와 pool label을 기록하세요. main/rider를 합산하지 마세요.',
  AMMO_POOL_SHARING: 'component별 발사 전후 각 표시 counter를 notes에 기록하세요. counter가 하나라는 사실만으로 pool 공유를 확정하지 마세요.',
  FIRE_IN_MELEE: '근접 진입 전후 발사를 관찰하세요. 발사 위치/대상/탄약을 함께 notes에 남기세요.', RIDER_LOSS_WEAPON_DISABLE: 'rider 손실 전후 rifle/blowpipe/javelin과 본체 발사를 별도로 기록하세요.',
  RECRUITMENT_AVAILABLE: '실제 모집 화면/자격 조건을 기록하세요. roster policy와 availability는 별개입니다.', SUMMONED_MAIN_IDENTITY: '정확한 key를 보여주는 신뢰 가능한 방법이 있는지 기록하세요. 카드 이름만 있으면 key 확인 불가입니다.',
  SUMMONED_DURATION: '소환부터 소멸까지 실제 시간을 기록하세요. 전투 종료/조건부 소멸은 notes에 별도로 적으세요.',
  SUPPLY_VARIANT_AVAILABILITY: '실제 Supply 획득 경로와 ordinary와의 구분 방법을 기록하세요.', ARKHAN_VARIANT_AVAILABILITY: 'Arkhan faction의 실제 모집 가능 여부/조건을 기록하세요.',
  NONSTANDARD_SCENARIO_AVAILABILITY: '등장하는 실제 scenario/prologue와 normal roster 구분을 기록하세요. 미발견이면 부재를 단정하지 마세요.',
};
const entityTypes = ['CARD_MODEL_COUNT', 'CARD_HEALTH', 'VISIBLE_COMPONENT_COUNT', 'TARGETABLE_COMPONENT', 'COMPONENT_CASUALTY', 'COMPONENT_DEATH'];
const missileTypes = ['PROJECTILE_PROFILE_ACTIVE', 'WEAPON_PATH_ACTIVE', 'WEAPON_REPLACEMENT', 'WEAPON_COEXISTENCE', 'AMMO_POOL_CONSUMPTION', 'AMMO_POOL_SHARING'];
export function generateJobs(index) {
  const jobs = [], templates = [], byKey = new Map(index.subjects.map(s => [sourceContextKey(s.sourceMainKey, s.contextId), s]));
  function add(main, ctx, priority, scenario, size, types, extraSteps = [], dependencies = []) {
    const s = byKey.get(sourceContextKey(main, ctx)); if (!s) throw new Error(`Runtime job lacks reviewed exact source: ${main}/${ctx}`);
    const id = `runtime:${encodeURIComponent(main)}:${encodeURIComponent(ctx ?? 'diagnostic-null')}:${scenario}:${size}`;
    const campaign = priority === 'P3' || scenario !== 'entity' && scenario !== 'rider-ammo';
    const job = { id, priority, subject: s.displayName, sourceMainKey: main, sourceLandKey: s.sourceLandKey, contextId: ctx, catalogEntryId: s.catalogEntryId,
      unitSize: size, scenarioId: scenario, status: 'PENDING', setupReadiness: campaign ? 'MANUAL_SETUP_REQUIRED' : 'CUSTOM_BATTLE_IF_LISTED',
      requiredSetup: { battleMode: campaign ? 'CAMPAIGN_OR_VERIFIED_SAVE_REQUIRED' : 'CUSTOM_BATTLE_IF_LISTED', factionId: s.factionId, unitSize: size,
        condition: scenario, staticLinkedEffectKeys: s.knownConditionKeys, mods: 'NONE_FOR_RESOLUTION', exactRuntimeIdentity: 'REQUIRES_TRUSTWORTHY_REFERENCE; otherwise CONTEXT_ONLY is recordable', skills: 'RECORD', rituals: 'RECORD', effects: 'RECORD', technologies: 'RECORD', buildings: 'RECORD' },
      steps: [
        `설정에서 Unit Size ${size === 'NOT_RECORDED' ? '현재 값' : size}를 확인하고 기록합니다. 설치된 game version과 mods도 적습니다.`,
        campaign ? '해당 조건을 실제로 만든 campaign/save를 준비합니다. 확실한 unlock/console command는 제시하지 않습니다. 준비가 안 되면 PENDING 또는 INCONCLUSIVE로 남깁니다.' : `Custom Battle에서 ${s.factionId}의 ${s.displayName}을 찾습니다. 목록에 없으면 동일 이름을 대신 선택하지 말고 campaign/manual setup으로 보류합니다.`,
        '유닛 rank/lord/skill/ritual/effect/technology/building과 summoned/Supply 상태를 기록합니다. 모르면 NOT_RECORDED/UNKNOWN입니다.',
        '원래 이름/카드/faction만으로 exact main key를 확인했다고 적지 않습니다. 카드와 설정 screenshot을 남깁니다.',
        ...extraSteps, '새 battle/trial에서 같은 조건을 다시 관찰합니다. trialId를 다르게 적고 각 screenshot/video reference를 보존합니다.',
      ], observationTypes: [...new Set(types)], fieldsToRecord: types.map(type => ({ type, prompt: questions[type] })), dependencies,
      expectedStaticEvidence: { staticSnapshotId: index.snapshotId, entityCompleteness: s.entity?.completeness ?? 'NOT_INSPECTED',
        rawCardinality: s.entity?.rawCardinality ?? null, entityPaths: s.entity?.paths.map(p => ({ pathId: p.pathId, role: p.role, entityKey: p.entityKey })) ?? [],
        missileCompleteness: s.missile?.completeness ?? 'NOT_INSPECTED', missilePaths: s.missile?.paths.map(p => ({ pathId: p.pathId, role: p.role, weaponKey: p.weaponKey, activation: p.activation, condition: p.condition })) ?? [],
        warning: 'Expected static paths are not runtime confirmations. Counts/slots are not models, shots or HP multipliers.' } };
    jobs.push(job);
    templates.push({ jobId: id, status: 'PENDING', observations: types.map(type => observationTemplate(s, job, type)) });
    return id;
  }
  for (const name of ['skeleton', 'coach', 'necro', 'dread']) {
    let medium;
    for (const size of ['MEDIUM', 'ULTRA']) {
      const types = [...entityTypes, ...(name === 'necro' || name === 'dread' ? ['COMPONENT_WEAPON_DISABLE'] : []), ...(size === 'ULTRA' ? ['UNIT_SIZE_COMPARISON'] : [])];
      const details = { skeleton: '전차/말/승무원을 따로 관찰합니다. raw 24/2/12를 화면 수와 직접 대응시키지 않습니다.', coach: 'horse/coach/crew와 articulated 부분을 구별해 관찰합니다.', necro: 'rider 수와 rifle 발사, 본체 cannon 유지, 손실 시 HP bar를 별도로 기록합니다.', dread: 'rider와 본체를 구별하고 blowpipe/javelin 발사 위치, rider 손실과 본체 HP bar를 기록합니다.' }[name];
      const id = add(K[name], null, 'P0', 'entity', size, types, ['피해 없는 전투 시작 카드 count/HP를 먼저 찍습니다.', details, '손실 후 카드 HP/count와 component 변화를 다른 samplePoint로 기록합니다.'], medium ? [medium] : []);
      if (size === 'MEDIUM') medium = id;
    }
  }
  const freeStates = ['no-effect', 'volkmar-only', 'gunnery-only', 'both'];
  const freeIds = [];
  for (const state of freeStates) freeIds.push(add(K.free, null, 'P1', state, 'ULTRA', [...missileTypes, 'OVERRIDE_PRECEDENCE'], [
    `Free Company ${state}: 실제 활성 상태를 먼저 확인합니다. both 상태를 만들 수 없으면 테스트 제한을 기록합니다.`,
    'Volkmar skill: static wh2_dlc17_skill_emp_volkmar_unique_mere_mortal_men. Gunnery bundle: wh3_dlc25_ritual_emp_don_inf_guns_3. DB 연결은 runtime unlock 절차를 보장하지 않습니다.',
    '같은 대상/거리/명령으로 firing을 비교하고 battle 시작 전/후 및 turn/session 전환을 기록합니다.',
  ], state === 'both' ? freeIds.slice(0, 3) : []));
  for (const [name, main, supply] of [
    ['tank', K.tank, 'wh2_dlc13_emp_veh_steam_tank_imperial_supply'], ['handgun', K.handgun, 'wh2_dlc13_emp_inf_handgunners_imperial_supply'], ['rocket', K.rocket, 'wh2_dlc13_emp_art_helstorm_rocket_battery_imperial_supply'],
  ]) for (const [key, ctx] of [[main, 'empire_roster'], [supply, 'empire_imperial_supply']]) for (const state of ['base', 'effect']) add(key, ctx, 'P1', state, 'ULTRA', missileTypes, [
    'effect 조건을 실제로 확인할 수 있는 campaign/save만 사용합니다. 어떤 effect인지 미확정이면 MANUAL_SETUP_REQUIRED로 남깁니다.',
    name === 'tank' ? 'cannon/steam gun/engineer pistol/exploding projectile을 각각 관찰합니다. 한 counter를 모든 weapon ammo라고 가정하지 않습니다.' : 'base와 effect 활성 조건에서 projectile/발사 위치/교체·동시 발사/ammo를 비교합니다.',
    'ordinary와 Supply는 separate exact source입니다. ordinary junction이 Supply에도 활성이라고 가정하지 않습니다.',
  ]);
  for (const name of ['dread', 'necro']) add(K[name], null, 'P2', 'rider-ammo', 'ULTRA', ['WEAPON_PATH_ACTIVE', 'WEAPON_COEXISTENCE', 'AMMO_POOL_CONSUMPTION', 'AMMO_POOL_SHARING', 'FIRE_IN_MELEE', 'RIDER_LOSS_WEAPON_DISABLE'], [
    name === 'dread' ? 'blowpipe/javelin 동시 발사, 눈에 보이는 primary/secondary counter, 근접 중 발사를 관찰합니다.' : 'cannon/rider rifle 동시 발사와 각각의 발사 위치, 보이는 ammo counter를 관찰합니다.',
    'rider loss를 관찰할 수 있을 때만 loss 전후를 비교합니다. 사거리/시야/탄약/명령을 함께 확인하고 무기 disable을 추측하지 않습니다.',
  ]);
  for (const s of index.subjects.filter(s => s.presentation && !s.presentation.defaultVisible).sort((a, b) => sourceContextKey(a.sourceMainKey, a.contextId).localeCompare(sourceContextKey(b.sourceMainKey, b.contextId)))) {
    const classification = s.presentation.classification;
    const types = classification === 'SUMMONED_OR_SCRIPTED_VARIANT' ? ['SUMMONED_MAIN_IDENTITY', 'SUMMONED_DURATION'] : classification === 'CONTEXT_VARIANT' ? ['SUPPLY_VARIANT_AVAILABILITY'] : ['NONSTANDARD_SCENARIO_AVAILABILITY'];
    add(s.sourceMainKey, s.contextId, 'P3', 'availability', 'NOT_RECORDED', types, ['모집/소환/획득 화면과 실제 faction/context를 기록합니다. exact runtime key를 얻을 수 없으면 identity pending입니다.', '소환 duration/despawn 조건과 모집 catalog 정책을 분리합니다.']);
  }
  for (const main of ['wh2_dlc09_tmb_mon_crypt_horrors', 'wh2_dlc09_tmb_cav_hexwraiths']) add(main, 'tomb_kings_arkhan_roster', 'P3', 'arkhan-availability', 'NOT_RECORDED', ['ARKHAN_VARIANT_AVAILABILITY', 'RECRUITMENT_AVAILABLE']);
  return { manifest: { format: 'warhammer-vault-runtime-jobs-v1', staticSnapshotId: index.snapshotId, gameVersion: index.snapshot.gameVersion,
    priorityOrder: ['P0', 'P1', 'P2', 'P3'], jobs, counts: Object.fromEntries(['P0', 'P1', 'P2', 'P3'].map(p => [p, jobs.filter(j => j.priority === p).length])),
    gameExecuted: false, fullImport: false }, template: { format: 'warhammer-vault-runtime-recording-template-v1', staticSnapshotId: index.snapshotId, jobs: templates },
    recordingId: digest(jobs.map(j => j.id)) };
}
