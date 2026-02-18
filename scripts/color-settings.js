import { MODULE_CONFIG, COLOR_LIGHT_DARK_DEFAULTS, COLOR_CSS_MAP } from "./config.js";

const MODULE_ID = MODULE_CONFIG.id;

function hexToRgb(hex) {
  const str = String(hex);
  return {
    r: parseInt(str.slice(1, 3), 16),
    g: parseInt(str.slice(3, 5), 16),
    b: parseInt(str.slice(5, 7), 16),
  };
}

function colorSettingKey(key, variant) {
  const base = `color${key.charAt(0).toUpperCase()}${key.slice(1)}`;
  return variant ? `${base}${variant === "light" ? "Lt" : "Dk"}` : base;
}

function getColor(key, variant) {
  const defaults = COLOR_LIGHT_DARK_DEFAULTS[key];
  try {
    const raw = game.settings.get(MODULE_ID, colorSettingKey(key, variant));
    return (raw ? String(raw) : null) || defaults[variant];
  } catch {
    return defaults[variant];
  }
}

export function applyColorOverrides() {
  const merged = {};
  for (const key of Object.keys(COLOR_LIGHT_DARK_DEFAULTS)) {
    merged[key] = {
      light: getColor(key, "light"),
      dark: getColor(key, "dark"),
    };
  }

  let css = ".draw-steel-plus.sheet {\n";
  for (const [key, cssVar] of Object.entries(COLOR_CSS_MAP)) {
    const { light, dark } = merged[key];
    css += `  ${cssVar}: light-dark(${light}, ${dark});\n`;
  }

  const plLight = merged.primaryLight.light;
  const plDark = merged.primaryLight.dark;
  const plLightRgb = hexToRgb(plLight);
  const plDarkRgb = hexToRgb(plDark);
  css += `  --dsp-primary-glow: light-dark(rgba(${plLightRgb.r}, ${plLightRgb.g}, ${plLightRgb.b}, 0.3), rgba(${plDarkRgb.r}, ${plDarkRgb.g}, ${plDarkRgb.b}, 0.3));\n`;

  const acLight = merged.accent.light;
  const acDark = merged.accent.dark;
  const acLightRgb = hexToRgb(acLight);
  const acDarkRgb = hexToRgb(acDark);
  css += `  --dsp-accent-dim: light-dark(rgba(${acLightRgb.r}, ${acLightRgb.g}, ${acLightRgb.b}, 0.2), rgba(${acDarkRgb.r}, ${acDarkRgb.g}, ${acDarkRgb.b}, 0.2));\n`;

  css += "}\n";

  let styleEl = document.getElementById("dsp-color-overrides");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "dsp-color-overrides";
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = css;
}
