
export const { HandlebarsApplicationMixin, ApplicationV2 } =
  foundry.applications.api;

export const SETTINGS_FORM_BUTTONS = [
  {
    type: "button",
    action: "resetDefaults",
    icon: "fas fa-arrow-rotate-left",
    label: "DRAW_STEEL_PLUS.Settings.resetDefaults",
  },
  {
    type: "submit",
    icon: "fas fa-save",
    label: "DRAW_STEEL_PLUS.Settings.saveChanges",
  },
];

export function settingsMenuOptions({
  id,
  width,
  title,
  icon,
  actions,
  handler,
}) {
  return {
    id,
    tag: "form",
    classes: ["standard-form"],
    position: { width },
    window: { title, icon },
    actions,
    form: {
      closeOnSubmit: true,
      handler,
    },
  };
}

export function settingsMenuParts(part, template) {
  return {
    [part]: { template },
    footer: {
      template: "templates/generic/form-footer.hbs",
    },
  };
}

export function settingFieldContext(moduleId, key, field) {
  return {
    field,
    value: game.settings.get(moduleId, key),
    label: game.i18n.localize(`DRAW_STEEL_PLUS.Settings.${key}.name`),
    hint: game.i18n.localize(`DRAW_STEEL_PLUS.Settings.${key}.hint`),
  };
}

export function booleanSettingContext(moduleId, key, field) {
  return settingFieldContext(
    moduleId,
    key,
    field ?? new foundry.data.fields.BooleanField(),
  );
}
