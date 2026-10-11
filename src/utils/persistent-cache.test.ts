import { beforeEach, describe, expect, it } from 'vitest';

import { __memoryEntriesForTests, idbEntries, idbSet } from './idb-store';
import {
	CACHE_MAX_AGE_MS,
	clearCacheNamespaces,
	collectGarbage,
	deleteCache,
	readCache,
	writeCache,
} from './persistent-cache';

const DAY = 24 * 60 * 60 * 1000;

/** Plants a cache entry saved `ageMs` ago. */
const plant = (namespace: string, key: string, ageMs: number, value: unknown = 'v') => {
	const savedAt = Date.now() - ageMs;
	return Promise.all([
		idbSet(`cache:${namespace}:${key}`, { savedAt, value }),
		idbSet(`cachemeta:${namespace}:${key}`, { savedAt }),
	]);
};

const cacheKeys = () => [...__memoryEntriesForTests().keys()].filter((key) => key.startsWith('cache:')).sort();

describe('the persistent cache', () => {
	beforeEach(() => {
		__memoryEntriesForTests().clear();
	});

	it('gives back what was written, with the date it was saved', async () => {
		await writeCache('query', 'k', { a: [1, 2] });
		const entry = await readCache<{ a: Array<number> }>('query', 'k');
		expect(entry?.value).toEqual({ a: [1, 2] });
		expect(Math.abs(Date.now() - entry!.savedAt)).toBeLessThan(5000);
	});

	it('keeps each namespace apart', async () => {
		await writeCache('query', 'k', 1);
		expect(await readCache('translations', 'k')).toBeUndefined();
	});

	it('is a miss for nothing stored, or for something that is not an entry', async () => {
		expect(await readCache('query', 'missing')).toBeUndefined();
		await idbSet('cache:query:odd', 'just text');
		expect(await readCache('query', 'odd')).toBeUndefined();
	});

	it('deletes an entry together with its meta record', async () => {
		await writeCache('query', 'k', 1);
		await deleteCache('query', 'k');
		expect(__memoryEntriesForTests().size).toBe(0);
	});

	it('keeps the value apart from the meta record that sweeping reads', async () => {
		await writeCache('query', 'k', 'x'.repeat(1000));
		const metas = await idbEntries<{ savedAt: number }>('cachemeta:');
		expect(metas).toHaveLength(1);
		expect(Object.keys(metas[0][1])).toEqual(['savedAt']);
	});
});

describe('clearing namespaces', () => {
	beforeEach(() => {
		__memoryEntriesForTests().clear();
	});

	it('drops every entry of the given namespaces, all at once, and leaves the rest', async () => {
		await writeCache('query', 'a', 1);
		await writeCache('query', 'b', 2);
		await writeCache('translations', 't', 3);
		await writeCache('rank', 'v3:great', 4);
		await idbSet('cfg:0', '1');
		await clearCacheNamespaces(['query', 'translations']);
		expect([...__memoryEntriesForTests().keys()].sort()).toEqual([
			'cache:rank:v3:great',
			'cachemeta:rank:v3:great',
			'cfg:0',
		]);
	});
});

describe('collecting garbage', () => {
	beforeEach(() => {
		__memoryEntriesForTests().clear();
	});

	it('drops the entries older than their namespace’s maximum age, and only those', async () => {
		await plant('query', 'old', CACHE_MAX_AGE_MS.query + DAY);
		await plant('query', 'recent', CACHE_MAX_AGE_MS.query - DAY);
		await plant('translations', 'old', CACHE_MAX_AGE_MS.translations + 1000);
		await plant('rank', 'v3:great', CACHE_MAX_AGE_MS.query + DAY); // rankings are kept longer than feeds
		await collectGarbage();
		expect(cacheKeys()).toEqual(['cache:query:recent', 'cache:rank:v3:great']);
		expect([...__memoryEntriesForTests().keys()].filter((key) => key.startsWith('cachemeta:')).sort()).toEqual([
			'cachemeta:query:recent',
			'cachemeta:rank:v3:great',
		]);
	});

	it('gives a namespace it does not know a month', async () => {
		await plant('mystery', 'a', 20 * DAY);
		await plant('mystery', 'b', 40 * DAY);
		await collectGarbage();
		expect(cacheKeys()).toEqual(['cache:mystery:a']);
	});

	it('never touches settings or saved user data', async () => {
		await idbSet('cfg:0', '1');
		await idbSet('user:favorite-teams', []);
		await plant('query', 'old', 365 * DAY);
		await collectGarbage();
		expect([...__memoryEntriesForTests().keys()].sort()).toEqual(['cfg:0', 'user:favorite-teams']);
	});
});
