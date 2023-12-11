import { Language } from "../contexts/language-context";

export enum TranslatorKeys {
    Settings,
    Language,
    Search,
    Loading,
    Name,
    IVTables,
    SearchStrings,
    Attack,
    Defense,
    HP,
    LVL,
    Water,
    Fire,
    Dragon,
    Fairy,
    Ice,
    Ground,
    Rock,
    Psychic,
    Fighting,
    Flying,
    Ghost,
    Steel,
    Dark,
    Normal,
    Grass,
    Electric,
    Poison,
    Bug,
    Unranked,
    Ranked,
    ATK,
    DEF,
    SearchIVs,
    MaxLvl,
    Score,
    TrashString,
    Find,
    WildUnpowered,
    ThatResultIn,
    FindTop,
    ForLeague,
    UpToLevel,
    AllExcept,
    Shadow,
    PokemonNotFound,
    Moves,
    FastMoves,
    ChargedMoves,
    Stats,
    Level,
    UnrankedPokemonForLeague,
    RecommendedMovesUnavailable,
    RecommendedMoves,
    Perfection,
    Config,
    Peaks,
    As,
    Current,
    Best,
    GameLanguage,
    Menu,
    Theme,
    DarkTheme,
    LightTheme,
    SystemDefault,
    RecommendedMovesInfo1,
    RecommendedMovesInfo2,
    targetAttackStatStageChange,
    targetDefenseStatStageChange,
    attackerAttackStatStageChange,
    attackerDefenseStatStageChange,
    Lower,
    Increase,
    STAB,
    Special,
    Has,
    Chance,
    To,
    Stage,
    Stages,
    Elite,
    Legacy,
    EliteMove,
    LegacyMove,
    BaseValue
}

const settings = new Map<Language, string>([
    [Language.English, "Settings"],
    [Language.Portuguese, "Opções"],
    [Language.Bosnian, "Postavke"]
]);

const language = new Map<Language, string>([
    [Language.English, "Website language"],
    [Language.Portuguese, "Idioma do site"],
    [Language.Bosnian, "Jezik web stranice"]
]);

const gameLanguage = new Map<Language, string>([
    [Language.English, "Game language"],
    [Language.Portuguese, "Idioma do jogo"],
    [Language.Bosnian, "Jezik igre"]
]);

const search = new Map<Language, string>([
    [Language.English, "Search…"],
    [Language.Portuguese, "Pesquisar…"],
    [Language.Bosnian, "Pretraži…"]
]);

const loading = new Map<Language, string>([
    [Language.English, "Loading Pokémons…"],
    [Language.Portuguese, "A carregar Pokémons…"],
    [Language.Bosnian, "Učitavanje Pokémona…"]
]);

const name = new Map<Language, string>([
    [Language.English, "Pokémon name"],
    [Language.Portuguese, "Nome do Pokémon"],
    [Language.Bosnian, "Ime Pokémona"]
]);

const ivTables = new Map<Language, string>([
    [Language.English, "IV Tables"],
    [Language.Portuguese, "Tabelas"],
    [Language.Bosnian, "Tabele"]
]);

const searchStrings = new Map<Language, string>([
    [Language.English, "Search Strings"],
    [Language.Portuguese, "Pesquisas"],
    [Language.Bosnian, "Istraživanja"]
]);

const attack = new Map<Language, string>([
    [Language.English, "Attack"],
    [Language.Portuguese, "Ataque"],
    [Language.Bosnian, "Napad"]
]);

const defense = new Map<Language, string>([
    [Language.English, "Defense"],
    [Language.Portuguese, "Defesa"],
    [Language.Bosnian, "Odbrana"]
]);

const hp = new Map<Language, string>([
    [Language.English, "HP"],
    [Language.Portuguese, "PS"],
    [Language.Bosnian, "Život"]
]);

const lvl = new Map<Language, string>([
    [Language.English, "LVL"],
    [Language.Portuguese, "Nív."],
    [Language.Bosnian, "Niv."]
]);

