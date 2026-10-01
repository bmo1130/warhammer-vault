# Runtime verification checklist

No items below were verified by this DB-only task. Record game patch, enabled
mods, unit-size setting, mode/faction, rank and active effects for every observation.
Capture the unit card and a short firing/casualty recording where relevant.

- [ ] **Dread Saurian:** distinguish blowpipe and javelin rider shots. Record which
  ammo display/pool decreases, how much per volley, and whether pools are shared
  across riders. Check simultaneous fire and firing while the mount is in melee.
- [ ] **Necrofex:** separately observe cannon and rider-rifle fire, ammunition
  consumption and displayed statistics. Check whether loss/disablement of a rider
  changes firing without changing the displayed main entity count.
- [ ] **Composite counts:** for Necrofex, Dread Saurian, Black Coach and Skeleton
  Chariots, compare at least two unit-size settings; record displayed count,
  mount/engine/crew bodies, casualty and HP changes. Determine whether attachment
  slots repeat per vehicle. Do not sum raw counts as the expected answer.
- [ ] **Free Company, four states:** neither effect, Volkmar's corresponding
  skill only, Gunnery School ritual only, and both. Record active effects and
  observed projectile/explosion behavior to determine replacement and precedence.
- [ ] **Free Company transitions:** after gaining/removing effects, compare
  campaign card and battle behavior, commander transfer and turn transition.
  Determine activation timing and whether ritual duration=0 means persistence.
- [ ] **Availability, only for the chosen catalog scope:** verify Imperial Supply
  versus ordinary Empire variants, Arkhan versus Vampire Counts variants,
  Beastmen versus Chaos Warhounds, prologue versus normal Flamers, and summoned
  versus ordinary Bloodthirster/Crypt Horrors/Zombies in the relevant mode. Record
  the underlying unit key if a trustworthy diagnostic exposes it; display name
  alone cannot identify the candidate. Do not infer actual availability from a
  permission/building row alone.

Maintain **editorial catalog scope** and exact-key decisions separately from
runtime observations. Runtime cannot decide whether the catalog should include
campaign, custom-battle, supply, cross-faction or summoned variants.

The current editorial default is explicit faction-roster entries. Arkhan Crypt
Horrors/Hexwraiths and both faction Warhounds are retained as separate roster
contexts. Imperial Supply, ability-spawn and nonstandard Flamers roots remain
addressable contexts outside that default. These decisions do not establish live
recruitment/availability; see `../CATALOG-IDENTITY.md`.

- [ ] **Ability-spawn identity:** in Greater Gate of Khorne, the upgraded Strigoi
  Raise Dead and standard Raise Dead cases, record the spawned unit's trustworthy
  main/land key if exposed, duration and restrictions. DB `spawned_unit` identifies
  a land record; it does not specify a universal main-root runtime selection rule.
- [ ] **Nonstandard Flamers:** identify which prologue/scenario actually uses
  `wh3_main_pro_tze_mon_flamers_0`. Do not treat its pro-group permission or key
  spelling as proof of scenario activation.

No runtime action is needed to approve displaying both Beastmen/Chaos Warhounds or
the Arkhan entries: that editorial policy is already explicit. Record availability
as a separate sourced fact, without redefining the catalog identity.

The explicit-context diagnostic materialization run adds three main-specific
missile-junction observations without establishing activation conditions:

- [ ] **Ordinary Empire alternate weapons:** for Helstorm and Handgunners, compare
  the base chain with `wh_main_emp_rocket_battery_upgraded` and
  `wh_main_emp_rifle_upgraded` under recorded active effects. For Steam Tank,
  inspect `wh3_dlc25_emp_steam_tank_cannon_ball_exploding` and its accompanying
  `wh3_dlc25_emp_veh_steam_tank_cannon` raw stats override. Record activation,
  replacement and persistence; DB junctions alone do not prove when they apply.
  Keep Imperial Supply roots separate even when the land row is shared.

Successful diagnostic Unit validation does not verify runtime behavior or
production eligibility. See `../MATERIALIZATION.md` for the separate contract.

## Missile observations after static source collection

These are manual observations for a later session; this task did not launch the
game. No console or unknown diagnostic command is required. Keep a clean save
before each intervention; record patch, mods, unit-size setting, faction/context,
commander, ranks, technologies, active effect icons and battle type. Use the same
stationary target, distance and firing interval, with camera close enough to
identify firing components. Record the card and a short video before/after.
Do not identify an exact source key from its display name alone. If the game does
not expose a trustworthy key, label the faction/recruitment context and mark
source-key confirmation unavailable.

- [ ] **Empire baseline and effects:** in the relevant campaign, save before
  acquiring a Gunnery School upgrade, then compare ordinary Helstorm, Handgunners
  and Steam Tank before/after the available upgrade. Record effect icon/tooltip
  and the actual projectile/explosion, range, reload and ammo display. Do not
  equate an effect's DB key with proven activation. Helstorm's effect has no
  enabling skill/bundle/ritual row in the bounded source investigation: first
  identify a reproducible in-game intervention, or leave its trigger unresolved.
- [ ] **Empire timing and Supply control:** compare campaign card, next battle,
  turn transition and removal/expiry of an effect when removal is actually possible.
  Repeat with Imperial Supply recruitment in its faction campaign as a separate
  control. Never assume ordinary-only junctions apply to Supply. Steam Tank has
  cannon, steam-gun and engineer-pistol attachment paths in both contexts: record
  each firing component as well as ordinary exploding-cannon activation and
  any companion stats change. Observe replacement vs simultaneous fire; do not
  infer either from row order or a shared weapon key.
- [ ] **Free Company four states:** save before Volkmar's Mere Mortal Men skill
  and before the applicable Gunnery School upgrade. Where the campaign legitimately
  permits it, compare neither, skill only, ritual only, and both. Record effects,
  projectile appearance/explosions and firing behavior against the same target.
  If both cannot be obtained together, record that limitation instead of inventing
  a combined result. Determine replacement, coexistence/stacking and precedence
  from observations, without summing damage.
- [ ] **Free Company transitions:** for each attainable state compare campaign
  card, entering the first battle, commander transfer and a turn transition.
  Compare loss/expiry only when reproducible. Record the exact point behavior
  changes; absence of an expiry observation does not prove persistence.
- [ ] **Dread Saurian:** in a repeatable custom battle/campaign battle, film
  stationary ranged fire, then melee with a target in rider range. Distinguish
  blowpipe vs javelin shots and simultaneous fire. Track visible ammo counters
  during fixed time intervals; do not multiply by the 2/10 attachment counts.
  If rider casualties/disablement can be observed independently, record the
  change in firing; otherwise mark rider-loss semantics unverified.
- [ ] **Necrofex:** use the same ranged/melee observation sequence for cannon and
  rider rifles. Record simultaneous fire and which displayed ammo counter changes.
  Observe rider disablement only if distinguishable from death/damage of the
  entire Necrofex. Do not translate five attachment paths into five models or a
  volley multiplier.

The [missile sidecar](../MISSILE-SEMANTICS.md) records existence, placement and raw
pool/fire flags. These checks establish activation/combination/ammo behavior;
they do not approve catalog scope, composite count/HP/mass formulas or full import.
