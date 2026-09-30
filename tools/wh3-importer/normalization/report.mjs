const display = (value) => JSON.stringify(value).replaceAll('|', '\\|');
const manualPaths = {
  tier: 'classification.tier', customBattleCost: 'customBattle.cost', recruitmentCost: 'campaign.recruitmentCost', upkeep: 'campaign.upkeep', recruitmentTurns: 'campaign.recruitmentTurns',
  armor: 'defense.armor', shield: 'defense.shieldBlockChance', leadership: 'defense.leadership', meleeAttack: 'melee.meleeAttack', meleeDefense: 'defense.meleeDefense', chargeBonus: 'melee.chargeBonus',
  baseDamage: 'melee.damage.base', apDamage: 'melee.damage.armorPiercing', bonusLarge: 'melee.damage.bonusVsLarge', attackInterval: 'melee.attackInterval', weaponLength: 'melee.weaponLength',
};

// Manual data enters presentation only, after normalization and validation.
// This function never mutates the result or completes any unknown Unit field.
export function renderNormalizationSummary(result, manualReference) {
  const lines = [`# ${result.unit.name} normalization`, '', `Source kind: **${result.sourceKind}**; mode: **${result.mode}**.`, 'All mapped numeric stats/costs are current CA base DB values. No runtime effects applied.', '', '## Mapped', '', '| Unit field | Value | Kind | Source table / field | Row key |', '| --- | --- | --- | --- | --- |',
    ...result.provenance.fields.map((entry) => `| ${entry.field} | ${display(entry.value)} | ${entry.kind} | ${entry.source.table}.${entry.source.field} | ${display(entry.source.rowKey)} |`),
    '', '## Omitted', '', ...result.omitted.map((entry) => `- ${entry.field}: ${entry.reason} (topic: ${entry.semanticsStatus}; kind: ${entry.kind})`),
    '', '## Unmapped', '', ...result.unmapped.map((entry) => `- ${entry.kind} ${entry.caId}: ${entry.reason} (${entry.source.table}.${entry.source.field}, row ${entry.source.rowId})`),
    '', '## Warnings', '', ...result.warnings.map((entry) => `- ${entry.code}: ${entry.reason}`),
    '', '## Validation', '', 'Passed the existing validateUnits against the explicit staging faction catalog. The production app catalog is not changed.',
    '', '## Manual comparison only', '',
  ];
  if (manualReference) {
    for (const [label, expected] of Object.entries(manualReference.values)) {
      const entry = result.provenance.fields.find((entry) => entry.field === manualPaths[label]);
      if (entry && entry.value !== expected) lines.push(`- ${entry.field}: raw=${display(entry.value)}, manual=${display(expected)}. Values differ; manual version/context unknown, no correction applied.`);
    }
    lines.push('Manual derived/display values were not normalized. They cannot fill omitted fields.');
  } else lines.push('No independent manual comparison supplied.');
  lines.push('', '## Provenance', '', `Internal ID: ${result.provenance.identity.internalId}`, `CA main key: ${result.provenance.identity.caMainUnitKey}`, `CA land key: ${result.provenance.identity.caLandUnitKey}`, 'The result JSON preserves each raw row key/field, schema version, pack path and schema-backed join chain.', 'Unmapped source facts are retained; confirmed zero and false remain distinct from absent fields.', '');
  return lines.join('\n');
}