const level = new Map<Language, string>([
    [Language.English, "Level"],
    [Language.Portuguese, "Nível"],
    [Language.Bosnian, "Nivo"]
]);

const water = new Map<Language, string>([
    [Language.English, "Water"],
    [Language.Portuguese, "Água"],
    [Language.Bosnian, "Voda"]
]);

const fire = new Map<Language, string>([
    [Language.English, "Fire"],
    [Language.Portuguese, "Fogo"],
    [Language.Bosnian, "Vatra"]
]);

const dragon = new Map<Language, string>([
    [Language.English, "Dragon"],
    [Language.Portuguese, "Dragão"],
    [Language.Bosnian, "Zmaj"]
]);

const fairy = new Map<Language, string>([
    [Language.English, "Fairy"],
    [Language.Portuguese, "Fada"],
    [Language.Bosnian, "Vila"]
]);

const ice = new Map<Language, string>([
    [Language.English, "Ice"],
    [Language.Portuguese, "Gelo"],
    [Language.Bosnian, "Led"]
]);

const ground = new Map<Language, string>([
    [Language.English, "Ground"],
    [Language.Portuguese, "Terrestre"],
    [Language.Bosnian, "Zemljani"]
]);

const rock = new Map<Language, string>([
    [Language.English, "Rock"],
    [Language.Portuguese, "Pedra"],
    [Language.Bosnian, "Kamen"]
]);

const psychic = new Map<Language, string>([
    [Language.English, "Psychic"],
    [Language.Portuguese, "Psíquico"],
    [Language.Bosnian, "Psihički"]
]);

const fighting = new Map<Language, string>([
    [Language.English, "Fighting"],
    [Language.Portuguese, "Lutador"],
    [Language.Bosnian, "Borac"]
]);

const flying = new Map<Language, string>([
    [Language.English, "Flying"],
    [Language.Portuguese, "Voador"],
    [Language.Bosnian, "Letjelica"]
]);

const ghost = new Map<Language, string>([
    [Language.English, "Ghost"],
    [Language.Portuguese, "Fantasma"],
    [Language.Bosnian, "Duh"]
]);

const steel = new Map<Language, string>([
    [Language.English, "Steel"],
    [Language.Portuguese, "Aço"],
    [Language.Bosnian, "Čelik"]
]);

const dark = new Map<Language, string>([
    [Language.English, "Dark"],
    [Language.Portuguese, "Sombrio"],
    [Language.Bosnian, "Tamno"]
]);

const normal = new Map<Language, string>([
    [Language.English, "Normal"],
    [Language.Portuguese, "Normal"],
    [Language.Bosnian, "Normalan"]
]);

const grass = new Map<Language, string>([
    [Language.English, "Grass"],
    [Language.Portuguese, "Planta"],
    [Language.Bosnian, "Trava"]
]);

const electric = new Map<Language, string>([
    [Language.English, "Electric"],
    [Language.Portuguese, "Elétrico"],
    [Language.Bosnian, "Električni"]
]);

const poison = new Map<Language, string>([
    [Language.English, "Poison"],
    [Language.Portuguese, "Venenoso"],
    [Language.Bosnian, "Otrovan"]
]);

const bug = new Map<Language, string>([
    [Language.English, "Bug"],
    [Language.Portuguese, "Inseto"],
    [Language.Bosnian, "Buba"]
]);

const unranked = new Map<Language, string>([
    [Language.English, "Unranked"],
    [Language.Portuguese, "Sem rank"],
    [Language.Bosnian, "Bez ranga"]
]);

const ranked = new Map<Language, string>([
    [Language.English, "Ranked"],
    [Language.Portuguese, "Lugar"],
    [Language.Bosnian, "Mjesto"]
]);

const atk = new Map<Language, string>([
    [Language.English, "Atk"],
    [Language.Portuguese, "Ata"],
    [Language.Bosnian, "Nap"]
]);

const def = new Map<Language, string>([
    [Language.English, "Def"],
    [Language.Portuguese, "Def"],
    [Language.Bosnian, "Obr"]
]);

