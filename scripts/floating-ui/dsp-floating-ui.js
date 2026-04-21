import { MODULE_CONFIG } from "../config.js";
import { FloatingUIManager } from "./manager.js";
import { resolveAnchor } from "./position.js";

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
      toggleLink: DspFloatingUI.toggleLink,
    },
  };

  static DEFAULT_POSITION = { anchor: "cc", offsetX: 0, offsetY: 0, snap: "grid" };
  static DEFAULT_WIDTH = 280;
  static DEFAULT_HEIGHT = 120;

  constructor(options = {}) {
    super(options);
    this._boundDragStart = this.#onDragStart.bind(this);
    this._boundLinkPointerClick = this.#onLinkPointerClick.bind(this);
    this._elementAnchorObserver = null;
    this._elementResizeObserver = null;
  }

  #flagKey() {
    return `ui.${this.id}`;
  }

  _readFlag() {
    return game.user.getFlag(MODULE_ID, this.#flagKey()) ?? {};
  }

  async _updateFlag(patch) {
    const current = this._readFlag();
    const merged = foundry.utils.mergeObject(foundry.utils.deepClone(current), patch, {
      inplace: false,
      insertKeys: true,
      insertValues: true,
    });
    await game.user.setFlag(MODULE_ID, this.#flagKey(), merged);
  }

  isLocked() {
    return this._readFlag().locked ?? false;
  }

  getGroupId() {
    return this._readFlag().group ?? null;
  }

  async setGroupId(groupId) {
    await this._updateFlag({ group: groupId ?? null });
  }

  getPosition() {
    const saved = this._readFlag().pos;
    return saved ?? this.constructor.DEFAULT_POSITION;
  }

  async savePosition(pos) {
    await this._updateFlag({ pos });
  }

  getFloatingState() {
    const flag = this._readFlag();
    return {
      isLocked: flag.locked ?? false,
      isLinked: !!flag.group,
    };
  }

  async _preFirstRender(context, options) {
    await super._preFirstRender?.(context, options);
    const pos = this.getPosition();
    options.position = resolveAnchor(pos, null, {
      width: this.constructor.DEFAULT_WIDTH,
      height: this.constructor.DEFAULT_HEIGHT,
    });
  }

  _onPosition(_position) {
  }

  _onRender(context, options) {
    super._onRender(context, options);

    this.element.classList.toggle("dsp-fui-locked", this.isLocked());
    this.element.classList.toggle("dsp-fui-grouped", !!this.getGroupId());
    this.element.dataset.dspUiId = this.id;
    const groupId = this.getGroupId();
    if (groupId) this.element.dataset.dspGroup = groupId;
    else delete this.element.dataset.dspGroup;

    const handle = this.element.querySelector(".dsp-fui-drag-handle");
    if (handle) {
      handle.removeEventListener("mousedown", this._boundDragStart);
      handle.addEventListener("mousedown", this._boundDragStart);
    }

    this.#ensureLinkButton();

    FloatingUIManager.register(this);

    this.element.removeEventListener("click", this._boundLinkPointerClick, true);
    this.element.addEventListener("click", this._boundLinkPointerClick, true);

    requestAnimationFrame(() => this.reflow());
    this.#watchElementAnchor();
  }

  _onClose(options) {
    FloatingUIManager.unregister(this);
    this._elementAnchorObserver?.disconnect();
    this._elementAnchorObserver = null;
    this._elementResizeObserver?.disconnect();
    this._elementResizeObserver = null;
    super._onClose(options);
  }

  reflow() {
    if (!this.element) return;
    const pos = this.getPosition();
    const resolved = resolveAnchor(pos, this.element, {
      width: this.constructor.DEFAULT_WIDTH,
      height: this.constructor.DEFAULT_HEIGHT,
    });
    this.setPosition(resolved);
  }

  #ensureLinkButton() {
    const toolbar = this.element?.querySelector(".dsp-fui-toolbar");
    if (!toolbar) return;
    if (toolbar.querySelector('[data-action="toggleLink"]')) {
      this.#syncLinkButtonState(toolbar);
      return;
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dsp-fui-toolbar-btn dsp-fui-link-btn";
    btn.dataset.action = "toggleLink";
    btn.innerHTML = '<i class="fa-solid fa-link" inert></i>';
    const resetBtn = toolbar.querySelector('[data-action="resetPosition"]');
    if (resetBtn && resetBtn.nextSibling) {
      toolbar.insertBefore(btn, resetBtn.nextSibling);
    } else if (resetBtn) {
      toolbar.appendChild(btn);
    } else {
      toolbar.appendChild(btn);
    }
    this.#syncLinkButtonState(toolbar);
  }

  #syncLinkButtonState(toolbar) {
    const btn = toolbar.querySelector('[data-action="toggleLink"]');
    if (!btn) return;
    const linked = !!this.getGroupId();
    btn.classList.toggle("dsp-fui-link-active", linked);
    const icon = btn.querySelector("i");
    if (icon) {
      icon.classList.toggle("fa-link", !linked);
      icon.classList.toggle("fa-link-slash", linked);
    }
    const key = linked
      ? "DRAW_STEEL_PLUS.FloatingUI.unlink"
      : "DRAW_STEEL_PLUS.FloatingUI.link";
    const localized = game.i18n?.localize(key);
    btn.setAttribute("data-tooltip", localized && localized !== key ? localized : linked ? "Unlink" : "Link");
  }

  #onLinkPointerClick(event) {
    if (!document.body.classList.contains("dsp-fui-link-mode")) return;
    const targetBtn = event.target.closest('[data-action]');
    if (targetBtn) return;
  }

  #watchElementAnchor() {
    const pos = this.getPosition();
    const anchor = pos?.anchor;
    if (typeof anchor !== "string" || !anchor.startsWith("element:")) return;
    const selector = anchor.slice("element:".length);
    if (!selector) return;

    const target = document.querySelector(selector);
    if (!target) {
      if (this._elementAnchorObserver) return;
      this._elementAnchorObserver = new MutationObserver(() => {
        if (document.querySelector(selector)) {
          this._elementAnchorObserver.disconnect();
          this._elementAnchorObserver = null;
          this.reflow();
          this.#watchElementAnchor();
        }
      });
      this._elementAnchorObserver.observe(document.body, { childList: true, subtree: true });
      return;
    }

    this._elementResizeObserver?.disconnect();
    this._elementResizeObserver = new ResizeObserver(() => this.reflow());
    this._elementResizeObserver.observe(target);
  }

  #onDragStart(event) {
    FloatingUIManager.startDrag(this, event);
  }

  static async toggleLock() {
    const current = this._readFlag().locked ?? false;
    await this._updateFlag({ locked: !current });
    this.render();
  }

  static async resetPosition() {
    await this._updateFlag({ pos: this.constructor.DEFAULT_POSITION });
    if (this.element) {
      this.element.classList.add("dsp-fui-resetting");
      this.reflow();
      setTimeout(() => this.element?.classList.remove("dsp-fui-resetting"), 400);
    }
    this.render();
  }

  static async toggleLink() {
    if (this.getGroupId()) {
      await FloatingUIManager.unlinkUI(this);
      this.render();
    } else {
      FloatingUIManager.enterLinkMode(this);
    }
  }
}
