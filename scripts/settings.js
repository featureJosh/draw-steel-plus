import { MODULE_CONFIG, COLOR_LIGHT_DARK_DEFAULTS, HEADER_DEFAULTS, NPC_DEFAULTS, META_CURRENCY_DEFAULTS, UI_DEFAULTS } from "./config.js";
import { applyColorOverrides } from "./color-settings.js";
import { applyImprovedChat } from "./chat.js";
import ColorSettingsMenu from "./color-settings-menu.js";
import HeaderSettingsMenu from "./header-settings-menu.js";
import NPCSettingsMenu from "./npc-settings-menu.js";

const MODULE_ID = MODULE_CONFIG.id;

function colorSettingKey(key, variant) {
  const base = `color${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  return variant ? `${base}${variant === "light" ? "Lt" : "Dk"}` : base;
}

export function registerSettings() {
  game.settings.registerMenu(MODULE_ID, "colorSettingsMenu", {
    name: "DRAW_STEEL_PLUS.Settings.menus.colors.name",
    label: "DRAW_STEEL_PLUS.Settings.menus.colors.label",
    hint: "DRAW_STEEL_PLUS.Settings.menus.colors.hint",
    icon: "fa-solid fa-palette",
    type: ColorSettingsMenu,
    restricted: true,
  });

  game.settings.registerMenu(MODULE_ID, "headerSettingsMenu", {
    name: "DRAW_STEEL_PLUS.Settings.menus.headers.name",
    label: "DRAW_STEEL_PLUS.Settings.menus.headers.label",
    hint: "DRAW_STEEL_PLUS.Settings.menus.headers.hint",
    icon: "fa-solid fa-image",
    type: HeaderSettingsMenu,
    restricted: true,
  });

  game.settings.registerMenu(MODULE_ID, "npcSettingsMenu", {
    name: "DRAW_STEEL_PLUS.Settings.menus.npc.name",
    label: "DRAW_STEEL_PLUS.Settings.menus.npc.label",
    hint: "DRAW_STEEL_PLUS.Settings.menus.npc.hint",
    icon: "fa-solid fa-ghost",
    type: NPCSettingsMenu,
    restricted: true,
  });

  game.settings.register(MODULE_ID, "npcFavoritesEnabled", {
    name: "DRAW_STEEL_PLUS.Settings.npcFavoritesEnabled.name",
    hint: "DRAW_STEEL_PLUS.Settings.npcFavoritesEnabled.hint",
    scope: "world",
    config: false,
    type: Boolean,
    default: NPC_DEFAULTS.npcFavoritesEnabled,
    requiresReload: false,
  });

  for (const [key, defaults] of Object.entries(COLOR_LIGHT_DARK_DEFAULTS)) {
    game.settings.register(MODULE_ID, colorSettingKey(key, "light"), {
      name: `DRAW_STEEL_PLUS.Settings.colors.${key}Lt`,
      scope: "world",
      config: false,
      type: new foundry.data.fields.ColorField(),
      default: defaults.light,
      onChange: () => applyColorOverrides(),
    });
    game.settings.register(MODULE_ID, colorSettingKey(key, "dark"), {
      name: `DRAW_STEEL_PLUS.Settings.colors.${key}Dk`,
      scope: "world",
      config: false,
      type: new foundry.data.fields.ColorField(),
      default: defaults.dark,
      onChange: () => applyColorOverrides(),
    });
  }

  game.settings.register(MODULE_ID, "floatingNavTabs", {
    name: "DRAW_STEEL_PLUS.Settings.floatingNavTabs.name",
    hint: "DRAW_STEEL_PLUS.Settings.floatingNavTabs.hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: false,
  });

  game.settings.register(MODULE_ID, "heroHeaderEnabled", {
    name: "DRAW_STEEL_PLUS.Settings.heroHeaderEnabled.name",
    hint: "DRAW_STEEL_PLUS.Settings.heroHeaderEnabled.hint",
    scope: "world",
    config: false,
    type: Boolean,
    default: HEADER_DEFAULTS.heroHeaderEnabled,
    requiresReload: false,
  });

  game.settings.register(MODULE_ID, "heroHeaderImage", {
    name: "DRAW_STEEL_PLUS.Settings.heroHeaderImage.name",
    hint: "DRAW_STEEL_PLUS.Settings.heroHeaderImage.hint",
    scope: "world",
    config: false,
    type: String,
    default: HEADER_DEFAULTS.heroHeaderImage,
    filePicker: "image",
    requiresReload: false,
  });

  game.settings.register(MODULE_ID, "npcHeaderEnabled", {
    name: "DRAW_STEEL_PLUS.Settings.npcHeaderEnabled.name",
    hint: "DRAW_STEEL_PLUS.Settings.npcHeaderEnabled.hint",
    scope: "world",
    config: false,
    type: Boolean,
    default: HEADER_DEFAULTS.npcHeaderEnabled,
    requiresReload: false,
  });

  game.settings.register(MODULE_ID, "npcHeaderImage", {
    name: "DRAW_STEEL_PLUS.Settings.npcHeaderImage.name",
    hint: "DRAW_STEEL_PLUS.Settings.npcHeaderImage.hint",
    scope: "world",
    config: false,
    type: String,
    default: HEADER_DEFAULTS.npcHeaderImage,
    filePicker: "image",
    requiresReload: false,
  });

  game.settings.register(MODULE_ID, "parallaxHeaderArt", {
    name: "DRAW_STEEL_PLUS.Settings.parallaxHeaderArt.name",
    hint: "DRAW_STEEL_PLUS.Settings.parallaxHeaderArt.hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: false,
  });

  game.settings.register(MODULE_ID, "improvedChat", {
    name: "DRAW_STEEL_PLUS.Settings.improvedChat.name",
    hint: "DRAW_STEEL_PLUS.Settings.improvedChat.hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: UI_DEFAULTS.improvedChat,
    requiresReload: false,
    onChange: () => applyImprovedChat(),
  });

  game.settings.register(MODULE_ID, "metaCurrencyPosition", {
    scope: "client",
    config: false,
    type: Object,
    default: META_CURRENCY_DEFAULTS.position,
  });

  game.settings.register(MODULE_ID, "metaCurrencyExpanded", {
    scope: "client",
    config: false,
    type: Boolean,
    default: META_CURRENCY_DEFAULTS.expanded,
  });

  game.settings.register(MODULE_ID, "metaCurrencyLocked", {
    scope: "client",
    config: false,
    type: Boolean,
    default: META_CURRENCY_DEFAULTS.locked,
  });

  game.settings.register(MODULE_ID, "metaCurrencyCentered", {
    scope: "client",
    config: false,
    type: Boolean,
    default: META_CURRENCY_DEFAULTS.centered,
  });
}
