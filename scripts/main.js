import { MODULE_CONFIG } from "./config.js";
import { applyColorOverrides } from "./color-settings.js";
import { applyImprovedChat, enhanceChatMessage, registerChatTemplates } from "./chat.js";
import { registerSettings } from "./settings.js";
import { loadSheetSizes } from "./ui-helpers.js";
import { registerSheets } from "./sheets.js";
import { MetaCurrencyTracker } from "./meta-currency.js";
import { TooltipsDSP } from "./tooltips.js";

const MODULE_ID = MODULE_CONFIG.id;

let SHEET_SIZES;

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing Draw Steel Plus`);
  registerSettings();
  registerChatTemplates();
  SHEET_SIZES = loadSheetSizes();
  console.log(`${MODULE_ID} | Sheet sizes loaded:`, SHEET_SIZES);

  registerSheets(SHEET_SIZES);
});

Hooks.once("ready", () => {
  applyColorOverrides();
  applyImprovedChat();
  MetaCurrencyTracker.initialize();
  TooltipsDSP.activateListeners();
  const tooltips = new TooltipsDSP();
  tooltips.observe();
  game.modules.get(MODULE_ID).tooltips = tooltips;
});

Hooks.on("renderPlayers", () => {
  if (MetaCurrencyTracker.instance?.rendered) MetaCurrencyTracker.instance.render();
});

Hooks.on("createCombat", () => {
  if (MetaCurrencyTracker.instance?.rendered) MetaCurrencyTracker.instance.render();
});

Hooks.on("deleteCombat", () => {
  if (MetaCurrencyTracker.instance?.rendered) MetaCurrencyTracker.instance.render();
});

Hooks.on("updateCombat", () => {
  if (MetaCurrencyTracker.instance?.rendered) MetaCurrencyTracker.instance.render();
});

Hooks.on("renderChatMessageHTML", (message, html, context) => {
  if (!game.settings.get(MODULE_ID, "improvedChat")) return;
  enhanceChatMessage(message, html);
});
