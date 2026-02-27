import { MODULE_CONFIG } from "./config.js";
import { DspFloatingUI } from "./dsp-floating-ui.js";

const MODULE_ID = MODULE_CONFIG.id;
const MODULE_PATH = MODULE_CONFIG.path;
const SYSTEM_ID = MODULE_CONFIG.systemId;

const MC_CONFIG = {
  positionKey: "metaCurrencyPosition",
  lockedKey: "metaCurrencyLocked",
  centeredKey: "metaCurrencyCentered",
  expandedKey: "metaCurrencyExpanded",
  dragHandleSelector: ".dsp-mc-drag-handle",
  lockedClass: "dsp-mc-locked",
  supportsExpand: true,
};

export class MetaCurrencyTracker extends DspFloatingUI {
  static instance;
  static CONFIG = MC_CONFIG;

  static DEFAULT_OPTIONS = {
    id: "dsp-meta-currency",
    tag: "div",
    classes: ["dsp-meta-currency"],
    window: {
      frame: false,
      positioned: true,
    },
    position: {
      width: "auto",
      height: "auto",
    },
    actions: {
      giveToken: MetaCurrencyTracker.#onGiveToken,
      spendToken: MetaCurrencyTracker.#onSpendToken,
      resetTokens: MetaCurrencyTracker.#onResetTokens,
      adjustMalice: MetaCurrencyTracker.#onAdjustMalice,
      resetMalice: MetaCurrencyTracker.#onResetMalice,
      toggleExpanded: MetaCurrencyTracker.#onToggleExpanded,
      toggleLock: DspFloatingUI.createToggleLock(MetaCurrencyTracker, MC_CONFIG),
      resetPosition: DspFloatingUI.createResetPosition(MetaCurrencyTracker, MC_CONFIG),
    },
  };

  static PARTS = {
    content: {
      template: `${MODULE_PATH}/templates/ui/meta-currency.hbs`,
    },
  };

  static getDefaultPosition(elementWidth = 280) {
    return DspFloatingUI.getDefaultPosition(elementWidth, 160);
  }

  static initialize() {
    this.instance = new MetaCurrencyTracker();
    this.instance.render(true);
  }

  async _prepareContext(options) {
    const heroTokens = game.actors?.heroTokens;
    const malice = game.actors?.malice;
    const isGM = game.user.isGM;
    const showMalice = (game.settings.get(SYSTEM_ID, "showPlayerMalice") || isGM) && game.combat;
    const isExpanded = game.settings.get(MODULE_ID, MC_CONFIG.expandedKey);
    const isLocked = game.settings.get(MODULE_ID, MC_CONFIG.lockedKey);

    return {
      heroTokens: heroTokens?.value ?? 0,
      heroTokensLabel: game.i18n.localize("DRAW_STEEL_PLUS.MetaCurrency.heroTokens"),
      malice: malice?.value ?? 0,
      maliceLabel: game.i18n.localize("DRAW_STEEL_PLUS.MetaCurrency.malice"),
      showMalice,
      isGM,
      isExpanded,
      isLocked,
    };
  }

  static async #onGiveToken(event, target) {
    const heroTokens = game.actors?.heroTokens;
    if (heroTokens) await heroTokens.giveToken();
  }

  static async #onSpendToken(event, target) {
    const heroTokens = game.actors?.heroTokens;
    if (heroTokens) await heroTokens.spendToken("generic");
  }

  static async #onResetTokens(event, target) {
    const heroTokens = game.actors?.heroTokens;
    if (heroTokens) await heroTokens.resetTokens();
  }

  static async #onAdjustMalice(event, target) {
    const malice = game.actors?.malice;
    if (malice) await malice.adjustMalice();
  }

  static async #onResetMalice(event, target) {
    const malice = game.actors?.malice;
    if (malice) await malice.resetMalice();
  }

  static async #onToggleExpanded(event, target) {
    const current = game.settings.get(MODULE_ID, MC_CONFIG.expandedKey);
    await game.settings.set(MODULE_ID, MC_CONFIG.expandedKey, !current);
    MetaCurrencyTracker.instance?.render();
  }
}
