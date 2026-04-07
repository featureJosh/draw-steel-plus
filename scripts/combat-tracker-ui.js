import { DspFloatingUI } from "./dsp-floating-ui.js";
import { MODULE_CONFIG } from "./config.js";

const MODULE_PATH = MODULE_CONFIG.path;
const MODULE_ID = MODULE_CONFIG.id;
const COMBAT_TRACKER_MODULE_ID = "draw-steel-combat-tracker";

export class CombatTrackerUI extends DspFloatingUI {
  static instance = null;

  static DEFAULT_OPTIONS = {
    id: "dsp-combat-tracker",
    tag: "div",
    classes: ["dsp-combat-tracker-ui"],
  };

  static PARTS = {
    content: {
      template: `${MODULE_PATH}/templates/ui/combat-tracker.hbs`,
    },
  };

  // Default width used for centering math before element renders
  static DEFAULT_WIDTH = 600;

  static isModuleActive() {
    return !!game.modules.get(COMBAT_TRACKER_MODULE_ID)?.active;
  }

  // Position near the top-center, like the original dock
  static getDefaultPosition(elementWidth) {
    const w = elementWidth ?? this.DEFAULT_WIDTH;
    const vw = window.innerWidth;
    return {
      top: 80,
      left: Math.max(this.SAFE_MARGIN, Math.round((vw / 2) - (w / 2))),
    };
  }

  static initialize() {
    if (!this.isModuleActive()) return;
    if (!game.settings.get(MODULE_ID, "useCombatTrackerPanel")) return;
    if (game.combat?.started) this.show();
  }

  static async show() {
    if (!this.isModuleActive()) return;
    if (!game.settings.get(MODULE_ID, "useCombatTrackerPanel")) return;
    if (!CombatTrackerUI.instance) {
      CombatTrackerUI.instance = new CombatTrackerUI();
    }
    if (!CombatTrackerUI.instance.rendered) {
      await CombatTrackerUI.instance.render({ force: true });
    }
    CombatTrackerUI.instance._tryAdoptDock();
  }

  static hide() {
    if (!CombatTrackerUI.instance) return;
    CombatTrackerUI.instance.close();
    CombatTrackerUI.instance = null;
  }

  // Before re-rendering, rescue the dock back to #ui-top so it isn't
  // orphaned when the PART container is replaced by Foundry's renderer.
  // _onRender → _tryAdoptDock will re-adopt it immediately after.
  async render(options = {}) {
    if (this.rendered) {
      const dockEl = document.getElementById("ds-combat-dock");
      if (dockEl) document.getElementById("ui-top")?.prepend(dockEl);
    }
    return super.render(options);
  }

  async _prepareContext(_options) {
    return { ...this.getFloatingState() };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this._tryAdoptDock();
  }

  _onClose(options) {
    this._dockObserver?.disconnect();
    this._dockObserver = null;
    // Return dock element to #ui-top so the module continues functioning
    const dockEl = document.getElementById("ds-combat-dock");
    if (dockEl) document.getElementById("ui-top")?.prepend(dockEl);
    super._onClose(options);
  }

  _tryAdoptDock() {
    const dockEl = document.getElementById("ds-combat-dock");
    const container = this.element?.querySelector(".dsp-ct-content");
    if (!container) return;
    if (dockEl && !container.contains(dockEl)) {
      container.appendChild(dockEl);
      this._dockObserver?.disconnect();
      this._dockObserver = null;
    } else if (!dockEl) {
      // Dock not rendered yet — watch for it to appear in #ui-top
      this._watchForDock();
    }
  }

  _watchForDock() {
    if (this._dockObserver) return;
    const uiTop = document.getElementById("ui-top");
    if (!uiTop) return;
    this._dockObserver = new MutationObserver(() => {
      const dock = document.getElementById("ds-combat-dock");
      if (dock) {
        this._dockObserver.disconnect();
        this._dockObserver = null;
        this._tryAdoptDock();
      }
    });
    this._dockObserver.observe(uiTop, { childList: true });
  }
}
