import type { GameLanguage } from '../contexts/language-context';
import type { IGamemasterPokemon } from './IGamemasterPokemon';
import type { IRichBlock } from './IRichText';

/** One tier of a season's major milestone bonuses: what reaching a rank of the season earns. */
export interface IMilestoneTier {
	/** The tier as the season page names it ("Tier 1"), in the player's language. */
	tier: string;
	/** The rank that earns it ("Rank 25"). */
	rank: string;
	/** The two colours the tier's header goes from (bronze, silver, gold…). */
	colors?: [string, string];
	/** What the tier gives, with its formatting kept. */
	blocks: Array<IRichBlock>;
}

export interface IMilestoneBonuses {
	title: string;
	/** The sentence(s) that introduce the tiers (a GO Pass post has one; the season page does not). */
	intro?: Array<IRichBlock>;
	tiers: Array<IMilestoneTier>;
}

export interface IEntry {
	speciesId: string;
	shiny: boolean;
	/** What the entry is: a raid tier, an egg distance… or, for a Max Battle Pokémon, its form ('dynamax' or 'gigantamax'). */
	kind?: string | undefined;
	/** The Max Battle tier ('5' for a five-star battle), for the Pokémon of `maxBattles`. */
	tier?: string | undefined;
	comment?: Record<GameLanguage, string>;
}

export interface IRocketGrunt {
	trainerId: string;
	type: string | undefined;
	phrase: Record<GameLanguage, string>;
	tier1: Array<string>;
	tier2: Array<string>;
	tier3: Array<string>;
	/** The shadow ids among the three tiers that can be shiny (absent in data from before dex-server shipped it). */
	shinyPokemon?: Array<string>;
	catchableTiers: Array<number>;
}

export interface IPostEntry {
	id: string;
	// pokemongo.com actually publishes a separate URL per locale (unlike
	// LeekDuck, an English-only fan site) — this tracks GameLanguage, same
	// as `title`/`subtitle`/`bonuses` below, so "View original" opens in
	// whichever language the post itself is being read in. LeekDuck-sourced
	// posts (spotlightToPost/specialToPost in Calendar.tsx) have no real
	// per-locale URL to offer, so every GameLanguage key just repeats their
	// one English URL.
	url: Record<GameLanguage, string>;
	title: Record<GameLanguage, string>;
	subtitle: Record<GameLanguage, string>;
	startDate: number;
	endDate: number;
	dateRanges: Array<{ start: number; end: number }>;
	imageUrl: string;
	wild: Array<IEntry>;
	raids: Array<IEntry>;
	eggs: Array<IEntry>;
	researches: Array<IEntry>;
	incenses: Array<IEntry>;
	lures: Array<IEntry>;
	/** The Dynamax / Gigantamax Pokémon the event brings to Max Battles (each entry is the base species). Absent in older data. */
	maxBattles?: Array<IEntry>;
	bonuses: Record<GameLanguage, Array<string>>;
	/**
	 * The same bonuses with their formatting kept (bullet points, how deep they are, bold, links, the asterisk footnotes). Absent
	 * in older data: `bonuses` is then all there is.
	 */
	bonusBlocks?: Partial<Record<GameLanguage, Array<IRichBlock>>>;
	/**
	 * The rewards of an event's GO Pass (the "Featured Pokémon and Rewards" section), with their formatting and without the lines of
	 * the Pokémon taken from it, per language. Absent when the event has none.
	 */
	rewardBlocks?: Partial<Record<GameLanguage, Array<IRichBlock>>>;
	/** The major milestone bonuses of a season or of an event with a GO Pass, per language. */
	milestoneBonuses?: Partial<Record<GameLanguage, IMilestoneBonuses>>;
	// Which locales genuinely have their own pokemongo.com post for this event
	// (as opposed to `title`/`subtitle`/`url`/`bonuses` above, which fall back
	// to the English post's content for a locale missing its own — see
	// dex-server's `pairEventTranslations`). LeekDuck-sourced synthetic posts
	// (`spotlightToPost`/`specialToPost`) have no real per-locale page at all,
	// so they just list every `GameLanguage` here rather than being filtered
	// the way real pokemongo.com posts are.
	availableLocales: Array<GameLanguage>;
	// 'leekduck' for the synthetic posts built from Spotlight Hours/Special
	// Raid Bosses (`spotlightToPost`/`specialToPost`) — LeekDuck is a fan
	// site, not an official source: anything crediting "where this came
	// from" (see `slotSourceLabel`) names the event by its title, and falls
	// back to the bare site only when the post has none.
	source: 'pokemongo' | 'leekduck';
	isRelevant?: boolean;
	isSpotlight?: boolean;
	isRaidHour?: boolean;
}

export interface IRaidEntry {
	date: string;
	entries: Record<string, Array<IEntry>>;
}

export const sortPosts = (e1: IPostEntry, e2: IPostEntry) => {
	if (e1.startDate.valueOf() === e2.startDate.valueOf()) {
		return (e1.endDate.valueOf() ?? 0) - (e2.endDate.valueOf() ?? 0);
	}

	return e1.startDate.valueOf() - e2.startDate.valueOf();
};

export const sortEntries = (e1: IEntry, e2: IEntry, gamemasterPokemon: Record<string, IGamemasterPokemon>) => {
	if (gamemasterPokemon[e1.speciesId].isShadow && !gamemasterPokemon[e2.speciesId].isShadow) {
		return 1;
	}

	if (gamemasterPokemon[e1.speciesId].isShadow && !gamemasterPokemon[e2.speciesId].isShadow) {
		return -1;
	}

	if (e1.kind === e2.kind) {
		return gamemasterPokemon[e1.speciesId].dex - gamemasterPokemon[e2.speciesId].dex;
	}

	if (!e1.kind) {
		return -1;
	}

	if (!e2.kind) {
		return 1;
	}

	return e1.kind.localeCompare(e2.kind);
};
