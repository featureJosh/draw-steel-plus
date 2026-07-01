import { MODULE_CONFIG } from "./config.js";

const MODULE_ID = MODULE_CONFIG.id;

let _socket = null;
const _handlers = new Map();

export function registerSocketFunction(name, fn) {
  _handlers.set(name, fn);
  _socket?.register(name, fn);
}

export async function executeAsGM(name, ...args) {
  if (_socket) return _socket.executeAsGM(name, ...args);
  const fn = _handlers.get(name);
  if (fn && game.user.isGM) return fn(...args);
  ui.notifications?.warn(
    game.i18n?.localize("DRAW_STEEL_PLUS.Socket.unavailable") ??
      "socketlib is not available.",
  );
}

Hooks.once("socketlib.ready", () => {
  _socket = socketlib.registerModule(MODULE_ID);
  for (const [name, fn] of _handlers) _socket.register(name, fn);
});
