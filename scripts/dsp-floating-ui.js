import { MODULE_CONFIG } from "./config.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = MODULE_CONFIG.id;

export class DspFloatingUI extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);
    const config = this.constructor.CONFIG ?? {};
    this._config = {
      positionKey: "metaCurrencyPosition",
      lockedKey: "metaCurrencyLocked",
      centeredKey: "metaCurrencyCentered",
      expandedKey: null,
      dragHandleSelector: ".dsp-mc-drag-handle",
      lockedClass: "dsp-mc-locked",
      supportsExpand: false,
      ...config,
    };
    this._dragData = {
      isDragging: false,
      startX: 0,
      startY: 0,
      startLeft: 0,
      startTop: 0,
    };
    this._boundDragStart = this.#onDragStart.bind(this);
    this._boundOnResize = this.#onResize.bind(this);
  }

  static getCanvasBounds() {
    const canvas = game.canvas;
    const view = canvas?.app?.canvas ?? canvas?.app?.view;
    if (canvas?.ready && view) {
      const rect = view.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    }
    return {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }

  static getDefaultPosition(elementWidth = 280, offsetY = 160) {
    const bounds = DspFloatingUI.getCanvasBounds();
    return {
      top: bounds.top + bounds.height - offsetY,
      left: Math.round(bounds.left + (bounds.width / 2) - (elementWidth / 2)),
    };
  }

  _onClose(options) {
    super._onClose(options);
    window.removeEventListener("resize", this._boundOnResize);
  }

  async _preFirstRender(context, options) {
    const cfg = this._config;
    const saved = game.settings.get(MODULE_ID, cfg.positionKey);
    const isCentered = game.settings.get(MODULE_ID, cfg.centeredKey);
    if (isCentered || !saved) {
      if (!isCentered) game.settings.set(MODULE_ID, cfg.centeredKey, true);
      options.position = this.constructor.getDefaultPosition();
    } else {
      options.position = saved;
    }
  }

  _onPosition(position) {
    if (this._dragData.isDragging) return;
    game.settings.set(MODULE_ID, this._config.positionKey, {
      top: position.top,
      left: position.left,
    });
  }

  _onRender(context, options) {
    const cfg = this._config;
    this.element.classList.toggle(cfg.lockedClass, context.isLocked);
    if (cfg.supportsExpand) {
      this.element.classList.toggle("dsp-mc-minimized", !context.isExpanded);
    }

    const dragHandle = this.element.querySelector(cfg.dragHandleSelector);
    if (dragHandle) {
      dragHandle.removeEventListener("mousedown", this._boundDragStart);
      dragHandle.addEventListener("mousedown", this._boundDragStart);
    }

    window.removeEventListener("resize", this._boundOnResize);
    if (context.isLocked && game.settings.get(MODULE_ID, cfg.centeredKey)) {
      window.addEventListener("resize", this._boundOnResize);
    }
  }

  #onResize() {
    if (this._resizeScheduled) return;
    this._resizeScheduled = true;
    requestAnimationFrame(() => {
      this._resizeScheduled = false;
      const cfg = this._config;
      const isLocked = game.settings.get(MODULE_ID, cfg.lockedKey);
      const isCentered = game.settings.get(MODULE_ID, cfg.centeredKey);
      if (!isLocked || !isCentered || !this.element) return;

      const width = this.element.offsetWidth || 280;
      const pos = this.constructor.getDefaultPosition(width);
      this.setPosition(pos);
    });
  }

  #onDragStart(e) {
    if (e.button !== 0) return;

    const isLocked = game.settings.get(MODULE_ID, this._config.lockedKey);
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

    game.settings.set(MODULE_ID, this._config.centeredKey, false);
    const rect = this.element.getBoundingClientRect();
    this.setPosition({ top: Math.round(rect.top), left: Math.round(rect.left) });
  }

  static createToggleLock(Cls, cfg) {
    return async () => {
      const current = game.settings.get(MODULE_ID, cfg.lockedKey);
      await game.settings.set(MODULE_ID, cfg.lockedKey, !current);
      Cls.instance?.render();
    };
  }

  static createResetPosition(Cls, cfg) {
    return async () => {
      const inst = Cls.instance;
      if (inst && inst.element) {
        await game.settings.set(MODULE_ID, cfg.centeredKey, true);
        const width = inst.element.offsetWidth || 280;
        const pos = Cls.getDefaultPosition(width);
        inst.element.classList.add("dsp-mc-resetting");
        inst.setPosition(pos);
        inst.render();
        setTimeout(() => inst.element?.classList.remove("dsp-mc-resetting"), 400);
      }
    };
  }
}
