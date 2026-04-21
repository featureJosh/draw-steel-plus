import { DspFloatingUI } from "./dsp-floating-ui.js";
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
  };

  static PARTS = {
    content: {
      template: `${MODULE_PATH}/templates/ui/ability-hud.hbs`,
    },
  };

  static DEFAULT_WIDTH = 520;

  static isModuleActive() {
    return !!game.modules.get(ABILITY_HUD_MODULE_ID)?.active;
  }

  static getDefaultPosition(elementWidth) {
    const w = elementWidth ?? this.DEFAULT_WIDTH;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const hotbar = document.getElementById("hotbar");
    const hotbarTop = hotbar?.getBoundingClientRect().top ?? (vh - 80);
    const gap = 12;
    return {
      top: Math.max(this.SAFE_MARGIN, Math.round(hotbarTop - 56 - gap)),
      left: Math.max(this.SAFE_MARGIN, Math.round((vw / 2) - (w / 2))),
    };
  }

  static initialize() {
    if (!this.isModuleActive()) return;
    if (!game.settings.get(MODULE_ID, "useAbilityHudPanel")) return;
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
    document.body.classList.toggle("dsp-ahud-styled", game.settings.get(MODULE_ID, "abilityHudDspStyle"));
  }

  _onClose(options) {
    this._hudObserver?.disconnect();
    this._hudObserver = null;
    this._hudResizeObserver?.disconnect();
    this._hudResizeObserver = null;
    clearTimeout(this._revealFallback);
    this._revealFallback = null;
    this._revealed = false;
    document.body.classList.remove("dsp-ahud-styled");
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
      this._hudObserver?.disconnect();
      this._hudObserver = null;
      this._observeHudSize(hudEl);
      this._recenterAndReveal();
    } else if (!hudEl) {
      this._watchForHud();
    }
  }

  _observeHudSize(hudEl) {
    this._hudResizeObserver?.disconnect();
    this._hudResizeObserver = new ResizeObserver(() => {
      this._recenterIfNeeded();
    });
    this._hudResizeObserver.observe(hudEl);
  }

  _recenterIfNeeded() {
    const isCentered = game.user.getFlag(MODULE_ID, `ui.${this.id}.centered`) ?? true;
    if (!isCentered) return;
    requestAnimationFrame(() => {
      if (!this.element) return;
      const w = this.element.offsetWidth || this.constructor.DEFAULT_WIDTH;
      this.setPosition(this.constructor.getDefaultPosition(w));
    });
  }

  _recenterAndReveal() {
    const isCentered = game.user.getFlag(MODULE_ID, `ui.${this.id}.centered`) ?? true;
    requestAnimationFrame(() => {
      if (!this.element) return;
      if (isCentered) {
        const w = this.element.offsetWidth || this.constructor.DEFAULT_WIDTH;
        this.setPosition(this.constructor.getDefaultPosition(w));
      }
      requestAnimationFrame(() => this._reveal());
    });
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
    this._hudObserver = new MutationObserver(() => {
      const hud = document.getElementById("ds-ability-hud");
      if (hud) {
        this._hudObserver.disconnect();
        this._hudObserver = null;
        this._tryAdoptHud();
      }
    });
    this._hudObserver.observe(document.body, { childList: true });
  }
}
