const STORAGE_KEY = "bracket-parade.v1";
const LEGACY_STORAGE_KEYS = ["lil-bracket-buddy.v1"];
const MAX_BRACKET_NAME = 40;
const DEFAULT_BRACKET_NAMES = [
  "Victory Parade",
  "Mascot March",
  "Halftime Heroes",
  "Buzzer Beater",
];

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
};

const elements = {
  sourceStatus: document.querySelector("#sourceStatus"),
  sourceNote: document.querySelector("#sourceNote"),
  bracketSelect: document.querySelector("#bracketSelect"),
  newBracketButton: document.querySelector("#newBracketButton"),
  deleteBracketButton: document.querySelector("#deleteBracketButton"),
  bracketNameInput: document.querySelector("#bracketNameInput"),
  resetButton: document.querySelector("#resetButton"),
  exportJsonButton: document.querySelector("#exportJsonButton"),
  exportImageButton: document.querySelector("#exportImageButton"),
  matchupEyebrow: document.querySelector("#matchupEyebrow"),
  matchupTitle: document.querySelector("#matchupTitle"),
  matchupHint: document.querySelector("#matchupHint"),
  progressCount: document.querySelector("#progressCount"),
  progressFill: document.querySelector("#progressFill"),
  roundPills: document.querySelector("#roundPills"),
  matchupStage: document.querySelector("#matchupStage"),
  prevGameButton: document.querySelector("#prevGameButton"),
  clearPickButton: document.querySelector("#clearPickButton"),
  nextGameButton: document.querySelector("#nextGameButton"),
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
      return { brackets: [], currentBracketId: null };
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.brackets)) {
      return { brackets: [], currentBracketId: null };
    }

    return {
      brackets: parsed.brackets.map(normalizeBracket),
      currentBracketId: parsed.currentBracketId || null,
    };
  } catch {
    return { brackets: [], currentBracketId: null };
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
  while (usedNames.has(`Superstar Bracket ${counter}`)) {
    counter += 1;
  }

  return `Superstar Bracket ${counter}`;
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

  if (!state.store.brackets.some((bracket) => bracket.id === state.store.currentBracketId)) {
    state.store.currentBracketId = state.store.brackets[0].id;
  }
}

function getCurrentBracket() {
  return state.store.brackets.find((bracket) => bracket.id === state.store.currentBracketId);
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

  elements.deleteBracketButton.disabled = state.store.brackets.length <= 1;
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
          <p>${escapeHtml(champion.conference)} • ${escapeHtml(champion.record)} record</p>
        </div>
      </div>
    </div>
  `;
}

function renderTeamCard(team, game, pickedTeamId, side) {
  const theme = getThemeForTeam(team);
  const sticker = getTeamSticker(team);
  const badges = getTeamBadges(team);
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
        <span class="team-card__seed">Seed #${team.seed}</span>
        <span class="team-card__sticker">${escapeHtml(sticker)}</span>
      </div>

      <div class="team-card__crest">
        <img src="${escapeAttribute(team.logo)}" alt="${escapeAttribute(team.name)} logo" />
      </div>

      <div class="team-card__body">
        <h3 class="team-card__name">${escapeHtml(team.name)}</h3>
        <p class="team-card__conference">${escapeHtml(team.conference)} • ${escapeHtml(team.record)}</p>
      </div>

      <div class="team-card__badges">
        ${badges.map((badge) => `<span class="team-card__badge">${escapeHtml(badge)}</span>`).join("")}
      </div>

      <div class="team-card__stats">
        ${renderStatChip("Record", team.record)}
        ${renderStatChip("NET", `#${team.net}`)}
        ${renderStatChip("Quad 1", team.quad1)}
        ${renderStatChip("SOS", `#${team.sos}`)}
      </div>

      <div class="team-card__footer">
        <span class="team-card__pulse">${escapeHtml(pulseText)}</span>
        <span class="team-card__button">${isPicked ? "Picked winner" : "Pick this team"}</span>
      </div>
    </button>
  `;
}

function renderStatChip(label, value) {
  return `
    <div class="stat-chip">
      <p class="stat-chip__label">${escapeHtml(label)}</p>
      <p class="stat-chip__value">${escapeHtml(value)}</p>
    </div>
  `;
}

function getTeamSticker(team) {
  if (team.seed === 1) {
    return "Top seed";
  }

  if (team.net <= 8) {
    return "Top-8 NET";
  }

  if (team.seed >= 12) {
    return "Upset alert";
  }

  if (team.wins >= 27) {
    return `${team.wins} wins`;
  }

  return "Ready to dance";
}

function getTeamBadges(team) {
  const badges = [];

  if (team.wins >= 30) {
    badges.push("30-win club");
  }

  if (team.net <= 16) {
    badges.push(`NET #${team.net}`);
  }

  if (team.quad1 && !team.quad1.startsWith("0-")) {
    badges.push(`Q1 ${team.quad1}`);
  }

  if (team.seed >= 12) {
    badges.push("Big upset energy");
  }

  if (!badges.length) {
    badges.push(`${team.conference} contender`);
  }

  return badges.slice(0, 3);
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

