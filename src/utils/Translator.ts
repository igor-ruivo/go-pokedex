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
    CP,
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
    STA,
    SearchIVs,
    MaxLvl,
    IVs,
    Score,
    TrashString,
    Find,
    WildUnpowered,
    ThatResultIn,
    FindTop,
    ForLeague,
    Great,
    Master,
    GreatLeague,
    UltraLeague,
    MasterLeague,
    UpToLevel,
    AllExcept,
    AttackSearch,
    DefenseSearch,
    HPSearch,
    CPSearch,
    Shadow,
    PokemonNotFound,
    Moves,
    FastMoves,
    ChargedMoves
}

const settings = new Map<Language, string>([
    [Language.English, "Settings"],
    [Language.Portuguese, "Opções"]
]);

const language = new Map<Language, string>([
    [Language.English, "Language"],
    [Language.Portuguese, "Idioma"]
]);

const search = new Map<Language, string>([
    [Language.English, "Search…"],
    [Language.Portuguese, "Pesquisar…"]
]);

const loading = new Map<Language, string>([
    [Language.English, "Loading Pokémons…"],
    [Language.Portuguese, "A carregar Pokémons…"]
]);

const name = new Map<Language, string>([
    [Language.English, "Pokémon name"],
    [Language.Portuguese, "Nome do Pokémon"]
]);

const ivTables = new Map<Language, string>([
    [Language.English, "IV Tables"],
    [Language.Portuguese, "Tabelas"]
]);

const searchStrings = new Map<Language, string>([
    [Language.English, "Search Strings"],
    [Language.Portuguese, "Pesquisas"]
]);

const attack = new Map<Language, string>([
    [Language.English, "Attack"],
    [Language.Portuguese, "Ataque"]
]);

const defense = new Map<Language, string>([
    [Language.English, "Defense"],
    [Language.Portuguese, "Defesa"]
]);

const hp = new Map<Language, string>([
    [Language.English, "HP"],
    [Language.Portuguese, "PS"]
]);

const cp = new Map<Language, string>([
    [Language.English, "CP"],
    [Language.Portuguese, "PC"]
]);

const lvl = new Map<Language, string>([
    [Language.English, "LVL"],
    [Language.Portuguese, "Nível"]
]);

const water = new Map<Language, string>([
    [Language.English, "Water"],
    [Language.Portuguese, "Água"]
]);

const fire = new Map<Language, string>([
    [Language.English, "Fire"],
    [Language.Portuguese, "Fogo"]
]);

const dragon = new Map<Language, string>([
    [Language.English, "Dragon"],
    [Language.Portuguese, "Dragão"]
]);

const fairy = new Map<Language, string>([
    [Language.English, "Fairy"],
    [Language.Portuguese, "Fada"]
]);

const ice = new Map<Language, string>([
    [Language.English, "Ice"],
    [Language.Portuguese, "Gelo"]
]);

const ground = new Map<Language, string>([
    [Language.English, "Ground"],
    [Language.Portuguese, "Terrestre"]
]);

const rock = new Map<Language, string>([
    [Language.English, "Rock"],
    [Language.Portuguese, "Pedra"]
]);

const psychic = new Map<Language, string>([
    [Language.English, "Psychic"],
    [Language.Portuguese, "Psíquico"]
]);

const fighting = new Map<Language, string>([
    [Language.English, "Fighting"],
    [Language.Portuguese, "Lutador"]
]);

const flying = new Map<Language, string>([
    [Language.English, "Flying"],
    [Language.Portuguese, "Voador"]
]);

const ghost = new Map<Language, string>([
    [Language.English, "Ghost"],
    [Language.Portuguese, "Fantasma"]
]);

const steel = new Map<Language, string>([
    [Language.English, "Steel"],
    [Language.Portuguese, "Aço"]
]);

const dark = new Map<Language, string>([
    [Language.English, "Dark"],
    [Language.Portuguese, "Sombrio"]
]);

const normal = new Map<Language, string>([
    [Language.English, "Normal"],
    [Language.Portuguese, "Normal"]
]);

const grass = new Map<Language, string>([
    [Language.English, "Grass"],
    [Language.Portuguese, "Planta"]
]);

const electric = new Map<Language, string>([
    [Language.English, "Electric"],
    [Language.Portuguese, "Elétrico"]
]);

const poison = new Map<Language, string>([
    [Language.English, "Poison"],
    [Language.Portuguese, "Venenoso"]
]);

const bug = new Map<Language, string>([
    [Language.English, "Bug"],
    [Language.Portuguese, "Inseto"]
]);

const unranked = new Map<Language, string>([
    [Language.English, "Unranked"],
    [Language.Portuguese, "Não classificado"]
]);

const ranked = new Map<Language, string>([
    [Language.English, "Ranked"],
    [Language.Portuguese, "Lugar"]
]);

const atk = new Map<Language, string>([
    [Language.English, "Atk"],
    [Language.Portuguese, "Ata"]
]);

const sta = new Map<Language, string>([
    [Language.English, "Sta"],
    [Language.Portuguese, "PS"]
]);

const searchIVs = new Map<Language, string>([
    [Language.English, "Search IVs"],
    [Language.Portuguese, "Pesquisar"]
]);

