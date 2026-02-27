import { MODULE_CONFIG } from "./config.js";
import { DspFloatingUI } from "./dsp-floating-ui.js";

const MODULE_ID = MODULE_CONFIG.id;
const MODULE_PATH = MODULE_CONFIG.path;

const NEGOTIATION_CONFIG = {
  positionKey: "negotiationPosition",
  lockedKey: "negotiationLocked",
  centeredKey: "negotiationCentered",
  expandedKey: null,
  dragHandleSelector: ".dsp-mc-drag-handle",
  lockedClass: "dsp-mc-locked",
  supportsExpand: false,
};

export class NegotiationUI extends DspFloatingUI {
  static instance;
  static CONFIG = NEGOTIATION_CONFIG;

  static DEFAULT_OPTIONS = {
    id: "dsp-negotiation",
    tag: "div",
    classes: ["dsp-negotiation"],
    window: {
      frame: false,
      positioned: true,
    },
    position: {
      width: "auto",
      height: "auto",
    },
    actions: {
      toggleLock: DspFloatingUI.createToggleLock(NegotiationUI, NEGOTIATION_CONFIG),
      resetPosition: DspFloatingUI.createResetPosition(NegotiationUI, NEGOTIATION_CONFIG),
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
    const isLocked = game.settings.get(MODULE_ID, NEGOTIATION_CONFIG.lockedKey);
    return { isLocked };
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
