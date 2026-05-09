import { MODULE_CONFIG } from "./config.js";

const MODULE_ID = MODULE_CONFIG.id;

export const MODULE_SOCKET_EVENT = `module.${MODULE_ID}`;

const _socketSetups = new Set();

export function emitModuleSocket(type, data = {}) {
  game.socket?.emit?.(MODULE_SOCKET_EVENT, { type, ...data });
}

export function createSyncedSettingState(settingKey, defaults, updateType) {
  const get = () => {
    const raw = game.settings.get(MODULE_ID, settingKey);
    return foundry.utils.mergeObject(foundry.utils.deepClone(defaults), raw);
  };

  const replace = async (state) => {
    await game.settings.set(MODULE_ID, settingKey, state);
    emitModuleSocket(updateType);
  };

  const patch = async (updates) => {
    const merged = foundry.utils.mergeObject(get(), updates, {
      insertKeys: true,
      insertValues: true,
    });
    await replace(merged);
  };

  return { get, patch, replace };
}

export function syncFloatingVisibility(AppClass, visible) {
  if (visible) {
    if (!AppClass.instance?.rendered) {
      AppClass.instance = new AppClass();
      AppClass.instance.render({ force: true });
    }
    return;
  }

  if (!AppClass.instance) return;
  if (AppClass.instance.rendered) {
    AppClass.instance.close({ animate: false });
  }
  AppClass.instance = null;
}

export function renderFloatingInstance(AppClass) {
  if (AppClass.instance?.rendered) AppClass.instance.render();
}

export function setupModuleSocket(key, handler) {
  if (_socketSetups.has(key)) return;
  if (typeof game.socket?.on !== "function") return;
  _socketSetups.add(key);
  game.socket.on(MODULE_SOCKET_EVENT, handler);
}
