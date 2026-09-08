import { type Remote, wrap } from 'comlink';

import type { ComputeApi } from './compute.worker';

/**
 * Lazily-created singleton proxy to the compute worker. The worker (and its
 * bundle) is only spun up the first time something actually needs it.
 */
let proxy: Remote<ComputeApi> | undefined;

export const getComputeWorker = (): Remote<ComputeApi> => {
	if (!proxy) {
		const worker = new Worker(new URL('./compute.worker.ts', import.meta.url), {
			type: 'module',
			name: 'compute',
		});
		proxy = wrap<ComputeApi>(worker);
	}
	return proxy;
};
