import { DspFloatingUI } from "./floating-ui/dsp-floating-ui.js";
import { MODULE_CONFIG } from "./config.js";

const MODULE_PATH = MODULE_CONFIG.path;
const MODULE_ID = MODULE_CONFIG.id;
const ABILITY_HUD_MODULE_ID = "draw-steel-ability-hud";

export class AbilityHudUI extends DspFloatingUI {
  static instance = null;

  static DEFAULT_OPTIONS = {
    id: "dsp-ability-hud",
    tag: "div",
    classes: ["dsp-ability-hud-ui"],
    actions: {
      openAbilityHudActor: AbilityHudUI.openAbilityHudActor,
    },
  };

  static PARTS = {
    content: {
      template: `${MODULE_PATH}/templates/ui/ability-hud.hbs`,
    },
  };

  static DEFAULT_WIDTH = 520;
  static DEFAULT_HEIGHT = 56;
  static DEFAULT_POSITION = { anchor: "element:#hotbar", edge: "top", offsetX: 0, offsetY: -12, snap: "grid" };

  static isModuleActive() {
    return !!game.modules.get(ABILITY_HUD_MODULE_ID)?.active;
  }

  static applyBodyStyle() {
    const active = this.isModuleActive();
    document.body.classList.toggle("dsp-ahud-styled", active && !!game.settings.get(MODULE_ID, "abilityHudDspStyle"));
  }

  static usesToolbarActorLabel() {
    return this.isModuleActive()
      && !!game.settings.get(MODULE_ID, "abilityHudDspStyle")
      && !!game.settings.get(MODULE_ID, "useAbilityHudPanel");
  }

  static initialize() {
    if (!this.isModuleActive()) return;
    this.applyBodyStyle();
    if (!game.settings.get(MODULE_ID, "useAbilityHudPanel")) return;
    if (!AbilityHudUI._hooksBound) {
      Hooks.on("renderAbilityHud", () => AbilityHudUI.instance?._tryAdoptHud());
      AbilityHudUI._hooksBound = true;
    }
    this.show();
  }

  static async show() {
    if (!this.isModuleActive()) return;
    if (!game.settings.get(MODULE_ID, "useAbilityHudPanel")) return;
    if (!AbilityHudUI.instance) {
      AbilityHudUI.instance = new AbilityHudUI();
    }
    if (!AbilityHudUI.instance.rendered) {
      await AbilityHudUI.instance.render({ force: true });
    }
    AbilityHudUI.instance._tryAdoptHud();
  }

  static hide() {
    if (!AbilityHudUI.instance) return;
    AbilityHudUI.instance.close();
    AbilityHudUI.instance = null;
  }

  async render(options = {}) {
    if (this.rendered) {
      const hudEl = document.getElementById("ds-ability-hud");
      if (hudEl) document.body.appendChild(hudEl);
    }
    return super.render(options);
  }

  async _prepareContext(_options) {
    return { ...this.getFloatingState() };
  }

  _insertElement(element) {
    element.style.visibility = "hidden";
    const result = super._insertElement(element);
    this._revealFallback = setTimeout(() => this._reveal(), 750);
    return result;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this._tryAdoptHud();
    this._watchForHud();
    AbilityHudUI.applyBodyStyle();
  }

  _onClose(options) {
    this._hudObserver?.disconnect();
    this._hudObserver = null;
    this._hudResizeObserver?.disconnect();
    this._hudResizeObserver = null;
    this._styleGuardObserver?.disconnect();
    this._styleGuardObserver = null;
    this._barStyleGuardObserver?.disconnect();
    this._barStyleGuardObserver = null;
    clearTimeout(this._revealFallback);
    this._revealFallback = null;
    this._revealed = false;
    AbilityHudUI.applyBodyStyle();
    const hudEl = document.getElementById("ds-ability-hud");
    if (hudEl) document.body.appendChild(hudEl);
    super._onClose(options);
  }

