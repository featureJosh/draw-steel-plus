import { MODULE_CONFIG, UI_DEFAULTS } from "./config.js";

const MODULE_ID = MODULE_CONFIG.id;

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

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
  static DEFAULT_OPTIONS = {
    id: "dsp-module-settings",
    tag: "form",
    classes: ["standard-form"],
    position: { width: 540 },
    window: {
      title: "DRAW_STEEL_PLUS.Settings.menus.modules.name",
      icon: "fa-solid fa-puzzle-piece",
    },
    actions: {
      resetDefaults: this.resetDefaults,
    },
    form: {
      closeOnSubmit: true,
      handler: this.onSubmit,
    },
  };

  static PARTS = {
    body: {
      template: `modules/${MODULE_ID}/templates/settings/module-settings.hbs`,
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

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
      useCombatTrackerPanel: {
        field: boolField,
        value: game.settings.get(MODULE_ID, "useCombatTrackerPanel"),
        label: game.i18n.localize(
          "DRAW_STEEL_PLUS.Settings.useCombatTrackerPanel.name",
        ),
        hint: game.i18n.localize(
          "DRAW_STEEL_PLUS.Settings.useCombatTrackerPanel.hint",
        ),
      },
      combatTrackerDspStyle: {
        field: boolField,
        value: game.settings.get(MODULE_ID, "combatTrackerDspStyle"),
        label: game.i18n.localize(
          "DRAW_STEEL_PLUS.Settings.combatTrackerDspStyle.name",
        ),
        hint: game.i18n.localize(
          "DRAW_STEEL_PLUS.Settings.combatTrackerDspStyle.hint",
        ),
      },
      useAbilityHudPanel: {
        field: boolField,
        value: game.settings.get(MODULE_ID, "useAbilityHudPanel"),
        label: game.i18n.localize(
          "DRAW_STEEL_PLUS.Settings.useAbilityHudPanel.name",
        ),
        hint: game.i18n.localize(
          "DRAW_STEEL_PLUS.Settings.useAbilityHudPanel.hint",
        ),
      },
      abilityHudDspStyle: {
        field: boolField,
        value: game.settings.get(MODULE_ID, "abilityHudDspStyle"),
        label: game.i18n.localize(
          "DRAW_STEEL_PLUS.Settings.abilityHudDspStyle.name",
        ),
        hint: game.i18n.localize(
          "DRAW_STEEL_PLUS.Settings.abilityHudDspStyle.hint",
        ),
      },
      targetDamageStyling: {
        field: boolField,
        value: game.settings.get(MODULE_ID, "targetDamageStyling"),
        label: game.i18n.localize(
          "DRAW_STEEL_PLUS.Settings.targetDamageStyling.name",
        ),
        hint: game.i18n.localize(
          "DRAW_STEEL_PLUS.Settings.targetDamageStyling.hint",
        ),
      },
      buttons: [
        {
          type: "button",
          action: "resetDefaults",
          icon: "fas fa-arrow-rotate-left",
          label: "DRAW_STEEL_PLUS.Settings.resetDefaults",
        },
        {
          type: "submit",
          icon: "fas fa-save",
          label: "DRAW_STEEL_PLUS.Settings.saveChanges",
        },
      ],
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
