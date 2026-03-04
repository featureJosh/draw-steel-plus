import { MODULE_CONFIG, SCALE_DEFAULTS } from "./config.js";

const MODULE_ID = MODULE_CONFIG.id;

export function getFontScale() {
  try {
    const raw = game.settings.get(MODULE_ID, "fontScale");
    return (typeof raw === "number" && raw > 0) ? raw : SCALE_DEFAULTS.fontScale;
  } catch {
    return SCALE_DEFAULTS.fontScale;
  }
}

export function applyScaleOverrides() {
  const scale = getFontScale();

  if (scale === 1) {
    const existing = document.getElementById("dsp-scale-overrides");
    if (existing) existing.remove();
  } else {
    const css = `body, .draw-steel-plus.sheet {\n  --dsp-scale: ${scale};\n}\n`;
    let styleEl = document.getElementById("dsp-scale-overrides");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "dsp-scale-overrides";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  }

  // Resize all currently open DSP sheets to match the new scale
  for (const app of foundry.applications.instances.values()) {
    if (!app.options?.classes?.includes("draw-steel-plus")) continue;
    const baseWidth = app.options?.position?.width;
    const baseHeight = app.options?.position?.height;
    if (!baseWidth || !baseHeight) continue;
    app.setPosition({ width: Math.round(baseWidth * scale), height: Math.round(baseHeight * scale) });
  }
}