  _tryAdoptHud() {
    const hudEl = document.getElementById("ds-ability-hud");
    const container = this.element?.querySelector(".dsp-ahud-content");
    if (!container) return;
    if (hudEl && !container.contains(hudEl)) {
      container.appendChild(hudEl);
      this._blockHudAutoPosition(hudEl);
      this._observeHudSize(hudEl);
      requestAnimationFrame(() => {
        this.reflow?.();
        requestAnimationFrame(() => this._reveal());
      });
    }
    this._syncActorLabelToolbar(hudEl);
  }

  _observeHudSize(hudEl) {
    this._hudResizeObserver?.disconnect();
    this._hudResizeObserver = new ResizeObserver(() => this.reflow?.());
    this._hudResizeObserver.observe(hudEl);
  }

  _blockHudAutoPosition(hudEl) {
    this._styleGuardObserver?.disconnect();
    const BLOCKED = ["left", "right", "top", "bottom", "width", "height", "position", "z-index", "transform", "inset", "margin"];
    const strip = () => {
      let dirty = false;
      for (const prop of BLOCKED) {
        if (hudEl.style.getPropertyValue(prop)) { dirty = true; break; }
      }
      if (!dirty) return;
      for (const prop of BLOCKED) hudEl.style.removeProperty(prop);
    };
    strip();
    this._styleGuardObserver = new MutationObserver(strip);
    this._styleGuardObserver.observe(hudEl, { attributes: true, attributeFilter: ["style"] });

    this._barStyleGuardObserver?.disconnect();
    const bar = hudEl.querySelector(".dsahud-bar");
    if (bar) {
      const stripBar = () => {
        if (!bar.style.getPropertyValue("flex-wrap")) return;
        bar.style.removeProperty("flex-wrap");
      };
      stripBar();
      this._barStyleGuardObserver = new MutationObserver(stripBar);
      this._barStyleGuardObserver.observe(bar, { attributes: true, attributeFilter: ["style"] });
    }
  }

  _syncActorLabelToolbar(hudEl = document.getElementById("ds-ability-hud")) {
    const toolbar = this.element?.querySelector(".dsp-fui-toolbar");
    const label = hudEl?.querySelector(".dsahud-actor-label");
    const existing = toolbar?.querySelector('[data-action="openAbilityHudActor"]');
    const enabled = this.constructor.usesToolbarActorLabel();

    if (!toolbar || !label || !enabled) {
      existing?.remove();
      return;
    }

    const actorName = label.textContent?.trim();
    const tooltip = actorName
      ? `${label.getAttribute("title") || "Open Character Sheet"}: ${actorName}`
      : label.getAttribute("title") || "Open Character Sheet";

    const btn = existing ?? document.createElement("button");
    btn.type = "button";
    btn.className = "dsp-fui-toolbar-btn dsp-ahud-actor-btn";
    btn.dataset.action = "openAbilityHudActor";
    btn.setAttribute("data-tooltip", tooltip);
    btn.setAttribute("aria-label", tooltip);
    btn.innerHTML = '<i class="fa-solid fa-user" inert></i>';

    if (!existing) {
      const dragHandle = toolbar.querySelector(".dsp-fui-drag-handle");
      if (dragHandle?.nextSibling) toolbar.insertBefore(btn, dragHandle.nextSibling);
      else toolbar.prepend(btn);
    }
  }

  static openAbilityHudActor() {
    const label = this.element?.querySelector(".dsp-ahud-content .dsahud-actor-label");
    label?.click();
  }

  _reveal() {
    if (this._revealed) return;
    this._revealed = true;
    clearTimeout(this._revealFallback);
    this._revealFallback = null;
    if (this.element) this.element.style.visibility = "";
  }

  _watchForHud() {
    if (this._hudObserver) return;
    this._hudObserver = new MutationObserver(() => this._tryAdoptHud());
    this._hudObserver.observe(document.body, { childList: true });
  }
}
