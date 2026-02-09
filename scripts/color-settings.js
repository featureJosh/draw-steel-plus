import { MODULE_CONFIG, COLOR_DEFAULTS, COLOR_CSS_MAP } from "./config.js";

const MODULE_ID = MODULE_CONFIG.id;

function hexToRgb(hex) {
  const str = String(hex);
  return {
    r: parseInt(str.slice(1, 3), 16),
    g: parseInt(str.slice(3, 5), 16),
    b: parseInt(str.slice(5, 7), 16),
  };
}

function colorSettingKey(key) {
  return `color${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

export function applyColorOverrides() {
  const merged = {};
  for (const [key, defaultVal] of Object.entries(COLOR_DEFAULTS)) {
    try {
      const raw = game.settings.get(MODULE_ID, colorSettingKey(key));
      merged[key] = (raw ? String(raw) : null) || defaultVal;
    } catch {
      merged[key] = defaultVal;
    }
  }

  let css = ".draw-steel-plus.sheet {\n";
  for (const [key, cssVar] of Object.entries(COLOR_CSS_MAP)) {
    css += `  ${cssVar}: ${merged[key]};\n`;
  }

  const plRgb = hexToRgb(merged.primaryLight);
  css += `  --dsp-primary-glow: rgba(${plRgb.r}, ${plRgb.g}, ${plRgb.b}, 0.3);\n`;

  const acRgb = hexToRgb(merged.accent);
  css += `  --dsp-accent-dim: rgba(${acRgb.r}, ${acRgb.g}, ${acRgb.b}, 0.2);\n`;

  css += "}\n";

  let styleEl = document.getElementById("dsp-color-overrides");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "dsp-color-overrides";
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;
}
