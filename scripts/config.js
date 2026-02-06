export const SHEET_SIZE_DEFAULTS = {
  hero: {
    width: 800,
    height: 720,
    minWidth: 740,
    minHeight: 600,
  },

  npc: {
    width: 700,
    height: 600,
    minWidth: 600,
    minHeight: 500,
  },

  item: {
    width: 600,
    height: 650,
    minWidth: 500,
    minHeight: 450,
  },
};

export const FLOATING_TAB_ICONS = {
  stats: "fas fa-shield-halved",
  abilities: "fas fa-hand-fist",
  features: "fas fa-star",
  biography: "fas fa-book-open",
  effects: "fas fa-bolt",
  equipment: "fas fa-suitcase",
  projects: "fas fa-compass-drafting",
  details: "fas fa-circle-info",
  description: "fas fa-scroll",
  advancement: "fas fa-chart-line",
  impact: "fas fa-crosshairs",
};

export const MODULE_CONFIG = {
  id: "draw-steel-plus",
  systemId: "draw-steel",

  get path() {
    return `modules/${this.id}`;
  },
};
