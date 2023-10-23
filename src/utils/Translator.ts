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
    Bug
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
    [TranslatorKeys.Bug, bug]
]);

const translator = (key: TranslatorKeys, language: Language) => translations.get(key)?.get(language) ?? TranslatorKeys[key].toString();

export default translator;