import { MODULE_CONFIG } from "../config.js";
import { GridOverlay } from "./grid-overlay.js";
import {
  pickClosestAnchor,
  quantizeToGrid,
  resolveAnchor,
  getGridSize,
  snapPosition,
} from "./position.js";

const MODULE_ID = MODULE_CONFIG.id;

export class FloatingUIManager {
  static _instances = new Set();
  static _resizeBound = null;
  static _linkSource = null;
  static _linkClickHandler = null;
  static _linkEscHandler = null;
  static _drag = null;
  static _moveHandler = null;
  static _upHandler = null;
  static _keyHandler = null;

  static register(ui) {
    this._instances.add(ui);
    this._ensureResizeListener();
    this._syncGroupClass(ui);
  }

  static unregister(ui) {
    this._instances.delete(ui);
    if (this._linkSource === ui) this.exitLinkMode();
  }

  static all() {
    return Array.from(this._instances);
  }

  static findById(id) {
    for (const ui of this._instances) if (ui.id === id) return ui;
    return null;
  }

  static _ensureResizeListener() {
    if (this._resizeBound) return;
    this._resizeBound = foundry.utils.debounce(() => {
      for (const ui of this._instances) {
        try { ui.reflow(); } catch (e) { console.error(`${MODULE_ID} | reflow failed`, e); }
      }
    }, 100);
    window.addEventListener("resize", this._resizeBound);
  }

  static _syncGroupClass(ui) {
    if (!ui.element) return;
    const groupId = ui.getGroupId?.();
    ui.element.classList.toggle("dsp-fui-grouped", !!groupId);
    if (groupId) ui.element.dataset.dspGroup = groupId;
    else delete ui.element.dataset.dspGroup;
  }

  static _readGroup(groupId) {
    if (!groupId) return [];
    return game.user.getFlag(MODULE_ID, `groups.${groupId}`) ?? [];
  }

  static async _writeGroup(groupId, ids) {
    if (!groupId) return;
    if (!ids || ids.length === 0) {
      await game.user.unsetFlag(MODULE_ID, `groups.${groupId}`);
    } else {
      await game.user.setFlag(MODULE_ID, `groups.${groupId}`, ids);
    }
  }

  static getGroupMembers(ui) {
    const groupId = ui.getGroupId?.();
    if (!groupId) return [ui];
    const ids = this._readGroup(groupId);
    const members = Array.from(this._instances).filter(u => ids.includes(u.id));
    if (!members.includes(ui)) members.push(ui);
    return members;
  }

  static async linkUIs(a, b) {
    if (!a || !b || a === b) return;
    const groupA = a.getGroupId();
    const groupB = b.getGroupId();

    let groupId;
    let members;

    if (groupA && groupB && groupA !== groupB) {
      const idsA = this._readGroup(groupA);
      const idsB = this._readGroup(groupB);
      groupId = groupA;
      members = Array.from(new Set([...idsA, ...idsB, a.id, b.id]));
      for (const id of idsB) {
        const ui = this.findById(id);
        if (ui) await ui.setGroupId(groupA);
      }
      await this._writeGroup(groupB, null);
    } else if (groupA) {
      groupId = groupA;
      const ids = this._readGroup(groupA);
      members = Array.from(new Set([...ids, a.id, b.id]));
      await b.setGroupId(groupA);
    } else if (groupB) {
      groupId = groupB;
      const ids = this._readGroup(groupB);
      members = Array.from(new Set([...ids, a.id, b.id]));
      await a.setGroupId(groupB);
    } else {
      groupId = `g_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4).toString(36)}`;
      members = [a.id, b.id];
      await a.setGroupId(groupId);
      await b.setGroupId(groupId);
    }

    await this._writeGroup(groupId, members);
    for (const id of members) {
      const ui = this.findById(id);
      if (ui) this._syncGroupClass(ui);
    }
  }

