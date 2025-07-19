import { GameLanguage } from '../contexts/language-context';

export enum GameTranslatorKeys {
	HP,
	CP,
	Shiny,
	AttackSearch,
	DefenseSearch,
	HPSearch,
	Great,
	Master,
	Retro,
	Holiday,
	Raids,
	MegaEvolve,
	TradeEvolve,
	Fantasy,
	FantasyCup,
	UltraBeast,
	GreatLeague,
	GreatRemixCup,
	UltraLeague,
	MasterLeague,
	RetroCup,
	HolidayCup,
	EliteTM,
	ShadowSearch,
	Shadow,
	HisuianSearch,
	AlolanSearch,
	PaldeanSearch,
	GalarianSearch,
	Legendary,
	Mythical,
	MegaRaid,
	Favorite,
	Raid,
}

const hp = new Map<GameLanguage, string>([
	[GameLanguage.en, 'HP'],
	[GameLanguage.ptbr, 'PS'],
]);

const megaRaid = new Map<GameLanguage, string>([
	[GameLanguage.en, 'Mega Raid'],
	[GameLanguage.ptbr, 'Megarreide'],
]);

const fantasy = new Map<GameLanguage, string>([
	[GameLanguage.en, 'Fantasy'],
	[GameLanguage.ptbr, 'Fantasia'],
]);

const fantasyCup = new Map<GameLanguage, string>([
	[GameLanguage.en, 'Fantasy Cup'],
	[GameLanguage.ptbr, 'Copa da Fantasia'],
]);

const megaEvolve = new Map<GameLanguage, string>([
	[GameLanguage.en, 'megaevolve'],
	[GameLanguage.ptbr, 'megaevolui'],
]);

const tradeEvolve = new Map<GameLanguage, string>([
	[GameLanguage.en, 'tradeevolve'],
	[GameLanguage.ptbr, 'evoluirportroca'],
]);

const ultraBeast = new Map<GameLanguage, string>([
	[GameLanguage.en, 'ultra beasts'],
	[GameLanguage.ptbr, 'ultracriatura'],
]);

const greatRemixCup = new Map<GameLanguage, string>([
	[GameLanguage.en, 'Great League Remix'],
	[GameLanguage.ptbr, 'Remix da Grande Liga'],
]);

const favorite = new Map<GameLanguage, string>([
	[GameLanguage.en, 'favorite'],
	[GameLanguage.ptbr, 'favorito'],
]);

const mythical = new Map<GameLanguage, string>([
	[GameLanguage.en, 'mythical'],
	[GameLanguage.ptbr, 'mítico'],
]);

const legendary = new Map<GameLanguage, string>([
	[GameLanguage.en, 'legendary'],
	[GameLanguage.ptbr, 'lendário'],
]);

const hisuianSearch = new Map<GameLanguage, string>([
	[GameLanguage.en, 'hisuian'],
	[GameLanguage.ptbr, 'hisui'],
]);

const alolanSearch = new Map<GameLanguage, string>([
	[GameLanguage.en, 'alolan'],
	[GameLanguage.ptbr, 'alola'],
]);

const paldeanSearch = new Map<GameLanguage, string>([
	[GameLanguage.en, 'paldean'],
	[GameLanguage.ptbr, 'paldea'],
]);

const galarianSearch = new Map<GameLanguage, string>([
	[GameLanguage.en, 'galarian'],
	[GameLanguage.ptbr, 'galar'],
]);

const shadow = new Map<GameLanguage, string>([
	[GameLanguage.en, 'Shadow'],
	[GameLanguage.ptbr, 'Sombroso'],
]);

const shadowSearch = new Map<GameLanguage, string>([
	[GameLanguage.en, 'shadow'],
	[GameLanguage.ptbr, 'sombroso'],
]);

const raids = new Map<GameLanguage, string>([
	[GameLanguage.en, 'Raids'],
	[GameLanguage.ptbr, 'Reides'],
]);

const raid = new Map<GameLanguage, string>([
	[GameLanguage.en, 'Raid'],
	[GameLanguage.ptbr, 'Reide'],
]);

const holidayCup = new Map<GameLanguage, string>([
	[GameLanguage.en, 'Holiday Cup'],
	[GameLanguage.ptbr, 'Copa Festiva'],
]);

const holiday = new Map<GameLanguage, string>([
	[GameLanguage.en, 'Holiday'],
	[GameLanguage.ptbr, 'Festiva'],
]);

const shiny = new Map<GameLanguage, string>([
	[GameLanguage.en, 'Shinies'],
	[GameLanguage.ptbr, 'Brilhantes'],
]);

