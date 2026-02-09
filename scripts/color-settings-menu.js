import { MODULE_CONFIG, COLOR_DEFAULTS } from "./config.js";
import { applyColorOverrides } from "./color-settings.js";

const MODULE_ID = MODULE_CONFIG.id;

function colorSettingKey(key) {
  return `color${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class ColorSettingsMenu extends HandlebarsApplicationMixin(ApplicationV2) {
  static COLOR_GROUPS = [
    { key: "primary", colors: ["primary", "primaryLight", "primaryDark"] },
    { key: "accent", colors: ["secondary", "accent", "accentBright"] },
    { key: "background", colors: ["background", "surface", "surfaceRaised"] },
    { key: "text", colors: ["text", "textLight", "textFaint"] },
    { key: "other", colors: ["border", "borderLight", "danger"] },
  ];

  static DEFAULT_OPTIONS = {
    id: "dsp-color-settings",
    tag: "form",
    classes: ["standard-form"],
    position: { width: 550 },
    window: {
      title: "DRAW_STEEL_PLUS.Settings.menus.colors.name",
      icon: "fa-solid fa-palette",
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
    colors: {
      template: `modules/${MODULE_ID}/templates/settings/color-settings.hbs`,
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

  async _prepareContext(options) {
    const colorField = new foundry.data.fields.ColorField({ nullable: true, required: false });
    const groups = ColorSettingsMenu.COLOR_GROUPS.map(group => ({
      legend: game.i18n.localize(`DRAW_STEEL_PLUS.Settings.menus.colors.groups.${group.key}`),
      colors: group.colors.map(key => ({
        field: colorField,
        name: colorSettingKey(key),
        label: game.i18n.localize(`DRAW_STEEL_PLUS.Settings.colors.${key}`),
        value: game.settings.get(MODULE_ID, colorSettingKey(key)) || COLOR_DEFAULTS[key],
      })),
    }));

    return {
      groups,
      buttons: [
        { type: "button", action: "resetDefaults", icon: "fas fa-arrow-rotate-left", label: "DRAW_STEEL_PLUS.Settings.resetDefaults" },
        { type: "submit", icon: "fas fa-save", label: "DRAW_STEEL_PLUS.Settings.saveChanges" },
      ],
    };
  }

  static async onSubmit(event, form, formData) {
    for (const [key, value] of Object.entries(formData.object)) {
      await game.settings.set(MODULE_ID, key, value);
    }
  }

  static async resetDefaults() {
    for (const [key, defaultVal] of Object.entries(COLOR_DEFAULTS)) {
      await game.settings.set(MODULE_ID, colorSettingKey(key), defaultVal);
    }
    this.render();
  }
}