const searchIVs = new Map<Language, string>([
    [Language.English, "Search IVs"],
    [Language.Portuguese, "Pesquisar"],
    [Language.Bosnian, "Pretraži"]
]);

const maxLvl = new Map<Language, string>([
    [Language.English, "Max Lvl"],
    [Language.Portuguese, "Nível Máx"],
    [Language.Bosnian, "Maks. Nivo"]
]);

const score = new Map<Language, string>([
    [Language.English, "Score"],
    [Language.Portuguese, "Pontos"],
    [Language.Bosnian, "Bodovi"]
]);

const trashString = new Map<Language, string>([
    [Language.English, "Inverse"],
    [Language.Portuguese, "Inverso"],
    [Language.Bosnian, "Obrnuto"]
]);

const find = new Map<Language, string>([
    [Language.English, "Find"],
    [Language.Portuguese, "Encontrar"],
    [Language.Bosnian, "Nađi"]
]);

const wildUnpowered = new Map<Language, string>([
    [Language.English, "wild caught and still unpowered"],
    [Language.Portuguese, "selvagens e ainda não melhorados"],
    [Language.Bosnian, "divlje uhvaćene i koje još nisu unaprijeđene"]
]);

const thatResultIn = new Map<Language, string>([
    [Language.English, "that evolve to the"],
    [Language.Portuguese, "que evoluem para"],
    [Language.Bosnian, "koje evoluiraju do"]
]);

const findTop = new Map<Language, string>([
    [Language.English, "top"],
    [Language.Portuguese, "os top"],
    [Language.Bosnian, "top"]
]);

const forLeague = new Map<Language, string>([
    [Language.English, "for"],
    [Language.Portuguese, "da"],
    [Language.Bosnian, "za"]
]);

const upToLevel = new Map<Language, string>([
    [Language.English, "up to level"],
    [Language.Portuguese, "até nível"],
    [Language.Bosnian, "do nivoa"]
]);

const allExcept = new Map<Language, string>([
    [Language.English, "all except the"],
    [Language.Portuguese, "todos exceto"],
    [Language.Bosnian, "svih osim"]
]);

const shadow = new Map<Language, string>([
    [Language.English, "Shadow"],
    [Language.Portuguese, "Sombroso"],
    [Language.Bosnian, "Sjenoviti"]
]);

const pokemonNotFound = new Map<Language, string>([
    [Language.English, "No Pokémon matched your search!"],
    [Language.Portuguese, "Não foi encontrado nenhum Pokémon com base nos filtros aplicados!"],
    [Language.Bosnian, "Ni jedan Pokémon nije pronađen na osnovu primijenjenih filtera!"]
]);

const moves = new Map<Language, string>([
    [Language.English, "Moves"],
    [Language.Portuguese, "Ataques"],
    [Language.Bosnian, "Napadi"]
]);

const fastMoves = new Map<Language, string>([
    [Language.English, "Fast Moves"],
    [Language.Portuguese, "Ataques Ágeis"],
    [Language.Bosnian, "Brzi Napadi"]
]);

const chargedMoves = new Map<Language, string>([
    [Language.English, "Charged Moves"],
    [Language.Portuguese, "Ataques Carregados"],
    [Language.Bosnian, "Posebni Napadi"]
]);

const stats = new Map<Language, string>([
    [Language.English, "Stats"],
    [Language.Portuguese, "Status"],
    [Language.Bosnian, "Statistike"]
]);

const unrankedPokemonForLeague = new Map<Language, string>([
    [Language.English, " is unranked for "],
    [Language.Portuguese, " não está classificado na "],
    [Language.Bosnian, " nije rangiran za "]
]);

const recommendedMovesUnavailable = new Map<Language, string>([
    [Language.English, "Recommended moves unavailable:"],
    [Language.Portuguese, "Os ataques recomendados não estão disponíveis:"],
    [Language.Bosnian, "Preporučeni napadi nisu dostupni:"]
]);

