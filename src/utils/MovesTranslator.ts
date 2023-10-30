import { Language } from "../contexts/language-context";

export enum MovesTranslatorKeys {
    //normal
    TACKLE,
    SCRATCH,
    SKULL_BASH,
    STRUGGLE,
    QUICK_ATTACK,
    BODY_SLAM,
    //TODO: HYPER_FANG,
    HYPER_BEAM,
    WRAP,
    //TODO: PRESENT,

    //grass
    VINE_WHIP,
    RAZOR_LEAF,
    FRENZY_PLANT,
    PETAL_BLIZZARD,
    SEED_BOMB,
    POWER_WHIP,
    SOLAR_BEAM,
    GRASS_KNOT,

    //fire
    EMBER,
    FIRE_FANG,
    FLAMETHROWER,
    FLAME_CHARGE,
    FLAME_BURST,
    FIRE_PUNCH,
    FIRE_SPIN,
    FIRE_BLAST,
    OVERHEAT,
    BLAST_BURN,
    
    //poison
    SLUDGE_BOMB,
    POISON_STING,
    POISON_JAB,
    //TODO: ACID,
    GUNK_SHOT,
    POISON_FANG,
    SLUDGE_WAVE,
    ACID_SPRAY,

    //dragon
    DRAGON_BREATH,
    DRAGON_CLAW,
    TWISTER,
    DRAGON_TAIL,

    //flying
    WING_ATTACK,
    AIR_SLASH,
    AERIAL_ACE,
    AIR_CUTTER,
    //TODO: GUST
    BRAVE_BIRD,
    HURRICANE,
    FEATHER_DANCE,
    PECK,
    DRILL_PECK,
    SKY_ATTACK,

    //water
    BUBBLE,
    AQUA_JET,
    AQUA_TAIL,
    WATER_PULSE,
    WATER_GUN,
    HYDRO_CANNON,
    HYDRO_PUMP,
    SURF,

    //dark
    BITE,
    CRUNCH,
    DARK_PULSE,

    //steel
    FLASH_CANNON,
    STEEL_WING,

    //ice
    ICE_BEAM,

    //bug
    BUG_BITE,
    STRUGGLE_BUG,
    BUG_BUZZ,
    //TODO: SIGNAL_BEAM
    INFESTATION,
    X_SCISSOR,
    FELL_STINGER,

    //psychic
    CONFUSION,
    PSYCHIC,

    //ground
    DRILL_RUN,
    DIG,
    MUD_SHOT,
    SAND_TOMB,

    //ghost
    SHADOW_BALL,

    //electric
    THUNDER_SHOCK,
    DISCHARGE,
    THUNDER,
    THUNDERBOLT,
    WILD_CHARGE,
    THUNDER_PUNCH,
    SPARK,
    VOLT_SWITCH,

    //fairy
    DISARMING_VOICE,
    CHARM,

    //fighting
    BRICK_BREAK,

    //rock
    ROCK_SLIDE,
    ROCK_TOMB
}

const vineWhip = new Map<Language, string>([
    [Language.English, "Vine Whip"],
    [Language.Portuguese, "Chicote de Vinha"]
]);

const razorLeaf = new Map<Language, string>([
    [Language.English, "Razor Leaf"],
    [Language.Portuguese, "Folha Navalha"]
]);

const franzyPlant = new Map<Language, string>([
    [Language.English, "Frenzy Plant"],
    [Language.Portuguese, "Planta Mortal"]
]);

const sludgeBomb = new Map<Language, string>([
    [Language.English, "Sludge Bomb"],
    [Language.Portuguese, "Bomba de Lodo"]
]);

const petalBlizzard = new Map<Language, string>([
    [Language.English, "Petal Blizzard"],
    [Language.Portuguese, "Nevasca de Pétalas"]
]);

const seedBomb = new Map<Language, string>([
    [Language.English, "Seed Bomb"],
    [Language.Portuguese, "Bomba de Sementes"]
]);

const powerWhip = new Map<Language, string>([
    [Language.English, "Power Whip"],
    [Language.Portuguese, "Chicote Poderoso"]
]);

const solarBeam = new Map<Language, string>([
    [Language.English, "Solar Beam"],
    [Language.Portuguese, "Raio Solar"]
]);

const tackle = new Map<Language, string>([
    [Language.English, "Tackle"],
    [Language.Portuguese, "Investida"]
]);

const scratch = new Map<Language, string>([
    [Language.English, "Scratch"],
    [Language.Portuguese, "Arranhão"]
]);

