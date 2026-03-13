const STORAGE_KEY = "bracket-parade.v1";
const LEGACY_STORAGE_KEYS = ["lil-bracket-buddy.v1"];
const MAX_BRACKET_NAME = 40;
const DEFAULT_BRACKET_NAMES = [
  "Victory Parade",
  "Mascot March",
  "Halftime Heroes",
  "Buzzer Beater",
];
const POWER_CONFERENCES = new Set(["ACC", "Big 12", "Big East", "Big Ten", "SEC"]);
const STRONG_MID_MAJORS = new Set([
  "American",
  "Atlantic 10",
  "Mountain West",
  "Missouri Valley",
  "West Coast",
]);

const CHAMPIONSHIP_THEME = { color: "#ff8a5b", glow: "#ffd699" };
const BRACKET_ZOOM_STEP = 0.15;
const BRACKET_ZOOM_MIN = 0.85;
const BRACKET_ZOOM_MAX = 1.75;
const BRACKET_MODE_REGULAR = "regular";
const BRACKET_MODE_BLINDFOLD = "blindfold";
const BLINDFOLD_ADJECTIVES = [
  "Sunny",
  "Bouncy",
  "Rocket",
  "Twirly",
  "Sparkly",
  "Cozy",
  "Jolly",
  "Nifty",
  "Giggly",
  "Snappy",
  "Dandy",
  "Pepper",
  "Taffy",
  "Comet",
  "Waffle",
  "Breezy",
  "Jumpy",
  "Marshmallow",
  "Crayon",
  "Storybook",
  "Zippy",
  "Poppy",
  "Bubble",
  "Lucky",
];
const BLINDFOLD_ANIMALS = [
  "Otters",
  "Foxes",
  "Koalas",
  "Puffins",
  "Raccoons",
  "Bunnies",
  "Kittens",
  "Cubs",
  "Owls",
  "Turtles",
  "Penguins",
  "Hedgehogs",
  "Llamas",
  "Alpacas",
  "Fireflies",
  "Squirrels",
  "Beavers",
  "Ducks",
  "Seals",
  "Ponies",
  "Badgers",
  "Falcons",
  "Bobcats",
  "Parrots",
];
const BLINDFOLD_ANIMAL_ART = {
  Otters: "otter",
  Foxes: "fox",
  Koalas: "koala",
  Puffins: "puffin",
  Raccoons: "raccoon",
  Bunnies: "bunny",
  Kittens: "cat",
  Cubs: "bear",
  Owls: "owl",
  Turtles: "turtle",
  Penguins: "penguin",
  Hedgehogs: "hedgehog",
  Llamas: "llama",
  Alpacas: "llama",
  Fireflies: "firefly",
  Squirrels: "squirrel",
  Beavers: "beaver",
  Ducks: "duck",
  Seals: "seal",
  Ponies: "pony",
  Badgers: "badger",
  Falcons: "falcon",
  Bobcats: "cat",
  Parrots: "parrot",
};
const BLINDFOLD_BADGES = [
  "Mystery mascot",
  "Scout squad",
  "Secret favorite",
  "Storybook crew",
  "Lucky charm",
  "Sneaky star",
];
const BLINDFOLD_SHAPES = ["shield", "pennant", "medal", "ticket"];
const BLINDFOLD_PATTERNS = ["burst", "orbit", "rays", "confetti"];
const BLINDFOLD_PALETTES = [
  { color: "#ff8a5b", glow: "#ffd3bf", tint: "#fff0e8", accent: "#24344d" },
  { color: "#5c8cff", glow: "#d9e4ff", tint: "#eef3ff", accent: "#21304d" },
  { color: "#42b883", glow: "#d8f6e8", tint: "#edfdf6", accent: "#1d3c35" },
  { color: "#f2b94b", glow: "#fff0c9", tint: "#fff8e9", accent: "#3a2f19" },
  { color: "#9a68ff", glow: "#ecdeff", tint: "#f7f1ff", accent: "#312149" },
  { color: "#f16fa2", glow: "#ffdbe8", tint: "#fff1f6", accent: "#452033" },
  { color: "#39a6a3", glow: "#d9f6f4", tint: "#effdfc", accent: "#183c3b" },
  { color: "#e86b3f", glow: "#ffe1d5", tint: "#fff3ed", accent: "#40251d" },
];

const state = {
  data: null,
  teamsById: {},
  gamesById: new Map(),
  childrenByGame: new Map(),
  navigationGames: [],
  roundMeta: [],
  regionThemes: {},
  store: null,
  activeGameId: null,
  toastTimer: null,
  imageCache: new Map(),
  bracketCanvasSignature: null,
  bracketCanvasRenderId: 0,
  bracketZoom: 1,
  pendingBracketName: "",
  pendingBracketMode: BRACKET_MODE_REGULAR,
  newBracketModalLocked: false,
  deferredInstallPrompt: null,
  blindfoldProfileCache: new Map(),
  bracketCanvasTimer: null,
  mobileBracketToolsOpen: false,
};

const elements = {
  sourceStatus: document.querySelector("#sourceStatus"),
  sourceNote: document.querySelector("#sourceNote"),
  appModeBurst: document.querySelector("#appModeBurst"),
  installAppButton: document.querySelector("#installAppButton"),
  mobileToolbarToggleButton: document.querySelector("#mobileToolbarToggleButton"),
  pickViewButton: document.querySelector("#pickViewButton"),
  bracketViewButton: document.querySelector("#bracketViewButton"),
  bracketSelect: document.querySelector("#bracketSelect"),
  newBracketButton: document.querySelector("#newBracketButton"),
  deleteBracketButton: document.querySelector("#deleteBracketButton"),
  bracketNameInput: document.querySelector("#bracketNameInput"),
  newBracketModal: document.querySelector("#newBracketModal"),
  newBracketForm: document.querySelector("#newBracketForm"),
  newBracketEyebrow: document.querySelector("#newBracketEyebrow"),
  newBracketTitle: document.querySelector("#newBracketTitle"),
  newBracketNote: document.querySelector("#newBracketNote"),
  newBracketModeHint: document.querySelector("#newBracketModeHint"),
  newBracketNameInput: document.querySelector("#newBracketNameInput"),
  newBracketNameHint: document.querySelector("#newBracketNameHint"),
  newBracketModeInputs: document.querySelectorAll('input[name="newBracketMode"]'),
  dismissNewBracketButton: document.querySelector("#dismissNewBracketButton"),
  cancelNewBracketButton: document.querySelector("#cancelNewBracketButton"),
  startNewBracketButton: document.querySelector("#startNewBracketButton"),
  resetButton: document.querySelector("#resetButton"),
  exportJsonButton: document.querySelector("#exportJsonButton"),
  exportImageButton: document.querySelector("#exportImageButton"),
  screenShell: document.querySelector(".screen-shell"),
  pickerScreen: document.querySelector("#pickerScreen"),
  bracketScreen: document.querySelector("#bracketScreen"),
  matchupEyebrow: document.querySelector("#matchupEyebrow"),
  matchupTitle: document.querySelector("#matchupTitle"),
  matchupHint: document.querySelector("#matchupHint"),
  progressCount: document.querySelector("#progressCount"),
  progressFill: document.querySelector("#progressFill"),
  roundPills: document.querySelector("#roundPills"),
  matchupStage: document.querySelector("#matchupStage"),
  prevGameButton: document.querySelector("#prevGameButton"),
  clearPickButton: document.querySelector("#clearPickButton"),
  seeBracketButton: document.querySelector("#seeBracketButton"),
  nextGameButton: document.querySelector("#nextGameButton"),
  returnToPickButton: document.querySelector("#returnToPickButton"),
  revealBlindfoldButton: document.querySelector("#revealBlindfoldButton"),
  zoomOutButton: document.querySelector("#zoomOutButton"),
  fitBracketButton: document.querySelector("#fitBracketButton"),
  zoomInButton: document.querySelector("#zoomInButton"),
  bracketViewTitle: document.querySelector("#bracketViewTitle"),
  bracketViewChips: document.querySelector("#bracketViewChips"),
  bracketViewHint: document.querySelector("#bracketViewHint"),
  bracketCanvasWrap: document.querySelector("#bracketCanvasWrap"),
  bracketMobileBoard: document.querySelector("#bracketMobileBoard"),
  snapshotCard: document.querySelector("#snapshotCard"),
  roundProgress: document.querySelector("#roundProgress"),
  recentPicks: document.querySelector("#recentPicks"),
  toast: document.querySelector("#toast"),
};

init();

async function init() {
  try {
    const response = await fetch("data/bracket-2026-projected.json");
    if (!response.ok) {
      throw new Error(`Failed to load bracket data (${response.status})`);
    }

    state.data = await response.json();
    state.teamsById = state.data.teams;
    state.gamesById = new Map(state.data.games.map((game) => [game.id, game]));
    state.navigationGames = [...state.data.games].sort(compareGames);
    state.regionThemes = Object.fromEntries(
      state.data.regions.map((region) => [region.name, region])
    );
    state.roundMeta = buildRoundMeta(state.data.games);
    state.childrenByGame = buildChildrenByGame(state.data.games);
    state.store = loadStore();

    ensureCurrentBracket();
    attachEvents();
    setupInstallability();
    window.addEventListener("resize", syncResponsiveChrome);
    render();
    if (!state.store.brackets.length) {
      openNewBracketModal({ locked: true, initial: true });
    }
    registerServiceWorker();
  } catch (error) {
    renderFatal(error);
  }
}

function buildRoundMeta(games) {
  const meta = new Map();

  for (const game of games) {
    if (!meta.has(game.round)) {
      meta.set(game.round, {
        round: game.round,
        label: game.roundLabel,
        total: 0,
      });
    }

    meta.get(game.round).total += 1;
  }

  return [...meta.values()].sort((left, right) => left.round - right.round);
}

function buildChildrenByGame(games) {
  const children = new Map();

  for (const game of games) {
    for (const slot of game.slots) {
      if (slot.type !== "winner") {
        continue;
      }

      const siblings = children.get(slot.gameId) || [];
      siblings.push(game.id);
      children.set(slot.gameId, siblings);
    }
  }

  return children;
}

function loadStore() {
  try {
    const raw = readStoredState();
    if (!raw) {
      return { brackets: [], currentBracketId: null, viewMode: "pick" };
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.brackets)) {
      return { brackets: [], currentBracketId: null, viewMode: "pick" };
    }

    return {
      brackets: parsed.brackets.map(normalizeBracket),
      currentBracketId: parsed.currentBracketId || null,
      viewMode: parsed.viewMode === "bracket" ? "bracket" : "pick",
    };
  } catch {
    return { brackets: [], currentBracketId: null, viewMode: "pick" };
  }
}

function readStoredState() {
  const candidateKeys = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS];

  for (const key of candidateKeys) {
    const raw = window.localStorage.getItem(key);
    if (raw) {
      return raw;
    }
  }

  return null;
}

function normalizeBracket(bracket) {
  const cleanPicks = {};

  for (const [gameId, teamId] of Object.entries(bracket?.picks || {})) {
    if (state.gamesById.has(gameId) && state.teamsById[teamId]) {
      cleanPicks[gameId] = teamId;
    }
  }

  const mode =
    bracket?.mode === BRACKET_MODE_BLINDFOLD ? BRACKET_MODE_BLINDFOLD : BRACKET_MODE_REGULAR;

  return {
    id: bracket?.id || createId(),
    name: typeof bracket?.name === "string" ? bracket.name.slice(0, MAX_BRACKET_NAME) : "",
    picks: cleanPicks,
    createdAt: bracket?.createdAt || new Date().toISOString(),
    updatedAt: bracket?.updatedAt || new Date().toISOString(),
    datasetId: bracket?.datasetId || state.data.meta.tournamentId,
    mode,
    blindfoldRevealed:
      mode === BRACKET_MODE_BLINDFOLD ? Boolean(bracket?.blindfoldRevealed) : false,
    blindfoldSeed:
      mode === BRACKET_MODE_BLINDFOLD ? String(bracket?.blindfoldSeed || createBlindfoldSeed()) : "",
  };
}

function persistStore() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.store));
}

