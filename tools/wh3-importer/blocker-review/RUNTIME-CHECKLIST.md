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