const ember = new Map<Language, string>([
    [Language.English, "Ember"],
    [Language.Portuguese, "Brasa"]
]);

const flamethrower = new Map<Language, string>([
    [Language.English, "Flamethrower"],
    [Language.Portuguese, "Lança-chamas"]
]);

const flameCharge = new Map<Language, string>([
    [Language.English, "Flame Charge"],
    [Language.Portuguese, "Ataque de Chamas"]
]);

const flameBurst = new Map<Language, string>([
    [Language.English, "Flame Burst"],
    [Language.Portuguese, "Rajada de Chamas"]
]);

const fireFang = new Map<Language, string>([
    [Language.English, "Fire Fang"],
    [Language.Portuguese, "Presas de Fogo"]
]);

const firePunch = new Map<Language, string>([
    [Language.English, "Fire Punch"],
    [Language.Portuguese, "Soco de Fogo"]
]);

const fireSpin = new Map<Language, string>([
    [Language.English, "Fire Spin"],
    [Language.Portuguese, "Chama Furacão"]
]);

const fireBlast = new Map<Language, string>([
    [Language.English, "Fire Blast"],
    [Language.Portuguese, "Rajada de Fogo"]
]);

const overheat = new Map<Language, string>([
    [Language.English, "Overheat"],
    [Language.Portuguese, "Superaquecimento"]
]);

const blastBurn = new Map<Language, string>([
    [Language.English, "Blast Burn"],
    [Language.Portuguese, "Queimadura Explosiva"]
]);

const dragonBreath = new Map<Language, string>([
    [Language.English, "Dragon Breath"],
    [Language.Portuguese, "Sopro do Dragão"]
]);

const dragonClaw = new Map<Language, string>([
    [Language.English, "Dragon Claw"],
    [Language.Portuguese, "Garra de Dragão"]
]);

const wingAttack = new Map<Language, string>([
    [Language.English, "Wing Attack"],
    [Language.Portuguese, "Ataque de Asa"]
]);

const airSlash = new Map<Language, string>([
    [Language.English, "Air Slash"],
    [Language.Portuguese, "Golpe de Ar"]
]);

const bubble = new Map<Language, string>([
    [Language.English, "Bubble"],
    [Language.Portuguese, "Bolha"]
]);

const aquaJet = new Map<Language, string>([
    [Language.English, "Aqua Jet"],
    [Language.Portuguese, "Aqua Jato"]
]);

const aquaTail = new Map<Language, string>([
    [Language.English, "Aqua Tail"],
    [Language.Portuguese, "Aqua Cauda"]
]);

const waterPulse = new Map<Language, string>([
    [Language.English, "Water Pulse"],
    [Language.Portuguese, "Pulso d'Água"]
]);

const bite = new Map<Language, string>([
    [Language.English, "Bite"],
    [Language.Portuguese, "Mordida"]
]);

const waterGun = new Map<Language, string>([
    [Language.English, "Water Gun"],
    [Language.Portuguese, "Revólver d'Água"]
]);

const flashCannon = new Map<Language, string>([
    [Language.English, "Flash Cannon"],
    [Language.Portuguese, "Canhão de Flash"]
]);

const hydroCannon = new Map<Language, string>([
    [Language.English, "Hydro Cannon"],
    [Language.Portuguese, "Hidro Canhão"]
]);

const hydroPump = new Map<Language, string>([
    [Language.English, "Hydro Pump"],
    [Language.Portuguese, "Jato d'Água"]
]);

const iceBeam = new Map<Language, string>([
    [Language.English, "Ice Beam"],
    [Language.Portuguese, "Raio Congelante"]
]);

const skullBash = new Map<Language, string>([
    [Language.English, "Skull Bash"],
    [Language.Portuguese, "Quebra-crânio"]
]);

const bugBite = new Map<Language, string>([
    [Language.English, "Bug Bite"],
    [Language.Portuguese, "Picada"]
]);

const struggle = new Map<Language, string>([
    [Language.English, "Struggle"],
    [Language.Portuguese, "Insistência"]
]);

const confusion = new Map<Language, string>([
    [Language.English, "Confusion"],
    [Language.Portuguese, "Confusão"]
]);

const struggleBug = new Map<Language, string>([
    [Language.English, "Struggle Bug"],
    [Language.Portuguese, "Ira de Inseto"]
]);

const bugBuzz = new Map<Language, string>([
    [Language.English, "Bug Buzz"],
    [Language.Portuguese, "Zumbido de Inseto"]
]);

const psychic = new Map<Language, string>([
    [Language.English, "Psychic"],
    [Language.Portuguese, "Psíquico"]
]);