const recommendedMoves = new Map<Language, string>([
    [Language.English, "Recommended Moves"],
    [Language.Portuguese, "Ataques Recomendados"],
    [Language.Bosnian, "Preporučeni Napadi"]
]);

const perfection = new Map<Language, string>([
    [Language.English, "Perfection"],
    [Language.Portuguese, "Perfeição"],
    [Language.Bosnian, "Perfekcija"]
]);

const config = new Map<Language, string>([
    [Language.English, "Config."],
    [Language.Portuguese, "Config."],
    [Language.Bosnian, "Konfig."]
]);

const peaks = new Map<Language, string>([
    [Language.English, "Peaks at"],
    [Language.Portuguese, "Potencial"],
    [Language.Bosnian, "Potencijal"]
]);

const as = new Map<Language, string>([
    [Language.English, "as"],
    [Language.Portuguese, "como"],
    [Language.Bosnian, "kao"]
]);

const current = new Map<Language, string>([
    [Language.English, "Current"],
    [Language.Portuguese, "Atual"],
    [Language.Bosnian, "Trenutna"]
]);

const best = new Map<Language, string>([
    [Language.English, "Best"],
    [Language.Portuguese, "Melhor"],
    [Language.Bosnian, "Najbolja"]
]);

const menu = new Map<Language, string>([
    [Language.English, "Menu"],
    [Language.Portuguese, "Menu"],
    [Language.Bosnian, "Meni"]
]);

const theme = new Map<Language, string>([
    [Language.English, "Theme"],
    [Language.Portuguese, "Tema"],
    [Language.Bosnian, "Tema"]
]);

const lightTheme = new Map<Language, string>([
    [Language.English, "Light"],
    [Language.Portuguese, "Claro"],
    [Language.Bosnian, "Svijetli"]
]);

const darkTheme = new Map<Language, string>([
    [Language.English, "Dark"],
    [Language.Portuguese, "Escuro"],
    [Language.Bosnian, "Tamni"]
]);

const systemDefault = new Map<Language, string>([
    [Language.English, "System"],
    [Language.Portuguese, "Sistema"],
    [Language.Bosnian, "Sistemski"]
]);

const recommendedMovesInfo1 = new Map<Language, string>([
    [Language.English, "The most common Fast Move and Charged Moves combination for"],
    [Language.Portuguese, "A combinação de Ataque Ágil e Ataques Carregados mais frequentemente utilizados no"],
    [Language.Bosnian, "Najčešća kombinacija Brzog Napada i Posebni Napadi za"]
]);

const recommendedMovesInfo2 = new Map<Language, string>([
    [Language.English, "in"],
    [Language.Portuguese, "para a"],
    [Language.Bosnian, "za"]
]);

const targetAttack = new Map<Language, string>([
    [Language.English, "enemy's Attack Damage by"],
    [Language.Portuguese, "o Valor de Ataque do inimigo em"],
    [Language.Bosnian, "Vrednost Napada neprijatelja za"]
]);

const targetDefense = new Map<Language, string>([
    [Language.English, "enemy's Defense by"],
    [Language.Portuguese, "a Defesa do inimigo em"],
    [Language.Bosnian, "Odbranu neprijatelja za"]
]);

const ownAttack = new Map<Language, string>([
    [Language.English, "the user's Attack Damage by"],
    [Language.Portuguese, "o próprio Valor de Ataque em"],
    [Language.Bosnian, "vlastitu Vrednost Napada za"]
]);

const ownDefense = new Map<Language, string>([
    [Language.English, "the user's Defense by"],
    [Language.Portuguese, "a própria Defesa em"],
    [Language.Bosnian, "vlastitu Odbranu za"]
]);

const baseValue = new Map<Language, string>([
    [Language.English, "of the base value"],
    [Language.Portuguese, "do valor base"],
    [Language.Bosnian, "osnovne vrijednosti"]
]);

const lower = new Map<Language, string>([
    [Language.English, "Lower"],
    [Language.Portuguese, "Reduzir"],
    [Language.Bosnian, "Smanjiti"]
]);

