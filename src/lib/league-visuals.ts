import type { GameLanguage } from '../contexts/language-context';
import type { ILeagueDefinition } from '../DTOs/ILeagueDefinition';
import gameTranslator, { GameTranslatorKeys } from '../utils/GameTranslator';

/**
 * Icon + accent-color lookup for PvP leagues, keyed by dex-server's league
 * id (`great`/`ultra`/`master`, or `${pvpokeFormat}-${cpCap}` for whatever
 * rotating/custom cup PvPoke currently has active — see `leagues.json`).
 *
 * Icons for rotating cups come from a folder the user drops PNGs into
 * (`public/images/leagues/cups/`) and maintains by hand as PvPoke's active
 * cup roster changes over time — this map is the only place a new drop
 * needs to be wired up. An id with no entry here still works everywhere
 * (falls back to a plain CP-cap text badge and a deterministic accent
 * color), it just won't have a picture yet.
 */
const CUPS = '/images/leagues/cups/';

export const LEAGUE_ICON: Record<string, string> = {
	'mega-1500': `${CUPS}great-league-mega-edition.png`,
	'mega-2500': `${CUPS}ultra-league-mega-edition.png`,
	'mega-10000': `${CUPS}master-league-mega-edition.png`,
	'little-500': `${CUPS}GBL_littlecup.png`,
	'remix-1500': `${CUPS}GBL_littlecupremix.png`,
	'retro-1500': `${CUPS}GBL_retrocup.png`,
	'catch-1500': `${CUPS}catch_cup.png`,
	'fantasy-1500': `${CUPS}fantasy_cup_icon.png`,
	'willpower-1500': `${CUPS}willpower_cup_icon.png`,
	'colormega-1500': `${CUPS}color-mega.png`,
	'laic2027-1500': `${CUPS}laic.png`,
};

// Each one is the icon's own dominant, identity-carrying color — computed
// with scripts/extract-league-colors.mjs (a histogram over the icon's own
// pixels, background/outline/grays filtered out). Re-run that script after
// dropping in a new icon rather than guessing a hex by eye. Mega editions
// are handled separately below (`MEGA_TIER_VAR`) — their raw extracted color
// was technically "the icon's own dominant color" but reads as an ugly,
// low-contrast mismatch against the app's actual Great/Ultra/Master
// palette, which is what a player actually associates each tier with.
// Never a dark/low-contrast shade, even when that's technically an icon's
// most common pixel color — this is used as chip TEXT (see `.r-lgpick-chips
// button[data-active='true']`), not just a background wash, so anything low-
// lightness reads as unreadable-to-invisible against a dark UI. `catch-1500`
// and `laic2027-1500` are both brightened, same-hue versions of what their
// icon actually extracted to (`#242848`/`#06224e`) rather than the raw
// extraction — see scripts/extract-league-colors.mjs's own note on this.
const LEAGUE_COLOR: Record<string, string> = {
	'little-500': '#f4c559',
	'remix-1500': '#f4c559',
	'retro-1500': '#ebe1ad',
	'catch-1500': '#646fc4',
	'fantasy-1500': '#accaec',
	'willpower-1500': '#fd7b86',
	'colormega-1500': '#bc9378',
	// PvPoke's yearly Latin America International Championship cup — see the
	// matching id in dex-server's `dynamicLeagueIds` (update the year there
	// and here together whenever it rotates).
	'laic2027-1500': '#3077e8',
};

// Deterministic fallback for any active league id with no curated color
// above (a cup that just rotated in and hasn't been hand-tuned yet).
const FALLBACK_PALETTE = ['#5aa9e6', '#e68a5a', '#6bcf9f', '#e0475c', '#b07af0', '#d4c95e'];

const hash = (id: string): number => {
	let h = 0;
	for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
	return Math.abs(h);
};

const isMegaLeague = (id: string): boolean => id.startsWith('mega-');

/** Which cp-cap tier (great=1500/ultra=2500/master=uncapped) a Mega cup's own base league is. */
const tierForCpCap = (cpCap: number): 'great' | 'ultra' | 'master' =>
	cpCap <= 1500 ? 'great' : cpCap <= 2500 ? 'ultra' : 'master';