function createId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `bracket-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function nextBracketName() {
  const usedNames = new Set(state.store.brackets.map((bracket) => bracket.name));

  for (const name of DEFAULT_BRACKET_NAMES) {
    if (!usedNames.has(name)) {
      return name;
    }
  }

  let counter = 2;
  while (usedNames.has(`Victory Parade ${counter}`)) {
    counter += 1;
  }

  return `Victory Parade ${counter}`;
}

function createBlindfoldSeed() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function createBracket(name = nextBracketName(), options = {}) {
  const mode =
    options.mode === BRACKET_MODE_BLINDFOLD ? BRACKET_MODE_BLINDFOLD : BRACKET_MODE_REGULAR;
  return {
    id: createId(),
    name,
    picks: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    datasetId: state.data.meta.tournamentId,
    mode,
    blindfoldRevealed: false,
    blindfoldSeed: mode === BRACKET_MODE_BLINDFOLD ? createBlindfoldSeed() : "",
  };
}

function ensureCurrentBracket({ createIfMissing = false, mode = BRACKET_MODE_REGULAR } = {}) {
  if (!state.store.brackets.length) {
    state.store.currentBracketId = null;
    state.store.viewMode = "pick";
    if (createIfMissing) {
      const fresh = createBracket(nextBracketName(), { mode });
      state.store.brackets.push(fresh);
      state.store.currentBracketId = fresh.id;
      persistStore();
    }
    return;
  }

  if (state.store.viewMode !== "pick" && state.store.viewMode !== "bracket") {
    state.store.viewMode = "pick";
  }

  if (!state.store.brackets.some((bracket) => bracket.id === state.store.currentBracketId)) {
    state.store.currentBracketId = state.store.brackets[0].id;
  }
}

function getViewMode() {
  return state.store.viewMode === "bracket" ? "bracket" : "pick";
}

function isCompactMobileViewport() {
  return window.matchMedia(
    "(max-width: 760px), (max-width: 900px) and (max-height: 540px) and (orientation: landscape)"
  ).matches;
}

function blurActiveControl() {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

function setViewMode(mode) {
  const nextMode = mode === "bracket" ? "bracket" : "pick";
  const currentMode = getViewMode();
  if (currentMode === nextMode) {
    return;
  }

  const compactMobileViewport = isCompactMobileViewport();
  const previousOverflowAnchor = document.documentElement.style.overflowAnchor;
  const syncViewport = () => {
    if (nextMode === "bracket") {
      resetBracketCanvasViewport();
    }
    scrollToViewStart(nextMode);
  };

  blurActiveControl();
  if (compactMobileViewport) {
    state.mobileBracketToolsOpen = false;
  }
  if (compactMobileViewport && window.scrollY > 4) {
    document.documentElement.style.overflowAnchor = "none";
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  state.store.viewMode = nextMode;
  persistStore();
  render();
  if (compactMobileViewport) {
    syncViewport();
  }

  window.requestAnimationFrame(() => {
    syncViewport();
    if (compactMobileViewport) {
      window.requestAnimationFrame(() => {
        syncViewport();
        document.documentElement.style.overflowAnchor = previousOverflowAnchor;
      });
    }
  });
}

function getCurrentBracket() {
  return state.store.brackets.find((bracket) => bracket.id === state.store.currentBracketId);
}

function isStandaloneApp() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function updateInstallButton() {
  const canInstall = Boolean(state.deferredInstallPrompt) && !isStandaloneApp();
  elements.installAppButton.hidden = !canInstall;
  elements.installAppButton.disabled = !canInstall;
}

function setupInstallability() {
  updateInstallButton();

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    updateInstallButton();
  });

  window.addEventListener("appinstalled", () => {
    state.deferredInstallPrompt = null;
    updateInstallButton();
    showToast("Bracket Parade installed.");
  });

  const standaloneQuery = window.matchMedia("(display-mode: standalone)");
  standaloneQuery.addEventListener?.("change", updateInstallButton);
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch (error) {
    console.error("Service worker registration failed.", error);
  }
}

function setBracketZoom(nextZoom) {
  state.bracketZoom = Math.min(BRACKET_ZOOM_MAX, Math.max(BRACKET_ZOOM_MIN, nextZoom));
  applyBracketZoom();
}

function applyBracketZoom() {
  const canvas = elements.bracketCanvasWrap.querySelector("canvas");
  if (canvas) {
    canvas.style.width = `${Math.round(state.bracketZoom * 100)}%`;
  }

  elements.zoomOutButton.disabled = state.bracketZoom <= BRACKET_ZOOM_MIN + 0.001;
  elements.zoomInButton.disabled = state.bracketZoom >= BRACKET_ZOOM_MAX - 0.001;
  elements.fitBracketButton.classList.toggle("is-active", Math.abs(state.bracketZoom - 1) < 0.001);
}

function resetBracketCanvasViewport() {
  if (!elements.bracketCanvasWrap) {
    return;
  }

  elements.bracketCanvasWrap.scrollTo({ left: 0, top: 0, behavior: "auto" });
}

function setPendingBracketMode(mode) {
  state.pendingBracketMode =
    mode === BRACKET_MODE_BLINDFOLD ? BRACKET_MODE_BLINDFOLD : BRACKET_MODE_REGULAR;
  elements.newBracketModeInputs.forEach((input) => {
    input.checked = input.value === state.pendingBracketMode;
  });
}

function updateNewBracketModalCopy({ initial = false } = {}) {
  elements.newBracketEyebrow.textContent = initial ? "Start here" : "New bracket";
  elements.newBracketTitle.textContent = initial
    ? "Pick your bracket style"
    : "Start another bracket";
  elements.newBracketNote.textContent = initial
    ? "Regular shows the real teams. Blindfold hides them until the reveal. Name your bracket and jump into the first game."
    : "Pick a style, tweak the name if you want, and jump straight into the first matchup.";
  elements.newBracketModeHint.textContent =
    state.pendingBracketMode === BRACKET_MODE_BLINDFOLD
      ? "Blindfold hides the real schools and logos while you pick. You only see cute aliases, made-up logos, and simple clues until the final reveal."
      : "Regular shows the real teams, seeds, logos, and simple stats from the very first matchup.";
  elements.newBracketNameHint.textContent = "Auto name ready. Edit it if you want.";
  elements.newBracketNameInput.placeholder = state.pendingBracketName;
  elements.startNewBracketButton.textContent = "Start bracket";
}

function openNewBracketModal({ locked = false, initial = false } = {}) {
  state.pendingBracketName = nextBracketName();
  state.newBracketModalLocked = locked;
  elements.newBracketModal.dataset.locked = locked ? "true" : "false";
  elements.newBracketNameInput.value = state.pendingBracketName;
  elements.newBracketNameInput.setCustomValidity("");
  setPendingBracketMode(BRACKET_MODE_REGULAR);
  updateNewBracketModalCopy({ initial });
  if (elements.dismissNewBracketButton) {
    elements.dismissNewBracketButton.hidden = locked;
    elements.dismissNewBracketButton.disabled = locked;
  }
  elements.cancelNewBracketButton.hidden = locked;
  elements.cancelNewBracketButton.disabled = locked;
  elements.newBracketModal.hidden = false;
  document.body.classList.add("has-modal");

  window.requestAnimationFrame(() => {
    elements.newBracketModeInputs[0]?.focus();
  });
}

function closeNewBracketModal({ restoreFocus = true } = {}) {
  if (state.newBracketModalLocked) {
    return;
  }

  state.pendingBracketName = "";
  state.pendingBracketMode = BRACKET_MODE_REGULAR;
  state.newBracketModalLocked = false;
  elements.newBracketModal.dataset.locked = "false";
  elements.newBracketModal.hidden = true;
  elements.newBracketNameInput.value = "";
  elements.newBracketNameInput.setCustomValidity("");
  if (elements.dismissNewBracketButton) {
    elements.dismissNewBracketButton.hidden = false;
    elements.dismissNewBracketButton.disabled = false;
  }
  elements.cancelNewBracketButton.hidden = false;
  elements.cancelNewBracketButton.disabled = false;
  setPendingBracketMode(BRACKET_MODE_REGULAR);
  updateNewBracketModalCopy();
  document.body.classList.remove("has-modal");

  if (restoreFocus) {
    elements.newBracketButton.focus();
  }
}

function startNewBracket(name = "", mode = state.pendingBracketMode) {
  const finalName = name.trim() || state.pendingBracketName || nextBracketName();
  const bracket = createBracket(finalName, { mode });
  state.store.brackets.unshift(bracket);
  state.store.currentBracketId = bracket.id;
  state.store.viewMode = "pick";
  state.activeGameId = null;
  state.bracketCanvasSignature = null;
  persistStore();
  state.newBracketModalLocked = false;
  closeNewBracketModal({ restoreFocus: false });
  render();
}

function touchBracket(bracket) {
  bracket.updatedAt = new Date().toISOString();
}

function isBlindfoldMode(bracket) {
  return bracket?.mode === BRACKET_MODE_BLINDFOLD;
}

function isBlindfoldHidden(bracket) {
  return isBlindfoldMode(bracket) && !bracket?.blindfoldRevealed;
}

function canRevealBlindfold(bracket) {
  return isBlindfoldHidden(bracket) && getProgress(bracket).pickedCount === state.data.games.length;
}

function revealBlindfold() {
  const bracket = getCurrentBracket();
  if (!canRevealBlindfold(bracket)) {
    return;
  }

  bracket.blindfoldRevealed = true;
  touchBracket(bracket);
  state.bracketCanvasSignature = null;
  persistStore();
  render();
  showToast("Blindfold off. Real teams revealed.");
}

function getBracketModeLabel(bracket) {
  if (!bracket) {
    return "Choose a bracket";
  }

  if (isBlindfoldHidden(bracket)) {
    return "Blindfold on";
  }

  if (isBlindfoldMode(bracket) && bracket.blindfoldRevealed) {
    return "Blindfold revealed";
  }

  return "Regular mode";
}

function getBlindfoldProfiles(bracket) {
  if (!isBlindfoldMode(bracket)) {
    return {};
  }

  const cacheKey = `${bracket.id}:${bracket.blindfoldSeed}`;
  if (state.blindfoldProfileCache.has(cacheKey)) {
    return state.blindfoldProfileCache.get(cacheKey);
  }

  const aliasPool = BLINDFOLD_ADJECTIVES.flatMap((adjective) =>
    BLINDFOLD_ANIMALS.map((animal) => ({
      adjective,
      animal,
      alias: `${adjective} ${animal}`,
    }))
  );
  const shuffledAliases = seededShuffle(aliasPool, `${cacheKey}:aliases`);
  const teamIds = Object.keys(state.teamsById).sort();
  const profiles = {};

  teamIds.forEach((teamId, index) => {
    const aliasEntry = shuffledAliases[index % shuffledAliases.length];
    const palette =
      BLINDFOLD_PALETTES[
        hashString(`${cacheKey}:${teamId}:palette`) % BLINDFOLD_PALETTES.length
      ];
    const badge =
      BLINDFOLD_BADGES[
        hashString(`${cacheKey}:${teamId}:badge`) % BLINDFOLD_BADGES.length
      ];
    const shape =
      BLINDFOLD_SHAPES[
        hashString(`${cacheKey}:${teamId}:shape`) % BLINDFOLD_SHAPES.length
      ];
    const pattern =
      BLINDFOLD_PATTERNS[
        hashString(`${cacheKey}:${teamId}:pattern`) % BLINDFOLD_PATTERNS.length
      ];

    profiles[teamId] = {
      alias: aliasEntry.alias,
      animal: aliasEntry.animal,
      badge,
      palette,
      shape,
      pattern,
      logo: buildBlindfoldLogo({
        alias: aliasEntry.alias,
        animal: aliasEntry.animal,
        palette,
        shape,
        pattern,
      }),
    };
  });

  state.blindfoldProfileCache.set(cacheKey, profiles);
  return profiles;
}

function getBlindfoldIdentity(bracket, team) {
  return getBlindfoldProfiles(bracket)[team.id];
}

function getDisplayTeamData(bracket, team) {
  if (!team) {
    return null;
  }

  if (!isBlindfoldHidden(bracket)) {
    return {
      id: team.id,
      name: team.name,
      compactName: compactTeamName(team.name),
      logo: team.logo,
      logoAlt: `${team.name} logo`,
      subtitle: team.conference,
      seedTag: `No. ${team.seed}`,
      sticker: getTeamSticker(team),
      facts: getTeamFacts(team),
      scoutRows: getTeamScoutRows(team),
      buttonLabel: "Pick this team",
      pulseLabel: "Tap to advance",
      theme: getThemeForTeam(team),
      miniMeta: `${team.conference} • Seed #${team.seed}`,
      championMeta: `${team.conference} • ${getTeamRecordLabel(team)}`,
      mobileNote: `${team.conference} • No. ${team.seed}`,
      mobileTag: `No. ${team.seed}`,
      slotLabel: `${team.seed} ${compactTeamName(team.name)}`,
    };
  }

  const identity = getBlindfoldIdentity(bracket, team);
  return {
    id: team.id,
    name: identity.alias,
    compactName: compactTeamName(identity.alias),
    logo: identity.logo,
    logoAlt: `${identity.alias} mascot logo`,
    subtitle: getConferenceProfile(team.conference),
    seedTag: "Code name",
    sticker: identity.badge,
    facts: getTeamFacts(team),
    scoutRows: getTeamScoutRows(team),
    buttonLabel: "Pick this mascot",
    pulseLabel: "Pick by clues",
    theme: identity.palette,
    miniMeta: `${getConferenceProfile(team.conference)} • Stats only`,
    championMeta: `${getConferenceProfile(team.conference)} • ${getTeamRecordLabel(team)}`,
    mobileNote: `${getConferenceProfile(team.conference)} • ${getTeamRecordLabel(team)}`,
    mobileTag: "Mystery",
    slotLabel: compactTeamName(identity.alias),
  };
}

function getDisplayTeamName(bracket, team) {
  return getDisplayTeamData(bracket, team)?.name || "TBD";
}

function getDisplayTeamTheme(bracket, team) {
  return getDisplayTeamData(bracket, team)?.theme || getThemeForTeam(team);
}

function getPreviewLabel(game, picks, bracket = null) {
  const matchup = resolveGame(game, picks);
  if (matchup.top && matchup.bottom) {
    return `${getDisplayTeamName(bracket, matchup.top)} vs ${getDisplayTeamName(bracket, matchup.bottom)}`;
  }

  return game.title;
}

function getThemeForTeam(team) {
  return state.regionThemes[team.region] || CHAMPIONSHIP_THEME;
}

function getVisibleGames(picks) {
  return state.navigationGames.filter((game) => {
    const matchup = resolveGame(game, picks);
    return Boolean(matchup.top && matchup.bottom);
  });
}

function resolveGame(game, picks) {
  return {
    top: resolveSlot(game.slots[0], picks),
    bottom: resolveSlot(game.slots[1], picks),
  };
}

function resolveSlot(slot, picks) {
  if (slot.type === "team") {
    return state.teamsById[slot.teamId] || null;
  }

  const winnerId = picks[slot.gameId];
  return winnerId ? state.teamsById[winnerId] || null : null;
}

function syncActiveGame() {
  const bracket = getCurrentBracket();
  if (!bracket) {
    state.activeGameId = null;
    return;
  }

  const visibleGames = getVisibleGames(bracket.picks);

  if (!visibleGames.length) {
    state.activeGameId = null;
    return;
  }

  if (state.activeGameId && visibleGames.some((game) => game.id === state.activeGameId)) {
    return;
  }

  const firstOpen = visibleGames.find((game) => !bracket.picks[game.id]);
  state.activeGameId = (firstOpen || visibleGames[visibleGames.length - 1]).id;
}

function getCurrentGameContext() {
  const bracket = getCurrentBracket();
  if (!bracket) {
    return {
      bracket: null,
      visibleGames: [],
      currentGame: null,
      currentIndex: -1,
    };
  }

  const visibleGames = getVisibleGames(bracket.picks);
  const currentGame = visibleGames.find((game) => game.id === state.activeGameId) || null;
  const currentIndex = currentGame
    ? visibleGames.findIndex((game) => game.id === currentGame.id)
    : -1;

  return {
    bracket,
    visibleGames,
    currentGame,
    currentIndex,
  };
}

function getProgress(bracket) {
  const pickedCount = Object.keys(bracket?.picks || {}).length;
  return {
    pickedCount,
    total: state.data.games.length,
    percent: Math.round((pickedCount / state.data.games.length) * 100),
  };
}

function getRoundTallies(bracket) {
  const picks = bracket?.picks || {};
  return state.roundMeta.map((meta) => {
    const picked = state.navigationGames.filter((game) => game.round === meta.round && picks[game.id])
      .length;
    return { ...meta, picked };
  });
}

function getChampion(bracket) {
  const championId = bracket?.picks?.championship;
  return championId ? state.teamsById[championId] || null : null;
}

function getPickedGames(bracket) {
  if (!bracket) {
    return [];
  }

  return state.navigationGames
    .filter((game) => bracket.picks[game.id])
    .map((game) => {
      const winner = state.teamsById[bracket.picks[game.id]];
      const matchup = resolveGame(game, bracket.picks);
      return {
        game,
        winner,
        matchup,
      };
    });
}

function clearDescendantPicks(picks, gameId) {
  for (const childId of state.childrenByGame.get(gameId) || []) {
    delete picks[childId];
    clearDescendantPicks(picks, childId);
  }
}

function setPick(gameId, teamId) {
  const bracket = getCurrentBracket();
  if (!bracket) {
    return;
  }

  const previousPick = bracket.picks[gameId];

  if (previousPick === teamId) {
    return;
  }

  bracket.picks[gameId] = teamId;
  clearDescendantPicks(bracket.picks, gameId);
  touchBracket(bracket);
  state.bracketCanvasSignature = null;
  blurActiveControl();
  persistStore();
  moveToNextOpen(gameId);
  render();
  stabilizeCompactPickerViewport();
}

function clearPick(gameId) {
  const bracket = getCurrentBracket();
  if (!bracket) {
    return;
  }

  if (!bracket.picks[gameId]) {
    return;
  }

  delete bracket.picks[gameId];
  clearDescendantPicks(bracket.picks, gameId);
  touchBracket(bracket);
  state.bracketCanvasSignature = null;
  blurActiveControl();
  persistStore();
  state.activeGameId = gameId;
  render();
  stabilizeCompactPickerViewport();
}

function moveToNextOpen(originGameId = null) {
  const bracket = getCurrentBracket();
  if (!bracket) {
    state.activeGameId = null;
    return;
  }

  const visibleGames = getVisibleGames(bracket.picks);
  const originIndex = originGameId
    ? visibleGames.findIndex((game) => game.id === originGameId)
    : -1;

  const nextOpenAfterOrigin =
    originIndex >= 0
      ? visibleGames.slice(originIndex + 1).find((game) => !bracket.picks[game.id])
      : null;
  const firstOpen = visibleGames.find((game) => !bracket.picks[game.id]);
  const fallbackGame = visibleGames[visibleGames.length - 1] || null;

  state.activeGameId = (nextOpenAfterOrigin || firstOpen || fallbackGame)?.id || null;
}

function render() {
  syncActiveGame();

  const bracket = getCurrentBracket();
  const progress = getProgress(bracket);
  const currentContext = getCurrentGameContext();

  renderSourceBanner();
  renderToolbar(bracket);
  renderProgress(progress);
  renderRoundPills(bracket, currentContext.currentGame);
  renderMatchup(bracket, currentContext);
  renderSnapshot(bracket);
  renderRoundProgress(bracket);
  renderRecentPicks(bracket);
  renderBracketMobileBoard(bracket);
  renderViewMode(bracket, progress, currentContext);
  renderMobileToolbarToggle(bracket);
}

function renderSourceBanner() {
  const bracket = getCurrentBracket();
  elements.sourceStatus.textContent = state.data.meta.officialBracket
    ? `Official bracket • ${state.data.meta.sourceUpdatedLabel}`
    : `Projected bracket • ${state.data.meta.sourceUpdatedLabel}`;

  elements.sourceNote.textContent = state.data.meta.officialBracket
    ? "The field is official."
    : "Selection Sunday is March 15, 2026, so this build uses the latest projected matchups and teams.";
  elements.appModeBurst.textContent = bracket ? getBracketModeLabel(bracket) : "Pick a style";
}

function renderToolbar(bracket) {
  if (!bracket) {
    elements.bracketSelect.innerHTML = '<option value="">No saved brackets yet</option>';
    elements.bracketSelect.disabled = true;
    elements.deleteBracketButton.disabled = true;
    elements.bracketNameInput.value = "";
    elements.bracketNameInput.disabled = true;
    elements.resetButton.disabled = true;
    elements.exportJsonButton.disabled = true;
    elements.exportImageButton.disabled = true;
    return;
  }

  elements.bracketSelect.innerHTML = state.store.brackets
    .map((item) => {
      const picked = Object.keys(item.picks).length;
      return `<option value="${item.id}" ${item.id === bracket.id ? "selected" : ""}>
        ${escapeHtml(item.name || "Untitled bracket")} · ${escapeHtml(getBracketModeLabel(item))} · ${picked}/${state.data.games.length}
      </option>`;
    })
    .join("");
  elements.bracketSelect.disabled = false;
  elements.deleteBracketButton.disabled = false;
  elements.bracketNameInput.disabled = false;
  elements.resetButton.disabled = false;
  elements.exportJsonButton.disabled = false;
  elements.exportImageButton.disabled = false;

  if (elements.bracketNameInput !== document.activeElement) {
    elements.bracketNameInput.value = bracket.name;
  }
}

function renderMobileToolbarToggle(bracket) {
  if (!elements.mobileToolbarToggleButton) {
    document.body.dataset.mobileToolsOpen = "false";
    return;
  }

  const shouldShow = isCompactMobileViewport() && getViewMode() === "bracket" && Boolean(bracket);
  const isOpen = shouldShow && state.mobileBracketToolsOpen;
  document.body.dataset.mobileToolsOpen = isOpen ? "true" : "false";
  elements.mobileToolbarToggleButton.hidden = !shouldShow;
  elements.mobileToolbarToggleButton.disabled = !shouldShow;
  elements.mobileToolbarToggleButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
  elements.mobileToolbarToggleButton.textContent = isOpen ? "Hide tools" : "Bracket tools";
}

function syncResponsiveChrome() {
  if (!isCompactMobileViewport()) {
    state.mobileBracketToolsOpen = false;
  }

  renderMobileToolbarToggle(getCurrentBracket());
}

function stabilizeCompactPickerViewport() {
  if (getViewMode() !== "pick") {
    return;
  }

  if (!isCompactMobileViewport()) {
    scrollToViewStart("pick");
    return;
  }

  const previousOverflowAnchor = document.documentElement.style.overflowAnchor;
  const syncViewport = () => {
    scrollToViewStart("pick");
  };

  document.documentElement.style.overflowAnchor = "none";
  syncViewport();
  window.requestAnimationFrame(() => {
    syncViewport();
    window.requestAnimationFrame(() => {
      syncViewport();
      window.setTimeout(() => {
        syncViewport();
        window.setTimeout(() => {
          syncViewport();
          document.documentElement.style.overflowAnchor = previousOverflowAnchor;
        }, 90);
      }, 40);
    });
  });
}

