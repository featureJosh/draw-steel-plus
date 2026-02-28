import { MODULE_CONFIG } from "./config.js";
import { DspFloatingUI } from "./dsp-floating-ui.js";

const MODULE_ID = MODULE_CONFIG.id;
const MODULE_PATH = MODULE_CONFIG.path;

export class NegotiationUI extends DspFloatingUI {
  static instance = null;

  static DEFAULT_OPTIONS = {
    id: "dsp-negotiation",
    tag: "div",
    classes: ["dsp-negotiation"],
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
        NegotiationUI.instance.render(true);
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
    if (NegotiationUI.instance === this) NegotiationUI.instance = null;
  }

  async _prepareContext() {
    return this.getFloatingState();
  }
}

const SOCKET_EVENT = "module.draw-steel-plus";

function setupNegotiationSocket() {
  game.socket.on(SOCKET_EVENT, (data) => {
    if (data.type === "negotiationVisibility") {
      NegotiationUI.syncVisibility(data.visible);
    }
  });
}

export function initializeNegotiationUI() {
  setupNegotiationSocket();
  const visible = game.settings.get(MODULE_ID, "negotiationUIVisible");
  NegotiationUI.syncVisibility(visible);
}
