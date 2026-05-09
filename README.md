![All Downloads](https://img.shields.io/github/downloads/featureJosh/draw-steel-plus/total?color=5e0000&label=All%20Downloads) ![Latest Version Downloads](https://img.shields.io/github/downloads/featureJosh/draw-steel-plus/latest/total?color=171f69&label=Latest%20Version%20Downloads&sort=semver)

Improves the UI/UX of the Draw Steel system for character sheets, item sheets, and general UI elements. Adds new sleek custom sheets, item preview tooltips, improved chat styling and new UIs for metacurrency, negotiation, montage tests and etc.

**Custom Sheets**

![New custom sheets](https://github.com/user-attachments/assets/d4a379a4-175d-4f6b-9f03-5781c73688e7)

**Item Preview Tooltips**

![Item preview tooltips](https://github.com/user-attachments/assets/4b9a3303-1be5-4723-8ec3-a49baf37ffc2)

**Meta-Currency UI**

![Meta-Currency UI](https://github.com/user-attachments/assets/ab2d0d97-01d5-42ea-80ff-43f109c0d32c)

**Negotiation UI**

![firefox_Do10cqR0FI](https://github.com/user-attachments/assets/7bb71615-41ed-4847-9a7b-f5986d12e403)
![Foundry_Virtual_Tabletop_SvlAexzlz6](https://github.com/user-attachments/assets/02c78c66-7aeb-4eb6-a85c-7056ce5eaafb)

**Montage Tests UI**

<img width="374" height="429" alt="{F1A89628-99D3-47F7-B292-D7F2CA551A55}" src="https://github.com/user-attachments/assets/2ed144b4-d263-47fb-a002-843789fe0f33" />

<img width="368" height="371" alt="image" src="https://github.com/user-attachments/assets/f2b7f3a1-62b9-4700-96da-83c91fd2404d" />

**Quick Expand & Send**

![Quick Expand & Quick Send](https://github.com/user-attachments/assets/221de3f1-b0e9-4d57-94da-25255b2e777e)

**Favorites**

![Favorites Tab](https://github.com/user-attachments/assets/ef49c024-e11b-4804-a934-d9310bad520f)


**Improved Chat**

![Improved Chat](https://github.com/user-attachments/assets/d18b04cd-93aa-49e5-9c14-7526374a8194)

---

## Floating UI

Other modules can register their own panels into Draw Steel+'s floating UI system. No core changes needed.

### Quick setup

Call `register` during or after the `ready` hook:

```js
Hooks.once("ready", () => {
  const api = game.modules.get("draw-steel-plus")?.api?.floatingUI;
  if (!api) return;

  api.register({
    id: "my-module-my-panel",          // unique id, no spaces
    title: "My Panel",
    element: "#my-panel-element",      // CSS selector, Element, or () => Element
    defaultPosition: { anchor: "tr", offsetX: -24, offsetY: 80, snap: "grid" },
    defaultWidth: 320,
    defaultHeight: 160,
  });
});
```

### Showing / hiding

```js
const entry = api.get("my-module-my-panel");
entry.show();    // renders the panel
entry.hide();    // closes it
entry.toggle();  // show if hidden, hide if shown
```

### Extending the base class directly

For full control, extend `DspFloatingUI` instead of using `register`:

```js
import { DspFloatingUI } from "modules/draw-steel-plus/scripts/floating-ui/dsp-floating-ui.js";

class MyPanel extends DspFloatingUI {
  static DEFAULT_OPTIONS = { id: "my-panel", /* ... */ };
  static DEFAULT_POSITION = { anchor: "cc", offsetX: 0, offsetY: 0, snap: "grid" };
  static DEFAULT_WIDTH = 320;
  static DEFAULT_HEIGHT = 160;
  static PARTS = { content: { template: "modules/my-module/templates/my-panel.hbs" } };
}
```

### Config reference

| Option | Type | Description |
|---|---|---|
| `id` | `string` | **Required.** Unique identifier for the panel. |
| `title` | `string` | Panel title (used in drag handle tooltip). |
| `element` | `string \| Element \| () => Element` | DOM element to adopt into the panel. |
| `defaultPosition` | `object` | Anchor + offset. See anchors below. |
| `defaultWidth` | `number` | Width hint used before first render. |
| `defaultHeight` | `number` | Height hint used before first render. |
| `classes` | `string[]` | Extra CSS classes on the panel root. |
| `contentClass` | `string` | Class for the inner content wrapper. |
| `toolbarButtons` | `array` | Extra toolbar buttons `{ id, icon, tooltip, onClick }`. |
| `onRender` | `(app) => void` | Callback after each render. |
| `onClose` | `(app) => void` | Callback on close. |
| `reparentOnClose` | `string \| Element` | Move the adopted element back here on close. |

### Anchors

Anchors are two-character strings describing a zone on the screen:

| | Left | Center | Right |
|---|---|---|---|
| **Top** | `tl` | `tc` | `tr` |
| **Center** | `cl` | `cc` | `cr` |
| **Bottom** | `bl` | `bc` | `br` |

You can also anchor to a DOM element: `anchor: "element:#hotbar"`. The panel will follow that element and reposition itself if the element moves or resizes.

`offsetX` / `offsetY` are pixel offsets from the anchor point. `snap: "grid"` snaps to the configured grid size (default 20 px); `snap: "free"` allows sub-grid placement.

## Development Validation

Run the local validation script before packaging or opening a release PR:

```sh
node scripts/validate-module.mjs
```

The script checks `module.json`, local script/style/language/template paths, CSS imports, invalid raw nesting selectors, and JavaScript syntax in `scripts/`.

Manual Foundry smoke tests should still cover hero, NPC, object, retainer, party, and item sheets; favorites and tab visibility; expanded document descriptions; item tooltips; improved chat rendering; sheet scaling; setting menus; floating panels; and companion modules both missing and present.
