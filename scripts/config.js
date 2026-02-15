export const SHEET_SIZE_DEFAULTS = {
  hero: {
    width: 880,
    height: 800,
    minWidth: 0,
    minHeight: 0,
  },

  npc: {
    width: 880,
    height: 800,
    minWidth: 0,
    minHeight: 0,
  },

  item: {
    width: 600,
    height: 650,
    minWidth: 0,
    minHeight: 0,
  },
};

export const FLOATING_TAB_ICONS = {
  favorites: "fas fa-star",
  abilities: "fas fa-hand-fist",
  features: "fas fa-dumbbell",
  biography: "fas fa-book-open",
  effects: "fas fa-bolt",
  equipment: "fas fa-suitcase",
  projects: "fas fa-compass-drafting",
  details: "fas fa-circle-info",
  description: "fas fa-scroll",
  advancement: "fas fa-chart-line",
  impact: "fas fa-crosshairs",
};

export const COLOR_DEFAULTS = {
  primary: "#7a1b1b",
  primaryLight: "#a82828",
  primaryDark: "#4a0e0e",
  secondary: "#1a1a2e",
  accent: "#c8aa6e",
  accentBright: "#ddc088",
  background: "#0d0d0d",
  surface: "#161616",
  surfaceRaised: "#1e1e1e",
  text: "#e8e0d4",
  textLight: "#9a8e80",
  textFaint: "#5a5248",
  border: "#2a2020",
  borderLight: "#3a302a",
  danger: "#e05555",
};

export const COLOR_CSS_MAP = {
  primary: "--dsp-primary",
  primaryLight: "--dsp-primary-light",
  primaryDark: "--dsp-primary-dark",
  secondary: "--dsp-secondary",
  accent: "--dsp-accent",
  accentBright: "--dsp-accent-bright",
  background: "--dsp-background",
  surface: "--dsp-surface",
  surfaceRaised: "--dsp-surface-raised",
  text: "--dsp-text",
  textLight: "--dsp-text-light",
  textFaint: "--dsp-text-faint",
  border: "--dsp-border",
  borderLight: "--dsp-border-light",
  danger: "--dsp-danger",
};

export const HEADER_DEFAULTS = {
  heroHeaderEnabled: true,
  npcHeaderEnabled: true,
  heroHeaderImage: "",
  npcHeaderImage: "",
};

export const DEFAULT_HEADER_IMAGES = {
  hero: "modules/draw-steel-plus/assets/sketch-images/s1.jpg",
  npc: "modules/draw-steel-plus/assets/sketch-images/s2.jpg",
};

export const NPC_DEFAULTS = {
  npcFavoritesEnabled: true,
};

export const UI_DEFAULTS = {
  improvedChat: true,
};

export const META_CURRENCY_DEFAULTS = {
  position: null,
  expanded: true,
  locked: false,
};

export const MODULE_CONFIG = {
  id: "draw-steel-plus",
  systemId: "draw-steel",

  get path() {
    return `modules/${this.id}`;
  },
};
