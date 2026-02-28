import { MODULE_CONFIG } from "./config.js";
import { DspFloatingUI } from "./dsp-floating-ui.js";

const MODULE_PATH = MODULE_CONFIG.path;
const SYSTEM_ID = MODULE_CONFIG.systemId;

export class MetaCurrencyTracker extends DspFloatingUI {
  static instance = null;

  static DEFAULT_OPTIONS = {
    id: "dsp-meta-currency",
    tag: "div",
    classes: ["dsp-meta-currency"],
    actions: {
      giveToken: MetaCurrencyTracker.#onGiveToken,
      spendToken: MetaCurrencyTracker.#onSpendToken,
      resetTokens: MetaCurrencyTracker.#onResetTokens,
      adjustMalice: MetaCurrencyTracker.#onAdjustMalice,
      resetMalice: MetaCurrencyTracker.#onResetMalice,
    },
  };

  static PARTS = {
    content: {
      template: `${MODULE_PATH}/templates/ui/meta-currency.hbs`,
    },
  };

  static initialize() {
    if (this.instance?.rendered) return;
    this.instance = new MetaCurrencyTracker();
    this.instance.render(true);
  }

  async _prepareContext(options) {
    const heroTokens = game.actors?.heroTokens;
    const malice = game.actors?.malice;
    const isGM = game.user.isGM;
    const showMalice = (game.settings.get(SYSTEM_ID, "showPlayerMalice") || isGM) && game.combat;

    return {
      ...this.getFloatingState(),
      heroTokens: heroTokens?.value ?? 0,
      heroTokensLabel: game.i18n.localize("DRAW_STEEL_PLUS.MetaCurrency.heroTokens"),
      malice: malice?.value ?? 0,
      maliceLabel: game.i18n.localize("DRAW_STEEL_PLUS.MetaCurrency.malice"),
      showMalice,
      isGM,
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
}
