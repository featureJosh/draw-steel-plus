const POPUP_MIN_HEIGHT = 240;

function flipIfNeeded(button) {
  const popup = button.querySelector(".dsahud-popup");
  if (!popup) return;
  const rect = button.getBoundingClientRect();
  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;
  const needed = Math.min(
    POPUP_MIN_HEIGHT,
    popup.scrollHeight || POPUP_MIN_HEIGHT,
  );
  const openDown = spaceAbove < needed && spaceBelow > spaceAbove;
  button.classList.toggle("dsahud-open-down", openDown);
}

document.addEventListener(
  "mouseenter",
  (ev) => {
    const target = ev.target;
    if (!(target instanceof HTMLElement)) return;
    if (!target.classList?.contains("dsahud-button")) return;
    if (!target.closest("#dsp-ability-hud")) return;
    flipIfNeeded(target);
  },
  true,
);
