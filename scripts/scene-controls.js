import { MODULE_CONFIG } from "./config.js";

const MODULE_ID = MODULE_CONFIG.id;

Hooks.on("getSceneControlButtons", (controls) => {
  controls.tokens.tools.drawSteelPlus = {
    name: "drawSteelPlus",
    title: "DRAW_STEEL_PLUS.SceneControl.negotiation",
    icon: "fa-solid fa-comment-lines",
    order: Object.keys(controls.tokens.tools).length,
    button: true,
    visible: game.user.isGM,
    active: game.settings.get(MODULE_ID, "negotiationUIVisible"),
    onChange: (event, active) => {
      if (!game.user.isGM) return;
      //      it persists to the database AND fires its onChange (settings.js) on
      //      every connected client — that onChange opens/closes the panel for
      //      the GM and all players. No manual socket message needed.
      const toggled = !game.settings.get(MODULE_ID, "negotiationUIVisible");
      game.settings.set(MODULE_ID, "negotiationUIVisible", toggled);
    },
  };

  controls.tokens.tools.drawSteelPlusMontage = {
    name: "drawSteelPlusMontage",
    title: "DRAW_STEEL_PLUS.SceneControl.montage",
    icon: "fa-solid fa-mountain",
    order: Object.keys(controls.tokens.tools).length,
    button: true,
    visible: game.user.isGM,
    active: game.settings.get(MODULE_ID, "montageUIVisible"),
    onChange: (event, active) => {
      if (!game.user.isGM) return;
      const toggled = !game.settings.get(MODULE_ID, "montageUIVisible");
      game.settings.set(MODULE_ID, "montageUIVisible", toggled);
    },
  };
});
