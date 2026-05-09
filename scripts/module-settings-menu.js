import { MODULE_CONFIG, UI_DEFAULTS } from "./config.js";
import {
  ApplicationV2,
  HandlebarsApplicationMixin,
  SETTINGS_FORM_BUTTONS,
  booleanSettingContext,
  settingsMenuOptions,
  settingsMenuParts,
} from "./settings-menu-helpers.js";

const MODULE_ID = MODULE_CONFIG.id;

const MODULE_MENU_DEFAULTS = {
  useCombatTrackerPanel: UI_DEFAULTS.useCombatTrackerPanel,
  combatTrackerDspStyle: UI_DEFAULTS.combatTrackerDspStyle,
  useAbilityHudPanel: UI_DEFAULTS.useAbilityHudPanel,
  abilityHudDspStyle: UI_DEFAULTS.abilityHudDspStyle,
  targetDamageStyling: UI_DEFAULTS.targetDamageStyling,
};

export default class ModuleSettingsMenu extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  static DEFAULT_OPTIONS = settingsMenuOptions({
    id: "dsp-module-settings",
    width: 540,
    title: "DRAW_STEEL_PLUS.Settings.menus.modules.name",
    icon: "fa-solid fa-puzzle-piece",
    actions: {
      resetDefaults: this.resetDefaults,
    },
    handler: this.onSubmit,
  });

  static PARTS = settingsMenuParts(
    "body",
    `modules/${MODULE_ID}/templates/settings/module-settings.hbs`,
  );

  async _prepareContext(options) {
    const boolField = new foundry.data.fields.BooleanField();
    return {
      combatTrackerSection: game.i18n.localize(
        "DRAW_STEEL_PLUS.Settings.menus.modules.combatTrackerSection",
      ),
      abilityHudSection: game.i18n.localize(
        "DRAW_STEEL_PLUS.Settings.menus.modules.abilityHudSection",
      ),
      targetDamageSection: game.i18n.localize(
        "DRAW_STEEL_PLUS.Settings.menus.modules.targetDamageSection",
      ),
      useCombatTrackerPanel: booleanSettingContext(
        MODULE_ID,
        "useCombatTrackerPanel",
        boolField,
      ),
      combatTrackerDspStyle: booleanSettingContext(
        MODULE_ID,
        "combatTrackerDspStyle",
        boolField,
      ),
      useAbilityHudPanel: booleanSettingContext(
        MODULE_ID,
        "useAbilityHudPanel",
        boolField,
      ),
      abilityHudDspStyle: booleanSettingContext(
        MODULE_ID,
        "abilityHudDspStyle",
        boolField,
      ),
      targetDamageStyling: booleanSettingContext(
        MODULE_ID,
        "targetDamageStyling",
        boolField,
      ),
      buttons: SETTINGS_FORM_BUTTONS,
    };
  }

  static async onSubmit(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    await Promise.all(
      Object.keys(MODULE_MENU_DEFAULTS).map((key) =>
        game.settings.set(
          MODULE_ID,
          key,
          data[key] ?? MODULE_MENU_DEFAULTS[key],
        ),
      ),
    );
  }

  static async resetDefaults() {
    await Promise.all(
      Object.entries(MODULE_MENU_DEFAULTS).map(([key, value]) =>
        game.settings.set(MODULE_ID, key, value),
      ),
    );
    this.render();
  }
}
