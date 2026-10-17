import type { GameLanguage } from '../contexts/language-context';
import type { IEntry } from './INews';
import type { IRichBlock } from './IRichText';

/**
 * Mirrors dex-server's `gbl-season.json` (see its `parsers/types/gbl.ts`) — the latest "GO Battle League: <season>" post: the
 * season's reward encounters, the attack changes (the post's own wording in each language) and which Pokémon learn which attacks.
 */

export type GblChangeDirection = 'buff' | 'nerf';

/** What a move's changes add up to: all for the better, all for the worse, or a bit of each. */
export type GblVerdict = 'buff' | 'nerf' | 'adjusted';

export interface IGblAttackChange {
	moveId: string;
	verdict: GblVerdict;
	/** How each bullet point of the English post reads (a language can split or join them, so another language's count may differ). */
	directions: Array<GblChangeDirection | 'mixed'>;
	/** The move's changes exactly as the post words them in each language (the old value struck through). */
	text: Record<GameLanguage, Array<IRichBlock>>;
}

/**
 * A reward encounter: `shiny` is whether it can be shiny, `rank` the rank it is met at (a rank-up encounter at exactly that rank,
 * a standard one from that rank on).
 */
export interface IGblEncounter extends IEntry {
	rank: number;
}

export interface IGblAttackAvailability {
	speciesId: string;
	moveId: string;
}

export interface IGblSeason {
	/** The post's address after `/news/`; the post exists in every language at the same address. */
	slug: string;
	/** The season's name ("Twilight Trails") as each language's post writes it ("Trilhas do Entardecer"). */
	name: Record<GameLanguage, string>;
	/** The post's own picture. */
	imageUrl: string;
	/** Met once per season when reaching a rank, in the order of the ranks. */
	rankUpEncounters: Array<IGblEncounter>;
	/** Met in reward encounters all season, from the lowest rank up. */
	standardEncounters: Array<IGblEncounter>;
	/** The "surprise encounter with a Legendary Pokémon" that closes the standard encounters, and the rank it starts at. */
	legendarySurprise?: { rank: number } | undefined;
	attackChanges: Array<IGblAttackChange>;
	attackAvailability: Array<IGblAttackAvailability>;
}
