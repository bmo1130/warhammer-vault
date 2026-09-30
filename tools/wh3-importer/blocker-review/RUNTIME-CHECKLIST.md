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

Separately decide the **editorial catalog scope** and canonical key mappings.
Runtime observations cannot decide whether the catalog should include campaign,
custom-battle, supply, cross-faction or summoned variants; that is a product policy.
