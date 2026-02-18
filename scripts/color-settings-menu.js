import { MODULE_CONFIG, COLOR_LIGHT_DARK_DEFAULTS, colorSettingKey } from "./config.js";
import { applyColorOverrides } from "./color-settings.js";

const MODULE_ID = MODULE_CONFIG.id;

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
      colors: group.colors.flatMap(key => {
        const defaults = COLOR_LIGHT_DARK_DEFAULTS[key];
        return [
          {
            field: colorField,
            name: colorSettingKey(key, "light"),
            label: game.i18n.localize(`DRAW_STEEL_PLUS.Settings.colors.${key}Lt`),
            value: game.settings.get(MODULE_ID, colorSettingKey(key, "light")) || defaults.light,
          },
          {
            field: colorField,
            name: colorSettingKey(key, "dark"),
            label: game.i18n.localize(`DRAW_STEEL_PLUS.Settings.colors.${key}Dk`),
            value: game.settings.get(MODULE_ID, colorSettingKey(key, "dark")) || defaults.dark,
          },
        ];
      }),
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
    await Promise.all(
      Object.entries(formData.object).map(([key, value]) => game.settings.set(MODULE_ID, key, value))
    );
  }

  static async resetDefaults() {
    await Promise.all(
      Object.entries(COLOR_LIGHT_DARK_DEFAULTS).flatMap(([key, defaults]) => [
        game.settings.set(MODULE_ID, colorSettingKey(key, "light"), defaults.light),
        game.settings.set(MODULE_ID, colorSettingKey(key, "dark"), defaults.dark),
      ])
    );
    this.render();
  }
}
