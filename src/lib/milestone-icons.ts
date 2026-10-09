import type { IRichBlock } from '../DTOs/IRichText';

/** The kinds of bonus or reward that have an icon of their own. */
export type BonusIconKey =
	| 'rareCandyXl'
	| 'candyXl'
	| 'rareCandy'
	| 'candy'
	| 'gift'
	| 'dailyIncense'
	| 'incense'
	| 'lure'
	| 'trade'
	| 'camera'
	| 'stickers'
	| 'egg'
	| 'egg1'
	| 'egg2'
	| 'egg5'
	| 'egg7'
	| 'egg12'
	| 'xp'
	| 'stardust'
	| 'stardustVial'
	| 'premiumPass'
	| 'luckyEgg'
	| 'luckyTrinket'
	| 'superIncubator'
	| 'maxParticles'
	| 'remoteRaidPass'
	| 'powerSpot'
	| 'maxBattle'
	| 'megaEnergy'
	| 'ultraBall';

export const BONUS_ICON_URL: Record<BonusIconKey, string> = {
	candy: '/images/bonuses/candy.png',
	candyXl: '/images/bonuses/candy-xl.png',
	rareCandy: '/images/bonuses/rare-candy.png',
	rareCandyXl: '/images/bonuses/rare-candy-xl.png',
	gift: '/images/bonuses/gift.png',
	dailyIncense: '/images/bonuses/incense.png',
	incense: '/images/bonuses/incense-plain.png',
	lure: '/images/bonuses/lure-module.png',
	trade: '/images/bonuses/trade.png',
	camera: '/images/bonuses/camera.png',
	stickers: '/images/bonuses/stickers.png',
	egg: '/images/eggs/10km.png',
	egg1: '/images/eggs/1km.png',
	egg2: '/images/eggs/2km.png',
	egg5: '/images/eggs/5km.png',
	egg7: '/images/eggs/7km.png',
	egg12: '/images/eggs/12km.png',
	xp: '/images/bonuses/xp.svg',
	stardust: '/images/bonuses/stardust.png',
	stardustVial: '/images/bonuses/stardust-vial.png',
	premiumPass: '/images/bonuses/premium-battle-pass.png',
	luckyEgg: '/images/bonuses/lucky-egg.png',
	luckyTrinket: '/images/bonuses/lucky-trinket.png',
	superIncubator: '/images/bonuses/super-incubator.png',
	maxParticles: '/images/bonuses/max-particles.png',
	remoteRaidPass: '/images/bonuses/remote-raid-pass.png',
	powerSpot: '/images/bonuses/power-spot.png',
	maxBattle: '/images/nav/max-battle.webp',
	megaEnergy: '/images/bonuses/mega-energy.png',
	ultraBall: '/images/bonuses/ultra-ball.png',
};

/**
 * What to look for in the English text of a bonus or a reward, in the order its icons are shown ("hatching Eggs" gives the egg, then
 * the XP and the Stardust). The more specific kinds come before the plainer ones they contain ("Rare Candy XL" is not also "Candy XL").
 */
const RULES: ReadonlyArray<readonly [BonusIconKey, (text: string) => boolean]> = [
	['rareCandyXl', (t) => /rare candy xl/i.test(t)],
	['rareCandy', (t) => /rare candy(?! xl)/i.test(t)],
	['candyXl', (t) => /(?<!rare )candy xl/i.test(t)],
	['candy', (t) => /(?<!rare )\bcandy\b(?! xl)/i.test(t)],
	['premiumPass', (t) => /premium battle pass/i.test(t)],
	['luckyEgg', (t) => /lucky egg/i.test(t)],
	['luckyTrinket', (t) => /lucky trinket/i.test(t)],
	['superIncubator', (t) => /super incubator/i.test(t)],
	['maxParticles', (t) => /max particles?/i.test(t)],
	['remoteRaidPass', (t) => /remote raid pass/i.test(t)],
	['powerSpot', (t) => /power spots?/i.test(t) && !/max particles?/i.test(t)],
	['maxBattle', (t) => /\bmax battles?/i.test(t)],
	['megaEnergy', (t) => /mega energy/i.test(t)],
	['gift', (t) => /\bgifts?\b/i.test(t)],
	['dailyIncense', (t) => /daily adventure incense/i.test(t)],
	// Incense that is not the Daily Adventure one
	['incense', (t) => /incense/i.test(t.replace(/daily adventure incense/gi, ''))],
	['lure', (t) => /lure modules?/i.test(t)],
	['trade', (t) => /\btrad(?:e|es|ing)\b/i.test(t)],
	['camera', (t) => /snapshots?/i.test(t)],
	['stickers', (t) => /stickers?/i.test(t)],
	['egg', (t) => /\beggs?\b/i.test(t.replace(/lucky eggs?/gi, '')) || /hatch/i.test(t)],
	['xp', (t) => /\bxp\b/i.test(t)],
	['stardust', (t) => /stardust/i.test(t)],
	['ultraBall', (t) => /ultra ball/i.test(t)],
];

