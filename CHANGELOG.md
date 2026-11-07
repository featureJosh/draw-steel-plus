# Changelog

## v2.4.0

Compatibility update for Draw Steel **1.2.0** (Foundry VTT 14.370+). The module now requires Draw Steel 1.2.0 or later.

### Added

- **DS+ Companion Sheet** for the new Companion actor type (Beastheart companions): DS+ header with master link, level-up and advancement controls, and a sidebar showing stamina, the master's recoveries, free strike, the master's heroic resource and surges, combat stats, immunities/weaknesses and skills.
- **DS+ Minion Sheet**, a restyled version of the system's new single-page minion stat block (selectable for any NPC): stat strip with squad stamina, free strike with damage type, immunities/weaknesses, the read-only With Captain rider, characteristics, features, abilities and effects with DS+ item lists, tooltips and search.
- Improved Chat styling for the new **per-target ability results** (target portrait, tier glyph, per-target effect text, potency outcomes, owner-only apply buttons) and the new **falling** message part.
- Improved Chat styling for the 1.2.0 roll presentation: power rolls show the tier beside the total, and damage/heal buttons with damage-type icons now live inside the roll.
- Companion header art settings (enable toggle and custom image) alongside the existing sheet types.
- Free strike damage type is shown next to the free strike value on NPC, retainer, companion and compact sheets; the NPC free strike type is editable in edit mode.

### Changed

- NPC and retainer sheets read the new `system.freeStrike.value` data path and use the system's `editable` / `owner` gates for the free strike button instead of GM-only.
- The With Captain rider on NPC sheets is now read-only; Draw Steel 1.2.0 enables/disables it automatically from the squad's captain.
- Sheet re-renders requested by the system for `stats` or `body` parts are mapped onto the DS+ sidebar and ignored when the sheet has no such part, avoiding Foundry's unknown-part warnings.

### Fixed

- Party member buttons, the ability target placeholder and the tooltip power roll label referenced localization keys that do not exist upstream.
- The socketlib-unavailable warning had no localized text.
