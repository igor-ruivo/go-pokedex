# GO Pokédex

A complete Pokémon GO Pokédex — search and analyse Pokémon IVs, stats, PvP rankings and raid counters, all in one place.

**Live site: [go-pokedex.com](https://go-pokedex.com)**

## Why this exists

I built this originally to learn React — and because, as a Pokémon GO player, there genuinely wasn't a good single companion app for it, especially on mobile. The information you actually need to play well is real, it's just scattered: PvP rankings on one site, raid counters on another, IV appraisal on a third, events and raid bosses on a fourth, none of them designed with a phone in mind, and none of them with a search that actually understood what you were typing.

GO Pokédex is my answer to that: one app, built with real engineering rather than glued-together widgets, that pulls all of it into a single, fast, genuinely mobile-first UI — Pokédex, IVs, PvP and raid rankings, moves, the type chart, and the events/raids/spawns/eggs calendar, all searchable from the same box. And alongside the "hardcore" tools, it still covers the everyday, casual side of the game — like generating a ready-to-paste, parameterized in-game search string for mass-appraising and clearing out your non-meta Pokémon, instead of tapping through your box one by one.

## What it does

- **Pokédex** — every Pokémon (including Shadow and Mega forms), with base stats, type matchups, and a searchable, filterable grid.
- **IV picker** — enter a Pokémon's IVs (or auto-snap to a target rank) and see its PvP percentile, best level, and CP for every league — including, for a Shadow, the IVs it needs to reach a given rank _after_ purifying.
- **PvP rankings** — Great, Ultra and Master League attacker rankings, with each Pokémon's strong/weak matchups.
- **Raid rankings** — best raid attackers per type, ranked by DPS, TDO or eDPS, with configurable battle conditions (weather, friendship, party size, mega boost).
- **Move database** — every fast and charged move, with full PvE/PvP stats, searchable and sortable.
- **Type chart** — the full Pokémon GO type-effectiveness grid.
- **Calendar** — current events, raid bosses, wild spawns, Team GO Rocket lineups and the egg-hatch chart.
- **Mass delete helper** — set your keep criteria (by league, CP, IV floor, and more) and get back a ready-to-paste in-game search string that filters your box down to exactly the non-meta Pokémon you don't need.

## Tech stack

React 19 + TypeScript, built with Vite. Data fetching and caching via TanStack Query, virtualized lists/grids via TanStack Virtual. Heavier IV/ranking computation runs off the main thread in a Web Worker (via Comlink). Deployed to GitHub Pages, with every Pokémon/move page prerendered at deploy time for fast loads and proper search indexing.

## Data

All Pokémon GO game data (the game-master dump, move stats, PvP rankings, raid attacker rankings, and the events/raids/spawns/eggs/rockets calendar feeds) comes from [`dex-server`](https://github.com/igor-ruivo/dex-server), a companion repo that keeps this data up to date.
