import { Language } from '../contexts/language-context';

export enum TranslatorKeys {
	Cities,
	Forests,
	Beaches,
	Mountains,
	Northen,
	Southern,
	LanguageSettings,
	VisualSettings,
	Official,
	Language,
	Events,
	Spawns,
	Rockets,
	Bonus,
	FeaturedIncenses,
	FeaturedLures,
	BestRaids1,
	BestRaids15,
	BestRaids2,
	BestRaids3,
	Eggs,
	Trash,
	Source,
	Types1,
	New,
	Types2,
	Search,
	Loading,
	SpecialBosses,
	FamilyTree,
	NoResults,
	Season,
	GridFiltering,
	ReadMore,
	NavigationData,
	DeleteNavigationData,
	Delete,
	ReadLess,
	Save,
	FeaturedSpawns,
	FeaturedEggs,
	FeaturedResearches,
	Featured1,
	Featured2,
	MegaPokemon,
	TrashHelp,
	Compute,
	Effective,
	CurrentRaid,
	Tier,
	Until,
	CPCap,
	RecommendedChargedSingle,
	RaidType,
	CountersWeak,
	RecommendedFast,
	CanDeal,
	Type,
	Using,
	Overall,
	Weak,
	Resistant,
	Nothing,
	And,
	RecommendedCharged,
	ShadowPokemon,
	XLPokemon,
	NotAvailableForRaids,
	Reached,
	LevelExceeded,
	TopKeyCountersIntro,
	Name,
	Show,
	RaidsIntro,
	Items,
	Counters,
	IVTables,
	WIP,
	SearchStrings,
	PickIVs,
	FastMove,
	ChargedMove,
	Attack,
	In,
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
	PokemonNotFound,
	Moves,
	Best1,
	Best2,
	FastMoves,
	ChargedMoves,
	Any,
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
	BaseValue,
	WeakAgainst,
	StrongAgainst,
	Focused1,
	Focused2,
	OrType,
	AllTiers,
}

const languageSettings = new Map<Language, string>([
	[Language.English, 'Language Settings'],
	[Language.Portuguese, 'Opções de Idioma'],
	[Language.Bosnian, 'Jezičke Postavke'],
]);

const save = new Map<Language, string>([
	[Language.English, 'Save'],
	[Language.Portuguese, 'Manter'],
	[Language.Bosnian, 'Čuvati'],
]);

const allTiers = new Map<Language, string>([
	[Language.English, 'All Tiers'],
	[Language.Portuguese, 'Todos os Níveis'],
	[Language.Bosnian, 'Svi Nivoi'],
]);

const tier = new Map<Language, string>([
	[Language.English, 'Tier'],
	[Language.Portuguese, 'Nível'],
	[Language.Bosnian, 'Nivo'],
]);

const trashHelp = new Map<Language, string>([
	[
		Language.English,
		"You can use this section to generate a search string that will find all Pokémon in your storage that aren't meta-relevant. You can define what's relevant or not based on the available filters below. Choose to discard all Pokémon that aren't ranked above rank X in one league and rank Y in another league. If you set a CP cap of Z, then Pokémon with a CP equal to or higher than that CP will never be deleted. This search string won't ever delete any favorite, tagged, legendary, ultra beast, mythical, mega-evolvable, or trade-to-evolve Pokémon. It will also target Pokémon that require low Attack IVs to be relevant, in case they don't have a low Attack IV – because trading couldn't make them relevant either. Please double-check if your in-game language matches the language selected in the website settings.",
	],
	[
		Language.Portuguese,
		'Podes usar esta secção para gerar uma string de pesquisa que encontre todos os teus Pokémon armazenados que não são meta-relevantes. Podes definir o que consideras relevante ou não com base nos filtros disponíveis abaixo. Escolhe descartar todos os Pokémon que não têm uma classificação acima da classificação X numa liga e da classificação Y noutra liga. Se estabeleceres um limite de PC de Z, então Pokémons com um PC igual ou superior a esse PC nunca serão eliminados. Esta string de pesquisa nunca eliminará qualquer Pokémon favorito, etiquetado, lendário, ultra criatura, mítico, mega-evoluível ou Pokémons com evolução gratuita após uma troca. Também irá apanhar Pokémons que requerem IVs de Ataque baixos para serem relevantes, no caso de não terem um IV de Ataque baixo - porque a troca também não os tornaria relevantes. Por favor, verifica se o idioma no teu jogo coincide com o idioma selecionado nas configurações do site.',
	],
	[
		Language.Bosnian,
		'Možeš koristiti ovu sekciju kako bi generisao/la niz pretrage koji će pronaći sve Pokémon-e u tvom skladištu koji nisu relevantni za trenutni meta. Možeš definirati šta smatraš relevantnim ili ne na osnovu dostupnih filtera ispod. Odluči da odbaciš sve Pokémon-e koji nisu rangirani iznad ranga X u jednoj ligi i ranga Y u drugoj ligi. Ako postaviš ograničenje za CP na vrijednost Z, tada Pokémon-i sa CP jednakim ili većim od tog CP-a nikada neće biti izbrisani. Ovaj niz pretrage nikada neće obrisati nijednog favorita, označenog, legendarnog, ultra bića, mitološkog, mega-evoluirajućeg ili Pokémon-a koji se razvija trampom. Također će ciljati Pokémon-e koji zahtijevaju niski Attack IV da bi bili relevantni, u slučaju da nemaju niski Attack IV - jer ih trampa također ne bi učinila relevantnim. Molim te da provjeriš da li je jezik u igri usklađen s odabranim jezikom u postavkama web stranice.',
	],
]);

const nothing = new Map<Language, string>([
	[Language.English, 'Nothing...'],
	[Language.Portuguese, 'Nada...'],
	[Language.Bosnian, 'Ništa...'],
]);

const weak = new Map<Language, string>([
	[Language.English, 'Weak to'],
	[Language.Portuguese, 'Vulnerável a'],
	[Language.Bosnian, 'Slab na'],
]);