const maxLvl = new Map<Language, string>([
    [Language.English, "Max Lvl"],
    [Language.Portuguese, "Nível Máx"]
]);

const ivs = new Map<Language, string>([
    [Language.English, "IVs"],
    [Language.Portuguese, "Atributos"]
]);

const score = new Map<Language, string>([
    [Language.English, "Score"],
    [Language.Portuguese, "Pontos"]
]);

const trashString = new Map<Language, string>([
    [Language.English, "Inverse"],
    [Language.Portuguese, "Inverso"]
]);

const find = new Map<Language, string>([
    [Language.English, "Find"],
    [Language.Portuguese, "Encontrar"]
]);

const wildUnpowered = new Map<Language, string>([
    [Language.English, "wild caught and still unpowered"],
    [Language.Portuguese, "selvagens e ainda não evoluídos"]
]);

const thatResultIn = new Map<Language, string>([
    [Language.English, "that evolve to the"],
    [Language.Portuguese, "que evoluem para"]
]);

const findTop = new Map<Language, string>([
    [Language.English, "top"],
    [Language.Portuguese, "os top"]
]);

const forLeague = new Map<Language, string>([
    [Language.English, "for"],
    [Language.Portuguese, "da"]
]);

const great = new Map<Language, string>([
    [Language.English, "Great"],
    [Language.Portuguese, "Grande"]
]);

const master = new Map<Language, string>([
    [Language.English, "Master"],
    [Language.Portuguese, "Mestra"]
]);

const greatLeague = new Map<Language, string>([
    [Language.English, "Great League"],
    [Language.Portuguese, "Grande Liga"]
]);

const ultraLeague = new Map<Language, string>([
    [Language.English, "Ultra League"],
    [Language.Portuguese, "Ultra-liga"]
]);

const masterLeague = new Map<Language, string>([
    [Language.English, "Master League"],
    [Language.Portuguese, "Liga Mestra"]
]);

const upToLevel = new Map<Language, string>([
    [Language.English, "up to level"],
    [Language.Portuguese, "até nível"]
]);

const allExcept = new Map<Language, string>([
    [Language.English, "all except the"],
    [Language.Portuguese, "todos exceto"]
]);

const attackSearch = new Map<Language, string>([
    [Language.English, "attack"],
    [Language.Portuguese, "ataque"]
]);

const defenseSearch = new Map<Language, string>([
    [Language.English, "defense"],
    [Language.Portuguese, "defesa"]
]);

const hpSearch = new Map<Language, string>([
    [Language.English, "hp"],
    [Language.Portuguese, "ps"]
]);

const cpSearch = new Map<Language, string>([
    [Language.English, "cp"],
    [Language.Portuguese, "pc"]
]);

const shadow = new Map<Language, string>([
    [Language.English, "Shadow"],
    [Language.Portuguese, "Sombroso"]
]);

const pokemonNotFound = new Map<Language, string>([
    [Language.English, "No Pokémon matched your search!"],
    [Language.Portuguese, "Não foi encontrado nenhum Pokémon com base nos filtros aplicados!"]
]);

const moves = new Map<Language, string>([
    [Language.English, "Moves"],
    [Language.Portuguese, "Ataques"]
]);

const fastMoves = new Map<Language, string>([
    [Language.English, "Fast Moves"],
    [Language.Portuguese, "Ataques Ágeis"]
]);

const chargedMoves = new Map<Language, string>([
    [Language.English, "Charged Moves"],
    [Language.Portuguese, "Ataques Carregados"]
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
    [TranslatorKeys.CP, cp],
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
    [TranslatorKeys.STA, sta],
    [TranslatorKeys.SearchIVs, searchIVs],
    [TranslatorKeys.MaxLvl, maxLvl],
    [TranslatorKeys.IVs, ivs],
    [TranslatorKeys.Score, score],
    [TranslatorKeys.TrashString, trashString],
    [TranslatorKeys.Find, find],
    [TranslatorKeys.WildUnpowered, wildUnpowered],
    [TranslatorKeys.ThatResultIn, thatResultIn],
    [TranslatorKeys.FindTop, findTop],
    [TranslatorKeys.ForLeague, forLeague],
    [TranslatorKeys.Great, great],
    [TranslatorKeys.Master, master],
    [TranslatorKeys.GreatLeague, greatLeague],
    [TranslatorKeys.UltraLeague, ultraLeague],
    [TranslatorKeys.MasterLeague, masterLeague],
    [TranslatorKeys.UpToLevel, upToLevel],
    [TranslatorKeys.AllExcept, allExcept],
    [TranslatorKeys.AttackSearch, attackSearch],
    [TranslatorKeys.DefenseSearch, defenseSearch],
    [TranslatorKeys.HPSearch, hpSearch],
    [TranslatorKeys.CPSearch, cpSearch],
    [TranslatorKeys.Shadow, shadow],
    [TranslatorKeys.PokemonNotFound, pokemonNotFound],
    [TranslatorKeys.Moves, moves],
    [TranslatorKeys.FastMoves, fastMoves],
    [TranslatorKeys.ChargedMoves, chargedMoves]
]);

const translator = (key: TranslatorKeys, language: Language) => translations.get(key)?.get(language) ?? TranslatorKeys[key].toString();

export default translator;