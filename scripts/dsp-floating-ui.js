/**
 * New floating UI: extend, set id + PARTS, spread getFloatingState() in _prepareContext.
 * Template: dsp-fui-panel, dsp-fui-body, dsp-fui-toolbar, dsp-fui-drag-handle, dsp-fui-toolbar-btn.
 * Inherited: drag, position (user flags), toggleLock, resetPosition, toggleExpanded.
 *
 * class NewUI extends DspFloatingUI {
 *   static DEFAULT_OPTIONS = {
 *     id: "dsp-new-ui",
 *     classes: ["dsp-new-ui"],
 *   };
 *
 *   static PARTS = {
 *     content: { template: "..." },
 *   };
 *
 *   async _prepareContext() {
 *     return {
 *       ...this.getFloatingState(),
 *       // do stuff
 *     };
 *   }
 * }
 */

import { MODULE_CONFIG } from "./config.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const MODULE_ID = MODULE_CONFIG.id;

export class DspFloatingUI extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["dsp-floating-ui"],
    window: {
      frame: false,
      positioned: true,
    },
    position: {
      width: "auto",
      height: "auto",
    },
    actions: {
      toggleLock: DspFloatingUI.toggleLock,
      resetPosition: DspFloatingUI.resetPosition,
      toggleExpanded: DspFloatingUI.toggleExpanded,
    },
  };

  static DEFAULT_WIDTH = 280;
  static DEFAULT_OFFSET_Y = 160;

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
    this._boundOnResize = this.#onResize.bind(this);
  }

  #flagKey(prop) {
    return `ui.${this.id}.${prop}`;
  }

  #getFlag(prop) {
    return game.user.getFlag(MODULE_ID, this.#flagKey(prop));
  }

  #setFlag(prop, value) {
    return game.user.setFlag(MODULE_ID, this.#flagKey(prop), value);
  }

  getFloatingState() {
    return {
      isLocked: this.#getFlag("locked") ?? false,
      isExpanded: this.#getFlag("expanded") ?? true,
    };
  }

  static getCanvasBounds() {
    const canvas = game.canvas;
    const view = canvas?.app?.canvas ?? canvas?.app?.view;
    if (canvas?.ready && view) {
      const rect = view.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    }
    return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  }

  static getDefaultPosition(elementWidth, offsetY) {
    const w = elementWidth ?? this.DEFAULT_WIDTH;
    const y = offsetY ?? this.DEFAULT_OFFSET_Y;
    const bounds = DspFloatingUI.getCanvasBounds();
    return {
      top: bounds.top + bounds.height - y,
      left: Math.round(bounds.left + (bounds.width / 2) - (w / 2)),
    };
  }

  async _preFirstRender(context, options) {
    const saved = this.#getFlag("position");
    const isCentered = this.#getFlag("centered");
    if (isCentered || !saved) {
      if (!isCentered) this.#setFlag("centered", true);
      options.position = this.constructor.getDefaultPosition();
    } else {
      options.position = saved;
    }
  }

  _onPosition(position) {
    if (this._dragData.isDragging) return;
    this.#setFlag("position", { top: position.top, left: position.left });
  }

  _onClose(options) {
    super._onClose(options);
    window.removeEventListener("resize", this._boundOnResize);
  }

  _onRender(context, options) {
    this.element.classList.toggle("dsp-fui-locked", !!context.isLocked);
    this.element.classList.toggle("dsp-fui-minimized", !(context.isExpanded ?? true));

    const dragHandle = this.element.querySelector(".dsp-fui-drag-handle");
    if (dragHandle) {
      dragHandle.removeEventListener("mousedown", this._boundDragStart);
      dragHandle.addEventListener("mousedown", this._boundDragStart);
    }

    window.removeEventListener("resize", this._boundOnResize);
    if (context.isLocked && (this.#getFlag("centered") ?? false)) {
      window.addEventListener("resize", this._boundOnResize);
    }
  }

  #onResize() {
    if (this._resizeScheduled) return;
    this._resizeScheduled = true;
    requestAnimationFrame(() => {
      this._resizeScheduled = false;
      const isLocked = this.#getFlag("locked") ?? false;
      const isCentered = this.#getFlag("centered") ?? false;
      if (!isLocked || !isCentered || !this.element) return;
      const width = this.element.offsetWidth || this.constructor.DEFAULT_WIDTH;
      const pos = this.constructor.getDefaultPosition(width);
      this.setPosition(pos);
    });
  }

  #onDragStart(e) {
    if (e.button !== 0) return;
    if (this.#getFlag("locked")) return;

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
    this.#setFlag("centered", false);
    const rect = this.element.getBoundingClientRect();
    this.setPosition({ top: Math.round(rect.top), left: Math.round(rect.left) });
  }

  static async toggleLock() {
    const current = game.user.getFlag(MODULE_ID, `ui.${this.id}.locked`) ?? false;
    await game.user.setFlag(MODULE_ID, `ui.${this.id}.locked`, !current);
    this.render();
  }

  static async resetPosition() {
    if (!this.element) return;
    await game.user.setFlag(MODULE_ID, `ui.${this.id}.centered`, true);
    const width = this.element.offsetWidth || this.constructor.DEFAULT_WIDTH;
    const pos = this.constructor.getDefaultPosition(width);
    this.element.classList.add("dsp-fui-resetting");
    this.setPosition(pos);
    this.render();
    setTimeout(() => this.element?.classList.remove("dsp-fui-resetting"), 400);
  }

  static async toggleExpanded() {
    const current = game.user.getFlag(MODULE_ID, `ui.${this.id}.expanded`) ?? true;
    await game.user.setFlag(MODULE_ID, `ui.${this.id}.expanded`, !current);
    this.render();
  }
}
