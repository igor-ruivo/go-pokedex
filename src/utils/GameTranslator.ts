import { GameLanguage } from "../contexts/language-context";

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
    Favorite
}

const hp = new Map<GameLanguage, string>([
    [GameLanguage.English, "HP"],
    [GameLanguage.Portuguese, "PS"]
]);

const megaEvolve = new Map<GameLanguage, string>([
    [GameLanguage.English, "megaevolve"],
    [GameLanguage.Portuguese, "megaevolui"]
]);

const tradeEvolve = new Map<GameLanguage, string>([
    [GameLanguage.English, "tradeevolve"],
    [GameLanguage.Portuguese, "evoluirportroca"]
]);

const ultraBeast = new Map<GameLanguage, string>([
    [GameLanguage.English, "ultra beasts"],
    [GameLanguage.Portuguese, "ultracriatura"]
]);

const greatRemixCup = new Map<GameLanguage, string>([
    [GameLanguage.English, "Great League Remix"],
    [GameLanguage.Portuguese, "Remix da Grande Liga"]
]);

const favorite = new Map<GameLanguage, string>([
    [GameLanguage.English, "favorite"],
    [GameLanguage.Portuguese, "favorito"]
]);

const mythical = new Map<GameLanguage, string>([
    [GameLanguage.English, "mythical"],
    [GameLanguage.Portuguese, "mítico"]
]);

const legendary = new Map<GameLanguage, string>([
    [GameLanguage.English, "legendary"],
    [GameLanguage.Portuguese, "lendário"]
]);

const hisuianSearch = new Map<GameLanguage, string>([
    [GameLanguage.English, "hisuian"],
    [GameLanguage.Portuguese, "hisui"]
]);

const alolanSearch = new Map<GameLanguage, string>([
    [GameLanguage.English, "alolan"],
    [GameLanguage.Portuguese, "alola"]
]);

const paldeanSearch = new Map<GameLanguage, string>([
    [GameLanguage.English, "paldean"],
    [GameLanguage.Portuguese, "paldea"]
]);

const galarianSearch = new Map<GameLanguage, string>([
    [GameLanguage.English, "galarian"],
    [GameLanguage.Portuguese, "galar"]
]);

const shadow = new Map<GameLanguage, string>([
    [GameLanguage.English, "Shadow"],
    [GameLanguage.Portuguese, "Sombroso"]
]);

const shadowSearch = new Map<GameLanguage, string>([
    [GameLanguage.English, "shadow"],
    [GameLanguage.Portuguese, "sombroso"]
]);

const raids = new Map<GameLanguage, string>([
    [GameLanguage.English, "Raids"],
    [GameLanguage.Portuguese, "Reides"]
]);

const holidayCup = new Map<GameLanguage, string>([
    [GameLanguage.English, "Holiday Cup"],
    [GameLanguage.Portuguese, "Copa Festiva"]
]);

const holiday = new Map<GameLanguage, string>([
    [GameLanguage.English, "Holiday"],
    [GameLanguage.Portuguese, "Festiva"]
]);

const shiny = new Map<GameLanguage, string>([
    [GameLanguage.English, "Shinies"],
    [GameLanguage.Portuguese, "Brilhantes"]
]);

const cp = new Map<GameLanguage, string>([
    [GameLanguage.English, "cp"],
    [GameLanguage.Portuguese, "pc"]
]);

const attackSearch = new Map<GameLanguage, string>([
    [GameLanguage.English, "attack"],
    [GameLanguage.Portuguese, "ataque"]
]);

const defenseSearch = new Map<GameLanguage, string>([
    [GameLanguage.English, "defense"],
    [GameLanguage.Portuguese, "defesa"]
]);

const hpSearch = new Map<GameLanguage, string>([
    [GameLanguage.English, "hp"],
    [GameLanguage.Portuguese, "ps"]
]);

const great = new Map<GameLanguage, string>([
    [GameLanguage.English, "Great"],
    [GameLanguage.Portuguese, "Grande"]
]);

const master = new Map<GameLanguage, string>([
    [GameLanguage.English, "Master"],
    [GameLanguage.Portuguese, "Mestra"]
]);

const greatLeague = new Map<GameLanguage, string>([
    [GameLanguage.English, "Great League"],
    [GameLanguage.Portuguese, "Grande Liga"]
]);

const ultraLeague = new Map<GameLanguage, string>([
    [GameLanguage.English, "Ultra League"],
    [GameLanguage.Portuguese, "Ultra-liga"]
]);

const masterLeague = new Map<GameLanguage, string>([
    [GameLanguage.English, "Master League"],
    [GameLanguage.Portuguese, "Liga Mestra"]
]);

const retro = new Map<GameLanguage, string>([
    [GameLanguage.English, "Retro"],
    [GameLanguage.Portuguese, "Retrô"]
]);

const retroCup = new Map<GameLanguage, string>([
    [GameLanguage.English, "Retro Cup"],
    [GameLanguage.Portuguese, "Copa Retrô"]
]);

const eliteTM = new Map<GameLanguage, string>([
    [GameLanguage.English, "Elite TM"],
    [GameLanguage.Portuguese, "MT Elite"]
]);

const translations = new Map<GameTranslatorKeys, Map<GameLanguage, string>>([
    [GameTranslatorKeys.HP, hp],
    [GameTranslatorKeys.AttackSearch, attackSearch],
    [GameTranslatorKeys.Shiny, shiny],
    [GameTranslatorKeys.DefenseSearch, defenseSearch],
    [GameTranslatorKeys.HPSearch, hpSearch],
    [GameTranslatorKeys.CP, cp],
    [GameTranslatorKeys.Great, great],
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
    [GameTranslatorKeys.Favorite, favorite]
]);

const gameTranslator = (key: GameTranslatorKeys, language: GameLanguage) => translations.get(key)?.get(language) ?? (GameTranslatorKeys[key] ? GameTranslatorKeys[key].toString() : key?.toString());

export default gameTranslator;