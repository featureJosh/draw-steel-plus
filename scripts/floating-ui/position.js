import { MODULE_CONFIG } from "../config.js";

const MODULE_ID = MODULE_CONFIG.id;

export const ANCHORS = ["tl", "tc", "tr", "cl", "cc", "cr", "bl", "bc", "br"];

export function getGridSize() {
  try {
    const v = game.settings.get(MODULE_ID, "floatingUIGridSize");
    return Number.isFinite(v) && v > 0 ? v : 20;
  } catch {
    return 20;
  }
}

export function quantizeToGrid(value, grid = getGridSize()) {
  return Math.round(value / grid) * grid;
}

export function anchorReferencePoint(anchor) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const v = anchor?.[0] ?? "c";
  const h = anchor?.[1] ?? "c";
  const x = h === "l" ? 0 : h === "c" ? vw / 2 : vw;
  const y = v === "t" ? 0 : v === "c" ? vh / 2 : vh;
  return { x, y };
}

export function anchorAlignmentFactors(anchor) {
  const v = anchor?.[0] ?? "c";
  const h = anchor?.[1] ?? "c";
  const hFactor = h === "l" ? 0 : h === "c" ? 0.5 : 1;
  const vFactor = v === "t" ? 0 : v === "c" ? 0.5 : 1;
  return { hFactor, vFactor };
}

function elementSize(element, fallback) {
  if (element && element.offsetWidth) {
    return { width: element.offsetWidth, height: element.offsetHeight };
  }
  return { width: fallback?.width ?? 0, height: fallback?.height ?? 0 };
}

export function resolveAnchor(pos, element, sizeHint) {
  const safe = pos && typeof pos === "object" ? pos : {};
  const anchor = safe.anchor ?? "cc";
  const offsetX = Number.isFinite(safe.offsetX) ? safe.offsetX : 0;
  const offsetY = Number.isFinite(safe.offsetY) ? safe.offsetY : 0;
  const { width, height } = elementSize(element, sizeHint);

  if (typeof anchor === "string" && anchor.startsWith("element:")) {
    const selector = anchor.slice("element:".length);
    const target = selector ? document.querySelector(selector) : null;
    if (target) {
      const rect = target.getBoundingClientRect();
      const edge = safe.edge ?? "top";
      let left;
      let top;
      if (edge === "top") {
        left = rect.left + rect.width / 2 - width / 2;
        top = rect.top - height;
      } else if (edge === "bottom") {
        left = rect.left + rect.width / 2 - width / 2;
        top = rect.bottom;
      } else if (edge === "left") {
        left = rect.left - width;
        top = rect.top + rect.height / 2 - height / 2;
      } else if (edge === "right") {
        left = rect.right;
        top = rect.top + rect.height / 2 - height / 2;
      } else {
        left = rect.left + rect.width / 2 - width / 2;
        top = rect.top + rect.height / 2 - height / 2;
      }
      return {
        left: Math.round(left + offsetX),
        top: Math.round(top + offsetY),
      };
    }
    return resolveAnchor({ ...safe, anchor: "cc" }, element, sizeHint);
  }

  const ref = anchorReferencePoint(anchor);
  const { hFactor, vFactor } = anchorAlignmentFactors(anchor);
  const left = ref.x + offsetX - width * hFactor;
  const top = ref.y + offsetY - height * vFactor;
  return { left: Math.round(left), top: Math.round(top) };
}

export function pickClosestAnchor(pxPos, elementWidth = 0, elementHeight = 0) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const centerX = (pxPos.left ?? 0) + elementWidth / 2;
  const centerY = (pxPos.top ?? 0) + elementHeight / 2;

  let h = "c";
  if (centerX < vw / 3) h = "l";
  else if (centerX > (2 * vw) / 3) h = "r";

  let v = "c";
  if (centerY < vh / 3) v = "t";
  else if (centerY > (2 * vh) / 3) v = "b";

  const anchor = v + h;
  const ref = anchorReferencePoint(anchor);
  const { hFactor, vFactor } = anchorAlignmentFactors(anchor);
  const offsetX = (pxPos.left ?? 0) - ref.x + elementWidth * hFactor;
  const offsetY = (pxPos.top ?? 0) - ref.y + elementHeight * vFactor;

  return {
    anchor,
    offsetX: Math.round(offsetX),
    offsetY: Math.round(offsetY),
    snap: "grid",
  };
}

export function snapPosition(pos, grid = getGridSize()) {
  if (!pos) return pos;
  if (pos.snap === "free") return pos;
  return {
    ...pos,
    offsetX: quantizeToGrid(pos.offsetX ?? 0, grid),
    offsetY: quantizeToGrid(pos.offsetY ?? 0, grid),
    snap: "grid",
  };
}