const poisonSting = new Map<Language, string>([
    [Language.English, "Poison Sting"],
    [Language.Portuguese, "Ferrão Venenoso"]
]);

const infestation = new Map<Language, string>([
    [Language.English, "Infestation"],
    [Language.Portuguese, "Infestação"]
]);

const poisonJab = new Map<Language, string>([
    [Language.English, "Poison Jab"],
    [Language.Portuguese, "Golpe Envenenado"]
]);

const aerialAce = new Map<Language, string>([
    [Language.English, "Aerial Ace"],
    [Language.Portuguese, "Ás dos Ares"]
]);

const xScissor = new Map<Language, string>([
    [Language.English, "X-Scissor"],
    [Language.Portuguese, "Tesoura X"]
]);

const fellStinger = new Map<Language, string>([
    [Language.English, "Fell Stinger"],
    [Language.Portuguese, "Ferrão Letal"]
]);

const drillRun = new Map<Language, string>([
    [Language.English, "Drill Run"],
    [Language.Portuguese, "Furação"]
]);

const quickAttack = new Map<Language, string>([
    [Language.English, "Quick Attack"],
    [Language.Portuguese, "Ataque Rápido"]
]);

const airCutter = new Map<Language, string>([
    [Language.English, "Air Cutter"],
    [Language.Portuguese, "Cortador de Ar"]
]);

const twister = new Map<Language, string>([
    [Language.English, "Twister"],
    [Language.Portuguese, "Twister"]
]);

const steelWind = new Map<Language, string>([
    [Language.English, "Steel Wing"],
    [Language.Portuguese, "Asa de Aço"]
]);

const braveBird = new Map<Language, string>([
    [Language.English, "Brave Bird"],
    [Language.Portuguese, "Pássaro Bravo"]
]);

const hurricane = new Map<Language, string>([
    [Language.English, "Hurricane"],
    [Language.Portuguese, "Furacão"]
]);

const featherDance = new Map<Language, string>([
    [Language.English, "Feather Dance"],
    [Language.Portuguese, "Dança das Penas"]
]);

const bodySlam = new Map<Language, string>([
    [Language.English, "Body Slam"],
    [Language.Portuguese, "Pancada Corporal"]
]);

const dig = new Map<Language, string>([
    [Language.English, "Dig"],
    [Language.Portuguese, "Cavar"]
]);

const crunch = new Map<Language, string>([
    [Language.English, "Crunch"],
    [Language.Portuguese, "Mastigada"]
]);

const shadowBall = new Map<Language, string>([
    [Language.English, "Shadow Ball"],
    [Language.Portuguese, "Bola Sombria"]
]);

const hyperBeam = new Map<Language, string>([
    [Language.English, "Hyper Beam"],
    [Language.Portuguese, "Hiper-raio"]
]);

const peck = new Map<Language, string>([
    [Language.English, "Peck"],
    [Language.Portuguese, "Bicada"]
]);

const drillPeck = new Map<Language, string>([
    [Language.English, "Drill Peck"],
    [Language.Portuguese, "Bico Broca"]
]);

const skyAttack = new Map<Language, string>([
    [Language.English, "Sky Attack"],
    [Language.Portuguese, "Ataque do Céu"]
]);

const gunkShot = new Map<Language, string>([
    [Language.English, "Gunk Shot"],
    [Language.Portuguese, "Tiro de Sujeira"]
]);

const poisonFang = new Map<Language, string>([
    [Language.English, "Poison Fang"],
    [Language.Portuguese, "Presa Venenosa"]
]);

const wrap = new Map<Language, string>([
    [Language.English, "Wrap"],
    [Language.Portuguese, "Embrulho"]
]);

const dragonTail = new Map<Language, string>([
    [Language.English, "Dragon Tail"],
    [Language.Portuguese, "Cauda do Dragão"]
]);

const darkPulse = new Map<Language, string>([
    [Language.English, "Dark Pulse"],
    [Language.Portuguese, "Pulso Sombrio"]
]);

const sludgeWave = new Map<Language, string>([
    [Language.English, "Sludge Wave"],
    [Language.Portuguese, "Onda de Lama"]
]);

const acidSpray = new Map<Language, string>([
    [Language.English, "Acid Spray"],
    [Language.Portuguese, "Spray Ácido"]
]);

const thunderShock = new Map<Language, string>([
    [Language.English, "Thunder Shock"],
    [Language.Portuguese, "Trovoada de Choques"]
]);

