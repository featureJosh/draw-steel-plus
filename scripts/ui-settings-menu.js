import { MODULE_CONFIG, SCALE_DEFAULTS, UI_DEFAULTS } from "./config.js";
import {
  ApplicationV2,
  HandlebarsApplicationMixin,
  SETTINGS_FORM_BUTTONS,
  booleanSettingContext,
  settingsMenuOptions,
  settingsMenuParts,
} from "./settings-menu-helpers.js";

const MODULE_ID = MODULE_CONFIG.id;

const UI_MENU_DEFAULTS = {
  fontScale: SCALE_DEFAULTS.fontScale,
  floatingNavTabs: true,
  improvedChat: UI_DEFAULTS.improvedChat,
  useCustomMetaCurrency: UI_DEFAULTS.useCustomMetaCurrency,
  floatingUIGridSize: 20,
  floatingUIShowOverlay: true,
};

export default class UISettingsMenu extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  static DEFAULT_OPTIONS = settingsMenuOptions({
    id: "dsp-ui-settings",
    width: 520,
    title: "DRAW_STEEL_PLUS.Settings.menus.ui.name",
    icon: "fa-solid fa-display",
    actions: {
      resetDefaults: this.resetDefaults,
    },
    handler: this.onSubmit,
  });

  static PARTS = settingsMenuParts(
    "body",
    `modules/${MODULE_ID}/templates/settings/ui-settings.hbs`,
  );

  async _prepareContext(options) {
    const boolField = new foundry.data.fields.BooleanField();
    return {
      fontScale: {
        field: new foundry.data.fields.NumberField({
          min: 0.75,
          max: 1.5,
          step: 0.05,
        }),
        value: game.settings.get(MODULE_ID, "fontScale"),
        label: game.i18n.localize("DRAW_STEEL_PLUS.Settings.fontScale.name"),
        hint: game.i18n.localize("DRAW_STEEL_PLUS.Settings.fontScale.hint"),
      },
      floatingNavTabs: booleanSettingContext(
        MODULE_ID,
        "floatingNavTabs",
        boolField,
      ),
      improvedChat: booleanSettingContext(MODULE_ID, "improvedChat", boolField),
      useCustomMetaCurrency: booleanSettingContext(
        MODULE_ID,
        "useCustomMetaCurrency",
        boolField,
      ),
      floatingUIGridSize: {
        field: new foundry.data.fields.NumberField({
          min: 4,
          max: 80,
          step: 2,
          integer: true,
        }),
        value: game.settings.get(MODULE_ID, "floatingUIGridSize"),
        label: game.i18n.localize(
          "DRAW_STEEL_PLUS.Settings.floatingUIGridSize.name",
        ),
        hint: game.i18n.localize(
          "DRAW_STEEL_PLUS.Settings.floatingUIGridSize.hint",
        ),
      },
      floatingUIShowOverlay: booleanSettingContext(
        MODULE_ID,
        "floatingUIShowOverlay",
        boolField,
      ),
      buttons: SETTINGS_FORM_BUTTONS,
    };
  }

  static async onSubmit(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    await Promise.all([
      game.settings.set(
        MODULE_ID,
        "fontScale",
        Number(data.fontScale ?? UI_MENU_DEFAULTS.fontScale),
      ),
      game.settings.set(
        MODULE_ID,
        "floatingNavTabs",
        data.floatingNavTabs ?? UI_MENU_DEFAULTS.floatingNavTabs,
      ),
      game.settings.set(
        MODULE_ID,
        "improvedChat",
        data.improvedChat ?? UI_MENU_DEFAULTS.improvedChat,
      ),
      game.settings.set(
        MODULE_ID,
        "useCustomMetaCurrency",
        data.useCustomMetaCurrency ?? UI_MENU_DEFAULTS.useCustomMetaCurrency,
      ),
      game.settings.set(
        MODULE_ID,
        "floatingUIGridSize",
        Number(data.floatingUIGridSize ?? UI_MENU_DEFAULTS.floatingUIGridSize),
      ),
      game.settings.set(
        MODULE_ID,
        "floatingUIShowOverlay",
        data.floatingUIShowOverlay ?? UI_MENU_DEFAULTS.floatingUIShowOverlay,
      ),
    ]);
  }

  static async resetDefaults() {
    await Promise.all(
      Object.entries(UI_MENU_DEFAULTS).map(([key, value]) =>
        game.settings.set(MODULE_ID, key, value),
      ),
    );
    this.render();
  }
}
