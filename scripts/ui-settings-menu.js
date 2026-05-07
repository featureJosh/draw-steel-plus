import { MODULE_CONFIG, SCALE_DEFAULTS, UI_DEFAULTS } from "./config.js";

const MODULE_ID = MODULE_CONFIG.id;

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

const UI_MENU_DEFAULTS = {
  fontScale: SCALE_DEFAULTS.fontScale,
  floatingNavTabs: true,
  improvedChat: UI_DEFAULTS.improvedChat,
  useCustomMetaCurrency: UI_DEFAULTS.useCustomMetaCurrency,
  floatingUIGridSize: 20,
  floatingUIShowOverlay: true,
};

export default class UISettingsMenu extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "dsp-ui-settings",
    tag: "form",
    classes: ["standard-form"],
    position: { width: 520 },
    window: {
      title: "DRAW_STEEL_PLUS.Settings.menus.ui.name",
      icon: "fa-solid fa-display",
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
      template: `modules/${MODULE_ID}/templates/settings/ui-settings.hbs`,
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

  async _prepareContext(options) {
    const boolField = new foundry.data.fields.BooleanField();
    return {
      fontScale: {
        field: new foundry.data.fields.NumberField({ min: 0.75, max: 1.5, step: 0.05 }),
        value: game.settings.get(MODULE_ID, "fontScale"),
        label: game.i18n.localize("DRAW_STEEL_PLUS.Settings.fontScale.name"),
        hint: game.i18n.localize("DRAW_STEEL_PLUS.Settings.fontScale.hint"),
      },
      floatingNavTabs: {
        field: boolField,
        value: game.settings.get(MODULE_ID, "floatingNavTabs"),
        label: game.i18n.localize("DRAW_STEEL_PLUS.Settings.floatingNavTabs.name"),
        hint: game.i18n.localize("DRAW_STEEL_PLUS.Settings.floatingNavTabs.hint"),
      },
      improvedChat: {
        field: boolField,
        value: game.settings.get(MODULE_ID, "improvedChat"),
        label: game.i18n.localize("DRAW_STEEL_PLUS.Settings.improvedChat.name"),
        hint: game.i18n.localize("DRAW_STEEL_PLUS.Settings.improvedChat.hint"),
      },
      useCustomMetaCurrency: {
        field: boolField,
        value: game.settings.get(MODULE_ID, "useCustomMetaCurrency"),
        label: game.i18n.localize("DRAW_STEEL_PLUS.Settings.useCustomMetaCurrency.name"),
        hint: game.i18n.localize("DRAW_STEEL_PLUS.Settings.useCustomMetaCurrency.hint"),
      },
      floatingUIGridSize: {
        field: new foundry.data.fields.NumberField({ min: 4, max: 80, step: 2, integer: true }),
        value: game.settings.get(MODULE_ID, "floatingUIGridSize"),
        label: game.i18n.localize("DRAW_STEEL_PLUS.Settings.floatingUIGridSize.name"),
        hint: game.i18n.localize("DRAW_STEEL_PLUS.Settings.floatingUIGridSize.hint"),
      },
      floatingUIShowOverlay: {
        field: boolField,
        value: game.settings.get(MODULE_ID, "floatingUIShowOverlay"),
        label: game.i18n.localize("DRAW_STEEL_PLUS.Settings.floatingUIShowOverlay.name"),
        hint: game.i18n.localize("DRAW_STEEL_PLUS.Settings.floatingUIShowOverlay.hint"),
      },
      buttons: [
        { type: "button", action: "resetDefaults", icon: "fas fa-arrow-rotate-left", label: "DRAW_STEEL_PLUS.Settings.resetDefaults" },
        { type: "submit", icon: "fas fa-save", label: "DRAW_STEEL_PLUS.Settings.saveChanges" },
      ],
    };
  }

  static async onSubmit(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    await Promise.all([
      game.settings.set(MODULE_ID, "fontScale", Number(data.fontScale ?? UI_MENU_DEFAULTS.fontScale)),
      game.settings.set(MODULE_ID, "floatingNavTabs", data.floatingNavTabs ?? UI_MENU_DEFAULTS.floatingNavTabs),
      game.settings.set(MODULE_ID, "improvedChat", data.improvedChat ?? UI_MENU_DEFAULTS.improvedChat),
      game.settings.set(MODULE_ID, "useCustomMetaCurrency", data.useCustomMetaCurrency ?? UI_MENU_DEFAULTS.useCustomMetaCurrency),
      game.settings.set(MODULE_ID, "floatingUIGridSize", Number(data.floatingUIGridSize ?? UI_MENU_DEFAULTS.floatingUIGridSize)),
      game.settings.set(MODULE_ID, "floatingUIShowOverlay", data.floatingUIShowOverlay ?? UI_MENU_DEFAULTS.floatingUIShowOverlay),
    ]);
  }

  static async resetDefaults() {
    await Promise.all(
      Object.entries(UI_MENU_DEFAULTS).map(([key, value]) => game.settings.set(MODULE_ID, key, value))
    );
    this.render();
  }
}
