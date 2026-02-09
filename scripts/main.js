import { MODULE_CONFIG, SHEET_SIZE_DEFAULTS, FLOATING_TAB_ICONS, COLOR_DEFAULTS, HEADER_DEFAULTS } from "./config.js";
import { applyColorOverrides } from "./color-settings.js";
import ColorSettingsMenu from "./color-settings-menu.js";
import HeaderSettingsMenu from "./header-settings-menu.js";

const MODULE_ID = MODULE_CONFIG.id;
const SYSTEM_ID = MODULE_CONFIG.systemId;
const MODULE_PATH = MODULE_CONFIG.path;

let SHEET_SIZES;

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing Draw Steel Plus`);
  registerSettings();
  SHEET_SIZES = loadSheetSizes();
  console.log(`${MODULE_ID} | Sheet sizes loaded:`, SHEET_SIZES);

  registerSheets();
});

Hooks.once("ready", () => {
  applyColorOverrides();
});

function colorSettingKey(key) {
  return `color${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

function registerSettings() {
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

  for (const [key, defaultVal] of Object.entries(COLOR_DEFAULTS)) {
    game.settings.register(MODULE_ID, colorSettingKey(key), {
      name: `DRAW_STEEL_PLUS.Settings.colors.${key}`,
      scope: "world",
      config: false,
      type: new foundry.data.fields.ColorField(),
      default: defaultVal,
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
}

function applyHeaderArt(element, sheetType) {
  const enabled = game.settings.get(MODULE_ID, `${sheetType}HeaderEnabled`);
  const customImage = game.settings.get(MODULE_ID, `${sheetType}HeaderImage`);

  const headerArt = element.querySelector(".header-bg-art");
  const headerOverlay = element.querySelector(".header-bg-overlay");

  if (!enabled) {
    if (headerArt) headerArt.style.display = "none";
    if (headerOverlay) headerOverlay.style.display = "none";
  } else {
    if (headerArt) headerArt.style.display = "";
    if (headerOverlay) headerOverlay.style.display = "";
    if (customImage && headerArt) headerArt.src = customImage;
  }
}

function loadSheetSizes() {
  return {
    hero: { ...SHEET_SIZE_DEFAULTS.hero },
    npc: { ...SHEET_SIZE_DEFAULTS.npc },
    item: { ...SHEET_SIZE_DEFAULTS.item },
  };
}

function applyFloatingTabs(sheet) {
  const enabled = game.settings.get(MODULE_ID, "floatingNavTabs");
  const element = sheet.element;

  const existingFloating = element.querySelector(".dsp-floating-tabs");
  if (existingFloating) existingFloating.remove();

  if (!enabled) {
    element.classList.remove("dsp-has-floating-tabs");
    return;
  }

  const originalNav = element.querySelector("nav.sheet-tabs");
  if (!originalNav) return;

  element.classList.add("dsp-has-floating-tabs");

  const tabLinks = originalNav.querySelectorAll("a[data-tab]");
  if (!tabLinks.length) return;

  const appRect = element.getBoundingClientRect();
  const navRect = originalNav.getBoundingClientRect();
  const navTop = navRect.top - appRect.top;

  const nav = document.createElement("nav");
  nav.className = "dsp-floating-tabs tabs-right";
  nav.style.top = `35%`;

  tabLinks.forEach((originalLink) => {
    const tabName = originalLink.dataset.tab;
    const label = originalLink.textContent.trim() || tabName;
    const isActive = originalLink.classList.contains("active");
    const icon = FLOATING_TAB_ICONS[tabName] || "fas fa-file";

    const a = document.createElement("a");
    a.className = `dsp-float-tab${isActive ? " active" : ""}`;
    a.dataset.tab = tabName;
    a.setAttribute("data-tooltip", label);
    a.setAttribute("aria-label", label);

    const i = document.createElement("i");
    i.className = icon;
    i.setAttribute("inert", "");
    a.appendChild(i);

    a.addEventListener("click", (e) => {
      e.preventDefault();
      sheet.changeTab(tabName, "primary");
      nav.querySelectorAll(".dsp-float-tab").forEach((t) => {
        t.classList.toggle("active", t.dataset.tab === tabName);
      });
    });

    nav.appendChild(a);
  });

  element.appendChild(nav);
}

const _scrollTimers = new WeakMap();

function setupScrollbarAutoHide(element) {
  if (element.dataset.dspScrollSetup) return;
  element.dataset.dspScrollSetup = "true";

  element.addEventListener("scroll", (e) => {
    const target = e.target;
    target.classList.add("dsp-scrolling");

    const existing = _scrollTimers.get(target);
    if (existing) clearTimeout(existing);

    _scrollTimers.set(target, setTimeout(() => {
      target.classList.remove("dsp-scrolling");
      _scrollTimers.delete(target);
    }, 3000));
  }, { capture: true, passive: true });
}

function applyMinSize(element, sizeConfig) {
  if (sizeConfig.minWidth) element.style.minWidth = `${sizeConfig.minWidth}px`;
  if (sizeConfig.minHeight) element.style.minHeight = `${sizeConfig.minHeight}px`;
}

function processSidebarTags(element) {
  element.querySelectorAll('.sidebar-tags[data-tag-type]').forEach((container) => {
    if (container.querySelector('.sidebar-tag, .sidebar-tag-none')) return;

    const text = container.textContent.trim();
    if (!text) return;

    const items = text.split(/,\s*(?:and\s+)?/).map(s => s.trim()).filter(Boolean);
    container.innerHTML = '';

    if (items.length === 0 || (items.length === 1 && items[0].toLowerCase() === 'none')) {
      const tag = document.createElement('span');
      tag.className = 'sidebar-tag sidebar-tag-none';
      tag.textContent = 'None';
      container.appendChild(tag);
    } else {
      items.forEach(item => {
        const tag = document.createElement('span');
        tag.className = 'sidebar-tag';
        tag.textContent = item;
        container.appendChild(tag);
      });
    }
  });

  const skillsContainer = element.querySelector('.sidebar-skills');
  if (skillsContainer && !skillsContainer.querySelector('.ds-tag, .sidebar-tag')) {
    const text = skillsContainer.textContent.trim();
    if (text) {
      const items = text.split(/,\s*(?:and\s+)?/).map(s => s.trim()).filter(Boolean);
      skillsContainer.innerHTML = '';
      items.forEach(item => {
        const tag = document.createElement('span');
        tag.className = 'sidebar-tag';
        tag.textContent = item;
        skillsContainer.appendChild(tag);
      });
    }
  }
}

function registerSheets() {
  if (game.system.id !== SYSTEM_ID) {
    console.warn(`${MODULE_ID} | Not running on Draw Steel system, skipping sheet registration`);
    return;
  }

  const sheets = globalThis.ds?.applications?.sheets;

  if (!sheets) {
    console.error(`${MODULE_ID} | Draw Steel sheets not found at ds.applications.sheets`);
    console.log(`${MODULE_ID} | Available on ds:`, globalThis.ds);
    return;
  }

  console.log(`${MODULE_ID} | Available sheets:`, Object.keys(sheets));

  if (sheets.DrawSteelHeroSheet) {
    const baseParts = sheets.DrawSteelHeroSheet.PARTS || {};
    console.log(`${MODULE_ID} | Base hero sheet PARTS keys:`, Object.keys(baseParts));

    const DrawSteelPlusHeroSheet = class extends sheets.DrawSteelHeroSheet {
      static DEFAULT_OPTIONS = {
        ...super.DEFAULT_OPTIONS,
        classes: [...super.DEFAULT_OPTIONS.classes, "draw-steel-plus"],
        position: {
          ...super.DEFAULT_OPTIONS.position,
          width: SHEET_SIZES.hero.width,
          height: SHEET_SIZES.hero.height,
        },
      };

      static PARTS = {
        ...super.PARTS,
        header: {
          ...(super.PARTS?.header || {}),
          template: `${MODULE_PATH}/templates/sheets/actor/hero-sheet/header.hbs`,
        },
        stats: {
          ...(super.PARTS?.stats || {}),
          template: `${MODULE_PATH}/templates/sheets/actor/hero-sheet/stats.hbs`,
        },
        sidebar: {
          template: `${MODULE_PATH}/templates/sheets/actor/hero-sheet/sidebar.hbs`,
        },
      };

      static TABS = {
        ...super.TABS,
        primary: {
          ...super.TABS?.primary,
          tabs: super.TABS?.primary?.tabs?.filter(t => t.id !== "stats") || [],
          initial: "features",
        },
      };

      get title() {
        return `${this.document.name} [DS+]`;
      }

      _getHeaderControls() {
        const controls = super._getHeaderControls();
        const seen = new Set();
        return controls.filter(c => {
          if (seen.has(c.action)) return false;
          seen.add(c.action);
          return true;
        });
      }

      _onRender(context, options) {
        super._onRender(context, options);
        applyMinSize(this.element, SHEET_SIZES.hero);
        setupScrollbarAutoHide(this.element);
        applyHeaderArt(this.element, "hero");

        this.element.classList.add("has-sidebar");

        this.element.querySelectorAll('[data-action="toggleSidebar"]').forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            this.element.classList.toggle("sidebar-collapsed");
          });
        });

        processSidebarTags(this.element);
        applyFloatingTabs(this);
      }
    };

    console.log(`${MODULE_ID} | DS+ hero sheet PARTS keys:`, Object.keys(DrawSteelPlusHeroSheet.PARTS));

    Actors.registerSheet(MODULE_ID, DrawSteelPlusHeroSheet, {
      types: ["hero"],
      makeDefault: false,
      label: "DS+ Hero Sheet",
    });

    console.log(`${MODULE_ID} | Registered DS+ Hero Sheet`);
  }

  if (sheets.DrawSteelNPCSheet) {
    const DrawSteelPlusNPCSheet = class extends sheets.DrawSteelNPCSheet {
      static DEFAULT_OPTIONS = {
        ...super.DEFAULT_OPTIONS,
        classes: [...super.DEFAULT_OPTIONS.classes, "draw-steel-plus", "dsp-npc"],
        position: {
          ...super.DEFAULT_OPTIONS.position,
          width: SHEET_SIZES.npc.width,
          height: SHEET_SIZES.npc.height,
        },
      };

      static PARTS = {
        ...super.PARTS,
        header: {
          ...(super.PARTS?.header || {}),
          template: `${MODULE_PATH}/templates/sheets/actor/npc-sheet/header.hbs`,
        },
        stats: {
          ...(super.PARTS?.stats || {}),
          template: `${MODULE_PATH}/templates/sheets/actor/npc-sheet/stats.hbs`,
        },
        sidebar: {
          template: `${MODULE_PATH}/templates/sheets/actor/npc-sheet/sidebar.hbs`,
        },
      };

      static TABS = {
        ...super.TABS,
        primary: {
          ...super.TABS?.primary,
          tabs: super.TABS?.primary?.tabs?.filter(t => t.id !== "stats") || [],
          initial: "features",
        },
      };

      get title() {
        return `${this.document.name} [DS+]`;
      }

      _getHeaderControls() {
        const controls = super._getHeaderControls();
        const seen = new Set();
        return controls.filter(c => {
          if (seen.has(c.action)) return false;
          seen.add(c.action);
          return true;
        });
      }

      _onRender(context, options) {
        super._onRender(context, options);
        applyMinSize(this.element, SHEET_SIZES.npc);
        setupScrollbarAutoHide(this.element);
        applyHeaderArt(this.element, "npc");

        this.element.classList.add("has-sidebar");

        this.element.querySelectorAll('[data-action="toggleSidebar"]').forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            this.element.classList.toggle("sidebar-collapsed");
          });
        });

        processSidebarTags(this.element);
        applyFloatingTabs(this);
      }
    };

    Actors.registerSheet(MODULE_ID, DrawSteelPlusNPCSheet, {
      types: ["npc"],
      makeDefault: false,
      label: "DS+ NPC Sheet",
    });

    console.log(`${MODULE_ID} | Registered DS+ NPC Sheet`);
  }

  if (sheets.DrawSteelItemSheet) {
    const itemTypes = Object.keys(game.system.documentTypes?.Item ?? {}).filter(t => t !== "base");
    console.log(`${MODULE_ID} | Detected item types:`, itemTypes);

    if (itemTypes.length) {
      const DrawSteelPlusItemSheet = class extends sheets.DrawSteelItemSheet {
        static DEFAULT_OPTIONS = {
          ...super.DEFAULT_OPTIONS,
          classes: [...super.DEFAULT_OPTIONS.classes, "draw-steel-plus"],
          position: {
            ...super.DEFAULT_OPTIONS.position,
            width: SHEET_SIZES.item.width,
            height: SHEET_SIZES.item.height,
          },
        };

        get title() {
          return `${this.document.name} [DS+]`;
        }

        _onRender(context, options) {
          super._onRender(context, options);
          applyMinSize(this.element, SHEET_SIZES.item);
          setupScrollbarAutoHide(this.element);
          applyFloatingTabs(this);
        }
      };

      Items.registerSheet(MODULE_ID, DrawSteelPlusItemSheet, {
        types: itemTypes,
        makeDefault: false,
        label: "DS+ Item Sheet",
      });

      console.log(`${MODULE_ID} | Registered DS+ Item Sheet`);
    }
  }

  console.log(`${MODULE_ID} | Sheet registration complete`);
}