const resistant = new Map<Language, string>([
	[Language.English, 'Resistant to'],
	[Language.Portuguese, 'Resistente a'],
	[Language.Bosnian, 'Otporna na'],
]);

const navigationData = new Map<Language, string>([
	[Language.English, 'Navigation Data'],
	[Language.Portuguese, 'Dados de Navegação'],
	[Language.Bosnian, 'Kolačiće i Keš'],
]);

const deleteNavigationData = new Map<Language, string>([
	[Language.English, 'Delete navigation data'],
	[Language.Portuguese, 'Apagar dados de navegação'],
	[Language.Bosnian, 'Izbriši kolačiće i keš'],
]);

const deleteTranslation = new Map<Language, string>([
	[Language.English, 'Delete'],
	[Language.Portuguese, 'Apagar'],
	[Language.Bosnian, 'Izbriši'],
]);

const noResults = new Map<Language, string>([
	[Language.English, 'No results.'],
	[Language.Portuguese, 'Sem resultados.'],
	[Language.Bosnian, 'Nema rezultata.'],
]);

const overall = new Map<Language, string>([
	[Language.English, 'Overall'],
	[Language.Portuguese, 'No geral'],
	[Language.Bosnian, 'Sveukupno'],
]);

const using = new Map<Language, string>([
	[Language.English, 'when using the Recommended Moves'],
	[Language.Portuguese, 'ao utilizar os Ataques Recomendados'],
	[Language.Bosnian, 'korištenjem Preporučeni Napadi'],
]);

const focused1 = new Map<Language, string>([
	[Language.English, 'By focusing on '],
	[Language.Portuguese, 'Focando no dano de tipo '],
	[Language.Bosnian, 'Fokusirajući se na štetu od tipa '],
]);

const focused2 = new Map<Language, string>([
	[Language.English, ' type damage'],
	[Language.Portuguese, ''],
	[Language.Bosnian, ''],
]);

const canDeal = new Map<Language, string>([
	[Language.English, 'it can deal'],
	[Language.Portuguese, 'pode atingir'],
	[Language.Bosnian, 'može nanijeti'],
]);

const raidType = new Map<Language, string>([
	[Language.English, 'Best Attackers of Type'],
	[Language.Portuguese, 'Melhores Atacantes do Tipo'],
	[Language.Bosnian, 'Najbolji Napadači po Tipu'],
]);

const recommendedCharged = new Map<Language, string>([
	[Language.English, 'are the recommended Charged Moves'],
	[Language.Portuguese, 'são os Ataques Carregados recomendados'],
	[Language.Bosnian, 'su preporučeni Posebni Napadi'],
]);

const recommendedChargedSingle = new Map<Language, string>([
	[Language.English, 'is the recommended Charged Move'],
	[Language.Portuguese, 'é o Ataque Carregado recomendado'],
	[Language.Bosnian, 'je preporučen Poseban Napad'],
]);

const recommendedFast = new Map<Language, string>([
	[Language.English, 'is the recommended Fast Move'],
	[Language.Portuguese, 'é o Ataque Ágil recomendado'],
	[Language.Bosnian, 'je preporučeni Brzi Napad'],
]);

const type = new Map<Language, string>([
	[Language.English, 'Type Filter'],
	[Language.Portuguese, 'Filtragem por Tipo'],
	[Language.Bosnian, 'Filtriranja po Tipu'],
]);

const and = new Map<Language, string>([
	[Language.English, 'and'],
	[Language.Portuguese, 'e'],
	[Language.Bosnian, 'i'],
]);

const any = new Map<Language, string>([
	[Language.English, 'Any type'],
	[Language.Portuguese, 'Qualquer tipo'],
	[Language.Bosnian, 'Bilo koji tip'],
]);

const orType = new Map<Language, string>([
	[Language.English, '...and Type'],
	[Language.Portuguese, '...e Tipo'],
	[Language.Bosnian, '...i Tipu'],
]);

const until = new Map<Language, string>([
	[Language.English, 'to'],
	[Language.Portuguese, 'a'],
	[Language.Bosnian, '-'],
]);

const official = new Map<Language, string>([
	[Language.English, 'Official'],
	[Language.Portuguese, 'Oficiais'],
	[Language.Bosnian, 'Službene'],
]);

const cpCap = new Map<Language, string>([
	[Language.English, ' at or above'],
	[Language.Portuguese, ' a partir de'],
	[Language.Bosnian, '-ove od'],
]);

const effective = new Map<Language, string>([
	[Language.English, ' (as the Effective type damage)'],
	[Language.Portuguese, ' (como sendo o tipo de dano Eficaz)'],
	[Language.Bosnian, ' (kao Efektivna vrsta oštećenja)'],
]);

const countersWeak = new Map<Language, string>([
	[Language.English, 'Counters'],
	[Language.Portuguese, 'Adversários Eficazes'],
	[Language.Bosnian, 'Efikasni Protivnici'],
]);

const cities = new Map<Language, string>([
	[Language.English, 'Cities'],
	[Language.Portuguese, 'Cidades'],
	[Language.Bosnian, 'Gradovi'],
]);

const newEvent = new Map<Language, string>([
	[Language.English, 'New!'],
	[Language.Portuguese, 'Novo!'],
	[Language.Bosnian, 'Novi!'],
]);

const forests = new Map<Language, string>([
	[Language.English, 'Forests'],
	[Language.Portuguese, 'Florestas'],
	[Language.Bosnian, 'Šume'],
]);

const mountains = new Map<Language, string>([
	[Language.English, 'Mountains'],
	[Language.Portuguese, 'Montanhas'],
	[Language.Bosnian, 'Planine'],
]);

const beaches = new Map<Language, string>([
	[Language.English, 'Beaches & Water'],
	[Language.Portuguese, 'Praias e Água'],
	[Language.Bosnian, 'Plaže i Voda'],
]);

const northen = new Map<Language, string>([
	[Language.English, 'Northen Hemisphere'],
	[Language.Portuguese, 'Hemisfério Norte'],
	[Language.Bosnian, 'Sjeverna Hemisfera'],
]);

