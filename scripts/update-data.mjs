import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const BRACKETOLOGY_URL = "https://www.cbssports.com/college-basketball/bracketology/";

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

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/&#x27;/g, "'");
}

function stripTags(value) {
  return decodeHtml(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function toSlug(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchText(url) {
  const response = await fetch(url, {
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

function extractSection(html, startPattern, endPattern, label) {
  const match = html.match(new RegExp(`${startPattern}([\\s\\S]*?)${endPattern}`));
  ensure(match, `Unable to find ${label}`);
  return match[1];
}

function parseBracketRow(rowHtml) {
  const seedMatch = rowHtml.match(
    /<div class="bracket-row-value bracket-row-seed">\s*([^<]+?)\s*<\/div>/
  );
  ensure(seedMatch, "Bracket row missing seed");

  const teamMatch = rowHtml.match(
    /\/college-basketball\/teams\/([^/]+)\/([^"]+)\/"[\s\S]*?<img class="TeamLogo-image" alt="team logo" src="([^"]+)"/
  );
  const nameMatch = rowHtml.match(
    /<div class="bracket-row-value full-width">[\s\S]*?<a href="\/college-basketball\/teams\/[^/]+\/[^"]+\/" class="">([\s\S]*?)<\/a>/
  );

  if (!teamMatch || !nameMatch) {
    return {
      seed: Number.parseInt(seedMatch[1].trim(), 10),
      empty: true,
    };
  }

  return {
    seed: Number.parseInt(seedMatch[1].trim(), 10),
    empty: false,
    code: teamMatch[1].trim(),
    pageSlug: teamMatch[2].trim(),
    logoUrl: teamMatch[3].trim(),
    name: stripTags(nameMatch[1]),
  };
}

function parseFirstFour(html) {
  const section = extractSection(
    html,
    String.raw`<h3 class="predictions-title">\s*First Four\s*<\/h3>`,
    String.raw`<h3 class="predictions-title">\s*First Round\s*<\/h3>`,
    "First Four section"
  );

  const regionBlocks = [...section.matchAll(/<div class="first-four-region">([\s\S]*?)<\/ul>\s*<\/div>/g)];
  const games = [];

  for (const [, block] of regionBlocks) {
    const regionMatch = block.match(/<div class="region-title">\s*([^<]+?)\s*<\/div>/);
    ensure(regionMatch, "First Four region missing title");

    const rowMatches = block.match(/<li class="bracket-row">[\s\S]*?<\/li>/g) || [];
    ensure(rowMatches.length === 2, "Unexpected First Four row count");

    const teams = rowMatches.map(parseBracketRow);
    const seed = teams[0].seed;

    games.push({
      region: stripTags(regionMatch[1]),
      seed,
      teams,
    });
  }

  return games;
}

function parseFirstRound(html) {
  const section = extractSection(
    html,
    String.raw`<h3 class="predictions-title">\s*First Round\s*<\/h3>`,
    String.raw`<div class="col-4">`,
    "First Round section"
  );

  const regionChunks = section.split('<div class="region-title">').slice(1);
  const regions = [];

  for (const chunk of regionChunks) {
    const regionName = stripTags(chunk.slice(0, chunk.indexOf("</div>")));
    const rowMatches = chunk.match(/<li class="bracket-row">[\s\S]*?<\/li>/g) || [];
    const slots = rowMatches.map(parseBracketRow);

    if (slots.length === 16) {
      regions.push({ region: regionName, slots });
    }
  }

  ensure(regions.length === 4, `Expected 4 regions, found ${regions.length}`);
  return regions;
}

function parseTeamIndex(html) {
  const tbodyMatch = html.match(
    /<h2 class="Card-title ">\s*<span class="title-text">\s*Team Bracket Index\s*<\/span>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/
  );
  ensure(tbodyMatch, "Unable to find Team Bracket Index table");

  const rows = tbodyMatch[1].match(/<tr class="[^"]*">[\s\S]*?<\/tr>/g) || [];
  const teamStats = new Map();

  for (const row of rows) {
    const codeMatch = row.match(/\/college-basketball\/teams\/([^/]+)\//);
    if (!codeMatch) {
      continue;
    }

    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((match) =>
      stripTags(match[1])
    );
    const nameCellIndex = cells.findIndex((cell) => /\(\d+-\d+\)$/.test(cell));
    ensure(nameCellIndex >= 0, `Unable to parse team row for ${codeMatch[1]}`);

    const nameRecordMatch = cells[nameCellIndex].match(/^(.*)\((\d+-\d+)\)$/);
    ensure(nameRecordMatch, `Unable to split name and record for ${codeMatch[1]}`);
    const displayName = nameRecordMatch[1].trim();
    const record = nameRecordMatch[2].trim();

    const [wins, losses] = record.split("-").map((value) => Number.parseInt(value, 10));
    const regionCell = cells[nameCellIndex - 2] || "";
    const regionLetter = regionCell || null;
    const maybeSeed = cells[nameCellIndex - 3] || "";
    const seed = /^\d+$/.test(maybeSeed) ? Number.parseInt(maybeSeed, 10) : null;
    const logoUrlMatch = row.match(/<img class="TeamLogo-image" alt="team logo" src="([^"]+)"/);
    const nextOpponent = cells[nameCellIndex + 9] || "";

    teamStats.set(codeMatch[1], {
      code: codeMatch[1],
      name: decodeHtml(displayName),
      record,
      wins,
      losses,
      conference: cells[nameCellIndex + 1] || "",
      net: Number.parseInt(cells[nameCellIndex + 2], 10),
      quad1: cells[nameCellIndex + 3] || "",
      quad2: cells[nameCellIndex + 4] || "",
      quad3: cells[nameCellIndex + 5] || "",
      quad4: cells[nameCellIndex + 6] || "",
      sos: Number.parseInt(cells[nameCellIndex + 7], 10),
      nextGame: cells[nameCellIndex + 8] || "",
      nextOpponent,
      regionLetter,
      seed,
      logoUrl: logoUrlMatch?.[1] || "",
    });
  }

  return teamStats;
}

function upsertTeam(teams, stats, row, region, seed, isPlayIn) {
  const existing = teams.get(row.code) || {};
  const logoFilename = `${row.code.toLowerCase()}.svg`;

  teams.set(row.code, {
    id: row.code,
    code: row.code,
    name: row.name || stats?.name || existing.name,
    slug: toSlug(row.name || stats?.name || row.code),
    logo: `assets/logos/${logoFilename}`,
    logoUrl: row.logoUrl || stats?.logoUrl || existing.logoUrl,
    pageSlug: row.pageSlug || existing.pageSlug || "",
    record: stats?.record || existing.record || "",
    wins: stats?.wins ?? existing.wins ?? null,
    losses: stats?.losses ?? existing.losses ?? null,
    conference: stats?.conference || existing.conference || "",
    net: stats?.net ?? existing.net ?? null,
    quad1: stats?.quad1 || existing.quad1 || "",
    quad2: stats?.quad2 || existing.quad2 || "",
    quad3: stats?.quad3 || existing.quad3 || "",
    quad4: stats?.quad4 || existing.quad4 || "",
    sos: stats?.sos ?? existing.sos ?? null,
    nextGame: stats?.nextGame || existing.nextGame || "",
    nextOpponent: stats?.nextOpponent || existing.nextOpponent || "",
    recentResults: existing.recentResults || [],
    recentRecord: existing.recentRecord || "",
    currentStreak: existing.currentStreak || "",
    region,
    seed,
    isPlayIn,
  });
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

async function enrichTeamsWithRecentForm(teams) {
  for (const team of teams.values()) {
    if (!team.code || !team.pageSlug) {
      continue;
    }

    const scheduleUrl = `https://www.cbssports.com/college-basketball/teams/${team.code}/${team.pageSlug}/schedule/`;

    try {
      const html = await fetchText(scheduleUrl);
      const results = getCompletedResultsFromSchedule(html);
      const recentResults = results.slice(-5);
      const recentWins = recentResults.filter((result) => result === "W").length;

      team.recentResults = recentResults;
      team.recentRecord = recentResults.length
        ? `${recentWins}-${recentResults.length - recentWins}`
        : "";
      team.currentStreak = getCurrentStreak(results);
    } catch (error) {
      console.warn(`Unable to fetch recent form for ${team.code}: ${error.message}`);
      team.recentResults = team.recentResults || [];
      team.recentRecord = team.recentRecord || "";
      team.currentStreak = team.currentStreak || "";
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

async function downloadLogos(teams) {
  const logoDir = path.join(ROOT, "assets", "logos");
  await fs.mkdir(logoDir, { recursive: true });

  for (const team of teams.values()) {
    const outputPath = path.join(logoDir, `${team.code.toLowerCase()}.svg`);
    const response = await fetch(team.logoUrl, {
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
  const generatedDateId = generatedAt.toISOString().slice(0, 10);
  const generatedDateLabel = generatedAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  });
  const html = await fetchText(BRACKETOLOGY_URL);
  const updatedMatch = html.match(
    /<span class="table-update-text">Updated<\/span>\s*([^<]+)/
  );
  ensure(updatedMatch, "Unable to find page updated time");

  const firstFourGames = parseFirstFour(html);
  const firstRoundRegions = parseFirstRound(html);
  const statsByCode = parseTeamIndex(html);
  const teams = new Map();
  const games = [];
  const playInLookup = new Map();

  for (const match of firstFourGames) {
    const id = `ff-${toSlug(match.region)}-${match.seed}`;
    playInLookup.set(`${match.region}-${match.seed}`, id);

    for (const row of match.teams) {
      const stats = statsByCode.get(row.code);
      upsertTeam(teams, stats, row, match.region, match.seed, true);
    }

    addGame(games, {
      id,
      round: 0,
      region: match.region,
      title: `${match.region} ${match.seed}-seed play-in`,
      seedLine: String(match.seed),
      slots: match.teams.map((team) => ({
        type: "team",
        teamId: team.code,
      })),
    });
  }

  const regionChampionGames = {};

  for (const { region, slots } of firstRoundRegions) {
    const themed = REGION_THEMES[region];
    ensure(themed, `Missing theme for ${region}`);

    slots.forEach((slot) => {
      if (!slot.empty) {
        const stats = statsByCode.get(slot.code);
        upsertTeam(teams, stats, slot, region, slot.seed, false);
      }
    });

    const round64GameIds = [];
    const round32GameIds = [];
    const sweet16GameIds = [];

    for (let index = 0; index < slots.length; index += 2) {
      const top = slots[index];
      const bottom = slots[index + 1];
      const matchup = STANDARD_MATCHUP_ORDER[index / 2];

      const slotPayload = [top, bottom].map((slot) => {
        if (!slot.empty) {
          return { type: "team", teamId: slot.code };
        }

        const playInId = playInLookup.get(`${region}-${slot.seed}`);
        ensure(playInId, `Missing play-in winner for ${region} ${slot.seed}`);
        return { type: "winner", gameId: playInId };
      });

      round64GameIds.push(
        addGame(games, {
          id: `${toSlug(region)}-r64-g${index / 2 + 1}`,
          round: 1,
          region,
          title: `${region} ${matchup[0]} vs ${matchup[1]}`,
          slots: slotPayload,
        })
      );
    }

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

  await enrichTeamsWithRecentForm(teams);
  await downloadLogos(teams);

  const data = {
    meta: {
      tournamentId: `2026-men-cbs-projected-${generatedDateId}`,
      season: 2026,
      tournament: "NCAA Men's Basketball Tournament",
      officialBracket: false,
      sourceName: "CBS Sports Bracketology",
      sourceUrl: BRACKETOLOGY_URL,
      sourceUpdatedLabel: `${updatedMatch[1].trim()} ET`,
      generatedAt: generatedAt.toISOString(),
      note:
        `The official 2026 NCAA men's bracket was not available on ${generatedDateLabel}. This dataset uses the current CBS Sports projected field and projected first-round matchups.`,
      hotStreakSource:
        "Recent form comes from each team's CBS Sports schedule page and uses the latest five completed games plus the current streak.",
    },
    regions: Object.entries(REGION_THEMES).map(([name, theme]) => ({
      name,
      color: theme.color,
      glow: theme.glow,
    })),
    teams: Object.fromEntries(
      [...teams.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([code, team]) => [code, team])
    ),
    games,
  };

  await fs.writeFile(
    path.join(ROOT, "data", "bracket-2026-projected.json"),
    JSON.stringify(data, null, 2)
  );

  console.log(
    `Wrote ${games.length} games and ${teams.size} teams to data/bracket-2026-projected.json`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
