import {
  MODULE_CONFIG,
  COLOR_LIGHT_DARK_DEFAULTS,
  colorSettingKey,
} from "./config.js";
import { applyColorOverrides } from "./color-settings.js";
import {
  ApplicationV2,
  HandlebarsApplicationMixin,
  SETTINGS_FORM_BUTTONS,
  settingsMenuOptions,
  settingsMenuParts,
} from "./settings-menu-helpers.js";

const MODULE_ID = MODULE_CONFIG.id;

export default class ColorSettingsMenu extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  static COLOR_GROUPS = [
    {
      key: "primary",
      colors: ["primary", "primaryLight", "primaryDark", "primaryStrong"],
    },
    {
      key: "accent",
      colors: ["secondary", "accent", "accentBright", "accentStrong"],
    },
    { key: "background", colors: ["background", "surface", "surfaceRaised"] },
    { key: "text", colors: ["text", "textLight", "textFaint", "textMuted"] },
    { key: "other", colors: ["border", "borderLight", "danger"] },
  ];

  static DEFAULT_OPTIONS = settingsMenuOptions({
    id: "dsp-color-settings",
    width: 550,
    title: "DRAW_STEEL_PLUS.Settings.menus.colors.name",
    icon: "fa-solid fa-palette",
    actions: {
      resetDefaults: this.resetDefaults,
    },
    handler: this.onSubmit,
  });

  static PARTS = settingsMenuParts(
    "colors",
    `modules/${MODULE_ID}/templates/settings/color-settings.hbs`,
  );

  async _prepareContext(options) {
    const colorField = new foundry.data.fields.ColorField({
      nullable: true,
      required: false,
    });
    const groups = ColorSettingsMenu.COLOR_GROUPS.map((group) => ({
      legend: game.i18n.localize(
        `DRAW_STEEL_PLUS.Settings.menus.colors.groups.${group.key}`,
      ),
      colors: group.colors.flatMap((key) => {
        const defaults = COLOR_LIGHT_DARK_DEFAULTS[key];
        return [
          {
            field: colorField,
            name: colorSettingKey(key, "light"),
            label: game.i18n.localize(
              `DRAW_STEEL_PLUS.Settings.colors.${key}Lt`,
            ),
            value:
              game.settings.get(MODULE_ID, colorSettingKey(key, "light")) ||
              defaults.light,
          },
          {
            field: colorField,
            name: colorSettingKey(key, "dark"),
            label: game.i18n.localize(
              `DRAW_STEEL_PLUS.Settings.colors.${key}Dk`,
            ),
            value:
              game.settings.get(MODULE_ID, colorSettingKey(key, "dark")) ||
              defaults.dark,
          },
        ];
      }),
    }));

    return {
      groups,
      buttons: SETTINGS_FORM_BUTTONS,
    };
  }

  static async onSubmit(event, form, formData) {
    await Promise.all(
      Object.entries(formData.object).map(([key, value]) =>
        game.settings.set(MODULE_ID, key, value),
      ),
    );
  }

  static async resetDefaults() {
    await Promise.all(
      Object.entries(COLOR_LIGHT_DARK_DEFAULTS).flatMap(([key, defaults]) => [
        game.settings.set(
          MODULE_ID,
          colorSettingKey(key, "light"),
          defaults.light,
        ),
        game.settings.set(
          MODULE_ID,
          colorSettingKey(key, "dark"),
          defaults.dark,
        ),
      ]),
    );
    this.render();
  }
}
