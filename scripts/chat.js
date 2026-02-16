import { MODULE_CONFIG } from "./config.js";

const MODULE_ID = MODULE_CONFIG.id;
const MODULE_PATH = MODULE_CONFIG.path;

const CHAT_TEMPLATES = {
  header: `${MODULE_PATH}/templates/chat/header.hbs`,
  abilityResult: `${MODULE_PATH}/templates/chat/ability-result.hbs`,
  abilityUse: `${MODULE_PATH}/templates/chat/ability-use.hbs`,
  content: `${MODULE_PATH}/templates/chat/content.hbs`,
  heroToken: `${MODULE_PATH}/templates/chat/hero-token.hbs`,
  project: `${MODULE_PATH}/templates/chat/project.hbs`,
  roll: `${MODULE_PATH}/templates/chat/roll.hbs`,
  savingThrow: `${MODULE_PATH}/templates/chat/saving-throw.hbs`,
  test: `${MODULE_PATH}/templates/chat/test.hbs`,
  testRequest: `${MODULE_PATH}/templates/chat/test-request.hbs`,
};

const _compiled = {};

export async function registerChatTemplates() {
  await loadTemplates(Object.values(CHAT_TEMPLATES));

  for (const [key, path] of Object.entries(CHAT_TEMPLATES)) {
    const id = path.replace(".hbs", "");
    if (Handlebars.partials[id]) _compiled[key] = Handlebars.partials[id];
  }

  const parts = globalThis.ds?.data?.pseudoDocuments?.messageParts;
  if (!parts) {
    console.warn(`${MODULE_ID} | Could not find Draw Steel message parts — template overrides skipped`);
    return;
  }

  const overrides = {
    AbilityResult: CHAT_TEMPLATES.abilityResult,
    AbilityUse: CHAT_TEMPLATES.abilityUse,
    ContentPart: CHAT_TEMPLATES.content,
    HeroTokenPart: CHAT_TEMPLATES.heroToken,
    ProjectPart: CHAT_TEMPLATES.project,
    RollPart: CHAT_TEMPLATES.roll,
    SavingThrowPart: CHAT_TEMPLATES.savingThrow,
    TestPart: CHAT_TEMPLATES.test,
    TestRequestPart: CHAT_TEMPLATES.testRequest,
  };

  for (const [cls, template] of Object.entries(overrides)) {
    if (parts[cls]) parts[cls].TEMPLATE = template;
  }

  console.log(`${MODULE_ID} | Chat template overrides applied`);
}

export function applyImprovedChat() {
  if (typeof game === "undefined") return;
  const enabled = game.settings.get(MODULE_ID, "improvedChat");
  document.body.classList.toggle("dsp-improved-chat", enabled);
}

export function enhanceChatMessage(message, html) {
  html.classList.add("dsp-chat");

  if (_compiled.header) {
    const header = html.querySelector("header.message-header");
    if (header) {
      const ctx = {
        document: message,
        canDelete: !!header.querySelector("[data-action='deleteMessage']"),
        canClose: !!header.querySelector("[data-action='dismissMessage']"),
        isWhisper: message.whisper.length > 0,
        whisperTo: message.whisper.map(id => game.users.get(id)?.name).filter(Boolean).join(", "),
      };
      header.outerHTML = _compiled.header(ctx);
    }
  }

  for (const embed of html.querySelectorAll("document-embed.ability")) {
    const powerResult = embed.querySelector("section.powerResult");
    if (powerResult) _wrapCollapsible(powerResult, "Power Roll Tiers", false);

    const spend = embed.querySelector("section.spend");
    if (spend) {
      const dt = spend.querySelector("dt");
      _wrapCollapsible(spend, dt ? dt.textContent.trim() : "Spend", true);
    }

    const effectBefore = embed.querySelector("section.effect.before");
    if (effectBefore) _wrapCollapsible(effectBefore, "Effect", false);

    const effectAfter = embed.querySelector("section.effect.after");
    if (effectAfter) _wrapCollapsible(effectAfter, "Effect (After)", false);
  }

  for (const rollsDiv of html.querySelectorAll(".message-part-rolls")) {
    const rolls = rollsDiv.querySelectorAll(".dice-roll");
    if (!rolls.length) continue;

    const labelParts = [];
    const tierEl = rollsDiv.querySelector(".tier");
    if (tierEl) labelParts.push(tierEl.textContent.trim());

    for (const roll of rolls) {
      const flavor = roll.querySelector(".dice-flavor");
      const total = roll.querySelector(".dice-total");
      if (flavor && total) {
        labelParts.push(`${flavor.textContent.trim()}: ${total.textContent.trim()}`);
      } else if (total) {
        labelParts.push(total.textContent.trim());
      }
    }

    const wrapper = _wrapCollapsible(rollsDiv, labelParts.join(" \u00B7 ") || "Dice Details", true);
    if (wrapper) {
      const next = wrapper.nextElementSibling;
      if (next?.classList?.contains("message-part-html") && next.querySelector(".power-roll-display")) {
        wrapper.querySelector(".dsp-section-content").appendChild(next);
      }
    }
  }
}

function _wrapCollapsible(element, label, startCollapsed) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("dsp-collapsible-section");
  if (startCollapsed) wrapper.classList.add("dsp-collapsed");

  const toggle = document.createElement("div");
  toggle.classList.add("dsp-section-toggle");
  const dir = startCollapsed ? "right" : "down";
  toggle.innerHTML = `<i class="fa-solid fa-chevron-${dir} dsp-chevron"></i><span>${label}</span>`;

  const content = document.createElement("div");
  content.classList.add("dsp-section-content");

  element.before(wrapper);
  content.appendChild(element);
  wrapper.appendChild(toggle);
  wrapper.appendChild(content);

  toggle.addEventListener("click", () => {
    wrapper.classList.toggle("dsp-collapsed");
    const chevron = toggle.querySelector(".dsp-chevron");
    chevron.classList.toggle("fa-chevron-right");
    chevron.classList.toggle("fa-chevron-down");
  });

  return wrapper;
}
