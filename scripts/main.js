import { MODULE_CONFIG, SHEET_SIZE_DEFAULTS, FLOATING_TAB_ICONS } from "./config.js";

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

function registerSettings() {
  const types = ["hero", "npc", "item"];
  const props = ["width", "height", "minWidth", "minHeight"];

  for (const type of types) {
    for (const prop of props) {
      const key = `${type}${prop.charAt(0).toUpperCase() + prop.slice(1)}`;
      game.settings.register(MODULE_ID, key, {
        name: `DRAW_STEEL_PLUS.Settings.${key}.name`,
        hint: `DRAW_STEEL_PLUS.Settings.${key}.hint`,
        scope: "world",
        config: true,
        type: Number,
        default: SHEET_SIZE_DEFAULTS[type][prop],
        requiresReload: true,
      });
    }
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
}

function loadSheetSizes() {
  return {
    hero: {
      width: game.settings.get(MODULE_ID, "heroWidth"),
      height: game.settings.get(MODULE_ID, "heroHeight"),
      minWidth: game.settings.get(MODULE_ID, "heroMinWidth"),
      minHeight: game.settings.get(MODULE_ID, "heroMinHeight"),
    },
    npc: {
      width: game.settings.get(MODULE_ID, "npcWidth"),
      height: game.settings.get(MODULE_ID, "npcHeight"),
      minWidth: game.settings.get(MODULE_ID, "npcMinWidth"),
      minHeight: game.settings.get(MODULE_ID, "npcMinHeight"),
    },
    item: {
      width: game.settings.get(MODULE_ID, "itemWidth"),
      height: game.settings.get(MODULE_ID, "itemHeight"),
      minWidth: game.settings.get(MODULE_ID, "itemMinWidth"),
      minHeight: game.settings.get(MODULE_ID, "itemMinHeight"),
    },
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
  nav.style.top = `${navTop}px`;

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

function applyMinSize(element, sizeConfig) {
  if (sizeConfig.minWidth) element.style.minWidth = `${sizeConfig.minWidth}px`;
  if (sizeConfig.minHeight) element.style.minHeight = `${sizeConfig.minHeight}px`;
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
        sidebar: {
          template: `${MODULE_PATH}/templates/sheets/actor/hero-sheet/sidebar.hbs`,
        },
      };

      get title() {
        return `${this.document.name} [DS+]`;
      }

      _onRender(context, options) {
        super._onRender(context, options);
        applyMinSize(this.element, SHEET_SIZES.hero);

        if (context.isPlay) {
          this.element.classList.add("has-sidebar");
        } else {
          this.element.classList.remove("has-sidebar");
        }

        this.element.querySelectorAll('[data-action="toggleSidebar"]').forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            this.element.classList.toggle("sidebar-collapsed");
          });
        });

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
        classes: [...super.DEFAULT_OPTIONS.classes, "draw-steel-plus"],
        position: {
          ...super.DEFAULT_OPTIONS.position,
          width: SHEET_SIZES.npc.width,
          height: SHEET_SIZES.npc.height,
        },
      };

      get title() {
        return `${this.document.name} [DS+]`;
      }

      _onRender(context, options) {
        super._onRender(context, options);
        applyMinSize(this.element, SHEET_SIZES.npc);
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
