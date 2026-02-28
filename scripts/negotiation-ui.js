import { MODULE_CONFIG, NEGOTIATION_ATTITUDES, NEGOTIATION_MOTIVATIONS, DEFAULT_NEGOTIATION_STATE } from "./config.js";
import { DspFloatingUI } from "./dsp-floating-ui.js";

const MODULE_ID = MODULE_CONFIG.id;
const MODULE_PATH = MODULE_CONFIG.path;
const SOCKET_EVENT = "module.draw-steel-plus";

function getState() {
  const raw = game.settings.get(MODULE_ID, "negotiationState");
  return foundry.utils.mergeObject(foundry.utils.deepClone(DEFAULT_NEGOTIATION_STATE), raw);
}

async function setState(updates) {
  const current = getState();
  const merged = foundry.utils.mergeObject(current, updates, { insertKeys: true, insertValues: true });
  await game.settings.set(MODULE_ID, "negotiationState", merged);
  game.socket.emit(SOCKET_EVENT, { type: "negotiationUpdate" });
}

async function setStateReplace(state) {
  await game.settings.set(MODULE_ID, "negotiationState", state);
  game.socket.emit(SOCKET_EVENT, { type: "negotiationUpdate" });
}

function getMotivationLabel(id) {
  const key = `DRAW_STEEL_PLUS.Negotiation.motivationNames.${id}`;
  const localized = game.i18n.localize(key);
  return localized !== key ? localized : id;
}

function getAvailableCanonical() {
  const state = getState();
  const used = new Set([
    ...state.motivations.filter((m) => !m.custom).map((m) => m.id),
    ...state.pitfalls.filter((p) => !p.custom).map((p) => p.id),
  ]);
  return NEGOTIATION_MOTIVATIONS.filter((id) => !used.has(id)).map((id) => ({
    id,
    label: getMotivationLabel(id),
  }));
}

async function addCustomEntry(listType, label) {
  const state = getState();
  const list = [...state[listType]];
  const customId = `custom_${Date.now()}`;
  const entry = listType === "pitfalls"
    ? { id: customId, custom: true, label, discovered: false, triggered: false }
    : { id: customId, custom: true, label, discovered: false, appealed: false };
  list.push(entry);
  await setStateReplace({ ...state, [listType]: list });
}

export class NegotiationUI extends DspFloatingUI {
  static instance = null;

  _openPopup = null;
  _boundOutsideClick = null;
  _boundEscapeKey = null;

  static DEFAULT_OPTIONS = {
    id: "dsp-negotiation",
    tag: "div",
    classes: ["dsp-negotiation"],
    actions: {
      toggleSliderVisibility: NegotiationUI.#onToggleSliderVisibility,
      incrementSlider: NegotiationUI.#onIncrementSlider,
      decrementSlider: NegotiationUI.#onDecrementSlider,
      resetSlider: NegotiationUI.#onResetSlider,
      openAttitudePopup: NegotiationUI.#onOpenAttitudePopup,
      selectAttitude: NegotiationUI.#onSelectAttitude,
      openMotivationsPopup: NegotiationUI.#onOpenMotivationsPopup,
      openPitfallsPopup: NegotiationUI.#onOpenPitfallsPopup,
      toggleAppealed: NegotiationUI.#onToggleAppealed,
      toggleTriggered: NegotiationUI.#onToggleTriggered,
      toggleDiscovered: NegotiationUI.#onToggleDiscovered,
      removeEntry: NegotiationUI.#onRemoveEntry,
      showAddList: NegotiationUI.#onShowAddList,
      addFromList: NegotiationUI.#onAddFromList,
      showAddCustom: NegotiationUI.#onShowAddCustom,
      endNegotiation: NegotiationUI.#onEndNegotiation,
    },
  };

  static PARTS = {
    content: {
      template: `${MODULE_PATH}/templates/ui/negotiation.hbs`,
    },
  };

  static syncVisibility(visible) {
    if (visible) {
      if (!NegotiationUI.instance?.rendered) {
        NegotiationUI.instance = new NegotiationUI();
        NegotiationUI.instance.render({ force: true });
      }
    } else {
      if (NegotiationUI.instance) {
        if (NegotiationUI.instance.rendered) NegotiationUI.instance.close({ animate: false });
        NegotiationUI.instance = null;
      }
    }
  }

  _onClose(options) {
    super._onClose(options);
    if (this._boundEscapeKey) {
      document.removeEventListener("keydown", this._boundEscapeKey);
      this._boundEscapeKey = null;
    }
    if (NegotiationUI.instance === this) NegotiationUI.instance = null;
  }

