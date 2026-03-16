import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";

const ROOT = process.cwd();
const NCAA_BRACKET_URL = "https://www.ncaa.com/march-madness-live/bracket";
const NCAA_TEAM_STATS_URL =
  "https://data.ncaa.com/prod/mml/2026/mobile/bracket_iq/ncaa_team_stats.json";
const DATA_PATH = path.join(ROOT, "data", "bracket-2026.json");
const LEGACY_DATA_PATH = path.join(ROOT, "data", "bracket-2026-projected.json");
const PREVIOUS_DATA_PATHS = [DATA_PATH, LEGACY_DATA_PATH];

const REGION_THEMES = {
  East: { color: "#ff8a5b", glow: "#ffd699" },
  Midwest: { color: "#45b36b", glow: "#c7f0a4" },
  South: { color: "#3b82f6", glow: "#bbd8ff" },
  West: { color: "#a855f7", glow: "#f0c7ff" },
};

const ROUND_LABELS = {
  0: "First Four",
  1: "First Round",
  2: "Second Round",
  3: "Sweet 16",
  4: "Elite 8",
  5: "Final Four",
  6: "National Championship",
};

const STANDARD_MATCHUP_ORDER = [
  [1, 16],
  [8, 9],
  [5, 12],
  [4, 13],
  [6, 11],
  [3, 14],
  [7, 10],
  [2, 15],
];

const FINAL_FOUR_PAIRINGS = [
  ["East", "Midwest"],
  ["South", "West"],
];

const FIRST_FOUR_REGION_MAP = {
  E: "East",
  MW: "Midwest",
  S: "South",
  W: "West",
};

const NEW_TEAM_CBS_LOOKUP = new Map([
  [
    normalizeName("Cal Baptist"),
    { code: "CALBPTST", pageSlug: "california-baptist-lancers" },
  ],
  [normalizeName("Hawaii"), { code: "HAWAII", pageSlug: "hawaii-warriors" }],
  [
    normalizeName("Kennesaw St."),
    { code: "KENSAW", pageSlug: "kennesaw-state-owls" },
  ],
  [normalizeName("Penn"), { code: "PENN", pageSlug: "pennsylvania-quakers" }],
  [normalizeName("Prairie View A&M"), { code: "PVAM", pageSlug: "prairie-view-am-panthers" }],
  [normalizeName("SMU"), { code: "SMU", pageSlug: "smu-mustangs" }],
]);

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function toSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/\u2019/g, "'")
    .replace(/\bmiami\s*\(fl\)\b/g, "miami")
    .replace(/\bn\.\s*carolina\b/g, "north carolina")
    .replace(/\bn\.\s*dakota st\.?\b/g, "north dakota st")
    .replace(/\bn\.\s*iowa\b/g, "northern iowa")
    .replace(/\bliu\b/g, "long island")
    .replace(/\bqueens\s*\(n\.c\.\)\b/g, "queens")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

