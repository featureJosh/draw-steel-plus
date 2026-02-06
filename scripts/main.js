const MODULE_ID = "draw-steel-plus";
const SYSTEM_ID = "draw-steel";
const MODULE_PATH = `modules/${MODULE_ID}`;

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing Draw Steel Plus`);
  registerSheets();
});

function registerSheets() {
  if (game.system.id !== SYSTEM_ID) {
    console.warn(`${MODULE_ID} | Not running on Draw Steel system, skipping sheet registration`);
    return;
  }

  const sheets = globalThis.ds?.applications?.sheets;

  if (!sheets) {
    console.error(`${MODULE_ID} | Draw Steel sheets not found at ds.applications.sheets`);
    console.log(`${MODULE_ID} | Available on ds:`, globalThis.ds);
    return;
  }

  console.log(`${MODULE_ID} | Available sheets:`, Object.keys(sheets));

  if (sheets.DrawSteelHeroSheet) {
    const baseParts = sheets.DrawSteelHeroSheet.PARTS || {};
    console.log(`${MODULE_ID} | Base hero sheet PARTS keys:`, Object.keys(baseParts));

    const DrawSteelPlusHeroSheet = class extends sheets.DrawSteelHeroSheet {
      static DEFAULT_OPTIONS = {
        ...super.DEFAULT_OPTIONS,
        classes: [...super.DEFAULT_OPTIONS.classes, "draw-steel-plus"],
      };

      static PARTS = {
        ...super.PARTS,
        header: {
          ...(super.PARTS?.header || {}),
          template: `${MODULE_PATH}/templates/sheets/actor/hero-sheet/header.hbs`,
        },
      };

      get title() {
        return `${this.document.name} [DS+]`;
      }
    };

    console.log(`${MODULE_ID} | DS+ hero sheet PARTS keys:`, Object.keys(DrawSteelPlusHeroSheet.PARTS));

    Actors.registerSheet(MODULE_ID, DrawSteelPlusHeroSheet, {
      types: ["hero"],
      makeDefault: false,
      label: "DS+ Hero Sheet",
    });

    console.log(`${MODULE_ID} | Registered DS+ Hero Sheet`);
  }

  if (sheets.DrawSteelNPCSheet) {
    const DrawSteelPlusNPCSheet = class extends sheets.DrawSteelNPCSheet {
      static DEFAULT_OPTIONS = {
        ...super.DEFAULT_OPTIONS,
        classes: [...super.DEFAULT_OPTIONS.classes, "draw-steel-plus"],
      };

      get title() {
        return `${this.document.name} [DS+]`;
      }
    };

    Actors.registerSheet(MODULE_ID, DrawSteelPlusNPCSheet, {
      types: ["npc"],
      makeDefault: false,
      label: "DS+ NPC Sheet",
    });

    console.log(`${MODULE_ID} | Registered DS+ NPC Sheet`);
  }

  console.log(`${MODULE_ID} | Sheet registration complete`);
}
