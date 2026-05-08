import { MODULE_CONFIG } from "./config.js";
import { NegotiationUI } from "./negotiation-ui.js";
import { MontageUI } from "./montage-ui.js";

const MODULE_ID = MODULE_CONFIG.id;
const SOCKET_EVENT = "module.draw-steel-plus";

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
      const toggled = !game.settings.get(MODULE_ID, "negotiationUIVisible");
      game.settings.set(MODULE_ID, "negotiationUIVisible", toggled);
      NegotiationUI.syncVisibility(toggled);
      game.socket.emit(SOCKET_EVENT, {
        type: "negotiationVisibility",
        visible: toggled,
      });
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
      MontageUI.syncVisibility(toggled);
      game.socket.emit(SOCKET_EVENT, {
        type: "montageVisibility",
        visible: toggled,
      });
    },
  };
});