  static async unlinkUI(ui) {
    const groupId = ui.getGroupId();
    if (!groupId) return;
    const ids = this._readGroup(groupId).filter(id => id !== ui.id);
    await ui.setGroupId(null);
    this._syncGroupClass(ui);

    if (ids.length <= 1) {
      for (const id of ids) {
        const other = this.findById(id);
        if (other) {
          await other.setGroupId(null);
          this._syncGroupClass(other);
        }
      }
      await this._writeGroup(groupId, null);
    } else {
      await this._writeGroup(groupId, ids);
      for (const id of ids) {
        const other = this.findById(id);
        if (other) this._syncGroupClass(other);
      }
    }
  }

  static enterLinkMode(sourceUI) {
    if (this._linkSource) this.exitLinkMode();
    this._linkSource = sourceUI;
    document.body.classList.add("dsp-fui-link-mode");
    sourceUI.element?.classList.add("dsp-fui-link-source");

    this._linkClickHandler = async (e) => {
      const targetEl = e.target.closest(".dsp-floating-ui");
      if (!targetEl) {
        if (!e.target.closest(".dsp-fui-link-mode-hint")) {
          this.exitLinkMode();
        }
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (targetEl === sourceUI.element) {
        this.exitLinkMode();
        return;
      }
      const target = Array.from(this._instances).find(u => u.element === targetEl);
      if (!target) {
        this.exitLinkMode();
        return;
      }
      await this.linkUIs(sourceUI, target);
      this.exitLinkMode();
      sourceUI.render?.();
      target.render?.();
    };

    this._linkEscHandler = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        this.exitLinkMode();
      }
    };

