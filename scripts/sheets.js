import { MODULE_CONFIG } from "./config.js";
import { getFontScale } from "./scale-settings.js";
import { TabConfigDialog } from "./tab-config.js";
import { registerCompactSheets } from "./compact-sheets.js";
import {
  applyItemTooltips,
  setupItemListCollapse,
  setupSidebarCollapse,
  applyParallaxHeader,
  applyStaminaPortraitTint,
  applyHeaderArt,
  applyFloatingTabs,
  setupScrollbarAutoHide,
  applyMinSize,
  processSidebarTags,
  setupItemSearch,
} from "./ui-helpers.js";

const MODULE_ID = MODULE_CONFIG.id;
const SYSTEM_ID = MODULE_CONFIG.systemId;
const MODULE_PATH = MODULE_CONFIG.path;

async function toggleDocumentDescription(event, target) {
  const parentElement = target.closest(".expandable-document");
  if (!parentElement) return;
  const embedContainer = parentElement.querySelector(".document-description");
  const toggleIcon = parentElement.querySelector(
    '[data-action="toggleDocumentDescription"] :is(.fa-angle-down, .fa-angle-right), [data-action="toggleDocumentDescription"]:is(.fa-angle-down, .fa-angle-right)',
  );
  if (!embedContainer || !toggleIcon) return;
  const { documentUuid } = parentElement.dataset;
  const isExpanded = embedContainer.classList.contains("expanded");

  if (isExpanded) this._expandedDocumentDescriptions.delete(documentUuid);
  else {
    if (!embedContainer.innerHTML.trim()) {
      const document = this._getEmbeddedDocument(parentElement);
      const embed = await document?.system?.toEmbed?.({ includeName: false });
      if (embed) embedContainer.innerHTML = embed.outerHTML;
    }
    this._expandedDocumentDescriptions.add(documentUuid);
  }

  toggleIcon.classList.toggle("fa-angle-down", !isExpanded);
  toggleIcon.classList.toggle("fa-angle-right", isExpanded);
  const labelKey = isExpanded
    ? "DRAW_STEEL_PLUS.Sheet.Expand"
    : "DRAW_STEEL_PLUS.Sheet.Collapse";
  const toggleControl = toggleIcon.closest(
    '[data-action="toggleDocumentDescription"]',
  );
  toggleControl.dataset.tooltip = labelKey;
  toggleControl.setAttribute("aria-label", game.i18n.localize(labelKey));
  embedContainer.classList.toggle("expanded", !isExpanded);
  for (const control of parentElement.querySelectorAll(
    '[data-action="toggleDocumentDescription"][aria-expanded]',
  )) {
    control.setAttribute("aria-expanded", String(!isExpanded));
  }
}

async function toggleFavorite(event, target) {
  const li = target.closest("[data-document-uuid]");
  if (!li) return;
  const item = await fromUuid(li.dataset.documentUuid);
  if (!item) return;
  await item.setFlag(
    "draw-steel-plus",
    "favorite",
    !item.getFlag("draw-steel-plus", "favorite"),
  );
}

function openTabConfig() {
  const allTabs = {};
  for (const tab of this.constructor.TABS?.primary?.tabs || []) {
    allTabs[tab.id] = tab;
  }
  new TabConfigDialog({
    document: this.document,
    sheetTabs: allTabs,
  }).render({ force: true });
}

async function documentListShare(event, target) {
  const row = target.closest("[data-document-uuid]");
  if (!row) return;
  const entries = this._getDocumentListContextOptions?.() ?? [];
  const shareEntry = entries.find((e) => e.label === "DRAW_STEEL.SHEET.Share");
  if (!shareEntry) return;
  const visible = shareEntry.visible ?? shareEntry.condition;
  if (typeof visible === "function" && visible.call(this, target) === false) {
    return;
  }
  const handler = shareEntry.onClick ?? shareEntry.callback;
  if (handler) await handler.call(this, event, target);
}

function markFavorited(ctx) {
  ctx.isFavorited = !!ctx?.item?.getFlag?.("draw-steel-plus", "favorite");
  return ctx;
}

function filterFav(arr) {
  return Array.isArray(arr)
    ? arr.filter((c) => c?.item?.getFlag?.("draw-steel-plus", "favorite"))
    : [];
}

function filterAbilities(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const kept = (v?.abilities || []).filter((a) =>
      a?.item?.getFlag?.("draw-steel-plus", "favorite"),
    );
    if (kept.length) out[k] = { ...v, abilities: kept };
  }
  return out;
}

function filterTreasure(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const kept = (v?.treasure || []).filter((t) =>
      t?.item?.getFlag?.("draw-steel-plus", "favorite"),
    );
    if (kept.length) out[k] = { ...v, treasure: kept };
  }
  return out;
}

function ensureActiveTab(tabs, actor) {
  if (Object.values(tabs).some((t) => t.active)) return;
  const hasFavorites = actor.items.some((i) =>
    i.getFlag("draw-steel-plus", "favorite"),
  );
  const defaultTab = hasFavorites && tabs.favorites ? "favorites" : "features";
  const fallback = tabs[defaultTab] ? defaultTab : Object.keys(tabs)[0];
  if (fallback && tabs[fallback]) {
    tabs[fallback].active = true;
    tabs[fallback].cssClass = "active";
  }
}

function filterHiddenTabs(tabs, actor) {
  const visibility = actor.getFlag(MODULE_ID, "tabVisibility") || {};
  for (const tabId of Object.keys(tabs)) {
    if (visibility[tabId] === false) delete tabs[tabId];
  }
}

function filterHiddenParts(parts, actor) {
  const visibility = actor.getFlag(MODULE_ID, "tabVisibility") || {};
  for (const [partId, visible] of Object.entries(visibility)) {
    if (visible === false && partId !== "header" && partId !== "sidebar")
      delete parts[partId];
  }
}

/* The system re-renders sheets with `parts: ["stats"]` (and, since 1.2.0, also
   "body" for the minion sheet). DS+ sheets replace the stats part with a sidebar
   and have no body part, so remap stats -> sidebar and drop any part this sheet
   does not define; Foundry warns about unknown part ids otherwise. */
