import { type Remote, wrap } from 'comlink';

import type { TeamApi } from './team.worker';

/** Lazily-created singleton proxy to the team simulator worker — only spun up once the Teams view needs it. */
let proxy: Remote<TeamApi> | undefined;

export const getTeamWorker = (): Remote<TeamApi> => {
	if (!proxy) {
		const worker = new Worker(new URL('./team.worker.ts', import.meta.url), {
			type: 'module',
			name: 'team-sim',
		});
		proxy = wrap<TeamApi>(worker);
	}
	return proxy;
};