const increase = new Map<Language, string>([
    [Language.English, "Increase"],
    [Language.Portuguese, "Aumentar"],
    [Language.Bosnian, "Poveća"]
]);

const stab = new Map<Language, string>([
    [Language.English, "the attack type matches this Pokémon's type, so it has a 20% extra damage bonus!"],
    [Language.Portuguese, "o tipo do ataque é compatível com o tipo deste Pokémon, por isso, tem um bónus de 20% de dano extra!"],
    [Language.Bosnian, "vrsta napada se podudara s vrstom ovog Pokémona, pa ima dodatni bonus od 20% na štetu!"]
]);

const special = new Map<Language, string>([
    [Language.English, "Special"],
    [Language.Portuguese, "Bónus"],
    [Language.Bosnian, "Bonus"]
]);

const has = new Map<Language, string>([
    [Language.English, "has a"],
    [Language.Portuguese, "tem"],
    [Language.Bosnian, "ima"]
]);

const chance = new Map<Language, string>([
    [Language.English, "chance"],
    [Language.Portuguese, "de chances"],
    [Language.Bosnian, "šanse"]
]);

const to = new Map<Language, string>([
    [Language.English, "to"],
    [Language.Portuguese, "de"],
    [Language.Bosnian, "da"]
]);

const stage = new Map<Language, string>([
    [Language.English, "stage"],
    [Language.Portuguese, "nível"],
    [Language.Bosnian, "nivo"]
]);

const stages = new Map<Language, string>([
    [Language.English, "stages"],
    [Language.Portuguese, "níveis"],
    [Language.Bosnian, "nivoi"]
]);

const elite = new Map<Language, string>([
    [Language.English, "This is an Elite Move for this Pokémon. It can only be learned during special in-game events or using an"],
    [Language.Portuguese, "Este é um Ataque Elite para este Pokémon. Pode ser aprendido apenas durante eventos especiais no jogo ou utilizando um"],
    [Language.Bosnian, "Ovo je Elitni Napad za ovog Pokémona. Može se naučiti samo tokom posebnih događanja unutar igre ili korištenjem"]
]);

const legacy = new Map<Language, string>([
    [Language.English, "This is a Legacy Move for this Pokémon. It is no longer able to learn it by any means."],
    [Language.Portuguese, "Este é um Ataque Descontinuado para este Pokémon. Já não é possível aprendê-lo de forma alguma."],
    [Language.Bosnian, "Ovo je Napad koji je obustavljen za ovog Pokémona. Više nije moguće naučiti ga ni na koji način."]
]);

const eliteMove = new Map<Language, string>([
    [Language.English, "Elite"],
    [Language.Portuguese, "Elite"],
    [Language.Bosnian, "Elitni"]
]);

const legacyMove = new Map<Language, string>([
    [Language.English, "Legacy"],
    [Language.Portuguese, "Descontinuado"],
    [Language.Bosnian, "Obustavljen"]
]);

