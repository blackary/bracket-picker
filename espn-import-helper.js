"use strict";

/*
Usage:
1. Open the ESPN 2026 men's bracket page.
2. Open DevTools console.
3. Paste this file and press Enter.
4. Pick a Bracket Parade JSON export when prompted.

The helper fills ESPN's 63-pick bracket from a Bracket Parade export.
ESPN collapses the First Four into combo slots, so those picks cannot be
imported one-for-one.
*/

(function () {
  const CHALLENGE_ID = 277;
  const CHALLENGE_KEY = "tournament-challenge-bracket-2026";
  const HELPER_FLAG = "__BRACKET_PARADE_ESPN_IMPORT_READY__";
  const AUTORUN_FLAG = "__BRACKET_PARADE_ESPN_IMPORT_AUTORUN__";
  const STATUS_ID = "bracket-parade-espn-import-status";
  const EXPECTED_DATASET_ID = "2026-men-ncaa-official-2026-03-15-v2";
  const PLAY_IN_COMBO_BY_NAME = new Map([
    ["texas", "TEX/NCSU"],
    ["ncstate", "TEX/NCSU"],
    ["prairieviewam", "PV/LEH"],
    ["lehigh", "PV/LEH"],
    ["umbc", "UMBC/HOW"],
    ["howard", "UMBC/HOW"],
    ["miamiohio", "M-OH/SMU"],
    ["smu", "M-OH/SMU"],
  ]);
  const ESPN_NAME_ALIASES = new Map([
    ["cabaptist", "CA Baptist"],
    ["calbaptist", "CA Baptist"],
    ["iowast", "Iowa State"],
    ["miami", "Miami"],
    ["miamifl", "Miami"],
    ["ndakotast", "N Dakota St"],
    ["northdakotast", "N Dakota St"],
    ["ohiost", "Ohio State"],
    ["queensnc", "Queens"],
    ["saintlou", "Saint Louis"],
    ["saintlouis", "Saint Louis"],
    ["stjohns", "St John's"],
    ["stjohn", "St John's"],
    ["utahst", "Utah State"],
  ]);

  if (window[HELPER_FLAG]) {
    if (window.BracketParadeEspnImport) {
      window.BracketParadeEspnImport.run().catch((error) => {
        window.BracketParadeEspnImport.showStatus(error.message, "error");
      });
    }
    return;
  }

  window[HELPER_FLAG] = true;

  const api = {
    run,
    importSnapshot,
    showStatus,
    dismissStatus,
    chooseSnapshotFile,
  };

  window.BracketParadeEspnImport = api;

  if (window[AUTORUN_FLAG] !== false) {
    run().catch((error) => {
      showStatus(error.message, "error");
      throw error;
    });
  }

  async function run() {
    assertOnEspnBracketPage();
    showStatus("Choose a Bracket Parade JSON export.", "info");

    const snapshot = await chooseSnapshotFile();
    if (!snapshot) {
      showStatus("Import cancelled.", "info");
      return null;
    }

    const tiebreakerText = window.prompt(
      "Optional ESPN tiebreaker: championship total points. Leave blank to skip.",
      ""
    );
    const parsedTiebreaker = Number.parseInt(String(tiebreakerText || "").trim(), 10);
    const tiebreaker = Number.isFinite(parsedTiebreaker) ? parsedTiebreaker : null;

    await importSnapshot(snapshot, { tiebreaker });
    return snapshot;
  }

  async function importSnapshot(snapshot, options = {}) {
    assertOnEspnBracketPage();
    validateSnapshot(snapshot);

    showStatus("Loading ESPN matchup data…", "info");
    const propositions = await fetchEspnPropositions();
    const espnLookup = buildEspnLookup(propositions);
    const steps = buildImportSteps(snapshot, espnLookup);

    if (!steps.length) {
      throw new Error("This JSON export has no visible winners to import yet.");
    }

    for (let index = 0; index < steps.length; index += 1) {
      const step = steps[index];
      showStatus(
        `Importing ${index + 1}/${steps.length}: ${step.teams.join(" vs ")} -> ${step.winner}`,
        "info"
      );

      const section = await waitForMatchupSection(step);
      const selected = clickWinner(section, step.winner);
      if (!selected) {
        throw new Error(`Could not select "${step.winner}" for ${step.teams.join(" vs ")}.`);
      }

      await wait(35);
    }

    if (Number.isFinite(options.tiebreaker)) {
      setTiebreaker(options.tiebreaker);
    }

    const doneMessage = Number.isFinite(options.tiebreaker)
      ? "ESPN picks imported. Review the bracket, then save it on ESPN."
      : "ESPN picks imported. Add a tiebreaker on ESPN if you want, then save it.";
    showStatus(doneMessage, "success");
    return { stepsImported: steps.length };
  }

  function validateSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
      throw new Error("Could not read that JSON export.");
    }

    if (!Array.isArray(snapshot.picks)) {
      throw new Error("This file is not a Bracket Parade picks export.");
    }

    if (snapshot.datasetSource?.officialBracket !== true) {
      throw new Error("Use a fresh JSON export from the official 2026 bracket before importing.");
    }

    if (snapshot.datasetId !== EXPECTED_DATASET_ID) {
      throw new Error("Export a fresh JSON file from the current official bracket before importing.");
    }

    if (snapshot.bracketMode === "blindfold" && !snapshot.blindfoldRevealed) {
      throw new Error("Reveal the blindfold bracket first, then export JSON again.");
    }
  }

  async function chooseSnapshotFile() {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      let settled = false;

      input.type = "file";
      input.accept = ".json,application/json";
      input.style.position = "fixed";
      input.style.left = "-9999px";
      document.body.appendChild(input);

      const cleanup = () => {
        input.removeEventListener("change", handleChange);
        input.removeEventListener("cancel", handleCancel);
        window.removeEventListener("focus", handleFocus, true);
        input.remove();
      };

      const settle = (value, error) => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        if (error) {
          reject(error);
          return;
        }
        resolve(value);
      };

      const handleCancel = () => {
        settle(null);
      };

      const handleFocus = () => {
        window.setTimeout(() => {
          if (!settled && (!input.files || !input.files.length)) {
            settle(null);
          }
        }, 250);
      };

      async function handleChange() {
        try {
          const file = input.files && input.files[0];
          if (!file) {
            settle(null);
            return;
          }
          const text = await file.text();
          settle(JSON.parse(text));
        } catch (error) {
          settle(null, new Error("Could not parse that JSON file."));
        }
      }

      input.addEventListener("change", handleChange);
      input.addEventListener("cancel", handleCancel);
      window.addEventListener("focus", handleFocus, true);
      input.click();
    });
  }

  async function fetchEspnPropositions() {
    const url = new URL("https://gambit-api.fantasy.espn.com/apis/v1/propositions/");
    url.searchParams.set("challengeId", String(CHALLENGE_ID));
    url.searchParams.set("platform", "chui");
    url.searchParams.set("view", "chui_default");

    const response = await fetch(url.toString(), {
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Could not load ESPN bracket data (${response.status}).`);
    }

    const propositions = await response.json();
    if (!Array.isArray(propositions) || !propositions.length) {
      throw new Error("ESPN bracket data was empty.");
    }

    return propositions;
  }

  function buildEspnLookup(propositions) {
    const lookup = new Map();

    for (const proposition of propositions) {
      for (const outcome of proposition.possibleOutcomes || []) {
        const canonical = outcome?.name ? String(outcome.name).trim() : "";
        if (!canonical) {
          continue;
        }

        const variants = new Set([
          canonical,
          outcome.description,
          outcome.abbrev,
          canonical.replace(/\bSt\b/g, "Saint"),
          canonical.replace(/\bSaint\b/g, "St"),
        ]);

        for (const variant of variants) {
          const normalized = normalizeName(variant);
          if (normalized) {
            lookup.set(normalized, canonical);
          }
        }
      }
    }

    return lookup;
  }

  function buildImportSteps(snapshot, espnLookup) {
    return snapshot.picks
      .filter((pick) => pick && pick.round !== "First Four" && pick.winnerName)
      .map((pick) => {
        const teams = (pick.teams || []).map((team) => toEspnTeamLabel(team, espnLookup));
        const winner = toEspnTeamLabel(pick.winnerName, espnLookup);

        if (teams.length !== 2 || !teams[0] || !teams[1]) {
          throw new Error(`Could not read the matchup teams for ${pick.round}: ${pick.title}.`);
        }

        if (!winner) {
          throw new Error(`Could not map the winner for ${pick.round}: ${pick.title}.`);
        }

        return {
          gameId: pick.gameId,
          round: pick.round,
          title: pick.title,
          teams,
          winner,
          normalizedTeams: teams.map(normalizeName),
          normalizedWinner: normalizeName(winner),
        };
      });
  }

  function toEspnTeamLabel(name, espnLookup) {
    const normalized = normalizeName(name);
    if (!normalized) {
      return null;
    }

    if (PLAY_IN_COMBO_BY_NAME.has(normalized)) {
      return PLAY_IN_COMBO_BY_NAME.get(normalized);
    }

    if (ESPN_NAME_ALIASES.has(normalized)) {
      return ESPN_NAME_ALIASES.get(normalized);
    }

    if (espnLookup.has(normalized)) {
      return espnLookup.get(normalized);
    }

    return String(name).trim();
  }

  async function waitForMatchupSection(step) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 5000) {
      const section = findMatchupSection(step.normalizedTeams);
      if (section) {
        return section;
      }
      await wait(60);
    }

    throw new Error(`Could not find ESPN matchup: ${step.teams.join(" vs ")}.`);
  }

  function findMatchupSection(normalizedTeams) {
    const sections = Array.from(document.querySelectorAll("[data-proposition-id]"));

    for (const section of sections) {
      const optionLabels = getSectionOptions(section).map((option) => option.normalizedLabel);
      if (optionLabels.length < 2) {
        continue;
      }

      if (optionLabels.includes(normalizedTeams[0]) && optionLabels.includes(normalizedTeams[1])) {
        return section;
      }
    }

    return null;
  }

  function getSectionOptions(section) {
    return Array.from(section.querySelectorAll("input[type='radio']"))
      .map((input) => input.closest(".BracketOutcomeList-outcome"))
      .filter(Boolean)
      .map((option) => {
        const labelText = cleanOptionLabel(option.textContent);
        return {
          option,
          input: option.querySelector("input[type='radio']"),
          labelText,
          normalizedLabel: normalizeName(labelText),
        };
      })
      .filter((option) => option.labelText);
  }

  function clickWinner(section, winnerLabel) {
    const winnerNormalized = normalizeName(winnerLabel);
    const options = getSectionOptions(section);

    for (const option of options) {
      if (option.normalizedLabel !== winnerNormalized) {
        continue;
      }

      const input = option.input;
      if (!input) {
        continue;
      }

      if (!input.checked) {
        input.click();
      }

      return true;
    }

    return false;
  }

  function cleanOptionLabel(value) {
    return String(value || "")
      .replace(/^\s*\d+\s*/, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function setTiebreaker(totalPoints) {
    const input = document.querySelector("input[type='number'], input[inputmode='numeric']");
    if (!input) {
      throw new Error("ESPN tiebreaker input was not found.");
    }

    input.focus();
    input.value = String(totalPoints);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.blur();
  }

  function assertOnEspnBracketPage() {
    const isCorrectHost = window.location.hostname === "fantasy.espn.com";
    const isCorrectPage = window.location.pathname.includes(`/${CHALLENGE_KEY}/bracket`);

    if (!isCorrectHost || !isCorrectPage) {
      throw new Error("Open ESPN's 2026 men's bracket page first, then run this helper there.");
    }
  }

  function normalizeName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, "")
      .replace(/\(fl\)/g, "fl")
      .replace(/\(ohio\)/g, "ohio")
      .replace(/\bsaint\b/g, "saint")
      .replace(/\bst\./g, "st")
      .replace(/[^a-z0-9]+/g, "");
  }

  function showStatus(message, tone) {
    let box = document.getElementById(STATUS_ID);
    if (!box) {
      box = document.createElement("aside");
      box.id = STATUS_ID;
      box.innerHTML =
        '<div data-role="title"></div><div data-role="message"></div><button type="button" data-role="close">Dismiss</button>';
      box.style.position = "fixed";
      box.style.right = "16px";
      box.style.bottom = "16px";
      box.style.zIndex = "2147483647";
      box.style.width = "min(360px, calc(100vw - 32px))";
      box.style.padding = "14px 16px";
      box.style.borderRadius = "16px";
      box.style.boxShadow = "0 18px 40px rgba(15, 23, 42, 0.22)";
      box.style.background = "#fffef8";
      box.style.border = "2px solid #d9dee8";
      box.style.color = "#1f2a44";
      box.style.font = "600 14px/1.4 system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
      box.style.display = "grid";
      box.style.gap = "6px";

      const title = box.querySelector("[data-role='title']");
      title.style.fontWeight = "800";
      title.style.fontSize = "16px";
      title.textContent = "Bracket Parade -> ESPN";

      const close = box.querySelector("[data-role='close']");
      close.style.justifySelf = "start";
      close.style.padding = "8px 12px";
      close.style.border = "0";
      close.style.borderRadius = "999px";
      close.style.background = "#203658";
      close.style.color = "#ffffff";
      close.style.cursor = "pointer";
      close.addEventListener("click", dismissStatus);

      document.body.appendChild(box);
    }

    const palette =
      tone === "success"
        ? { background: "#f3fbf4", border: "#58b36c" }
        : tone === "error"
          ? { background: "#fff4f2", border: "#df6a4f" }
          : { background: "#fffef8", border: "#d9dee8" };

    box.style.background = palette.background;
    box.style.borderColor = palette.border;
    box.querySelector("[data-role='message']").textContent = message;
  }

  function dismissStatus() {
    document.getElementById(STATUS_ID)?.remove();
  }

  function wait(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }
})();
