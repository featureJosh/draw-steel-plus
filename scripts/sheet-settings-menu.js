import { MODULE_CONFIG } from "./config.js";

const MODULE_ID = MODULE_CONFIG.id;

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

const SHEET_MENU_DEFAULTS = {
  parallaxHeaderArt: false,
};

export default class SheetSettingsMenu extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "dsp-sheet-settings",
    tag: "form",
    classes: ["standard-form"],
    position: { width: 500 },
    window: {
      title: "DRAW_STEEL_PLUS.Settings.menus.sheets.name",
      icon: "fa-solid fa-id-card",
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
      template: `modules/${MODULE_ID}/templates/settings/sheet-settings.hbs`,
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

  async _prepareContext(options) {
    const boolField = new foundry.data.fields.BooleanField();
    return {
      parallaxHeaderArt: {
        field: boolField,
        value: game.settings.get(MODULE_ID, "parallaxHeaderArt"),
        label: game.i18n.localize("DRAW_STEEL_PLUS.Settings.parallaxHeaderArt.name"),
        hint: game.i18n.localize("DRAW_STEEL_PLUS.Settings.parallaxHeaderArt.hint"),
      },
      buttons: [
        { type: "button", action: "resetDefaults", icon: "fas fa-arrow-rotate-left", label: "DRAW_STEEL_PLUS.Settings.resetDefaults" },
        { type: "submit", icon: "fas fa-save", label: "DRAW_STEEL_PLUS.Settings.saveChanges" },
      ],
    };
  }

  static async onSubmit(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    await game.settings.set(MODULE_ID, "parallaxHeaderArt", data.parallaxHeaderArt ?? SHEET_MENU_DEFAULTS.parallaxHeaderArt);
  }

  static async resetDefaults() {
    await Promise.all(
      Object.entries(SHEET_MENU_DEFAULTS).map(([key, value]) => game.settings.set(MODULE_ID, key, value))
    );
    this.render();
  }
}
