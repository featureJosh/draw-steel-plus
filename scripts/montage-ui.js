import { MODULE_CONFIG, MONTAGE_DIFFICULTIES, MONTAGE_CHARACTERISTICS, MONTAGE_TEST_DIFFICULTIES, DEFAULT_MONTAGE_STATE } from "./config.js";
import { DspFloatingUI } from "./dsp-floating-ui.js";

const MODULE_ID = MODULE_CONFIG.id;
const MODULE_PATH = MODULE_CONFIG.path;
const SOCKET_EVENT = "module.draw-steel-plus";

let _pendingMontageSkill = null;

function getState() {
  const raw = game.settings.get(MODULE_ID, "montageState");
  return foundry.utils.mergeObject(foundry.utils.deepClone(DEFAULT_MONTAGE_STATE), raw);
}

async function setState(updates) {
  const current = getState();
  const merged = foundry.utils.mergeObject(current, updates, { insertKeys: true, insertValues: true });
  await game.settings.set(MODULE_ID, "montageState", merged);
  game.socket.emit(SOCKET_EVENT, { type: "montageUpdate" });
}

async function setStateReplace(state) {
  await game.settings.set(MODULE_ID, "montageState", state);
  game.socket.emit(SOCKET_EVENT, { type: "montageUpdate" });
}

function computeAdjustedLimits(difficulty, heroCount) {
  const base = MONTAGE_DIFFICULTIES[difficulty];
  if (!base) return { success: 0, failure: 0 };
  const adj = heroCount - 5;
  return {
    success: Math.max(2, base.success + adj),
    failure: Math.max(2, base.failure + adj),
  };
}

function computeOutcome(state) {
  const { successes, failures, successLimit, failureLimit, currentRound, maxRounds, heroes } = state;
  if (successLimit <= 0) return "";
  if (successes >= successLimit) return "totalSuccess";
  const failed = failures >= failureLimit;
  const timedOut = currentRound > maxRounds;
  const allActed = heroes.length > 0 && currentRound >= maxRounds && heroes.every((h) => h.actedThisRound);
  if (failed || timedOut || allActed) {
    return (successes - failures >= 2) ? "partialSuccess" : "totalFailure";
  }
  return "";
}

function victoryCount(outcome, difficulty) {
  if (outcome === "totalSuccess") {
    return difficulty === "hard" ? 2 : 1;
  }
  if (outcome === "partialSuccess") {
    return (difficulty === "hard" || difficulty === "moderate") ? 1 : 0;
  }
  return 0;
}

export class MontageUI extends DspFloatingUI {
  static instance = null;

  _openPopup = null;
  _rollHeroUuid = null;
  _rollCharacteristic = "might";
  _rollSkill = "";
  _rollDifficulty = "easy";
  _rollEdges = 0;
  _rollBanes = 0;
  _boundOutsideClick = null;
  _boundEscapeKey = null;

  static DEFAULT_OPTIONS = {
    id: "dsp-montage",
    tag: "div",
    classes: ["dsp-montage"],
    actions: {
      toggleSliderVisibility: MontageUI.#onToggleSliderVisibility,
      incrementSlider: MontageUI.#onIncrementSlider,
      decrementSlider: MontageUI.#onDecrementSlider,
      resetSlider: MontageUI.#onResetSlider,
      openDifficultyPopup: MontageUI.#onOpenDifficultyPopup,
      selectDifficulty: MontageUI.#onSelectDifficulty,
      openHeroesPopup: MontageUI.#onOpenHeroesPopup,
      openOutcomePopup: MontageUI.#onOpenOutcomePopup,
      toggleActed: MontageUI.#onToggleActed,
      removeHero: MontageUI.#onRemoveHero,
      nextRound: MontageUI.#onNextRound,
      prevRound: MontageUI.#onPrevRound,
      openRollForm: MontageUI.#onOpenRollForm,
      incrementRollEdges: MontageUI.#onIncrementRollEdges,
      decrementRollEdges: MontageUI.#onDecrementRollEdges,
      incrementRollBanes: MontageUI.#onIncrementRollBanes,
      decrementRollBanes: MontageUI.#onDecrementRollBanes,
      executeRoll: MontageUI.#onExecuteRoll,
      awardVictories: MontageUI.#onAwardVictories,
      endMontage: MontageUI.#onEndMontage,
    },
  };

  static PARTS = {
    content: {
      template: `${MODULE_PATH}/templates/ui/montage.hbs`,
    },
  };

