import { MODULE_CONFIG, NPC_DEFAULTS } from "./config.js";

const MODULE_ID = MODULE_CONFIG.id;

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class NPCSettingsMenu extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "dsp-npc-settings",
    tag: "form",
    classes: ["standard-form"],
    position: { width: 500 },
    window: {
      title: "DRAW_STEEL_PLUS.Settings.menus.npc.name",
      icon: "fa-solid fa-ghost",
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
      template: `modules/${MODULE_ID}/templates/settings/npc-settings.hbs`,
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };

  async _prepareContext(options) {
    return {
      npcFavoritesEnabled: {
        field: new foundry.data.fields.BooleanField(),
        value: game.settings.get(MODULE_ID, "npcFavoritesEnabled"),
        label: game.i18n.localize("DRAW_STEEL_PLUS.Settings.npcFavoritesEnabled.name"),
        hint: game.i18n.localize("DRAW_STEEL_PLUS.Settings.npcFavoritesEnabled.hint"),
      },
      buttons: [
        { type: "button", action: "resetDefaults", icon: "fas fa-arrow-rotate-left", label: "DRAW_STEEL_PLUS.Settings.resetDefaults" },
        { type: "submit", icon: "fas fa-save", label: "DRAW_STEEL_PLUS.Settings.saveChanges" },
      ],
    };
  }

  static async onSubmit(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    await game.settings.set(MODULE_ID, "npcFavoritesEnabled", data.npcFavoritesEnabled ?? NPC_DEFAULTS.npcFavoritesEnabled);
  }

  static async resetDefaults() {
    await game.settings.set(MODULE_ID, "npcFavoritesEnabled", NPC_DEFAULTS.npcFavoritesEnabled);
    this.render();
  }
}