const discharge = new Map<Language, string>([
    [Language.English, "Discharge"],
    [Language.Portuguese, "Descarga"]
]);

const surf = new Map<Language, string>([
    [Language.English, "Surf"],
    [Language.Portuguese, "Surfar"]
]);

const thunder = new Map<Language, string>([
    [Language.English, "Thunder"],
    [Language.Portuguese, "Trovão"]
]);

const thunderbolt = new Map<Language, string>([
    [Language.English, "Thunderbolt"],
    [Language.Portuguese, "Relâmpago"]
]);

const wildCharge = new Map<Language, string>([
    [Language.English, "Wild Charge"],
    [Language.Portuguese, "Ataque Selvagem"]
]);

const thunderPunch = new Map<Language, string>([
    [Language.English, "Thunder Punch"],
    [Language.Portuguese, "Soco Trovoada"]
]);

const disarmingVoice = new Map<Language, string>([
    [Language.English, "Disarming Voice"],
    [Language.Portuguese, "Voz Desarmante"]
]);

const spark = new Map<Language, string>([
    [Language.English, "Spark"],
    [Language.Portuguese, "Faísca"]
]);

const voltSwitch = new Map<Language, string>([
    [Language.English, "Volt Switch"],
    [Language.Portuguese, "Troca Elétrica"]
]);

const charm = new Map<Language, string>([
    [Language.English, "Charm"],
    [Language.Portuguese, "Encantar"]
]);

const brickBreak = new Map<Language, string>([
    [Language.English, "Brick Break"],
    [Language.Portuguese, "Quebra-telha"]
]);

const grassKnot = new Map<Language, string>([
    [Language.English, "Grass Knot"],
    [Language.Portuguese, "Nó de Grama"]
]);

const mudShot = new Map<Language, string>([
    [Language.English, "Mud Shot"],
    [Language.Portuguese, "Tiro de Lama"]
]);

const sandTomb = new Map<Language, string>([
    [Language.English, "Sand Tomb"],
    [Language.Portuguese, "Fosso de Areia"]
]);

const rockSlide = new Map<Language, string>([
    [Language.English, "Rock Slide"],
    [Language.Portuguese, "Deslize de Pedras"]
]);

const rockTomb = new Map<Language, string>([
    [Language.English, "Rock Tomb"],
    [Language.Portuguese, "Tumba de Rochas"]
]);