function renderProgress(progress) {
  elements.progressCount.textContent = `${progress.pickedCount} / ${progress.total} picks`;
  elements.progressFill.style.width = `${progress.percent}%`;
}

function renderRoundPills(bracket, currentGame) {
  const tallies = getRoundTallies(bracket);

  elements.roundPills.innerHTML = tallies
    .map(
      (tally) => `<span class="round-pill ${currentGame?.round === tally.round ? "is-current" : ""}">
        <span>${escapeHtml(tally.label)}</span>
        <strong>${tally.picked}/${tally.total}</strong>
      </span>`
    )
    .join("");
}

function renderMatchup(bracket, context) {
  if (!bracket) {
    elements.matchupEyebrow.textContent = "Start here";
    elements.matchupTitle.textContent = "Choose regular or blindfold mode to begin";
    elements.matchupHint.textContent =
      "Pick your style, keep the auto-generated name or type your own, and the first matchup will be ready.";
    elements.matchupStage.innerHTML = `
      <div class="empty-state">
        <h3>No bracket yet</h3>
        <p>Your first bracket starts as soon as you choose a mode in the setup card.</p>
      </div>
    `;
    setNavState({ canGoBack: false, canGoForward: false, canClear: false });
    return;
  }

  const { currentGame, currentIndex, visibleGames } = context;
  const champion = getChampion(bracket);
  const complete = getProgress(bracket).pickedCount === state.data.games.length;

  if (complete && champion) {
    elements.matchupEyebrow.textContent = isBlindfoldHidden(bracket)
      ? "Blindfold bracket complete"
      : "Bracket complete";
    elements.matchupTitle.textContent = isBlindfoldHidden(bracket)
      ? `${bracket.name} is ready for the reveal`
      : `${bracket.name} is ready to celebrate`;
    elements.matchupHint.textContent = isBlindfoldHidden(bracket)
      ? "You picked the whole bracket using only the clues. Take off the blindfold to see the real teams."
      : "Your whole bracket is finished. Export the poster or jump backward to revisit any matchup.";
    elements.matchupStage.innerHTML = renderCompletedState(bracket, champion);
    setNavState({
      canGoBack: false,
      canGoForward: false,
      canClear: false,
    });
    return;
  }

  if (!currentGame) {
    elements.matchupEyebrow.textContent = "Loading matchup";
    elements.matchupTitle.textContent = "The next game is getting ready";
    elements.matchupHint.textContent = "If this sticks, reload the page to try again.";
    elements.matchupStage.innerHTML = `
      <div class="empty-state">
        <h3>Still warming up</h3>
        <p>The matchup board could not be loaded from the saved picks.</p>
      </div>
    `;
    setNavState({ canGoBack: false, canGoForward: false, canClear: false });
    return;
  }

  const matchup = resolveGame(currentGame, bracket.picks);
  const pickedTeamId = bracket.picks[currentGame.id] || null;

  elements.matchupEyebrow.textContent = `${currentGame.roundLabel} • ${formatGameStageLabel(currentGame)} • Matchup ${currentIndex + 1} of ${visibleGames.length}`;
  elements.matchupTitle.textContent = `${getDisplayTeamName(bracket, matchup.top)} vs ${getDisplayTeamName(bracket, matchup.bottom)}`;
  elements.matchupHint.textContent =
    isBlindfoldHidden(bracket)
      ? "Pick using only the clues. Real school names and logos stay hidden until the final reveal."
      : currentGame.round === 0
        ? "Pick the play-in winner to unlock the rest of that seed line."
        : "Choose the team you want to advance. If you change this later, dependent picks will clear automatically.";

  elements.matchupStage.innerHTML = `
    <div class="matchup-board">
      <div class="matchup-lane matchup-lane--left">
        ${renderTeamCard(bracket, matchup.top, currentGame, pickedTeamId, "left")}
      </div>
      <div class="matchup-board__center">
        <p class="versus-track__round">${escapeHtml(currentGame.roundLabel)}</p>
        <div class="versus-badge">VS</div>
        <div class="versus-track">
          <p class="versus-caption">${escapeHtml(currentGame.region)}</p>
          <p class="versus-track__note">Winner jumps to ${escapeHtml(getAdvancementLabel(currentGame.round))}</p>
        </div>
      </div>
      <div class="matchup-lane matchup-lane--right">
        ${renderTeamCard(bracket, matchup.bottom, currentGame, pickedTeamId, "right")}
      </div>
    </div>
  `;

  setNavState({
    canGoBack: currentIndex > 0,
    canGoForward: currentIndex < visibleGames.length - 1,
    canClear: Boolean(pickedTeamId),
  });
}

function renderCompletedState(bracket, champion) {
  const displayChampion = getDisplayTeamData(bracket, champion);
  return `
    <div class="summary-card">
      <h3>Mission complete!</h3>
      <p>${
        isBlindfoldHidden(bracket)
          ? "You picked every game with the blindfold on. Your champion is ready for the big reveal."
          : "You picked every game in the bracket. Your champion is ready for the spotlight."
      }</p>
      <div class="champion-card">
        <div class="champion-card__logo">
          <img src="${escapeAttribute(displayChampion.logo)}" alt="${escapeAttribute(displayChampion.logoAlt)}" />
        </div>
        <div>
          <p class="eyebrow">${isBlindfoldHidden(bracket) ? "Blindfold champion" : "Champion pick"}</p>
          <h3>${escapeHtml(displayChampion.name)}</h3>
          <p>${escapeHtml(displayChampion.championMeta)}</p>
        </div>
      </div>
      ${
        canRevealBlindfold(bracket)
          ? `
            <div class="summary-card__actions">
              <button class="button button--accent" type="button" data-action="reveal-blindfold">
                Take off the blindfold
              </button>
            </div>
          `
          : ""
      }
    </div>
  `;
}

function renderTeamCard(bracket, team, game, pickedTeamId, side) {
  const displayTeam = getDisplayTeamData(bracket, team);
  const theme = displayTeam.theme;
  const isPicked = pickedTeamId === team.id;
  const pulseText = isPicked ? "Locked in" : displayTeam.pulseLabel;

  return `
    <button
      class="team-card team-card--${side} ${isPicked ? "is-picked" : ""}"
      type="button"
      data-team-pick="${escapeAttribute(team.id)}"
      style="--team-color:${theme.color};--team-glow:${theme.glow};--team-tint:${theme.tint || hexToRgba(theme.color, 0.18)}"
    >
      <div class="team-card__top">
        <span class="team-card__seed">${escapeHtml(displayTeam.seedTag)}</span>
        <span class="team-card__sticker">${escapeHtml(displayTeam.sticker)}</span>
      </div>

      <div class="team-card__crest">
        <img src="${escapeAttribute(displayTeam.logo)}" alt="${escapeAttribute(displayTeam.logoAlt)}" />
      </div>

      <div class="team-card__body">
        <h3 class="team-card__name">${escapeHtml(displayTeam.name)}</h3>
        <p class="team-card__conference">${escapeHtml(displayTeam.subtitle)}</p>
      </div>

      <div class="team-card__facts">
        ${displayTeam.facts.map(renderTeamFact).join("")}
      </div>

      <div class="team-card__scouting">
        <p class="team-card__section-label">Quick scout</p>
        ${displayTeam.scoutRows.map(renderScoutRow).join("")}
      </div>

      <div class="team-card__footer">
        <span class="team-card__pulse">${escapeHtml(pulseText)}</span>
        <span class="team-card__button">${isPicked ? "Picked winner" : escapeHtml(displayTeam.buttonLabel)}</span>
      </div>
    </button>
  `;
}

function renderTeamFact(fact) {
  return `
    <div class="team-card__fact">
      <p class="team-card__fact-label">${escapeHtml(fact.label)}</p>
      <p class="team-card__fact-value">${escapeHtml(fact.value)}</p>
    </div>
  `;
}

function renderScoutRow(row) {
  return `
    <div class="scout-row">
      <div class="scout-row__copy">
        <p class="scout-row__label">${escapeHtml(row.label)}</p>
        <p class="scout-row__note">${escapeHtml(row.note)}</p>
      </div>
      <div class="scout-row__meter" aria-label="${row.rating} out of 5">
        ${renderScoutDots(row.rating)}
      </div>
    </div>
  `;
}

function renderScoutDots(rating) {
  return Array.from({ length: 5 }, (_, index) => {
    const filled = index < rating;
    return `<span class="scout-row__dot ${filled ? "is-filled" : ""}" aria-hidden="true"></span>`;
  }).join("");
}

function getTeamSticker(team) {
  if (team.isPlayIn) {
    return "Play-in fighter";
  }

  if (team.seed <= 2) {
    return "Front-runner";
  }

  if (team.seed <= 4) {
    return "Heavy hitter";
  }

  if (team.seed <= 7) {
    return "Contender";
  }

  if (team.seed <= 10) {
    return "Tough out";
  }

  if (team.seed <= 12) {
    return "Sleeper pick";
  }

  return "Cinderella watch";
}

function getTeamFacts(team) {
  return [
    { label: "Record", value: getTeamRecordLabel(team) },
    { label: "Team rank", value: getTeamRankLabel(team.net) },
    { label: "League type", value: getConferenceProfile(team.conference) },
  ];
}

function getTeamScoutRows(team) {
  const hotStreak = getHotStreakSummary(team);
  const bigWins = getRecordNumbers(team.quad1).wins;
  const badLosses = getRecordNumbers(team.quad3).losses + getRecordNumbers(team.quad4).losses;

  return [
    {
      label: "Hot streak",
      note: hotStreak.note,
      rating: hotStreak.rating,
    },
    {
      label: "Big wins",
      note: bigWins
        ? `${bigWins} wins against strong teams`
        : "Still hunting a signature win",
      rating: getBigWinsRating(bigWins),
    },
    {
      label: "Battle-tested",
      note: getScheduleNote(team.sos),
      rating: getScheduleRating(team.sos),
    },
    {
      label: "Steady season",
      note: getStabilityNote(badLosses),
      rating: getStabilityRating(badLosses),
    },
  ];
}

function getTeamRecordLabel(team) {
  const { wins, losses } = getTeamRecordNumbers(team);
  return wins || losses ? `${wins} wins, ${losses} losses` : "Record coming soon";
}

function getHotStreakSummary(team) {
  const recentResults = getRecentResults(team);
  if (!recentResults.length) {
    return {
      note: "Recent form still coming in",
      rating: 3,
    };
  }

  const recentWindow = recentResults.slice(-5);
  const recentWins = recentWindow.filter((result) => result === "W").length;
  const streak = getCurrentStreak(recentResults);

  if (streak.count >= 3) {
    return {
      note:
        streak.type === "W"
          ? `Won ${streak.count} straight`
          : `Lost ${streak.count} straight`,
      rating: getHotStreakRating(recentWins, recentWindow.length, streak),
    };
  }

  if (recentWindow.length === 1) {
    return {
      note: recentWindow[0] === "W" ? "Won the last game" : "Lost the last game",
      rating: getHotStreakRating(recentWins, recentWindow.length, streak),
    };
  }

  return {
    note: `Won ${recentWins} of last ${recentWindow.length}`,
    rating: getHotStreakRating(recentWins, recentWindow.length, streak),
  };
}

function getRecentResults(team) {
  if (!Array.isArray(team?.recentResults)) {
    return [];
  }

  return team.recentResults.filter((result) => result === "W" || result === "L");
}

function getCurrentStreak(results) {
  if (!results.length) {
    return { type: null, count: 0 };
  }

  const type = results[results.length - 1];
  let count = 0;

  for (let index = results.length - 1; index >= 0; index -= 1) {
    if (results[index] !== type) {
      break;
    }
    count += 1;
  }

  return { type, count };
}

function getTeamRecordNumbers(team) {
  const fallback = getRecordNumbers(team.record);
  const quadTotals = [
    getRecordNumbers(team.quad1),
    getRecordNumbers(team.quad2),
    getRecordNumbers(team.quad3),
    getRecordNumbers(team.quad4),
  ].reduce(
    (totals, entry) => ({
      wins: totals.wins + entry.wins,
      losses: totals.losses + entry.losses,
    }),
    { wins: 0, losses: 0 }
  );

  return {
    wins: Number.isFinite(team.wins) ? team.wins : fallback.wins || quadTotals.wins,
    losses: Number.isFinite(team.losses) ? team.losses : fallback.losses || quadTotals.losses,
  };
}

function getRecordNumbers(value) {
  const match = String(value || "").match(/(\d+)-(\d+)/);
  if (!match) {
    return { wins: 0, losses: 0 };
  }

  return {
    wins: Number.parseInt(match[1], 10),
    losses: Number.parseInt(match[2], 10),
  };
}

function getTeamRankLabel(net) {
  if (net <= 10) {
    return "Top 10";
  }

  if (net <= 25) {
    return "Top 25";
  }

  if (net <= 50) {
    return "Top 50";
  }

  if (net <= 100) {
    return "Top 100";
  }

  return "100+";
}

function getConferenceProfile(conference) {
  if (POWER_CONFERENCES.has(conference)) {
    return "Power conference";
  }

  if (STRONG_MID_MAJORS.has(conference)) {
    return "Strong mid-major";
  }

  return "Smaller conference";
}

function getHotStreakRating(recentWins, recentGames, streak) {
  if (!recentGames) {
    return 3;
  }

  const winPct = recentWins / recentGames;
  let rating;

  if (winPct >= 0.88) {
    return 5;
  }

  if (winPct >= 0.8) {
    rating = 4;
  } else if (winPct >= 0.6) {
    rating = 3;
  } else if (winPct >= 0.4) {
    rating = 2;
  } else {
    rating = 1;
  }

  if (streak.type === "W" && streak.count >= 4) {
    rating += 1;
  } else if (streak.type === "L" && streak.count >= 3) {
    rating -= 1;
  }

  return Math.max(1, Math.min(5, rating));
}

function getBigWinsRating(bigWins) {
  if (bigWins >= 10) {
    return 5;
  }

  if (bigWins >= 7) {
    return 4;
  }

  if (bigWins >= 4) {
    return 3;
  }

  if (bigWins >= 2) {
    return 2;
  }

  return 1;
}

function getScheduleRating(sos) {
  if (sos <= 20) {
    return 5;
  }

  if (sos <= 50) {
    return 4;
  }

  if (sos <= 100) {
    return 3;
  }

  if (sos <= 180) {
    return 2;
  }

  return 1;
}

function getScheduleNote(sos) {
  if (sos <= 20) {
    return "Played one of the toughest schedules";
  }

  if (sos <= 50) {
    return "Played a tough schedule";
  }

  if (sos <= 100) {
    return "Saw a solid mix of opponents";
  }

  if (sos <= 180) {
    return "Had a lighter road than most";
  }

  return "Did not face many heavyweights";
}

function getStabilityRating(badLosses) {
  if (badLosses === 0) {
    return 5;
  }

  if (badLosses === 1) {
    return 4;
  }

  if (badLosses === 2) {
    return 3;
  }

  if (badLosses <= 4) {
    return 2;
  }

  return 1;
}

function getStabilityNote(badLosses) {
  if (badLosses === 0) {
    return "No slip-ups against weaker teams";
  }

  if (badLosses === 1) {
    return "Only one surprise loss";
  }

  if (badLosses === 2) {
    return "Just two surprise losses";
  }

  return `${badLosses} losses against lighter competition`;
}

function setNavState({ canGoBack, canGoForward, canClear }) {
  elements.prevGameButton.disabled = !canGoBack;
  elements.nextGameButton.disabled = !canGoForward;
  elements.clearPickButton.disabled = !canClear;
}

function renderSnapshot(bracket) {
  if (!bracket) {
    elements.snapshotCard.innerHTML = `
      <div class="snapshot">
        <div class="snapshot__hero">
          <p class="snapshot__label">Ready to start</p>
          <p class="snapshot__value">Choose regular or blindfold mode</p>
          <p class="snapshot__value">Your bracket will save on this device as soon as you start.</p>
        </div>
      </div>
    `;
    return;
  }

  const champion = getChampion(bracket);
  const visibleGames = getVisibleGames(bracket.picks);
  const nextOpen = visibleGames.find((game) => !bracket.picks[game.id]) || null;
  const finalFourTeams = getResolvedFinalFour(bracket);

  elements.snapshotCard.innerHTML = `
    <div class="snapshot">
      <div class="snapshot__hero">
        <p class="snapshot__label">Current bracket</p>
        <p class="snapshot__value">${escapeHtml(bracket.name || "Untitled bracket")}</p>
        <p class="snapshot__value">${Object.keys(bracket.picks).length} picks saved on this device</p>
        <p class="snapshot__mode">${escapeHtml(getBracketModeLabel(bracket))}</p>
      </div>

      ${
        champion
          ? `
            <div>
              <p class="snapshot__label">Champion pick</p>
              ${renderMiniTeam(bracket, champion)}
            </div>
          `
          : `
            <div class="stack-list">
              <div class="stack-item">
                <div>
                  <p class="stack-item__label">Champion slot</p>
                  <p class="stack-item__meta">Still waiting for your final winner.</p>
                </div>
                <span class="stack-item__count">Open</span>
              </div>
            </div>
          `
      }

      <div class="stack-list">
            <div class="stack-item">
              <div>
                <p class="stack-item__label">Next open matchup</p>
                <p class="stack-item__meta">${escapeHtml(nextOpen ? getPreviewLabel(nextOpen, bracket.picks, bracket) : "All games picked")}</p>
              </div>
              <span class="stack-item__count">${nextOpen ? "Ready" : "Done"}</span>
            </div>

        <div class="stack-item">
          <div>
            <p class="stack-item__label">Final Four spots</p>
            <p class="stack-item__meta">${finalFourTeams.length ? finalFourTeams.map((team) => getDisplayTeamName(bracket, team)).join(", ") : "No semifinalists locked in yet."}</p>
          </div>
          <span class="stack-item__count">${finalFourTeams.length}/4</span>
        </div>
      </div>
      ${
        canRevealBlindfold(bracket)
          ? `
            <div class="summary-card__actions summary-card__actions--inline">
              <button class="button button--accent" type="button" data-action="reveal-blindfold">
                Take off the blindfold
              </button>
            </div>
          `
          : ""
      }
    </div>
  `;
}

