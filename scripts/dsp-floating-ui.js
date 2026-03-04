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
    },
  };

  static DEFAULT_WIDTH = 280;
  static DEFAULT_OFFSET_Y = 160;
  static SAFE_MARGIN = 40;

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
    this._needsCenteringAdjust = false;
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
    };
  }

  static getDefaultPosition(elementWidth) {
    const w = elementWidth ?? this.DEFAULT_WIDTH;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
      top: Math.max(this.SAFE_MARGIN, vh - this.DEFAULT_OFFSET_Y),
      left: Math.max(this.SAFE_MARGIN, Math.round((vw / 2) - (w / 2))),
    };
  }

  static clampPosition(pos, elementWidth) {
    const margin = this.SAFE_MARGIN;
    const w = elementWidth ?? this.DEFAULT_WIDTH;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return {
      left: Math.min(Math.max(pos.left, margin), vw - w - margin),
      top: Math.min(Math.max(pos.top, margin), vh - margin),
    };
  }

  async _preFirstRender(context, options) {
    const saved = this.#getFlag("position");
    const isCentered = this.#getFlag("centered");
    if (isCentered || !saved) {
      if (!isCentered) this.#setFlag("centered", true);
      // Use DEFAULT_WIDTH as rough estimate; _onRender will correct with actual width
      options.position = this.constructor.getDefaultPosition();
      this._needsCenteringAdjust = true;
    } else {
      // Clamp restored position to the current viewport so it can't start off-screen
      options.position = this.constructor.clampPosition(saved);
      this._needsCenteringAdjust = false;
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

    const dragHandle = this.element.querySelector(".dsp-fui-drag-handle");
    if (dragHandle) {
      dragHandle.removeEventListener("mousedown", this._boundDragStart);
      dragHandle.addEventListener("mousedown", this._boundDragStart);
    }

    // After first render, recalculate the centered position using the actual element
    // width — the initial estimate (DEFAULT_WIDTH) is often wrong.
    if (this._needsCenteringAdjust) {
      this._needsCenteringAdjust = false;
      requestAnimationFrame(() => {
        if (!this.element) return;
        const actualWidth = this.element.offsetWidth || this.constructor.DEFAULT_WIDTH;
        const pos = this.constructor.getDefaultPosition(actualWidth);
        this.setPosition(pos);
      });
    }

    // Always listen for window resize: re-center if centered, or clamp if manually placed.
    window.removeEventListener("resize", this._boundOnResize);
    window.addEventListener("resize", this._boundOnResize);
  }

  #onResize() {
    if (this._resizeScheduled) return;
    this._resizeScheduled = true;
    requestAnimationFrame(() => {
      this._resizeScheduled = false;
      if (!this.element) return;
      const isCentered = this.#getFlag("centered") ?? false;
      const width = this.element.offsetWidth || this.constructor.DEFAULT_WIDTH;
      if (isCentered) {
        // Re-center using updated window dimensions
        this.setPosition(this.constructor.getDefaultPosition(width));
      } else {
        // Clamp a manually-placed UI so it doesn't end up fully off-screen
        const rect = this.element.getBoundingClientRect();
        const clamped = this.constructor.clampPosition({ left: rect.left, top: rect.top }, width);
        this.setPosition(clamped);
      }
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

}
