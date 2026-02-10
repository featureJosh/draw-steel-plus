import { MODULE_CONFIG } from "./config.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = MODULE_CONFIG.id;
const MODULE_PATH = MODULE_CONFIG.path;
const SYSTEM_ID = MODULE_CONFIG.systemId;

export class MetaCurrencyTracker extends HandlebarsApplicationMixin(ApplicationV2) {
  static instance;

  constructor(options = {}) {
    super(options);
    this._dragData = {
      isDragging: false,
      startX: 0,
      startY: 0,
      startLeft: 0,
      startTop: 0,
    };
    this._boundDragStart = this.#onDragStart.bind(this);
  }

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
      toggleLock: MetaCurrencyTracker.#onToggleLock,
      resetPosition: MetaCurrencyTracker.#onResetPosition,
    },
  };

  static PARTS = {
    content: {
      template: `${MODULE_PATH}/templates/ui/meta-currency.hbs`,
    },
  };

  static getDefaultPosition() {
    return {
      top: window.innerHeight - 160,
      left: Math.round((window.innerWidth / 2) - 140),
    };
  }

  static initialize() {
    this.instance = new MetaCurrencyTracker();
    this.instance.render(true);
  }

  async _preFirstRender(context, options) {
    const saved = game.settings.get(MODULE_ID, "metaCurrencyPosition");
    options.position = saved ?? MetaCurrencyTracker.getDefaultPosition();
  }

  _onPosition(position) {
    if (this._dragData.isDragging) return;
    game.settings.set(MODULE_ID, "metaCurrencyPosition", {
      top: position.top,
      left: position.left,
    });
  }

  async _prepareContext(options) {
    const heroTokens = game.actors?.heroTokens;
    const malice = game.actors?.malice;
    const isGM = game.user.isGM;
    const showMalice = (game.settings.get(SYSTEM_ID, "showPlayerMalice") || isGM) && game.combat;
    const isExpanded = game.settings.get(MODULE_ID, "metaCurrencyExpanded");
    const isLocked = game.settings.get(MODULE_ID, "metaCurrencyLocked");

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

  _onRender(context, options) {
    const isLocked = game.settings.get(MODULE_ID, "metaCurrencyLocked");
    const isExpanded = game.settings.get(MODULE_ID, "metaCurrencyExpanded");

    this.element.classList.toggle("dsp-mc-locked", isLocked);
    this.element.classList.toggle("dsp-mc-minimized", !isExpanded);

    const dragHandle = this.element.querySelector(".dsp-mc-drag-handle");
    if (dragHandle) {
      dragHandle.removeEventListener("mousedown", this._boundDragStart);
      dragHandle.addEventListener("mousedown", this._boundDragStart);
    }
  }

  #onDragStart(e) {
    if (e.button !== 0) return;

    const isLocked = game.settings.get(MODULE_ID, "metaCurrencyLocked");
    if (isLocked) return;

    e.preventDefault();

    this._dragData.isDragging = true;
    this._dragData.startX = e.clientX;
    this._dragData.startY = e.clientY;

    const rect = this.element.getBoundingClientRect();
    this._dragData.startLeft = rect.left;
    this._dragData.startTop = rect.top;

    this.element.style.cursor = "grabbing";

    this._boundOnDragging = this.#onDragging.bind(this);
    this._boundOnDragEnd = this.#onDragEnd.bind(this);
    window.addEventListener("mousemove", this._boundOnDragging);
    window.addEventListener("mouseup", this._boundOnDragEnd);
  }

  #onDragging(e) {
    if (!this._dragData.isDragging) return;

    const dx = e.clientX - this._dragData.startX;
    const dy = e.clientY - this._dragData.startY;

    this.element.style.left = `${this._dragData.startLeft + dx}px`;
    this.element.style.top = `${this._dragData.startTop + dy}px`;
  }

  #onDragEnd() {
    if (!this._dragData.isDragging) return;
    this._dragData.isDragging = false;
    this.element.style.cursor = "";

    window.removeEventListener("mousemove", this._boundOnDragging);
    window.removeEventListener("mouseup", this._boundOnDragEnd);

    const rect = this.element.getBoundingClientRect();
    this.setPosition({ top: Math.round(rect.top), left: Math.round(rect.left) });
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
    const current = game.settings.get(MODULE_ID, "metaCurrencyExpanded");
    await game.settings.set(MODULE_ID, "metaCurrencyExpanded", !current);
    MetaCurrencyTracker.instance?.render();
  }

  static async #onToggleLock(event, target) {
    const current = game.settings.get(MODULE_ID, "metaCurrencyLocked");
    await game.settings.set(MODULE_ID, "metaCurrencyLocked", !current);
    MetaCurrencyTracker.instance?.render();
  }

  static async #onResetPosition(event, target) {
    const pos = MetaCurrencyTracker.getDefaultPosition();
    const inst = MetaCurrencyTracker.instance;
    if (inst && inst.element) {
      inst.element.classList.add("dsp-mc-resetting");
      inst.setPosition(pos);
      setTimeout(() => inst.element.classList.remove("dsp-mc-resetting"), 400);
    }
  }
}