const southern = new Map<Language, string>([
	[Language.English, 'Southern Hemisphere'],
	[Language.Portuguese, 'Hemisfério Sul'],
	[Language.Bosnian, 'Južna Hemisfera'],
]);

const gridFiltering = new Map<Language, string>([
	[Language.English, 'Grid Filtering'],
	[Language.Portuguese, 'Filtragem na Grelha'],
	[Language.Bosnian, 'Filtriranje Mreže'],
]);

const source = new Map<Language, string>([
	[Language.English, 'Pokémon Images'],
	[Language.Portuguese, 'Imagens'],
	[Language.Bosnian, 'Slike Pokémona'],
]);

const visualSettings = new Map<Language, string>([
	[Language.English, 'Visual Settings'],
	[Language.Portuguese, 'Opções Visuais'],
	[Language.Bosnian, 'Vizualna Podešavanja'],
]);

const language = new Map<Language, string>([
	[Language.English, 'Website Language'],
	[Language.Portuguese, 'Idioma do Site'],
	[Language.Bosnian, 'Jezik Web Stranice'],
]);

const gameLanguage = new Map<Language, string>([
	[Language.English, 'Game Language'],
	[Language.Portuguese, 'Idioma do Jogo'],
	[Language.Bosnian, 'Jezik Igre'],
]);

const search = new Map<Language, string>([
	[Language.English, 'Search…'],
	[Language.Portuguese, 'Pesquisar…'],
	[Language.Bosnian, 'Pretraži…'],
]);

const loading = new Map<Language, string>([
	[Language.English, 'Loading Pokémons…'],
	[Language.Portuguese, 'A carregar Pokémons…'],
	[Language.Bosnian, 'Učitavanje Pokémona…'],
]);

const featuredSpawns = new Map<Language, string>([
	[Language.English, 'Featured Wild Spawns'],
	[Language.Portuguese, 'Encontros na Natureza em Destaque'],
	[Language.Bosnian, 'Istaknuti Divlji Susreti'],
]);

const featured1 = new Map<Language, string>([
	[Language.English, 'Featured'],
	[Language.Portuguese, ''],
	[Language.Bosnian, 'Istaknuti'],
]);

const featured2 = new Map<Language, string>([
	[Language.English, ''],
	[Language.Portuguese, 'em Destaque'],
	[Language.Bosnian, ''],
]);

const featuredEggs = new Map<Language, string>([
	[Language.English, 'Featured Eggs'],
	[Language.Portuguese, 'Ovos em Destaque'],
	[Language.Bosnian, 'Istaknuta Jaja'],
]);

const featuredResearches = new Map<Language, string>([
	[Language.English, 'Featured Researches'],
	[Language.Portuguese, 'Pesquisas em Destaque'],
	[Language.Bosnian, 'Istaknuta Istraživanja'],
]);

const featuredIncenses = new Map<Language, string>([
	[Language.English, 'Incense Encounters'],
	[Language.Portuguese, 'Encontros de Incenso'],
	[Language.Bosnian, 'Susreti uz Tamjan'],
]);

const featuredLures = new Map<Language, string>([
	[Language.English, 'Encounters from Lure Modules'],
	[Language.Portuguese, 'Encontros de Módulos Atrair'],
	[Language.Bosnian, 'Susreti iz Mamaca'],
]);

const trash = new Map<Language, string>([
	[Language.English, 'Mass Delete Pokémons'],
	[Language.Portuguese, 'Eliminar Pokémons em Massa'],
	[Language.Bosnian, 'Masovno brisanje Pokemoni'],
]);

const name = new Map<Language, string>([
	[Language.English, 'Pokémon name'],
	[Language.Portuguese, 'Nome do Pokémon'],
	[Language.Bosnian, 'Ime Pokémona'],
]);

const ivTables = new Map<Language, string>([
	[Language.English, 'IV Tables'],
	[Language.Portuguese, 'Tabelas'],
	[Language.Bosnian, 'Tabele'],
]);

const searchStrings = new Map<Language, string>([
	[Language.English, 'Strings'],
	[Language.Portuguese, 'Pesquisas'],
	[Language.Bosnian, 'Istraživanja'],
]);

const attack = new Map<Language, string>([
	[Language.English, 'Attack'],
	[Language.Portuguese, 'Ataque'],
	[Language.Bosnian, 'Napad'],
]);

const defense = new Map<Language, string>([
	[Language.English, 'Defense'],
	[Language.Portuguese, 'Defesa'],
	[Language.Bosnian, 'Odbrana'],
]);

const hp = new Map<Language, string>([
	[Language.English, 'HP'],
	[Language.Portuguese, 'PS'],
	[Language.Bosnian, 'Život'],
]);

const lvl = new Map<Language, string>([
	[Language.English, 'LVL'],
	[Language.Portuguese, 'Nív.'],
	[Language.Bosnian, 'Niv.'],
]);

const level = new Map<Language, string>([
	[Language.English, 'Level'],
	[Language.Portuguese, 'Nível'],
	[Language.Bosnian, 'Nivo'],
]);

const water = new Map<Language, string>([
	[Language.English, 'Water'],
	[Language.Portuguese, 'Água'],
	[Language.Bosnian, 'Voda'],
]);

const fire = new Map<Language, string>([
	[Language.English, 'Fire'],
	[Language.Portuguese, 'Fogo'],
	[Language.Bosnian, 'Vatra'],
]);

const season = new Map<Language, string>([
	[Language.English, 'Season'],
	[Language.Portuguese, 'Temporada'],
	[Language.Bosnian, 'Sezona'],
]);

const dragon = new Map<Language, string>([
	[Language.English, 'Dragon'],
	[Language.Portuguese, 'Dragão'],
	[Language.Bosnian, 'Zmaj'],
]);

const fairy = new Map<Language, string>([
	[Language.English, 'Fairy'],
	[Language.Portuguese, 'Fada'],
	[Language.Bosnian, 'Vila'],
]);

const ice = new Map<Language, string>([
	[Language.English, 'Ice'],
	[Language.Portuguese, 'Gelo'],
	[Language.Bosnian, 'Led'],
]);

