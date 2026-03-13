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
  pendingBracketName: "",
};

const elements = {
  sourceStatus: document.querySelector("#sourceStatus"),
  sourceNote: document.querySelector("#sourceNote"),
  pickViewButton: document.querySelector("#pickViewButton"),
  bracketViewButton: document.querySelector("#bracketViewButton"),
  bracketSelect: document.querySelector("#bracketSelect"),
  newBracketButton: document.querySelector("#newBracketButton"),
  deleteBracketButton: document.querySelector("#deleteBracketButton"),
  bracketNameInput: document.querySelector("#bracketNameInput"),
  newBracketModal: document.querySelector("#newBracketModal"),
  newBracketForm: document.querySelector("#newBracketForm"),
  newBracketNameInput: document.querySelector("#newBracketNameInput"),
  cancelNewBracketButton: document.querySelector("#cancelNewBracketButton"),
  useAutoNameButton: document.querySelector("#useAutoNameButton"),
  resetButton: document.querySelector("#resetButton"),
  exportJsonButton: document.querySelector("#exportJsonButton"),
  exportImageButton: document.querySelector("#exportImageButton"),
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
  bracketViewTitle: document.querySelector("#bracketViewTitle"),
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
    render();
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

  return {
    id: bracket?.id || createId(),
    name: typeof bracket?.name === "string" ? bracket.name.slice(0, MAX_BRACKET_NAME) : "",
    picks: cleanPicks,
    createdAt: bracket?.createdAt || new Date().toISOString(),
    updatedAt: bracket?.updatedAt || new Date().toISOString(),
    datasetId: bracket?.datasetId || state.data.meta.tournamentId,
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

function createBracket(name = nextBracketName()) {
  return {
    id: createId(),
    name,
    picks: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    datasetId: state.data.meta.tournamentId,
  };
}

function ensureCurrentBracket() {
  if (!state.store.brackets.length) {
    const fresh = createBracket();
    state.store.brackets.push(fresh);
    state.store.currentBracketId = fresh.id;
    persistStore();
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

function setViewMode(mode) {
  const nextMode = mode === "bracket" ? "bracket" : "pick";
  if (getViewMode() === nextMode) {
    return;
  }

  const applyMode = () => {
    state.store.viewMode = nextMode;
    persistStore();
    render();
    animateScreenSwap(nextMode);
  };

  if (typeof document.startViewTransition === "function") {
    document.startViewTransition(applyMode);
    return;
  }

  applyMode();
}

function getCurrentBracket() {
  return state.store.brackets.find((bracket) => bracket.id === state.store.currentBracketId);
}

function animateScreenSwap(mode) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const target = mode === "bracket" ? elements.bracketScreen : elements.pickerScreen;
  target.animate(
    [
      { opacity: 0.16, transform: "translateY(18px) scale(0.99)" },
      { opacity: 1, transform: "translateY(0) scale(1)" },
    ],
    {
      duration: 240,
      easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
    }
  );
}

function openNewBracketModal() {
  state.pendingBracketName = nextBracketName();
  elements.newBracketNameInput.value = state.pendingBracketName;
  elements.newBracketNameInput.placeholder = state.pendingBracketName;
  elements.newBracketModal.hidden = false;
  document.body.classList.add("has-modal");

  window.requestAnimationFrame(() => {
    elements.newBracketNameInput.focus();
    elements.newBracketNameInput.select();
  });
}

function closeNewBracketModal({ restoreFocus = true } = {}) {
  state.pendingBracketName = "";
  elements.newBracketModal.hidden = true;
  elements.newBracketNameInput.value = "";
  document.body.classList.remove("has-modal");

  if (restoreFocus) {
    elements.newBracketButton.focus();
  }
}

function startNewBracket(name = "") {
  const finalName = name.trim() || state.pendingBracketName || nextBracketName();
  const bracket = createBracket(finalName);
  state.store.brackets.unshift(bracket);
  state.store.currentBracketId = bracket.id;
  state.store.viewMode = "pick";
  state.activeGameId = null;
  state.bracketCanvasSignature = null;
  persistStore();
  closeNewBracketModal({ restoreFocus: false });
  render();
  showToast(`Created ${bracket.name}.`);
}

function touchBracket(bracket) {
  bracket.updatedAt = new Date().toISOString();
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
  const pickedCount = Object.keys(bracket.picks).length;
  return {
    pickedCount,
    total: state.data.games.length,
    percent: Math.round((pickedCount / state.data.games.length) * 100),
  };
}

function getRoundTallies(bracket) {
  return state.roundMeta.map((meta) => {
    const picked = state.navigationGames.filter(
      (game) => game.round === meta.round && bracket.picks[game.id]
    ).length;
    return { ...meta, picked };
  });
}

function getChampion(bracket) {
  const championId = bracket.picks.championship;
  return championId ? state.teamsById[championId] || null : null;
}

function getPickedGames(bracket) {
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
  const previousPick = bracket.picks[gameId];

  if (previousPick === teamId) {
    return;
  }

  bracket.picks[gameId] = teamId;
  clearDescendantPicks(bracket.picks, gameId);
  touchBracket(bracket);
  state.bracketCanvasSignature = null;
  persistStore();
  moveToNextOpen(gameId);
  render();
}

function clearPick(gameId) {
  const bracket = getCurrentBracket();
  if (!bracket.picks[gameId]) {
    return;
  }

  delete bracket.picks[gameId];
  clearDescendantPicks(bracket.picks, gameId);
  touchBracket(bracket);
  state.bracketCanvasSignature = null;
  persistStore();
  state.activeGameId = gameId;
  render();
}

function moveToNextOpen(originGameId = null) {
  const bracket = getCurrentBracket();
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
}

function renderSourceBanner() {
  elements.sourceStatus.textContent = state.data.meta.officialBracket
    ? `Official bracket • ${state.data.meta.sourceUpdatedLabel}`
    : `Projected bracket • ${state.data.meta.sourceUpdatedLabel}`;

  elements.sourceNote.textContent = state.data.meta.officialBracket
    ? "The field is official."
    : "Selection Sunday is March 15, 2026, so this build uses the latest projected matchups and teams.";
}

function renderToolbar(bracket) {
  elements.bracketSelect.innerHTML = state.store.brackets
    .map((item) => {
      const picked = Object.keys(item.picks).length;
      return `<option value="${item.id}" ${item.id === bracket.id ? "selected" : ""}>
        ${escapeHtml(item.name || "Untitled bracket")} · ${picked}/${state.data.games.length}
      </option>`;
    })
    .join("");

  if (elements.bracketNameInput !== document.activeElement) {
    elements.bracketNameInput.value = bracket.name;
  }
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
  const { currentGame, currentIndex, visibleGames } = context;
  const champion = getChampion(bracket);
  const complete = Object.keys(bracket.picks).length === state.data.games.length;

  if (!currentGame && complete && champion) {
    elements.matchupEyebrow.textContent = "Bracket complete";
    elements.matchupTitle.textContent = `${bracket.name} is ready to celebrate`;
    elements.matchupHint.textContent =
      "Your whole bracket is finished. Export the poster or jump backward to revisit any matchup.";
    elements.matchupStage.innerHTML = renderCompletedState(champion);
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
  elements.matchupTitle.textContent = `${matchup.top.name} vs ${matchup.bottom.name}`;
  elements.matchupHint.textContent =
    currentGame.round === 0
      ? "Pick the play-in winner to unlock the rest of that seed line."
      : "Choose the team you want to advance. If you change this later, dependent picks will clear automatically.";

  elements.matchupStage.innerHTML = `
    <div class="matchup-board">
      <div class="matchup-lane matchup-lane--left">
        ${renderTeamCard(matchup.top, currentGame, pickedTeamId, "left")}
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
        ${renderTeamCard(matchup.bottom, currentGame, pickedTeamId, "right")}
      </div>
    </div>
  `;

  setNavState({
    canGoBack: currentIndex > 0,
    canGoForward: currentIndex < visibleGames.length - 1,
    canClear: Boolean(pickedTeamId),
  });
}

function renderCompletedState(champion) {
  return `
    <div class="summary-card">
      <h3>Mission complete!</h3>
      <p>You picked every game in the bracket. Your champion is ready for the spotlight.</p>
      <div class="champion-card">
        <div class="champion-card__logo">
          <img src="${escapeAttribute(champion.logo)}" alt="${escapeAttribute(champion.name)} logo" />
        </div>
        <div>
          <p class="eyebrow">Champion pick</p>
          <h3>${escapeHtml(champion.name)}</h3>
          <p>${escapeHtml(champion.conference)} • ${escapeHtml(getTeamRecordLabel(champion))}</p>
        </div>
      </div>
    </div>
  `;
}

function renderTeamCard(team, game, pickedTeamId, side) {
  const theme = getThemeForTeam(team);
  const sticker = getTeamSticker(team);
  const facts = getTeamFacts(team);
  const scoutRows = getTeamScoutRows(team);
  const isPicked = pickedTeamId === team.id;
  const pulseText = isPicked ? "Locked in" : "Tap to advance";

  return `
    <button
      class="team-card team-card--${side} ${isPicked ? "is-picked" : ""}"
      type="button"
      data-team-pick="${escapeAttribute(team.id)}"
      style="--team-color:${theme.color};--team-glow:${theme.glow};--team-tint:${hexToRgba(theme.color, 0.18)}"
    >
      <div class="team-card__top">
        <span class="team-card__seed">No. ${team.seed}</span>
        <span class="team-card__sticker">${escapeHtml(sticker)}</span>
      </div>

      <div class="team-card__crest">
        <img src="${escapeAttribute(team.logo)}" alt="${escapeAttribute(team.name)} logo" />
      </div>

      <div class="team-card__body">
        <h3 class="team-card__name">${escapeHtml(team.name)}</h3>
        <p class="team-card__conference">${escapeHtml(team.conference)}</p>
      </div>

      <div class="team-card__facts">
        ${facts.map(renderTeamFact).join("")}
      </div>

      <div class="team-card__scouting">
        <p class="team-card__section-label">Quick scout</p>
        ${scoutRows.map(renderScoutRow).join("")}
      </div>

      <div class="team-card__footer">
        <span class="team-card__pulse">${escapeHtml(pulseText)}</span>
        <span class="team-card__button">${isPicked ? "Picked winner" : "Pick this team"}</span>
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
  const record = getTeamRecordNumbers(team);
  const gamesPlayed = record.wins + record.losses;
  const winPct = gamesPlayed ? record.wins / gamesPlayed : 0;
  const bigWins = getRecordNumbers(team.quad1).wins;
  const badLosses = getRecordNumbers(team.quad3).losses + getRecordNumbers(team.quad4).losses;

  return [
    {
      label: "Hot streak",
      note: gamesPlayed
        ? `Won ${record.wins} of ${gamesPlayed} games`
        : "Record still settling in",
      rating: getWinPctRating(winPct),
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

function getWinPctRating(winPct) {
  if (winPct >= 0.88) {
    return 5;
  }

  if (winPct >= 0.8) {
    return 4;
  }

  if (winPct >= 0.7) {
    return 3;
  }

  if (winPct >= 0.62) {
    return 2;
  }

  return 1;
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
      </div>

      ${
        champion
          ? `
            <div>
              <p class="snapshot__label">Champion pick</p>
              ${renderMiniTeam(champion)}
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
                <p class="stack-item__meta">${escapeHtml(nextOpen ? getPreviewLabel(nextOpen, bracket.picks) : "All games picked")}</p>
              </div>
              <span class="stack-item__count">${nextOpen ? "Ready" : "Done"}</span>
            </div>

        <div class="stack-item">
          <div>
            <p class="stack-item__label">Final Four spots</p>
            <p class="stack-item__meta">${finalFourTeams.length ? finalFourTeams.map((team) => team.name).join(", ") : "No semifinalists locked in yet."}</p>
          </div>
          <span class="stack-item__count">${finalFourTeams.length}/4</span>
        </div>
      </div>
    </div>
  `;
}

function renderMiniTeam(team) {
  return `
    <div class="mini-team">
      <div class="mini-team__logo">
        <img src="${escapeAttribute(team.logo)}" alt="${escapeAttribute(team.name)} logo" />
      </div>
      <div>
        <p class="mini-team__name">${escapeHtml(team.name)}</p>
        <p class="mini-team__meta">${escapeHtml(team.conference)} • Seed #${team.seed}</p>
      </div>
    </div>
  `;
}

function getResolvedFinalFour(bracket) {
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
                <p class="stack-item__label">${escapeHtml(winner.name)}</p>
                <p class="stack-item__meta">${escapeHtml(game.roundLabel)} • ${escapeHtml(getPreviewLabel(game, bracket.picks))}</p>
              </div>
              <span class="stack-item__count">W</span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderBracketMobileBoard(bracket) {
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
  const slots = game.slots.map((slot) => getMobileBracketSlotDetails(slot, bracket.picks));
  const winnerId = bracket.picks[game.id] || null;

  return `
    <article class="mobile-game-card ${winnerId ? "is-picked" : ""}">
      <p class="mobile-game-card__label">${escapeHtml(game.title || getPreviewLabel(game, bracket.picks))}</p>
      <div class="mobile-slot-stack">
        ${slots
          .map((slot) => renderMobileBracketSlot(slot, slot.team?.id === winnerId))
          .join("")}
      </div>
    </article>
  `;
}

function getMobileBracketSlotDetails(slot, picks) {
  if (slot.type === "team") {
    return {
      team: state.teamsById[slot.teamId] || null,
      label: state.teamsById[slot.teamId]?.name || "TBD",
      note: state.teamsById[slot.teamId]
        ? `${state.teamsById[slot.teamId].conference} • No. ${state.teamsById[slot.teamId].seed}`
        : "Waiting on teams",
    };
  }

  const pickedTeamId = picks[slot.gameId];
  if (pickedTeamId) {
    const team = state.teamsById[pickedTeamId] || null;
    return {
      team,
      label: team?.name || "TBD",
      note: team ? `${team.conference} • No. ${team.seed}` : "Winner locked in",
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
          slot.team
            ? `<img src="${escapeAttribute(slot.team.logo)}" alt="${escapeAttribute(slot.team.name)} logo" />`
            : `<span>?</span>`
        }
      </div>
      <div class="mobile-slot__copy">
        <p class="mobile-slot__name">${escapeHtml(slot.team?.name || slot.label)}</p>
        <p class="mobile-slot__meta">${escapeHtml(slot.note)}</p>
      </div>
      <span class="mobile-slot__tag">${isWinner ? "Picked" : slot.team ? `No. ${slot.team.seed}` : "Open"}</span>
    </div>
  `;
}

function renderViewMode(bracket, progress, currentContext) {
  const viewMode = getViewMode();
  document.body.dataset.viewMode = viewMode;
  elements.pickerScreen.hidden = viewMode !== "pick";
  elements.bracketScreen.hidden = viewMode !== "bracket";

  elements.pickViewButton.classList.toggle("is-active", viewMode === "pick");
  elements.pickViewButton.setAttribute("aria-pressed", viewMode === "pick");
  elements.bracketViewButton.classList.toggle("is-active", viewMode === "bracket");
  elements.bracketViewButton.setAttribute("aria-pressed", viewMode === "bracket");

  renderBracketViewHeader(bracket, progress, currentContext);
  renderBracketCanvas(bracket);
}

function renderBracketViewHeader(bracket, progress, currentContext) {
  const champion = getChampion(bracket);
  const nextOpen =
    currentContext.visibleGames.find((game) => !bracket.picks[game.id]) || currentContext.currentGame;

  elements.bracketViewTitle.textContent = bracket.name || "Untitled bracket";
  elements.bracketViewHint.textContent = champion
    ? `${champion.name} is your current champion pick. ${progress.pickedCount} of ${progress.total} games are locked in.`
    : nextOpen
      ? `${progress.pickedCount} of ${progress.total} picks are locked in. This live bracket updates as you pick, and the next open game is ${getPreviewLabel(nextOpen, bracket.picks)}.`
      : "Your live bracket board is ready for a full look.";
}

async function renderBracketCanvas(bracket) {
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
    startNewBracket(elements.newBracketNameInput.value);
  });

  elements.useAutoNameButton.addEventListener("click", () => {
    startNewBracket(state.pendingBracketName);
  });

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
    const deletingLastBracket = state.store.brackets.length === 1;
    const confirmMessage = deletingLastBracket
      ? `Delete "${bracket.name}"? A fresh blank bracket will be created right away.`
      : `Delete "${bracket.name}"? This removes its saved picks from this device.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    state.store.brackets = state.store.brackets.filter((item) => item.id !== bracket.id);
    ensureCurrentBracket();
    state.activeGameId = null;
    state.bracketCanvasSignature = null;
    persistStore();
    render();
    showToast(deletingLastBracket ? "Bracket deleted. Fresh bracket ready." : "Bracket deleted.");
  });

  elements.bracketNameInput.addEventListener("input", (event) => {
    const bracket = getCurrentBracket();
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

    state.activeGameId = visibleGames[currentIndex - 1].id;
    render();
  });

  elements.nextGameButton.addEventListener("click", () => {
    const { currentIndex, visibleGames } = getCurrentGameContext();
    if (currentIndex < 0 || currentIndex >= visibleGames.length - 1) {
      return;
    }

    state.activeGameId = visibleGames[currentIndex + 1].id;
    render();
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

  elements.matchupStage.addEventListener("click", (event) => {
    const teamButton = event.target.closest("[data-team-pick]");
    if (!teamButton || !state.activeGameId) {
      return;
    }

    setPick(state.activeGameId, teamButton.dataset.teamPick);
  });

  elements.exportJsonButton.addEventListener("click", exportJson);
  elements.exportImageButton.addEventListener("click", exportPoster);
}

async function exportJson() {
  const bracket = getCurrentBracket();
  const snapshot = buildExportSnapshot(bracket);
  const fileName = `${slugifyFileName(bracket.name)}-2026-picks.json`;
  const result = await saveBlob(
    new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" }),
    fileName,
    `${bracket.name} picks`
  );
  if (result !== "cancelled") {
    showToast(result === "shared" ? "JSON ready to share." : "JSON export ready.");
  }
}

function buildExportSnapshot(bracket) {
  const picks = state.navigationGames.map((game) => {
    const matchup = resolveGame(game, bracket.picks);
    const winnerId = bracket.picks[game.id] || null;

    return {
      gameId: game.id,
      round: game.roundLabel,
      region: game.region,
      title: game.title,
      teams: [matchup.top?.name || null, matchup.bottom?.name || null],
      winnerId,
      winnerName: winnerId ? state.teamsById[winnerId]?.name || null : null,
    };
  });

  return {
    exportedAt: new Date().toISOString(),
    bracketName: bracket.name,
    datasetId: state.data.meta.tournamentId,
    datasetSource: {
      sourceName: state.data.meta.sourceName,
      sourceUrl: state.data.meta.sourceUrl,
      sourceUpdatedLabel: state.data.meta.sourceUpdatedLabel,
      officialBracket: state.data.meta.officialBracket,
      note: state.data.meta.note,
    },
    progress: getProgress(bracket),
    champion: getChampion(bracket)?.name || null,
    picks,
  };
}

async function exportPoster() {
  const bracket = getCurrentBracket();
  const canvas = document.createElement("canvas");
  await renderPosterCanvas(canvas, bracket, { width: 2600, height: 1800 });

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const fileName = `${slugifyFileName(bracket.name)}-2026-poster.png`;
  const result = await saveBlob(blob, fileName, `${bracket.name} bracket poster`);
  if (result !== "cancelled") {
    showToast(result === "shared" ? "Poster ready to share." : "Poster export ready.");
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
  const stripHeight = 98;
  const gapAfterHeader = 18;
  const gapAfterStrip = 24;
  const bodyGapY = 38;
  const sideGapX = 34;
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
      label: "Exported",
      value: new Date().toLocaleDateString(),
      tint: "#e6f3ff",
    },
    {
      label: "Champion",
      value: champion ? truncateText(ctx, compactTeamName(champion.name), 180) : "Still open",
      tint: champion ? hexToRgba(getThemeForTeam(champion).color, 0.18) : "#eef1f5",
      logo: champion?.logo || null,
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
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    roundRect(ctx, x + 12, y + 28, 32, 32, 12);
    ctx.fill();
    const image = await loadImage(logo);
    ctx.drawImage(image, x + 18, y + 34, 20, 20);
    valueX = x + 50;
  }

  ctx.fillStyle = "#23303d";
  ctx.font = '800 28px "Baloo 2"';
  ctx.fillText(value, valueX, y + 54);
}

async function drawPosterFirstFourRail(ctx, bracket, layout) {
  const games = state.navigationGames.filter((game) => game.round === 0);
  const { firstFour } = layout;
  const labelWidth = 150;
  const gap = 14;
  const cardWidth = (firstFour.width - labelWidth - 32 - gap * 3) / 4;
  const cardHeight = 70;
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
    roundRect(ctx, x, firstFour.y + 14, cardWidth, cardHeight, 22);
    ctx.fill();

    ctx.fillStyle = hexToRgba(theme.color, 0.12);
    roundRect(ctx, x + 10, firstFour.y + 24, cardWidth - 20, cardHeight - 20, 16);
    ctx.fill();

    ctx.fillStyle = "#5c6a79";
    ctx.font = '800 14px "Nunito"';
    ctx.fillText(`${game.region} No. ${game.seedLine}`, x + 16, firstFour.y + 32);

    await drawPosterGameBox(
      ctx,
      game,
      { x: x + 12, y: firstFour.y + 30, width: cardWidth - 24, height: 42 },
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
  const topMidY = (regionAnchors.East.championAnchor.y + regionAnchors.Midwest.championAnchor.y) / 2;
  const rightMidY = (regionAnchors.South.championAnchor.y + regionAnchors.West.championAnchor.y) / 2;
  const semiCenterY = (topMidY + rightMidY) / 2;
  const semiHeight = 68;
  const semiWidth = 222;
  const titleWidth = 276;
  const titleHeight = 72;
  const semifinalOne = state.gamesById.get("final-four-g1");
  const semifinalTwo = state.gamesById.get("final-four-g2");
  const titleGame = state.gamesById.get("championship");
  const leftSemiRect = createPosterRect(center.x + 22, semiCenterY - semiHeight / 2, semiWidth, semiHeight);
  const rightSemiRect = createPosterRect(
    center.x + center.width - semiWidth - 22,
    semiCenterY - semiHeight / 2,
    semiWidth,
    semiHeight
  );
  const titleRect = createPosterRect(
    center.x + (center.width - titleWidth) / 2,
    semiCenterY + 176,
    titleWidth,
    titleHeight
  );

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

  ctx.fillStyle = "#23303d";
  ctx.font = '800 24px "Baloo 2"';
  ctx.fillText("National Championship", titleRect.x - 8, titleRect.y - 18);

  drawPosterConnector(
    ctx,
    getPosterWinnerAnchor(semifinalOne, leftSemiRect, bracket, "left"),
    getPosterTargetAnchor(titleRect, 0, "left"),
    getPosterConnectionColor(semifinalOne, bracket, "#ff8a5b")
  );
  drawPosterConnector(
    ctx,
    getPosterWinnerAnchor(semifinalTwo, rightSemiRect, bracket, "right"),
    getPosterTargetAnchor(titleRect, 1, "right"),
    getPosterConnectionColor(semifinalTwo, bracket, "#63b7ff")
  );

  await drawPosterGameBox(ctx, titleGame, titleRect, bracket, {
    neutralColor: CHAMPIONSHIP_THEME.color,
    emphasize: true,
  });

  await drawPosterChampionBadge(ctx, bracket, {
    x: center.x + 44,
    y: titleRect.y + 120,
    width: center.width - 88,
    height: 182,
  });
}

async function drawPosterChampionBadge(ctx, bracket, rect) {
  const champion = getChampion(bracket);

  ctx.fillStyle = "rgba(255,255,255,0.94)";
  roundRect(ctx, rect.x, rect.y, rect.width, rect.height, 28);
  ctx.fill();

  ctx.fillStyle = champion ? "rgba(255, 182, 70, 0.18)" : "rgba(35, 48, 61, 0.06)";
  roundRect(ctx, rect.x + 14, rect.y + 14, rect.width - 28, rect.height - 28, 22);
  ctx.fill();

  ctx.fillStyle = "#5c6a79";
  ctx.font = '800 16px "Nunito"';
  ctx.fillText("Champion pick", rect.x + 22, rect.y + 28);

  if (!champion) {
    ctx.fillStyle = "#23303d";
    ctx.font = '800 34px "Baloo 2"';
    ctx.fillText("Your winner is still open", rect.x + 22, rect.y + 86);
    ctx.fillStyle = "#5c6a79";
    ctx.font = '800 19px "Nunito"';
    ctx.fillText("Make more picks and export again to lock the trophy in.", rect.x + 22, rect.y + 120);
    return;
  }

  const theme = getThemeForTeam(champion);
  const image = await loadImage(champion.logo);

  ctx.fillStyle = "rgba(255,255,255,0.96)";
  roundRect(ctx, rect.x + 22, rect.y + 44, 116, 116, 26);
  ctx.fill();
  ctx.fillStyle = hexToRgba(theme.color, 0.16);
  roundRect(ctx, rect.x + 30, rect.y + 52, 100, 100, 22);
  ctx.fill();
  ctx.drawImage(image, rect.x + 48, rect.y + 70, 64, 64);

  ctx.fillStyle = "#23303d";
  ctx.font = '800 42px "Baloo 2"';
  ctx.fillText(compactTeamName(champion.name), rect.x + 164, rect.y + 90);

  ctx.fillStyle = "#5c6a79";
  ctx.font = '800 21px "Nunito"';
  ctx.fillText(
    `${champion.conference} • No. ${champion.seed} • ${getTeamRecordLabel(champion)}`,
    rect.x + 164,
    rect.y + 128
  );

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
  const slots = getPosterGameSlots(game, bracket.picks);
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
        ? hexToRgba(getThemeForTeam(slot.team).color, 0.18)
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
  if (slot.team) {
    const image = await loadImage(slot.team.logo);
    const shellX = slotRect.x + 6;
    const shellY = slotRect.y + 3;
    ctx.fillStyle = "rgba(255,255,255,0.84)";
    roundRect(ctx, shellX, shellY, iconShell, iconShell, compact ? 6 : 8);
    ctx.fill();
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

function getPosterGameSlots(game, picks) {
  return game.slots.map((slot) => getPosterSlotDetails(slot, picks));
}

function getPosterSlotDetails(slot, picks) {
  if (slot.type === "team") {
    const team = state.teamsById[slot.teamId] || null;
    return {
      team,
      label: team ? `${team.seed} ${compactTeamName(team.name)}` : "TBD",
    };
  }

  const pickedTeamId = picks[slot.gameId];
  if (pickedTeamId) {
    const team = state.teamsById[pickedTeamId] || null;
    return {
      team,
      label: team ? `${team.seed} ${compactTeamName(team.name)}` : "TBD",
    };
  }

  const sourceGame = state.gamesById.get(slot.gameId);
  if (sourceGame?.round === 0) {
    const sourceTeams = sourceGame.slots
      .map((sourceSlot) => state.teamsById[sourceSlot.teamId] || null)
      .filter(Boolean)
      .map((team) => compactTeamName(team.name));

    return {
      team: null,
      label: sourceTeams.join(" / ") || "Play-in winner",
    };
  }

  return {
    team: null,
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
  const slots = getPosterGameSlots(game, bracket.picks);
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
  return winner ? hexToRgba(getThemeForTeam(winner).color, 0.86) : hexToRgba(fallbackColor, 0.34);
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

async function saveBlob(blob, fileName, title) {
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
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") {
        return "cancelled";
      }
    }
  }

  downloadBlob(blob, fileName);
  return "downloaded";
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  if (window.matchMedia("(pointer: coarse)").matches) {
    link.target = "_blank";
    link.rel = "noopener";
  }
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1200);
}

function renderFatal(error) {
  elements.sourceStatus.textContent = "Could not load bracket data";
  elements.sourceNote.textContent = error.message;
  elements.matchupEyebrow.textContent = "Loading problem";
  elements.matchupTitle.textContent = "The bracket picker could not start";
  elements.matchupHint.textContent = "Check the data file path and reload the page.";
  elements.matchupStage.innerHTML = `
    <div class="empty-state">
      <h3>Bracket data missing</h3>
      <p>${escapeHtml(error.message)}</p>
    </div>
  `;
}

function showToast(message) {
  clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");

  state.toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
  }, 2200);
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

function getPreviewLabel(game, picks) {
  const matchup = resolveGame(game, picks);
  if (matchup.top && matchup.bottom) {
    return `${matchup.top.name} vs ${matchup.bottom.name}`;
  }

  return game.title;
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