  static syncVisibility(visible) {
    if (visible) {
      if (!MontageUI.instance?.rendered) {
        MontageUI.instance = new MontageUI();
        MontageUI.instance.render({ force: true });
      }
    } else {
      if (MontageUI.instance) {
        if (MontageUI.instance.rendered) MontageUI.instance.close({ animate: false });
        MontageUI.instance = null;
      }
    }
  }

  _onClose(options) {
    super._onClose(options);
    if (this._boundEscapeKey) {
      document.removeEventListener("keydown", this._boundEscapeKey);
      this._boundEscapeKey = null;
    }
    if (MontageUI.instance === this) MontageUI.instance = null;
  }

  async _prepareContext(options) {
    const state = getState();
    const isGM = game.user.isGM;
    const outcome = computeOutcome(state);

    const sliders = [
      { key: "successes", label: game.i18n.localize("DRAW_STEEL_PLUS.MontageTest.successes"), value: state.successes, max: state.successLimit || 0, visible: state.successesVisible },
      { key: "failures", label: game.i18n.localize("DRAW_STEEL_PLUS.MontageTest.failures"), value: state.failures, max: state.failureLimit || 0, visible: state.failuresVisible },
    ].map((s) => {
      const segments = [];
      for (let i = 1; i <= s.max; i++) {
        segments.push({ value: i, active: i <= s.value });
      }
      return { ...s, segments, show: isGM || s.visible };
    });

    const roundInfo = {
      current: state.currentRound,
      max: state.maxRounds,
      visible: state.roundVisible,
      show: isGM || state.roundVisible,
      canGoBack: state.currentRound > 1,
    };

    const heroEntries = await Promise.all(state.heroes.map(async (h) => {
      let actor = null;
      try { actor = await fromUuid(h.uuid); } catch (e) {}
      return {
        uuid: h.uuid,
        name: h.name || actor?.name || "Unknown",
        img: h.img || actor?.img || "icons/svg/mystery-man.svg",
        actedThisRound: h.actedThisRound,
        usedSkills: h.usedSkills || [],
      };
    }));

    const difficulties = Object.entries(MONTAGE_DIFFICULTIES).map(([key, vals]) => {
      const adjusted = computeAdjustedLimits(key, state.heroCount);
      return {
        key,
        label: game.i18n.localize(`DRAW_STEEL_PLUS.MontageTest.difficulties.${key}`),
        baseSuccess: vals.success,
        baseFailure: vals.failure,
        adjSuccess: adjusted.success,
        adjFailure: adjusted.failure,
        selected: state.difficulty === key,
      };
    });

    const difficultyLabel = state.difficulty
      ? game.i18n.localize(`DRAW_STEEL_PLUS.MontageTest.difficulties.${state.difficulty}`)
      : game.i18n.localize("DRAW_STEEL_PLUS.MontageTest.difficulty");

    const characteristics = MONTAGE_CHARACTERISTICS.map((c) => ({
      key: c,
      label: game.i18n.localize(`DRAW_STEEL_PLUS.MontageTest.characteristics.${c}`),
      selected: c === this._rollCharacteristic,
    }));

    const testDifficulties = MONTAGE_TEST_DIFFICULTIES.map((d) => ({
      key: d,
      label: game.i18n.localize(`DRAW_STEEL_PLUS.MontageTest.testDifficulties.${d}`),
      selected: d === this._rollDifficulty,
    }));

    const skillGroups = [];
    const dsSkills = ds?.CONFIG?.skills;
    if (dsSkills?.groups && dsSkills?.list && this._rollHeroUuid) {
      const rollHeroEntry = state.heroes.find((h) => h.uuid === this._rollHeroUuid);
      let heroSkills = null;
      if (rollHeroEntry) {
        try {
          const rollActor = await fromUuid(this._rollHeroUuid);
          heroSkills = rollActor?.system?.hero?.skills ?? null;
        } catch (e) {}
      }
      for (const [groupKey, groupData] of Object.entries(dsSkills.groups)) {
        const skills = Object.entries(dsSkills.list)
          .filter(([key, s]) => s.group === groupKey && (!heroSkills || heroSkills.has(key)))
          .map(([key, s]) => ({
            key,
            label: game.i18n.localize(s.label),
            selected: key === this._rollSkill,
          }));
        if (skills.length) {
          skillGroups.push({
            key: groupKey,
            label: game.i18n.localize(groupData.label),
            skills,
          });
        }
      }
    }

    const hasVisibleSliders = sliders.some((s) => s.show);

    const outcomeLabel = outcome
      ? game.i18n.localize(`DRAW_STEEL_PLUS.MontageTest.outcomes.${outcome}`)
      : game.i18n.localize("DRAW_STEEL_PLUS.MontageTest.outcomes.inProgress");

    const victories = victoryCount(outcome, state.difficulty);

    return {
      ...this.getFloatingState(),
      isGM,
      title: state.title,
      sliders,
      roundInfo,
      heroCount: state.heroCount,
      heroes: heroEntries,
      heroCountDisplay: heroEntries.length,
      difficulties,
      difficulty: state.difficulty,
      difficultyLabel,
      characteristics,
      testDifficulties,
      skillGroups,
      rollHeroUuid: this._rollHeroUuid,
      rollCharacteristic: this._rollCharacteristic,
      rollSkill: this._rollSkill,
      rollEdges: this._rollEdges,
      rollBanes: this._rollBanes,
      hasVisibleSliders,
      outcome,
      outcomeLabel,
      victories,
      successes: state.successes,
      failures: state.failures,
      openPopup: this._openPopup,
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    if (!game.user.isGM) return;

    const titleInput = this.element.querySelector(".dsp-mt-title-input");
    if (titleInput) {
      titleInput.addEventListener("change", async (e) => {
        await setState({ title: e.target.value });
      });
    }

    const heroCountInput = this.element.querySelector(".dsp-mt-hero-count-input");
    if (heroCountInput) {
      heroCountInput.addEventListener("change", async (e) => {
        const val = Math.max(1, parseInt(e.target.value) || 5);
        const state = getState();
        const updates = { heroCount: val };
        if (state.difficulty) {
          const adj = computeAdjustedLimits(state.difficulty, val);
          updates.successLimit = adj.success;
          updates.failureLimit = adj.failure;
        }
        await setState(updates);
      });
    }

    const charSelect = this.element.querySelector(".dsp-mt-roll-select[data-field='characteristic']");
    if (charSelect) {
      charSelect.addEventListener("change", (e) => {
        this._rollCharacteristic = e.target.value;
      });
    }

    const diffSelect = this.element.querySelector(".dsp-mt-roll-select[data-field='testDifficulty']");
    if (diffSelect) {
      diffSelect.addEventListener("change", (e) => {
        this._rollDifficulty = e.target.value;
      });
    }

    const skillSelect = this.element.querySelector(".dsp-mt-roll-select[data-field='skill']");
    if (skillSelect) {
      skillSelect.addEventListener("change", (e) => {
        this._rollSkill = e.target.value;
        this.render();
      });
    }

    const dropZones = this.element.querySelectorAll(".dsp-mt-drop-zone");
    for (const dz of dropZones) {
      dz.addEventListener("dragover", (e) => {
        e.preventDefault();
        dz.classList.add("dsp-mt-drop-hover");
      });
      dz.addEventListener("dragleave", () => {
        dz.classList.remove("dsp-mt-drop-hover");
      });
      dz.addEventListener("drop", async (e) => {
        e.preventDefault();
        dz.classList.remove("dsp-mt-drop-hover");
        let data;
        try { data = JSON.parse(e.dataTransfer.getData("text/plain")); } catch { return; }
        if (data?.type !== "Actor") return;
        const actor = await fromUuid(data.uuid);
        if (!actor || actor.type !== "hero") return;
        const state = getState();
        if (state.heroes.some((h) => h.uuid === data.uuid)) return;
        const heroes = [...state.heroes, {
          uuid: data.uuid,
          name: actor.name,
          img: actor.img || "icons/svg/mystery-man.svg",
          actedThisRound: false,
          usedSkills: [],
        }];
        await setStateReplace({ ...state, heroes });
      });
    }

    if (this._boundOutsideClick) {
      this.element.removeEventListener("click", this._boundOutsideClick);
    }
    this._boundOutsideClick = (e) => {
      if (!this._openPopup) return;
      if (e.target.closest(".dsp-mt-popup")) return;
      if (e.target.closest("[data-action='openDifficultyPopup']")) return;
      if (e.target.closest("[data-action='openHeroesPopup']")) return;
      if (e.target.closest("[data-action='openOutcomePopup']")) return;
      if (e.target.closest("[data-action='openRollForm']")) return;
      this._openPopup = null;
      this._rollHeroUuid = null;
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
      this._rollHeroUuid = null;
      this.render();
    };
    document.addEventListener("keydown", this._boundEscapeKey);
  }

  static async #onToggleSliderVisibility(event, target) {
    const key = target.dataset.slider;
    const state = getState();
    const visKey = `${key}Visible`;
    await setStateReplace({ ...state, [visKey]: !state[visKey] });
  }

