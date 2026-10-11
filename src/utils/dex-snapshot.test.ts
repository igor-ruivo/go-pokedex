import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	__setDexSnapshotForTests,
	dexSnapshotId,
	initDexSnapshot,
	pinToSnapshot,
	RECHECK_AFTER_MS,
} from './dex-snapshot';
import { __memoryEntriesForTests, idbSet } from './idb-store';
import { writeCache } from './persistent-cache';

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const C = 'c'.repeat(40);
const D = 'd'.repeat(40);
const DEX = 'https://raw.githubusercontent.com/igor-ruivo/dex-server/refs/heads/main/data/game-master.json';
const RANKING = 'https://raw.githubusercontent.com/igor-ruivo/go-pokedex/refs/heads/data/team-ranking.json';
const KEY = 'meta:dex-snapshot';

/** Answers GitHub's API lookups with `commits` (by repository), or fails them when it is `undefined`. */
const stubGitHub = (commits: { dex: string; ranking: string } | undefined) => {
	const fetchMock = vi.fn((url: string) => {
		if (!commits) return Promise.reject(new Error('offline'));
		const sha = url.includes('/dex-server/') ? commits.dex : commits.ranking;
		return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(sha + '\n') });
	});
	vi.stubGlobal('fetch', fetchMock);
	return fetchMock;
};

describe('the dex-server snapshot', () => {
	beforeEach(() => {
		__memoryEntriesForTests().clear();
		__setDexSnapshotForTests(undefined);
	});
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe('pinToSnapshot', () => {
		it('puts a dex-server file, and the team ranking, on the commits of the snapshot', () => {
			__setDexSnapshotForTests({ dex: A, ranking: B, checkedAt: 0 });
			expect(pinToSnapshot(DEX)).toBe(
				`https://raw.githubusercontent.com/igor-ruivo/dex-server/${A}/data/game-master.json`
			);
			expect(pinToSnapshot(RANKING)).toBe(
				`https://raw.githubusercontent.com/igor-ruivo/go-pokedex/${B}/team-ranking.json`
			);
		});

		it('leaves any other address alone, and every address when there is no snapshot', () => {
			__setDexSnapshotForTests({ dex: A, ranking: B, checkedAt: 0 });
			expect(pinToSnapshot('https://example.com/x.json')).toBe('https://example.com/x.json');
			__setDexSnapshotForTests(undefined);
			expect(pinToSnapshot(DEX)).toBe(DEX);
		});
	});

	describe('initDexSnapshot', () => {
		it('looks the commits up on a first visit, and keeps them', async () => {
			stubGitHub({ dex: A, ranking: B });
			await initDexSnapshot(1000);
			expect(dexSnapshotId()).toBe(`${A}.${B}`);
			expect(__memoryEntriesForTests().get(KEY)).toEqual({ dex: A, ranking: B, checkedAt: 1000 });
		});

		it('does not ask again within the recheck interval', async () => {
			await idbSet(KEY, { dex: A, ranking: B, checkedAt: 1000 });
			const fetchMock = stubGitHub({ dex: C, ranking: D });
			await initDexSnapshot(1000 + RECHECK_AFTER_MS);
			expect(fetchMock).not.toHaveBeenCalled();
			expect(dexSnapshotId()).toBe(`${A}.${B}`);
		});

		it('drops everything cached from dex-server, at once, when the commit changed', async () => {
			await idbSet(KEY, { dex: A, ranking: B, checkedAt: 0 });
			await writeCache('query', 'game-master', 1);
			await writeCache('query', 'pvp', 2);
			await writeCache('translations', 't', 3);
			await writeCache('rank', 'v3:great', 4);
			stubGitHub({ dex: C, ranking: B });
			await initDexSnapshot(RECHECK_AFTER_MS + 1);
			expect(dexSnapshotId()).toBe(`${C}.${B}`);
			const keys = [...__memoryEntriesForTests().keys()].filter((key) => key.startsWith('cache:'));
			expect(keys).toEqual(['cache:rank:v3:great']);
		});

		it('drops everything when only the team ranking moved on', async () => {
			await idbSet(KEY, { dex: A, ranking: B, checkedAt: 0 });
			await writeCache('query', 'game-master', 1);
			stubGitHub({ dex: A, ranking: D });
			await initDexSnapshot(RECHECK_AFTER_MS + 1);
			expect([...__memoryEntriesForTests().keys()].filter((key) => key.startsWith('cache:'))).toEqual([]);
		});

		it('keeps the cache when the commits are still the same', async () => {
			await idbSet(KEY, { dex: A, ranking: B, checkedAt: 0 });
			await writeCache('query', 'game-master', 1);
			stubGitHub({ dex: A, ranking: B });
			await initDexSnapshot(RECHECK_AFTER_MS + 1);
			expect([...__memoryEntriesForTests().keys()]).toContain('cache:query:game-master');
			expect(__memoryEntriesForTests().get(KEY)).toEqual({ dex: A, ranking: B, checkedAt: RECHECK_AFTER_MS + 1 });
		});

		it('keeps the last snapshot, and its cache, when GitHub cannot be reached', async () => {
			await idbSet(KEY, { dex: A, ranking: B, checkedAt: 0 });
			await writeCache('query', 'game-master', 1);
			stubGitHub(undefined);
			await initDexSnapshot(RECHECK_AFTER_MS + 1);
			expect(dexSnapshotId()).toBe(`${A}.${B}`);
			expect([...__memoryEntriesForTests().keys()]).toContain('cache:query:game-master');
		});

		it('takes neither commit when only one lookup works: a half-updated pair is the mix to avoid', async () => {
			await idbSet(KEY, { dex: A, ranking: B, checkedAt: 0 });
			vi.stubGlobal(
				'fetch',
				vi.fn((url: string) =>
					url.includes('/dex-server/')
						? Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(C) })
						: Promise.resolve({ ok: false, status: 403, text: () => Promise.resolve('') })
				)
			);
			await initDexSnapshot(RECHECK_AFTER_MS + 1);
			expect(dexSnapshotId()).toBe(`${A}.${B}`);
		});

		it('has no snapshot on a first visit that cannot reach GitHub: files are read from the branches', async () => {
			stubGitHub(undefined);
			await initDexSnapshot(1000);
			expect(dexSnapshotId()).toBeUndefined();
			expect(pinToSnapshot(DEX)).toBe(DEX);
		});

		it('refuses an answer that is not a commit hash', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn(() =>
					Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('<html>rate limited</html>') })
				)
			);
			await initDexSnapshot(1000);
			expect(dexSnapshotId()).toBeUndefined();
		});
	});
});
