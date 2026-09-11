import { useEffect } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';

import { TYPE_KEYS } from '../lib/types';
import { useMoves } from '../queries/moves';
import { usePokemon } from '../queries/pokemon';

const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

/** Static, non-parameterised pages — kept in sync by hand with
 *  scripts/prerender.mjs's STATIC_PAGES (that script can't import this file:
 *  it runs under plain Node, this runs in the browser). */
const STATIC_PAGES: Record<string, { title: string; description: string; image?: string }> = {
	'/': {
		title: 'GO Pokédex',
		description:
			'A complete Pokémon GO Pokédex — search and analyse Pokémon IVs, stats, PvP rankings and raid counters.',
	},
	'/rankings/great': {
		title: 'Great League Rankings — GO Pokédex',
		description: 'Top-ranked Pokémon GO attackers for the Great League (1500 CP), with counters and matchups.',
		image: '/images/leagues/great.png',
	},
	'/rankings/ultra': {
		title: 'Ultra League Rankings — GO Pokédex',
		description: 'Top-ranked Pokémon GO attackers for the Ultra League (2500 CP), with counters and matchups.',
		image: '/images/leagues/ultra.png',
	},
	'/rankings/master': {
		title: 'Master League Rankings — GO Pokédex',
		description: 'Top-ranked Pokémon GO attackers for the Master League, with counters and matchups.',
		image: '/images/leagues/master.png',
	},
	'/rankings/raid': {
		title: 'Best Raid Attackers — GO Pokédex',
		description: 'Top Pokémon GO raid attackers ranked by DPS, TDO and eDPS, per type.',
		image: '/images/raids/tier-5.png',
	},
	'/moves': {
		title: 'Moves — GO Pokédex',
		description: 'Every fast and charged move in Pokémon GO, with PvE and PvP stats.',
	},
	'/types': {
		title: 'Type Chart — GO Pokédex',
		description: 'The full Pokémon GO type-effectiveness chart.',
		image: '/images/types/psychic.png',
	},
	'/calendar/events': {
		title: 'Events Calendar — GO Pokédex',
		description: 'Current and upcoming Pokémon GO events, raid bosses, spawns and eggs.',
		image: '/images/nav/calendar.png',
	},
	'/calendar/bosses': {
		title: 'Current Raid Bosses — GO Pokédex',
		description: 'The current Pokémon GO raid boss lineup, by tier.',
		image: '/images/raids/mega.png',
	},
	'/calendar/spawns': {
		title: 'Current Spawns — GO Pokédex',
		description: 'What’s currently spawning in the wild in Pokémon GO.',
		image: '/images/nav/spawns.png',
	},
	'/calendar/rockets': {
		title: 'Team GO Rocket Lineups — GO Pokédex',
		description: 'Current Team GO Rocket grunt, leader and boss Pokémon lineups.',
		image: '/images/NPC/giovanni.webp',
	},
	'/calendar/eggs': {
		title: 'Egg Chart — GO Pokédex',
		description: 'The current Pokémon GO egg-hatch chart, by distance.',
		image: '/images/eggs/10km.png',
	},
};

/** `/rankings/raid` — title/canonical for a specific type, one real page
 *  each (e.g. /rankings/raid/fire — see R.rankings). Its own function, not a
 *  STATIC_PAGES lookup by raw pathname: the FilterBar can change the *type*
 *  without changing the URL *path* (it only ever writes `?type=`), so the
 *  effective type has to be read live from the query param first, falling
 *  back to the path segment only when the query hasn't been touched yet —
 *  otherwise switching type from the UI would leave the title/canonical
 *  pointing at whatever type the page happened to load with. */
const raidTypePage = (typeParam: string | undefined, queryType: string | null) => {
	const t = (queryType ?? typeParam ?? '').toLowerCase();
	if (!TYPE_KEYS.includes(t)) return { path: '/rankings/raid', ...STATIC_PAGES['/rankings/raid'] };
	return {
		path: `/rankings/raid/${t}`,
		title: `Best ${capitalize(t)} Raid Attackers — GO Pokédex`,
		description: `Top ${capitalize(t)}-type Pokémon GO raid attackers ranked by DPS, TDO and eDPS.`,
		image: `/images/types/${t}.png`,
	};
};

const upsert = (selector: string, attrs: Record<string, string>) => {
	let el = document.querySelector(selector);
	if (!el) {
		el = document.createElement(selector.startsWith('link') ? 'link' : 'meta');
		document.head.appendChild(el);
	}
	for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
};