const translations = new Map<TranslatorKeys, Map<Language, string>>([
    [TranslatorKeys.Settings, settings],
    [TranslatorKeys.Language, language],
    [TranslatorKeys.Search, search],
    [TranslatorKeys.Loading, loading],
    [TranslatorKeys.Name, name],
    [TranslatorKeys.IVTables, ivTables],
    [TranslatorKeys.SearchStrings, searchStrings],
    [TranslatorKeys.Attack, attack],
    [TranslatorKeys.Defense, defense],
    [TranslatorKeys.HP, hp],
    [TranslatorKeys.LVL, lvl],
    [TranslatorKeys.Water, water],
    [TranslatorKeys.Fire, fire],
    [TranslatorKeys.Dragon, dragon],
    [TranslatorKeys.Fairy, fairy],
    [TranslatorKeys.Ice, ice],
    [TranslatorKeys.Ground, ground],
    [TranslatorKeys.Rock, rock],
    [TranslatorKeys.Psychic, psychic],
    [TranslatorKeys.Fighting, fighting],
    [TranslatorKeys.Flying, flying],
    [TranslatorKeys.Ghost, ghost],
    [TranslatorKeys.Steel, steel],
    [TranslatorKeys.Dark, dark],
    [TranslatorKeys.Normal, normal],
    [TranslatorKeys.Grass, grass],
    [TranslatorKeys.Electric, electric],
    [TranslatorKeys.Poison, poison],
    [TranslatorKeys.Bug, bug],
    [TranslatorKeys.Unranked, unranked],
    [TranslatorKeys.Ranked, ranked],
    [TranslatorKeys.ATK, atk],
    [TranslatorKeys.DEF, def],
    [TranslatorKeys.SearchIVs, searchIVs],
    [TranslatorKeys.MaxLvl, maxLvl],
    [TranslatorKeys.Score, score],
    [TranslatorKeys.TrashString, trashString],
    [TranslatorKeys.Find, find],
    [TranslatorKeys.WildUnpowered, wildUnpowered],
    [TranslatorKeys.ThatResultIn, thatResultIn],
    [TranslatorKeys.FindTop, findTop],
    [TranslatorKeys.ForLeague, forLeague],
    [TranslatorKeys.UpToLevel, upToLevel],
    [TranslatorKeys.AllExcept, allExcept],
    [TranslatorKeys.Shadow, shadow],
    [TranslatorKeys.PokemonNotFound, pokemonNotFound],
    [TranslatorKeys.Moves, moves],
    [TranslatorKeys.FastMoves, fastMoves],
    [TranslatorKeys.ChargedMoves, chargedMoves],
    [TranslatorKeys.Stats, stats],
    [TranslatorKeys.Level, level],
    [TranslatorKeys.UnrankedPokemonForLeague, unrankedPokemonForLeague],
    [TranslatorKeys.RecommendedMovesUnavailable, recommendedMovesUnavailable],
    [TranslatorKeys.RecommendedMoves, recommendedMoves],
    [TranslatorKeys.Perfection, perfection],
    [TranslatorKeys.Config, config],
    [TranslatorKeys.Peaks, peaks],
    [TranslatorKeys.As, as],
    [TranslatorKeys.Current, current],
    [TranslatorKeys.Best, best],
    [TranslatorKeys.GameLanguage, gameLanguage],
    [TranslatorKeys.Menu, menu],
    [TranslatorKeys.Theme, theme],
    [TranslatorKeys.LightTheme, lightTheme],
    [TranslatorKeys.DarkTheme, darkTheme],
    [TranslatorKeys.SystemDefault, systemDefault],
    [TranslatorKeys.RecommendedMovesInfo1, recommendedMovesInfo1],
    [TranslatorKeys.RecommendedMovesInfo2, recommendedMovesInfo2],
    [TranslatorKeys.targetAttackStatStageChange, targetAttack],
    [TranslatorKeys.targetDefenseStatStageChange, targetDefense],
    [TranslatorKeys.attackerAttackStatStageChange, ownAttack],
    [TranslatorKeys.attackerDefenseStatStageChange, ownDefense],
    [TranslatorKeys.Lower, lower],
    [TranslatorKeys.Increase, increase],
    [TranslatorKeys.STAB, stab],
    [TranslatorKeys.Special, special],
    [TranslatorKeys.Has, has],
    [TranslatorKeys.Chance, chance],
    [TranslatorKeys.To, to],
    [TranslatorKeys.Stage, stage],
    [TranslatorKeys.Stages, stages],
    [TranslatorKeys.Elite, elite],
    [TranslatorKeys.Legacy, legacy],
    [TranslatorKeys.EliteMove, eliteMove],
    [TranslatorKeys.LegacyMove, legacyMove],
    [TranslatorKeys.BaseValue, baseValue]
]);

const translator = (key: TranslatorKeys, language: Language) => translations.get(key)?.get(language) ?? TranslatorKeys[key]?.toString() ?? key?.toString();

export default translator;