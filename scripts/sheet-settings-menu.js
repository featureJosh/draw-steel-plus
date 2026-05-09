import { MODULE_CONFIG } from "./config.js";
import {
  ApplicationV2,
  HandlebarsApplicationMixin,
  SETTINGS_FORM_BUTTONS,
  booleanSettingContext,
  settingsMenuOptions,
  settingsMenuParts,
} from "./settings-menu-helpers.js";

const MODULE_ID = MODULE_CONFIG.id;

const SHEET_MENU_DEFAULTS = {
  parallaxHeaderArt: false,
};

export default class SheetSettingsMenu extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  static DEFAULT_OPTIONS = settingsMenuOptions({
    id: "dsp-sheet-settings",
    width: 500,
    title: "DRAW_STEEL_PLUS.Settings.menus.sheets.name",
    icon: "fa-solid fa-id-card",
    actions: {
      resetDefaults: this.resetDefaults,
    },
    handler: this.onSubmit,
  });

  static PARTS = settingsMenuParts(
    "body",
    `modules/${MODULE_ID}/templates/settings/sheet-settings.hbs`,
  );

  async _prepareContext(options) {
    const boolField = new foundry.data.fields.BooleanField();
    return {
      parallaxHeaderArt: booleanSettingContext(
        MODULE_ID,
        "parallaxHeaderArt",
        boolField,
      ),
      buttons: SETTINGS_FORM_BUTTONS,
    };
  }

  static async onSubmit(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    await game.settings.set(
      MODULE_ID,
      "parallaxHeaderArt",
      data.parallaxHeaderArt ?? SHEET_MENU_DEFAULTS.parallaxHeaderArt,
    );
  }

  static async resetDefaults() {
    await Promise.all(
      Object.entries(SHEET_MENU_DEFAULTS).map(([key, value]) =>
        game.settings.set(MODULE_ID, key, value),
      ),
    );
    this.render();
  }
}
