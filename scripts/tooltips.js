import { MODULE_CONFIG } from "./config.js";

const MODULE_PATH = MODULE_CONFIG.path;
const TOOLTIP_MARGIN_PX = 8;

const Dir = foundry?.helpers?.interaction?.TooltipManager?.TOOLTIP_DIRECTIONS ?? {
  UP: "UP",
  DOWN: "DOWN",
  LEFT: "LEFT",
  RIGHT: "RIGHT",
};

export class TooltipsDSP {
  #observer = null;
  #tooltip = null;

  constructor() {
    this.#tooltip = document.getElementById("tooltip");
  }

  get tooltip() {
    return this.#tooltip;
  }

  observe() {
    this.#observer?.disconnect();
    this.#observer = new MutationObserver(this._onMutation.bind(this));
    this.#observer.observe(this.#tooltip, {
      attributeFilter: ["class"],
      attributeOldValue: true,
    });
  }

  _onMutation(mutationList) {
    for (const mutation of mutationList) {
      if (mutation.attributeName !== "class") continue;
      const oldClasses = new Set((mutation.oldValue ?? "").split(/\s+/).filter(Boolean));
      const newClasses = new Set(this.#tooltip.classList);
      if (!oldClasses.has("active") && newClasses.has("active")) {
        this._onTooltipActivate();
        break;
      }
    }
  }

  async _onTooltipActivate() {
    const loading = this.#tooltip.querySelector(".loading[data-uuid]");
    if (!loading?.dataset.uuid) return;

    const uuid = loading.dataset.uuid;
    let doc;
    try {
      doc = await fromUuid(uuid);
    } catch {
      return;
    }

    if (!doc) return;

    let content;
    let classes = ["dsp-tooltip"];

    if (doc.documentName === "ActiveEffect") {
      content = await this._renderEffectTooltip(doc);
      classes.push("effect-tooltip");
    } else if (doc.documentName === "Item") {
      content = await this._renderItemTooltip(doc);
      classes.push("item-tooltip");
    } else {
      return;
    }

    if (!content) return;

    this.#tooltip.innerHTML = content;
    this.#tooltip.classList.remove("theme-dark");
    this.#tooltip.classList.add(...classes);

    const tooltipEl = game.tooltip?.element;
    const direction = tooltipEl?.dataset?.tooltipDirection ?? Dir.LEFT;
    requestAnimationFrame(() => this._positionItemTooltip(direction));
  }

  async _renderItemTooltip(doc) {
    const ctx = await this._buildItemContext(doc);
    if (!ctx) return null;
    return foundry.applications.handlebars.renderTemplate(
      `${MODULE_PATH}/templates/tooltip/item-tooltip.hbs`,
      ctx
    );
  }

  async _renderEffectTooltip(doc) {
    const ctx = await this._buildEffectContext(doc);
    if (!ctx) return null;
    return foundry.applications.handlebars.renderTemplate(
      `${MODULE_PATH}/templates/tooltip/effect-tooltip.hbs`,
      ctx
    );
  }

  async _buildItemContext(doc) {
    const sys = doc.system;
    const type = doc.type;
    const typeLabel = game.i18n.localize(CONFIG.Item.typeLabels[type] ?? type);

    let description = "";
    if (type === "ability") {
      const before = sys.effect?.before ?? "";
      const after = sys.effect?.after ?? "";
      const parts = [];
      if (before.trim()) parts.push(before);
      if (after.trim()) parts.push(after);
      description = parts.join("<hr>");
    } else {
      description = sys.description?.value ?? "";
    }

    let enriched = "";
    if (description) {
      try {
        enriched = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          description,
          { async: true, relativeTo: doc }
        );
      } catch {}
    }

    const ctx = {
      name: doc.name,
      img: doc.img,
      typeLabel,
      subtitle: typeLabel,
      description: enriched,
      pills: [],
      metadata: [],
      headerBadges: [],
      hasMetadata: false,
      hasPills: false,
      hasHeaderBadges: false,
    };

    const ds = globalThis.ds;

    if (type === "ability") {
      const cfg = ds?.CONFIG?.abilities;
      if (cfg?.keywords && sys.keywords?.size) {
        ctx.pills = Array.from(sys.keywords).map(
          (k) => cfg.keywords[k]?.label ?? k
        );
        ctx.hasPills = ctx.pills.length > 0;
      }
      if (cfg?.types?.[sys.type]) {
        ctx.metadata.push({
          label: game.i18n.localize("DRAW_STEEL.Item.ability.FIELDS.type.label") || "Type",
          value: cfg.types[sys.type].label,
        });
      }
      if (sys.formattedLabels) {
        const labels = sys.formattedLabels;
        if (labels.distance && labels.distance !== "—")
          ctx.metadata.push({
            label: game.i18n.localize("DRAW_STEEL.Item.ability.FIELDS.distance.label") || "Distance",
            value: labels.distance,
          });
        if (labels.target && labels.target !== "—")
          ctx.metadata.push({
            label: game.i18n.localize("DRAW_STEEL.Item.ability.FIELDS.target.label") || "Target",
            value: labels.target,
          });
        if (labels.keywords && labels.keywords !== "—")
          ctx.metadata.push({
            label: game.i18n.localize("DRAW_STEEL.Item.ability.FIELDS.keywords.label") || "Keywords",
            value: labels.keywords,
          });
      }
      if (sys.resource != null && sys.resource > 0) {
        ctx.headerBadges.push({
          label: game.i18n.localize("DRAW_STEEL.Item.ability.FIELDS.resource.label") || "Resource",
          value: String(sys.resource),
        });
      }
      ctx.hasHeaderBadges = ctx.headerBadges.length > 0;
      ctx.hasMetadata = ctx.metadata.length > 0;
    } else if (type === "kit") {
      const eq = sys.equipment;
      if (eq) {
        if (eq.armor != null && eq.armor !== "") {
          const armorLabel = ds?.CONFIG?.equipment?.armorCategories?.[eq.armor]?.label
            ?? ds?.CONFIG?.equipment?.armor?.[eq.armor]?.label
            ?? String(eq.armor).charAt(0).toUpperCase() + String(eq.armor).slice(1);
          ctx.metadata.push({
            label: game.i18n.localize("DRAW_STEEL.Item.kit.FIELDS.equipment.fields.armor.label") || "Armor",
            value: armorLabel,
          });
        }
        if (Array.isArray(eq.weapon) && eq.weapon.length) {
          const weaponLabels = eq.weapon.map((w) =>
            ds?.CONFIG?.equipment?.weaponCategories?.[w]?.label
            ?? ds?.CONFIG?.equipment?.weapon?.[w]?.label
            ?? String(w).charAt(0).toUpperCase() + String(w).slice(1)
          );
          ctx.metadata.push({
            label: game.i18n.localize("DRAW_STEEL.Item.kit.FIELDS.equipment.fields.weapon.label") || "Weapon",
            value: weaponLabels.join(", "),
          });
        } else if (typeof eq.weapon === "string" && eq.weapon) {
          const wl = ds?.CONFIG?.equipment?.weaponCategories?.[eq.weapon]?.label
            ?? ds?.CONFIG?.equipment?.weapon?.[eq.weapon]?.label
            ?? String(eq.weapon).charAt(0).toUpperCase() + String(eq.weapon).slice(1);
          ctx.metadata.push({
            label: game.i18n.localize("DRAW_STEEL.Item.kit.FIELDS.equipment.fields.weapon.label") || "Weapon",
            value: wl,
          });
        }
        if (eq.shield != null) {
          ctx.metadata.push({
            label: game.i18n.localize("DRAW_STEEL.Item.kit.FIELDS.equipment.fields.shield.label") || "Shield",
            value: eq.shield ? (game.i18n.localize("Yes") || "Yes") : (game.i18n.localize("No") || "No"),
          });
        }
      }
      const b = sys.bonuses;
      if (b) {
        if (b.stamina != null && b.stamina !== 0)
          ctx.metadata.push({ label: "Stamina", value: `+${b.stamina}` });
        if (b.speed != null && b.speed !== 0)
          ctx.metadata.push({ label: "Speed", value: `+${b.speed}` });
        if (b.stability != null && b.stability !== 0)
          ctx.metadata.push({ label: "Stability", value: `+${b.stability}` });
        if (b.disengage != null && b.disengage !== 0)
          ctx.metadata.push({ label: "Disengage", value: `+${b.disengage}` });
        const md = b.melee?.damage;
        if (md && (md.tier1 || md.tier2 || md.tier3)) {
          const vals = [md.tier1, md.tier2, md.tier3].filter((v) => v != null && v !== 0);
          if (vals.length) ctx.metadata.push({ label: "Melee", value: vals.join("/") });
        }
        if (b.melee?.distance != null && b.melee.distance !== 0)
          ctx.metadata.push({ label: "Melee Distance", value: `+${b.melee.distance}` });
        const rd = b.ranged?.damage;
        if (rd && (rd.tier1 || rd.tier2 || rd.tier3)) {
          const vals = [rd.tier1, rd.tier2, rd.tier3].filter((v) => v != null && v !== 0);
          if (vals.length) ctx.metadata.push({ label: "Ranged", value: vals.join("/") });
        }
        if (b.ranged?.distance != null && b.ranged.distance !== 0)
          ctx.metadata.push({ label: "Ranged Distance", value: `+${b.ranged.distance}` });
      }
      ctx.hasMetadata = ctx.metadata.length > 0;
    } else if (type === "treasure") {
      if (sys.kind) {
        const kindLabel = ds?.CONFIG?.equipment?.kinds?.[sys.kind]?.label ?? sys.kind;
        ctx.metadata.push({ label: "Kind", value: kindLabel });
      }
      if (sys.category) {
        const catLabel = ds?.CONFIG?.equipment?.categories?.[sys.category]?.label ?? sys.category;
        ctx.metadata.push({ label: "Category", value: catLabel });
      }
      if (sys.echelon != null)
        ctx.metadata.push({ label: "Echelon", value: String(sys.echelon) });
      if (sys.quantity != null && sys.quantity !== 1)
        ctx.metadata.push({ label: "Quantity", value: String(sys.quantity) });
      if (sys.keywords?.size) {
        const fmt = sys.formattedKeywords ?? "";
        ctx.pills = fmt ? fmt.split(/,\s*/).filter(Boolean) : [];
        ctx.hasPills = ctx.pills.length > 0;
      }
      ctx.hasMetadata = ctx.metadata.length > 0;
    } else if (type === "project") {
      const typeLabelProj = ds?.CONFIG?.projects?.types?.[sys.type]?.label ?? sys.type;
      ctx.metadata.push({ label: "Type", value: typeLabelProj });
      if (sys.goal != null)
        ctx.metadata.push({
          label: "Progress",
          value: `${sys.points ?? 0} / ${sys.goal}`,
        });
      if (sys.rollCharacteristic?.size) {
        const chrLabels = Array.from(sys.rollCharacteristic).map(
          (c) => ds?.CONFIG?.characteristics?.[c]?.label ?? c
        );
        ctx.metadata.push({
          label: "Roll",
          value: chrLabels.join(", "),
        });
      }
      ctx.hasMetadata = ctx.metadata.length > 0;
    } else if (type === "title") {
      if (sys.echelon != null)
        ctx.metadata.push({ label: "Echelon", value: String(sys.echelon) });
      if (sys.story?.trim()) ctx.subtitle = `${typeLabel} • ${sys.story}`;
      ctx.hasMetadata = ctx.metadata.length > 0;
    } else if (type === "class") {
      if (sys.level != null)
        ctx.metadata.push({ label: "Level", value: String(sys.level) });
      if (sys.primary) ctx.metadata.push({ label: "Primary", value: sys.primary });
      if (sys.stamina?.starting != null)
        ctx.metadata.push({ label: "Stamina", value: String(sys.stamina.starting) });
      if (sys.recoveries != null)
        ctx.metadata.push({ label: "Recoveries", value: String(sys.recoveries) });
      ctx.hasMetadata = ctx.metadata.length > 0;
    } else if (type === "career") {
      if (sys.projectPoints != null)
        ctx.metadata.push({ label: "Project Points", value: String(sys.projectPoints) });
      if (sys.renown != null)
        ctx.metadata.push({ label: "Renown", value: String(sys.renown) });
      if (sys.wealth != null)
        ctx.metadata.push({ label: "Wealth", value: String(sys.wealth) });
      ctx.hasMetadata = ctx.metadata.length > 0;
    } else if (type === "ancestryTrait") {
      if (sys.points != null) {
        ctx.headerBadges.push({ label: "Points", value: String(sys.points) });
        ctx.hasHeaderBadges = true;
      }
    } else if (type === "perk") {
      const ptLabel = ds?.CONFIG?.perks?.types?.[sys.perkType]?.label ?? sys.perkType;
      if (ptLabel) {
        ctx.metadata.push({ label: "Type", value: ptLabel });
        ctx.hasMetadata = true;
      }
    }

    return ctx;
  }

  async _buildEffectContext(doc) {
    const desc =
      doc.description?.value ??
      doc.system?.effect?.description ??
      doc.system?.description?.value ??
      "";
    let enriched = "";
    if (desc) {
      try {
        enriched = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          desc,
          { async: true, relativeTo: doc }
        );
      } catch {}
    }

    const props = [];
    if (doc.disabled) props.push(game.i18n.localize("EFFECT.StatusInactive"));
    else if (doc.isTemporary) props.push(game.i18n.localize("EFFECT.StatusTemporary"));
    else props.push(game.i18n.localize("EFFECT.StatusPassive"));

    const durationLabel = doc.duration?.remaining
      ? doc.duration.label ?? ""
      : "";

    return {
      name: doc.name,
      img: doc.img,
      description: enriched,
      properties: props,
      durationLabel,
      sourceName: doc.sourceName ?? "",
    };
  }

  _positionItemTooltip(direction) {
    if (!direction) {
      direction = Dir.LEFT;
      game.tooltip?._setAnchor?.(direction);
    }

    const pos = this.#tooltip.getBoundingClientRect();
    const dirs = Dir;
    const { innerHeight, innerWidth } = this.#tooltip.ownerDocument?.defaultView ?? window;

    switch (direction) {
      case dirs.UP:
        if (pos.y - TOOLTIP_MARGIN_PX <= 0) direction = dirs.DOWN;
        break;
      case dirs.DOWN:
        if (pos.y + this.#tooltip.offsetHeight > innerHeight) direction = dirs.UP;
        break;
      case dirs.LEFT:
        if (pos.x - TOOLTIP_MARGIN_PX <= 0) direction = dirs.RIGHT;
        break;
      case dirs.RIGHT:
        if (pos.x + this.#tooltip.offsetWidth > innerWidth) direction = dirs.LEFT;
        break;
    }

    game.tooltip?._setAnchor?.(direction);

    if (this.#tooltip.classList.contains("item-tooltip")) {
      const description = this.#tooltip.querySelector(".description");
      if (description) {
        description.classList.toggle(
          "overflowing",
          description.clientHeight < description.scrollHeight
        );
      }
    }
  }

  static activateListeners() {
    document.addEventListener(
      "pointerdown",
      (event) => {
        if (
          event.button === 1 &&
          event.target.closest(".locked-tooltip")
        ) {
          event.preventDefault();
        }
      },
      { capture: true }
    );
  }
}
