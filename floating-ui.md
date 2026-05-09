
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
