# Resistance follow-up audit

Current base-field holds: 0. All 1,110 exact land rows explicitly contain five valid resistance fields; no missing value was turned into zero.

- Fresh live-game card readings are unavailable. Confirm unmodified cards for zero, nonzero, multiple resistance, ward 8, fire -25, flight and mounted/vehicle samples. Record game version, mods, rank, effects and passive activation. Expected/actual pack comparisons are not direct UI measurements.
- Passive/active phase effects can change a visible card even at battle start. Base land fire=0 with regeneration phase weakness is intentionally still base 0. Do not silently promote effective resistance. Keep raw phase refs in report.json and existing ability sources; activation/stacking resolution needs another task.
- Character audit: wh_main_emp_cha_captain_0, wh_main_emp_cha_captain_1, wh_main_emp_cha_karl_franz_0, wh_main_emp_cha_karl_franz_1. Separate character schema/canonical mount contexts were not modified. Their raw values are audit-only.
- Campaign magic-resistance bonus operation and consumer applicability remain unresolved in the existing resistance-research evidence. This task does not alter that policy or implement a dynamic effect/damage engine.
- For future sources, missing/ambiguous land references, absent named fields or invalid I32 values must stay UNKNOWN per field. Negative nonfire base fields require semantic review. Never apply schema defaults to missing decoded rows.
- UI display clamps and CA's published aggregate 90% combat cap do not clamp stored independent base fields.

Full current exceptions: []
