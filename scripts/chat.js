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
  await foundry.applications.handlebars.loadTemplates(Object.values(CHAT_TEMPLATES));

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
  _enhanceHeader(message, html);
  _initCollapsibleTrays(html);
  _injectRollContextMenu(html);
}

function _enhanceHeader(message, html) {
  const header = html.querySelector("header.message-header");
  if (!header) return;

  if (_compiled.header) {
    const ctx = {
      document: message,
      canDelete: !!header.querySelector("[data-action='deleteMessage']"),
      canClose: !!header.querySelector("[data-action='dismissMessage']"),
      isWhisper: message.whisper.length > 0,
      whisperTo: message.whisper.map(id => game.users.get(id)?.name).filter(Boolean).join(", "),
    };
    header.outerHTML = _compiled.header(ctx);
    return;
  }

  const sender = header.querySelector(".message-sender");
  if (!sender) return;

  const name = sender.textContent.trim();
  let avatarSrc = "";

  if (message.speaker?.actor) {
    const actor = game.actors.get(message.speaker.actor);
    if (actor) avatarSrc = actor.img || "";
  }

  if (!avatarSrc && message.author) {
    avatarSrc = message.author.avatar || "";
  }

  if (avatarSrc) {
    const img = document.createElement("img");
    img.src = avatarSrc;
    img.alt = name;
    img.className = "dsp-avatar";
    sender.prepend(img);
  }
}

function _initCollapsibleTrays(html) {
  for (const embed of html.querySelectorAll("document-embed.ability")) {
    const sections = [];

    const powerResult = embed.querySelector("section.powerResult");
    if (powerResult) sections.push({ el: powerResult, label: "Power Roll Tiers", collapsed: true });

    const spend = embed.querySelector("section.spend");
    if (spend) {
      const dt = spend.querySelector("dt");
      sections.push({ el: spend, label: dt ? dt.textContent.trim() : "Spend", collapsed: true });
    }

    const effectBefore = embed.querySelector("section.effect.before");
    if (effectBefore) sections.push({ el: effectBefore, label: "Effect", collapsed: false });

    const effectAfter = embed.querySelector("section.effect.after");
    if (effectAfter) sections.push({ el: effectAfter, label: "Effect (After)", collapsed: false });

    for (const { el, label, collapsed } of sections) {
      _wrapTray(el, label, collapsed);
    }
  }
}

function _injectRollContextMenu(html) {
  for (const card of html.querySelectorAll(".chat-card.result-card")) {
    const firstRoll = card.querySelector(".card-rolls .dice-roll");
    if (!firstRoll) continue;

    const existing = firstRoll.querySelector("[data-action='resultPartContext']");
    if (existing) continue;

    const link = document.createElement("a");
    link.className = "dsp-roll-context fa-fw fa-solid fa-ellipsis-vertical";
    link.setAttribute("data-action", "resultPartContext");
    link.setAttribute("aria-label", "Options");
    firstRoll.appendChild(link);
  }
}

function _wrapTray(element, label, startCollapsed) {
  const tray = document.createElement("div");
  tray.classList.add("dsp-collapsible-tray");
  if (startCollapsed) tray.classList.add("collapsed");

  const trayLabel = document.createElement("label");
  trayLabel.innerHTML = `<i class="fa-solid fa-caret-down"></i><span>${label}</span>`;

  const content = document.createElement("div");
  content.classList.add("tray-content");

  const inner = document.createElement("div");
  inner.classList.add("tray-inner");

  element.before(tray);
  inner.appendChild(element);
  content.appendChild(inner);
  tray.appendChild(trayLabel);
  tray.appendChild(content);

  trayLabel.addEventListener("click", () => {
    tray.classList.toggle("collapsed");
  });

  return tray;
}
