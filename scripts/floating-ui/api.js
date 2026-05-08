import { MODULE_CONFIG } from "../config.js";
import { DspFloatingUI } from "./dsp-floating-ui.js";
import { FloatingUIManager } from "./manager.js";
import {
  ANCHORS,
  resolveAnchor,
  pickClosestAnchor,
  getGridSize,
} from "./position.js";

const MODULE_ID = MODULE_CONFIG.id;

const _registry = new Map();

function resolveElementTarget(spec) {
  if (!spec) return null;
  if (typeof spec === "string") return document.querySelector(spec);
  if (typeof spec === "function") {
    try {
      return spec();
    } catch {
      return null;
    }
  }
  if (spec instanceof Element) return spec;
  return null;
}

export function buildAdoptingClass(config) {
  const {
    id,
    title,
    element,
    defaultPosition,
    defaultWidth,
    defaultHeight,
    classes = [],
    contentClass,
    toolbarButtons = [],
    onRender,
    onClose,
    reparentOnClose,
  } = config;

  const templateContent = `
    <div class="dsp-fui-panel">
      <div class="dsp-fui-toolbar">
        <div class="dsp-fui-drag-handle" data-tooltip="${title ? `Drag ${title}` : "Drag to move"}">
          <i class="fa-solid fa-grip-vertical" inert></i>
        </div>
        <button class="dsp-fui-toolbar-btn" type="button" data-action="toggleLock" data-tooltip="Lock">
          <i class="fa-solid fa-lock-open" inert></i>
        </button>
        <button class="dsp-fui-toolbar-btn" type="button" data-action="resetPosition" data-tooltip="Reset position">
          <i class="fa-solid fa-crosshairs" inert></i>
        </button>
      </div>
      <div class="${contentClass ?? "dsp-fui-adopted-content"}"></div>
    </div>
  `;

  const customActions = {};
  for (const btn of toolbarButtons) {
    if (!btn.id || typeof btn.onClick !== "function") continue;
    customActions[btn.id] = function () {
      btn.onClick(this);
    };
  }

  class AdoptedFloatingUI extends DspFloatingUI {
    static instance = null;

    static DEFAULT_OPTIONS = {
      id,
      tag: "div",
      classes: ["dsp-adopted-ui", ...classes],
      actions: customActions,
    };

    static PARTS = {};

    static DEFAULT_POSITION = defaultPosition ?? {
      anchor: "cc",
      offsetX: 0,
      offsetY: 0,
      snap: "grid",
    };
    static DEFAULT_WIDTH = defaultWidth ?? 320;
    static DEFAULT_HEIGHT = defaultHeight ?? 120;

    _targetSpec = element;

    async _renderHTML(_context, _options) {
      return { content: templateContent };
    }

    _replaceHTML(result, content, _options) {
      content.innerHTML = result.content ?? "";
    }

    async _prepareContext(_options) {
      return { ...this.getFloatingState() };
    }

    _onRender(context, options) {
      super._onRender(context, options);

      for (const btn of toolbarButtons) {
        if (!btn.id) continue;
        const toolbar = this.element.querySelector(".dsp-fui-toolbar");
        if (!toolbar) continue;
        if (toolbar.querySelector(`[data-action="${btn.id}"]`)) continue;
        const b = document.createElement("button");
        b.type = "button";
        b.className = "dsp-fui-toolbar-btn";
        b.dataset.action = btn.id;
        if (btn.tooltip) b.setAttribute("data-tooltip", btn.tooltip);
        b.innerHTML = `<i class="fa-solid ${btn.icon ?? "fa-gear"}" inert></i>`;
        toolbar.appendChild(b);
      }

      this.#adoptTarget();
      if (typeof onRender === "function") onRender(this);
    }

    _onClose(options) {
      if (reparentOnClose) {
        const target = resolveElementTarget(this._targetSpec);
        if (target) {
          const parent =
            typeof reparentOnClose === "string"
              ? document.querySelector(reparentOnClose)
              : reparentOnClose instanceof Element
                ? reparentOnClose
                : null;
          if (parent) parent.appendChild(target);
        }
      }
      if (typeof onClose === "function") onClose(this);
      super._onClose(options);
    }

    #adoptTarget() {
      const target = resolveElementTarget(this._targetSpec);
      const container = this.element?.querySelector(
        `.${contentClass ?? "dsp-fui-adopted-content"}`,
      );
      if (!target || !container) {
        if (!target) this.#watchForTarget();
        return;
      }
      if (!container.contains(target)) container.appendChild(target);
    }

    #watchForTarget() {
      if (this._adoptObserver) return;
      this._adoptObserver = new MutationObserver(() => {
        const target = resolveElementTarget(this._targetSpec);
        if (target) {
          this._adoptObserver.disconnect();
          this._adoptObserver = null;
          this.#adoptTarget();
        }
      });
      this._adoptObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
  }

  return AdoptedFloatingUI;
}

export const FloatingUIApi = {
  BaseClass: DspFloatingUI,
  Manager: FloatingUIManager,
  ANCHORS,
  resolveAnchor,
  pickClosestAnchor,
  getGridSize,

  register(config) {
    if (!config?.id)
      throw new Error(`${MODULE_ID} | floatingUI.register requires an id`);
    if (_registry.has(config.id)) return _registry.get(config.id);

    const Cls = buildAdoptingClass(config);
    const entry = {
      id: config.id,
      Class: Cls,
      instance: null,
      show() {
        if (!this.instance) this.instance = new Cls();
        if (!this.instance.rendered) this.instance.render({ force: true });
        return this.instance;
      },
      hide() {
        if (this.instance) {
          this.instance.close();
          this.instance = null;
        }
      },
      toggle() {
        if (this.instance?.rendered) this.hide();
        else this.show();
      },
    };
    _registry.set(config.id, entry);
    return entry;
  },

  unregister(id) {
    const entry = _registry.get(id);
    if (entry) entry.hide();
    _registry.delete(id);
  },

  get(id) {
    return _registry.get(id) ?? null;
  },

  list() {
    return Array.from(_registry.values());
  },
};