function parseInteger(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchText(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

async function fetchJson(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(20_000),
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      accept: "application/json,*/*;q=0.8",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.json();
}

async function readPreviousTeams() {
  for (const candidate of PREVIOUS_DATA_PATHS) {
    try {
      const raw = await fs.readFile(candidate, "utf8");
      const parsed = JSON.parse(raw);
      if (parsed?.teams && typeof parsed.teams === "object") {
        return new Map(
          Object.values(parsed.teams).map((team) => [normalizeName(team.name), team])
        );
      }
    } catch {
      // Continue to the next candidate.
    }
  }

  return new Map();
}

function extractInitialState(html) {
  const marker = "window.__INITIAL_STATE__ = ";
  const start = html.indexOf(marker);
  ensure(start >= 0, "Unable to find NCAA initial state");

  const end = html.indexOf("</script>", start);
  ensure(end >= 0, "Unable to find NCAA initial state script end");

  const code = html.slice(start, end);
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { timeout: 5000 });

  ensure(sandbox.window.__INITIAL_STATE__?.bracket, "NCAA initial state did not include bracket data");
  return sandbox.window.__INITIAL_STATE__;
}

function cleanRegionTitle(value) {
  const key = String(value || "").trim().toUpperCase();
  const map = {
    EAST: "East",
    MIDWEST: "Midwest",
    SOUTH: "South",
    WEST: "West",
  };
  ensure(map[key], `Unknown region title: ${value}`);
  return map[key];
}

function getFirstFourRegion(value) {
  const key = String(value || "").trim().toUpperCase();
  ensure(FIRST_FOUR_REGION_MAP[key], `Unknown First Four region: ${value}`);
  return FIRST_FOUR_REGION_MAP[key];
}

function parseNcaaTeam(team) {
  return {
    name: team.nameShort,
    seed: parseInteger(team.seed),
    seoname: team.seoname,
    isTop: Boolean(team.isTop),
    ncaaOrgId: parseInteger(team.ncaaOrgId),
  };
}

function loadBracketState(state) {
  const firstFourGames = state.bracket.firstFour.rounds[0].pods.map((pod) => ({
    bracketId: parseInteger(pod.bracketId),
    region: getFirstFourRegion(pod.region.abbreviation),
    seed: parseInteger(pod.teams[0]?.seed),
    teams: pod.teams.map(parseNcaaTeam),
  }));

  const regions = state.bracket.regions.map((region) => ({
    region: cleanRegionTitle(region.title),
    pods: region.rounds[0].pods.map((pod) => ({
      bracketId: parseInteger(pod.bracketId),
      teams: pod.teams.map(parseNcaaTeam),
    })),
  }));

  return { firstFourGames, regions };
}

function getNcaaStatsByName(teamStats) {
  return new Map(
    teamStats.tournamentTeams.map((team) => [
      normalizeName(team.market),
      {
        netranking: parseInteger(team.netranking),
        lastTenRecord: team.last_ten_games_record || "",
      },
    ])
  );
}

function getCbsLookup(name, previousTeam) {
  if (previousTeam?.code && previousTeam?.pageSlug) {
    return {
      code: previousTeam.code,
      pageSlug: previousTeam.pageSlug,
    };
  }

  return NEW_TEAM_CBS_LOOKUP.get(normalizeName(name)) || null;
}

function buildNcaaLogoUrl(seoname) {
  return `https://i.turner.ncaa.com/sites/default/files/images/logos/schools/bgl/${seoname}.svg`;
}

function upsertTeam(teams, previousTeamsByName, statsByName, ncaaTeam, region, seed, isPlayIn) {
  const normalizedName = normalizeName(ncaaTeam.name);
  const previousTeam = previousTeamsByName.get(normalizedName) || null;
  const lookup = getCbsLookup(ncaaTeam.name, previousTeam);
  const ncaaStats = statsByName.get(normalizedName) || null;
  const teamId =
    previousTeam?.id ||
    lookup?.code ||
    ncaaTeam.seoname.toUpperCase().replace(/[^A-Z0-9]+/g, "");

  const existing = teams.get(teamId) || {};

  teams.set(teamId, {
    id: teamId,
    code: lookup?.code || previousTeam?.code || existing.code || teamId,
    name: ncaaTeam.name,
    slug: toSlug(ncaaTeam.name),
    logo: `assets/logos/${ncaaTeam.seoname}.svg`,
    logoUrl: buildNcaaLogoUrl(ncaaTeam.seoname),
    pageSlug: lookup?.pageSlug || previousTeam?.pageSlug || existing.pageSlug || "",
    record: previousTeam?.record || existing.record || "",
    wins: previousTeam?.wins ?? existing.wins ?? null,
    losses: previousTeam?.losses ?? existing.losses ?? null,
    conference: previousTeam?.conference || existing.conference || "",
    net: ncaaStats?.netranking ?? previousTeam?.net ?? existing.net ?? null,
    quad1: previousTeam?.quad1 || existing.quad1 || "",
    quad2: previousTeam?.quad2 || existing.quad2 || "",
    quad3: previousTeam?.quad3 || existing.quad3 || "",
    quad4: previousTeam?.quad4 || existing.quad4 || "",
    sos: previousTeam?.sos ?? existing.sos ?? null,
    nextGame: previousTeam?.nextGame || existing.nextGame || "",
    nextOpponent: previousTeam?.nextOpponent || existing.nextOpponent || "",
    recentResults: existing.recentResults || previousTeam?.recentResults || [],
    recentRecord: existing.recentRecord || previousTeam?.recentRecord || "",
    currentStreak: existing.currentStreak || previousTeam?.currentStreak || "",
    region,
    seed,
    isPlayIn,
  });

  return teamId;
}

function getCompletedResultsFromSchedule(html) {
  const rows = [...html.matchAll(/<tr class="TableBase-bodyTr">([\s\S]*?)<\/tr>/g)];
  const results = [];

  for (const [, rowHtml] of rows) {
    const resultMatch = rowHtml.match(/<span class="CellGame-(?:win|lose)">\s*([WL])\s*<\/span>/);
    if (!resultMatch) {
      continue;
    }

    results.push(resultMatch[1]);
  }

  return results;
}

function getCurrentStreak(results) {
  if (!results.length) {
    return "";
  }

  const lastResult = results[results.length - 1];
  let count = 0;

  for (let index = results.length - 1; index >= 0; index -= 1) {
    if (results[index] !== lastResult) {
      break;
    }
    count += 1;
  }

  return `${lastResult}${count}`;
}

function getConferenceFromTeamPage(html) {
  const names = [...html.matchAll(/"@type":"SportsOrganization","name":"([^"]+)"/g)].map(
    (match) => match[1]
  );

  return names.find((name) => !name.startsWith("NCAA Division I")) || "";
}