/** The plain text of a block. */
export const blockText = (block: IRichBlock): string => block.runs.map((run) => run.text).join('');

/**
 * The icons of a bonus, found by keywords in its (English) text: none for a kind of bonus with no icon (Mega Evolution speed, say). What a
 * sentence leaves out ("Incense (excluding Daily Adventure Incense) …") is not what it gives, so a parenthesis that starts with
 * "excluding" is not read.
 */
export const bonusIcons = (text: string): Array<BonusIconKey> => {
	// one plain space between words (the posts have non-breaking ones), so that "Rare Candy XL" is found however it is spaced
	const given = text.replace(/\s+/g, ' ').replace(/\(\s*excluding[^)]*\)/gi, '');
	const keys = RULES.filter(([, matches]) => matches(given)).map(([key]) => key);
	// "3× Stardust": the vials add up to the multiplier (the two-vial picture, then a single vial for each one more)
	const times = Number(STARDUST_MULTIPLIER.exec(given)?.[1]);
	const at = keys.indexOf('stardust');
	if (at >= 0 && times >= 1 && times <= 10) {
		keys.splice(
			at,
			1,
			...(times === 1
				? (['stardustVial'] as const)
				: (['stardust', ...Array<'stardustVial'>(times - 2).fill('stardustVial')] as const))
		);
	}
	// "3× Rare Candy XL", "2× Candy": the same count of pictures of the candy (they stack, so the row does not widen)
	for (const [key, pattern] of CANDY_MULTIPLIERS) {
		const count = Number(pattern.exec(given)?.[1]);
		const place = keys.indexOf(key);
		if (place >= 0 && count >= 2 && count <= 10) {
			keys.splice(place + 1, 0, ...Array<BonusIconKey>(count - 1).fill(key));
		}
	}
	// "2 km Eggs": the egg of that distance (the 10 km one when none is named)
	const km = EGG_DISTANCE.exec(given)?.[1];
	const egg = keys.indexOf('egg');
	if (egg >= 0 && km) {
		keys[egg] = `egg${km}` as BonusIconKey;
	}
	return keys;
};

/** "2 km", "2km", "12 km" (not the 2 of "12"): the distance of an Egg. */
const EGG_DISTANCE = /(?<![\d.])(1|2|5|7|12)\s*-?\s*km\b/i;

const CANDY_MULTIPLIERS: ReadonlyArray<readonly [BonusIconKey, RegExp]> = [
	['rareCandyXl', /(\d+)\s*[×x]\s*(?:[a-z-]+\s+){0,2}rare candy xl/i],
	['rareCandy', /(\d+)\s*[×x]\s*(?:[a-z-]+\s+){0,2}rare candy(?! xl)/i],
	['candyXl', /(\d+)\s*[×x]\s*(?:[a-z-]+\s+){0,2}(?<!rare )candy xl/i],
	['candy', /(\d+)\s*[×x]\s*(?:[a-z-]+\s+){0,2}(?<!rare )candy(?! xl)/i],
];

/** "3× Stardust", "2× Hatch Stardust": the multiplier, then up to two words, then Stardust. */
const STARDUST_MULTIPLIER = /(\d+)\s*[×x]\s*(?:[a-z-]+\s+){0,2}stardust/i;
