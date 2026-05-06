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
    const header = await this._buildItemHeader(doc);
    if (!header) return null;
    const supplemental = await this._buildSupplemental(doc);
    const body = await this._renderItemBody(doc);

    return {
      ...header,
      supplemental,
      bodyHtml: body?.html ?? null,
      bodyIsEmbed: body?.kind === "embed",
      bodyIsFallback: body?.kind === "fallback",
      hasBody: !!body?.html,
      hasSupplemental: !!(supplemental?.description || supplemental?.reactiveLabel),
      hintPin: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.hintPin"),
      hintUnpin: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.hintUnpin"),
    };
  }

  async _buildItemHeader(doc) {
    const sys = doc.system ?? {};
    const type = doc.type;
    const typeLabel = game.i18n.localize(CONFIG.Item.typeLabels?.[type] ?? type);

    const cardContext = {};
    try {
      if (typeof sys.getSheetContext === "function") {
        await sys.getSheetContext(cardContext);
      }
    } catch (err) {
      console.warn(`${MODULE_ID} | getSheetContext threw, continuing with partial header`, err);
    }

    const ds = globalThis.ds;
    const ctx = {
      name: doc.name,
      img: doc.img,
      typeLabel,
      subtitle: typeLabel,
      costBadge: null,
      quickFacts: [],
      pills: [],
    };

    if (type === "ability") {
      if (sys.resource != null && sys.resource > 0) {
        const resourceName = doc.parent?.system?.coreResource?.name
          ?? cardContext.resourceName
          ?? game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.resource");
        ctx.costBadge = {
          label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.resource"),
          value: `${sys.resource} ${resourceName}`,
        };
      }

      const cfg = ds?.CONFIG?.abilities;
      if (cfg?.types?.[sys.type]?.label) {
        ctx.subtitle = `${typeLabel} • ${cfg.types[sys.type].label}`;
      }

      const labels = sys.formattedLabels ?? {};
      if (labels.distance && labels.distance !== "—") {
        ctx.quickFacts.push({
          label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.distance"),
          value: labels.distance,
        });
      }
      if (labels.target && labels.target !== "—") {
        ctx.quickFacts.push({
          label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.target"),
          value: labels.target,
        });
      }

      const triggerText = sys.trigger?.trim?.();
      const isTriggeredAction = cfg?.types?.[sys.type]?.triggered;
      if (triggerText && isTriggeredAction) {
        ctx.quickFacts.push({
          label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.trigger"),
          value: triggerText,
        });
      }

      if (cfg?.keywords && sys.keywords?.size) {
        ctx.pills = Array.from(sys.keywords).map(
          (k) => cfg.keywords[k]?.label ?? k
        );
      }
    } else if (type === "kit") {
      const eq = sys.equipment;
      if (eq) {
        if (eq.armor) {
          const armorLabel = ds?.CONFIG?.equipment?.armorCategories?.[eq.armor]?.label
            ?? ds?.CONFIG?.equipment?.armor?.[eq.armor]?.label
            ?? this._capitalize(eq.armor);
          ctx.quickFacts.push({
            label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.armorCategory"),
            value: armorLabel,
          });
        }
        const weapons = this._coerceArray(eq.weapon);
        if (weapons.length) {
          const weaponLabels = weapons.map((w) =>
            ds?.CONFIG?.equipment?.weaponCategories?.[w]?.label
            ?? ds?.CONFIG?.equipment?.weapon?.[w]?.label
            ?? this._capitalize(w)
          );
          ctx.quickFacts.push({
            label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.weaponCategory"),
            value: weaponLabels.join(", "),
          });
        }
      }
    } else if (type === "treasure") {
      if (sys.kind) {
        const kindLabel = ds?.CONFIG?.equipment?.kinds?.[sys.kind]?.label ?? sys.kind;
        ctx.quickFacts.push({
          label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.kind"),
          value: kindLabel,
        });
      }
      if (sys.echelon != null) {
        ctx.quickFacts.push({
          label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.echelon"),
          value: String(sys.echelon),
        });
      }
      if (sys.keywords?.size) {
        const fmt = sys.formattedKeywords ?? "";
        ctx.pills = fmt ? fmt.split(/,\s*/).filter(Boolean) : [];
      }
    } else if (type === "project") {
      const typeLabelProj = ds?.CONFIG?.projects?.types?.[sys.type]?.label ?? sys.type;
      if (typeLabelProj) {
        ctx.quickFacts.push({
          label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.type"),
          value: typeLabelProj,
        });
      }
      if (sys.goal != null) {
        ctx.quickFacts.push({
          label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.progress"),
          value: `${sys.points ?? 0} / ${sys.goal}`,
        });
      }
    } else if (type === "ancestryTrait") {
      if (sys.points != null) {
        ctx.costBadge = {
          label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.points"),
          value: String(sys.points),
        };
      }
    } else if (type === "perk") {
      const ptLabel = ds?.CONFIG?.perks?.types?.[sys.perkType]?.label ?? sys.perkType;
      if (ptLabel) {
        ctx.quickFacts.push({
          label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.type"),
          value: ptLabel,
        });
      }
    } else if (type === "title") {
      if (sys.echelon != null) {
        ctx.quickFacts.push({
          label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.echelon"),
          value: String(sys.echelon),
        });
      }
    } else if (type === "class") {
      if (sys.primary) {
        ctx.quickFacts.push({
          label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.primary"),
          value: sys.primary,
        });
      }
    } else if (type === "career") {
      if (sys.renown != null) {
        ctx.quickFacts.push({
          label: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.renown"),
          value: String(sys.renown),
        });
      }
    }

    ctx.hasCostBadge = !!ctx.costBadge;
    ctx.hasQuickFacts = ctx.quickFacts.length > 0;
    ctx.hasPills = ctx.pills.length > 0;

    return ctx;
  }

  async _buildSupplemental(doc) {
    const supplemental = { description: null, reactiveLabel: null };
    if (doc.type !== "ability") return supplemental;

    const sys = doc.system ?? {};
    const descRaw = sys.description?.value?.trim?.();
    if (descRaw) {
      try {
        supplemental.description = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
          descRaw,
          { async: true, relativeTo: doc }
        );
      } catch (err) {
        console.warn(`${MODULE_ID} | Failed to enrich ability description`, err);
        supplemental.description = descRaw;
      }
    }

    if (sys.power?.roll?.reactive && sys.power?.effects?.size) {
      const localized = game.i18n.localize("DRAW_STEEL.ROLL.Power.Label");
      supplemental.reactiveLabel = (localized && !localized.startsWith("DRAW_STEEL."))
        ? localized
        : game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.powerRoll");
    }

    supplemental.descriptionLabel = game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.description");
    return supplemental;
  }

  async _renderItemBody(doc) {
    const sys = doc.system;
    if (typeof sys?.toEmbed === "function") {
      try {
        const el = await sys.toEmbed(
          { includeName: false, includeProjectInfo: true },
          { relativeTo: doc }
        );
        if (el) return { html: el.outerHTML, kind: "embed" };
      } catch (err) {
        console.warn(`${MODULE_ID} | toEmbed failed for ${doc.uuid}, using fallback`, err);
      }
    }

    const fallback = await this._buildFallbackBody(doc);
    return fallback ? { html: fallback, kind: "fallback" } : null;
  }

  async _buildFallbackBody(doc) {
    const sys = doc.system ?? {};
    const parts = [];
    const descValue = sys.description?.value;
    if (descValue && doc.type !== "ability") parts.push(descValue);
    if (sys.story) parts.push(`<p><em>${sys.story}</em></p>`);
    if (sys.effect?.before) parts.push(sys.effect.before);
    if (sys.effect?.after) parts.push(sys.effect.after);
    if (sys.spend?.text) parts.push(`<p>${sys.spend.text}</p>`);

    const raw = parts.filter((s) => typeof s === "string" && s.trim()).join("<hr>");
    if (!raw) return "";
    try {
      return await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        raw,
        { async: true, relativeTo: doc }
      );
    } catch (err) {
      console.warn(`${MODULE_ID} | Failed to enrich fallback body`, err);
      return raw;
    }
  }

  _coerceArray(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (value instanceof Set) return Array.from(value);
    if (typeof value === "string" && value) return [value];
    if (value != null && typeof value[Symbol?.iterator] === "function")
      return [...value].filter(Boolean);
    return [];
  }

  _capitalize(s) {
    const str = String(s ?? "");
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  async _buildEffectContext(doc) {
    let bodyHtml = "";
    let bodyKind = null;

    if (typeof doc.system?.toEmbed === "function") {
      try {
        const el = await doc.system.toEmbed({}, { relativeTo: doc });
        if (el) {
          bodyHtml = el.outerHTML;
          bodyKind = "embed";
        }
      } catch (err) {
        console.warn(`${MODULE_ID} | Effect toEmbed failed, falling back`, err);
      }
    }

    if (!bodyHtml) {
      const desc = (typeof doc.description === "string" ? doc.description : doc.description?.value) ?? "";
      if (desc) {
        try {
          bodyHtml = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
            desc,
            { async: true, relativeTo: doc }
          );
          bodyKind = "fallback";
        } catch (err) {
          console.warn(`${MODULE_ID} | Failed to enrich effect tooltip description`, err);
        }
      }
    }

    const properties = [];
    for (const status of (doc.statuses ?? [])) {
      const conditionCfg = globalThis.ds?.CONFIG?.conditions?.[status];
      if (conditionCfg?.name) properties.push(game.i18n.localize(conditionCfg.name));
    }

    const durationLabel = doc.system?.durationLabel ?? doc.duration?.label ?? "";

    let originName = "";
    if (doc.origin) {
      try {
        const origin = fromUuidSync(doc.origin);
        originName = origin?.name ?? "";
      } catch (err) {
        originName = "";
      }
    }
    if (!originName) originName = doc.sourceName ?? "";

    return {
      name: doc.name,
      img: doc.img,
      bodyHtml,
      bodyIsEmbed: bodyKind === "embed",
      bodyIsFallback: bodyKind === "fallback",
      hasBody: !!bodyHtml,
      properties,
      durationLabel,
      originName,
      appliedByLabel: game.i18n.localize("DRAW_STEEL_PLUS.Tooltip.appliedBy"),
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

    const scrollable = this.#tooltip.querySelector(".embed-body, .draw-steel, .embed-fallback");
    if (scrollable) {
      scrollable.classList.toggle(
        "overflowing",
        scrollable.clientHeight < scrollable.scrollHeight
      );
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
