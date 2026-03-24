import { MODULE_CONFIG } from "./config.js";

const MODULE_ID = MODULE_CONFIG.id;
const MODULE_PATH = MODULE_CONFIG.path;

export class TabConfigDialog extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  #document;
  #sheetTabs;

  constructor({ document, sheetTabs, ...options } = {}) {
    super(options);
    this.#document = document;
    this.#sheetTabs = sheetTabs;
  }

  static DEFAULT_OPTIONS = {
    id: "dsp-tab-config-{id}",
    classes: ["draw-steel-plus", "dsp-tab-config"],
    window: {
      title: "DRAW_STEEL_PLUS.TabConfig.title",
      resizable: false,
    },
    position: { width: 300, height: "auto" },
    form: { handler: TabConfigDialog.#onSubmit, closeOnSubmit: true },
    tag: "form",
    actions: {
      resetDefaults: TabConfigDialog.#onReset,
    },
  };

  static PARTS = {
    form: { template: `${MODULE_PATH}/templates/settings/tab-config.hbs` },
  };

  get title() {
    return `${game.i18n.localize("DRAW_STEEL_PLUS.TabConfig.title")} — ${this.#document.name}`;
  }

  async _prepareContext(options) {
    const saved = this.#document.getFlag(MODULE_ID, "tabVisibility") || {};
    const tabs = {};

    for (const [tabId, tab] of Object.entries(this.#sheetTabs)) {
      tabs[tabId] = {
        label: tab.label || game.i18n.localize(`DRAW_STEEL.SHEET.TAB.${tabId}`) || tabId,
        visible: saved[tabId] !== false,
        locked: tabId === "favorites" || tabId === "features",
      };
    }

    return { tabs };
  }

  static async #onSubmit(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    const visibility = {};
    for (const [tabId, checked] of Object.entries(data.tabs || {})) {
      visibility[tabId] = !!checked;
    }
    await this.#document.setFlag(MODULE_ID, "tabVisibility", visibility);
  }

  static async #onReset() {
    await this.#document.unsetFlag(MODULE_ID, "tabVisibility");
    this.close();
  }
}