const ground = new Map<Language, string>([
	[Language.English, 'Ground'],
	[Language.Portuguese, 'Terrestre'],
	[Language.Bosnian, 'Zemljani'],
]);

const specialBosses = new Map<Language, string>([
	[Language.English, 'Special'],
	[Language.Portuguese, 'Especiais'],
	[Language.Bosnian, 'Specijalni'],
]);

const rock = new Map<Language, string>([
	[Language.English, 'Rock'],
	[Language.Portuguese, 'Pedra'],
	[Language.Bosnian, 'Kamen'],
]);

const currentRaid = new Map<Language, string>([
	[Language.English, 'Bosses'],
	[Language.Portuguese, 'Bosses'],
	[Language.Bosnian, 'Šefovi'],
]);

const psychic = new Map<Language, string>([
	[Language.English, 'Psychic'],
	[Language.Portuguese, 'Psíquico'],
	[Language.Bosnian, 'Psihički'],
]);

const fighting = new Map<Language, string>([
	[Language.English, 'Fighting'],
	[Language.Portuguese, 'Lutador'],
	[Language.Bosnian, 'Borac'],
]);

const events = new Map<Language, string>([
	[Language.English, 'Events'],
	[Language.Portuguese, 'Eventos'],
	[Language.Bosnian, 'Događaji'],
]);

const spawns = new Map<Language, string>([
	[Language.English, 'Spawns'],
	[Language.Portuguese, 'Encontros'],
	[Language.Bosnian, 'Pojave'],
]);

const rockets = new Map<Language, string>([
	[Language.English, 'Rocket Lineups'],
	[Language.Portuguese, 'Equipas Rocket'],
	[Language.Bosnian, 'Rocket Sastavi'],
]);

const eggs = new Map<Language, string>([
	[Language.English, 'Eggs'],
	[Language.Portuguese, 'Ovos'],
	[Language.Bosnian, 'Jaja'],
]);

const flying = new Map<Language, string>([
	[Language.English, 'Flying'],
	[Language.Portuguese, 'Voador'],
	[Language.Bosnian, 'Letjelica'],
]);

const ghost = new Map<Language, string>([
	[Language.English, 'Ghost'],
	[Language.Portuguese, 'Fantasma'],
	[Language.Bosnian, 'Duh'],
]);

const steel = new Map<Language, string>([
	[Language.English, 'Steel'],
	[Language.Portuguese, 'Aço'],
	[Language.Bosnian, 'Čelik'],
]);

const dark = new Map<Language, string>([
	[Language.English, 'Dark'],
	[Language.Portuguese, 'Sombrio'],
	[Language.Bosnian, 'Tamno'],
]);

const normal = new Map<Language, string>([
	[Language.English, 'Normal'],
	[Language.Portuguese, 'Normal'],
	[Language.Bosnian, 'Normalan'],
]);

const grass = new Map<Language, string>([
	[Language.English, 'Grass'],
	[Language.Portuguese, 'Planta'],
	[Language.Bosnian, 'Trava'],
]);

const electric = new Map<Language, string>([
	[Language.English, 'Electric'],
	[Language.Portuguese, 'Elétrico'],
	[Language.Bosnian, 'Električni'],
]);

const poison = new Map<Language, string>([
	[Language.English, 'Poison'],
	[Language.Portuguese, 'Venenoso'],
	[Language.Bosnian, 'Otrovan'],
]);

const bug = new Map<Language, string>([
	[Language.English, 'Bug'],
	[Language.Portuguese, 'Inseto'],
	[Language.Bosnian, 'Buba'],
]);

const unranked = new Map<Language, string>([
	[Language.English, 'Unranked'],
	[Language.Portuguese, 'Sem rank'],
	[Language.Bosnian, 'Bez ranga'],
]);

const ranked = new Map<Language, string>([
	[Language.English, 'Place'],
	[Language.Portuguese, 'Lugar'],
	[Language.Bosnian, 'Mjesto'],
]);

const atk = new Map<Language, string>([
	[Language.English, 'Atk'],
	[Language.Portuguese, 'Ata'],
	[Language.Bosnian, 'Nap'],
]);

const def = new Map<Language, string>([
	[Language.English, 'Def'],
	[Language.Portuguese, 'Def'],
	[Language.Bosnian, 'Obr'],
]);

const searchIVs = new Map<Language, string>([
	[Language.English, 'Search IVs'],
	[Language.Portuguese, 'Pesquisar IVs'],
	[Language.Bosnian, 'Pretraži IVs'],
]);

const maxLvl = new Map<Language, string>([
	[Language.English, 'Max Lvl'],
	[Language.Portuguese, 'Nível Máx'],
	[Language.Bosnian, 'Maks. Nivo'],
]);

const score = new Map<Language, string>([
	[Language.English, 'Score'],
	[Language.Portuguese, 'Pontos'],
	[Language.Bosnian, 'Bodovi'],
]);

const trashString = new Map<Language, string>([
	[Language.English, 'Inverse'],
	[Language.Portuguese, 'Inverso'],
	[Language.Bosnian, 'Obrnuto'],
]);

const find = new Map<Language, string>([
	[Language.English, 'Find'],
	[Language.Portuguese, 'Encontrar'],
	[Language.Bosnian, 'Nađi'],
]);

const wildUnpowered = new Map<Language, string>([
	[Language.English, 'wild caught and still unpowered'],
	[Language.Portuguese, 'selvagens e ainda não melhorados'],
	[Language.Bosnian, 'divlje uhvaćene i koje još nisu unaprijeđene'],
]);

const thatResultIn = new Map<Language, string>([
	[Language.English, 'that evolve to the'],
	[Language.Portuguese, 'que evoluem para'],
	[Language.Bosnian, 'koje evoluiraju do'],
]);

const findTop = new Map<Language, string>([
	[Language.English, 'top'],
	[Language.Portuguese, 'os top'],
	[Language.Bosnian, 'top'],
]);

const compute = new Map<Language, string>([
	[Language.English, 'Compute'],
	[Language.Portuguese, 'Calcular'],
	[Language.Bosnian, 'Računati'],
]);

