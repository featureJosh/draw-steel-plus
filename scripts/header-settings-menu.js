import { MODULE_CONFIG, HEADER_DEFAULTS } from "./config.js";
import {
  ApplicationV2,
  HandlebarsApplicationMixin,
  SETTINGS_FORM_BUTTONS,
  booleanSettingContext,
  settingsMenuOptions,
  settingsMenuParts,
} from "./settings-menu-helpers.js";

const MODULE_ID = MODULE_CONFIG.id;

export default class HeaderSettingsMenu extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  static DEFAULT_OPTIONS = settingsMenuOptions({
    id: "dsp-header-settings",
    width: 500,
    title: "DRAW_STEEL_PLUS.Settings.menus.headers.name",
    icon: "fa-solid fa-image",
    actions: {
      resetDefaults: this.resetDefaults,
      filePicker: this.onFilePicker,
    },
    handler: this.onSubmit,
  });

  static PARTS = settingsMenuParts(
    "headers",
    `modules/${MODULE_ID}/templates/settings/header-settings.hbs`,
  );

  async _prepareContext(options) {
    return {
      heroEnabled: booleanSettingContext(MODULE_ID, "heroHeaderEnabled"),
      heroImage: {
        value: game.settings.get(MODULE_ID, "heroHeaderImage"),
        label: game.i18n.localize(
          "DRAW_STEEL_PLUS.Settings.heroHeaderImage.name",
        ),
        hint: game.i18n.localize(
          "DRAW_STEEL_PLUS.Settings.heroHeaderImage.hint",
        ),
      },
      npcEnabled: booleanSettingContext(MODULE_ID, "npcHeaderEnabled"),
      npcImage: {
        value: game.settings.get(MODULE_ID, "npcHeaderImage"),
        label: game.i18n.localize(
          "DRAW_STEEL_PLUS.Settings.npcHeaderImage.name",
        ),
        hint: game.i18n.localize(
          "DRAW_STEEL_PLUS.Settings.npcHeaderImage.hint",
        ),
      },
      objectEnabled: booleanSettingContext(MODULE_ID, "objectHeaderEnabled"),
      objectImage: {
        value: game.settings.get(MODULE_ID, "objectHeaderImage"),
        label: game.i18n.localize(
          "DRAW_STEEL_PLUS.Settings.objectHeaderImage.name",
        ),
        hint: game.i18n.localize(
          "DRAW_STEEL_PLUS.Settings.objectHeaderImage.hint",
        ),
      },
      retainerEnabled: booleanSettingContext(MODULE_ID, "retainerHeaderEnabled"),
      retainerImage: {
        value: game.settings.get(MODULE_ID, "retainerHeaderImage"),
        label: game.i18n.localize(
          "DRAW_STEEL_PLUS.Settings.retainerHeaderImage.name",
        ),
        hint: game.i18n.localize(
          "DRAW_STEEL_PLUS.Settings.retainerHeaderImage.hint",
        ),
      },
      heroSection: game.i18n.localize(
        "DRAW_STEEL_PLUS.Settings.menus.headers.heroSection",
      ),
      npcSection: game.i18n.localize(
        "DRAW_STEEL_PLUS.Settings.menus.headers.npcSection",
      ),
      objectSection: game.i18n.localize(
        "DRAW_STEEL_PLUS.Settings.menus.headers.objectSection",
      ),
      retainerSection: game.i18n.localize(
        "DRAW_STEEL_PLUS.Settings.menus.headers.retainerSection",
      ),
      partyEnabled: booleanSettingContext(MODULE_ID, "partyHeaderEnabled"),
      partyImage: {
        value: game.settings.get(MODULE_ID, "partyHeaderImage"),
        label: game.i18n.localize(
          "DRAW_STEEL_PLUS.Settings.partyHeaderImage.name",
        ),
        hint: game.i18n.localize(
          "DRAW_STEEL_PLUS.Settings.partyHeaderImage.hint",
        ),
      },
      partySection: game.i18n.localize(
        "DRAW_STEEL_PLUS.Settings.menus.headers.partySection",
      ),
      buttons: SETTINGS_FORM_BUTTONS,
    };
  }

  static async onFilePicker(event, target) {
    const group = target.closest(".form-group");
    const input = group.querySelector("input[type='text']");
    const fp = new FilePicker({
      type: "image",
      current: input?.value || "",
      callback: (path) => {
        if (input) input.value = path;
      },
    });
    fp.browse();
  }

  static async onSubmit(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    await Promise.all([
      game.settings.set(
        MODULE_ID,
        "heroHeaderEnabled",
        data.heroHeaderEnabled ?? HEADER_DEFAULTS.heroHeaderEnabled,
      ),
      game.settings.set(
        MODULE_ID,
        "heroHeaderImage",
        data.heroHeaderImage ?? HEADER_DEFAULTS.heroHeaderImage,
      ),
      game.settings.set(
        MODULE_ID,
        "npcHeaderEnabled",
        data.npcHeaderEnabled ?? HEADER_DEFAULTS.npcHeaderEnabled,
      ),
      game.settings.set(
        MODULE_ID,
        "npcHeaderImage",
        data.npcHeaderImage ?? HEADER_DEFAULTS.npcHeaderImage,
      ),
      game.settings.set(
        MODULE_ID,
        "objectHeaderEnabled",
        data.objectHeaderEnabled ?? HEADER_DEFAULTS.objectHeaderEnabled,
      ),
      game.settings.set(
        MODULE_ID,
        "objectHeaderImage",
        data.objectHeaderImage ?? HEADER_DEFAULTS.objectHeaderImage,
      ),
      game.settings.set(
        MODULE_ID,
        "retainerHeaderEnabled",
        data.retainerHeaderEnabled ?? HEADER_DEFAULTS.retainerHeaderEnabled,
      ),
      game.settings.set(
        MODULE_ID,
        "retainerHeaderImage",
        data.retainerHeaderImage ?? HEADER_DEFAULTS.retainerHeaderImage,
      ),
      game.settings.set(
        MODULE_ID,
        "partyHeaderEnabled",
        data.partyHeaderEnabled ?? HEADER_DEFAULTS.partyHeaderEnabled,
      ),
      game.settings.set(
        MODULE_ID,
        "partyHeaderImage",
        data.partyHeaderImage ?? HEADER_DEFAULTS.partyHeaderImage,
      ),
    ]);
  }

  static async resetDefaults() {
    await Promise.all([
      game.settings.set(
        MODULE_ID,
        "heroHeaderEnabled",
        HEADER_DEFAULTS.heroHeaderEnabled,
      ),
      game.settings.set(
        MODULE_ID,
        "heroHeaderImage",
        HEADER_DEFAULTS.heroHeaderImage,
      ),
      game.settings.set(
        MODULE_ID,
        "npcHeaderEnabled",
        HEADER_DEFAULTS.npcHeaderEnabled,
      ),
      game.settings.set(
        MODULE_ID,
        "npcHeaderImage",
        HEADER_DEFAULTS.npcHeaderImage,
      ),
      game.settings.set(
        MODULE_ID,
        "objectHeaderEnabled",
        HEADER_DEFAULTS.objectHeaderEnabled,
      ),
      game.settings.set(
        MODULE_ID,
        "objectHeaderImage",
        HEADER_DEFAULTS.objectHeaderImage,
      ),
      game.settings.set(
        MODULE_ID,
        "retainerHeaderEnabled",
        HEADER_DEFAULTS.retainerHeaderEnabled,
      ),
      game.settings.set(
        MODULE_ID,
        "retainerHeaderImage",
        HEADER_DEFAULTS.retainerHeaderImage,
      ),
      game.settings.set(
        MODULE_ID,
        "partyHeaderEnabled",
        HEADER_DEFAULTS.partyHeaderEnabled,
      ),
      game.settings.set(
        MODULE_ID,
        "partyHeaderImage",
        HEADER_DEFAULTS.partyHeaderImage,
      ),
    ]);
    this.render();
  }
}
