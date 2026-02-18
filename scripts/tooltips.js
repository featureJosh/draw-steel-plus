import { MODULE_CONFIG } from "./config.js";

const MODULE_ID = MODULE_CONFIG.id;
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
    } catch (err) {
      console.warn(`${MODULE_ID} | Failed to resolve UUID for tooltip: ${uuid}`, err);
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
    let abilityDetails = null;
    if (type === "ability") {
      let cardContext = {};
      const actor = doc.parent;
      const rollData = actor?.getRollData?.();
      const canEvaluateFormulas = !!rollData && (actor?.type !== "npc" || rollData.class != null);
      if (canEvaluateFormulas) {
        try {
          if (typeof sys.getSheetContext === "function") {
            await sys.getSheetContext(cardContext);
          }
        } catch (err) {
          console.warn(`${MODULE_ID} | Failed to get sheet context for tooltip`, err);
        }
      }
      const hasPowerRolls = cardContext.powerRolls && cardContext.powerRollEffects;
      if (hasPowerRolls || cardContext.enrichedBeforeEffect || cardContext.enrichedAfterEffect || sys.story) {
        let flavor = "";
        if (sys.story?.trim()) {
          try {
            flavor = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
              sys.story.trim(),
              { async: true, relativeTo: doc }
            );
          } catch (err) {
            console.warn(`${MODULE_ID} | Failed to enrich tooltip flavor text`, err);
          }
        }
        const powerRollLine = hasPowerRolls && !sys.power?.roll?.reactive && cardContext.powerRollBonus
          ? game.i18n.format("DRAW_STEEL.ROLL.Power.RollPlusBonus", { bonus: cardContext.powerRollBonus })
          : null;
        let powerRollTiers = [];
        if (hasPowerRolls) {
          try {
            const toStr = (v) => {
              if (v == null) return "";
              if (typeof v === "string") return v;
              if (typeof v === "number" || typeof v === "boolean") return String(v);
              const str = v?.value ?? v?.html ?? v?.text ?? v?.content ?? (typeof v?.innerHTML === "string" ? v.innerHTML : null);
              if (typeof str === "string" && str) return str;
              return "";
            };
            const tierLabels = ["!", "@", "#"];
            let t1 = toStr(cardContext.powerRollEffects?.tier1);
            let t2 = toStr(cardContext.powerRollEffects?.tier2);
            let t3 = toStr(cardContext.powerRollEffects?.tier3);
            if (!t1 && !t2 && !t3 && canEvaluateFormulas && typeof sys?.powerRollText === "function") {
              t1 = toStr(await sys.powerRollText.call(sys, 1));
              t2 = toStr(await sys.powerRollText.call(sys, 2));
              t3 = toStr(await sys.powerRollText.call(sys, 3));
            }
            powerRollTiers = [
              { label: tierLabels[0], effect: t1, tierNum: 1 },
              { label: tierLabels[1], effect: t2, tierNum: 2 },
              { label: tierLabels[2], effect: t3, tierNum: 3 },
            ].filter((t) => t.effect);
          } catch (err) {
            console.warn(`${MODULE_ID} | Failed to parse power roll tiers for tooltip`, err);
          }
        }
        const hasContent = flavor || powerRollLine || powerRollTiers.length ||
          cardContext.enrichedBeforeEffect || cardContext.enrichedAfterEffect;
        if (hasContent) {
          abilityDetails = {
            flavor: flavor || null,
            powerRollLine,
            powerRollTiers,
            hasPowerResult: !!(powerRollLine || powerRollTiers.length),
            beforeEffect: cardContext.enrichedBeforeEffect || null,
            afterEffect: cardContext.enrichedAfterEffect || null,
          };
          description = "";
        } else {
          const before = sys.effect?.before ?? "";
          const after = sys.effect?.after ?? "";
          const parts = [];
          if (before.trim()) parts.push(before);
          if (after.trim()) parts.push(after);
          description = parts.join("<hr>");
        }
      } else {
        const before = sys.effect?.before ?? "";
        const after = sys.effect?.after ?? "";
        const parts = [];
        if (before.trim()) parts.push(before);
        if (after.trim()) parts.push(after);
        description = parts.join("<hr>");
      }
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
      } catch (err) {
        console.warn(`${MODULE_ID} | Failed to enrich item tooltip description`, err);
      }
    }

    const ctx = {
      name: doc.name,
      img: doc.img,
      typeLabel,
      subtitle: typeLabel,
      description: enriched,
      abilityDetails,
      effectLabel: (() => {
        const t = game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.effect");
        return (t && !t.startsWith("DRAW_STEEL_PLUS.")) ? t : "Effect";
      })(),
      pills: [],
      metadata: [],
      headerBadges: [],
      hasMetadata: false,
      hasPills: false,
      hasHeaderBadges: false,
      hintPin: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.hintPin"),
      hintUnpin: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.hintUnpin"),
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
          label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.type"),
          value: cfg.types[sys.type].label,
        });
      }
      if (sys.formattedLabels) {
        const labels = sys.formattedLabels;
        if (labels.distance && labels.distance !== "—")
          ctx.metadata.push({
            label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.distance"),
            value: labels.distance,
          });
        if (labels.target && labels.target !== "—")
          ctx.metadata.push({
            label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.target"),
            value: labels.target,
          });
        if (labels.keywords && labels.keywords !== "—")
          ctx.metadata.push({
            label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.keywords"),
            value: labels.keywords,
          });
      }
      const triggerText = sys.trigger?.trim?.();
      const isTriggeredAction = cfg?.types?.[sys.type]?.triggered;
      if (triggerText && isTriggeredAction) {
        ctx.metadata.push({
          label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.trigger"),
          value: triggerText,
        });
      }
      if (sys.resource != null && sys.resource > 0) {
        ctx.headerBadges.push({
          label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.resource"),
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
          ctx.metadata.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.armorCategory"), value: armorLabel });
        }
        let weapons = [];
        if (Array.isArray(eq.weapon)) weapons = eq.weapon.filter(Boolean);
        else if (eq.weapon instanceof Set) weapons = Array.from(eq.weapon);
        else if (typeof eq.weapon === "string" && eq.weapon) weapons = [eq.weapon];
        else if (eq.weapon != null && typeof eq.weapon[Symbol?.iterator] === "function")
          weapons = [...eq.weapon].filter(Boolean);
        if (weapons.length) {
          const weaponLabels = weapons.map((w) =>
            ds?.CONFIG?.equipment?.weaponCategories?.[w]?.label
            ?? ds?.CONFIG?.equipment?.weapon?.[w]?.label
            ?? String(w).charAt(0).toUpperCase() + String(w).slice(1)
          );
          ctx.metadata.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.weaponCategory"), value: weaponLabels.join(", ") });
        }
        if (eq.shield != null) {
          ctx.metadata.push({
            label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.hasShield"),
            value: eq.shield ? game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.yes") : game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.no"),
          });
        }
      }
      const b = sys.bonuses;
      if (b) {
        if (b.stamina != null && b.stamina !== 0)
          ctx.metadata.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.stamina"), value: `+${b.stamina}` });
        if (b.speed != null && b.speed !== 0)
          ctx.metadata.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.speed"), value: `+${b.speed}` });
        if (b.stability != null && b.stability !== 0)
          ctx.metadata.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.stability"), value: `+${b.stability}` });
        if (b.disengage != null && b.disengage !== 0)
          ctx.metadata.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.disengage"), value: `+${b.disengage}` });
        const md = b.melee?.damage;
        if (md && (md.tier1 || md.tier2 || md.tier3)) {
          const vals = [md.tier1, md.tier2, md.tier3].filter((v) => v != null && v !== 0);
          if (vals.length) ctx.metadata.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.melee"), value: vals.join("/") });
        }
        if (b.melee?.distance != null && b.melee.distance !== 0)
          ctx.metadata.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.meleeDistance"), value: `+${b.melee.distance}` });
        const rd = b.ranged?.damage;
        if (rd && (rd.tier1 || rd.tier2 || rd.tier3)) {
          const vals = [rd.tier1, rd.tier2, rd.tier3].filter((v) => v != null && v !== 0);
          if (vals.length) ctx.metadata.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.ranged"), value: vals.join("/") });
        }
        if (b.ranged?.distance != null && b.ranged.distance !== 0)
          ctx.metadata.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.rangedDistance"), value: `+${b.ranged.distance}` });
      }
      ctx.hasMetadata = ctx.metadata.length > 0;
    } else if (type === "treasure") {
      if (sys.kind) {
        const kindLabel = ds?.CONFIG?.equipment?.kinds?.[sys.kind]?.label ?? sys.kind;
        ctx.metadata.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.kind"), value: kindLabel });
      }
      if (sys.category) {
        const catLabel = ds?.CONFIG?.equipment?.categories?.[sys.category]?.label ?? sys.category;
        ctx.metadata.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.category"), value: catLabel });
      }
      if (sys.echelon != null)
        ctx.metadata.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.echelon"), value: String(sys.echelon) });
      if (sys.quantity != null && sys.quantity !== 1)
        ctx.metadata.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.quantity"), value: String(sys.quantity) });
      if (sys.keywords?.size) {
        const fmt = sys.formattedKeywords ?? "";
        ctx.pills = fmt ? fmt.split(/,\s*/).filter(Boolean) : [];
        ctx.hasPills = ctx.pills.length > 0;
      }
      ctx.hasMetadata = ctx.metadata.length > 0;
    } else if (type === "project") {
      const typeLabelProj = ds?.CONFIG?.projects?.types?.[sys.type]?.label ?? sys.type;
      ctx.metadata.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.type"), value: typeLabelProj });
      if (sys.goal != null)
        ctx.metadata.push({
          label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.progress"),
          value: `${sys.points ?? 0} / ${sys.goal}`,
        });
      if (sys.rollCharacteristic?.size) {
        const chrLabels = Array.from(sys.rollCharacteristic).map(
          (c) => ds?.CONFIG?.characteristics?.[c]?.label ?? c
        );
        ctx.metadata.push({
          label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.roll"),
          value: chrLabels.join(", "),
        });
      }
      ctx.hasMetadata = ctx.metadata.length > 0;
    } else if (type === "title") {
      if (sys.echelon != null)
        ctx.metadata.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.echelon"), value: String(sys.echelon) });
      if (sys.story?.trim()) ctx.subtitle = `${typeLabel} • ${sys.story}`;
      ctx.hasMetadata = ctx.metadata.length > 0;
    } else if (type === "class") {
      if (sys.level != null)
        ctx.metadata.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.level"), value: String(sys.level) });
      if (sys.primary) ctx.metadata.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.primary"), value: sys.primary });
      if (sys.stamina?.starting != null)
        ctx.metadata.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.stamina"), value: String(sys.stamina.starting) });
      if (sys.recoveries != null)
        ctx.metadata.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.recoveries"), value: String(sys.recoveries) });
      ctx.hasMetadata = ctx.metadata.length > 0;
    } else if (type === "career") {
      if (sys.projectPoints != null)
        ctx.metadata.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.projectPoints"), value: String(sys.projectPoints) });
      if (sys.renown != null)
        ctx.metadata.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.renown"), value: String(sys.renown) });
      if (sys.wealth != null)
        ctx.metadata.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.wealth"), value: String(sys.wealth) });
      ctx.hasMetadata = ctx.metadata.length > 0;
    } else if (type === "ancestryTrait") {
      if (sys.points != null) {
        ctx.headerBadges.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.points"), value: String(sys.points) });
        ctx.hasHeaderBadges = true;
      }
    } else if (type === "perk") {
      const ptLabel = ds?.CONFIG?.perks?.types?.[sys.perkType]?.label ?? sys.perkType;
      if (ptLabel) {
        ctx.metadata.push({ label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.type"), value: ptLabel });
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
      } catch (err) {
        console.warn(`${MODULE_ID} | Failed to enrich effect tooltip description`, err);
      }
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
      hintPin: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.hintPin"),
      hintUnpin: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.hintUnpin"),
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
      const scrollable = this.#tooltip.querySelector(".description, .ability-details");
      if (scrollable) {
        scrollable.classList.toggle(
          "overflowing",
          scrollable.clientHeight < scrollable.scrollHeight
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