const forLeague = new Map<Language, string>([
	[Language.English, 'for'],
	[Language.Portuguese, 'da'],
	[Language.Bosnian, 'za'],
]);

const upToLevel = new Map<Language, string>([
	[Language.English, 'up to level'],
	[Language.Portuguese, 'até nível'],
	[Language.Bosnian, 'do nivoa'],
]);

const allExcept = new Map<Language, string>([
	[Language.English, 'all except the'],
	[Language.Portuguese, 'todos exceto'],
	[Language.Bosnian, 'svih osim'],
]);

const pokemonNotFound = new Map<Language, string>([
	[Language.English, 'No Pokémon matched your search!'],
	[Language.Portuguese, 'Não foi encontrado nenhum Pokémon com base nos filtros aplicados!'],
	[Language.Bosnian, 'Ni jedan Pokémon nije pronađen na osnovu primijenjenih filtera!'],
]);

const moves = new Map<Language, string>([
	[Language.English, 'Moves'],
	[Language.Portuguese, 'Ataques'],
	[Language.Bosnian, 'Napadi'],
]);

const fastMoves = new Map<Language, string>([
	[Language.English, 'Fast Moves'],
	[Language.Portuguese, 'Ataques Ágeis'],
	[Language.Bosnian, 'Brzi Napadi'],
]);

const chargedMoves = new Map<Language, string>([
	[Language.English, 'Charged Moves'],
	[Language.Portuguese, 'Ataques Carregados'],
	[Language.Bosnian, 'Posebni Napadi'],
]);

const fastMove = new Map<Language, string>([
	[Language.English, 'Fast Move'],
	[Language.Portuguese, 'Ataque Ágil'],
	[Language.Bosnian, 'Brzi Napad'],
]);

const chargedMove = new Map<Language, string>([
	[Language.English, 'Charged Move'],
	[Language.Portuguese, 'Ataque Carregado'],
	[Language.Bosnian, 'Posebni Napad'],
]);

const stats = new Map<Language, string>([
	[Language.English, 'Stats'],
	[Language.Portuguese, 'Status'],
	[Language.Bosnian, 'Statistike'],
]);

const unrankedPokemonForLeague = new Map<Language, string>([
	[Language.English, ' is unranked for '],
	[Language.Portuguese, ' não está classificado na '],
	[Language.Bosnian, ' nije rangiran za '],
]);

const recommendedMovesUnavailable = new Map<Language, string>([
	[Language.English, 'Recommended moves unavailable:'],
	[Language.Portuguese, 'Os ataques recomendados não estão disponíveis:'],
	[Language.Bosnian, 'Preporučeni napadi nisu dostupni:'],
]);

const recommendedMoves = new Map<Language, string>([
	[Language.English, 'Recommended Moves'],
	[Language.Portuguese, 'Ataques Recomendados'],
	[Language.Bosnian, 'Preporučeni Napadi'],
]);

const perfection = new Map<Language, string>([
	[Language.English, 'PvP Perfection'],
	[Language.Portuguese, 'Perfeição PvP'],
	[Language.Bosnian, 'Perfekcija PvP'],
]);

const config = new Map<Language, string>([
	[Language.English, 'Config.'],
	[Language.Portuguese, 'Config.'],
	[Language.Bosnian, 'Konfig.'],
]);

const peaks = new Map<Language, string>([
	[Language.English, 'Peaks at'],
	[Language.Portuguese, 'Potencial'],
	[Language.Bosnian, 'Potencijal'],
]);

const as = new Map<Language, string>([
	[Language.English, 'as'],
	[Language.Portuguese, 'como'],
	[Language.Bosnian, 'kao'],
]);

const current = new Map<Language, string>([
	[Language.English, 'Current'],
	[Language.Portuguese, 'Atual'],
	[Language.Bosnian, 'Trenutna'],
]);

const best = new Map<Language, string>([
	[Language.English, 'Best'],
	[Language.Portuguese, 'Melhor'],
	[Language.Bosnian, 'Najbolja'],
]);

const menu = new Map<Language, string>([
	[Language.English, 'Menu'],
	[Language.Portuguese, 'Menu'],
	[Language.Bosnian, 'Meni'],
]);

const theme = new Map<Language, string>([
	[Language.English, 'Theme'],
	[Language.Portuguese, 'Tema'],
	[Language.Bosnian, 'Tema'],
]);

const lightTheme = new Map<Language, string>([
	[Language.English, 'Light'],
	[Language.Portuguese, 'Claro'],
	[Language.Bosnian, 'Svijetli'],
]);

const darkTheme = new Map<Language, string>([
	[Language.English, 'Dark'],
	[Language.Portuguese, 'Escuro'],
	[Language.Bosnian, 'Tamni'],
]);

const systemDefault = new Map<Language, string>([
	[Language.English, 'System'],
	[Language.Portuguese, 'Sistema'],
	[Language.Bosnian, 'Sistemski'],
]);

const recommendedMovesInfo1 = new Map<Language, string>([
	[Language.English, 'The most common Fast Move and Charged Moves combination for'],
	[Language.Portuguese, 'A combinação de Ataque Ágil e Ataques Carregados mais frequentemente utilizados no'],
	[Language.Bosnian, 'Najčešća kombinacija Brzog Napada i Posebni Napadi za'],
]);

const recommendedMovesInfo2 = new Map<Language, string>([
	[Language.English, 'in'],
	[Language.Portuguese, 'para a'],
	[Language.Bosnian, 'za'],
]);

const targetAttack = new Map<Language, string>([
	[Language.English, "enemy's Attack Damage by"],
	[Language.Portuguese, 'o Valor de Ataque do inimigo em'],
	[Language.Bosnian, 'Vrednost Napada neprijatelja za'],
]);

const targetDefense = new Map<Language, string>([
	[Language.English, "enemy's Defense by"],
	[Language.Portuguese, 'a Defesa do inimigo em'],
	[Language.Bosnian, 'Odbranu neprijatelja za'],
]);

const ownAttack = new Map<Language, string>([
	[Language.English, "the user's Attack Damage by"],
	[Language.Portuguese, 'o próprio Valor de Ataque em'],
	[Language.Bosnian, 'vlastitu Vrednost Napada za'],
]);