  static async #onIncrementSlider(event, target) {
    const key = target.dataset.slider;
    const state = getState();
    const limitKey = key === "successes" ? "successLimit" : "failureLimit";
    if (state[key] < state[limitKey]) {
      await setStateReplace({ ...state, [key]: state[key] + 1 });
    }
  }

  static async #onDecrementSlider(event, target) {
    const key = target.dataset.slider;
    const state = getState();
    if (state[key] > 0) {
      await setStateReplace({ ...state, [key]: state[key] - 1 });
    }
  }

  static async #onResetSlider(event, target) {
    const key = target.dataset.slider;
    const state = getState();
    await setStateReplace({ ...state, [key]: 0 });
  }

  static async #onOpenDifficultyPopup() {
    this._openPopup = this._openPopup === "difficulty" ? null : "difficulty";
    this._rollHeroUuid = null;
    this.render();
  }

  static async #onSelectDifficulty(event, target) {
    const difficulty = target.dataset.difficulty;
    const state = getState();
    const adj = computeAdjustedLimits(difficulty, state.heroCount);
    this._openPopup = null;
    await setStateReplace({
      ...state,
      difficulty,
      successLimit: adj.success,
      failureLimit: adj.failure,
    });
  }

  static async #onOpenHeroesPopup() {
    this._openPopup = this._openPopup === "heroes" ? null : "heroes";
    this._rollHeroUuid = null;
    this.render();
  }

  static async #onOpenOutcomePopup() {
    this._openPopup = this._openPopup === "outcome" ? null : "outcome";
    this._rollHeroUuid = null;
    this.render();
  }

  static async #onToggleActed(event, target) {
    const uuid = target.dataset.heroUuid;
    const state = getState();
    const heroes = state.heroes.map((h) =>
      h.uuid === uuid ? { ...h, actedThisRound: !h.actedThisRound } : h
    );
    this._openPopup = "heroes";
    await setStateReplace({ ...state, heroes });
  }

  static async #onRemoveHero(event, target) {
    const uuid = target.dataset.heroUuid;
    const state = getState();
    const heroes = state.heroes.filter((h) => h.uuid !== uuid);
    this._openPopup = "heroes";
    await setStateReplace({ ...state, heroes });
  }

  static async #onNextRound() {
    const state = getState();
    const heroes = state.heroes.map((h) => ({ ...h, actedThisRound: false }));
    await setStateReplace({ ...state, currentRound: state.currentRound + 1, heroes });
  }

  static async #onPrevRound() {
    const state = getState();
    if (state.currentRound <= 1) return;
    const heroes = state.heroes.map((h) => ({ ...h, actedThisRound: false }));
    await setStateReplace({ ...state, currentRound: state.currentRound - 1, heroes });
  }

  static async #onOpenRollForm(event, target) {
    const uuid = target.dataset.heroUuid;
    if (this._rollHeroUuid === uuid) {
      this._rollHeroUuid = null;
    } else {
      this._rollHeroUuid = uuid;
      this._rollSkill = "";
      this._rollEdges = 0;
      this._rollBanes = 0;
    }
    this._openPopup = "heroes";
    this.render();
  }

  static async #onIncrementRollEdges() {
    this._rollEdges = Math.min(this._rollEdges + 1, 5);
    this._openPopup = "heroes";
    this.render();
  }

  static async #onDecrementRollEdges() {
    this._rollEdges = Math.max(this._rollEdges - 1, 0);
    this._openPopup = "heroes";
    this.render();
  }

  static async #onIncrementRollBanes() {
    this._rollBanes = Math.min(this._rollBanes + 1, 5);
    this._openPopup = "heroes";
    this.render();
  }

  static async #onDecrementRollBanes() {
    this._rollBanes = Math.max(this._rollBanes - 1, 0);
    this._openPopup = "heroes";
    this.render();
  }

  static async #onExecuteRoll() {
    const uuid = this._rollHeroUuid;
    if (!uuid) return;
    const actor = await fromUuid(uuid);
    if (!actor) return;

    const characteristic = this._rollCharacteristic;
    const difficulty = this._rollDifficulty;
    const edges = this._rollEdges;
    const banes = this._rollBanes;

    _pendingMontageSkill = this._rollSkill || null;

    let chatMessage;
    try {
      chatMessage = await actor.rollCharacteristic(characteristic, { difficulty, edges, banes });
    } finally {
      _pendingMontageSkill = null;
    }
    if (!chatMessage) return;

    const actualSkill = chatMessage.rolls?.[0]?.options?.skill || this._rollSkill || "";

    const parts = chatMessage.system?.parts?.sortedContents ?? [];
    const testPart = parts.find((p) => p.type === "test");
    const tier = testPart?.latestTest?.product;
    if (tier == null) return;

    const successThreshold = { easy: 1, medium: 2, hard: 3 }[difficulty] ?? 2;
    const isSuccess = tier >= successThreshold;

    const state = getState();
    const heroes = state.heroes.map((h) => {
      if (h.uuid !== uuid) return h;
      const usedSkills = [...(h.usedSkills || [])];
      if (actualSkill && !usedSkills.includes(actualSkill)) usedSkills.push(actualSkill);
      return { ...h, actedThisRound: true, usedSkills };
    });

    const updates = { heroes };
    if (isSuccess) {
      updates.successes = state.successes + 1;
    } else {
      updates.failures = state.failures + 1;
    }

    this._rollHeroUuid = null;
    this._rollSkill = "";
    this._openPopup = "heroes";
    await setStateReplace({ ...state, ...updates });
  }

  static async #onAwardVictories() {
    const state = getState();
    const outcome = computeOutcome(state);
    const count = victoryCount(outcome, state.difficulty);
    if (count <= 0) return;

    const victoryLabel = count === 1
      ? game.i18n.localize("DRAW_STEEL_PLUS.MontageTest.victory")
      : game.i18n.localize("DRAW_STEEL_PLUS.MontageTest.victories");

    const confirmMsg = game.i18n.format("DRAW_STEEL_PLUS.MontageTest.victoryAwardConfirm", { count, victoryLabel });
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("DRAW_STEEL_PLUS.MontageTest.victoryAward") },
      content: `<p>${confirmMsg}</p>`,
      yes: { default: true },
    });
    if (!confirmed) return;

    for (const hero of state.heroes) {
      const actor = await fromUuid(hero.uuid);
      if (!actor) continue;
      const current = actor.system?.hero?.victories ?? 0;
      await actor.update({ "system.hero.victories": current + count });
    }
  }

  static async #onEndMontage() {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("DRAW_STEEL_PLUS.MontageTest.endMontage") },
      content: `<p>${game.i18n.localize("DRAW_STEEL_PLUS.MontageTest.endMontageConfirm")}</p>`,
      yes: { default: true },
    });
    if (!confirmed) return;

    await game.settings.set(MODULE_ID, "montageState", foundry.utils.deepClone(DEFAULT_MONTAGE_STATE));
    await game.settings.set(MODULE_ID, "montageUIVisible", false);
    MontageUI.syncVisibility(false);
    game.socket.emit(SOCKET_EVENT, { type: "montageVisibility", visible: false });
  }
}

