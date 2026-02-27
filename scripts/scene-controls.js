import { MODULE_CONFIG } from "./config.js";
import { NegotiationUI } from "./negotiation-ui.js";

const MODULE_ID = MODULE_CONFIG.id;
const SOCKET_EVENT = "module.draw-steel-plus";

Hooks.on("getSceneControlButtons", (controls) => {
  controls.tokens.tools.drawSteelPlus = {
    name: "drawSteelPlus",
    title: "DRAW_STEEL_PLUS.SceneControl.negotiation",
    icon: "fa-sharp fa-solid fa-comment-lines",
    order: Object.keys(controls.tokens.tools).length,
    button: true,
    visible: game.user.isGM,
    active: () => game.settings.get(MODULE_ID, "negotiationUIVisible"),
    onChange: () => {
      if (!game.user.isGM) return;
      const toggled = !game.settings.get(MODULE_ID, "negotiationUIVisible");
      game.settings.set(MODULE_ID, "negotiationUIVisible", toggled);
      NegotiationUI.syncVisibility(toggled);
      game.socket.emit(SOCKET_EVENT, { type: "negotiationVisibility", visible: toggled });
    }
  };
});
