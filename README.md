# Bracket Parade

A kid-friendly static March Madness bracket picker for 2026 with:

- one matchup at a time
- local logo assets
- `localStorage` saves
- multiple named brackets
- PNG poster export
- JSON export of every pick

## Current data

As of Sunday, March 15, 2026, the official NCAA men's bracket is out. This app now ships with the real 2026 field, regions, and First Four matchups.

Data source:

- [NCAA March Madness Live bracket](https://www.ncaa.com/march-madness-live/bracket)
- [NCAA printable 2026 bracket PDF](https://www.ncaa.com/brackets/print/basketball-men/d1/2026)

Scouting support:

- NCAA NET rankings from the NCAA bracket IQ feed
- current team records and recent-form refreshes from CBS Sports team schedule pages

## Run locally

Because this is a plain static site, any simple web server works.

```bash
cd /Users/zachary/projects/bracket-picker
python3 -m http.server 4173
```

Then open [http://localhost:4173](http://localhost:4173).

## GitHub Pages

This repo is already structured to serve directly as a static site from the repository root. No build step is required.

## Update the official field

To refresh the checked-in bracket data and local logo files:

```bash
cd /Users/zachary/projects/bracket-picker
node scripts/update-data.mjs
```

That script rewrites:

- `data/bracket-2026.json`
- `data/bracket-2026-projected.json`
- `assets/logos/*.svg`
