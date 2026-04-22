import { MODULE_CONFIG } from "../config.js";
import { getGridSize } from "./position.js";

const MODULE_ID = MODULE_CONFIG.id;

export class GridOverlay {
  static _el = null;
  static _highlight = null;
  static _previews = [];

  static _shouldShow() {
    try {
      return game.settings.get(MODULE_ID, "floatingUIShowOverlay") !== false;
    } catch {
      return true;
    }
  }

  static mount() {
    if (this._el || !this._shouldShow()) return;

    const grid = getGridSize();
    const el = document.createElement("div");
    el.id = "dsp-grid-overlay";
    el.className = "dsp-grid-overlay";
    el.style.setProperty("--dsp-grid-size", `${grid}px`);

    const zones = document.createElement("div");
    zones.className = "dsp-grid-zones";
    for (let i = 1; i < 3; i++) {
      const v = document.createElement("div");
      v.className = "dsp-grid-zone-line dsp-grid-zone-vline";
      v.style.left = `${(i / 3) * 100}%`;
      zones.appendChild(v);
      const h = document.createElement("div");
      h.className = "dsp-grid-zone-line dsp-grid-zone-hline";
      h.style.top = `${(i / 3) * 100}%`;
      zones.appendChild(h);
    }
    el.appendChild(zones);

    const dots = document.createElement("div");
    dots.className = "dsp-grid-dots";
    el.appendChild(dots);

    const centerAxes = document.createElement("div");
    centerAxes.className = "dsp-grid-center-axes";
    const cv = document.createElement("div");
    cv.className = "dsp-grid-center-line dsp-grid-center-vline";
    const ch = document.createElement("div");
    ch.className = "dsp-grid-center-line dsp-grid-center-hline";
    const cp = document.createElement("div");
    cp.className = "dsp-grid-center-point";
    cp.innerHTML = '<span class="dsp-grid-center-dot"></span>';
    centerAxes.appendChild(cv);
    centerAxes.appendChild(ch);
    centerAxes.appendChild(cp);
    el.appendChild(centerAxes);

    const highlight = document.createElement("div");
    highlight.className = "dsp-grid-zone-highlight";
    el.appendChild(highlight);
    this._highlight = highlight;

    this._previews = [];

    document.body.appendChild(el);
    this._el = el;
    requestAnimationFrame(() => el.classList.add("visible"));
  }

  static unmount() {
    if (!this._el) return;
    const el = this._el;
    this._el = null;
    this._highlight = null;
    this._previews = [];
    el.classList.remove("visible");
    setTimeout(() => el.remove(), 180);
  }

  static updateZone(anchor) {
    if (!this._highlight) return;
    if (typeof anchor !== "string" || anchor.startsWith("element:")) {
      this._highlight.style.opacity = "0";
      return;
    }
    this._highlight.style.opacity = "";
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const v = anchor[0];
    const h = anchor[1];
    const left = h === "l" ? 0 : h === "c" ? vw / 3 : (2 * vw) / 3;
    const top = v === "t" ? 0 : v === "c" ? vh / 3 : (2 * vh) / 3;
    this._highlight.style.left = `${left}px`;
    this._highlight.style.top = `${top}px`;
    this._highlight.style.width = `${vw / 3}px`;
    this._highlight.style.height = `${vh / 3}px`;
  }

  static updatePreviews(rects) {
    if (!this._el) return;
    while (this._previews.length < rects.length) {
      const p = document.createElement("div");
      p.className = "dsp-grid-snap-preview";
      this._el.appendChild(p);
      this._previews.push(p);
    }
    for (let i = 0; i < this._previews.length; i++) {
      const p = this._previews[i];
      if (i < rects.length) {
        const r = rects[i];
        p.style.left = `${r.left}px`;
        p.style.top = `${r.top}px`;
        p.style.width = `${r.width}px`;
        p.style.height = `${r.height}px`;
        p.style.opacity = "";
      } else {
        p.style.opacity = "0";
      }
    }
  }

  static updatePreview(left, top, width, height) {
    this.updatePreviews([{ left, top, width, height }]);
  }

  static hidePreview() {
    for (const p of this._previews) p.style.opacity = "0";
  }

  static setCenterActive(vertical, horizontal) {
    if (!this._el) return;
    this._el.classList.toggle("dsp-grid-center-v-active", !!vertical);
    this._el.classList.toggle("dsp-grid-center-h-active", !!horizontal);
    this._el.classList.toggle("dsp-grid-center-active", !!vertical && !!horizontal);
  }
}
