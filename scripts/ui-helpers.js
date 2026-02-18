import { MODULE_CONFIG, FLOATING_TAB_ICONS, SHEET_SIZE_DEFAULTS } from "./config.js";

const MODULE_ID = MODULE_CONFIG.id;

export function applyItemTooltips(element) {
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
const _itemListCollapseState = new WeakMap();

export function setupItemListCollapse(element) {
  let stateMap = _itemListCollapseState.get(element);
  if (!stateMap) {
    stateMap = {};
    _itemListCollapseState.set(element, stateMap);
  }

  const seenKeys = {};
  element.querySelectorAll(".item-list-container").forEach((container) => {
    const header = container.querySelector(":scope > .item-header");
    const list = container.querySelector(":scope > .item-list");
    if (!header || !list) return;

    const labelEl = header.querySelector(".item-column.item-name");
    const baseKey = labelEl?.textContent?.trim() || "";
    const key = baseKey in seenKeys ? `${baseKey}-${++seenKeys[baseKey]}` : (seenKeys[baseKey] = 1, baseKey);

    if (stateMap[key]) container.classList.add("dsp-collapsed");

    header.style.cursor = "pointer";
    header.addEventListener("click", (e) => {
      if (e.target.closest("a, button, input, select")) return;
      const willExpand = container.classList.contains("dsp-collapsed");
      if (willExpand) {
        container.classList.remove("dsp-collapsed");
        const h = list.scrollHeight;
        list.style.maxHeight = `${h}px`;
        container.classList.add("dsp-collapsed");
        list.style.maxHeight = "";
        void list.offsetHeight;
        list.style.maxHeight = `${h}px`;
        container.classList.remove("dsp-collapsed");
        list.addEventListener("transitionend", () => {
          list.style.maxHeight = "";
        }, { once: true });
      } else {
        container.classList.add("dsp-collapsed");
      }
      stateMap[key] = container.classList.contains("dsp-collapsed");
    });
  });
}

export function setupSidebarCollapse(element) {
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

export function applyParallaxHeader(element) {
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

export function applyStaminaPortraitTint(element, actor) {
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
    const saturate = (1 - tint).toFixed(3);
    img.style.filter = `saturate(${saturate})`;
  } else {
    img.style.filter = "";
  }
}

export function applyHeaderArt(element, sheetType) {
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

export function applyFloatingTabs(sheet) {
  const enabled = game.settings.get(MODULE_ID, "floatingNavTabs");
  const element = sheet.element;

  if (!enabled) {
    const existing = element.querySelector(".dsp-floating-tabs");
    if (existing) existing.remove();
    element.classList.remove("dsp-has-floating-tabs");
    return;
  }

  const originalNav = element.querySelector("nav.sheet-tabs");
  if (!originalNav) return;

  element.classList.add("dsp-has-floating-tabs");

  const tabLinks = originalNav.querySelectorAll("a[data-tab]");
  if (!tabLinks.length) return;

  const existingFloating = element.querySelector(".dsp-floating-tabs");
  if (existingFloating) {
    tabLinks.forEach((link) => {
      const tab = existingFloating.querySelector(`[data-tab="${link.dataset.tab}"]`);
      if (tab) tab.classList.toggle("active", link.classList.contains("active"));
    });
    return;
  }

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

export function setupScrollbarAutoHide(element) {
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

export function applyMinSize(element, sizeConfig) {
  if (sizeConfig.minWidth) element.style.minWidth = `${sizeConfig.minWidth}px`;
  if (sizeConfig.minHeight) element.style.minHeight = `${sizeConfig.minHeight}px`;
}

export function processSidebarTags(element) {
  element.querySelectorAll('.sidebar-tags[data-tag-type]').forEach((container) => {
    if (container.querySelector('.sidebar-tag, .sidebar-tag-none')) return;

    const text = container.textContent.trim();
    if (!text) return;

    const items = text.split(/,\s*(?:and\s+)?/).map(s => s.trim()).filter(Boolean);
    const tags = [];

    if (items.length === 0 || (items.length === 1 && items[0].toLowerCase() === 'none')) {
      const tag = document.createElement('span');
      tag.className = 'sidebar-tag sidebar-tag-none';
      tag.textContent = 'None';
      tags.push(tag);
    } else {
      items.forEach(item => {
        const tag = document.createElement('span');
        tag.className = 'sidebar-tag';
        tag.textContent = item;
        tags.push(tag);
      });
    }
    container.replaceChildren(...tags);
  });

  const skillsContainer = element.querySelector('.sidebar-skills');
  if (skillsContainer && !skillsContainer.querySelector('.ds-tag, .sidebar-tag')) {
    const text = skillsContainer.textContent.trim();
    if (text) {
      const items = text.split(/,\s*(?:and\s+)?/).map(s => s.trim()).filter(Boolean);
      const tags = items.map(item => {
        const tag = document.createElement('span');
        tag.className = 'sidebar-tag';
        tag.textContent = item;
        return tag;
      });
      skillsContainer.replaceChildren(...tags);
    }
  }
}