async function enrichTeamsWithCbsData(teams) {
  let index = 0;

  for (const team of teams.values()) {
    index += 1;
    if (index === 1 || index % 12 === 0 || index === teams.size) {
      console.log(`Refreshing team pages (${index}/${teams.size})...`);
    }

    if (!team.code || !team.pageSlug) {
      continue;
    }

    if (!team.conference) {
      const teamUrl = `https://www.cbssports.com/college-basketball/teams/${team.code}/${team.pageSlug}/`;

      try {
        const teamHtml = await fetchText(teamUrl);
        team.conference = getConferenceFromTeamPage(teamHtml) || team.conference;
      } catch (error) {
        console.warn(`Unable to fetch team page for ${team.name}: ${error.message}`);
      }
    }

    const scheduleUrl = `https://www.cbssports.com/college-basketball/teams/${team.code}/${team.pageSlug}/schedule/`;

    try {
      const html = await fetchText(scheduleUrl);
      const results = getCompletedResultsFromSchedule(html);
      const recentResults = results.slice(-5);
      const wins = results.filter((result) => result === "W").length;
      const losses = results.filter((result) => result === "L").length;

      team.record = wins || losses ? `${wins}-${losses}` : team.record;
      team.wins = wins || losses ? wins : team.wins;
      team.losses = wins || losses ? losses : team.losses;
      team.recentResults = recentResults;
      team.recentRecord = recentResults.length
        ? `${recentResults.filter((result) => result === "W").length}-${recentResults.filter((result) => result === "L").length}`
        : "";
      team.currentStreak = getCurrentStreak(results);
    } catch (error) {
      console.warn(`Unable to fetch schedule page for ${team.name}: ${error.message}`);
    }
  }
}

function addGame(games, payload) {
  games.push({
    id: payload.id,
    round: payload.round,
    roundLabel: ROUND_LABELS[payload.round],
    region: payload.region,
    order: games.length + 1,
    title: payload.title,
    seedLine: payload.seedLine || null,
    slots: payload.slots,
  });
  return payload.id;
}

function buildRoundOneSlots(region, pairing, teams, playInLookup, teamIdByName) {
  const slots = [null, null];

  for (const team of teams) {
    const teamId = teamIdByName.get(normalizeName(team.name));
    ensure(teamId, `Missing team entry for ${team.name}`);
    slots[team.isTop ? 0 : 1] = { type: "team", teamId };
  }

  for (let index = 0; index < slots.length; index += 1) {
    if (slots[index]) {
      continue;
    }

    const missingSeed = pairing[index];
    const playInId = playInLookup.get(`${region}-${missingSeed}`);
    ensure(playInId, `Missing play-in winner for ${region} ${missingSeed}`);
    slots[index] = { type: "winner", gameId: playInId };
  }

  return slots;
}