  async _prepareContext(options) {
    const state = getState();
    const isGM = game.user.isGM;

    const sliders = ["interest", "patience", "impression"].map((key) => {
      const s = state[key];
      const max = key === "impression" ? 12 : 5;
      const numeric = key === "impression";
      const segments = [];
      if (!numeric) {
        for (let i = 0; i <= max; i++) {
          segments.push({ value: i, active: i <= s.value });
        }
      }
      return {
        key,
        label: game.i18n.localize(`DRAW_STEEL_PLUS.Negotiation.${key}`),
        value: s.value,
        max,
        visible: s.visible,
        segments,
        numeric,
        show: isGM || s.visible,
      };
    });

    const motivations = state.motivations.map((m) => ({
      ...m,
      displayLabel: m.custom ? m.label : getMotivationLabel(m.id),
    }));

    const pitfalls = state.pitfalls.map((p) => ({
      ...p,
      displayLabel: p.custom ? p.label : getMotivationLabel(p.id),
    }));

    const discoveredMotivations = motivations.filter((m) => m.discovered);
    const discoveredPitfalls = pitfalls.filter((p) => p.discovered);
    const hasDiscovered = discoveredMotivations.length > 0 || discoveredPitfalls.length > 0;
    const hasVisibleSliders = sliders.some((s) => s.show);

    const attitudeLabel = state.attitude
      ? game.i18n.localize(`DRAW_STEEL_PLUS.Negotiation.attitudes.${state.attitude}`)
      : game.i18n.localize("DRAW_STEEL_PLUS.Negotiation.attitude");

    const attitudes = Object.entries(NEGOTIATION_ATTITUDES).map(([key, vals]) => ({
      key,
      label: game.i18n.localize(`DRAW_STEEL_PLUS.Negotiation.attitudes.${key}`),
      interest: vals.interest,
      patience: vals.patience,
      selected: state.attitude === key,
    }));

    const availableCanonical = isGM ? getAvailableCanonical() : [];

    return {
      ...this.getFloatingState(),
      isGM,
      npcName: state.npcName,
      sliders,
      attitudeLabel,
      attitudes,
      motivations,
      pitfalls,
      motivationCount: motivations.length,
      pitfallCount: pitfalls.length,
      discoveredMotivations,
      discoveredPitfalls,
      hasDiscovered,
      hasVisibleSliders,
      openPopup: this._openPopup,
      availableCanonical,
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    if (!game.user.isGM) return;

    const nameInput = this.element.querySelector(".dsp-neg-npc-name");
    if (nameInput) {
      nameInput.addEventListener("change", async (e) => {
        await setState({ npcName: e.target.value });
      });
    }

    const customInput = this.element.querySelector(".dsp-neg-custom-input");
    if (customInput) {
      customInput.addEventListener("keydown", async (e) => {
        if (e.key !== "Enter") return;
        const value = e.target.value.trim();
        if (!value) return;
        const listType = e.target.dataset.listType;
        await addCustomEntry(listType, value);
      });
    }

    if (this._boundOutsideClick) {
      this.element.removeEventListener("click", this._boundOutsideClick);
    }
    this._boundOutsideClick = (e) => {
      if (!this._openPopup) return;
      if (e.target.closest(".dsp-neg-popup")) return;
      if (e.target.closest("[data-action='openAttitudePopup']")) return;
      if (e.target.closest("[data-action='openMotivationsPopup']")) return;
      if (e.target.closest("[data-action='openPitfallsPopup']")) return;
      if (e.target.closest("[data-action='showAddList']")) return;
      if (e.target.closest("[data-action='showAddCustom']")) return;
      this._openPopup = null;
      this.render();
    };
    this.element.addEventListener("click", this._boundOutsideClick);

    if (this._boundEscapeKey) {
      document.removeEventListener("keydown", this._boundEscapeKey);
    }
    this._boundEscapeKey = (e) => {
      if (e.key !== "Escape" || !this._openPopup) return;
      e.stopPropagation();
      this._openPopup = null;
      this.render();
    };
    document.addEventListener("keydown", this._boundEscapeKey);

    const autoFocusEl = this.element.querySelector("[autofocus]");
    if (autoFocusEl) autoFocusEl.focus();
  }

  static async #onToggleSliderVisibility(event, target) {
    const key = target.dataset.slider;
    const state = getState();
    state[key].visible = !state[key].visible;
    await setStateReplace(state);
  }

