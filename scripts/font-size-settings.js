import { MODULE_CONFIG, FONT_SIZE_DEFAULTS } from "./config.js";

const MODULE_ID = MODULE_CONFIG.id;

function getFontScale() {
  try {
    const raw = game.settings.get(MODULE_ID, "fontScale");
    return (typeof raw === "number" && raw > 0) ? raw : FONT_SIZE_DEFAULTS.fontScale;
  } catch {
    return FONT_SIZE_DEFAULTS.fontScale;
  }
}

export function applyFontSizeOverrides() {
  const scale = getFontScale();

  if (scale === 1) {
    const existing = document.getElementById("dsp-font-size-overrides");
    if (existing) existing.remove();
    return;
  }

  const css = `body, .draw-steel-plus.sheet {\n  --dsp-font-scale: ${scale};\n}\n`;

  let styleEl = document.getElementById("dsp-font-size-overrides");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "dsp-font-size-overrides";
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;
}