/** A Mega league's own cp cap, parsed straight off its id (`mega-1500` → 1500)
 *  — dex-server's own `${format}-${cpCap}` convention, so no separate lookup
 *  is needed just to color a chip. */
const megaCpCapFromId = (id: string): number | undefined => {
	const match = /^mega-(\d+)$/.exec(id);
	return match ? Number(match[1]) : undefined;
};

// A Mega cup is still, at heart, Great/Ultra/Master — same identity color a
// player already associates with that cap, not a new color of its own. Using
// the app's own theme-aware CSS vars (rather than a hardcoded hex) also
// means these stay correct across light/dark mode automatically.
const MEGA_TIER_VAR = {
	great: 'var(--lg-great)',
	ultra: 'var(--lg-ultra)',
	master: 'var(--lg-master)',
} as const;

/** Icon path for a league id, or `undefined` when nothing's been mapped yet. */
export const leagueIcon = (id: string): string | undefined => LEAGUE_ICON[id];

/** Stable accent color for a league id — curated where we have one, otherwise deterministic. */
export const leagueColor = (id: string): string => {
	const megaCpCap = megaCpCapFromId(id);
	if (megaCpCap != null) return MEGA_TIER_VAR[tierForCpCap(megaCpCap)];
	return LEAGUE_COLOR[id] ?? FALLBACK_PALETTE[hash(id) % FALLBACK_PALETTE.length];
};

const TIER_LONG = {
	great: GameTranslatorKeys.GreatLeagueLong,
	ultra: GameTranslatorKeys.UltraLeagueLong,
	master: GameTranslatorKeys.MasterLeagueLong,
} as const;
const TIER_SHORT = {
	great: GameTranslatorKeys.GreatLeagueShort,
	ultra: GameTranslatorKeys.UltraLeagueShort,
	master: GameTranslatorKeys.MasterLeagueShort,
} as const;

/** PvPoke's own format name (the part of a league id before its `-cpCap`
 *  suffix) — `colormega-1500` → `colormega`, `retro-1500` → `retro`. */
const formatOf = (id: string): string => id.replace(/-\d+$/, '');

/**
 * Named rotating cups with a real in-game data-mined title (unlike most
 * PvPoke-only cups, which have no in-game name at all) — keyed by PvPoke's
 * own format name, not the full league id, since that's what a cup's mega
 * variant (`colormega` → base `color`) is built from below. Some of these
 * (Color Cup, Fantasy Cup) have no *canonical* in-game key at all — the only
 * one that exists already bakes an edition into the text itself (e.g.
 * `color_cup_great_title` → "Color Cup: Great League Edition"); others
 * (Halloween, Catch, Retro, Little) do have a plain canonical key ("Catch
 * Cup", no edition). `leagueTitle` below treats both the same way: strip
 * whatever edition text might already be baked in, then append go-pokedex's
 * own already-localized Great/Ultra/Master League name — driven by the
 * league's real, current cpCap, not by whatever wording happened to be
 * baked into the raw text (which is often stale/wrong, e.g. Fantasy Cup's
 * only confirmed key says "Great League Edition" even for a 2500 CP
 * listing).
 */
const CUP_TITLE_KEY: Partial<Record<string, GameTranslatorKeys>> = {
	retro: GameTranslatorKeys.RetroCupTitle,
	little: GameTranslatorKeys.LittleCupTitle,
	color: GameTranslatorKeys.ColorCupTitle,
	fantasy: GameTranslatorKeys.FantasyCupTitle,
	halloween: GameTranslatorKeys.HalloweenCupTitle,
	catch: GameTranslatorKeys.CatchCupTitle,
};

/**
 * Drops a baked-in edition suffix some cup titles carry in their raw
 * in-game text — e.g. "Color Cup: Great League Edition" → "Color Cup",
 * splitting on the first `:` or `-`, whichever comes first. Canonical cups
 * with no such suffix at all (e.g. "Catch Cup") pass through unchanged —
 * `indexOf` returning -1 for both just means there's nothing to cut.
 */