const cp = new Map<GameLanguage, string>([
	[GameLanguage.en, 'cp'],
	[GameLanguage.ptbr, 'pc'],
]);

const attackSearch = new Map<GameLanguage, string>([
	[GameLanguage.en, 'attack'],
	[GameLanguage.ptbr, 'ataque'],
]);

const defenseSearch = new Map<GameLanguage, string>([
	[GameLanguage.en, 'defense'],
	[GameLanguage.ptbr, 'defesa'],
]);

const hpSearch = new Map<GameLanguage, string>([
	[GameLanguage.en, 'hp'],
	[GameLanguage.ptbr, 'ps'],
]);

const great = new Map<GameLanguage, string>([
	[GameLanguage.en, 'Great'],
	[GameLanguage.ptbr, 'Grande'],
]);

const master = new Map<GameLanguage, string>([
	[GameLanguage.en, 'Master'],
	[GameLanguage.ptbr, 'Mestra'],
]);

const greatLeague = new Map<GameLanguage, string>([
	[GameLanguage.en, 'Great League'],
	[GameLanguage.ptbr, 'Grande Liga'],
]);

const ultraLeague = new Map<GameLanguage, string>([
	[GameLanguage.en, 'Ultra League'],
	[GameLanguage.ptbr, 'Ultra-liga'],
]);

const masterLeague = new Map<GameLanguage, string>([
	[GameLanguage.en, 'Master League'],
	[GameLanguage.ptbr, 'Liga Mestra'],
]);

const retro = new Map<GameLanguage, string>([
	[GameLanguage.en, 'Retro'],
	[GameLanguage.ptbr, 'Retrô'],
]);

const retroCup = new Map<GameLanguage, string>([
	[GameLanguage.en, 'Retro Cup'],
	[GameLanguage.ptbr, 'Copa Retrô'],
]);

const eliteTM = new Map<GameLanguage, string>([
	[GameLanguage.en, 'Elite TM'],
	[GameLanguage.ptbr, 'MT Elite'],
]);

const translations = new Map<GameTranslatorKeys, Map<GameLanguage, string>>([
	[GameTranslatorKeys.HP, hp],
	[GameTranslatorKeys.AttackSearch, attackSearch],
	[GameTranslatorKeys.Shiny, shiny],
	[GameTranslatorKeys.DefenseSearch, defenseSearch],
	[GameTranslatorKeys.HPSearch, hpSearch],
	[GameTranslatorKeys.CP, cp],
	[GameTranslatorKeys.MegaRaid, megaRaid],
	[GameTranslatorKeys.Great, great],
	[GameTranslatorKeys.Fantasy, fantasy],
	[GameTranslatorKeys.FantasyCup, fantasyCup],
	[GameTranslatorKeys.Master, master],
	[GameTranslatorKeys.GreatLeague, greatLeague],
	[GameTranslatorKeys.UltraLeague, ultraLeague],
	[GameTranslatorKeys.MasterLeague, masterLeague],
	[GameTranslatorKeys.Retro, retro],
	[GameTranslatorKeys.RetroCup, retroCup],
	[GameTranslatorKeys.EliteTM, eliteTM],
	[GameTranslatorKeys.Holiday, holiday],
	[GameTranslatorKeys.HolidayCup, holidayCup],
	[GameTranslatorKeys.Raids, raids],
	[GameTranslatorKeys.Raid, raid],
	[GameTranslatorKeys.Shadow, shadow],
	[GameTranslatorKeys.ShadowSearch, shadowSearch],
	[GameTranslatorKeys.GalarianSearch, galarianSearch],
	[GameTranslatorKeys.PaldeanSearch, paldeanSearch],
	[GameTranslatorKeys.AlolanSearch, alolanSearch],
	[GameTranslatorKeys.HisuianSearch, hisuianSearch],
	[GameTranslatorKeys.GreatRemixCup, greatRemixCup],
	[GameTranslatorKeys.Legendary, legendary],
	[GameTranslatorKeys.Mythical, mythical],
	[GameTranslatorKeys.MegaEvolve, megaEvolve],
	[GameTranslatorKeys.TradeEvolve, tradeEvolve],
	[GameTranslatorKeys.UltraBeast, ultraBeast],
	[GameTranslatorKeys.Favorite, favorite],
]);

const gameTranslator = (key: GameTranslatorKeys, language: GameLanguage) =>
	translations.get(key)?.get(language) ??
	(GameTranslatorKeys[key] ? GameTranslatorKeys[key].toString() : key?.toString());

export default gameTranslator;