const ownDefense = new Map<Language, string>([
	[Language.English, "the user's Defense by"],
	[Language.Portuguese, 'a própria Defesa em'],
	[Language.Bosnian, 'vlastitu Odbranu za'],
]);

const baseValue = new Map<Language, string>([
	[Language.English, 'of the base value'],
	[Language.Portuguese, 'do valor base'],
	[Language.Bosnian, 'osnovne vrijednosti'],
]);

const lower = new Map<Language, string>([
	[Language.English, 'Lower'],
	[Language.Portuguese, 'Reduzir'],
	[Language.Bosnian, 'Smanjiti'],
]);

const readMore = new Map<Language, string>([
	[Language.English, 'Read more'],
	[Language.Portuguese, 'Ler mais'],
	[Language.Bosnian, 'Pročitaj više'],
]);

const readLess = new Map<Language, string>([
	[Language.English, 'Read less'],
	[Language.Portuguese, 'Ler menos'],
	[Language.Bosnian, 'Pročitaj manje'],
]);

const increase = new Map<Language, string>([
	[Language.English, 'Increase'],
	[Language.Portuguese, 'Aumentar'],
	[Language.Bosnian, 'Poveća'],
]);

const stab = new Map<Language, string>([
	[Language.English, "the attack type matches this Pokémon's type, so it has a 20% extra damage bonus!"],
	[
		Language.Portuguese,
		'o tipo do ataque é compatível com o tipo deste Pokémon, por isso, tem um bónus de 20% de dano extra!',
	],
	[Language.Bosnian, 'vrsta napada se podudara s vrstom ovog Pokémona, pa ima dodatni bonus od 20% na štetu!'],
]);

const special = new Map<Language, string>([
	[Language.English, 'Special'],
	[Language.Portuguese, 'Bónus'],
	[Language.Bosnian, 'Bonus'],
]);

const has = new Map<Language, string>([
	[Language.English, 'has a'],
	[Language.Portuguese, 'tem'],
	[Language.Bosnian, 'ima'],
]);

const chance = new Map<Language, string>([
	[Language.English, 'chance'],
	[Language.Portuguese, 'de chances'],
	[Language.Bosnian, 'šanse'],
]);

const to = new Map<Language, string>([
	[Language.English, 'to'],
	[Language.Portuguese, 'de'],
	[Language.Bosnian, 'da'],
]);

const stage = new Map<Language, string>([
	[Language.English, 'stage'],
	[Language.Portuguese, 'nível'],
	[Language.Bosnian, 'nivo'],
]);

const stages = new Map<Language, string>([
	[Language.English, 'stages'],
	[Language.Portuguese, 'níveis'],
	[Language.Bosnian, 'nivoi'],
]);

const elite = new Map<Language, string>([
	[
		Language.English,
		'This is an Elite Move for this Pokémon. It can only be learned during special in-game events or using an',
	],
	[
		Language.Portuguese,
		'Este é um Ataque Elite para este Pokémon. Pode ser aprendido apenas durante eventos especiais no jogo ou utilizando um',
	],
	[
		Language.Bosnian,
		'Ovo je Elitni Napad za ovog Pokémona. Može se naučiti samo tokom posebnih događanja unutar igre ili korištenjem',
	],
]);

const legacy = new Map<Language, string>([
	[Language.English, 'This is a Legacy Move for this Pokémon. It is no longer able to learn it by any means.'],
	[
		Language.Portuguese,
		'Este é um Ataque Descontinuado para este Pokémon. Já não é possível aprendê-lo de forma alguma.',
	],
	[
		Language.Bosnian,
		'Ovo je Napad koji je obustavljen za ovog Pokémona. Više nije moguće naučiti ga ni na koji način.',
	],
]);

const eliteMove = new Map<Language, string>([
	[Language.English, 'Elite'],
	[Language.Portuguese, 'Elite'],
	[Language.Bosnian, 'Elitni'],
]);

const legacyMove = new Map<Language, string>([
	[Language.English, 'Legacy'],
	[Language.Portuguese, 'Descontinuado'],
	[Language.Bosnian, 'Obustavljen'],
]);

const counters = new Map<Language, string>([
	[Language.English, 'Counters'],
	[Language.Portuguese, 'Confrontos'],
	[Language.Bosnian, 'Sukobi'],
]);

const weakAgainst = new Map<Language, string>([
	[Language.English, 'is weak against'],
	[Language.Portuguese, 'é fraco contra'],
	[Language.Bosnian, 'je slab protiv'],
]);

const strongAgainst = new Map<Language, string>([
	[Language.English, 'is strong against'],
	[Language.Portuguese, 'é forte contra'],
	[Language.Bosnian, 'je jak protiv'],
]);

const inKey = new Map<Language, string>([
	[Language.English, 'in'],
	[Language.Portuguese, 'em'],
	[Language.Bosnian, 'za'],
]);

const types1 = new Map<Language, string>([
	[Language.English, ''],
	[Language.Portuguese, 'tipos'],
	[Language.Bosnian, 'tipovima'],
]);

const types2 = new Map<Language, string>([
	[Language.English, 'types'],
	[Language.Portuguese, ''],
	[Language.Bosnian, ''],
]);

const notAvailableForRaids = new Map<Language, string>([
	[Language.English, 'Page not available for'],
	[Language.Portuguese, 'Página não disponível para'],
	[Language.Bosnian, 'Stranica nije dostupna za'],
]);

const pickIVs = new Map<Language, string>([
	[Language.English, "Insert your Pokémon's IVs:"],
	[Language.Portuguese, 'Insere os IVs do teu Pokémon:'],
	[Language.Bosnian, 'Unesite IV vrijednosti vašeg Pokémona:'],
]);

const wip = new Map<Language, string>([
	[Language.English, 'Work in progress. Stay tuned!'],
	[Language.Portuguese, 'Indisponível. Tenta mais tarde!'],
	[Language.Bosnian, 'Rad u tijeku. Ostanite u tijeku!'],
]);