    document.addEventListener("click", this._linkClickHandler, true);
    document.addEventListener("keydown", this._linkEscHandler, true);
  }

  static exitLinkMode() {
    if (!this._linkSource) return;
    document.body.classList.remove("dsp-fui-link-mode");
    this._linkSource.element?.classList.remove("dsp-fui-link-source");
    if (this._linkClickHandler) document.removeEventListener("click", this._linkClickHandler, true);
    if (this._linkEscHandler) document.removeEventListener("keydown", this._linkEscHandler, true);
    this._linkSource = null;
    this._linkClickHandler = null;
    this._linkEscHandler = null;
  }

  static startDrag(ui, event) {
    if (!ui || !ui.element) return;
    if (event.button !== 0) return;
    if (ui.isLocked?.()) return;
    if (this._linkSource) return;

    event.preventDefault();

    const members = this.getGroupMembers(ui);
    const membersData = members.map(m => {
      const rect = m.element.getBoundingClientRect();
      return {
        ui: m,
        startLeft: rect.left,
        startTop: rect.top,
        width: rect.width,
        height: rect.height,
      };
    });

    this._drag = {
      startX: event.clientX,
      startY: event.clientY,
      primary: ui,
      members: membersData,
      pendingPos: null,
      pendingSnapped: null,
    };

    document.body.classList.add("dsp-fui-dragging");
    ui.element.classList.add("dsp-fui-drag-active");
    GridOverlay.mount();

    this._moveHandler = (e) => this._onDrag(e);
    this._upHandler = (e) => this._onDrop(e);
    window.addEventListener("mousemove", this._moveHandler);
    window.addEventListener("mouseup", this._upHandler);
  }

  static _onDrag(e) {
    if (!this._drag) return;
    const dx = e.clientX - this._drag.startX;
    const dy = e.clientY - this._drag.startY;
    const freeSnap = e.shiftKey;
    const forceCenter = e.altKey;

    for (const m of this._drag.members) {
      m.ui.element.style.left = `${m.startLeft + dx}px`;
      m.ui.element.style.top = `${m.startTop + dy}px`;
    }

    const primary = this._drag.members.find(m => m.ui === this._drag.primary);
    const left = primary.startLeft + dx;
    const top = primary.startTop + dy;

    let pos;
    if (forceCenter) {
      pos = { anchor: "cc", offsetX: 0, offsetY: 0, snap: freeSnap ? "free" : "grid" };
    } else {
      pos = pickClosestAnchor({ left, top }, primary.width, primary.height);
      if (freeSnap) {
        pos.snap = "free";
      } else {
        const grid = getGridSize();
        pos.offsetX = quantizeToGrid(pos.offsetX, grid);
        pos.offsetY = quantizeToGrid(pos.offsetY, grid);
        pos.snap = "grid";
      }
    }

    const snapped = resolveAnchor(pos, null, { width: primary.width, height: primary.height });
    GridOverlay.updateZone(pos.anchor);
    GridOverlay.updatePreview(snapped.left, snapped.top, primary.width, primary.height);

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const centerX = snapped.left + primary.width / 2;
    const centerY = snapped.top + primary.height / 2;
    const tol = Math.max(getGridSize() / 2, 3);
    const onVCenter = Math.abs(centerX - vw / 2) <= tol;
    const onHCenter = Math.abs(centerY - vh / 2) <= tol;
    GridOverlay.setCenterActive(onVCenter, onHCenter);

    this._drag.pendingPos = pos;
    this._drag.pendingSnapped = snapped;
  }

  static async _onDrop(e) {
    if (!this._drag) return;
    const drag = this._drag;
    this._drag = null;

    if (this._moveHandler) window.removeEventListener("mousemove", this._moveHandler);
    if (this._upHandler) window.removeEventListener("mouseup", this._upHandler);
    this._moveHandler = null;
    this._upHandler = null;

    document.body.classList.remove("dsp-fui-dragging");
    drag.primary.element.classList.remove("dsp-fui-drag-active");
    GridOverlay.unmount();

    if (!drag.pendingPos || !drag.pendingSnapped) {
      for (const m of drag.members) m.ui.reflow();
      return;
    }

    const primaryData = drag.members.find(m => m.ui === drag.primary);
    const deltaX = drag.pendingSnapped.left - primaryData.startLeft;
    const deltaY = drag.pendingSnapped.top - primaryData.startTop;

    const snapMode = drag.pendingPos.snap ?? "grid";

    for (const m of drag.members) {
      if (m.ui === drag.primary) {
        await m.ui.savePosition(drag.pendingPos);
      } else {
        const finalLeft = m.startLeft + deltaX;
        const finalTop = m.startTop + deltaY;
        let pos = pickClosestAnchor({ left: finalLeft, top: finalTop }, m.width, m.height);
        pos.snap = snapMode;
        if (snapMode === "grid") {
          const grid = getGridSize();
          pos.offsetX = quantizeToGrid(pos.offsetX, grid);
          pos.offsetY = quantizeToGrid(pos.offsetY, grid);
        }
        await m.ui.savePosition(pos);
      }
    }

    for (const m of drag.members) m.ui.reflow();
  }

  static async migrate() {
    try {
      const migrated = game.user.getFlag(MODULE_ID, "floatingUIMigrated");
      if (migrated) return;
      const ui = game.user.getFlag(MODULE_ID, "ui") ?? {};
      const next = {};
      for (const [id, old] of Object.entries(ui)) {
        if (!old || typeof old !== "object") continue;
        if (old.pos) {
          next[id] = old;
          continue;
        }
        const entry = {};
        if (old.locked) entry.locked = true;
        if (old.group) entry.group = old.group;
        if (old.position && !old.centered) {
          entry.pos = snapPosition(pickClosestAnchor(old.position, 0, 0));
        }
        if (Object.keys(entry).length > 0) next[id] = entry;
      }
      await game.user.setFlag(MODULE_ID, "ui", next);
      await game.user.setFlag(MODULE_ID, "floatingUIMigrated", true);
    } catch (e) {
      console.error(`${MODULE_ID} | floating UI migration failed`, e);
    }
  }
}
