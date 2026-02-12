import { MODULE_CONFIG, SHEET_SIZE_DEFAULTS, FLOATING_TAB_ICONS, COLOR_DEFAULTS, HEADER_DEFAULTS, META_CURRENCY_DEFAULTS } from "./config.js";
import { applyColorOverrides } from "./color-settings.js";
import ColorSettingsMenu from "./color-settings-menu.js";
import HeaderSettingsMenu from "./header-settings-menu.js";
import { MetaCurrencyTracker } from "./meta-currency.js";
import { TooltipsDSP } from "./tooltips.js";

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
  MetaCurrencyTracker.initialize();
  TooltipsDSP.activateListeners();
  const tooltips = new TooltipsDSP();
  tooltips.observe();
  game.modules.get(MODULE_ID).tooltips = tooltips;
});

Hooks.on("renderPlayers", () => {
  if (MetaCurrencyTracker.instance?.rendered) MetaCurrencyTracker.instance.render();
});

Hooks.on("createCombat", () => {
  if (MetaCurrencyTracker.instance?.rendered) MetaCurrencyTracker.instance.render();
});

Hooks.on("deleteCombat", () => {
  if (MetaCurrencyTracker.instance?.rendered) MetaCurrencyTracker.instance.render();
});

Hooks.on("updateCombat", () => {
  if (MetaCurrencyTracker.instance?.rendered) MetaCurrencyTracker.instance.render();
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

  game.settings.register(MODULE_ID, "parallaxHeaderArt", {
    name: "DRAW_STEEL_PLUS.Settings.parallaxHeaderArt.name",
    hint: "DRAW_STEEL_PLUS.Settings.parallaxHeaderArt.hint",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: false,
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
}

function _applyItemTooltips(element) {
  if ("tooltipHtml" in element.dataset) return;
  const target = element.closest("[data-document-uuid]");
  if (!target?.dataset.documentUuid) return;
  const uuid = target.dataset.documentUuid;
  element.dataset.tooltipHtml = `
    <section class="loading" data-uuid="${uuid}">
      <i class="fas fa-spinner fa-spin-pulse"></i>
    </section>
  `;
  element.dataset.tooltipClass = "dsp-tooltip item-tooltip";
  element.dataset.tooltipDirection ??= "LEFT";
}

const _sidebarCollapseState = new WeakMap();

function setupSidebarCollapse(element) {
  let stateMap = _sidebarCollapseState.get(element);
  if (!stateMap) {
    stateMap = {};
    _sidebarCollapseState.set(element, stateMap);
  }

  element.querySelectorAll(".sidebar-section").forEach((section) => {
    const title = section.querySelector(":scope > .sidebar-section-title");
    if (!title) return;

    const key = title.textContent.trim();
    if (stateMap[key]) section.classList.add("dsp-collapsed");

    title.style.cursor = "pointer";
    title.addEventListener("click", (e) => {
      if (e.target.closest("button, a, input, select")) return;
      section.classList.toggle("dsp-collapsed");
      stateMap[key] = section.classList.contains("dsp-collapsed");
    });
  });

  element.querySelectorAll(".sidebar-tag-section").forEach((tagSection) => {
    const header = tagSection.querySelector(":scope > .sidebar-tag-header");
    if (!header) return;

    const key = header.textContent.trim();
    if (stateMap[key]) tagSection.classList.add("dsp-collapsed");

    header.style.cursor = "pointer";
    header.addEventListener("click", (e) => {
      if (e.target.closest("button, a, input, select")) return;
      tagSection.classList.toggle("dsp-collapsed");
      stateMap[key] = tagSection.classList.contains("dsp-collapsed");
    });
  });
}

const _parallaxHandlers = new WeakMap();

function applyParallaxHeader(element) {
  const enabled = game.settings.get(MODULE_ID, "parallaxHeaderArt");
  const art = element.querySelector(".header-bg-art");

  const existing = _parallaxHandlers.get(element);
  if (existing) {
    element.removeEventListener("mousemove", existing.move);
    element.removeEventListener("mouseleave", existing.leave);
    _parallaxHandlers.delete(element);
    if (art) {
      art.style.transition = "";
      art.style.transform = "";
    }
  }

  if (!enabled || !art) return;

  const header = element.querySelector(".sheet-header");
  if (!header) return;

  art.style.transition = "transform 0.6s ease-out";

  const onMove = (e) => {
    const rect = header.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    const clampX = Math.max(-1, Math.min(1, x));
    const clampY = Math.max(-1, Math.min(1, y));
    art.style.transition = "transform 0.1s ease-out";
    art.style.transform = `translate(${clampX * 8}px, ${clampY * 5}px) scale(1.03)`;
  };

  const onLeave = () => {
    art.style.transition = "transform 0.8s ease-out";
    art.style.transform = "translate(0px, 0px) scale(1.0)";
  };

  element.addEventListener("mousemove", onMove, { passive: true });
  element.addEventListener("mouseleave", onLeave, { passive: true });
  _parallaxHandlers.set(element, { move: onMove, leave: onLeave });
}

function applyStaminaPortraitTint(element, actor) {
  const frame = element.querySelector(".portrait-frame");
  if (!frame) return;

  const img = frame.querySelector(".profile-img");
  if (!img) return;

  const stamina = actor.system?.stamina;
  if (!stamina) return;

  const current = stamina.value ?? 0;
  const max = stamina.max ?? 1;
  const ratio = Math.max(max, 1) > 0 ? Math.min(Math.max(current / Math.max(max, 1), 0), 1) : 1;
  const tint = 1 - ratio;

  frame.classList.toggle("dsp-dead", current <= 0 && max > 0);
  frame.style.setProperty("--dsp-stam-tint", tint.toFixed(3));

  if (tint > 0) {
    const sepia = (tint * 0.8).toFixed(3);
    const saturate = (1 + tint * 4).toFixed(3);
    const brightness = (1 - tint * 0.25).toFixed(3);
    img.style.filter = `sepia(${sepia}) saturate(${saturate}) hue-rotate(-10deg) brightness(${brightness})`;
  } else {
    img.style.filter = "";
  }
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
        actions: {
          ...super.DEFAULT_OPTIONS.actions,
          documentListShare: async function(event, target) {
            const row = target.closest("[data-document-uuid]");
            if (!row) return;
            const entries = this._getDocumentListContextOptions?.() ?? [];
            const shareEntry = entries.find(e => e.name === "DRAW_STEEL.SHEET.Share");
            if (shareEntry?.condition?.(target) !== false && shareEntry?.callback) {
              await shareEntry.callback(target);
            }
          },
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
        features: {
          ...(super.PARTS?.features || {}),
          template: `${MODULE_PATH}/templates/sheets/actor/hero-sheet/features.hbs`,
          templates: [`${MODULE_PATH}/templates/sheets/actor/shared/partials/features/features.hbs`],
        },
        equipment: {
          ...(super.PARTS?.equipment || {}),
          template: `${MODULE_PATH}/templates/sheets/actor/hero-sheet/equipment.hbs`,
        },
        projects: {
          ...(super.PARTS?.projects || {}),
          template: `${MODULE_PATH}/templates/sheets/actor/hero-sheet/projects.hbs`,
        },
        abilities: {
          ...(super.PARTS?.abilities || {}),
          template: `${MODULE_PATH}/templates/sheets/actor/shared/abilities.hbs`,
        },
        effects: {
          ...(super.PARTS?.effects || {}),
          template: `${MODULE_PATH}/templates/sheets/actor/shared/effects.hbs`,
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
        applyParallaxHeader(this.element);

        this.element.classList.add("has-sidebar");

        this.element.querySelectorAll('[data-action="toggleSidebar"]').forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            this.element.classList.toggle("sidebar-collapsed");
          });
        });

        applyStaminaPortraitTint(this.element, this.document);
        setupSidebarCollapse(this.element);
        processSidebarTags(this.element);
        applyFloatingTabs(this);
        this.element.querySelectorAll(".item-tooltip").forEach(_applyItemTooltips);
        if (!this.element.dataset.dspTooltipPrevent) {
          this.element.dataset.dspTooltipPrevent = "1";
          this.element.addEventListener("pointerdown", (e) => {
            if (e.button === 1 && document.getElementById("tooltip")?.classList.contains("active")) e.preventDefault();
          });
        }
      }
    };

    console.log(`${MODULE_ID} | DS+ hero sheet PARTS keys:`, Object.keys(DrawSteelPlusHeroSheet.PARTS));

    foundry.documents.collections.Actors.registerSheet(MODULE_ID, DrawSteelPlusHeroSheet, {
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
        actions: {
          ...super.DEFAULT_OPTIONS.actions,
          documentListShare: async function(event, target) {
            const row = target.closest("[data-document-uuid]");
            if (!row) return;
            const entries = this._getDocumentListContextOptions?.() ?? [];
            const shareEntry = entries.find(e => e.name === "DRAW_STEEL.SHEET.Share");
            if (shareEntry?.condition?.(target) !== false && shareEntry?.callback) {
              await shareEntry.callback(target);
            }
          },
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
        features: {
          ...(super.PARTS?.features || {}),
          template: `${MODULE_PATH}/templates/sheets/actor/npc/features.hbs`,
          templates: [`${MODULE_PATH}/templates/sheets/actor/shared/partials/features/features.hbs`],
        },
        abilities: {
          ...(super.PARTS?.abilities || {}),
          template: `${MODULE_PATH}/templates/sheets/actor/shared/abilities.hbs`,
        },
        effects: {
          ...(super.PARTS?.effects || {}),
          template: `${MODULE_PATH}/templates/sheets/actor/shared/effects.hbs`,
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
        applyParallaxHeader(this.element);

        this.element.classList.add("has-sidebar");

        this.element.querySelectorAll('[data-action="toggleSidebar"]').forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.preventDefault();
            this.element.classList.toggle("sidebar-collapsed");
          });
        });

        applyStaminaPortraitTint(this.element, this.document);
        setupSidebarCollapse(this.element);
        processSidebarTags(this.element);
        applyFloatingTabs(this);
        this.element.querySelectorAll(".item-tooltip").forEach(_applyItemTooltips);
        if (!this.element.dataset.dspTooltipPrevent) {
          this.element.dataset.dspTooltipPrevent = "1";
          this.element.addEventListener("pointerdown", (e) => {
            if (e.button === 1 && document.getElementById("tooltip")?.classList.contains("active")) e.preventDefault();
          });
        }
      }
    };

    foundry.documents.collections.Actors.registerSheet(MODULE_ID, DrawSteelPlusNPCSheet, {
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
          actions: {
            ...super.DEFAULT_OPTIONS.actions,
            documentListShare: async function(event, target) {
              const row = target.closest("[data-document-uuid]");
              if (!row) return;
              const entries = this._getDocumentListContextOptions?.() ?? [];
              const shareEntry = entries.find(e => e.name === "DRAW_STEEL.SHEET.Share");
              if (shareEntry?.condition?.(target) !== false && shareEntry?.callback) {
                await shareEntry.callback(target);
              }
            },
          },
        };

        static PARTS = {
          ...super.PARTS,
          effects: {
            ...(super.PARTS?.effects || {}),
            template: `${MODULE_PATH}/templates/sheets/item/effects.hbs`,
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
          this.element.querySelectorAll(".item-tooltip").forEach(_applyItemTooltips);
          if (!this.element.dataset.dspTooltipPrevent) {
            this.element.dataset.dspTooltipPrevent = "1";
            this.element.addEventListener("pointerdown", (e) => {
              if (e.button === 1 && document.getElementById("tooltip")?.classList.contains("active")) e.preventDefault();
            });
          }
        }
      };

      foundry.documents.collections.Items.registerSheet(MODULE_ID, DrawSteelPlusItemSheet, {
        types: itemTypes,
        makeDefault: false,
        label: "DS+ Item Sheet",
      });

      console.log(`${MODULE_ID} | Registered DS+ Item Sheet`);
    }
  }

  console.log(`${MODULE_ID} | Sheet registration complete`);
}