const stripBakedInEdition = (raw: string): string => {
	const candidates = [raw.indexOf(':'), raw.indexOf('-')].filter((i) => i >= 0);
	return candidates.length === 0 ? raw.trim() : raw.slice(0, Math.min(...candidates)).trim();
};

/**
 * Display title for any league — great/ultra/master/raid are handled by
 * their own existing GameTranslator calls at each call site; this is for
 * whatever `leagues.json` hands back for a rotating/custom cup. dex-server's
 * own raw title bakes the cp cap into the text ("Retro (1500 CP)"), which is
 * redundant chrome once the league already has its own icon/chip, so this
 * always strips that — but prefers a cup's real in-game name first, in three
 * shapes:
 *  - a plain named cup (`CUP_TITLE_KEY`, e.g. `retro`): its own real title
 *    (edition text stripped, see `stripBakedInEdition`) + " " + whichever of
 *    Great/Ultra/Master League matches its actual cpCap — e.g. "Retro Cup
 *    Great League".
 *  - a generic Mega cup (`mega-1500`/`2500`/`10000`, no named cup of its
 *    own): "Mega " + whichever of Great/Ultra/Master League matches its cap.
 *  - a NAMED cup's own Mega variant (PvPoke appends "mega" straight onto the
 *    format name, e.g. `colormega` for Color Cup): "Mega " + that cup's own
 *    title (built exactly as the plain named-cup case above) — a Mega Color
 *    Cup is its own distinct PvPoke ranking category, not a Mega-flavored
 *    Great League.
 * Falls back to the stripped PvPoke title whenever the confirmed translation
 * isn't published yet (`gameTranslator` returns `''` for a not-yet-confirmed
 * key/locale combo — see its own doc comment).
 */
export const leagueTitle = (league: ILeagueDefinition, gl: GameLanguage): { short: string; full: string } => {
	const stripped = league.title.replace(/\s*\(\s*\d+\s*CP\s*\)\s*$/i, '').trim();
	const fallback = { short: stripped, full: stripped };

	// PvPoke's yearly Latin America International Championship cup has no
	// real in-game name at all (it's a community/tournament-org title, not
	// data-mined) and no reason to vary by UI/game language — always the
	// current calendar year, regardless of which year happens to be baked
	// into the league id itself (`laic2027`, `laic2028`, …).
	if (formatOf(league.id).startsWith('laic')) {
		const title = `${new Date().getFullYear()} GO LAIC`;
		return { short: title, full: title };
	}

	if (isMegaLeague(league.id)) {
		const tier = tierForCpCap(league.cpCap);
		const mega = gameTranslator(GameTranslatorKeys.MegaDisplay, gl);
		const short = gameTranslator(TIER_SHORT[tier], gl);
		const full = gameTranslator(TIER_LONG[tier], gl);
		return short && full ? { short: `${mega} ${short}`, full: `${mega} ${full}` } : fallback;
	}

	// Named cup + its own league-tier suffix (e.g. "Retro Cup Great League").
	const namedCupTitle = (key: GameTranslatorKeys): { short: string; full: string } | undefined => {
		const raw = gameTranslator(key, gl);
		const tier = tierForCpCap(league.cpCap);
		const leagueShort = gameTranslator(TIER_SHORT[tier], gl);
		const leagueFull = gameTranslator(TIER_LONG[tier], gl);
		if (!raw || !leagueShort || !leagueFull) return undefined;
		const base = stripBakedInEdition(raw);
		return { short: `${base} ${leagueShort}`, full: `${base} ${leagueFull}` };
	};

	const format = formatOf(league.id);
	const directKey = CUP_TITLE_KEY[format];
	if (directKey) return namedCupTitle(directKey) ?? fallback;

	if (format.endsWith('mega')) {
		const baseKey = CUP_TITLE_KEY[format.slice(0, -'mega'.length)];
		if (baseKey) {
			const mega = gameTranslator(GameTranslatorKeys.MegaDisplay, gl);
			const base = namedCupTitle(baseKey);
			if (mega && base) return { short: `${mega} ${base.short}`, full: `${mega} ${base.full}` };
		}
	}

	return fallback;
};