  static async #onIncrementSlider(event, target) {
    const key = target.dataset.slider;
    const max = key === "impression" ? 12 : 5;
    const state = getState();
    if (state[key].value < max) {
      state[key].value += 1;
      await setStateReplace(state);
    }
  }

  static async #onDecrementSlider(event, target) {
    const key = target.dataset.slider;
    const state = getState();
    if (state[key].value > 0) {
      state[key].value -= 1;
      await setStateReplace(state);
    }
  }

  static async #onResetSlider(event, target) {
    const key = target.dataset.slider;
    const state = getState();
    const attitude = state.attitude ? NEGOTIATION_ATTITUDES[state.attitude] : null;
    if (key === "impression") {
      state.impression.value = 0;
    } else if (attitude) {
      state[key].value = attitude[key];
    } else {
      state[key].value = 0;
    }
    await setStateReplace(state);
  }

  static async #onOpenAttitudePopup() {
    this._openPopup = this._openPopup === "attitude" ? null : "attitude";
    this.render();
  }

  static async #onSelectAttitude(event, target) {
    const attitude = target.dataset.attitude;
    const defaults = NEGOTIATION_ATTITUDES[attitude];
    const state = getState();
    state.attitude = attitude;
    state.interest.value = defaults.interest;
    state.patience.value = defaults.patience;
    this._openPopup = null;
    await setStateReplace(state);
  }

  static async #onOpenMotivationsPopup() {
    this._openPopup = this._openPopup === "motivations" ? null : "motivations";
    this.render();
  }

  static async #onOpenPitfallsPopup() {
    this._openPopup = this._openPopup === "pitfalls" ? null : "pitfalls";
    this.render();
  }

  static async #onToggleAppealed(event, target) {
    const entryId = target.dataset.entryId;
    const state = getState();
    const list = [...state.motivations];
    const entry = list.find((m) => m.id === entryId);
    if (entry) {
      entry.appealed = !entry.appealed;
      this._openPopup = "motivations";
      await setStateReplace({ ...state, motivations: list });
    }
  }

  static async #onToggleTriggered(event, target) {
    const entryId = target.dataset.entryId;
    const state = getState();
    const list = [...state.pitfalls];
    const entry = list.find((p) => p.id === entryId);
    if (entry) {
      entry.triggered = !entry.triggered;
      this._openPopup = "pitfalls";
      await setStateReplace({ ...state, pitfalls: list });
    }
  }

  static async #onToggleDiscovered(event, target) {
    const entryId = target.dataset.entryId;
    const listType = target.dataset.listType;
    const state = getState();
    const list = [...state[listType]];
    const entry = list.find((e) => e.id === entryId);
    if (entry) {
      entry.discovered = !entry.discovered;
      this._openPopup = listType;
      await setStateReplace({ ...state, [listType]: list });
    }
  }

  static async #onRemoveEntry(event, target) {
    const entryId = target.dataset.entryId;
    const listType = target.dataset.listType;
    const state = getState();
    const list = state[listType].filter((e) => e.id !== entryId);
    this._openPopup = listType;
    await setStateReplace({ ...state, [listType]: list });
  }

  static async #onShowAddList(event, target) {
    const listType = target.dataset.listType;
    this._openPopup = `${listType}-addList`;
    this.render();
  }

  static async #onAddFromList(event, target) {
    const id = target.dataset.motivationId;
    const listType = target.dataset.listType;
    const state = getState();
    const list = [...state[listType]];
    const entry = listType === "pitfalls"
      ? { id, custom: false, label: null, discovered: false, triggered: false }
      : { id, custom: false, label: null, discovered: false, appealed: false };
    list.push(entry);
    this._openPopup = listType;
    await setStateReplace({ ...state, [listType]: list });
  }

  static async #onShowAddCustom(event, target) {
    const listType = target.dataset.listType;
    this._openPopup = `${listType}-addCustom`;
    this.render();
  }

  static async #onEndNegotiation() {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("DRAW_STEEL_PLUS.Negotiation.endNegotiation") },
      content: `<p>${game.i18n.localize("DRAW_STEEL_PLUS.Negotiation.endNegotiationConfirm")}</p>`,
      yes: { default: true },
    });
    if (!confirmed) return;

    await game.settings.set(MODULE_ID, "negotiationState", foundry.utils.deepClone(DEFAULT_NEGOTIATION_STATE));
    await game.settings.set(MODULE_ID, "negotiationUIVisible", false);
    NegotiationUI.syncVisibility(false);
    game.socket.emit(SOCKET_EVENT, { type: "negotiationVisibility", visible: false });
  }
}

function setupNegotiationSocket() {
  game.socket.on(SOCKET_EVENT, (data) => {
    if (data.type === "negotiationVisibility") {
      NegotiationUI.syncVisibility(data.visible);
    }
    if (data.type === "negotiationUpdate") {
      if (NegotiationUI.instance?.rendered) NegotiationUI.instance.render();
    }
  });
}

export function initializeNegotiationUI() {
  setupNegotiationSocket();
  const visible = game.settings.get(MODULE_ID, "negotiationUIVisible");
  NegotiationUI.syncVisibility(visible);
}
