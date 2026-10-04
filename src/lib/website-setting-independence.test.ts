import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * The website's own Best Buddy setting (Settings, `best-buddy-context`) is for the Pokémon pages. The Teams builder, its
 * collection and the rules behind them take the Best Buddy and Super Max Mega statuses from each Pokémon alone — so none
 * of the modules they are made of may read that setting, directly or through the hooks that do (`useBestIvs`,
 * `useComputeIVs`). Their level ceiling and IV tables come from `useBestIvsAtLevel`, which takes the ceiling explicitly.
 */
const root = path.resolve(__dirname, '..');

const teamModules = [
	'lib/team-build.ts',
	'lib/optimal-build.ts',
	'lib/team-analysis.ts',
	'lib/team-combinations.ts',
	'lib/team-sanitize.ts',
	'lib/canonical-slot.ts',
	'lib/iv-rank.ts',
	'lib/league-caps.ts',
	'lib/pokemon-collection.ts',
	'lib/pvp-sim/team-eval.ts',
	'hooks/useOptimalBuild.ts',
	'routes/Teams.tsx',
	...fs
		.readdirSync(path.join(root, 'routes/teams'))
		.filter((f) => /\.tsx?$/.test(f) && !f.includes('.test.'))
		.map((f) => `routes/teams/${f}`),
];

const forbidden: Array<[string, RegExp]> = [
	['the Best Buddy setting context', /best-buddy-context/],
	['useBestBuddy', /\buseBestBuddy\b/],
	// a call or an import by name — `useBestIvsAtLevel` and the path `./useBestIvs` are fine
	['useBestIvs (which follows the setting)', /\{[^}]*\buseBestIvs\b[^}]*\}|\buseBestIvs\(/],
	['useComputeIVs (which follows the setting)', /\{[^}]*\buseComputeIVs\b[^}]*\}|\buseComputeIVs\(/],
];

describe('the Teams builder does not read the website’s Best Buddy setting', () => {
	it.each(teamModules)('%s', (file) => {
		const source = fs.readFileSync(path.join(root, file), 'utf8');
		for (const [what, pattern] of forbidden) expect(source, `${file} uses ${what}`).not.toMatch(pattern);
	});

	it('takes the level ceiling from the Pokémon’s own statuses', () => {
		const hook = fs.readFileSync(path.join(root, 'hooks/useOptimalBuild.ts'), 'utf8');
		expect(hook).toContain('useBestIvsAtLevel');
	});
});
