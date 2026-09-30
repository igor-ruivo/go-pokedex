# PvP simulator parity check

The Teams view rates a team with `src/lib/pvp-sim/` — a TypeScript port of PvPoke's battle
simulator and Team Builder threat scoring. This script proves the port still matches PvPoke:
it runs PvPoke's **own, unmodified** JavaScript (downloaded fresh from GitHub) and the port on the
same teams, and requires identical threat scores, threats and per-matchup ratings.

```
pnpm run pvp-sim:parity
```

Needs PvPoke and dex-server checked out next to this repo (or set `PVPOKE_DIR` / `DEX_SERVER_DIR`).

**When to run it:** whenever dex-server's daily job reports that PvPoke's simulator changed
(`data/team-builder.json` → `simulator.verified` is `false`). Then:

1. Diff PvPoke's changed file(s) against what `src/lib/pvp-sim/` ports.
2. Port whatever affects results; re-run this until it says `Parity OK`.
3. Update the SHA-256 hashes in dex-server's `src/parsers/teams/simulator-guard.ts`.

Files: `reference.cjs` (PvPoke's pipeline in Node), `compare.mts` (the port + diff), `run.cjs` (driver).

## What is enforced, and where

| Guard | Where | Fails when |
| --- | --- | --- |
| Golden master | `src/lib/pvp-sim/pvp-sim-golden.test.ts` (runs with `pnpm test`) | the port's battle logic, AI, damage or threat scoring stops reproducing PvPoke's own numbers for the fixture pool — every matchup is compared exactly |
| Upstream drift | dex-server `simulator-guard.upstream.test.ts`, run daily by `pvpoke-simulator-guard.yml` | PvPoke's simulator / team-builder source changes, or its data uses a mechanic the port lacks |
| Live fingerprint | dex-server daily job → `team-builder.json` `simulator.verified` | same as above, but non-blocking: the page flags the threat score as unverified |
| Full parity | `pnpm run pvp-sim:parity` (manual) | the port differs from PvPoke's *current* code on any of 8 teams over the full league pools |

The fixture and the parity run both feed PvPoke's code the **same rank-1 IVs** the port uses (the
simulator is IV-agnostic; only PvPoke's *default* IVs differ from ours), so threat scores match
PvPoke's algorithm exactly but not necessarily pvpoke.com's displayed number.