const translations = new Map<MovesTranslatorKeys, Map<Language, string>>([
    [MovesTranslatorKeys.VINE_WHIP, vineWhip],
    [MovesTranslatorKeys.FRENZY_PLANT, franzyPlant],
    [MovesTranslatorKeys.SLUDGE_BOMB, sludgeBomb],
    [MovesTranslatorKeys.PETAL_BLIZZARD, petalBlizzard],
    [MovesTranslatorKeys.SEED_BOMB, seedBomb],
    [MovesTranslatorKeys.POWER_WHIP, powerWhip],
    [MovesTranslatorKeys.RAZOR_LEAF, razorLeaf],
    [MovesTranslatorKeys.SOLAR_BEAM, solarBeam],
    [MovesTranslatorKeys.TACKLE, tackle],
    [MovesTranslatorKeys.SCRATCH, scratch],
    [MovesTranslatorKeys.EMBER, ember],
    [MovesTranslatorKeys.FLAMETHROWER, flamethrower],
    [MovesTranslatorKeys.FLAME_CHARGE, flameCharge],
    [MovesTranslatorKeys.FLAME_BURST, flameBurst],
    [MovesTranslatorKeys.FIRE_FANG, fireFang],
    [MovesTranslatorKeys.FIRE_PUNCH, firePunch],
    [MovesTranslatorKeys.FIRE_SPIN, fireSpin],
    [MovesTranslatorKeys.FIRE_BLAST, fireBlast],
    [MovesTranslatorKeys.OVERHEAT, overheat],
    [MovesTranslatorKeys.BLAST_BURN, blastBurn],
    [MovesTranslatorKeys.DRAGON_BREATH, dragonBreath],
    [MovesTranslatorKeys.DRAGON_CLAW, dragonClaw],
    [MovesTranslatorKeys.WING_ATTACK, wingAttack],
    [MovesTranslatorKeys.AIR_SLASH, airSlash],
    [MovesTranslatorKeys.BUBBLE, bubble],
    [MovesTranslatorKeys.AQUA_JET, aquaJet],
    [MovesTranslatorKeys.AQUA_TAIL, aquaTail],
    [MovesTranslatorKeys.WATER_PULSE, waterPulse],
    [MovesTranslatorKeys.BITE, bite],
    [MovesTranslatorKeys.WATER_GUN, waterGun],
    [MovesTranslatorKeys.FLASH_CANNON, flashCannon],
    [MovesTranslatorKeys.HYDRO_CANNON, hydroCannon],
    [MovesTranslatorKeys.HYDRO_PUMP, hydroPump],
    [MovesTranslatorKeys.ICE_BEAM, iceBeam],
    [MovesTranslatorKeys.SKULL_BASH, skullBash],
    [MovesTranslatorKeys.BUG_BITE, bugBite],
    [MovesTranslatorKeys.STRUGGLE, struggle],
    [MovesTranslatorKeys.CONFUSION, confusion],
    [MovesTranslatorKeys.STRUGGLE_BUG, struggleBug],
    [MovesTranslatorKeys.BUG_BUZZ, bugBuzz],
    [MovesTranslatorKeys.PSYCHIC, psychic],
    [MovesTranslatorKeys.POISON_STING, poisonSting],
    [MovesTranslatorKeys.INFESTATION, infestation],
    [MovesTranslatorKeys.POISON_JAB, poisonJab],
    [MovesTranslatorKeys.AERIAL_ACE, aerialAce],
    [MovesTranslatorKeys.X_SCISSOR, xScissor],
    [MovesTranslatorKeys.FELL_STINGER, fellStinger],
    [MovesTranslatorKeys.DRILL_RUN, drillRun],
    [MovesTranslatorKeys.QUICK_ATTACK, quickAttack],
    [MovesTranslatorKeys.AIR_CUTTER, airCutter],
    [MovesTranslatorKeys.TWISTER, twister],
    [MovesTranslatorKeys.STEEL_WING, steelWind],
    [MovesTranslatorKeys.BRAVE_BIRD, braveBird],
    [MovesTranslatorKeys.HURRICANE, hurricane],
    [MovesTranslatorKeys.FEATHER_DANCE, featherDance],
    [MovesTranslatorKeys.BODY_SLAM, bodySlam],
    [MovesTranslatorKeys.DIG, dig],
    [MovesTranslatorKeys.CRUNCH, crunch],
    [MovesTranslatorKeys.SHADOW_BALL, shadowBall],
    [MovesTranslatorKeys.HYPER_BEAM, hyperBeam],
    [MovesTranslatorKeys.PECK, peck],
    [MovesTranslatorKeys.DRILL_PECK, drillPeck],
    [MovesTranslatorKeys.SKY_ATTACK, skyAttack],
    [MovesTranslatorKeys.GUNK_SHOT, gunkShot],
    [MovesTranslatorKeys.POISON_FANG, poisonFang],
    [MovesTranslatorKeys.WRAP, wrap],
    [MovesTranslatorKeys.DRAGON_TAIL, dragonTail],
    [MovesTranslatorKeys.DARK_PULSE, darkPulse],
    [MovesTranslatorKeys.SLUDGE_WAVE, sludgeWave],
    [MovesTranslatorKeys.ACID_SPRAY, acidSpray],
    [MovesTranslatorKeys.THUNDER_SHOCK, thunderShock],
    [MovesTranslatorKeys.DISCHARGE, discharge],
    [MovesTranslatorKeys.SURF, surf],
    [MovesTranslatorKeys.THUNDER, thunder],
    [MovesTranslatorKeys.THUNDERBOLT, thunderbolt],
    [MovesTranslatorKeys.WILD_CHARGE, wildCharge],
    [MovesTranslatorKeys.THUNDER_PUNCH, thunderPunch],
    [MovesTranslatorKeys.DISARMING_VOICE, disarmingVoice],
    [MovesTranslatorKeys.SPARK, spark],
    [MovesTranslatorKeys.VOLT_SWITCH, voltSwitch],
    [MovesTranslatorKeys.CHARM, charm],
    [MovesTranslatorKeys.BRICK_BREAK, brickBreak],
    [MovesTranslatorKeys.GRASS_KNOT, grassKnot],
    [MovesTranslatorKeys.MUD_SHOT, mudShot],
    [MovesTranslatorKeys.SAND_TOMB, sandTomb],
    [MovesTranslatorKeys.ROCK_SLIDE, rockSlide],
    [MovesTranslatorKeys.ROCK_TOMB, rockTomb],
]);

const movesTranslator = (key: MovesTranslatorKeys, language: Language) => translations.get(key)?.get(language) ?? (MovesTranslatorKeys[key] ? MovesTranslatorKeys[key].toString() : key?.toString());

export default movesTranslator;