async function downloadLogos(teams) {
  const logoDir = path.join(ROOT, "assets", "logos");
  await fs.mkdir(logoDir, { recursive: true });

  let index = 0;

  for (const team of teams.values()) {
    index += 1;
    if (index === 1 || index % 16 === 0 || index === teams.size) {
      console.log(`Downloading logos (${index}/${teams.size})...`);
    }

    const outputPath = path.join(logoDir, path.basename(team.logo));
    const response = await fetch(team.logoUrl, {
      signal: AbortSignal.timeout(20_000),
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        accept: "image/svg+xml,image/*;q=0.8,*/*;q=0.5",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download ${team.logoUrl}: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(outputPath, buffer);
  }
}

async function main() {
  const generatedAt = new Date();
  const previousTeamsByName = await readPreviousTeams();
  const bracketHtml = await fetchText(NCAA_BRACKET_URL);
  const initialState = extractInitialState(bracketHtml);
  const officialBracket = loadBracketState(initialState);
  const ncaaTeamStats = await fetchJson(NCAA_TEAM_STATS_URL);
  const statsByName = getNcaaStatsByName(ncaaTeamStats);

  const teams = new Map();
  const games = [];
  const playInLookup = new Map();
  const teamIdByName = new Map();

  for (const game of officialBracket.firstFourGames) {
    const id = `ff-${toSlug(game.region)}-${game.seed}`;
    playInLookup.set(`${game.region}-${game.seed}`, id);

    for (const team of game.teams) {
      const teamId = upsertTeam(
        teams,
        previousTeamsByName,
        statsByName,
        team,
        game.region,
        game.seed,
        true
      );
      teamIdByName.set(normalizeName(team.name), teamId);
    }

    addGame(games, {
      id,
      round: 0,
      region: game.region,
      title: `${game.region} ${game.seed}-seed play-in`,
      seedLine: String(game.seed),
      slots: game.teams.map((team) => ({
        type: "team",
        teamId: teamIdByName.get(normalizeName(team.name)),
      })),
    });
  }

  const regionChampionGames = {};

  for (const { region, pods } of officialBracket.regions) {
    const round64GameIds = [];
    const round32GameIds = [];
    const sweet16GameIds = [];

    ensure(pods.length === 8, `Expected 8 first-round games in ${region}`);

    pods.forEach((pod, index) => {
      const pairing = STANDARD_MATCHUP_ORDER[index];

      for (const team of pod.teams) {
        const teamId = upsertTeam(
          teams,
          previousTeamsByName,
          statsByName,
          team,
          region,
          team.seed,
          false
        );
        teamIdByName.set(normalizeName(team.name), teamId);
      }

      round64GameIds.push(
        addGame(games, {
          id: `${toSlug(region)}-r64-g${index + 1}`,
          round: 1,
          region,
          title: `${region} ${pairing[0]} vs ${pairing[1]}`,
          slots: buildRoundOneSlots(region, pairing, pod.teams, playInLookup, teamIdByName),
        })
      );
    });

    for (let index = 0; index < round64GameIds.length; index += 2) {
      round32GameIds.push(
        addGame(games, {
          id: `${toSlug(region)}-r32-g${index / 2 + 1}`,
          round: 2,
          region,
          title: `${region} second round game ${index / 2 + 1}`,
          slots: [
            { type: "winner", gameId: round64GameIds[index] },
            { type: "winner", gameId: round64GameIds[index + 1] },
          ],
        })
      );
    }

    for (let index = 0; index < round32GameIds.length; index += 2) {
      sweet16GameIds.push(
        addGame(games, {
          id: `${toSlug(region)}-s16-g${index / 2 + 1}`,
          round: 3,
          region,
          title: `${region} Sweet 16 game ${index / 2 + 1}`,
          slots: [
            { type: "winner", gameId: round32GameIds[index] },
            { type: "winner", gameId: round32GameIds[index + 1] },
          ],
        })
      );
    }

    regionChampionGames[region] = addGame(games, {
      id: `${toSlug(region)}-elite8`,
      round: 4,
      region,
      title: `${region} regional final`,
      slots: [
        { type: "winner", gameId: sweet16GameIds[0] },
        { type: "winner", gameId: sweet16GameIds[1] },
      ],
    });
  }

  const semifinalIds = FINAL_FOUR_PAIRINGS.map(([regionA, regionB], index) =>
    addGame(games, {
      id: `final-four-g${index + 1}`,
      round: 5,
      region: "Final Four",
      title: `${regionA} champion vs ${regionB} champion`,
      slots: [
        { type: "winner", gameId: regionChampionGames[regionA] },
        { type: "winner", gameId: regionChampionGames[regionB] },
      ],
    })
  );

  addGame(games, {
    id: "championship",
    round: 6,
    region: "National Championship",
    title: "National championship game",
    slots: [
      { type: "winner", gameId: semifinalIds[0] },
      { type: "winner", gameId: semifinalIds[1] },
    ],
  });

  await enrichTeamsWithCbsData(teams);
  await downloadLogos(teams);

  const data = {
    meta: {
      tournamentId: "2026-men-ncaa-official-2026-03-15",
      season: 2026,
      tournament: "NCAA Men's Basketball Tournament",
      officialBracket: true,
      sourceName: "NCAA March Madness Live",
      sourceUrl: NCAA_BRACKET_URL,
      sourceUpdatedLabel: "Released March 15, 2026",
      generatedAt: generatedAt.toISOString(),
      note:
        "Official NCAA bracket released Sunday, March 15, 2026. First Four games are March 17-18, 2026.",
      hotStreakSource:
        "Team records and recent form come from each team's current CBS Sports schedule page. NCAA NET rankings come from the NCAA bracket IQ team stats feed.",
    },
    regions: Object.entries(REGION_THEMES).map(([name, theme]) => ({
      name,
      color: theme.color,
      glow: theme.glow,
    })),
    teams: Object.fromEntries(
      [...teams.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([teamId, team]) => [teamId, team])
    ),
    games,
  };

  const serialized = JSON.stringify(data, null, 2);
  await fs.writeFile(DATA_PATH, serialized);
  await fs.writeFile(LEGACY_DATA_PATH, serialized);

  console.log(`Wrote ${games.length} games and ${teams.size} teams to ${path.relative(ROOT, DATA_PATH)}`);
  console.log(
    `Mirrored official data to ${path.relative(ROOT, LEGACY_DATA_PATH)} for cached-shell compatibility`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