const megaPokemon = new Map<Language, string>([
	[Language.English, 'Mega Pokémon'],
	[Language.Portuguese, 'Pokémons Mega'],
	[Language.Bosnian, 'Mega Pokémona'],
]);

const shadowPokemon = new Map<Language, string>([
	[Language.English, 'Shadow Pokémon'],
	[Language.Portuguese, 'Pokémons Sombrosos'],
	[Language.Bosnian, 'Sjenoviti Pokémona'],
]);

const XLPokemon = new Map<Language, string>([
	[Language.English, 'XL Pokémon'],
	[Language.Portuguese, 'Pokémons XL'],
	[Language.Bosnian, 'XL Pokémona'],
]);

const show = new Map<Language, string>([
	[Language.English, 'Show'],
	[Language.Portuguese, 'Mostrar'],
	[Language.Bosnian, 'Prikaži'],
]);

const items = new Map<Language, string>([
	[Language.English, 'items'],
	[Language.Portuguese, 'itens'],
	[Language.Bosnian, 'zapisa'],
]);

const raidsIntro = new Map<Language, string>([
	[
		Language.English,
		'time is limited - which means Damage per Second (DPS) is crucial! Here are your best options for defeating ',
	],
	[
		Language.Portuguese,
		'o tempo é escasso - o que significa que o Dano por Segundo (DPS) é tudo! Aqui estão as tuas melhores apostas para derrotar o ',
	],
	[
		Language.Bosnian,
		'vrijeme je ograničeno - što znači da je Šteta po Sekundi (DPS) ključna! Evo tvojih najboljih opcija za poraz ',
	],
]);

const topKeyCountersIntro = new Map<Language, string>([
	[Language.English, 'Here are 5 key wins and losses against meta-relevant Pokémon when using '],
	[Language.Portuguese, 'Aqui estão 5 vitórias e derrotas chave contra Pokémons meta-relevantes ao usar o '],
	[Language.Bosnian, 'Evo 5 ključnih pobjeda i poraza protiv relevantnih Pokémona u meti kada koristite '],
]);

const reached = new Map<Language, string>([
	[Language.English, 'Reached!'],
	[Language.Portuguese, 'Atingido!'],
	[Language.Bosnian, 'Dosegnuto!'],
]);

const levelExceeded = new Map<Language, string>([
	[Language.English, 'LVL. exceeded'],
	[Language.Portuguese, 'Nív. excedido'],
	[Language.Bosnian, 'Niv. premašen'],
]);

const familyTree = new Map<Language, string>([
	[Language.English, 'Family Tree'],
	[Language.Portuguese, 'Pesquisar Família'],
	[Language.Bosnian, 'Porodično Stablo'],
]);

const bonus = new Map<Language, string>([
	[Language.English, 'Event Bonuses'],
	[Language.Portuguese, 'Bónus do Evento'],
	[Language.Bosnian, 'Bonusi za događaje'],
]);

const bestRaids1 = new Map<Language, string>([
	[Language.English, 'Best'],
	[Language.Portuguese, 'Melhores Atacantes'],
	[Language.Bosnian, 'Najbolji Napadači'],
]);

const bestRaids15 = new Map<Language, string>([
	[Language.English, ''],
	[Language.Portuguese, 'do Tipo'],
	[Language.Bosnian, ''],
]);

const bestRaids2 = new Map<Language, string>([
	[Language.English, ''],
	[Language.Portuguese, 'para'],
	[Language.Bosnian, 'za'],
]);

const bestRaids3 = new Map<Language, string>([
	[Language.English, 'Attackers'],
	[Language.Portuguese, ''],
	[Language.Bosnian, ''],
]);

const best1 = new Map<Language, string>([
	[Language.English, 'Best'],
	[Language.Portuguese, 'Melhores Pokémons para a'],
	[Language.Bosnian, 'Najbolji Pokemoni za'],
]);

const best2 = new Map<Language, string>([
	[Language.English, 'Pokémons'],
	[Language.Portuguese, ''],
	[Language.Bosnian, ''],
]);