function setupMontageSocket() {
  game.socket.on(SOCKET_EVENT, (data) => {
    if (data.type === "montageVisibility") {
      MontageUI.syncVisibility(data.visible);
    }
    if (data.type === "montageUpdate") {
      if (MontageUI.instance?.rendered) MontageUI.instance.render();
    }
  });
}

function setupMontageSkillInjection() {
  const PRDialog = ds?.applications?.apps?.PowerRollDialog;
  if (!PRDialog) return;
  const origCreate = PRDialog.create;
  PRDialog.create = function (options) {
    if (_pendingMontageSkill && options?.context) {
      const ctx = options.context;
      if (ctx.skills?.has?.(_pendingMontageSkill)) {
        ctx.skill = _pendingMontageSkill;
        ctx.modifiers.bonuses = (ctx.modifiers.bonuses ?? 0) + 2;
        const sm = ctx.skillModifiers?.[_pendingMontageSkill];
        if (sm) {
          ctx.modifiers.edges = (ctx.modifiers.edges ?? 0) + (sm.edges ?? 0);
          ctx.modifiers.banes = (ctx.modifiers.banes ?? 0) + (sm.banes ?? 0);
        }
      }
      _pendingMontageSkill = null;
    }
    return origCreate.call(this, options);
  };
}

export function initializeMontageUI() {
  setupMontageSocket();
  setupMontageSkillInjection();
  const visible = game.settings.get(MODULE_ID, "montageUIVisible");
  MontageUI.syncVisibility(visible);
}