function renderMiniTeam(bracket, team) {
  const displayTeam = getDisplayTeamData(bracket, team);
  return `
    <div class="mini-team">
      <div class="mini-team__logo">
        <img src="${escapeAttribute(displayTeam.logo)}" alt="${escapeAttribute(displayTeam.logoAlt)}" />
      </div>
      <div>
        <p class="mini-team__name">${escapeHtml(displayTeam.name)}</p>
        <p class="mini-team__meta">${escapeHtml(displayTeam.miniMeta)}</p>
      </div>
    </div>
  `;
}

function getResolvedFinalFour(bracket) {
  if (!bracket) {
    return [];
  }

  return state.data.games
    .filter((game) => game.round === 5)
    .flatMap((game) => {
      const matchup = resolveGame(game, bracket.picks);
      return [matchup.top, matchup.bottom].filter(Boolean);
    });
}

function renderRoundProgress(bracket) {
  elements.roundProgress.innerHTML = `
    <div class="stack-list">
      ${getRoundTallies(bracket)
        .map(
          (tally) => `
            <div class="stack-item">
              <div>
                <p class="stack-item__label">${escapeHtml(tally.label)}</p>
                <p class="stack-item__meta">${tally.picked === tally.total ? "Wrapped up" : "Still picking winners"}</p>
              </div>
              <span class="stack-item__count">${tally.picked}/${tally.total}</span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderRecentPicks(bracket) {
  if (!bracket) {
    elements.recentPicks.innerHTML = `
      <p class="recent-empty">Start a bracket and your latest winners will stack up here.</p>
    `;
    return;
  }

  const pickedGames = getPickedGames(bracket).slice(-6).reverse();

  if (!pickedGames.length) {
    elements.recentPicks.innerHTML = `
      <p class="recent-empty">Start picking and your latest winners will stack up here.</p>
    `;
    return;
  }

  elements.recentPicks.innerHTML = `
    <div class="stack-list">
      ${pickedGames
        .map(
          ({ game, winner }) => `
            <div class="stack-item">
              <div>
                <p class="stack-item__label">${escapeHtml(getDisplayTeamName(bracket, winner))}</p>
                <p class="stack-item__meta">${escapeHtml(game.roundLabel)} • ${escapeHtml(getPreviewLabel(game, bracket.picks, bracket))}</p>
              </div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderBracketMobileBoard(bracket) {
  if (!bracket) {
    elements.bracketMobileBoard.innerHTML = `
      <section class="mobile-bracket-card mobile-bracket-card--special">
        <div class="mobile-bracket-card__header">
          <div>
            <p class="mobile-bracket-card__eyebrow">No bracket yet</p>
            <h3>Start with a mode</h3>
          </div>
        </div>
        <p class="recent-empty">Regular shows the real teams. Blindfold swaps in clues, cute code names, and a reveal at the end.</p>
      </section>
    `;
    return;
  }

  const sections = [];
  const firstFourGames = state.navigationGames.filter((game) => game.round === 0);
  const finalGames = state.navigationGames.filter((game) => game.round >= 4);

  if (firstFourGames.length) {
    sections.push(
      renderMobileBracketSection("First Four", "Play-in winners", firstFourGames, bracket)
    );
  }

  for (const region of state.data.regions) {
    sections.push(renderMobileRegionSection(region, bracket));
  }

  sections.push(
    renderMobileBracketSection("Final Four", "Semifinals and title game", finalGames, bracket)
  );

  elements.bracketMobileBoard.innerHTML = sections.join("");
}

function renderMobileRegionSection(region, bracket) {
  const rounds = [
    { label: "Round 1", games: getPosterGamesForRound(region.name, 1) },
    { label: "Round 2", games: getPosterGamesForRound(region.name, 2) },
    { label: "Sweet 16", games: getPosterGamesForRound(region.name, 3) },
    { label: "Elite 8", games: getPosterGamesForRound(region.name, 4) },
  ].filter((round) => round.games.length);

  const pickedCount = rounds.reduce(
    (total, round) => total + round.games.filter((game) => bracket.picks[game.id]).length,
    0
  );
  const gameCount = rounds.reduce((total, round) => total + round.games.length, 0);

  return `
    <section class="mobile-bracket-card">
      <div class="mobile-bracket-card__header">
        <div>
          <p class="mobile-bracket-card__eyebrow">Region</p>
          <h3>${escapeHtml(region.name)}</h3>
        </div>
        <span class="mobile-bracket-card__badge">${pickedCount}/${gameCount}</span>
      </div>
      <div class="mobile-round-stack">
        ${rounds
          .map(
            (round) => `
              <div class="mobile-round-group">
                <div class="mobile-round-group__header">
                  <h4>${escapeHtml(round.label)}</h4>
                  <span>${round.games.filter((game) => bracket.picks[game.id]).length}/${round.games.length}</span>
                </div>
                <div class="mobile-game-stack">
                  ${round.games.map((game) => renderMobileBracketGame(game, bracket)).join("")}
                </div>
              </div>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderMobileBracketSection(title, note, games, bracket) {
  const pickedCount = games.filter((game) => bracket.picks[game.id]).length;

  return `
    <section class="mobile-bracket-card mobile-bracket-card--special">
      <div class="mobile-bracket-card__header">
        <div>
          <p class="mobile-bracket-card__eyebrow">${escapeHtml(note)}</p>
          <h3>${escapeHtml(title)}</h3>
        </div>
        <span class="mobile-bracket-card__badge">${pickedCount}/${games.length}</span>
      </div>
      <div class="mobile-game-stack">
        ${games.map((game) => renderMobileBracketGame(game, bracket)).join("")}
      </div>
    </section>
  `;
}

function renderMobileBracketGame(game, bracket) {
  const slots = game.slots.map((slot) => getMobileBracketSlotDetails(slot, bracket.picks, bracket));
  const winnerId = bracket.picks[game.id] || null;
  const gameLabel = getPreviewLabel(game, bracket.picks, bracket);

  return `
    <article class="mobile-game-card ${winnerId ? "is-picked" : ""}">
      <p class="mobile-game-card__label">${escapeHtml(gameLabel)}</p>
      <div class="mobile-slot-stack">
        ${slots
          .map((slot) => renderMobileBracketSlot(slot, slot.team?.id === winnerId))
          .join("")}
      </div>
    </article>
  `;
}

function getMobileBracketSlotDetails(slot, picks, bracket) {
  if (slot.type === "team") {
    const team = state.teamsById[slot.teamId] || null;
    const displayTeam = team ? getDisplayTeamData(bracket, team) : null;
    return {
      team,
      displayTeam,
      label: displayTeam?.name || "TBD",
      note: displayTeam?.mobileNote || "Waiting on teams",
    };
  }

  const pickedTeamId = picks[slot.gameId];
  if (pickedTeamId) {
    const team = state.teamsById[pickedTeamId] || null;
    const displayTeam = team ? getDisplayTeamData(bracket, team) : null;
    return {
      team,
      displayTeam,
      label: displayTeam?.name || "TBD",
      note: displayTeam?.mobileNote || "Winner locked in",
    };
  }

  const sourceGame = state.gamesById.get(slot.gameId);
  if (sourceGame) {
    return {
      team: null,
      label: `Winner of ${sourceGame.title}`,
      note: sourceGame.roundLabel,
    };
  }

  return {
    team: null,
    label: "TBD",
    note: "Waiting on earlier game",
  };
}

function renderMobileBracketSlot(slot, isWinner) {
  return `
    <div class="mobile-slot ${isWinner ? "is-winner" : ""}">
      <div class="mobile-slot__logo-shell ${slot.team ? "" : "is-empty"}">
        ${
          slot.displayTeam
            ? `<img src="${escapeAttribute(slot.displayTeam.logo)}" alt="${escapeAttribute(slot.displayTeam.logoAlt)}" />`
            : `<span>?</span>`
        }
      </div>
      <div class="mobile-slot__copy">
        <p class="mobile-slot__name">${escapeHtml(slot.displayTeam?.name || slot.label)}</p>
        <p class="mobile-slot__meta">${escapeHtml(slot.note)}</p>
      </div>
      <span class="mobile-slot__tag">${isWinner ? "Picked" : slot.displayTeam ? escapeHtml(slot.displayTeam.mobileTag) : "Open"}</span>
    </div>
  `;
}

function renderViewMode(bracket, progress, currentContext) {
  const viewMode = bracket ? getViewMode() : "pick";
  document.body.dataset.viewMode = viewMode;
  elements.screenShell.classList.remove("is-transitioning");
  elements.screenShell.style.removeProperty("--screen-shell-transition-height");

  applyScreenPanelState(elements.pickerScreen, viewMode === "pick");
  applyScreenPanelState(elements.bracketScreen, viewMode === "bracket");

  elements.pickViewButton.classList.toggle("is-active", viewMode === "pick");
  elements.pickViewButton.setAttribute("aria-pressed", viewMode === "pick");
  elements.bracketViewButton.classList.toggle("is-active", viewMode === "bracket");
  elements.bracketViewButton.setAttribute("aria-pressed", viewMode === "bracket");
  elements.bracketViewButton.disabled = !bracket;
  elements.seeBracketButton.disabled = !bracket;
  elements.returnToPickButton.disabled = !bracket;
  elements.revealBlindfoldButton.hidden = !canRevealBlindfold(bracket);

  renderBracketViewHeader(bracket, progress, currentContext);
  scheduleBracketCanvasRender(bracket, { active: viewMode === "bracket" });
  applyBracketZoom();
}

function applyScreenPanelState(element, active) {
  element.hidden = !active;
  element.classList.toggle("screen-panel--active", active);
  element.classList.toggle("screen-panel--inactive", !active);
  element.classList.remove("screen-panel--entering", "screen-panel--exiting");
  element.setAttribute("aria-hidden", active ? "false" : "true");
}

function renderBracketViewHeader(bracket, progress, currentContext) {
  if (!bracket) {
    elements.bracketViewTitle.textContent = "Start a bracket";
    renderBracketViewChips(["Pick mode first"]);
    elements.bracketViewHint.textContent =
      "Pick regular mode for real teams or blindfold mode for clue-only mascot picking.";
    return;
  }

  const champion = getChampion(bracket);
  const nextOpen =
    currentContext.visibleGames.find((game) => !bracket.picks[game.id]) || currentContext.currentGame;
  const chips = [`${progress.pickedCount}/${progress.total} locked`];

  elements.bracketViewTitle.textContent = bracket.name || "Untitled bracket";
  chips.push(
    champion ? `Champion: ${getDisplayTeamName(bracket, champion)}` : "Champion slot open"
  );

  if (canRevealBlindfold(bracket)) {
    chips.push("Ready to reveal");
  } else if (nextOpen) {
    chips.push(`Next: ${getPreviewLabel(nextOpen, bracket.picks, bracket)}`);
  } else {
    chips.push("Board ready");
  }

  renderBracketViewChips(chips);
  elements.bracketViewHint.textContent = canRevealBlindfold(bracket)
    ? "Every pick is in. Take off the blindfold whenever you want to see the real teams."
    : champion
    ? "The board is filled in and ready for a full look."
    : nextOpen
      ? "This live board updates as you pick, so you can hop back to the next matchup without losing your place."
      : "Your live bracket board is ready for a full look.";
}

function renderBracketViewChips(chips) {
  elements.bracketViewChips.innerHTML = chips
    .filter(Boolean)
    .map((chip) => `<span class="bracket-screen__chip">${escapeHtml(chip)}</span>`)
    .join("");
}

async function renderBracketCanvas(bracket) {
  if (!bracket) {
    state.bracketCanvasSignature = null;
    elements.bracketCanvasWrap.innerHTML =
      '<p class="bracket-canvas-wrap__loading">Start a bracket to see the live board here.</p>';
    return;
  }

  const signature = `${bracket.id}:${bracket.updatedAt}`;
  if (
    state.bracketCanvasSignature === signature &&
    elements.bracketCanvasWrap.querySelector("canvas")
  ) {
    return;
  }

  const renderId = ++state.bracketCanvasRenderId;
  state.bracketCanvasSignature = signature;
  elements.bracketCanvasWrap.innerHTML =
    '<p class="bracket-canvas-wrap__loading">Building your bracket view...</p>';

  const canvas = document.createElement("canvas");
  canvas.className = "bracket-canvas";

  try {
    await renderPosterCanvas(canvas, bracket, { width: 2340, height: 1620 });
  } catch (error) {
    if (renderId !== state.bracketCanvasRenderId) {
      return;
    }

    elements.bracketCanvasWrap.innerHTML = `
      <div class="bracket-canvas-wrap__loading">
        Could not draw this bracket preview. Try exporting the poster again.
      </div>
    `;
    return;
  }

  if (renderId !== state.bracketCanvasRenderId) {
    return;
  }

  elements.bracketCanvasWrap.innerHTML = "";
  elements.bracketCanvasWrap.append(canvas);
  applyBracketZoom();
  resetBracketCanvasViewport();
}

function scheduleBracketCanvasRender(bracket, { active = false } = {}) {
  window.clearTimeout(state.bracketCanvasTimer);
  state.bracketCanvasTimer = null;

  if (!bracket) {
    renderBracketCanvas(null);
    return;
  }

  if (!active) {
    return;
  }

  const signature = `${bracket.id}:${bracket.updatedAt}`;
  const hasMatchingCanvas =
    state.bracketCanvasSignature === signature &&
    Boolean(elements.bracketCanvasWrap.querySelector("canvas"));

  if (hasMatchingCanvas) {
    return;
  }

  const renderCanvas = () => {
    state.bracketCanvasTimer = null;
    renderBracketCanvas(bracket);
  };

  if (!elements.bracketCanvasWrap.querySelector("canvas")) {
    elements.bracketCanvasWrap.innerHTML =
      '<p class="bracket-canvas-wrap__loading">Building your bracket view...</p>';
  }

  state.bracketCanvasTimer = window.setTimeout(renderCanvas, 24);
}

function scrollToViewStart(viewMode) {
  if (isCompactMobileViewport()) {
    if (window.scrollY > 4) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
    return;
  }

  const target = viewMode === "bracket" ? elements.bracketScreen : elements.pickerScreen;
  if (!target || target.hidden) {
    return;
  }

  const targetTop = Math.max(0, window.scrollY + target.getBoundingClientRect().top - 10);
  if (Math.abs(window.scrollY - targetTop) < 6) {
    return;
  }

  window.scrollTo({ top: targetTop, behavior: "auto" });
}

function attachEvents() {
  elements.pickViewButton.addEventListener("click", () => {
    setViewMode("pick");
  });

  elements.bracketViewButton.addEventListener("click", () => {
    setViewMode("bracket");
  });

  elements.returnToPickButton.addEventListener("click", () => {
    setViewMode("pick");
  });

  elements.installAppButton.addEventListener("click", async () => {
    if (!state.deferredInstallPrompt) {
      return;
    }

    const promptEvent = state.deferredInstallPrompt;
    state.deferredInstallPrompt = null;
    updateInstallButton();
    await promptEvent.prompt();

    try {
      const outcome = await promptEvent.userChoice;
      if (outcome?.outcome === "dismissed") {
        showToast("Install prompt dismissed.");
      }
    } catch {
      // Ignore user-choice lookup failures; the browser will re-fire when appropriate.
    }
  });

  if (elements.mobileToolbarToggleButton) {
    elements.mobileToolbarToggleButton.addEventListener("click", () => {
      if (!isCompactMobileViewport() || getViewMode() !== "bracket" || !getCurrentBracket()) {
        return;
      }

      state.mobileBracketToolsOpen = !state.mobileBracketToolsOpen;
      renderMobileToolbarToggle(getCurrentBracket());
    });
  }

  elements.zoomOutButton.addEventListener("click", () => {
    setBracketZoom(state.bracketZoom - BRACKET_ZOOM_STEP);
  });

  elements.fitBracketButton.addEventListener("click", () => {
    setBracketZoom(1);
    resetBracketCanvasViewport();
  });

  elements.zoomInButton.addEventListener("click", () => {
    setBracketZoom(state.bracketZoom + BRACKET_ZOOM_STEP);
  });

  elements.bracketSelect.addEventListener("change", (event) => {
    state.store.currentBracketId = event.target.value;
    state.activeGameId = null;
    state.bracketCanvasSignature = null;
    persistStore();
    render();
  });

  elements.newBracketButton.addEventListener("click", () => {
    openNewBracketModal();
  });

  elements.newBracketForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const typedName = elements.newBracketNameInput.value.trim() || state.pendingBracketName;
    elements.newBracketNameInput.setCustomValidity("");
    startNewBracket(typedName, state.pendingBracketMode);
  });

  elements.newBracketNameInput.addEventListener("input", () => {
    elements.newBracketNameInput.setCustomValidity("");
  });

  elements.newBracketModeInputs.forEach((input) => {
    input.addEventListener("change", (event) => {
      setPendingBracketMode(event.target.value);
      updateNewBracketModalCopy({ initial: state.newBracketModalLocked });
    });
  });

  if (elements.dismissNewBracketButton) {
    elements.dismissNewBracketButton.addEventListener("click", () => {
      closeNewBracketModal();
    });
  }

  elements.cancelNewBracketButton.addEventListener("click", () => {
    closeNewBracketModal();
  });

  elements.newBracketModal.addEventListener("click", (event) => {
    if (event.target !== elements.newBracketModal) {
      return;
    }

    closeNewBracketModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || elements.newBracketModal.hidden) {
      return;
    }

    event.preventDefault();
    closeNewBracketModal();
  });

  elements.deleteBracketButton.addEventListener("click", () => {
    const bracket = getCurrentBracket();
    if (!bracket) {
      return;
    }

    const deletingLastBracket = state.store.brackets.length === 1;
    const confirmMessage = deletingLastBracket
      ? `Delete "${bracket.name}"? A fresh blank bracket will be created right away.`
      : `Delete "${bracket.name}"? This removes its saved picks from this device.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    state.store.brackets = state.store.brackets.filter((item) => item.id !== bracket.id);
    if (deletingLastBracket) {
      const replacement = createBracket(nextBracketName(), { mode: bracket.mode });
      state.store.brackets = [replacement];
      state.store.currentBracketId = replacement.id;
    } else {
      ensureCurrentBracket();
    }
    state.activeGameId = null;
    state.bracketCanvasSignature = null;
    persistStore();
    render();
    showToast(deletingLastBracket ? "Bracket deleted. Fresh bracket ready." : "Bracket deleted.");
  });

  elements.bracketNameInput.addEventListener("input", (event) => {
    const bracket = getCurrentBracket();
    if (!bracket) {
      return;
    }

    bracket.name = event.target.value.slice(0, MAX_BRACKET_NAME);
    touchBracket(bracket);
    state.bracketCanvasSignature = null;
    persistStore();
    renderSnapshot(bracket);
    renderToolbar(bracket);
    renderBracketViewHeader(bracket, getProgress(bracket), getCurrentGameContext());
    if (getViewMode() === "bracket") {
      renderBracketCanvas(bracket);
    }
  });

  elements.bracketNameInput.addEventListener("blur", () => {
    const bracket = getCurrentBracket();
    if (!bracket) {
      return;
    }

    if (bracket.name.trim()) {
      return;
    }

    bracket.name = nextBracketName();
    touchBracket(bracket);
    state.bracketCanvasSignature = null;
    persistStore();
    render();
  });

  elements.resetButton.addEventListener("click", () => {
    const bracket = getCurrentBracket();
    if (!bracket) {
      return;
    }

    if (!window.confirm(`Reset every pick in "${bracket.name}"?`)) {
      return;
    }

    bracket.picks = {};
    touchBracket(bracket);
    state.activeGameId = null;
    state.bracketCanvasSignature = null;
    persistStore();
    render();
    showToast("All picks cleared.");
  });

  elements.prevGameButton.addEventListener("click", () => {
    const { currentIndex, visibleGames } = getCurrentGameContext();
    if (currentIndex <= 0) {
      return;
    }

    blurActiveControl();
    state.activeGameId = visibleGames[currentIndex - 1].id;
    render();
    stabilizeCompactPickerViewport();
  });

  elements.nextGameButton.addEventListener("click", () => {
    const { currentIndex, visibleGames } = getCurrentGameContext();
    if (currentIndex < 0 || currentIndex >= visibleGames.length - 1) {
      return;
    }

    blurActiveControl();
    state.activeGameId = visibleGames[currentIndex + 1].id;
    render();
    stabilizeCompactPickerViewport();
  });

  elements.clearPickButton.addEventListener("click", () => {
    if (!state.activeGameId) {
      return;
    }

    clearPick(state.activeGameId);
  });

  elements.seeBracketButton.addEventListener("click", () => {
    setViewMode("bracket");
  });

  elements.revealBlindfoldButton.addEventListener("click", () => {
    revealBlindfold();
  });

  elements.matchupStage.addEventListener("click", (event) => {
    const teamButton = event.target.closest("[data-team-pick]");
    if (teamButton && state.activeGameId) {
      setPick(state.activeGameId, teamButton.dataset.teamPick);
      return;
    }

    const actionButton = event.target.closest("[data-action='reveal-blindfold']");
    if (actionButton) {
      revealBlindfold();
    }
  });

  elements.snapshotCard.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action='reveal-blindfold']");
    if (actionButton) {
      revealBlindfold();
    }
  });

  elements.exportJsonButton.addEventListener("click", exportJson);
  elements.exportImageButton.addEventListener("click", exportPoster);
}

async function exportJson() {
  const bracket = getCurrentBracket();
  if (!bracket) {
    return;
  }

  const exportRelay = openMobileExportRelay(`${bracket.name} picks`);
  const snapshot = buildExportSnapshot(bracket);
  const fileName = `${slugifyFileName(bracket.name)}-2026-picks.json`;
  const result = await saveBlob(
    new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" }),
    fileName,
    `${bracket.name} picks`,
    exportRelay
  );
  if (result !== "cancelled") {
    showToast(
      result === "shared"
        ? "JSON ready to share."
        : result === "opened"
          ? "JSON opened in a new tab."
          : "JSON export ready."
    );
  }
}

function buildExportSnapshot(bracket) {
  const identitiesHidden = isBlindfoldHidden(bracket);
  const picks = state.navigationGames.map((game) => {
    const matchup = resolveGame(game, bracket.picks);
    const winnerId = bracket.picks[game.id] || null;

    return {
      gameId: game.id,
      round: game.roundLabel,
      region: game.region,
      title: game.title,
      teams: [
        matchup.top ? getDisplayTeamName(bracket, matchup.top) : null,
        matchup.bottom ? getDisplayTeamName(bracket, matchup.bottom) : null,
      ],
      winnerId: identitiesHidden ? null : winnerId,
      winnerName: winnerId ? getDisplayTeamName(bracket, state.teamsById[winnerId]) : null,
    };
  });

  return {
    exportedAt: new Date().toISOString(),
    bracketName: bracket.name,
    bracketMode: bracket.mode,
    blindfoldRevealed: Boolean(bracket.blindfoldRevealed),
    datasetId: state.data.meta.tournamentId,
    datasetSource: {
      sourceName: state.data.meta.sourceName,
      sourceUrl: state.data.meta.sourceUrl,
      sourceUpdatedLabel: state.data.meta.sourceUpdatedLabel,
      officialBracket: state.data.meta.officialBracket,
      note: state.data.meta.note,
    },
    progress: getProgress(bracket),
    champion: getChampion(bracket) ? getDisplayTeamName(bracket, getChampion(bracket)) : null,
    championId: identitiesHidden ? null : getChampion(bracket)?.id || null,
    blindfoldNote: identitiesHidden
      ? "Real team identities stay hidden in this export until the bracket reveal."
      : null,
    picks,
  };
}

async function exportPoster() {
  const bracket = getCurrentBracket();
  if (!bracket) {
    return;
  }

  const exportRelay = openMobileExportRelay(`${bracket.name} bracket poster`);
  const canvas = document.createElement("canvas");
  await renderPosterCanvas(canvas, bracket, { width: 2600, height: 1800 });

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const fileName = `${slugifyFileName(bracket.name)}-2026-poster.png`;
  const result = await saveBlob(blob, fileName, `${bracket.name} bracket poster`, exportRelay);
  if (result !== "cancelled") {
    showToast(
      result === "shared"
        ? "Poster ready to share."
        : result === "opened"
          ? "Poster opened in a new tab."
          : "Poster export ready."
    );
  }
}

async function renderPosterCanvas(canvas, bracket, { width, height }) {
  await document.fonts.ready;

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  const layout = buildPosterLayout(width, height);

  drawPosterBackground(ctx, width, height);
  await drawPosterHeader(ctx, bracket, layout);
  await drawPosterFirstFourRail(ctx, bracket, layout);

  const regionAnchors = {};
  for (const regionLayout of layout.regions) {
    regionAnchors[regionLayout.name] = await drawPosterRegion(ctx, regionLayout, bracket);
  }

  await drawPosterCenterBracket(ctx, layout, bracket, regionAnchors);
}

function buildPosterLayout(width, height) {
  const margin = 52;
  const headerHeight = 112;
  const stripHeight = 104;
  const gapAfterHeader = 18;
  const gapAfterStrip = 30;
  const bodyGapY = 50;
  const sideGapX = 40;
  const centerWidth = 560;
  const bodyY = margin + headerHeight + gapAfterHeader + stripHeight + gapAfterStrip;
  const bodyHeight = height - bodyY - margin;
  const regionWidth = (width - margin * 2 - centerWidth - sideGapX * 2) / 2;
  const regionHeight = (bodyHeight - bodyGapY) / 2;
  const leftX = margin;
  const centerX = leftX + regionWidth + sideGapX;
  const rightX = centerX + centerWidth + sideGapX;
  const topY = bodyY;
  const bottomY = bodyY + regionHeight + bodyGapY;

  return {
    width,
    height,
    header: { x: margin, y: margin, width: width - margin * 2, height: headerHeight },
    firstFour: {
      x: margin,
      y: margin + headerHeight + gapAfterHeader,
      width: width - margin * 2,
      height: stripHeight,
    },
    center: {
      x: centerX,
      y: bodyY,
      width: centerWidth,
      height: bodyHeight,
    },
    regions: [
      {
        name: "East",
        orientation: "left",
        x: leftX,
        y: topY,
        width: regionWidth,
        height: regionHeight,
      },
      {
        name: "Midwest",
        orientation: "left",
        x: leftX,
        y: bottomY,
        width: regionWidth,
        height: regionHeight,
      },
      {
        name: "South",
        orientation: "right",
        x: rightX,
        y: topY,
        width: regionWidth,
        height: regionHeight,
      },
      {
        name: "West",
        orientation: "right",
        x: rightX,
        y: bottomY,
        width: regionWidth,
        height: regionHeight,
      },
    ],
  };
}

function drawPosterBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#fff7eb");
  gradient.addColorStop(0.55, "#fffef9");
  gradient.addColorStop(1, "#edf7ff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const blobs = [
    { x: 180, y: 180, radius: 180, color: "rgba(255, 182, 70, 0.26)" },
    { x: 1360, y: 210, radius: 150, color: "rgba(103, 183, 255, 0.22)" },
    { x: 420, y: 1960, radius: 200, color: "rgba(111, 214, 169, 0.2)" },
  ];

  for (const blob of blobs) {
    const radial = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.radius);
    radial.addColorStop(0, blob.color);
    radial.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = radial;
    ctx.beginPath();
    ctx.arc(blob.x, blob.y, blob.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(35, 48, 61, 0.08)";
  for (let index = 0; index < 48; index += 1) {
    ctx.beginPath();
    ctx.arc(
      60 + (index * 71) % width,
      80 + ((index * 173) % height),
      index % 3 === 0 ? 4 : 2,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
}

async function drawPosterHeader(ctx, bracket, layout) {
  const { header } = layout;
  const champion = getChampion(bracket);
  const displayChampion = champion ? getDisplayTeamData(bracket, champion) : null;
  const progress = getProgress(bracket);
  const brandIcon = await loadImage("assets/brand/bracket-parade-icon.svg");

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  roundRect(ctx, header.x, header.y, header.width, header.height, 34);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.68)";
  roundRect(ctx, header.x + 16, header.y + 14, header.width - 32, header.height - 28, 26);
  ctx.fill();

  ctx.drawImage(brandIcon, header.x + 24, header.y + 24, 64, 64);

  ctx.fillStyle = "#5c6a79";
  ctx.font = '800 18px "Nunito"';
  ctx.fillText(
    state.data.meta.officialBracket
      ? `Official field • ${state.data.meta.sourceUpdatedLabel}`
      : `Projected field • ${state.data.meta.sourceUpdatedLabel}`,
    header.x + 108,
    header.y + 34
  );

  ctx.fillStyle = "#23303d";
  ctx.font = '400 46px "Bungee"';
  ctx.fillText("BRACKET PARADE", header.x + 108, header.y + 74);

  ctx.fillStyle = "#23303d";
  ctx.font = '800 38px "Baloo 2"';
  ctx.fillText(truncateText(ctx, bracket.name, 1120), header.x + 108, header.y + 108);

  const pills = [
    {
      label: "Picks made",
      value: `${progress.pickedCount}/${progress.total}`,
      tint: "#fff0d7",
    },
    {
      label: "Mode",
      value: getBracketModeLabel(bracket),
      tint: "#e6f3ff",
    },
    {
      label: "Champion",
      value: displayChampion ? truncateText(ctx, displayChampion.compactName, 180) : "Still open",
      tint: displayChampion ? hexToRgba(displayChampion.theme.color, 0.18) : "#eef1f5",
      logo: displayChampion?.logo || null,
    },
  ];

  let pillX = header.x + header.width - 3 * 230 - 24;
  for (const pill of pills) {
    await drawPosterHeaderPill(ctx, {
      x: pillX,
      y: header.y + 20,
      width: 210,
      height: 72,
      ...pill,
    });
    pillX += 230;
  }
}

async function drawPosterHeaderPill(ctx, { x, y, width, height, label, value, tint, logo }) {
  ctx.fillStyle = tint;
  roundRect(ctx, x, y, width, height, 24);
  ctx.fill();

  ctx.fillStyle = "#5c6a79";
  ctx.font = '800 14px "Nunito"';
  ctx.fillText(label, x + 16, y + 22);

  let valueX = x + 16;
  if (logo) {
    drawPosterLogoPlate(ctx, x + 12, y + 28, 32, 32, 12);
    const image = await loadImage(logo);
    ctx.drawImage(image, x + 18, y + 34, 20, 20);
    valueX = x + 50;
  }

  ctx.fillStyle = "#23303d";
  ctx.font = '800 28px "Baloo 2"';
  ctx.fillText(truncateText(ctx, value, width - (valueX - x) - 16), valueX, y + 54);
}

async function drawPosterFirstFourRail(ctx, bracket, layout) {
  const games = state.navigationGames.filter((game) => game.round === 0);
  const { firstFour } = layout;
  const labelWidth = 144;
  const gap = 14;
  const cardWidth = (firstFour.width - labelWidth - 28 - gap * 3) / 4;
  const cardHeight = 74;
  let x = firstFour.x + labelWidth;

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  roundRect(ctx, firstFour.x, firstFour.y, firstFour.width, firstFour.height, 28);
  ctx.fill();

  ctx.fillStyle = "#23303d";
  ctx.font = '800 26px "Baloo 2"';
  ctx.fillText("First Four", firstFour.x + 24, firstFour.y + 44);

  ctx.fillStyle = "#5c6a79";
  ctx.font = '800 16px "Nunito"';
  ctx.fillText("Play-in games", firstFour.x + 24, firstFour.y + 68);

  for (const game of games) {
    const theme = state.regionThemes[game.region] || CHAMPIONSHIP_THEME;

    ctx.fillStyle = "rgba(255,255,255,0.92)";
    roundRect(ctx, x, firstFour.y + 16, cardWidth, cardHeight, 22);
    ctx.fill();

    ctx.fillStyle = hexToRgba(theme.color, 0.12);
    roundRect(ctx, x + 10, firstFour.y + 24, cardWidth - 20, cardHeight - 22, 16);
    ctx.fill();

    ctx.fillStyle = "#5c6a79";
    ctx.font = '800 14px "Nunito"';
    ctx.fillText(
      isBlindfoldHidden(bracket) ? `${game.region} play-in` : `${game.region} No. ${game.seedLine}`,
      x + 16,
      firstFour.y + 34
    );

    await drawPosterGameBox(
      ctx,
      game,
      { x: x + 12, y: firstFour.y + 38, width: cardWidth - 24, height: 40 },
      bracket,
      { neutralColor: theme.color, compact: true }
    );

    x += cardWidth + gap;
  }
}

async function drawPosterRegion(ctx, regionLayout, bracket) {
  const theme = state.regionThemes[regionLayout.name] || CHAMPIONSHIP_THEME;
  const positions = buildRegionBracketPositions(regionLayout);
  const gamesByRound = {
    1: getPosterGamesForRound(regionLayout.name, 1),
    2: getPosterGamesForRound(regionLayout.name, 2),
    3: getPosterGamesForRound(regionLayout.name, 3),
    4: getPosterGamesForRound(regionLayout.name, 4),
  };

  drawPosterRegionPanel(ctx, regionLayout, theme, positions);
  drawPosterRegionConnectors(ctx, gamesByRound, positions, bracket, regionLayout.orientation, theme);

  for (const round of [1, 2, 3, 4]) {
    for (const game of gamesByRound[round]) {
      await drawPosterGameBox(ctx, game, positions.get(game.id), bracket, {
        neutralColor: theme.color,
      });
    }
  }

  const finalGame = gamesByRound[4][0];
  return {
    theme,
    championAnchor: getPosterWinnerAnchor(
      finalGame,
      positions.get(finalGame.id),
      bracket,
      regionLayout.orientation
    ),
  };
}

function drawPosterRegionPanel(ctx, regionLayout, theme, positions) {
  ctx.fillStyle = "rgba(255,255,255,0.84)";
  roundRect(
    ctx,
    regionLayout.x,
    regionLayout.y,
    regionLayout.width,
    regionLayout.height,
    32
  );
  ctx.fill();

  ctx.fillStyle = hexToRgba(theme.color, 0.08);
  roundRect(
    ctx,
    regionLayout.x + 12,
    regionLayout.y + 12,
    regionLayout.width - 24,
    regionLayout.height - 24,
    24
  );
  ctx.fill();

  ctx.strokeStyle = hexToRgba(theme.color, 0.28);
  ctx.lineWidth = 2;
  roundRect(
    ctx,
    regionLayout.x,
    regionLayout.y,
    regionLayout.width,
    regionLayout.height,
    32
  );
  ctx.stroke();

  ctx.fillStyle = theme.color;
  roundRect(ctx, regionLayout.x + 18, regionLayout.y + 16, 152, 42, 20);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = '800 24px "Baloo 2"';
  ctx.fillText(regionLayout.name, regionLayout.x + 36, regionLayout.y + 44);

  const labels = {
    1: "Round 1",
    2: "Round 2",
    3: "Sweet 16",
    4: "Elite 8",
  };

  ctx.fillStyle = "#5c6a79";
  ctx.font = '800 15px "Nunito"';
  for (const round of [1, 2, 3, 4]) {
    const sample = positions.get(getPosterGamesForRound(regionLayout.name, round)[0].id);
    const labelX = sample.x + sample.width / 2;
    ctx.textAlign = "center";
    ctx.fillText(labels[round], labelX, regionLayout.y + 72);
  }
  ctx.textAlign = "left";
}

function buildRegionBracketPositions(regionLayout) {
  const boxHeight = 60;
  const boxWidths = {
    1: 210,
    2: 194,
    3: 178,
    4: 166,
  };
  const gap = 18;
  const startY = regionLayout.y + 112;
  const firstRoundGap = 12;
  const positions = new Map();
  const roundOneGames = getPosterGamesForRound(regionLayout.name, 1);
  const roundColumns = {};

  if (regionLayout.orientation === "left") {
    roundColumns[1] = regionLayout.x + 18;
    roundColumns[2] = roundColumns[1] + boxWidths[1] + gap;
    roundColumns[3] = roundColumns[2] + boxWidths[2] + gap;
    roundColumns[4] = roundColumns[3] + boxWidths[3] + gap;
  } else {
    roundColumns[1] = regionLayout.x + regionLayout.width - 18 - boxWidths[1];
    roundColumns[2] = roundColumns[1] - gap - boxWidths[2];
    roundColumns[3] = roundColumns[2] - gap - boxWidths[3];
    roundColumns[4] = roundColumns[3] - gap - boxWidths[4];
  }

  let previousCenters = [];
  for (const [index, game] of roundOneGames.entries()) {
    const y = startY + index * (boxHeight + firstRoundGap);
    positions.set(game.id, createPosterRect(roundColumns[1], y, boxWidths[1], boxHeight));
    previousCenters.push(y + boxHeight / 2);
  }

  for (const round of [2, 3, 4]) {
    const games = getPosterGamesForRound(regionLayout.name, round);
    const currentCenters = [];

    for (const [index, game] of games.entries()) {
      const centerY = (previousCenters[index * 2] + previousCenters[index * 2 + 1]) / 2;
      positions.set(
        game.id,
        createPosterRect(roundColumns[round], centerY - boxHeight / 2, boxWidths[round], boxHeight)
      );
      currentCenters.push(centerY);
    }

    previousCenters = currentCenters;
  }

  return positions;
}

function createPosterRect(x, y, width, height) {
  const slotRects = getPosterSlotRects({ x, y, width, height });
  return {
    x,
    y,
    width,
    height,
    centerY: y + height / 2,
    slotYs: slotRects.map((slotRect) => slotRect.y + slotRect.height / 2),
  };
}

function getPosterGamesForRound(region, round) {
  return state.navigationGames.filter((game) => game.region === region && game.round === round);
}

function drawPosterRegionConnectors(
  ctx,
  gamesByRound,
  positions,
  bracket,
  orientation,
  theme
) {
  for (const [sourceRound, targetRound] of [
    [1, 2],
    [2, 3],
    [3, 4],
  ]) {
    for (const game of gamesByRound[targetRound]) {
      game.slots.forEach((slot, slotIndex) => {
        if (slot.type !== "winner") {
          return;
        }

        const sourceGame = state.gamesById.get(slot.gameId);
        const sourceRect = positions.get(sourceGame.id);
        const targetRect = positions.get(game.id);
        const from = getPosterWinnerAnchor(sourceGame, sourceRect, bracket, orientation);
        const to = getPosterTargetAnchor(targetRect, slotIndex, orientation);
        const color = getPosterConnectionColor(sourceGame, bracket, theme.color);
        drawPosterConnector(ctx, from, to, color);
      });
    }
  }
}

async function drawPosterCenterBracket(ctx, layout, bracket, regionAnchors) {
  const { center } = layout;
  const semiHeight = 68;
  const semiWidth = 234;
  const titleWidth = 308;
  const titleHeight = 82;
  const semifinalOne = state.gamesById.get("final-four-g1");
  const semifinalTwo = state.gamesById.get("final-four-g2");
  const titleGame = state.gamesById.get("championship");
  const semiY = center.y + 332;
  const leftSemiRect = createPosterRect(center.x + 26, semiY, semiWidth, semiHeight);
  const rightSemiRect = createPosterRect(
    center.x + center.width - semiWidth - 26,
    semiY,
    semiWidth,
    semiHeight
  );
  const titleRect = createPosterRect(
    center.x + (center.width - titleWidth) / 2,
    semiY + 180,
    titleWidth,
    titleHeight
  );
  const titleLabelRect = {
    x: center.x + (center.width - 260) / 2,
    y: titleRect.y - 52,
    width: 260,
    height: 34,
  };
  const leftTitleLaneX = titleRect.x - 20;
  const rightTitleLaneX = titleRect.x + titleRect.width + 20;

  ctx.fillStyle = "rgba(255,255,255,0.84)";
  roundRect(ctx, center.x, center.y, center.width, center.height, 34);
  ctx.fill();

  ctx.fillStyle = "rgba(35, 48, 61, 0.03)";
  roundRect(ctx, center.x + 14, center.y + 14, center.width - 28, center.height - 28, 28);
  ctx.fill();

  ctx.fillStyle = "#23303d";
  ctx.font = '800 34px "Baloo 2"';
  ctx.fillText("Final Four", center.x + 24, center.y + 50);

  ctx.fillStyle = "#5c6a79";
  ctx.font = '800 16px "Nunito"';
  ctx.fillText("Regional champions move through the center lane to the title game.", center.x + 24, center.y + 74);

  drawPosterConnector(
    ctx,
    regionAnchors.East.championAnchor,
    getPosterTargetAnchor(leftSemiRect, 0, "left"),
    getPosterConnectionColor(semifinalOne, bracket, regionAnchors.East.theme.color)
  );
  drawPosterConnector(
    ctx,
    regionAnchors.Midwest.championAnchor,
    getPosterTargetAnchor(leftSemiRect, 1, "left"),
    getPosterConnectionColor(semifinalOne, bracket, regionAnchors.Midwest.theme.color)
  );
  drawPosterConnector(
    ctx,
    regionAnchors.South.championAnchor,
    getPosterTargetAnchor(rightSemiRect, 0, "right"),
    getPosterConnectionColor(semifinalTwo, bracket, regionAnchors.South.theme.color)
  );
  drawPosterConnector(
    ctx,
    regionAnchors.West.championAnchor,
    getPosterTargetAnchor(rightSemiRect, 1, "right"),
    getPosterConnectionColor(semifinalTwo, bracket, regionAnchors.West.theme.color)
  );

  await drawPosterGameBox(ctx, semifinalOne, leftSemiRect, bracket, {
    neutralColor: "#ff8a5b",
  });
  await drawPosterGameBox(ctx, semifinalTwo, rightSemiRect, bracket, {
    neutralColor: "#63b7ff",
  });

  ctx.fillStyle = "rgba(255,255,255,0.96)";
  roundRect(
    ctx,
    titleLabelRect.x,
    titleLabelRect.y,
    titleLabelRect.width,
    titleLabelRect.height,
    17
  );
  ctx.fill();

  ctx.strokeStyle = "rgba(35, 48, 61, 0.08)";
  ctx.lineWidth = 1.5;
  roundRect(
    ctx,
    titleLabelRect.x,
    titleLabelRect.y,
    titleLabelRect.width,
    titleLabelRect.height,
    17
  );
  ctx.stroke();

  ctx.fillStyle = "#23303d";
  ctx.font = '800 22px "Baloo 2"';
  ctx.textAlign = "center";
  ctx.fillText(
    "National Championship",
    titleLabelRect.x + titleLabelRect.width / 2,
    titleLabelRect.y + 23
  );
  ctx.textAlign = "left";

  drawPosterCenterConnector(
    ctx,
    getPosterWinnerAnchor(semifinalOne, leftSemiRect, bracket, "left"),
    getPosterTargetAnchor(titleRect, 0, "left"),
    leftTitleLaneX,
    getPosterConnectionColor(semifinalOne, bracket, "#ff8a5b")
  );
  drawPosterCenterConnector(
    ctx,
    getPosterWinnerAnchor(semifinalTwo, rightSemiRect, bracket, "right"),
    getPosterTargetAnchor(titleRect, 1, "right"),
    rightTitleLaneX,
    getPosterConnectionColor(semifinalTwo, bracket, "#63b7ff")
  );

  await drawPosterGameBox(ctx, titleGame, titleRect, bracket, {
    neutralColor: CHAMPIONSHIP_THEME.color,
    emphasize: true,
  });

  await drawPosterChampionBadge(ctx, bracket, {
    x: center.x + 38,
    y: titleRect.y + 118,
    width: center.width - 76,
    height: 178,
  });
}

async function drawPosterChampionBadge(ctx, bracket, rect) {
  const champion = getChampion(bracket);
  const displayChampion = champion ? getDisplayTeamData(bracket, champion) : null;

  ctx.fillStyle = "rgba(255,255,255,0.94)";
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 28);
  ctx.fill();

  ctx.fillStyle = champion ? "rgba(255, 182, 70, 0.18)" : "rgba(35, 48, 61, 0.06)";
  roundRect(ctx, rect.x + 14, rect.y + 14, rect.width - 28, rect.height - 28, 22);
  ctx.fill();

  ctx.fillStyle = "#5c6a79";
  ctx.font = '800 16px "Nunito"';
  ctx.fillText(isBlindfoldHidden(bracket) ? "Blindfold champion" : "Champion pick", rect.x + 22, rect.y + 28);

  if (!champion) {
    ctx.fillStyle = "#23303d";
    ctx.font = '800 34px "Baloo 2"';
    ctx.fillText("Your winner is still open", rect.x + 22, rect.y + 86);
    ctx.fillStyle = "#5c6a79";
    ctx.font = '800 19px "Nunito"';
    ctx.fillText("Make more picks and export again to lock the trophy in.", rect.x + 22, rect.y + 120);
    return;
  }

  const theme = getDisplayTeamTheme(bracket, champion);
  const image = await loadImage(displayChampion.logo);

  drawPosterLogoPlate(ctx, rect.x + 22, rect.y + 44, 116, 116, 26, {
    shadowColor: "rgba(31, 42, 58, 0.14)",
  });
  ctx.fillStyle = hexToRgba(theme.color, 0.16);
  roundRect(ctx, rect.x + 30, rect.y + 52, 100, 100, 22);
  ctx.fill();
  ctx.drawImage(image, rect.x + 48, rect.y + 70, 64, 64);

  ctx.fillStyle = "#23303d";
  ctx.font = '800 42px "Baloo 2"';
  ctx.fillText(truncateText(ctx, displayChampion.compactName, rect.width - 198), rect.x + 164, rect.y + 90);

  ctx.fillStyle = "#5c6a79";
  ctx.font = '800 21px "Nunito"';
  ctx.fillText(truncateText(ctx, displayChampion.championMeta, rect.width - 198), rect.x + 164, rect.y + 128);

  ctx.fillStyle = theme.color;
  roundRect(ctx, rect.x + 164, rect.y + 146, 198, 26, 13);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = '800 15px "Nunito"';
  ctx.fillText("Trophy locked in", rect.x + 182, rect.y + 164);
}

async function drawPosterGameBox(ctx, game, rect, bracket, options = {}) {
  const {
    neutralColor = "#8893a0",
    compact = false,
    emphasize = false,
  } = options;
  const slots = getPosterGameSlots(game, bracket.picks, bracket);
  const winnerId = bracket.picks[game.id] || null;
  const winnerIndex = slots.findIndex((slot) => slot.team?.id === winnerId);
  const slotRects = getPosterSlotRects(rect);
  const borderColor = emphasize
    ? hexToRgba(CHAMPIONSHIP_THEME.color, 0.45)
    : hexToRgba(neutralColor, 0.25);

  ctx.fillStyle = "rgba(255,255,255,0.96)";
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, compact ? 16 : 18);
  ctx.fill();

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = emphasize ? 3 : 2;
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, compact ? 16 : 18);
  ctx.stroke();

  for (const [index, slotRect] of slotRects.entries()) {
    const slot = slots[index];
    const isWinner = index === winnerIndex;
    const fillColor =
      isWinner && slot.team
        ? hexToRgba(getDisplayTeamTheme(bracket, slot.team).color, 0.18)
        : slot.team
          ? "rgba(255,255,255,0.92)"
          : "rgba(35, 48, 61, 0.045)";

    ctx.fillStyle = fillColor;
    roundRect(ctx, slotRect.x, slotRect.y, slotRect.width, slotRect.height, compact ? 12 : 14);
    ctx.fill();

    await drawPosterSlot(ctx, slot, slotRect, {
      isWinner,
      compact,
    });
  }
}

async function drawPosterSlot(ctx, slot, slotRect, { isWinner, compact }) {
  const iconSize = compact ? 10 : 16;
  const iconShell = compact ? 14 : 20;

  ctx.save();
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillStyle = isWinner ? "#23303d" : slot.team ? "#2d3948" : "#7b8791";
  ctx.font = compact ? '800 12px "Nunito"' : '800 14px "Nunito"';

  let textX = slotRect.x + 10;
  if (slot.displayTeam) {
    const image = await loadImage(slot.displayTeam.logo);
    const shellX = slotRect.x + 6;
    const shellY = slotRect.y + 3;
    drawPosterLogoPlate(ctx, shellX, shellY, iconShell, iconShell, compact ? 6 : 8, {
      shadowBlur: compact ? 5 : 7,
      shadowOffsetY: compact ? 2 : 3,
      innerAlpha: 0.94,
    });
    ctx.drawImage(
      image,
      shellX + (iconShell - iconSize) / 2,
      shellY + (iconShell - iconSize) / 2,
      iconSize,
      iconSize
    );
    textX = slotRect.x + (compact ? 24 : 32);
    ctx.fillStyle = isWinner ? "#23303d" : "#2d3948";
  } else {
    ctx.fillStyle = "#7b8791";
  }

  const maxWidth = slotRect.width - (textX - slotRect.x) - (isWinner ? 20 : 10);
  ctx.fillText(truncateText(ctx, slot.label, maxWidth), textX, slotRect.y + slotRect.height / 2 + 1);

  if (isWinner) {
    ctx.fillStyle = "#1c8e5a";
    ctx.beginPath();
    ctx.arc(slotRect.x + slotRect.width - 11, slotRect.y + slotRect.height / 2, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function getPosterGameSlots(game, picks, bracket) {
  return game.slots.map((slot) => getPosterSlotDetails(slot, picks, bracket));
}

function getPosterSlotDetails(slot, picks, bracket) {
  if (slot.type === "team") {
    const team = state.teamsById[slot.teamId] || null;
    const displayTeam = team ? getDisplayTeamData(bracket, team) : null;
    return {
      team,
      displayTeam,
      label: displayTeam?.slotLabel || "TBD",
    };
  }

  const pickedTeamId = picks[slot.gameId];
  if (pickedTeamId) {
    const team = state.teamsById[pickedTeamId] || null;
    const displayTeam = team ? getDisplayTeamData(bracket, team) : null;
    return {
      team,
      displayTeam,
      label: displayTeam?.slotLabel || "TBD",
    };
  }

  const sourceGame = state.gamesById.get(slot.gameId);
  if (sourceGame?.round === 0) {
    const sourceTeams = sourceGame.slots
      .map((sourceSlot) => state.teamsById[sourceSlot.teamId] || null)
      .filter(Boolean)
      .map((team) => getDisplayTeamData(bracket, team)?.compactName || "TBD");

    return {
      team: null,
      displayTeam: null,
      label: isBlindfoldHidden(bracket) ? "Play-in winner" : sourceTeams.join(" / ") || "Play-in winner",
    };
  }

  return {
    team: null,
    displayTeam: null,
    label: "TBD",
  };
}

function getPosterSlotRects(rect) {
  const inset = 4;
  const gap = 4;
  const slotHeight = (rect.height - inset * 2 - gap) / 2;

  return [
    {
      x: rect.x + inset,
      y: rect.y + inset,
      width: rect.width - inset * 2,
      height: slotHeight,
    },
    {
      x: rect.x + inset,
      y: rect.y + inset + slotHeight + gap,
      width: rect.width - inset * 2,
      height: slotHeight,
    },
  ];
}

function getPosterWinnerAnchor(game, rect, bracket, orientation) {
  const winnerId = bracket.picks[game.id] || null;
  const slots = getPosterGameSlots(game, bracket.picks, bracket);
  const winnerIndex = slots.findIndex((slot) => slot.team?.id === winnerId);

  return {
    x: orientation === "left" ? rect.x + rect.width : rect.x,
    y: winnerIndex >= 0 ? rect.slotYs[winnerIndex] : rect.centerY,
  };
}

function getPosterTargetAnchor(rect, slotIndex, orientation) {
  return {
    x: orientation === "left" ? rect.x : rect.x + rect.width,
    y: rect.slotYs[slotIndex],
  };
}

function getPosterConnectionColor(game, bracket, fallbackColor) {
  const winnerId = bracket.picks[game.id] || null;
  const winner = winnerId ? state.teamsById[winnerId] || null : null;
  return winner
    ? hexToRgba(getDisplayTeamTheme(bracket, winner).color, 0.86)
    : hexToRgba(fallbackColor, 0.34);
}

function drawPosterConnector(ctx, from, to, color) {
  const midX = (from.x + to.x) / 2;
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(midX, from.y);
  ctx.lineTo(midX, to.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

function drawPosterCenterConnector(ctx, from, to, laneX, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(laneX, from.y);
  ctx.lineTo(laneX, to.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

function drawPosterLogoPlate(
  ctx,
  x,
  y,
  width,
  height,
  radius,
  options = {}
) {
  const {
    shadowColor = "rgba(31, 42, 58, 0.12)",
    shadowBlur = 8,
    shadowOffsetY = 3,
    innerAlpha = 0.96,
  } = options;

  ctx.save();
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetY = shadowOffsetY;
  const gradient = ctx.createLinearGradient(x, y, x, y + height);
  gradient.addColorStop(0, `rgba(255,255,255,${Math.min(innerAlpha + 0.03, 1)})`);
  gradient.addColorStop(1, `rgba(245,239,229,${innerAlpha})`);
  ctx.fillStyle = gradient;
  roundRect(ctx, x, y, width, height, radius);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.74)";
  ctx.lineWidth = 1.25;
  roundRect(ctx, x + 0.5, y + 0.5, width - 1, height - 1, Math.max(radius - 1, 0));
  ctx.stroke();
  ctx.restore();
}

function buildBlindfoldLogo({ alias, animal, palette, shape, pattern }) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="${escapeSvgText(alias)} mascot logo">
      <title>${escapeSvgText(alias)}</title>
      <rect x="4" y="4" width="112" height="112" rx="30" fill="${palette.tint}" stroke="${palette.glow}" stroke-width="4" />
      ${getBlindfoldPatternMarkup(pattern, palette)}
      <g opacity="0.18" transform="translate(0 5)">${getBlindfoldShapeMarkup(shape, palette)}</g>
      <rect x="16" y="16" width="88" height="88" rx="28" fill="#ffffff" opacity="0.52" stroke="${palette.glow}" stroke-width="2.6" />
      <circle cx="60" cy="64" r="29" fill="#fffdf9" opacity="0.9" />
      ${getBlindfoldAnimalMarkup(animal, palette)}
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getBlindfoldAnimalMarkup(animal, palette) {
  const art = BLINDFOLD_ANIMAL_ART[animal] || "bear";
  const color = palette.color;
  const glow = palette.glow;
  const ink = palette.accent;
  const cream = "#fffdf8";
  const blush = hexToRgba(color, 0.18);
  const mask = hexToRgba(ink, 0.15);

  if (art === "bunny") {
    return `
      <ellipse cx="46" cy="34" rx="10" ry="24" fill="${glow}" stroke="${color}" stroke-width="2.4" />
      <ellipse cx="74" cy="34" rx="10" ry="24" fill="${glow}" stroke="${color}" stroke-width="2.4" />
      <ellipse cx="46" cy="36" rx="4" ry="14" fill="${blush}" />
      <ellipse cx="74" cy="36" rx="4" ry="14" fill="${blush}" />
      <circle cx="60" cy="66" r="27" fill="${glow}" stroke="${color}" stroke-width="2.6" />
      <ellipse cx="60" cy="75" rx="15" ry="11" fill="${cream}" />
      <circle cx="50" cy="62" r="3.3" fill="${ink}" />
      <circle cx="70" cy="62" r="3.3" fill="${ink}" />
      <ellipse cx="60" cy="71" rx="5" ry="3.8" fill="${ink}" />
      <path d="M54 78q6 5 12 0" fill="none" stroke="${ink}" stroke-width="2.4" stroke-linecap="round" />
    `;
  }

  if (art === "fox") {
    return `
      <path d="M60 30 81 46 75 80Q68 89 60 95Q52 89 45 80L39 46Z" fill="${color}" stroke="${ink}" stroke-width="2.2" />
      <path d="M48 42 38 28 34 48Z" fill="${color}" stroke="${ink}" stroke-width="2" />
      <path d="M72 42 82 28 86 48Z" fill="${color}" stroke="${ink}" stroke-width="2" />
      <path d="M60 55 78 82H42Z" fill="${cream}" />
      <circle cx="50" cy="61" r="3.1" fill="${ink}" />
      <circle cx="70" cy="61" r="3.1" fill="${ink}" />
      <ellipse cx="60" cy="70" rx="4.7" ry="3.6" fill="${ink}" />
      <path d="M54 76q6 4 12 0" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round" />
    `;
  }

  if (art === "koala") {
    return `
      <circle cx="39" cy="55" r="15" fill="${color}" opacity="0.95" />
      <circle cx="81" cy="55" r="15" fill="${color}" opacity="0.95" />
      <circle cx="39" cy="55" r="7" fill="${glow}" opacity="0.85" />
      <circle cx="81" cy="55" r="7" fill="${glow}" opacity="0.85" />
      <circle cx="60" cy="66" r="27" fill="${glow}" stroke="${color}" stroke-width="2.6" />
      <circle cx="50" cy="62" r="3.3" fill="${ink}" />
      <circle cx="70" cy="62" r="3.3" fill="${ink}" />
      <ellipse cx="60" cy="72" rx="10" ry="8.5" fill="${ink}" />
      <path d="M54 80q6 4 12 0" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round" />
    `;
  }

  if (art === "puffin") {
    return `
      <path d="M60 36c17 0 29 12 29 29S77 94 60 94 31 82 31 65s12-29 29-29z" fill="${ink}" />
      <path d="M60 44c13 0 22 9 22 22S73 88 60 88 38 79 38 66s9-22 22-22z" fill="${cream}" />
      <ellipse cx="49" cy="62" rx="4.2" ry="5.6" fill="${ink}" />
      <ellipse cx="71" cy="62" rx="4.2" ry="5.6" fill="${ink}" />
      <path d="M60 68h20c-3 9-10 15-20 17-6-1-10-6-10-11 0-4 3-6 10-6z" fill="#f6a34c" />
      <path d="M60 68h12" stroke="${cream}" stroke-width="2.4" stroke-linecap="round" />
      <path d="M38 42l9 10M82 42l-9 10" stroke="${ink}" stroke-width="4" stroke-linecap="round" />
    `;
  }

  if (art === "raccoon") {
    return `
      <circle cx="44" cy="45" r="8.5" fill="${ink}" />
      <circle cx="76" cy="45" r="8.5" fill="${ink}" />
      <circle cx="60" cy="66" r="27" fill="${glow}" stroke="${ink}" stroke-width="2.2" />
      <path d="M38 60c8-9 36-9 44 0-6 11-15 16-22 16s-16-5-22-16z" fill="${mask}" />
      <circle cx="50" cy="63" r="3.3" fill="${ink}" />
      <circle cx="70" cy="63" r="3.3" fill="${ink}" />
      <ellipse cx="60" cy="72" rx="5.5" ry="4" fill="${ink}" />
      <path d="M44 74h10M66 74h10" stroke="${ink}" stroke-width="2" stroke-linecap="round" />
      <path d="M55 79q5 4 10 0" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round" />
    `;
  }

  if (art === "cat") {
    return `
      <path d="M41 50 48 31l12 15" fill="${color}" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round" />
      <path d="M79 50 72 31 60 46" fill="${color}" stroke="${ink}" stroke-width="2.2" stroke-linejoin="round" />
      <circle cx="60" cy="67" r="27" fill="${glow}" stroke="${color}" stroke-width="2.6" />
      <circle cx="50" cy="62" r="3.2" fill="${ink}" />
      <circle cx="70" cy="62" r="3.2" fill="${ink}" />
      <path d="M60 69l-4 6h8z" fill="${ink}" />
      <path d="M54 77q6 5 12 0" fill="none" stroke="${ink}" stroke-width="2.1" stroke-linecap="round" />
      <path d="M40 70h12M38 76h13M68 70h12M69 76h13" stroke="${ink}" stroke-width="2" stroke-linecap="round" />
    `;
  }

  if (art === "owl") {
    return `
      <path d="M44 40l8 8M76 40l-8 8" stroke="${color}" stroke-width="6" stroke-linecap="round" />
      <path d="M60 38c18 0 29 12 29 31S78 97 60 97 31 86 31 69s11-31 29-31z" fill="${color}" stroke="${ink}" stroke-width="2.2" />
      <circle cx="49" cy="64" r="10" fill="${cream}" />
      <circle cx="71" cy="64" r="10" fill="${cream}" />
      <circle cx="49" cy="64" r="4.4" fill="${ink}" />
      <circle cx="71" cy="64" r="4.4" fill="${ink}" />
      <path d="M60 70l-5 7h10z" fill="#f4a340" />
      <path d="M48 84q12 8 24 0" fill="none" stroke="${glow}" stroke-width="4" stroke-linecap="round" />
    `;
  }

  if (art === "turtle") {
    return `
      <ellipse cx="60" cy="66" rx="24" ry="20" fill="${color}" stroke="${ink}" stroke-width="2.4" />
      <circle cx="60" cy="42" r="10" fill="${glow}" stroke="${ink}" stroke-width="2" />
      <circle cx="52" cy="40" r="2.4" fill="${ink}" />
      <circle cx="68" cy="40" r="2.4" fill="${ink}" />
      <path d="M49 58h22M60 47v37M41 66h38" stroke="${glow}" stroke-width="2" opacity="0.88" />
      <ellipse cx="40" cy="70" rx="6" ry="8" fill="${glow}" />
      <ellipse cx="80" cy="70" rx="6" ry="8" fill="${glow}" />
      <ellipse cx="50" cy="84" rx="6" ry="7" fill="${glow}" />
      <ellipse cx="70" cy="84" rx="6" ry="7" fill="${glow}" />
    `;
  }

  if (art === "penguin") {
    return `
      <ellipse cx="60" cy="68" rx="24" ry="30" fill="${ink}" />
      <ellipse cx="60" cy="72" rx="16" ry="22" fill="${cream}" />
      <ellipse cx="43" cy="68" rx="6" ry="16" fill="${ink}" />
      <ellipse cx="77" cy="68" rx="6" ry="16" fill="${ink}" />
      <circle cx="52" cy="58" r="3.2" fill="${ink}" />
      <circle cx="68" cy="58" r="3.2" fill="${ink}" />
      <path d="M60 64l-6 7h12z" fill="#f4a340" />
      <path d="M50 92h8M62 92h8" stroke="#f4a340" stroke-width="4" stroke-linecap="round" />
    `;
  }

  if (art === "hedgehog") {
    return `
      <path d="M34 72c0-20 16-34 34-34 10 0 20 4 28 12l-7 4 6 7-8 3 4 9-10 1 1 11-10-5-5 10-7-9-9 5 1-10-11-1 4-8-8-4 7-6-8-6z" fill="${color}" opacity="0.94" />
      <path d="M44 69c0-14 10-23 22-23 11 0 20 9 20 21 0 13-10 23-22 23-11 0-20-9-20-21z" fill="${glow}" stroke="${ink}" stroke-width="2" />
      <circle cx="53" cy="65" r="3.1" fill="${ink}" />
      <circle cx="71" cy="65" r="3.1" fill="${ink}" />
      <ellipse cx="62" cy="74" rx="5.2" ry="3.8" fill="${ink}" />
      <path d="M57 80q5 4 10 0" fill="none" stroke="${ink}" stroke-width="2.1" stroke-linecap="round" />
    `;
  }

  if (art === "llama") {
    return `
      <path d="M47 42 43 22l11 12" fill="${color}" stroke="${ink}" stroke-width="2" stroke-linejoin="round" />
      <path d="M73 42 77 22 66 34" fill="${color}" stroke="${ink}" stroke-width="2" stroke-linejoin="round" />
      <path d="M45 53c0-11 7-18 15-18s15 7 15 18v13c0 14-7 24-15 24s-15-10-15-24z" fill="${glow}" stroke="${color}" stroke-width="2.4" />
      <rect x="48" y="70" width="24" height="15" rx="8" fill="${cream}" />
      <circle cx="52" cy="57" r="3" fill="${ink}" />
      <circle cx="68" cy="57" r="3" fill="${ink}" />
      <ellipse cx="60" cy="74" rx="6" ry="4.5" fill="${ink}" />
    `;
  }

  if (art === "firefly") {
    return `
      <ellipse cx="49" cy="54" rx="12" ry="16" fill="${glow}" opacity="0.65" stroke="${color}" stroke-width="1.8" />
      <ellipse cx="71" cy="54" rx="12" ry="16" fill="${glow}" opacity="0.65" stroke="${color}" stroke-width="1.8" />
      <ellipse cx="60" cy="62" rx="12" ry="18" fill="${ink}" />
      <ellipse cx="60" cy="82" rx="12" ry="13" fill="${color}" />
      <ellipse cx="60" cy="82" rx="8" ry="9" fill="${glow}" opacity="0.88" />
      <circle cx="55" cy="56" r="2.4" fill="${cream}" />
      <circle cx="65" cy="56" r="2.4" fill="${cream}" />
      <path d="M60 45v-8M54 47l-6-6M66 47l6-6" stroke="${ink}" stroke-width="2" stroke-linecap="round" />
    `;
  }

  if (art === "squirrel") {
    return `
      <path d="M40 48c-8 6-12 16-10 25 2 11 12 18 24 18 10 0 18-5 22-13-10 3-20 1-27-6-7-8-9-18-9-24z" fill="${color}" opacity="0.92" />
      <circle cx="65" cy="65" r="23" fill="${glow}" stroke="${color}" stroke-width="2.4" />
      <path d="M56 46 50 31l12 10M76 50 72 35l10 10" fill="${color}" stroke="${ink}" stroke-width="2" stroke-linejoin="round" />
      <circle cx="58" cy="62" r="3" fill="${ink}" />
      <circle cx="73" cy="62" r="3" fill="${ink}" />
      <ellipse cx="66" cy="72" rx="6" ry="4.5" fill="${ink}" />
      <path d="M60 79q6 4 12 0" fill="none" stroke="${ink}" stroke-width="2.1" stroke-linecap="round" />
    `;
  }

  if (art === "beaver") {
    return `
      <circle cx="44" cy="46" r="8" fill="${color}" />
      <circle cx="76" cy="46" r="8" fill="${color}" />
      <circle cx="60" cy="66" r="27" fill="${glow}" stroke="${color}" stroke-width="2.4" />
      <circle cx="50" cy="62" r="3.1" fill="${ink}" />
      <circle cx="70" cy="62" r="3.1" fill="${ink}" />
      <ellipse cx="60" cy="72" rx="6.2" ry="4.4" fill="${ink}" />
      <rect x="52" y="76" width="7" height="8" rx="2.2" fill="${cream}" />
      <rect x="61" y="76" width="7" height="8" rx="2.2" fill="${cream}" />
      <path d="M44 72h10M66 72h10" stroke="${ink}" stroke-width="2" stroke-linecap="round" />
    `;
  }

  if (art === "duck") {
    return `
      <circle cx="60" cy="62" r="25" fill="${glow}" stroke="${color}" stroke-width="2.4" />
      <path d="M42 44 48 28l10 13" fill="${color}" stroke="${ink}" stroke-width="2" stroke-linejoin="round" />
      <circle cx="54" cy="56" r="3.1" fill="${ink}" />
      <path d="M60 64h22c-1 10-8 16-20 16-7 0-10-3-10-8 0-5 3-8 8-8z" fill="#f4a340" />
      <path d="M60 68h15" stroke="${cream}" stroke-width="2" stroke-linecap="round" />
    `;
  }

  if (art === "seal") {
    return `
      <ellipse cx="44" cy="83" rx="9" ry="6" fill="${color}" opacity="0.88" />
      <ellipse cx="76" cy="83" rx="9" ry="6" fill="${color}" opacity="0.88" />
      <circle cx="60" cy="66" r="27" fill="${glow}" stroke="${color}" stroke-width="2.4" />
      <circle cx="50" cy="61" r="3.1" fill="${ink}" />
      <circle cx="70" cy="61" r="3.1" fill="${ink}" />
      <ellipse cx="60" cy="71" rx="5.5" ry="4.2" fill="${ink}" />
      <path d="M45 74h10M65 74h10" stroke="${ink}" stroke-width="2" stroke-linecap="round" />
      <path d="M54 79q6 4 12 0" fill="none" stroke="${ink}" stroke-width="2.1" stroke-linecap="round" />
    `;
  }

  if (art === "pony") {
    return `
      <path d="M45 48 53 28l10 14" fill="${color}" stroke="${ink}" stroke-width="2" stroke-linejoin="round" />
      <path d="M66 32q14 5 17 20-4 0-9-2 0 19-14 33c-12-7-19-18-19-33 0-9 6-16 14-18z" fill="${glow}" stroke="${color}" stroke-width="2.4" />
      <path d="M47 43q7-10 19-11" fill="none" stroke="${ink}" stroke-width="3" stroke-linecap="round" />
      <circle cx="51" cy="58" r="3" fill="${ink}" />
      <circle cx="67" cy="58" r="3" fill="${ink}" />
      <ellipse cx="60" cy="72" rx="11" ry="8" fill="${cream}" />
      <ellipse cx="60" cy="72" rx="5.5" ry="4" fill="${ink}" />
    `;
  }

  if (art === "badger") {
    return `
      <circle cx="43" cy="45" r="8.5" fill="${ink}" />
      <circle cx="77" cy="45" r="8.5" fill="${ink}" />
      <circle cx="60" cy="66" r="27" fill="${color}" stroke="${ink}" stroke-width="2.4" />
      <path d="M44 44c5-4 11-6 16-6s11 2 16 6v42H44z" fill="${cream}" />
      <path d="M52 40h16v45H52z" fill="${glow}" opacity="0.88" />
      <path d="M44 54c4 8 9 12 16 12s12-4 16-12" fill="${mask}" />
      <circle cx="52" cy="63" r="3" fill="${ink}" />
      <circle cx="68" cy="63" r="3" fill="${ink}" />
      <ellipse cx="60" cy="72" rx="5.5" ry="4" fill="${ink}" />
      <path d="M55 79q5 4 10 0" fill="none" stroke="${ink}" stroke-width="2.1" stroke-linecap="round" />
    `;
  }

  if (art === "falcon") {
    return `
      <path d="M60 34c17 0 28 11 28 28 0 19-13 31-28 31S32 81 32 62c0-17 11-28 28-28z" fill="${glow}" stroke="${ink}" stroke-width="2.4" />
      <path d="M42 48c10-7 26-9 38 0-6 4-12 6-20 6s-14-2-18-6z" fill="${color}" />
      <path d="M42 66c6-8 12-11 18-11s12 3 18 11c-5 7-11 12-18 12s-13-5-18-12z" fill="${mask}" />
      <circle cx="51" cy="61" r="3.1" fill="${ink}" />
      <circle cx="69" cy="61" r="3.1" fill="${ink}" />
      <path d="M60 66l-5 8h10z" fill="#f4a340" />
      <path d="M48 53l9-4M72 53l-9-4" stroke="${ink}" stroke-width="2.4" stroke-linecap="round" />
    `;
  }

  if (art === "parrot") {
    return `
      <circle cx="60" cy="63" r="26" fill="${color}" stroke="${ink}" stroke-width="2.2" />
      <path d="M45 43 40 28l13 9" fill="${glow}" stroke="${ink}" stroke-width="2" stroke-linejoin="round" />
      <path d="M49 56c5-5 18-6 25 1-3 8-9 12-16 12-5 0-8-6-9-13z" fill="${cream}" />
      <circle cx="53" cy="56" r="3" fill="${ink}" />
      <path d="M61 62c8-1 15 3 15 10-3 5-7 7-12 8 2-4 2-8 0-12-2-3-3-4-3-6z" fill="#f4a340" />
      <path d="M64 62c4 1 7 4 8 8" fill="none" stroke="${ink}" stroke-width="1.8" stroke-linecap="round" />
    `;
  }

  if (art === "otter") {
    return `
      <circle cx="45" cy="46" r="7" fill="${color}" />
      <circle cx="75" cy="46" r="7" fill="${color}" />
      <circle cx="60" cy="66" r="27" fill="${glow}" stroke="${color}" stroke-width="2.4" />
      <path d="M46 50c5-4 9-5 14-5s9 1 14 5v13H46z" fill="${color}" opacity="0.24" />
      <ellipse cx="60" cy="74" rx="16" ry="12" fill="${cream}" />
      <circle cx="50" cy="62" r="3.1" fill="${ink}" />
      <circle cx="70" cy="62" r="3.1" fill="${ink}" />
      <ellipse cx="60" cy="71" rx="5.4" ry="4" fill="${ink}" />
      <path d="M43 73h10M67 73h10" stroke="${ink}" stroke-width="2" stroke-linecap="round" />
    `;
  }

  return `
    <circle cx="42" cy="45" r="9" fill="${color}" />
    <circle cx="78" cy="45" r="9" fill="${color}" />
    <circle cx="60" cy="66" r="27" fill="${glow}" stroke="${color}" stroke-width="2.4" />
    <circle cx="42" cy="45" r="4" fill="${blush}" />
    <circle cx="78" cy="45" r="4" fill="${blush}" />
    <ellipse cx="60" cy="75" rx="15" ry="11" fill="${cream}" />
    <circle cx="50" cy="62" r="3.2" fill="${ink}" />
    <circle cx="70" cy="62" r="3.2" fill="${ink}" />
    <ellipse cx="60" cy="71" rx="5.5" ry="4" fill="${ink}" />
    <path d="M54 78q6 5 12 0" fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round" />
  `;
}

function getBlindfoldShapeMarkup(shape, palette) {
  if (shape === "pennant") {
    return `<path d="M24 20h62l10 18-10 18H24l8-18z" fill="${palette.color}" opacity="0.95" /><path d="M28 72h64l-10 24H38z" fill="${palette.glow}" opacity="0.78" />`;
  }

  if (shape === "medal") {
    return `<circle cx="60" cy="58" r="34" fill="${palette.color}" opacity="0.94" /><circle cx="60" cy="58" r="23" fill="${palette.glow}" opacity="0.86" /><path d="M45 86h30l-8 18H53z" fill="${palette.color}" opacity="0.84" />`;
  }

  if (shape === "ticket") {
    return `<path d="M24 28c8 0 10-8 18-8h36c8 0 10 8 18 8v16c-8 0-10 8-18 8h-36c-8 0-10-8-18-8z" fill="${palette.color}" opacity="0.95" /><rect x="28" y="58" width="64" height="30" rx="12" fill="${palette.glow}" opacity="0.82" />`;
  }

  return `<path d="M60 14l31 12-6 44c-6 16-17 26-25 33-8-7-19-17-25-33l-6-44z" fill="${palette.color}" opacity="0.95" /><path d="M60 28l17 7-4 28c-3 9-8 15-13 20-5-5-10-11-13-20l-4-28z" fill="${palette.glow}" opacity="0.82" />`;
}

function getBlindfoldPatternMarkup(pattern, palette) {
  if (pattern === "orbit") {
    return `<ellipse cx="60" cy="60" rx="42" ry="24" fill="none" stroke="${palette.color}" stroke-width="5" opacity="0.18" /><circle cx="88" cy="40" r="5" fill="${palette.color}" opacity="0.42" /><circle cx="30" cy="84" r="4" fill="${palette.accent}" opacity="0.24" />`;
  }

  if (pattern === "rays") {
    return `<path d="M60 10v18M60 92v18M10 60h18M92 60h18M25 25l12 12M83 83l12 12M95 25L83 37M25 95l12-12" stroke="${palette.color}" stroke-width="4" stroke-linecap="round" opacity="0.2" />`;
  }

  if (pattern === "confetti") {
    return `<circle cx="24" cy="26" r="5" fill="${palette.color}" opacity="0.22" /><circle cx="96" cy="28" r="4" fill="${palette.accent}" opacity="0.24" /><circle cx="86" cy="92" r="5" fill="${palette.color}" opacity="0.22" /><path d="M26 88h14M84 16h12M18 54h10" stroke="${palette.accent}" stroke-width="4" stroke-linecap="round" opacity="0.18" />`;
  }

  return `<path d="M60 16l8 18 19 2-14 12 4 18-17-10-17 10 4-18-14-12 19-2z" fill="${palette.color}" opacity="0.12" /><path d="M60 20l6 14 15 2-11 9 3 14-13-8-13 8 3-14-11-9 15-2z" fill="${palette.accent}" opacity="0.08" />`;
}

function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function mulberry32(seed) {
  let current = seed >>> 0;
  return () => {
    current += 0x6d2b79f5;
    let result = Math.imul(current ^ (current >>> 15), 1 | current);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(items, seed) {
  const shuffled = [...items];
  const random = mulberry32(hashString(seed));

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function escapeSvgText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function compactTeamName(name) {
  return String(name)
    .replaceAll(/\bSaint\b/g, "St.")
    .replaceAll(/\bState\b/g, "St.")
    .replaceAll(/\bMount\b/g, "Mt.")
    .replaceAll(/\bNorth\b/g, "N.")
    .replaceAll(/\bSouth\b/g, "S.")
    .replaceAll(/\bEast\b/g, "E.")
    .replaceAll(/\bWest\b/g, "W.");
}

function truncateText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  let trimmed = text;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}...`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }

  return `${trimmed}...`;
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

async function loadImage(src) {
  if (!state.imageCache.has(src)) {
    state.imageCache.set(
      src,
      new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
      })
    );
  }

  return state.imageCache.get(src);
}