function remapRenderParts(sheet, options) {
  if (!Array.isArray(options?.parts)) return options;
  const known = new Set(Object.keys(sheet.constructor.PARTS ?? {}));
  const requested = new Set();
  for (const part of options.parts) {
    /* DS+ sheets keep the inherited `stats` key in PARTS but never render it
       (see _configureRenderParts), so a stats refresh always targets the
       sidebar when the sheet has one. */
    const id = part === "stats" && known.has("sidebar") ? "sidebar" : part;
    if (known.has(id)) requested.add(id);
  }
  options.parts = [...requested];
  return options;
}

/* Free strike damage type label (signature attack type, or the configured
   `monster.freeStrikeType` on NPCs). Empty when the system has no type. */
function getFreeStrikeTypeLabel(actor) {
  const type = actor.system?.freeStrike?.type;
  if (!type) return "";
  return ds.CONFIG.damageTypes[type]?.label ?? type;
}

function getDamageTypeOptions() {
  return Object.entries(ds.CONFIG.damageTypes).map(([value, { label }]) => ({
    value,
    label,
  }));
}

/* "With Captain" context for minions. The system moved this off the NPC sheet
   onto its dedicated Minion sheet in 1.2.0, where the effect is toggled
   automatically from the squad's captain; DS+ NPC sheets keep showing it
   read-only so a minion opened with the full sheet still sees the rider. */
async function getWithCaptainContext(actor) {
  const effect = actor.system.monster?.withCaptainEffect;
  const isMinion = actor.system.monster?.organization === "minion";
  if (!effect || !isMinion) return { exists: false };
  return {
    description: await actor.system._getWithCaptainDescription?.(),
    effectEnabled: !effect.disabled,
    effectId: effect.id,
    exists: true,
  };
}

function deduplicateHeaderControls(controls) {
  const seen = new Set();
  return controls.filter((c) => {
    if (seen.has(c.action)) return false;
    seen.add(c.action);
    return true;
  });
}

function applyCommonRender(element, actor) {
  element.classList.add("has-sidebar");

  if (!element.dataset.dspSidebarToggle) {
    element.dataset.dspSidebarToggle = "1";
    element.querySelectorAll('[data-action="toggleSidebar"]').forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        element.classList.toggle("sidebar-collapsed");
      });
    });
  }

  applyStaminaPortraitTint(element, actor);
  setupSidebarCollapse(element);
  setupItemListCollapse(element);
  processSidebarTags(element);
  setupItemSearch(element);
}

function applyTooltipPrevent(element) {
  element.querySelectorAll(".item-tooltip").forEach(applyItemTooltips);
  if (!element.dataset.dspTooltipPrevent) {
    element.dataset.dspTooltipPrevent = "1";
    element.addEventListener("pointerdown", (e) => {
      if (
        e.button === 1 &&
        document.getElementById("tooltip")?.classList.contains("active")
      )
        e.preventDefault();
    });
  }
}

function getAbilityFields(actor) {
  return (
    actor.itemTypes.ability[0]?.system?.constructor?.schema?.fields ?? {
      resource: {
        label: game.i18n.localize(
          "DRAW_STEEL.Item.ability.FIELDS.resource.label",
        ),
      },
      distance: {
        label: game.i18n.localize(
          "DRAW_STEEL.Item.ability.FIELDS.distance.label",
        ),
      },
      target: {
        label: game.i18n.localize(
          "DRAW_STEEL.Item.ability.FIELDS.target.label",
        ),
      },
    }
  );
}

function getFeatureFields(actor) {
  return (
    actor.itemTypes.feature[0]?.system?.constructor?.schema?.fields ?? {
      type: { label: game.i18n.localize("DOCUMENT.FIELDS.type.label") },
    }
  );
}

export function registerSheets(SHEET_SIZES) {
  if (game.system.id !== SYSTEM_ID) {
    console.warn(
      `${MODULE_ID} | Not running on Draw Steel system, skipping sheet registration`,
    );
    return;
  }

  const sheets = globalThis.ds?.applications?.sheets;

  if (!sheets) {
    console.error(
      `${MODULE_ID} | Draw Steel sheets not found at ds.applications.sheets`,
    );
    console.log(`${MODULE_ID} | Available on ds:`, globalThis.ds);
    return;
  }

  console.log(`${MODULE_ID} | Available sheets:`, Object.keys(sheets));

  /* Each _registerXSheet builds, registers, and returns the DS+ sheet class.
     The built classes double as bases for additional sheet sets (variants) —
     see SHEET_VARIANTS in config.js and registerCompactSheets. */
  const baseSheets = {
    hero: _registerHeroSheet(sheets, SHEET_SIZES),
    npc: _registerNPCSheet(sheets, SHEET_SIZES),
    minion: _registerMinionSheet(sheets, SHEET_SIZES),
    object: _registerObjectSheet(sheets, SHEET_SIZES),
    retainer: _registerRetainerSheet(sheets, SHEET_SIZES),
    companion: _registerCompanionSheet(sheets, SHEET_SIZES),
    party: _registerPartySheet(sheets, SHEET_SIZES),
    item: _registerItemSheet(sheets, SHEET_SIZES),
  };

  registerCompactSheets(baseSheets);

  console.log(`${MODULE_ID} | Sheet registration complete`);
}