function attachEvents() {
  elements.bracketSelect.addEventListener("change", (event) => {
    state.store.currentBracketId = event.target.value;
    state.activeGameId = null;
    persistStore();
    render();
  });

  elements.newBracketButton.addEventListener("click", () => {
    const bracket = createBracket();
    state.store.brackets.unshift(bracket);
    state.store.currentBracketId = bracket.id;
    state.activeGameId = null;
    persistStore();
    render();
    showToast(`Created ${bracket.name}.`);
  });

  elements.deleteBracketButton.addEventListener("click", () => {
    const bracket = getCurrentBracket();

    if (!window.confirm(`Delete "${bracket.name}"? This removes its saved picks from this device.`)) {
      return;
    }

    state.store.brackets = state.store.brackets.filter((item) => item.id !== bracket.id);
    ensureCurrentBracket();
    state.activeGameId = null;
    persistStore();
    render();
    showToast("Bracket deleted.");
  });

  elements.bracketNameInput.addEventListener("input", (event) => {
    const bracket = getCurrentBracket();
    bracket.name = event.target.value.slice(0, MAX_BRACKET_NAME);
    touchBracket(bracket);
    persistStore();
    renderSnapshot(bracket);
    renderToolbar(bracket);
  });

  elements.bracketNameInput.addEventListener("blur", () => {
    const bracket = getCurrentBracket();
    if (bracket.name.trim()) {
      return;
    }

    bracket.name = nextBracketName();
    touchBracket(bracket);
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

function exportJson() {
  const bracket = getCurrentBracket();
  const snapshot = buildExportSnapshot(bracket);
  const fileName = `${slugifyFileName(bracket.name)}-2026-picks.json`;

  downloadBlob(
    new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" }),
    fileName
  );
  showToast("JSON export ready.");
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
  await document.fonts.ready;

  const canvas = document.createElement("canvas");
  const width = 1600;
  const height = 2200;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  drawPosterBackground(ctx, width, height);
  drawPosterHeader(ctx, bracket, width);
  await drawPosterChampion(ctx, bracket, width);
  await drawPosterFinalFour(ctx, bracket, width);
  drawPosterRoundSummary(ctx, bracket, width);
  drawPosterRounds(ctx, bracket, width);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const fileName = `${slugifyFileName(bracket.name)}-2026-poster.png`;
  downloadBlob(blob, fileName);
  showToast("Poster export ready.");
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

function drawPosterHeader(ctx, bracket, width) {
  ctx.fillStyle = "#23303d";
  ctx.font = '800 72px "Baloo 2"';
  ctx.fillText("Bracket Parade", 80, 110);

  ctx.fillStyle = "#5c6a79";
  ctx.font = '800 22px "Nunito"';
  ctx.fillText("2026 March Madness picks", 80, 154);
  ctx.fillText(
    state.data.meta.officialBracket
      ? `Official field • ${state.data.meta.sourceUpdatedLabel}`
      : `Projected field • ${state.data.meta.sourceUpdatedLabel}`,
    80,
    188
  );

  ctx.fillStyle = "#23303d";
  ctx.font = '800 46px "Baloo 2"';
  ctx.fillText(bracket.name, 80, 258);

  const progress = getProgress(bracket);
  drawPosterPill(ctx, {
    x: width - 380,
    y: 82,
    width: 300,
    label: "Picks made",
    value: `${progress.pickedCount}/${progress.total}`,
    tint: "#fff1d6",
  });

  drawPosterPill(ctx, {
    x: width - 380,
    y: 172,
    width: 300,
    label: "Exported",
    value: new Date().toLocaleDateString(),
    tint: "#e6f4ff",
  });
}

function drawPosterPill(ctx, { x, y, width, label, value, tint }) {
  ctx.fillStyle = tint;
  roundRect(ctx, x, y, width, 72, 26);
  ctx.fill();

  ctx.fillStyle = "#5c6a79";
  ctx.font = '800 18px "Nunito"';
  ctx.fillText(label, x + 18, y + 26);

  ctx.fillStyle = "#23303d";
  ctx.font = '800 28px "Baloo 2"';
  ctx.fillText(value, x + 18, y + 56);
}

async function drawPosterChampion(ctx, bracket, width) {
  const champion = getChampion(bracket);
  const boxX = 80;
  const boxY = 318;
  const boxWidth = width - 160;
  const boxHeight = 190;

  ctx.fillStyle = "rgba(255,255,255,0.82)";
  roundRect(ctx, boxX, boxY, boxWidth, boxHeight, 34);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 182, 70, 0.2)";
  roundRect(ctx, boxX + 18, boxY + 18, boxWidth - 36, boxHeight - 36, 26);
  ctx.fill();

  ctx.fillStyle = "#5c6a79";
  ctx.font = '800 20px "Nunito"';
  ctx.fillText("Champion pick", boxX + 36, boxY + 44);

  if (!champion) {
    ctx.fillStyle = "#23303d";
    ctx.font = '800 42px "Baloo 2"';
    ctx.fillText("Still waiting for your final winner", boxX + 36, boxY + 104);
    ctx.fillStyle = "#5c6a79";
    ctx.font = '800 24px "Nunito"';
    ctx.fillText("Make more picks to unlock the title game champion.", boxX + 36, boxY + 142);
    return;
  }

  const image = await loadImage(champion.logo);

  ctx.fillStyle = "rgba(255,255,255,0.94)";
  roundRect(ctx, boxX + 34, boxY + 54, 120, 120, 30);
  ctx.fill();
  ctx.drawImage(image, boxX + 54, boxY + 74, 80, 80);

  ctx.fillStyle = "#23303d";
  ctx.font = '800 52px "Baloo 2"';
  ctx.fillText(champion.name, boxX + 186, boxY + 112);

  ctx.fillStyle = "#5c6a79";
  ctx.font = '800 24px "Nunito"';
  ctx.fillText(`${champion.conference} • Seed #${champion.seed} • ${champion.record}`, boxX + 186, boxY + 152);
}

async function drawPosterFinalFour(ctx, bracket, width) {
  const games = state.navigationGames.filter((game) => game.round === 5);
  const startX = 80;
  const boxWidth = (width - 80 * 2 - 18 * 3) / 4;
  const y = 548;

  ctx.fillStyle = "#23303d";
  ctx.font = '800 30px "Baloo 2"';
  ctx.fillText("Final Four path", 80, 530);

  const semifinalTeams = games.flatMap((game) => {
    const matchup = resolveGame(game, bracket.picks);
    return [matchup.top, matchup.bottom];
  });

  for (let index = 0; index < 4; index += 1) {
    const team = semifinalTeams[index] || null;
    const x = startX + index * (boxWidth + 18);

    ctx.fillStyle = "rgba(255,255,255,0.85)";
    roundRect(ctx, x, y, boxWidth, 158, 28);
    ctx.fill();

    if (!team) {
      ctx.fillStyle = "#5c6a79";
      ctx.font = '800 20px "Nunito"';
      ctx.fillText("Waiting for", x + 24, y + 70);
      ctx.fillText("a semifinalist", x + 24, y + 98);
      continue;
    }

    const image = await loadImage(team.logo);
    ctx.fillStyle = hexToRgba(getThemeForTeam(team).color, 0.16);
    roundRect(ctx, x + 18, y + 18, 76, 76, 22);
    ctx.fill();
    ctx.drawImage(image, x + 32, y + 32, 48, 48);

    ctx.fillStyle = "#23303d";
    ctx.font = '800 28px "Baloo 2"';
    drawWrappedText(ctx, team.name, x + 18, y + 124, boxWidth - 36, 30, 2);

    ctx.fillStyle = "#5c6a79";
    ctx.font = '800 18px "Nunito"';
    ctx.fillText(`${team.region} • Seed #${team.seed}`, x + 18, y + 144);
  }
}

function drawPosterRoundSummary(ctx, bracket, width) {
  const tallies = getRoundTallies(bracket);
  const columns = 4;
  const gap = 14;
  const cardWidth = (width - 160 - gap * (columns - 1)) / columns;
  const cardHeight = 78;
  const startX = 80;
  const startY = 736;

  for (const [index, tally] of tallies.entries()) {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = startX + column * (cardWidth + gap);
    const y = startY + row * (cardHeight + gap);

    ctx.fillStyle = "rgba(255,255,255,0.82)";
    roundRect(ctx, x, y, cardWidth, cardHeight, 24);
    ctx.fill();

    ctx.fillStyle = tally.picked === tally.total ? "rgba(111, 214, 169, 0.24)" : "rgba(255, 182, 70, 0.18)";
    roundRect(ctx, x + 12, y + 12, cardWidth - 24, cardHeight - 24, 18);
    ctx.fill();

    ctx.fillStyle = "#5c6a79";
    ctx.font = '800 16px "Nunito"';
    ctx.fillText(tally.label, x + 18, y + 30);

    ctx.fillStyle = "#23303d";
    ctx.font = '800 28px "Baloo 2"';
    ctx.fillText(`${tally.picked}/${tally.total}`, x + 18, y + 62);
  }
}

function drawPosterRounds(ctx, bracket, width) {
  const sections = [
    { x: 80, y: 940, width: 430, rounds: [0, 1] },
    { x: 585, y: 940, width: 430, rounds: [2, 3] },
    { x: 1090, y: 940, width: 430, rounds: [4, 5, 6] },
  ];

  for (const section of sections) {
    let cursorY = section.y;

    for (const round of section.rounds) {
      const games = state.navigationGames.filter((game) => game.round === round);
      cursorY = drawPosterRoundSection(ctx, {
        x: section.x,
        y: cursorY,
        width: section.width,
        label: games[0]?.roundLabel || "",
        games,
        bracket,
      });
      cursorY += 24;
    }
  }
}

function drawPosterRoundSection(ctx, { x, y, width, label, games, bracket }) {
  const rowHeight = 26;
  const headerHeight = 58;
  const footerPadding = 14;
  const sectionHeight = headerHeight + games.length * rowHeight + footerPadding;
  const pickedCount = games.filter((game) => Boolean(bracket.picks[game.id])).length;

  ctx.fillStyle = "rgba(255,255,255,0.84)";
  roundRect(ctx, x, y, width, sectionHeight, 28);
  ctx.fill();

  ctx.fillStyle = "#23303d";
  ctx.font = '800 30px "Baloo 2"';
  ctx.fillText(label, x + 20, y + 34);

  ctx.fillStyle = "rgba(35, 48, 61, 0.08)";
  roundRect(ctx, x + width - 104, y + 16, 84, 28, 14);
  ctx.fill();

  ctx.fillStyle = "#23303d";
  ctx.font = '800 16px "Nunito"';
  ctx.fillText(`${pickedCount}/${games.length}`, x + width - 84, y + 35);

  let cursorY = y + headerHeight;

  for (const game of games) {
    const entry = buildPosterEntry(game, bracket);

    ctx.fillStyle = "rgba(35, 48, 61, 0.04)";
    roundRect(ctx, x + 14, cursorY - 16, width - 28, rowHeight - 4, 14);
    ctx.fill();

    ctx.fillStyle = entry.picked ? entry.color : "rgba(35, 48, 61, 0.14)";
    ctx.beginPath();
    ctx.arc(x + 30, cursorY - 4, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#5c6a79";
    ctx.font = '800 14px "Nunito"';
    ctx.fillText(entry.label, x + 44, cursorY + 1);

    ctx.fillStyle = entry.picked ? "#23303d" : "#7a858f";
    ctx.font = '800 14px "Nunito"';
    ctx.textAlign = "right";
    ctx.fillText(truncateText(ctx, entry.value, 220), x + width - 28, cursorY + 1);
    ctx.textAlign = "left";

    cursorY += rowHeight;
  }

  return y + sectionHeight;
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  const words = text.split(" ");
  const lines = [];
  let current = "";

  for (const word of words) {
    const testLine = current ? `${current} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      current = testLine;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    current = word;
  }

  if (current) {
    lines.push(current);
  }

  lines.slice(0, maxLines).forEach((line, index) => {
    const isLastVisibleLine = index === maxLines - 1 && lines.length > maxLines;
    ctx.fillText(isLastVisibleLine ? `${line}...` : line, x, y + index * lineHeight);
  });
}

function buildPosterEntry(game, bracket) {
  const winnerId = bracket.picks[game.id] || null;
  const winner = winnerId ? state.teamsById[winnerId] : null;
  const themeSource = winner || resolveGame(game, bracket.picks).top || resolveGame(game, bracket.picks).bottom;
  const theme = themeSource ? getThemeForTeam(themeSource) : CHAMPIONSHIP_THEME;

  return {
    label: getPosterGameLabel(game),
    value: winner ? winner.name : "Open",
    picked: Boolean(winner),
    color: theme.color,
  };
}

function getPosterGameLabel(game) {
  if (game.round === 0) {
    return `${regionAbbr(game.region)} ${game.seedLine}`;
  }

  if (game.round === 1) {
    const seeds = getPosterSeedPair(game);
    return `${regionAbbr(game.region)} ${seeds}`;
  }

  if (game.round === 2) {
    return `${regionAbbr(game.region)} R2-${extractSequence(game)}`;
  }

  if (game.round === 3) {
    return `${regionAbbr(game.region)} S16-${extractSequence(game)}`;
  }

  if (game.round === 4) {
    return `${regionAbbr(game.region)} Champ`;
  }

  if (game.round === 5) {
    return `Semi ${extractSequence(game)}`;
  }

  return "Title";
}

function getPosterSeedPair(game) {
  const seeds = game.slots.map((slot) => {
    if (slot.type === "team") {
      return state.teamsById[slot.teamId]?.seed ?? "?";
    }

    const sourceGame = state.gamesById.get(slot.gameId);
    return sourceGame?.seedLine ?? "?";
  });

  return `${seeds[0]}/${seeds[1]}`;
}

function regionAbbr(region) {
  return (
    {
      East: "E",
      Midwest: "MW",
      South: "S",
      West: "W",
      "Final Four": "FF",
      "National Championship": "NC",
    }[region] || region
  );
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

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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