async function saveBlob(blob, fileName, title, exportRelay = null) {
  const file =
    typeof File === "function"
      ? new File([blob], fileName, {
          type: blob.type || "application/octet-stream",
        })
      : null;

  if (
    navigator.share &&
    file &&
    (!navigator.canShare || navigator.canShare({ files: [file] }))
  ) {
    try {
      await navigator.share({
        title,
        files: [file],
      });
      if (exportRelay && !exportRelay.closed) {
        exportRelay.close();
      }
      return "shared";
    } catch (error) {
      if (exportRelay && !exportRelay.closed && error?.name === "AbortError") {
        exportRelay.close();
      }
      if (error?.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  if (exportRelay && !exportRelay.closed) {
    await populateMobileExportRelay(exportRelay, blob, fileName, title);
    return "opened";
  }

  downloadBlob(blob, fileName);
  return "downloaded";
}

function shouldPrepareMobileExportRelay() {
  if (!window.matchMedia("(pointer: coarse)").matches) {
    return false;
  }

  if (!navigator.share) {
    return true;
  }

  if (typeof File !== "function" || !navigator.canShare) {
    return false;
  }

  try {
    return !navigator.canShare({
      files: [new File(["relay"], "relay-check.txt", { type: "text/plain" })],
    });
  } catch {
    return true;
  }
}

function openMobileExportRelay(title) {
  if (!shouldPrepareMobileExportRelay()) {
    return null;
  }

  const relay = window.open("", "_blank");
  if (!relay) {
    return null;
  }

  relay.document.write(buildMobileExportRelayHtml({ title: escapeHtml(title) }));
  relay.document.close();
  return relay;
}

async function populateMobileExportRelay(relay, blob, fileName, title) {
  const objectUrl = URL.createObjectURL(blob);
  const isImage = (blob.type || "").startsWith("image/");
  const relayTitle = escapeHtml(title);
  const relayFileName = escapeHtml(fileName);
  const fullText = isImage ? "" : await blob.text();
  const previewText = isImage ? "" : escapeHtml(fullText.slice(0, 2400));
  const needsClip = !isImage && fullText.length > 2400;

  relay.document.open();
  relay.document.write(
    buildMobileExportRelayHtml({
      title: relayTitle,
      fileName: relayFileName,
      objectUrl,
      isImage,
      previewText,
      fullText,
      clipped: needsClip,
    })
  );
  relay.document.close();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 120000);
}

function buildMobileExportRelayHtml({
  title,
  fileName = "",
  objectUrl = "",
  isImage = false,
  previewText = "",
  fullText = "",
  clipped = false,
} = {}) {
  const previewMarkup = isImage
    ? `<figure class="export-relay__preview"><img src="${objectUrl}" alt="${title}" /></figure>`
    : `<pre class="export-relay__code">${previewText}${clipped ? "\n\n..." : ""}</pre>`;
  const copyButton = !isImage
    ? '<button class="export-relay__ghost" id="copyExportButton" type="button">Copy JSON</button>'
    : "";
  const copyScript = !isImage
    ? `<script>
        const copyButton = document.getElementById("copyExportButton");
        const exportText = ${JSON.stringify(fullText)};
        copyButton?.addEventListener("click", async () => {
          try {
            await navigator.clipboard.writeText(exportText);
            copyButton.textContent = "Copied";
          } catch {
            copyButton.textContent = "Copy failed";
          }
        });
      </script>`
    : "";
  const note = isImage
    ? "Use the big button below or long-press the poster image to save or share it from your phone."
    : "Use the big button below to save the JSON file. If your browser prefers previewing it first, you can still share or copy it from this tab.";

  return `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title || "Preparing export"}</title>
        <style>
          :root {
            color-scheme: light;
            --ink: #1f2a3a;
            --ink-soft: #637388;
            --paper: #fffdf8;
            --panel: #ffffff;
            --accent: #24344d;
            --accent-bright: #ff8d52;
            --line: rgba(31, 42, 58, 0.1);
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            min-height: 100vh;
            padding: 20px 16px 28px;
            background:
              radial-gradient(circle at top left, rgba(255, 182, 63, 0.18), transparent 28%),
              linear-gradient(180deg, #fff9f1, #eef5ff);
            color: var(--ink);
            font: 600 16px/1.45 Nunito, system-ui, sans-serif;
          }
          main {
            width: min(100%, 740px);
            margin: 0 auto;
            display: grid;
            gap: 16px;
          }
          .export-relay__card {
            display: grid;
            gap: 14px;
            padding: 18px;
            border: 2px solid var(--line);
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.96);
            box-shadow: 0 18px 28px rgba(31, 42, 58, 0.1);
          }
          h1 {
            margin: 0;
            font: 800 clamp(1.5rem, 7vw, 2.3rem)/1.05 "Baloo 2", "Trebuchet MS", sans-serif;
          }
          p {
            margin: 0;
            color: var(--ink-soft);
          }
          .export-relay__actions {
            display: grid;
            gap: 10px;
          }
          .export-relay__button,
          .export-relay__ghost {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 52px;
            padding: 0 18px;
            border-radius: 18px;
            border: 0;
            text-decoration: none;
            font: 800 1rem/1 Nunito, system-ui, sans-serif;
          }
          .export-relay__button {
            background: linear-gradient(180deg, var(--accent-bright), #ff7343);
            color: white;
          }
          .export-relay__ghost {
            border: 2px solid var(--line);
            background: #fff8ee;
            color: var(--ink);
          }
          .export-relay__preview {
            margin: 0;
            padding: 12px;
            border-radius: 20px;
            border: 1px solid var(--line);
            background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248, 251, 255, 0.96));
          }
          .export-relay__preview img {
            display: block;
            width: 100%;
            height: auto;
            border-radius: 14px;
          }
          .export-relay__code {
            margin: 0;
            max-height: 48vh;
            overflow: auto;
            padding: 14px;
            border-radius: 18px;
            border: 1px solid var(--line);
            background: #f8fbff;
            color: var(--ink);
            font: 700 0.82rem/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
            white-space: pre-wrap;
            word-break: break-word;
          }
        </style>
      </head>
      <body>
        <main>
          <section class="export-relay__card">
            <p>${fileName ? `Ready to export ${fileName}.` : "Preparing your export..."}</p>
            <h1>${title || "Preparing export"}</h1>
            <p>${note}</p>
            ${fileName ? previewMarkup : ""}
            <div class="export-relay__actions">
              ${
                fileName
                  ? `<a class="export-relay__button" href="${objectUrl}" download="${fileName}">Save ${isImage ? "poster" : "JSON file"}</a>${copyButton}`
                  : '<div class="export-relay__button">Preparing export...</div>'
              }
            </div>
          </section>
        </main>
        ${copyScript}
      </body>
    </html>`;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.setAttribute("download", fileName);
  link.style.display = "none";
  document.body.append(link);
  link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
  link.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1200);
}

function renderFatal(error) {
  const message = String(error?.message || "Unknown startup error");
  const looksLikeShellMismatch =
    /addEventListener|Cannot read properties of null|querySelector/i.test(message);

  elements.sourceStatus.textContent = looksLikeShellMismatch
    ? "App update needed"
    : "Could not load bracket data";
  elements.sourceNote.textContent = error.message;
  elements.matchupEyebrow.textContent = "Loading problem";
  elements.matchupTitle.textContent = "The bracket picker could not start";
  elements.matchupHint.textContent = looksLikeShellMismatch
    ? "The app files were out of sync. Reload once to grab the latest version."
    : "Check the data file path and reload the page.";
  elements.matchupStage.innerHTML = `
    <div class="empty-state">
      <h3>${looksLikeShellMismatch ? "App shell mismatch" : "Bracket data missing"}</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function showToast(message) {
  clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");

  state.toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 1500);
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace("#", "");
  const size = normalized.length === 3 ? 1 : 2;
  const values = normalized.match(new RegExp(`.{${size}}`, "g")).map((value) =>
    size === 1 ? Number.parseInt(value.repeat(2), 16) : Number.parseInt(value, 16)
  );
  return `rgba(${values[0]}, ${values[1]}, ${values[2]}, ${alpha})`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function slugifyFileName(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "bracket";
}

function compareGames(left, right) {
  if (left.round !== right.round) {
    return left.round - right.round;
  }

  const regionOrder = {
    East: 0,
    Midwest: 1,
    South: 2,
    West: 3,
    "Final Four": 4,
    "National Championship": 5,
  };

  const leftRegion = regionOrder[left.region] ?? 99;
  const rightRegion = regionOrder[right.region] ?? 99;
  if (leftRegion !== rightRegion) {
    return leftRegion - rightRegion;
  }

  const leftOrder = extractSequence(left);
  const rightOrder = extractSequence(right);
  return leftOrder - rightOrder;
}

function extractSequence(game) {
  if (game.round === 0) {
    return Number.parseInt(game.seedLine || "0", 10);
  }

  const match = game.id.match(/g(\d+)$/);
  if (match) {
    return Number.parseInt(match[1], 10);
  }

  return game.order;
}

function formatGameStageLabel(game) {
  if (game.round === 0) {
    return `${game.region} play-in`;
  }

  if (game.round === 5 || game.round === 6) {
    return game.region;
  }

  return `${game.region} region`;
}

function getAdvancementLabel(round) {
  return (
    {
      0: "the first round",
      1: "the second round",
      2: "the Sweet 16",
      3: "the Elite 8",
      4: "the Final Four",
      5: "the championship game",
      6: "the trophy",
    }[round] || "the next round"
  );
}