function _registerHeroSheet(sheets, SHEET_SIZES) {
  if (!sheets.DrawSteelHeroSheet) return null;

  const DrawSteelPlusHeroSheet = class extends sheets.DrawSteelHeroSheet {
    /* Window size config for this sheet — read via this.constructor.SHEET_SIZE
       so variant subclasses can swap in their own sizes without re-overriding
       the render hooks below. */
    static SHEET_SIZE = SHEET_SIZES.hero;

    static DEFAULT_OPTIONS = {
      ...super.DEFAULT_OPTIONS,
      classes: [...super.DEFAULT_OPTIONS.classes, "draw-steel-plus"],
      position: {
        ...super.DEFAULT_OPTIONS.position,
        width: SHEET_SIZES.hero.width,
        height: SHEET_SIZES.hero.height,
      },
      window: {
        ...super.DEFAULT_OPTIONS.window,
        controls: [
          ...(super.DEFAULT_OPTIONS.window?.controls || []),
          {
            action: "configureTabVisibility",
            icon: "fas fa-file-invoice",
            label: "DRAW_STEEL_PLUS.TabConfig.title",
            ownership: "OWNER",
          },
        ],
      },
      actions: {
        ...super.DEFAULT_OPTIONS.actions,
        toggleDocumentDescription,
        toggleFavorite,
        documentListShare,
        configureTabVisibility: openTabConfig,
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
        templates: [
          "systems/draw-steel/templates/sheets/actor/shared/partials/stats/combat.hbs",
          "systems/draw-steel/templates/sheets/actor/shared/partials/stats/movement.hbs",
          "systems/draw-steel/templates/sheets/actor/shared/partials/stats/immunities-weaknesses.hbs",
        ],
      },
      features: {
        ...(super.PARTS?.features || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/hero-sheet/features.hbs`,
        templates: [
          `${MODULE_PATH}/templates/sheets/actor/shared/partials/features/features.hbs`,
          `${MODULE_PATH}/templates/sheets/actor/shared/partials/search-filter.hbs`,
        ],
        scrollable: [""],
      },
      equipment: {
        ...(super.PARTS?.equipment || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/hero-sheet/equipment.hbs`,
        templates: [
          `${MODULE_PATH}/templates/sheets/actor/shared/partials/search-filter.hbs`,
        ],
        scrollable: [""],
      },
      projects: {
        ...(super.PARTS?.projects || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/hero-sheet/projects.hbs`,
        scrollable: [""],
      },
      biography: {
        ...(super.PARTS?.biography || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/hero-sheet/biography.hbs`,
        scrollable: [""],
      },
      favorites: {
        template: `${MODULE_PATH}/templates/sheets/actor/hero-sheet/favorites.hbs`,
        scrollable: [""],
      },
      abilities: {
        ...(super.PARTS?.abilities || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/shared/abilities.hbs`,
        templates: [
          `${MODULE_PATH}/templates/sheets/actor/shared/partials/search-filter.hbs`,
        ],
        scrollable: [""],
      },
      effects: {
        ...(super.PARTS?.effects || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/shared/effects.hbs`,
        scrollable: [""],
      },
    };

    static TABS = {
      ...super.TABS,
      primary: {
        ...super.TABS?.primary,
        tabs: [
          { id: "favorites" },
          ...(super.TABS?.primary?.tabs?.filter((t) => t.id !== "stats") || []),
        ],
        initial: "features",
      },
    };

    render(options = {}, _options = {}) {
      return super.render(remapRenderParts(this, options), _options);
    }

    _configureRenderParts(options) {
      const parts = super._configureRenderParts(options);
      delete parts.stats;
      filterHiddenParts(parts, this.actor);
      return parts;
    }

    _prepareTabs(group) {
      if (group === "primary" && !this._dspInitialTabSet) {
        this._dspInitialTabSet = true;
        const hasFavorites = this.actor.items.some((i) =>
          i.getFlag("draw-steel-plus", "favorite"),
        );
        if (hasFavorites) this.tabGroups["primary"] = "favorites";
      }
      const tabs = super._prepareTabs(group);
      if (group === "primary") {
        filterHiddenTabs(tabs, this.actor);
        ensureActiveTab(tabs, this.actor);
      }
      return tabs;
    }

    get title() {
      return `${this.document.name} [DS+]`;
    }

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      context.favoritesEnabled = true;
      this._partContextCache = {};
      return context;
    }
    async _preparePartContext(partId, context, options) {
      await super._preparePartContext(partId, context, options);

      if (partId === "features") {
        context.complications?.complications?.forEach(markFavorited);
        context.features?.forEach(markFavorited);
        this._partContextCache.features = context.features;
        this._partContextCache.complications = context.complications;
      } else if (partId === "abilities") {
        for (const at of Object.values(context.abilities || {}))
          at.abilities?.forEach(markFavorited);
        this._partContextCache.abilities = context.abilities;
      } else if (partId === "equipment") {
        context.kits?.forEach(markFavorited);
        for (const tt of Object.values(context.treasure || {}))
          tt.treasure?.forEach(markFavorited);
        this._partContextCache.kits = context.kits;
        this._partContextCache.treasure = context.treasure;
      } else if (partId === "projects") {
        context.followers?.forEach(markFavorited);
        context.projects?.forEach(markFavorited);
        this._partContextCache.followers = context.followers;
        this._partContextCache.projects = context.projects;
      } else if (partId === "sidebar") {
        await super._preparePartContext("stats", context, options);
        context.unfilledSkill =
          !!this.actor.system._unfilledTraits?.skill?.size;
        context.skills = this._getSkills();
      } else if (partId === "favorites") {
        const cache = this._partContextCache;
        const [
          abilities,
          features,
          complications,
          kits,
          treasure,
          projects,
          followers,
        ] = await Promise.all([
          cache.abilities != null
            ? cache.abilities
            : this._prepareAbilitiesContext(),
          cache.features != null
            ? cache.features
            : this._prepareFeaturesContext(),
          cache.complications != null
            ? cache.complications
            : this._prepareComplicationsContext(),
          cache.kits != null ? cache.kits : this._prepareKitsContext(),
          cache.treasure != null
            ? cache.treasure
            : this._prepareTreasureContext(),
          cache.projects != null
            ? cache.projects
            : this._prepareProjectsContext(),
          cache.followers != null
            ? cache.followers
            : this._prepareFollowersContext(),
        ]);

        context.favAbilities = filterAbilities(abilities);
        context.favFeatures = filterFav(features);
        context.favComplications = (complications?.complications || []).filter(
          (c) => c?.item?.getFlag?.("draw-steel-plus", "favorite"),
        );
        context.favComplicationsLabel = complications?.label;
        context.favKits = filterFav(kits);
        context.favTreasure = filterTreasure(treasure);
        context.favProjects = filterFav(projects);
        context.favFollowers = filterFav(followers);
        context.abilityFields = getAbilityFields(this.actor);
        const kit0 = this.actor.itemTypes.kit[0];
        context.kitFields = kit0?.system?.constructor?.schema?.fields ?? {
          bonuses: {
            fields: {
              melee: {
                fields: {
                  damage: {
                    label: game.i18n.localize(
                      "DRAW_STEEL.Item.kit.FIELDS.bonuses.melee.damage.label",
                    ),
                  },
                },
              },
              ranged: {
                fields: {
                  damage: {
                    label: game.i18n.localize(
                      "DRAW_STEEL.Item.kit.FIELDS.bonuses.ranged.damage.label",
                    ),
                  },
                },
              },
            },
          },
        };
        const treas0 = this.actor.itemTypes.treasure[0];
        context.treasureFields = treas0?.system?.constructor?.schema
          ?.fields ?? {
          echelon: {
            label: game.i18n.localize(
              "DRAW_STEEL.Item.treasure.FIELDS.echelon.label",
            ),
          },
          quantity: {
            label: game.i18n.localize(
              "DRAW_STEEL.Item.treasure.FIELDS.quantity.label",
            ),
          },
        };
        const proj0 = this.actor.itemTypes.project[0];
        context.projectFields = proj0?.system?.constructor?.schema?.fields ?? {
          points: {
            label: game.i18n.localize(
              "DRAW_STEEL.Item.project.FIELDS.points.label",
            ),
          },
          type: {
            label: game.i18n.localize(
              "DRAW_STEEL.Item.project.FIELDS.type.label",
            ),
          },
        };
        const fol0 = this.actor.itemTypes.follower?.[0];
        context.followerFields = fol0?.system?.constructor?.schema?.fields ?? {
          type: {
            label: game.i18n.localize(
              "DRAW_STEEL.Item.follower.FIELDS.type.label",
            ),
          },
        };
        context.featureFields = getFeatureFields(this.actor);
        const anyAbilities = Object.values(context.favAbilities || {}).some(
          (at) => (at?.abilities?.length || 0) > 0,
        );
        const anyTreasure = Object.values(context.favTreasure || {}).some(
          (tt) => (tt?.treasure?.length || 0) > 0,
        );
        context.hasFavorites =
          anyAbilities ||
          (context.favFeatures?.length || 0) > 0 ||
          (context.favComplications?.length || 0) > 0 ||
          (context.favKits?.length || 0) > 0 ||
          anyTreasure ||
          (context.favProjects?.length || 0) > 0 ||
          (context.favFollowers?.length || 0) > 0;
      }
      return context;
    }

    _getHeaderControls() {
      return deduplicateHeaderControls(super._getHeaderControls());
    }

    _onFirstRender(context, options) {
      super._onFirstRender(context, options);
      const scale = getFontScale();
      const size = this.constructor.SHEET_SIZE;
      if (scale !== 1)
        this.setPosition({
          width: Math.round(size.width * scale),
          height: Math.round(size.height * scale),
        });
    }

    _onRender(context, options) {
      super._onRender(context, options);
      applyMinSize(this.element, this.constructor.SHEET_SIZE);
      setupScrollbarAutoHide(this.element);
      applyHeaderArt(this.element, "hero");
      applyParallaxHeader(this.element);
      applyCommonRender(this.element, this.document);
      applyFloatingTabs(this);
      applyTooltipPrevent(this.element);
    }
  };

  foundry.documents.collections.Actors.registerSheet(
    MODULE_ID,
    DrawSteelPlusHeroSheet,
    {
      types: ["hero"],
      makeDefault: true,
      label: "DS+ Hero Sheet",
    },
  );

  console.log(`${MODULE_ID} | Registered DS+ Hero Sheet`);
  return DrawSteelPlusHeroSheet;
}

function _registerNPCSheet(sheets, SHEET_SIZES) {
  if (!sheets.DrawSteelNPCSheet) return null;

  const DrawSteelPlusNPCSheet = class extends sheets.DrawSteelNPCSheet {
    static SHEET_SIZE = SHEET_SIZES.npc;

    static DEFAULT_OPTIONS = {
      ...super.DEFAULT_OPTIONS,
      classes: [...super.DEFAULT_OPTIONS.classes, "draw-steel-plus", "dsp-npc"],
      position: {
        ...super.DEFAULT_OPTIONS.position,
        width: SHEET_SIZES.npc.width,
        height: SHEET_SIZES.npc.height,
      },
      window: {
        ...super.DEFAULT_OPTIONS.window,
        controls: [
          ...(super.DEFAULT_OPTIONS.window?.controls || []),
          {
            action: "configureTabVisibility",
            icon: "fas fa-file-invoice",
            label: "DRAW_STEEL_PLUS.TabConfig.title",
            ownership: "OWNER",
          },
        ],
      },
      actions: {
        ...super.DEFAULT_OPTIONS.actions,
        toggleDocumentDescription,
        toggleFavorite,
        documentListShare,
        configureTabVisibility: openTabConfig,
      },
    };

    static PARTS = {
      ...super.PARTS,
      header: {
        ...(super.PARTS?.header || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/npc-sheet/header.hbs`,
      },
      sidebar: {
        template: `${MODULE_PATH}/templates/sheets/actor/npc-sheet/sidebar.hbs`,
        templates: [
          "systems/draw-steel/templates/sheets/actor/shared/partials/stats/combat.hbs",
          "systems/draw-steel/templates/sheets/actor/shared/partials/stats/movement.hbs",
          "systems/draw-steel/templates/sheets/actor/shared/partials/stats/immunities-weaknesses.hbs",
        ],
      },
      features: {
        ...(super.PARTS?.features || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/npc/features.hbs`,
        templates: [
          `${MODULE_PATH}/templates/sheets/actor/shared/partials/features/features.hbs`,
          `${MODULE_PATH}/templates/sheets/actor/shared/partials/search-filter.hbs`,
        ],
        scrollable: [""],
      },
      abilities: {
        ...(super.PARTS?.abilities || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/shared/abilities.hbs`,
        templates: [
          `${MODULE_PATH}/templates/sheets/actor/shared/partials/search-filter.hbs`,
        ],
        scrollable: [""],
      },
      favorites: {
        template: `${MODULE_PATH}/templates/sheets/actor/npc-sheet/npc-favorites.hbs`,
        scrollable: [""],
      },
      biography: {
        ...(super.PARTS?.biography || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/npc/biography.hbs`,
        scrollable: [""],
      },
      effects: {
        ...(super.PARTS?.effects || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/shared/effects.hbs`,
        scrollable: [""],
      },
    };

    static TABS = {
      ...super.TABS,
      primary: {
        ...super.TABS?.primary,
        tabs: [
          { id: "favorites" },
          ...(super.TABS?.primary?.tabs?.filter((t) => t.id !== "stats") || []),
        ],
        initial: "features",
      },
    };

    get title() {
      return `${this.document.name} [DS+]`;
    }

    render(options = {}, _options = {}) {
      return super.render(remapRenderParts(this, options), _options);
    }

    _configureRenderParts(options) {
      const parts = super._configureRenderParts(options);
      delete parts.stats;
      if (!game.settings.get(MODULE_ID, "npcFavoritesEnabled")) {
        delete parts.favorites;
      }
      filterHiddenParts(parts, this.actor);
      return parts;
    }

    _prepareTabs(group) {
      if (group === "primary" && !this._dspInitialTabSet) {
        this._dspInitialTabSet = true;
        if (game.settings.get(MODULE_ID, "npcFavoritesEnabled")) {
          const hasFavorites = this.actor.items.some((i) =>
            i.getFlag("draw-steel-plus", "favorite"),
          );
          if (hasFavorites) this.tabGroups["primary"] = "favorites";
        }
      }
      const tabs = super._prepareTabs(group);
      if (!game.settings.get(MODULE_ID, "npcFavoritesEnabled")) {
        delete tabs.favorites;
      }
      if (group === "primary") {
        filterHiddenTabs(tabs, this.actor);
        ensureActiveTab(tabs, this.actor);
      }
      return tabs;
    }

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      context.favoritesEnabled = game.settings.get(
        MODULE_ID,
        "npcFavoritesEnabled",
      );
      this._partContextCache = {};
      return context;
    }

    async _preparePartContext(partId, context, options) {
      await super._preparePartContext(partId, context, options);

      if (partId === "features") {
        context.features?.forEach(markFavorited);
        this._partContextCache.features = context.features;
      } else if (partId === "abilities") {
        for (const at of Object.values(context.abilities || {}))
          at.abilities?.forEach(markFavorited);
        this._partContextCache.abilities = context.abilities;
      } else if (partId === "sidebar" || partId === "stats") {
        /* "stats" is requested by the compact variant, which folds the sidebar
           into its header and footer. */
        if (partId === "sidebar")
          await super._preparePartContext("stats", context, options);
        context.withCaptain = await getWithCaptainContext(this.actor);
        context.freeStrikeType = getFreeStrikeTypeLabel(this.actor);
        context.freeStrikeTypeOptions = getDamageTypeOptions();
      } else if (
        partId === "favorites" &&
        game.settings.get(MODULE_ID, "npcFavoritesEnabled")
      ) {
        const cache = this._partContextCache;
        const [abilities, features] = await Promise.all([
          cache.abilities != null
            ? cache.abilities
            : this._prepareAbilitiesContext(),
          cache.features != null
            ? cache.features
            : this._prepareFeaturesContext(),
        ]);

        context.favAbilities = filterAbilities(abilities);
        context.favFeatures = filterFav(features);
        context.abilityFields = getAbilityFields(this.actor);
        context.featureFields = getFeatureFields(this.actor);
        const anyAbilities = Object.values(context.favAbilities || {}).some(
          (at) => (at?.abilities?.length || 0) > 0,
        );
        context.hasFavorites =
          anyAbilities || (context.favFeatures?.length || 0) > 0;
      }
      return context;
    }

    _getHeaderControls() {
      return deduplicateHeaderControls(super._getHeaderControls());
    }

    _onFirstRender(context, options) {
      super._onFirstRender(context, options);
      const scale = getFontScale();
      const size = this.constructor.SHEET_SIZE;
      if (scale !== 1)
        this.setPosition({
          width: Math.round(size.width * scale),
          height: Math.round(size.height * scale),
        });
    }

    _onRender(context, options) {
      super._onRender(context, options);
      applyMinSize(this.element, this.constructor.SHEET_SIZE);
      setupScrollbarAutoHide(this.element);
      applyHeaderArt(this.element, "npc");
      applyParallaxHeader(this.element);
      applyCommonRender(this.element, this.document);
      applyFloatingTabs(this);
      applyTooltipPrevent(this.element);
    }
  };

  foundry.documents.collections.Actors.registerSheet(
    MODULE_ID,
    DrawSteelPlusNPCSheet,
    {
      types: ["npc"],
      makeDefault: true,
      label: "DS+ NPC Sheet",
    },
  );

  console.log(`${MODULE_ID} | Registered DS+ NPC Sheet`);
  return DrawSteelPlusNPCSheet;
}

function _registerObjectSheet(sheets, SHEET_SIZES) {
  if (!sheets.DrawSteelObjectSheet) return null;

  const DrawSteelPlusObjectSheet = class extends sheets.DrawSteelObjectSheet {
    static SHEET_SIZE = SHEET_SIZES.object;

    static DEFAULT_OPTIONS = {
      ...super.DEFAULT_OPTIONS,
      classes: [
        ...super.DEFAULT_OPTIONS.classes,
        "draw-steel-plus",
        "dsp-object",
      ],
      position: {
        ...super.DEFAULT_OPTIONS.position,
        width: SHEET_SIZES.object.width,
        height: SHEET_SIZES.object.height,
      },
      actions: {
        ...super.DEFAULT_OPTIONS.actions,
        toggleDocumentDescription,
        documentListShare,
      },
    };

    static PARTS = {
      ...super.PARTS,
      header: {
        ...(super.PARTS?.header || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/object-sheet/header.hbs`,
      },
      features: {
        ...(super.PARTS?.features || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/object-sheet/features.hbs`,
        templates: [
          `${MODULE_PATH}/templates/sheets/actor/shared/partials/features/features.hbs`,
          `${MODULE_PATH}/templates/sheets/actor/shared/partials/search-filter.hbs`,
        ],
        scrollable: [""],
      },
      stats: {
        ...(super.PARTS?.stats || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/object-sheet/stats.hbs`,
      },
      abilities: {
        ...(super.PARTS?.abilities || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/shared/abilities.hbs`,
        templates: [
          `${MODULE_PATH}/templates/sheets/actor/shared/partials/search-filter.hbs`,
        ],
        scrollable: [""],
      },
    };

    get title() {
      return `${this.document.name} [DS+]`;
    }

    _getHeaderControls() {
      return deduplicateHeaderControls(super._getHeaderControls());
    }

    _onFirstRender(context, options) {
      super._onFirstRender(context, options);
      const scale = getFontScale();
      const size = this.constructor.SHEET_SIZE;
      if (scale !== 1)
        this.setPosition({
          width: Math.round(size.width * scale),
          height: Math.round(size.height * scale),
        });
    }

    _onRender(context, options) {
      super._onRender(context, options);
      applyMinSize(this.element, this.constructor.SHEET_SIZE);
      setupScrollbarAutoHide(this.element);
      applyHeaderArt(this.element, "object");
      applyParallaxHeader(this.element);
      setupItemListCollapse(this.element);
      setupItemSearch(this.element);
      applyFloatingTabs(this);
      applyTooltipPrevent(this.element);
    }
  };

  foundry.documents.collections.Actors.registerSheet(
    MODULE_ID,
    DrawSteelPlusObjectSheet,
    {
      types: ["object"],
      makeDefault: true,
      label: game.i18n.localize("DRAW_STEEL_PLUS.Sheet.Object"),
    },
  );

  console.log(`${MODULE_ID} | Registered DS+ Object Sheet`);
  return DrawSteelPlusObjectSheet;
}

function _registerRetainerSheet(sheets, SHEET_SIZES) {
  if (!sheets.DrawSteelRetainerSheet) return null;

  const DrawSteelPlusRetainerSheet = class
    extends sheets.DrawSteelRetainerSheet
  {
    static SHEET_SIZE = SHEET_SIZES.retainer;

    static DEFAULT_OPTIONS = {
      ...super.DEFAULT_OPTIONS,
      classes: [
        ...super.DEFAULT_OPTIONS.classes,
        "draw-steel-plus",
        "dsp-retainer",
      ],
      position: {
        ...super.DEFAULT_OPTIONS.position,
        width: SHEET_SIZES.retainer.width,
        height: SHEET_SIZES.retainer.height,
      },
      window: {
        ...super.DEFAULT_OPTIONS.window,
        controls: [
          ...(super.DEFAULT_OPTIONS.window?.controls || []),
          {
            action: "configureTabVisibility",
            icon: "fas fa-file-invoice",
            label: "DRAW_STEEL_PLUS.TabConfig.title",
            ownership: "OWNER",
          },
        ],
      },
      actions: {
        ...super.DEFAULT_OPTIONS.actions,
        toggleDocumentDescription,
        documentListShare,
        configureTabVisibility: openTabConfig,
      },
    };

    static PARTS = {
      ...super.PARTS,
      header: {
        ...(super.PARTS?.header || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/retainer-sheet/header.hbs`,
      },
      sidebar: {
        template: `${MODULE_PATH}/templates/sheets/actor/retainer-sheet/sidebar.hbs`,
        templates: [
          "systems/draw-steel/templates/sheets/actor/shared/partials/stats/combat.hbs",
          "systems/draw-steel/templates/sheets/actor/shared/partials/stats/movement.hbs",
          "systems/draw-steel/templates/sheets/actor/shared/partials/stats/immunities-weaknesses.hbs",
        ],
      },
      features: {
        ...(super.PARTS?.features || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/retainer-sheet/features.hbs`,
        templates: [
          `${MODULE_PATH}/templates/sheets/actor/shared/partials/features/features.hbs`,
          `${MODULE_PATH}/templates/sheets/actor/shared/partials/search-filter.hbs`,
        ],
        scrollable: [""],
      },
      biography: {
        ...(super.PARTS?.biography || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/retainer-sheet/biography.hbs`,
        scrollable: [""],
      },
      abilities: {
        ...(super.PARTS?.abilities || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/shared/abilities.hbs`,
        templates: [
          `${MODULE_PATH}/templates/sheets/actor/shared/partials/search-filter.hbs`,
        ],
        scrollable: [""],
      },
      effects: {
        ...(super.PARTS?.effects || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/shared/effects.hbs`,
        scrollable: [""],
      },
    };

    static TABS = {
      ...super.TABS,
      primary: {
        ...super.TABS?.primary,
        tabs: (super.TABS?.primary?.tabs || []).filter((t) => t.id !== "stats"),
        initial: "features",
      },
    };

    render(options = {}, _options = {}) {
      return super.render(remapRenderParts(this, options), _options);
    }

    _configureRenderParts(options) {
      const parts = super._configureRenderParts(options);
      delete parts.stats;
      filterHiddenParts(parts, this.actor);
      return parts;
    }

    _prepareTabs(group) {
      const tabs = super._prepareTabs(group);
      if (group === "primary") filterHiddenTabs(tabs, this.actor);
      return tabs;
    }

    get title() {
      return `${this.document.name} [DS+]`;
    }

    async _preparePartContext(partId, context, options) {
      await super._preparePartContext(partId, context, options);
      if (partId === "sidebar") {
        await super._preparePartContext("stats", context, options);
        context.freeStrikeType = getFreeStrikeTypeLabel(this.actor);
      }
      return context;
    }

    _getHeaderControls() {
      return deduplicateHeaderControls(super._getHeaderControls());
    }

    _onFirstRender(context, options) {
      super._onFirstRender(context, options);
      const scale = getFontScale();
      const size = this.constructor.SHEET_SIZE;
      if (scale !== 1)
        this.setPosition({
          width: Math.round(size.width * scale),
          height: Math.round(size.height * scale),
        });
    }

    _onRender(context, options) {
      super._onRender(context, options);
      applyMinSize(this.element, this.constructor.SHEET_SIZE);
      setupScrollbarAutoHide(this.element);
      applyHeaderArt(this.element, "retainer");
      applyParallaxHeader(this.element);
      applyCommonRender(this.element, this.document);
      applyFloatingTabs(this);
      applyTooltipPrevent(this.element);
    }
  };

  foundry.documents.collections.Actors.registerSheet(
    MODULE_ID,
    DrawSteelPlusRetainerSheet,
    {
      types: ["retainer"],
      makeDefault: true,
      label: "DS+ Retainer Sheet",
    },
  );

  console.log(`${MODULE_ID} | Registered DS+ Retainer Sheet`);
  return DrawSteelPlusRetainerSheet;
}

function _registerCompanionSheet(sheets, SHEET_SIZES) {
  if (!sheets.DrawSteelCompanionSheet) return null;

  const DrawSteelPlusCompanionSheet = class
    extends sheets.DrawSteelCompanionSheet
  {
    static SHEET_SIZE = SHEET_SIZES.companion;

    static DEFAULT_OPTIONS = {
      ...super.DEFAULT_OPTIONS,
      classes: [
        ...super.DEFAULT_OPTIONS.classes,
        "draw-steel-plus",
        "dsp-companion",
      ],
      position: {
        ...super.DEFAULT_OPTIONS.position,
        width: SHEET_SIZES.companion.width,
        height: SHEET_SIZES.companion.height,
      },
      window: {
        ...super.DEFAULT_OPTIONS.window,
        controls: [
          ...(super.DEFAULT_OPTIONS.window?.controls || []),
          {
            action: "configureTabVisibility",
            icon: "fas fa-file-invoice",
            label: "DRAW_STEEL_PLUS.TabConfig.title",
            ownership: "OWNER",
          },
        ],
      },
      actions: {
        ...super.DEFAULT_OPTIONS.actions,
        toggleDocumentDescription,
        documentListShare,
        configureTabVisibility: openTabConfig,
      },
    };

    static PARTS = {
      ...super.PARTS,
      header: {
        ...(super.PARTS?.header || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/companion-sheet/header.hbs`,
      },
      sidebar: {
        template: `${MODULE_PATH}/templates/sheets/actor/companion-sheet/sidebar.hbs`,
        templates: [
          "systems/draw-steel/templates/sheets/actor/shared/partials/stats/combat.hbs",
          "systems/draw-steel/templates/sheets/actor/shared/partials/stats/movement.hbs",
          "systems/draw-steel/templates/sheets/actor/shared/partials/stats/immunities-weaknesses.hbs",
        ],
      },
      features: {
        ...(super.PARTS?.features || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/companion-sheet/features.hbs`,
        templates: [
          `${MODULE_PATH}/templates/sheets/actor/shared/partials/features/features.hbs`,
          `${MODULE_PATH}/templates/sheets/actor/shared/partials/search-filter.hbs`,
        ],
        scrollable: [""],
      },
      biography: {
        ...(super.PARTS?.biography || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/companion-sheet/biography.hbs`,
        scrollable: [""],
      },
      abilities: {
        ...(super.PARTS?.abilities || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/shared/abilities.hbs`,
        templates: [
          `${MODULE_PATH}/templates/sheets/actor/shared/partials/search-filter.hbs`,
        ],
        scrollable: [""],
      },
      effects: {
        ...(super.PARTS?.effects || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/shared/effects.hbs`,
        scrollable: [""],
      },
    };

    static TABS = {
      ...super.TABS,
      primary: {
        ...super.TABS?.primary,
        tabs: (super.TABS?.primary?.tabs || []).filter((t) => t.id !== "stats"),
        initial: "features",
      },
    };

    render(options = {}, _options = {}) {
      return super.render(remapRenderParts(this, options), _options);
    }

    _configureRenderParts(options) {
      const parts = super._configureRenderParts(options);
      delete parts.stats;
      filterHiddenParts(parts, this.actor);
      return parts;
    }

    _prepareTabs(group) {
      const tabs = super._prepareTabs(group);
      if (group === "primary") filterHiddenTabs(tabs, this.actor);
      return tabs;
    }

    get title() {
      return `${this.document.name} [DS+]`;
    }

    async _preparePartContext(partId, context, options) {
      await super._preparePartContext(partId, context, options);
      if (partId === "sidebar") {
        /* The system prepares the companion's header context (master link,
           recoveries, hero resource fields) only for the header part; the DS+
           sidebar shows the same resources, so pull both in. */
        await super._preparePartContext("header", context, options);
        await super._preparePartContext("stats", context, options);
        context.freeStrikeType = getFreeStrikeTypeLabel(this.actor);
        const master = this.actor.system.companion?.master;
        context.master = master
          ? {
              name: master.name,
              primary: master.system.hero?.primary,
              surges: master.system.hero?.surges,
              epic: master.system.hero?.epic,
              showEpic: (this.actor.system.level ?? 0) >= 10,
            }
          : null;
        context.skillsList = this.actor.system.skills?.list ?? "";
      }
      return context;
    }

    _getHeaderControls() {
      return deduplicateHeaderControls(super._getHeaderControls());
    }

    _onFirstRender(context, options) {
      super._onFirstRender(context, options);
      const scale = getFontScale();
      const size = this.constructor.SHEET_SIZE;
      if (scale !== 1)
        this.setPosition({
          width: Math.round(size.width * scale),
          height: Math.round(size.height * scale),
        });
    }

    _onRender(context, options) {
      super._onRender(context, options);
      applyMinSize(this.element, this.constructor.SHEET_SIZE);
      setupScrollbarAutoHide(this.element);
      applyHeaderArt(this.element, "companion");
      applyParallaxHeader(this.element);
      applyCommonRender(this.element, this.document);
      applyFloatingTabs(this);
      applyTooltipPrevent(this.element);
    }
  };

  foundry.documents.collections.Actors.registerSheet(
    MODULE_ID,
    DrawSteelPlusCompanionSheet,
    {
      types: ["companion"],
      makeDefault: true,
      label: "DS+ Companion Sheet",
    },
  );

  console.log(`${MODULE_ID} | Registered DS+ Companion Sheet`);
  return DrawSteelPlusCompanionSheet;
}

/* The system's Minion sheet (new in Draw Steel 1.2.0) is a two-part stat block:
   header + a single scrolling body with stats, features, abilities and effects.
   The DS+ version keeps that shape (no tabs, no sidebar) and restyles it with the
   DS+ header, item lists, tooltips and search. */
function _registerMinionSheet(sheets, SHEET_SIZES) {
  if (!sheets.DrawSteelMinionSheet) return null;

  const DrawSteelPlusMinionSheet = class extends sheets.DrawSteelMinionSheet {
    static SHEET_SIZE = SHEET_SIZES.minion;

    static DEFAULT_OPTIONS = {
      ...super.DEFAULT_OPTIONS,
      classes: [
        ...super.DEFAULT_OPTIONS.classes,
        "draw-steel-plus",
        "dsp-npc",
        "dsp-minion",
      ],
      position: {
        ...super.DEFAULT_OPTIONS.position,
        width: SHEET_SIZES.minion.width,
        height: SHEET_SIZES.minion.height,
      },
      actions: {
        ...super.DEFAULT_OPTIONS.actions,
        toggleDocumentDescription,
        documentListShare,
      },
    };

    static PARTS = {
      ...super.PARTS,
      header: {
        ...(super.PARTS?.header || {}),
        /* Same header context as the NPC sheet (the minion sheet extends it). */
        template: `${MODULE_PATH}/templates/sheets/actor/npc-sheet/header.hbs`,
      },
      body: {
        ...(super.PARTS?.body || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/minion-sheet/body.hbs`,
        templates: [
          `${MODULE_PATH}/templates/sheets/actor/shared/partials/features/features.hbs`,
          `${MODULE_PATH}/templates/sheets/actor/shared/partials/search-filter.hbs`,
          "systems/draw-steel/templates/sheets/actor/shared/partials/stats/combat.hbs",
          "systems/draw-steel/templates/sheets/actor/shared/partials/stats/movement.hbs",
          "systems/draw-steel/templates/sheets/actor/shared/partials/stats/immunities-weaknesses.hbs",
        ],
        scrollable: [""],
      },
    };

    get title() {
      return `${this.document.name} [DS+ Minion]`;
    }

    render(options = {}, _options = {}) {
      return super.render(remapRenderParts(this, options), _options);
    }

    async _preparePartContext(partId, context, options) {
      await super._preparePartContext(partId, context, options);
      if (partId === "body") {
        context.freeStrikeType = getFreeStrikeTypeLabel(this.actor);
        context.freeStrikeTypeOptions = getDamageTypeOptions();
        context.isSingleSquadMinion =
          this.actor.isMinion && this.actor.system.combatGroups?.size === 1;
        if (context.isSingleSquadMinion)
          context.combatGroup = this.actor.system.combatGroup;
        context.favoritesEnabled = false;
      }
      return context;
    }

    _getHeaderControls() {
      return deduplicateHeaderControls(super._getHeaderControls());
    }

    _onFirstRender(context, options) {
      super._onFirstRender(context, options);
      const scale = getFontScale();
      const size = this.constructor.SHEET_SIZE;
      if (scale !== 1)
        this.setPosition({
          width: Math.round(size.width * scale),
          height: Math.round(size.height * scale),
        });
    }

    _onRender(context, options) {
      super._onRender(context, options);
      applyMinSize(this.element, this.constructor.SHEET_SIZE);
      setupScrollbarAutoHide(this.element);
      applyHeaderArt(this.element, "npc");
      applyParallaxHeader(this.element);
      applyStaminaPortraitTint(this.element, this.document);
      setupItemListCollapse(this.element);
      processSidebarTags(this.element);
      setupItemSearch(this.element);
      applyTooltipPrevent(this.element);
    }
  };

  foundry.documents.collections.Actors.registerSheet(
    MODULE_ID,
    DrawSteelPlusMinionSheet,
    {
      types: ["npc"],
      makeDefault: false,
      label: "DS+ Minion Sheet",
    },
  );

  console.log(`${MODULE_ID} | Registered DS+ Minion Sheet`);
  return DrawSteelPlusMinionSheet;
}

function _registerPartySheet(sheets, SHEET_SIZES) {
  if (!sheets.DrawSteelPartySheet) return null;

  const DrawSteelPlusPartySheet = class extends sheets.DrawSteelPartySheet {
    static SHEET_SIZE = SHEET_SIZES.party;

    static DEFAULT_OPTIONS = {
      ...super.DEFAULT_OPTIONS,
      classes: [
        ...super.DEFAULT_OPTIONS.classes,
        "draw-steel-plus",
        "dsp-party",
      ],
      position: {
        ...super.DEFAULT_OPTIONS.position,
        width: SHEET_SIZES.party.width,
        height: SHEET_SIZES.party.height,
      },
    };

    static PARTS = {
      ...super.PARTS,
      header: {
        ...(super.PARTS?.header || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/party-sheet/header.hbs`,
      },
      members: {
        ...(super.PARTS?.members || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/party-sheet/members.hbs`,
        scrollable: [""],
      },
      details: {
        ...(super.PARTS?.details || {}),
        template: `${MODULE_PATH}/templates/sheets/actor/party-sheet/details.hbs`,
        scrollable: [""],
      },
    };

    get title() {
      return `${this.document.name} [DS+]`;
    }

    _getHeaderControls() {
      return deduplicateHeaderControls(super._getHeaderControls());
    }

    _onFirstRender(context, options) {
      super._onFirstRender(context, options);
      const scale = getFontScale();
      const size = this.constructor.SHEET_SIZE;
      if (scale !== 1)
        this.setPosition({
          width: Math.round(size.width * scale),
          height: Math.round(size.height * scale),
        });
    }

    _onRender(context, options) {
      super._onRender(context, options);
      applyMinSize(this.element, this.constructor.SHEET_SIZE);
      setupScrollbarAutoHide(this.element);
      applyHeaderArt(this.element, "party");
      applyParallaxHeader(this.element);
      applyFloatingTabs(this);
    }
  };

  foundry.documents.collections.Actors.registerSheet(
    MODULE_ID,
    DrawSteelPlusPartySheet,
    {
      types: ["party"],
      makeDefault: true,
      label: "DS+ Party Sheet",
    },
  );

  console.log(`${MODULE_ID} | Registered DS+ Party Sheet`);
  return DrawSteelPlusPartySheet;
}

function _registerItemSheet(sheets, SHEET_SIZES) {
  if (!sheets.DrawSteelItemSheet) return null;

  const itemTypes = Object.keys(game.system.documentTypes?.Item ?? {}).filter(
    (t) => t !== "base",
  );
  if (!itemTypes.length) return null;

  const DrawSteelPlusItemSheet = class extends sheets.DrawSteelItemSheet {
    static SHEET_SIZE = SHEET_SIZES.item;

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
        documentListShare,
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

    _getHeaderControls() {
      return deduplicateHeaderControls(super._getHeaderControls());
    }

    _onFirstRender(context, options) {
      super._onFirstRender(context, options);
      const scale = getFontScale();
      const size = this.constructor.SHEET_SIZE;
      if (scale !== 1)
        this.setPosition({
          width: Math.round(size.width * scale),
          height: Math.round(size.height * scale),
        });
    }

    _onRender(context, options) {
      super._onRender(context, options);
      applyMinSize(this.element, this.constructor.SHEET_SIZE);
      setupScrollbarAutoHide(this.element);
      applyFloatingTabs(this);
      applyTooltipPrevent(this.element);
    }
  };

  foundry.documents.collections.Items.registerSheet(
    MODULE_ID,
    DrawSteelPlusItemSheet,
    {
      types: itemTypes,
      makeDefault: true,
      label: "DS+ Item Sheet",
    },
  );

  console.log(`${MODULE_ID} | Registered DS+ Item Sheet`);
  return DrawSteelPlusItemSheet;
}