const translations = new Map<TranslatorKeys, Map<Language, string>>([
	[TranslatorKeys.Cities, cities],
	[TranslatorKeys.Forests, forests],
	[TranslatorKeys.Mountains, mountains],
	[TranslatorKeys.Trash, trash],
	[TranslatorKeys.Beaches, beaches],
	[TranslatorKeys.SpecialBosses, specialBosses],
	[TranslatorKeys.Northen, northen],
	[TranslatorKeys.Southern, southern],
	[TranslatorKeys.Source, source],
	[TranslatorKeys.GridFiltering, gridFiltering],
	[TranslatorKeys.And, and],
	[TranslatorKeys.New, newEvent],
	[TranslatorKeys.FeaturedSpawns, featuredSpawns],
	[TranslatorKeys.FeaturedEggs, featuredEggs],
	[TranslatorKeys.FeaturedResearches, featuredResearches],
	[TranslatorKeys.Featured1, featured1],
	[TranslatorKeys.Featured2, featured2],
	[TranslatorKeys.Delete, deleteTranslation],
	[TranslatorKeys.CountersWeak, countersWeak],
	[TranslatorKeys.TrashHelp, trashHelp],
	[TranslatorKeys.Any, any],
	[TranslatorKeys.FamilyTree, familyTree],
	[TranslatorKeys.LanguageSettings, languageSettings],
	[TranslatorKeys.RaidsIntro, raidsIntro],
	[TranslatorKeys.PickIVs, pickIVs],
	[TranslatorKeys.VisualSettings, visualSettings],
	[TranslatorKeys.Official, official],
	[TranslatorKeys.RecommendedCharged, recommendedCharged],
	[TranslatorKeys.RecommendedChargedSingle, recommendedChargedSingle],
	[TranslatorKeys.Language, language],
	[TranslatorKeys.Search, search],
	[TranslatorKeys.Loading, loading],
	[TranslatorKeys.Name, name],
	[TranslatorKeys.IVTables, ivTables],
	[TranslatorKeys.Effective, effective],
	[TranslatorKeys.SearchStrings, searchStrings],
	[TranslatorKeys.Attack, attack],
	[TranslatorKeys.RecommendedFast, recommendedFast],
	[TranslatorKeys.Defense, defense],
	[TranslatorKeys.HP, hp],
	[TranslatorKeys.LVL, lvl],
	[TranslatorKeys.NoResults, noResults],
	[TranslatorKeys.Weak, weak],
	[TranslatorKeys.Resistant, resistant],
	[TranslatorKeys.Nothing, nothing],
	[TranslatorKeys.DeleteNavigationData, deleteNavigationData],
	[TranslatorKeys.NavigationData, navigationData],
	[TranslatorKeys.Save, save],
	[TranslatorKeys.Water, water],
	[TranslatorKeys.Overall, overall],
	[TranslatorKeys.Fire, fire],
	[TranslatorKeys.Dragon, dragon],
	[TranslatorKeys.XLPokemon, XLPokemon],
	[TranslatorKeys.Fairy, fairy],
	[TranslatorKeys.Ice, ice],
	[TranslatorKeys.Ground, ground],
	[TranslatorKeys.Rock, rock],
	[TranslatorKeys.RaidType, raidType],
	[TranslatorKeys.Type, type],
	[TranslatorKeys.OrType, orType],
	[TranslatorKeys.Tier, tier],
	[TranslatorKeys.Psychic, psychic],
	[TranslatorKeys.Fighting, fighting],
	[TranslatorKeys.Flying, flying],
	[TranslatorKeys.Ghost, ghost],
	[TranslatorKeys.Compute, compute],
	[TranslatorKeys.Steel, steel],
	[TranslatorKeys.CanDeal, canDeal],
	[TranslatorKeys.Dark, dark],
	[TranslatorKeys.Normal, normal],
	[TranslatorKeys.Grass, grass],
	[TranslatorKeys.Electric, electric],
	[TranslatorKeys.Poison, poison],
	[TranslatorKeys.Bug, bug],
	[TranslatorKeys.Unranked, unranked],
	[TranslatorKeys.Using, using],
	[TranslatorKeys.Ranked, ranked],
	[TranslatorKeys.ATK, atk],
	[TranslatorKeys.FeaturedIncenses, featuredIncenses],
	[TranslatorKeys.FeaturedLures, featuredLures],
	[TranslatorKeys.DEF, def],
	[TranslatorKeys.SearchIVs, searchIVs],
	[TranslatorKeys.MaxLvl, maxLvl],
	[TranslatorKeys.Score, score],
	[TranslatorKeys.TrashString, trashString],
	[TranslatorKeys.Find, find],
	[TranslatorKeys.WildUnpowered, wildUnpowered],
	[TranslatorKeys.ReadMore, readMore],
	[TranslatorKeys.ReadLess, readLess],
	[TranslatorKeys.ThatResultIn, thatResultIn],
	[TranslatorKeys.FindTop, findTop],
	[TranslatorKeys.ForLeague, forLeague],
	[TranslatorKeys.UpToLevel, upToLevel],
	[TranslatorKeys.AllExcept, allExcept],
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
	[TranslatorKeys.CPCap, cpCap],
	[TranslatorKeys.Menu, menu],
	[TranslatorKeys.Theme, theme],
	[TranslatorKeys.LightTheme, lightTheme],
	[TranslatorKeys.DarkTheme, darkTheme],
	[TranslatorKeys.SystemDefault, systemDefault],
	[TranslatorKeys.Until, until],
	[TranslatorKeys.Season, season],
	[TranslatorKeys.Focused1, focused1],
	[TranslatorKeys.Focused2, focused2],
	[TranslatorKeys.RecommendedMovesInfo1, recommendedMovesInfo1],
	[TranslatorKeys.RecommendedMovesInfo2, recommendedMovesInfo2],
	[TranslatorKeys.targetAttackStatStageChange, targetAttack],
	[TranslatorKeys.targetDefenseStatStageChange, targetDefense],
	[TranslatorKeys.attackerAttackStatStageChange, ownAttack],
	[TranslatorKeys.attackerDefenseStatStageChange, ownDefense],
	[TranslatorKeys.CurrentRaid, currentRaid],
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
	[TranslatorKeys.BaseValue, baseValue],
	[TranslatorKeys.Counters, counters],
	[TranslatorKeys.WeakAgainst, weakAgainst],
	[TranslatorKeys.StrongAgainst, strongAgainst],
	[TranslatorKeys.In, inKey],
	[TranslatorKeys.Types1, types1],
	[TranslatorKeys.Events, events],
	[TranslatorKeys.Spawns, spawns],
	[TranslatorKeys.Rockets, rockets],
	[TranslatorKeys.Eggs, eggs],
	[TranslatorKeys.Types2, types2],
	[TranslatorKeys.FastMove, fastMove],
	[TranslatorKeys.ChargedMove, chargedMove],
	[TranslatorKeys.NotAvailableForRaids, notAvailableForRaids],
	[TranslatorKeys.WIP, wip],
	[TranslatorKeys.MegaPokemon, megaPokemon],
	[TranslatorKeys.AllTiers, allTiers],
	[TranslatorKeys.ShadowPokemon, shadowPokemon],
	[TranslatorKeys.Show, show],
	[TranslatorKeys.Items, items],
	[TranslatorKeys.TopKeyCountersIntro, topKeyCountersIntro],
	[TranslatorKeys.Reached, reached],
	[TranslatorKeys.LevelExceeded, levelExceeded],
	[TranslatorKeys.Bonus, bonus],
	[TranslatorKeys.BestRaids1, bestRaids1],
	[TranslatorKeys.BestRaids15, bestRaids15],
	[TranslatorKeys.BestRaids2, bestRaids2],
	[TranslatorKeys.BestRaids3, bestRaids3],
	[TranslatorKeys.Best1, best1],
	[TranslatorKeys.Best2, best2],
]);

const translator = (key: TranslatorKeys, language: Language) =>
	translations.get(key)?.get(language) ?? TranslatorKeys[key]?.toString() ?? key?.toString();

export default translator;
