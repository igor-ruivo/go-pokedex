import { idbGet, idbSet } from './idb-store';
import { clearCacheNamespaces } from './persistent-cache';

/**
 * Everything dex-server publishes (game-master, rankings, raid DPS, moves, calendar…) only makes sense together: a Pokémon
 * that a ranking lists but the game-master lacks is a broken page. The files are rebuilt by commits to one repository, so a
 * COMMIT is the unit that is consistent — and the app keeps to it:
 *
 *  - at startup, before anything renders, the latest commit of dex-server (and of this repo's `data` branch, which holds the
 *    team ranking rated from it) is looked up once; that pair is the page's SNAPSHOT for its whole life;
 *  - every file is fetched from that exact commit (`pinToSnapshot`), never from the moving branch, so two files read in one
 *    session can never be of different ages — however long apart they are fetched, or whichever of them was cached;
 *  - whatever is cached in IndexedDB is only used with the snapshot it was saved under, and when the snapshot changes all of it
 *    goes at once (`clearCacheNamespaces`): all or nothing.
 *
 * A snapshot is looked up again at most every `RECHECK_AFTER_MS`; offline, rate-limited or slow (`RESOLVE_TIMEOUT_MS`) keeps
 * the last one, and the cache that goes with it. With no snapshot at all (a first visit that cannot reach GitHub's API) the
 * files are read from the branches as before and nothing is cached: the app works, only without that guarantee or the cache.
 */
export interface DexSnapshot {
	/** Commit of dex-server's `main`. */
	dex: string;
	/** Commit of this repo's `data` branch. */
	ranking: string;
	/** `Date.now()` when these were looked up. */
	checkedAt: number;
	/** When dex-server's commit was made: when the data was last refreshed (`Date.parse`). */
	updatedAt: number;
}

const SNAPSHOT_KEY = 'meta:dex-snapshot';
export const RECHECK_AFTER_MS = 30 * 60 * 1000;
export const RESOLVE_TIMEOUT_MS = 1500;
/** Everything cached from dex-server lives in these namespaces (see persistent-cache.ts). */
const DEX_CACHE_NAMESPACES = ['query', 'translations'] as const;

const DEX_BRANCH_URL = 'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/';
const RANKING_BRANCH_URL = 'https://raw.githubusercontent.com/igor-ruivo/go-pokedex/refs/heads/data/';

let current: DexSnapshot | undefined;

const isSha = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{40}$/.test(value);

const isSnapshot = (value: unknown): value is DexSnapshot => {
	const snapshot = value as Partial<DexSnapshot> | null | undefined;
	return (
		typeof snapshot === 'object' &&
		snapshot !== null &&
		isSha(snapshot.dex) &&
		isSha(snapshot.ranking) &&
		typeof snapshot.checkedAt === 'number' &&
		typeof snapshot.updatedAt === 'number'
	);
};

/**
 * The latest commit of `branch` (its hash and when it was made), from GitHub's API (CORS-open). Unauthenticated calls are
 * limited to 60 an hour per IP, hence the lookup is made at most twice per `RECHECK_AFTER_MS` per visitor.
 */
const latestCommit = async (repository: string, branch: string): Promise<{ sha: string; date: number }> => {
	const response = await fetch(`https://api.github.com/repos/${repository}/commits/${branch}`, {
		headers: { Accept: 'application/vnd.github+json' },
		signal: AbortSignal.timeout(RESOLVE_TIMEOUT_MS),
	});
	if (!response.ok) throw new Error(`GitHub answered ${response.status} for ${repository}@${branch}`);
	const body = (await response.json()) as { sha?: unknown; commit?: { committer?: { date?: unknown } } };
	const date = Date.parse(String(body.commit?.committer?.date));
	if (!isSha(body.sha) || Number.isNaN(date)) throw new Error('GitHub did not answer with a commit');
	return { sha: body.sha, date };
};

/**
 * Settles the page's snapshot. Awaited at startup, before the first render (see hydrate-storage.ts); nothing may be fetched
 * from dex-server before it.
 */
export const initDexSnapshot = async (now = Date.now()): Promise<void> => {
	const stored = await idbGet<unknown>(SNAPSHOT_KEY).then(
		(value) => (isSnapshot(value) ? value : undefined),
		() => undefined
	);
	let next = stored;
	if (!stored || now - stored.checkedAt > RECHECK_AFTER_MS) {
		try {
			// both or neither: a half-updated pair would be the very mix this exists to prevent
			const [dex, ranking] = await Promise.all([
				latestCommit('igor-ruivo/dex-server', 'main'),
				latestCommit('igor-ruivo/go-pokedex', 'data'),
			]);
			next = {
				dex: dex.sha,
				ranking: ranking.sha,
				checkedAt: now,
				updatedAt: dex.date,
			};
		} catch {
			// keep the last snapshot (offline, rate-limited…); with none, the branches are read directly
		}
	}
	if (next && (next.dex !== stored?.dex || next.ranking !== stored.ranking)) {
		// a new snapshot: nothing of the old one may outlive it, however recently it was cached
		await clearCacheNamespaces(DEX_CACHE_NAMESPACES);
	}
	if (next && next !== stored) await idbSet(SNAPSHOT_KEY, next).catch(() => undefined);
	current = next;
};

/** Identifies the page's snapshot (what cached copies are tied to); `undefined` when there is none. */
export const dexSnapshotId = (): string | undefined => (current ? `${current.dex}.${current.ranking}` : undefined);

/** When the data of the page's snapshot was last refreshed (its dex-server commit); `undefined` when there is no snapshot. */
export const dexSnapshotUpdatedAt = (): number | undefined => current?.updatedAt;

/** `url` as it must be fetched: a dex-server file (or the team ranking) from the page's snapshot, anything else untouched. */
export const pinToSnapshot = (url: string): string => {
	if (!current) return url;
	if (url.startsWith(DEX_BRANCH_URL)) {
		return `https://raw.githubusercontent.com/igor-ruivo/dex-server/${current.dex}/${url.slice(DEX_BRANCH_URL.length)}`;
	}
	if (url.startsWith(RANKING_BRANCH_URL)) {
		return `https://raw.githubusercontent.com/igor-ruivo/go-pokedex/${current.ranking}/${url.slice(RANKING_BRANCH_URL.length)}`;
	}
	return url;
};

/** Test seam: the snapshot, set without a lookup. */
export const __setDexSnapshotForTests = (snapshot: DexSnapshot | undefined): void => {
	current = snapshot;
};
