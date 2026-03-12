# Lil' Bracket Buddy

A kid-friendly static March Madness bracket picker for 2026 with:

- one matchup at a time
- local logo assets
- `localStorage` saves
- multiple named brackets
- PNG poster export
- JSON export of every pick

## Current data

As of Thursday, March 12, 2026, the official NCAA men's bracket is not out yet. This app currently ships with the latest **projected** 2026 field and projected matchups from CBS Sports Bracketology.

Data source:

- [CBS Sports Bracketology](https://www.cbssports.com/college-basketball/bracketology/)

## Run locally

Because this is a plain static site, any simple web server works.

```bash
cd /Users/zachary/projects/bracket-picker
python3 -m http.server 4173
```

Then open [http://localhost:4173](http://localhost:4173).

## GitHub Pages

This repo is already structured to serve directly as a static site from the repository root. No build step is required.

## Update the projected field

To refresh the checked-in bracket data and local logo files:

```bash
cd /Users/zachary/projects/bracket-picker
node scripts/update-data.mjs
```

That script rewrites:

- `data/bracket-2026-projected.json`
- `assets/logos/*.svg`
