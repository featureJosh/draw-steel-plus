import { MODULE_CONFIG, NPC_DEFAULTS } from "./config.js";
import {
  ApplicationV2,
  HandlebarsApplicationMixin,
  SETTINGS_FORM_BUTTONS,
  booleanSettingContext,
  settingsMenuOptions,
  settingsMenuParts,
} from "./settings-menu-helpers.js";

const MODULE_ID = MODULE_CONFIG.id;

export default class NPCSettingsMenu extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  static DEFAULT_OPTIONS = settingsMenuOptions({
    id: "dsp-npc-settings",
    width: 500,
    title: "DRAW_STEEL_PLUS.Settings.menus.npc.name",
    icon: "fa-solid fa-ghost",
    actions: {
      resetDefaults: this.resetDefaults,
    },
    handler: this.onSubmit,
  });

  static PARTS = settingsMenuParts(
    "body",
    `modules/${MODULE_ID}/templates/settings/npc-settings.hbs`,
  );

  async _prepareContext(options) {
    return {
      npcFavoritesEnabled: booleanSettingContext(
        MODULE_ID,
        "npcFavoritesEnabled",
      ),
      buttons: SETTINGS_FORM_BUTTONS,
    };
  }

  static async onSubmit(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    await game.settings.set(
      MODULE_ID,
      "npcFavoritesEnabled",
      data.npcFavoritesEnabled ?? NPC_DEFAULTS.npcFavoritesEnabled,
    );
  }

  static async resetDefaults() {
    await game.settings.set(
      MODULE_ID,
      "npcFavoritesEnabled",
      NPC_DEFAULTS.npcFavoritesEnabled,
    );
    this.render();
  }
}