/**
 * Keeps <title>/description/canonical/Open-Graph tags in sync with the
 * CURRENT route on every client-side navigation. `scripts/prerender.mjs`
 * already bakes these in correctly for the very first load of a canonical
 * URL — this covers everything that isn't that:
 *   - client-side navigation to a *different* Pokémon/move (without this,
 *     the tab title and OG tags stay frozen at whatever the very first
 *     static page had — clicking from Pikachu to Charizard never updated
 *     the title at all).
 *   - any tab (`/pokemon/x/moves`) or query-param (`?lg=`, `?sort=`, …)
 *     variant, whose canonical always collapses back to the one real
 *     prerendered URL, so a crawler that somehow reaches one doesn't read
 *     it as a separate duplicate page competing with the real one.
 */
export const usePageMeta = () => {
	const { pathname } = useLocation();
	const { speciesId, moveId, type: typeParam } = useParams();
	const [searchParams] = useSearchParams();
	const queryType = searchParams.get('type');
	const { gamemasterPokemon } = usePokemon();
	const { moves } = useMoves();

	useEffect(() => {
		const origin = window.location.origin;
		let title = 'GO Pokédex';
		let description =
			'A complete Pokémon GO Pokédex — search and analyse Pokémon IVs, stats, PvP rankings and raid counters.';
		let canonicalPath = pathname;
		let image: string | undefined;

		if (speciesId && pathname.startsWith('/pokemon/')) {
			canonicalPath = `/pokemon/${speciesId}`;
			const p = gamemasterPokemon[speciesId];
			if (p) {
				const types = (p.types ?? []).join('/');
				title = `${p.speciesName} — GO Pokédex`;
				description = `${p.speciesName}${types ? ` (${types})` : ''} in Pokémon GO — IVs, best moveset, PvP rankings and raid counters.`;
				image = p.imageUrl || undefined;
			}
		} else if (moveId && pathname.startsWith('/move/')) {
			canonicalPath = `/move/${encodeURIComponent(moveId)}`;
			const m = moves[moveId];
			if (m) {
				const name = m.moveName?.en ?? m.moveId;
				const typeLabel = m.type ? m.type[0].toUpperCase() + m.type.slice(1) : '';
				title = `${name} — GO Pokédex`;
				description = `${name} (${typeLabel}${m.isFast ? ' · Fast move' : ' · Charged move'}) — Pokémon GO move stats: damage, energy, DPS and best Pokémon that learn it.`;
			}
		} else if (pathname.startsWith('/rankings/raid')) {
			const page = raidTypePage(typeParam, queryType);
			canonicalPath = page.path;
			title = page.title;
			description = page.description;
			image = page.image;
		} else {
			const hit = STATIC_PAGES[pathname];
			if (hit) {
				title = hit.title;
				description = hit.description;
				image = hit.image;
			}
		}

		// The generic logo (a square icon) isn't really "large image" material
		// the way a Pokémon/move's own sprite is — `summary` suits it better
		// than `summary_large_image`, which some clients render as a big
		// banner crop. Pokémon/move images are already absolute (pokemon.com
		// URLs); everything else above is one of our own `/images/...` paths,
		// so it needs the origin prefixed on to make an absolute URL too.
		const isCustomImage = Boolean(image);
		const resolvedImage = image ? (image.startsWith('http') ? image : origin + image) : `${origin}/logo512.png`;

		document.title = title;
		upsert('meta[name="description"]', { name: 'description', content: description });
		upsert('link[rel="canonical"]', { rel: 'canonical', href: origin + canonicalPath });
		upsert('meta[property="og:title"]', { property: 'og:title', content: title });
		upsert('meta[property="og:description"]', { property: 'og:description', content: description });
		upsert('meta[property="og:url"]', { property: 'og:url', content: origin + canonicalPath });
		upsert('meta[name="twitter:card"]', {
			name: 'twitter:card',
			content: isCustomImage ? 'summary_large_image' : 'summary',
		});
		upsert('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
		upsert('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
		upsert('meta[property="og:image"]', { property: 'og:image', content: resolvedImage });
		upsert('meta[name="twitter:image"]', { name: 'twitter:image', content: resolvedImage });
	}, [pathname, speciesId, moveId, typeParam, queryType, gamemasterPokemon, moves]);
};
