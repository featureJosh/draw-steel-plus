import { MODULE_CONFIG } from "./config.js";

const MODULE_ID = MODULE_CONFIG.id;

export function createSyncedSettingState(settingKey, defaults) {
  const get = () => {
    const raw = game.settings.get(MODULE_ID, settingKey);
    return foundry.utils.mergeObject(foundry.utils.deepClone(defaults), raw);
  };

  const replace = async (state) => {
    await game.settings.set(MODULE_ID, settingKey, state);
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
  const inst = AppClass.instance;
  if (!inst) return;
  if (inst.rendered) {
    inst.render({ force: true });
  } else {
    setTimeout(() => {
      if (AppClass.instance?.rendered) AppClass.instance.render({ force: true });
    }, 300);
  }
}
