import { DspFloatingUI } from "./floating-ui/dsp-floating-ui.js";
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
    actions: {
      toggleCollapse: CombatTrackerUI.toggleCollapse,
      endCombat: CombatTrackerUI.endCombat,
    },
  };

  static PARTS = {
    content: {
      template: `${MODULE_PATH}/templates/ui/combat-tracker.hbs`,
    },
  };

  static DEFAULT_WIDTH = 600;
  static DEFAULT_HEIGHT = 180;
  static DEFAULT_POSITION = {
    anchor: "tc",
    offsetX: 0,
    offsetY: 80,
    snap: "grid",
  };

  static isModuleActive() {
    return !!game.modules.get(COMBAT_TRACKER_MODULE_ID)?.active;
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
    const dockEl = document.getElementById("ds-combat-dock");
    return {
      ...this.getFloatingState(),
      isGM: !!game.user?.isGM,
      isCollapsed: !!dockEl?.classList.contains("collapsed"),
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this._tryAdoptDock();
    document.body.classList.toggle(
      "dsp-ct-styled",
      game.settings.get(MODULE_ID, "combatTrackerDspStyle"),
    );
    this._syncCollapseButton();
    this._updateMini();
    this._bindCombatHooks();
  }

  _syncCollapseButton() {
    const dockEl = document.getElementById("ds-combat-dock");
    const btn = this.element?.querySelector(".dsp-ct-collapse-btn");
    if (!btn) return;
    const collapsed = !!dockEl?.classList.contains("collapsed");
    const icon = btn.querySelector("i");
    if (icon) {
      icon.classList.toggle("fa-chevron-up", !collapsed);
      icon.classList.toggle("fa-chevron-down", collapsed);
    }
    const key = collapsed
      ? "DRAW_STEEL_PLUS.CombatTracker.expand"
      : "DRAW_STEEL_PLUS.CombatTracker.collapse";
    btn.setAttribute("data-tooltip", game.i18n.localize(key));
    this.element.classList.toggle("dsp-ct-collapsed", collapsed);
  }

  _updateMini() {
    const miniEl = this.element?.querySelector(".dsp-ct-mini");
    if (!miniEl) return;

    const combat = game.combat;
    if (!combat?.started) {
      miniEl.innerHTML = "";
      return;
    }

    const currentTurn = combat.combatant;
    const isInitialPhase = combat.combatants.contents.every(
      (c) =>
        c.isDefeated || c.initiative >= (c.actor?.system?.combat?.turns ?? 1),
    );
    const hasTurn =
      currentTurn != null && Number.isNumeric(combat.turn) && !isInitialPhase;

    const all = combat.combatants.contents;
    const isPartyMember = (c) => c.hasPlayerOwner || c.disposition === 2;
    const esc = (s) =>
      String(s ?? "").replace(
        /[&<>"']/g,
        (m) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[m],
      );

    const party = all.filter(isPartyMember);
    const enemies = all.filter((c) => !isPartyMember(c));

    const countBadge = (list, icon, sideClass) => {
      const alive = list.filter((c) => !c.isDefeated);
      const canAct = alive.filter((c) => c.initiative > 0).length;
      const total = alive.length;
      const names = alive
        .map((c) => {
          const state = c.initiative > 0 ? "●" : "○";
          return `${state} ${c.name}`;
        })
        .join("\n");
      const tooltip = names || "—";
      return `<div class="dsp-ct-mini-badge ${sideClass}" data-tooltip="${esc(tooltip)}">
        <i class="fa-solid ${icon}"></i>
        <span class="dsp-ct-mini-count"><b>${canAct}</b>/${total}</span>
      </div>`;
    };

    let centerHTML = "";
    if (hasTurn && currentTurn) {
      const side = isPartyMember(currentTurn) ? "party" : "enemy";
      const img =
        currentTurn.token?.texture?.src ??
        currentTurn.actor?.img ??
        "icons/svg/mystery-man.svg";
      centerHTML = `
        <div class="dsp-ct-mini-active dsp-ct-mini-active-${side}">
          <div class="dsp-ct-mini-portrait"><img src="${esc(img)}" alt="" loading="lazy"></div>
          <span class="dsp-ct-mini-name">${esc(currentTurn.name)}</span>
        </div>
      `;
    } else {
      const allActed = all
        .filter((c) => !c.isDefeated)
        .every((c) => c.initiative <= 0);
      const label = allActed
        ? game.i18n.localize("draw-steel-combat-tracker.RoundComplete")
        : game.i18n.localize("COMBAT.NotStarted") || "—";
      centerHTML = `<div class="dsp-ct-mini-active dsp-ct-mini-idle"><span class="dsp-ct-mini-name">${esc(label)}</span></div>`;
    }

    const roundLabel = game.i18n.localize("draw-steel-combat-tracker.Round");

    miniEl.innerHTML = `
      ${countBadge(party, "fa-users", "party")}
      <div class="dsp-ct-mini-center">
        ${centerHTML}
        <span class="dsp-ct-mini-round">${esc(roundLabel)} ${combat.round}</span>
      </div>
      ${countBadge(enemies, "fa-skull", "enemy")}
    `;
  }

  _bindCombatHooks() {
    this._unbindCombatHooks();
    const update = () => this._updateMini();
    this._miniHookFn = update;
    this._miniHookIds = [
      Hooks.on("updateCombat", update),
      Hooks.on("updateCombatant", update),
      Hooks.on("createCombatant", update),
      Hooks.on("deleteCombatant", update),
    ];
  }

  _unbindCombatHooks() {
    if (!this._miniHookIds) return;
    const names = [
      "updateCombat",
      "updateCombatant",
      "createCombatant",
      "deleteCombatant",
    ];
    names.forEach((name, i) => Hooks.off(name, this._miniHookIds[i]));
    this._miniHookIds = null;
    this._miniHookFn = null;
  }

  static async toggleCollapse() {
    const toggleBtn = document.querySelector("#ds-combat-dock .ds-dock-toggle");
    if (toggleBtn) {
      toggleBtn.click();
    } else {
      document.getElementById("ds-combat-dock")?.classList.toggle("collapsed");
    }
    this._syncCollapseButton();
    this._updateMini();
    requestAnimationFrame(() => this.reflow?.());
  }

  static async endCombat() {
    if (!game.user?.isGM) return;
    await game.combat?.endCombat();
  }

  _onClose(options) {
    this._dockObserver?.disconnect();
    this._dockObserver = null;
    this._unbindCombatHooks();
    document.body.classList.remove("dsp-ct-styled");
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
