import { MODULE_CONFIG, SHEET_SIZE_DEFAULTS } from "./config.js";
import { applyColorOverrides } from "./color-settings.js";
import { applyScaleOverrides } from "./scale-settings.js";
import { applyImprovedChat, enhanceChatMessage, registerChatTemplates } from "./chat.js";
import { registerSettings } from "./settings.js";
import { registerSheets } from "./sheets.js";
import { MetaCurrencyTracker } from "./meta-currency.js";
import { CombatTrackerUI } from "./combat-tracker-ui.js";
import { AbilityHudUI } from "./ability-hud-ui.js";
import { initializeNegotiationUI } from "./negotiation-ui.js";
import { initializeMontageUI } from "./montage-ui.js";
import { TooltipsDSP } from "./tooltips.js";
import "./scene-controls.js";

const MODULE_ID = MODULE_CONFIG.id;

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing Draw Steel Plus`);
  registerSettings();
  if (game.settings.get(MODULE_ID, "improvedChat")) {
    registerChatTemplates();
  }
  registerSheets(SHEET_SIZE_DEFAULTS);
});

function applyMetaCurrencySetting() {
  const useCustom = game.settings.get(MODULE_ID, "useCustomMetaCurrency");
  document.body.classList.toggle("dsp-custom-meta-currency", useCustom);
  if (useCustom) {
    MetaCurrencyTracker.initialize();
  } else {
    MetaCurrencyTracker.instance?.close();
    MetaCurrencyTracker.instance = null;
  }
}

Hooks.once("ready", () => {
  applyColorOverrides();
  applyScaleOverrides();
  applyImprovedChat();
  applyMetaCurrencySetting();
  CombatTrackerUI.initialize();
  AbilityHudUI.initialize();
  initializeNegotiationUI();
  initializeMontageUI();
  TooltipsDSP.activateListeners();
  const tooltips = new TooltipsDSP();
  tooltips.observe();
  game.modules.get(MODULE_ID).tooltips = tooltips;
});

Hooks.on("combatStart", () => CombatTrackerUI.show());
Hooks.on("deleteCombat", () => {
  if (!game.combats?.some(c => c.started)) CombatTrackerUI.hide();
});

const rerenderTracker = () => {
  if (MetaCurrencyTracker.instance?.rendered) MetaCurrencyTracker.instance.render();
};
for (const hook of ["renderPlayers", "createCombat", "deleteCombat", "updateCombat"]) {
  Hooks.on(hook, rerenderTracker);
}

Hooks.on("renderChatMessageHTML", (message, html, context) => {
  if (!game.settings.get(MODULE_ID, "improvedChat")) return;
  enhanceChatMessage(message, html);
});
