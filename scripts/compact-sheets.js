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
    equipment: {
      template: `${COMPACT_TPL}/hero-equipment.hbs`,
      templates: [...ENTRY_PARTIALS, SEARCH_PARTIAL],
      scrollable: [""],
    },
    projects: {
      template: `${COMPACT_TPL}/hero-projects.hbs`,
      templates: ENTRY_PARTIALS,
      scrollable: [""],
    },
    biography: {
      template: `${COMPACT_TPL}/hero-biography.hbs`,
      scrollable: [""],
    },
    effects: {
      template: `${COMPACT_TPL}/effects.hbs`,
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
    biography: {
      template: `${COMPACT_TPL}/npc-biography.hbs`,
      scrollable: [""],
    },
    effects: {
      template: `${COMPACT_TPL}/effects.hbs`,
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

function editPortraitImage(event, target) {
  const attr = target.dataset.edit;
  const current = foundry.utils.getProperty(this.document._source, attr);
  const defaultArtwork = this.document.constructor.getDefaultArtwork?.(this.document._source) ?? {};
  const defaultImage = foundry.utils.getProperty(defaultArtwork, attr);
  const sheet = this;
  const fp = new FilePicker({
    current,
    type: "image",
    redirectToRoot: defaultImage ? [defaultImage] : [],
    callback: async path => { await sheet.document.update({ [attr]: path }); },
    position: { top: this.position.top + 40, left: this.position.left + 10 },
    document: this.document,
  });
  return fp.browse();
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
      actions: {
        ...BaseSheet.DEFAULT_OPTIONS.actions,
        editPortraitImage,
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
      requestAnimationFrame(() => {
        inlineItemDescriptions(this.element);
        highlightCharacteristics(this.element);
        dotSeparate(this.element);
      });
    }
  };
}

function inlineItemDescriptions(element) {
  if (!element) return;
  for (const entry of element.querySelectorAll(".compact-entry")) {
    inlineEntryDescription(entry);
    buildKeywordPills(entry);
  }
}

function inlineEntryDescription(entry) {
  const nameEl = entry.querySelector(".compact-entry-name");
  const descEl = entry.querySelector(".document-description");
  if (!nameEl || !descEl) return;

  const isAbility = entry.classList.contains("ability");

  if (isAbility) {
    if (entry.querySelector(".compact-entry-desc")) return;

    const flavorP = descEl.querySelector("p.flavor");
    if (flavorP?.textContent.trim()) {
      const descDiv = document.createElement("div");
      descDiv.className = "compact-entry-desc";
      while (flavorP.firstChild) descDiv.append(flavorP.firstChild);
      flavorP.remove();
      // Sits below the uppercase meta line, above the power-roll body (reference order)
      (entry.querySelector(".compact-entry-metaline") ??
        entry.querySelector(".compact-entry-head"))?.after(descDiv);
    }

    const hasKeywords = !!descEl.querySelector(".compact-entry-tags");
    const isInlineOnly =
      !descEl.querySelector("section.powerResult, section.effect, section.spend, dl dt.trigger") &&
      !hasKeywords;
    entry.classList.toggle("dsp-inline-only", isInlineOnly);
    return;
  }

  if (nameEl.querySelector(".dsp-inline-desc")) return;

  const firstP = descEl.querySelector("p");
  if (!firstP || !firstP.textContent.trim()) return;

  const colon = document.createElement("span");
  colon.className = "dsp-inline-colon";
  colon.textContent = ":";
  colon.setAttribute("aria-hidden", "true");

  const inline = document.createElement("span");
  inline.className = "dsp-inline-desc";
  while (firstP.firstChild) inline.append(firstP.firstChild);
  firstP.remove();

  entry.classList.toggle("dsp-inline-only", !descEl.textContent.trim());
  nameEl.append(colon, document.createTextNode(" "), inline);
}

function buildKeywordPills(entry) {
  const tagsEl = entry.querySelector(".compact-entry-tags");
  if (!tagsEl || tagsEl.dataset.built) return;
  tagsEl.dataset.built = "1";
  const text = tagsEl.textContent.trim();
  if (!text) { tagsEl.remove(); return; }
  tagsEl.replaceChildren(
    ...text.split(", ").map(k => {
      const s = document.createElement("span");
      s.className = "compact-tag";
      s.textContent = k;
      return s;
    })
  );
}

/* The system renders the skills list comma-separated; the reference ledger uses
   middot separators. Swap them in place (idempotent — skips if already done). */
function dotSeparate(element) {
  const line = element.querySelector(".compact-skills-line");
  if (line && !line.dataset.dotted && line.textContent.includes(",")) {
    line.dataset.dotted = "1";
    line.textContent = line.textContent
      .split(/,\s*(?:and\s+)?|\s+and\s+/)
      .map(s => s.trim())
      .filter(Boolean)
      .join("  ·  ");
  }
}

function highlightCharacteristics(element) {
  for (const badge of element.querySelectorAll(".char-badge")) {
    const valueEl = badge.querySelector(".char-value");
    if (!valueEl) continue;
    const val = parseInt(valueEl.textContent.replace(/[^-\d]/g, ""), 10);
    if (isNaN(val)) continue;
    badge.dataset.charSign = val > 0 ? "positive" : val < 0 ? "negative" : "zero";
  }
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
