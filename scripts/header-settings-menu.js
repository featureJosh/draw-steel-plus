import { MODULE_CONFIG, HEADER_DEFAULTS } from "./config.js";

const MODULE_ID = MODULE_CONFIG.id;

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class HeaderSettingsMenu extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "dsp-header-settings",
    tag: "form",
    classes: ["standard-form"],
    position: { width: 500 },
    window: {
      title: "DRAW_STEEL_PLUS.Settings.menus.headers.name",
      icon: "fa-solid fa-image",
    },
    actions: {
      resetDefaults: this.resetDefaults,
      filePicker: this.onFilePicker,
    },
    form: {
      closeOnSubmit: true,
      handler: this.onSubmit,
    },
  };

  static PARTS = {
    headers: {
      template: `modules/${MODULE_ID}/templates/settings/header-settings.hbs`,
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

  async _prepareContext(options) {
    return {
      heroEnabled: {
        field: new foundry.data.fields.BooleanField(),
        value: game.settings.get(MODULE_ID, "heroHeaderEnabled"),
        label: game.i18n.localize("DRAW_STEEL_PLUS.Settings.heroHeaderEnabled.name"),
        hint: game.i18n.localize("DRAW_STEEL_PLUS.Settings.heroHeaderEnabled.hint"),
      },
      heroImage: {
        value: game.settings.get(MODULE_ID, "heroHeaderImage"),
        label: game.i18n.localize("DRAW_STEEL_PLUS.Settings.heroHeaderImage.name"),
        hint: game.i18n.localize("DRAW_STEEL_PLUS.Settings.heroHeaderImage.hint"),
      },
      npcEnabled: {
        field: new foundry.data.fields.BooleanField(),
        value: game.settings.get(MODULE_ID, "npcHeaderEnabled"),
        label: game.i18n.localize("DRAW_STEEL_PLUS.Settings.npcHeaderEnabled.name"),
        hint: game.i18n.localize("DRAW_STEEL_PLUS.Settings.npcHeaderEnabled.hint"),
      },
      npcImage: {
        value: game.settings.get(MODULE_ID, "npcHeaderImage"),
        label: game.i18n.localize("DRAW_STEEL_PLUS.Settings.npcHeaderImage.name"),
        hint: game.i18n.localize("DRAW_STEEL_PLUS.Settings.npcHeaderImage.hint"),
      },
      heroSection: game.i18n.localize("DRAW_STEEL_PLUS.Settings.menus.headers.heroSection"),
      npcSection: game.i18n.localize("DRAW_STEEL_PLUS.Settings.menus.headers.npcSection"),
      buttons: [
        { type: "button", action: "resetDefaults", icon: "fas fa-arrow-rotate-left", label: "DRAW_STEEL_PLUS.Settings.resetDefaults" },
        { type: "submit", icon: "fas fa-save", label: "DRAW_STEEL_PLUS.Settings.saveChanges" },
      ],
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
      game.settings.set(MODULE_ID, "heroHeaderEnabled", data.heroHeaderEnabled ?? HEADER_DEFAULTS.heroHeaderEnabled),
      game.settings.set(MODULE_ID, "heroHeaderImage", data.heroHeaderImage ?? HEADER_DEFAULTS.heroHeaderImage),
      game.settings.set(MODULE_ID, "npcHeaderEnabled", data.npcHeaderEnabled ?? HEADER_DEFAULTS.npcHeaderEnabled),
      game.settings.set(MODULE_ID, "npcHeaderImage", data.npcHeaderImage ?? HEADER_DEFAULTS.npcHeaderImage),
    ]);
  }

  static async resetDefaults() {
    await Promise.all([
      game.settings.set(MODULE_ID, "heroHeaderEnabled", HEADER_DEFAULTS.heroHeaderEnabled),
      game.settings.set(MODULE_ID, "heroHeaderImage", HEADER_DEFAULTS.heroHeaderImage),
      game.settings.set(MODULE_ID, "npcHeaderEnabled", HEADER_DEFAULTS.npcHeaderEnabled),
      game.settings.set(MODULE_ID, "npcHeaderImage", HEADER_DEFAULTS.npcHeaderImage),
    ]);
    this.render();
  }
}
