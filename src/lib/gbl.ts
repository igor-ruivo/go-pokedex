import type { IGblSeason } from '../DTOs/IGblSeason';

/** The id the season's GO Battle League card is known by, for its link and for whether it was opened: a new season is a new card. */
export const gblEventId = (season: IGblSeason) => season.slug;

/** The ranks from which the rank-up medals are the numbered ones (an Elo-like rating) rather than the shields of the lower ranks. */
const MEDAL_FROM = 2000;

/** Where the ball sits in each numbered medal (the middle of its ring and its width), as percentages of the medal's own picture. */
const MEDAL_RINGS: Record<number, { x: number; y: number; width: number }> = {
	2000: { x: 48.9, y: 49.4, width: 43.4 },
	2500: { x: 49.1, y: 49.1, width: 43.6 },
	2750: { x: 49.8, y: 49.2, width: 40.7 },
	3000: { x: 50, y: 46.7, width: 39 },
};

export interface GblRankMedal {
	/** The picture of the shield or medal, in /public/images/ranks. */
	medal: string;
	/** The ball set in the ring of a numbered medal, with where its middle is and how wide it is. */
	ring?: { image: string; x: number; y: number; width: number } | undefined;
	/** The number the medal shows: the rank itself (a rank-up encounter) or "from that rank on" (a standard one). */
	rank: number;
	plus: boolean;
}

/**
 * The medal the game draws for a rank. The lower ranks are shields (green from 1, gold from 6, bronze from 11, crimson with three
 * stars from 16), the rating ranks (2000, 2500, 2750, 3000) are numbered medals with a ball in the ring. A rank-up encounter is at
 * exactly its rank; a standard one from it on, which the "+" says.
 */
export const gblRankMedal = (rank: number, exact: boolean): GblRankMedal => {
	if (rank >= MEDAL_FROM) {
		const ring = MEDAL_RINGS[rank];
		return {
			medal: `/images/ranks/${rank}.png`,
			ring: ring && { image: `/images/ranks/${rank === 3000 ? 3000 : 2000}_center.png`, ...ring },
			rank,
			plus: false,
		};
	}
	const shield = rank >= 16 ? '16+' : rank >= 11 ? '11+' : rank >= 6 ? '6+' : '1+';
	return { medal: `/images/ranks/${shield}.png`, rank, plus: !exact };
};
