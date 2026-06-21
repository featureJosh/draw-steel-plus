import { MODULE_CONFIG, SHEET_VARIANTS } from "./config.js";

const MODULE_ID = MODULE_CONFIG.id;
const MODULE_PATH = MODULE_CONFIG.path;
const COMPACT_TPL = `${MODULE_PATH}/templates/sheets/actor/compact`;

/* The DS+ Compact sheets are a second, user-selectable sheet set: a text-heavy,
   stat-block presentation of the same data. They extend the built DS+ sheet
   classes, so behaviors like favorites, tab visibility, collapse/expand, search,
   header art, and tooltips are inherited. The variant then reshapes the layout:
   - no sidebar — its read-only stats move into the header, its editable fields
     into an always-visible footer strip (the "compactFooter" part)
   - item lists render as prose entries ("Name — Type | Distance | Target")
     instead of columns, and every entry starts expanded
   - styles/compact-sheets.css keys off the variant's CSS class */

const ENTRY_PARTIALS = [
  `${COMPACT_TPL}/partials/ability-entry.hbs`,
  `${COMPACT_TPL}/partials/simple-entry.hbs`,
];
const SEARCH_PARTIAL = `${MODULE_PATH}/templates/sheets/actor/shared/partials/search-filter.hbs`;
const STATS_EDIT_PARTIALS = [
  "systems/draw-steel/templates/sheets/actor/shared/partials/stats/combat.hbs",
  "systems/draw-steel/templates/sheets/actor/shared/partials/stats/movement.hbs",
  "systems/draw-steel/templates/sheets/actor/shared/partials/stats/immunities-weaknesses.hbs",
];

const COMPACT_PARTS = {
  hero: {
    header: { template: `${COMPACT_TPL}/hero-header.hbs` },
    features: {
      template: `${COMPACT_TPL}/hero-features.hbs`,
      templates: [...ENTRY_PARTIALS, SEARCH_PARTIAL],
      scrollable: [""],
    },
    abilities: {
      template: `${COMPACT_TPL}/abilities.hbs`,
      templates: [...ENTRY_PARTIALS, SEARCH_PARTIAL],
      scrollable: [""],
    },
    favorites: {
      template: `${COMPACT_TPL}/hero-favorites.hbs`,
      templates: ENTRY_PARTIALS,
      scrollable: [""],
    },
    compactFooter: {
      template: `${COMPACT_TPL}/hero-footer.hbs`,
      templates: STATS_EDIT_PARTIALS,
    },
  },
  npc: {
    header: { template: `${COMPACT_TPL}/npc-header.hbs` },
    features: {
      template: `${COMPACT_TPL}/npc-features.hbs`,
      templates: [...ENTRY_PARTIALS, SEARCH_PARTIAL],
      scrollable: [""],
    },
    abilities: {
      template: `${COMPACT_TPL}/abilities.hbs`,
      templates: [...ENTRY_PARTIALS, SEARCH_PARTIAL],
      scrollable: [""],
    },
    favorites: {
      template: `${COMPACT_TPL}/npc-favorites.hbs`,
      templates: ENTRY_PARTIALS,
      scrollable: [""],
    },
    compactFooter: {
      template: `${COMPACT_TPL}/npc-footer.hbs`,
      templates: STATS_EDIT_PARTIALS,
    },
  },
};

function buildCompactParts(BaseSheet, type) {
  const parts = { ...BaseSheet.PARTS };
  // The sidebar is gone entirely; its content lives in the header and footer.
  delete parts.sidebar;
  for (const [id, override] of Object.entries(COMPACT_PARTS[type])) {
    parts[id] = { ...(parts[id] || {}), ...override };
  }
  return parts;
}

function buildCompactSheet(BaseSheet, type, variant) {
  const size = variant.sizes[type];
  const parts = buildCompactParts(BaseSheet, type);

  return class extends BaseSheet {
    static SHEET_SIZE = size;

    static DEFAULT_OPTIONS = {
      ...BaseSheet.DEFAULT_OPTIONS,
      classes: [...BaseSheet.DEFAULT_OPTIONS.classes, variant.cssClass],
      position: {
        ...BaseSheet.DEFAULT_OPTIONS.position,
        width: size.width,
        height: size.height,
      },
    };

    static PARTS = parts;

    get title() {
      return `${this.document.name} ${variant.titleSuffix}`;
    }

    /* Stats re-renders (stamina changes etc.) target the header and footer —
       this variant has no sidebar part for the base class to remap them to. */
    render(options = {}, _options = {}) {
      if (Array.isArray(options?.parts)) {
        const requested = new Set(options.parts);
        const hadStats = requested.delete("stats");
        const hadSidebar = requested.delete("sidebar");
        if (hadStats || hadSidebar) {
          requested.add("header");
          requested.add("compactFooter");
        }
        options.parts = [...requested];
      }
      return super.render(options, _options);
    }

    _configureRenderParts(options) {
      const renderParts = super._configureRenderParts(options);
      delete renderParts.sidebar;
      return renderParts;
    }

    /* Stat-block presentation: every embedded document starts expanded. Seeding
       is tracked per uuid so a user collapse is respected across re-renders
       while newly created documents still open expanded. */
    async _prepareContext(options) {
      this._dspCompactSeeded ??= new Set();
      const docs = [
        ...this.document.items,
        ...(this.document.allApplicableEffects?.() ?? []),
      ];
      for (const doc of docs) {
        if (this._dspCompactSeeded.has(doc.uuid)) continue;
        this._dspCompactSeeded.add(doc.uuid);
        this._expandedDocumentDescriptions.add(doc.uuid);
      }
      return super._prepareContext(options);
    }

    /* The header shows the sidebar's read-only stats (combat & movement,
       immunities/weaknesses, skills); the footer holds its editable fields.
       Both need the system's stats part context. */
    async _preparePartContext(partId, context, options) {
      await super._preparePartContext(partId, context, options);
      if (partId === "header" || partId === "compactFooter") {
        await super._preparePartContext("stats", context, options);
        if (type === "hero") {
          context.skills = this._getSkills();
          context.unfilledSkill =
            !!this.actor.system._unfilledTraits?.skill?.size;
        }
      }
      return context;
    }

    _onRender(context, options) {
      super._onRender(context, options);
      this.element.classList.remove("has-sidebar");
    }
  };
}

/* baseSheets is the map of built DS+ sheet classes returned by registerSheets.
   Only types with compact parts defined get a compact variant; adding one for
   another actor type means adding its parts here and its label/size in
   SHEET_VARIANTS. */
export function registerCompactSheets(baseSheets) {
  const variant = SHEET_VARIANTS.compact;

  for (const type of Object.keys(COMPACT_PARTS)) {
    const BaseSheet = baseSheets[type];
    if (!BaseSheet) continue;

    foundry.documents.collections.Actors.registerSheet(
      MODULE_ID,
      buildCompactSheet(BaseSheet, type, variant),
      {
        types: [type],
        makeDefault: false,
        label: variant.labels[type],
      },
    );

    console.log(`${MODULE_ID} | Registered DS+ Compact ${type} sheet`);
  }
}
