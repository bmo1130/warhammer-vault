// Follow only the recorded forward schema joins; ambiguity stays unknown.
export function observationContext(dump) {
  const byId = new Map(dump.rows.map((record) => [record.id, record]));
  const root = byId.get(dump.rootRow);
  const follow = (record, field) => {
    const targets = dump.relationships.filter((edge) => edge.from === record?.id && edge.field === field && edge.direction === 'forward').map((edge) => byId.get(edge.to));
    return targets.length === 1 ? targets[0] : undefined;
  };
  const land = follow(root, 'land_unit');
  const weapon = follow(land, 'primary_melee_weapon');
  const armor = follow(land, 'armour');
  const shield = follow(land, 'shield');
  const rider = follow(land, 'man_entity');
  const mount = follow(land, 'mount');
  const mountEntity = follow(mount, 'entity');
  const engine = follow(land, 'engine');
  const engineEntity = follow(engine, 'battle_entity');
  const missile = follow(engine, 'missile_weapon') ?? follow(land, 'primary_missile_weapon');
  const projectile = follow(missile, 'default_projectile');
  const explosion = follow(projectile, 'explosion_type');
  const penetration = follow(projectile, 'projectile_penetration');
  return { root, land, weapon, armor, shield, rider, mountEntity, engine, engineEntity, missile, projectile, explosion, penetration };
}
