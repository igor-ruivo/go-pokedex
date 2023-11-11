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
    HORN_ATTACK,
    STOMP,
    POUND,
    SWIFT,
    CUT,
    VICE_GRIP,
    TRANSFORM,
    LAST_RESORT,
    YAWN,
    //TODO: LOCK_ON,
    TAKE_DOWN,
    TRI_ATTACK,
    //TODO: GIGA_IMPACT,
    //TODO: TECHNO_BLAST_NORMAL,
    //TODO: BOOMBURST,
    //TODO: WEATHER_BALL_NORMAL,

    //grass
    VINE_WHIP,
    RAZOR_LEAF,
    FRENZY_PLANT,
    PETAL_BLIZZARD,
    SEED_BOMB,
    POWER_WHIP,
    SOLAR_BEAM,
    GRASS_KNOT,
    BULLET_SEED,
    MAGICAL_LEAF,
    LEAF_BLADE,
    TRAILBLAZE,
    LEAF_TORNADO,
    ENERGY_BALL,
    HIDDEN_POWER_GRASS,
    //TODO: LEAFAGE,
    LEAF_STORM,
    SEED_FLARE,

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
    WEATHER_BALL_FIRE,
    HEAT_WAVE,
    //TODO: FLAME_WHEEL,
    INCINERATE,
    BLAZE_KICK,
    HIDDEN_POWER_FIRE,
    //TODO: TECHNO_BLAST_BURN,
    V_CREATE,
    SACRED_FIRE,
    MYSTICAL_FIRE,
    MAGMA_STORM,
    //TODO: FUSION_FLARE,
    
    //poison
    SLUDGE_BOMB,
    POISON_STING,
    POISON_JAB,
    //TODO: ACID,
    GUNK_SHOT,
    POISON_FANG,
    SLUDGE_WAVE,
    ACID_SPRAY,
    CROSS_POISON,
    SLUDGE,
    HIDDEN_POWER_POISON,

    //dragon
    DRAGON_BREATH,
    DRAGON_CLAW,
    TWISTER,
    DRAGON_TAIL,
    BREAKING_SWIPE,
    DRAGON_PULSE,
    DRACO_METEOR,
    OUTRAGE,
    HIDDEN_POWER_DRAGON,

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
    HIDDEN_POWER_FLYING,
    //TODO: ACROBATICS,
    //TODO: AEROBLAST,
    //TODO: FLY,
    //TODO: DRAGON_ASCENT,
    //TODO: OBLIVION_WING,

    //water
    BUBBLE,
    AQUA_JET,
    AQUA_TAIL,
    WATER_PULSE,
    WATER_GUN,
    HYDRO_CANNON,
    HYDRO_PUMP,
    SURF,
    BUBBLE_BEAM,
    LIQUIDATION,
    SCALD,
    WEATHER_BALL_WATER,
    RAZOR_SHELL,
    //TODO: CRABHAMMER,
    WATERFALL,
    //TODO: OCTAZOOKA,
    HIDDEN_POWER_WATER,
    SPLASH,
    BRINE,
    //TODO: WATER_SHURIKEN,
    MUDDY_WATER,
    //TODO: TECHNO_BLAST_DOUSE,
    //TODO: ORIGIN_PULSE,

    //dark
    BITE,
    CRUNCH,
    DARK_PULSE,
    NIGHT_SLASH,
    FEINT_ATTACK,
    SUCKER_PUNCH,
    FOUL_PLAY,
    PAYBACK,
    SNARL,
    BRUTAL_SWING,
    HIDDEN_POWER_DARK,
    OBSTRUCT,

    //steel
    FLASH_CANNON,
    STEEL_WING,
    METAL_CLAW,
    GYRO_BALL,
    IRON_TAIL,
    METEOR_MASH,
    IRON_HEAD,
    BULLET_PUNCH,
    HEAVY_SLAM,
    //TODO: MAGNET_BOMB,
    //TODO: MIRROR_SHOT,
    HIDDEN_POWER_STEEL,
    //TODO: DOOM_DESIRE,
    //TODO: DOUBLE_IRON_BASH,

    //ice
    ICE_BEAM,
    POWDER_SNOW,
    BLIZZARD,
    ICE_PUNCH,
    WEATHER_BALL_ICE,
    ICE_SHARD,
    AURORA_BEAM,
    ICY_WIND,
    FROST_BREATH,
    AVALANCHE,
    TRIPLE_AXEL,
    HIDDEN_POWER_ICE,
    //TODO: ICE_FANG,
    //TODO: TECHNO_BLAST_CHILL,
    ICICLE_SPEAR,
    //TODO: GLACIATE,

    //bug
    BUG_BITE,
    STRUGGLE_BUG,
    BUG_BUZZ,
    //TODO: SIGNAL_BEAM
    INFESTATION,
    X_SCISSOR,
    FELL_STINGER,
    MEGAHORN,
    FURY_CUTTER,
    //TODO: SILVER_WIND,
    HIDDEN_POWER_BUG,
    //TODO: LUNGE,

    //psychic
    CONFUSION,
    PSYCHIC,
    ZEN_HEADBUTT,
    PSYSHOCK,
    PSYBEAM,
    SYNCHRONOISE,
    PSYCHIC_FANGS,
    PSYCHO_CUT,
    FUTURE_SIGHT,
    EXTRASENSORY,
    HIDDEN_POWER_PSYCHIC,
    //TODO: PSYSTRIKE,
    MIRROR_COAT,
    //TODO: PSYCHO_BOOST,
    //TODO: MIST_BALL,
    //TODO: LUSTER_PURGE,

    //ground
    DRILL_RUN,
    DIG,
    MUD_SHOT,
    SAND_TOMB,
    BULLDOZE,
    EARTHQUAKE,
    SCORCHING_SANDS,
    EARTH_POWER,
    MUD_SLAP,
    MUD_BOMB,
    HIGH_HORSEPOWER,
    //TODO: BONE_CLUB,
    HIDDEN_POWER_GROUND,
    //TODO: PRECIPICE_BLADES,

    //ghost
    SHADOW_BALL,
    SHADOW_CLAW,
    OMINOUS_WIND,
    HEX,
    LICK,
    ASTONISH,
    NIGHT_SHADE,
    SHADOW_PUNCH,
    //TODO: SHADOW_BONE,
    HIDDEN_POWER_GHOST,
    SHADOW_SNEAK,
    //TODO: POLTERGEIST,
    //TODO: SHADOW_FORCE,

    //electric
    THUNDER_SHOCK,
    DISCHARGE,
    THUNDER,
    THUNDERBOLT,
    WILD_CHARGE,
    THUNDER_PUNCH,
    SPARK,
    VOLT_SWITCH,
    CHARGE_BEAM,
    //TODO: THUNDER_FANG,
    ZAP_CANNON,
    HIDDEN_POWER_ELECTRIC,
    //TODO: TECHNO_BLAST_SHOCK,
    //TODO: FUSION_BOLT,
    //TODO: PARABOLIC_CHARGE,

    //fairy
    DISARMING_VOICE,
    CHARM,
    MOONBLAST,
    FAIRY_WIND,
    DAZZLING_GLEAM,
    PLAY_ROUGH,
    //TODO: DRAINING_KISS,
    GEOMANCY,

    //fighting
    BRICK_BREAK,
    ROCK_SMASH,
    SUPER_POWER,
    DOUBLE_KICK,
    CLOSE_COMBAT,
    CROSS_CHOP,
    KARATE_CHOP,
    LOW_SWEEP,
    COUNTER,
    LOW_KICK,
    DYNAMIC_PUNCH,
    SUBMISSION,
    POWER_UP_PUNCH,
    FOCUS_BLAST,
    HIDDEN_POWER_FIGHTING,
    //TODO: SACRED_SWORD,
    //TODO: FLYING_PRESS,
    AURA_SPHERE,
    //TODO: DRAIN_PUNCH,

    //rock
    ROCK_SLIDE,
    ROCK_TOMB,
    STONE_EDGE,
    SMACK_DOWN,
    ROCK_WRECKER,
    ANCIENT_POWER,
    POWER_GEM,
    ROCK_THROW,
    ROCK_BLAST,
    //TODO: ROLLOUT,
    HIDDEN_POWER_ROCK,
    METEOR_BEAM,
    WEATHER_BALL_ROCK,
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

const metalClaw = new Map<Language, string>([
    [Language.English, "Metal Claw"],
    [Language.Portuguese, "Garra de Metal"]
]);

const powderSnow = new Map<Language, string>([
    [Language.English, "Powder Snow"],
    [Language.Portuguese, "Neve em Pó"]
]);

const blizzard = new Map<Language, string>([
    [Language.English, "Blizzard"],
    [Language.Portuguese, "Nevasca"]
]);

const gyroBall = new Map<Language, string>([
    [Language.English, "Gyro Ball"],
    [Language.Portuguese, "Girobola"]
]);

const nightSlash = new Map<Language, string>([
    [Language.English, "Night Slash"],
    [Language.Portuguese, "Talho Noturno"]
]);

const bulldoze = new Map<Language, string>([
    [Language.English, "Bulldoze"],
    [Language.Portuguese, "Tremor"]
]);

const earthquake = new Map<Language, string>([
    [Language.English, "Earthquake"],
    [Language.Portuguese, "Terremoto"]
]);

const scorchingSands = new Map<Language, string>([
    [Language.English, "Scorching Sands"],
    [Language.Portuguese, "Areias Ardentes"]
]);

const shadowClaw = new Map<Language, string>([
    [Language.English, "Shadow Claw"],
    [Language.Portuguese, "Garra Sombria"]
]);

const icePunch = new Map<Language, string>([
    [Language.English, "Ice Punch"],
    [Language.Portuguese, "Soco de Gelo"]
]);

const stoneEdge = new Map<Language, string>([
    [Language.English, "Stone Edge"],
    [Language.Portuguese, "Gume de Pedra"]
]);

const earthPower = new Map<Language, string>([
    [Language.English, "Earth Power"],
    [Language.Portuguese, "Poder da Terra"]
]);

const stomp = new Map<Language, string>([
    [Language.English, "Stomp"],
    [Language.Portuguese, "Pisotear"]
]);

const mudSlap = new Map<Language, string>([
    [Language.English, "Mud Slap"],
    [Language.Portuguese, "Tapa de Lama"]
]);

const rockSmash = new Map<Language, string>([
    [Language.English, "Rock Smash"],
    [Language.Portuguese, "Esmagamento de Pedras"]
]);

const megahorn = new Map<Language, string>([
    [Language.English, "Megahorn"],
    [Language.Portuguese, "Megachifre"]
]);

const breakingSwipe = new Map<Language, string>([
    [Language.English, "Breaking Swipe"],
    [Language.Portuguese, "Golpe Deslizante"]
]);

const smackDown = new Map<Language, string>([
    [Language.English, "Smack Down"],
    [Language.Portuguese, "Derrubada"]
]);

const superPower = new Map<Language, string>([
    [Language.English, "Superpower"],
    [Language.Portuguese, "Superpoder"]
]);

const rockWrecker = new Map<Language, string>([
    [Language.English, "Rock Wrecker"],
    [Language.Portuguese, "Demolidor de Pedras"]
]);

const furyCutter = new Map<Language, string>([
    [Language.English, "Fury Cutter"],
    [Language.Portuguese, "Cortador de Fúria"]
]);

const ironTail = new Map<Language, string>([
    [Language.English, "Iron Tail"],
    [Language.Portuguese, "Cauda de Ferro"]
]);

const doubleKick = new Map<Language, string>([
    [Language.English, "Double Kick"],
    [Language.Portuguese, "Chute Duplo"]
]);

const pound = new Map<Language, string>([
    [Language.English, "Pound"],
    [Language.Portuguese, "Pancada"]
]);

const zenHeadbutt = new Map<Language, string>([
    [Language.English, "Zen Headbutt"],
    [Language.Portuguese, "Cabeçada Zen"]
]);

const moonblast = new Map<Language, string>([
    [Language.English, "Moonblast"],
    [Language.Portuguese, "Explosão Lunar"]
]);

const psyshock = new Map<Language, string>([
    [Language.English, "Psyshock"],
    [Language.Portuguese, "Choque Psíquico"]
]);

const chargeBeam = new Map<Language, string>([
    [Language.English, "Charge Beam"],
    [Language.Portuguese, "Carga de Raio"]
]);

const fairyWind = new Map<Language, string>([
    [Language.English, "Fairy Wind"],
    [Language.Portuguese, "Vento de Fada"]
]);

const dazzlingGleam = new Map<Language, string>([
    [Language.English, "Dazzling Gleam"],
    [Language.Portuguese, "Clarão Deslumbrante"]
]);

const meteorMash = new Map<Language, string>([
    [Language.English, "Meteor Mash"],
    [Language.Portuguese, "Meteoro Esmagador"]
]);

const weatherBall = new Map<Language, string>([
    [Language.English, "Weather Ball"],
    [Language.Portuguese, "Esfera Climática"]
]);

const feintAttack = new Map<Language, string>([
    [Language.English, "Feint Attack"],
    [Language.Portuguese, "Ataque Dissimulado"]
]);

const heatWave = new Map<Language, string>([
    [Language.English, "Heat Wave"],
    [Language.Portuguese, "Onda de Calor"]
]);

const ancientPower = new Map<Language, string>([
    [Language.English, "Ancient Power"],
    [Language.Portuguese, "Poder Ancestral"]
]);

const playRough = new Map<Language, string>([
    [Language.English, "Play Rough"],
    [Language.Portuguese, "Jogo Duro"]
]);

const swift = new Map<Language, string>([
    [Language.English, "Swift"],
    [Language.Portuguese, "Ataque Veloz"]
]);

const ominousWind = new Map<Language, string>([
    [Language.English, "Ominous Wind"],
    [Language.Portuguese, "Vento Ominoso"]
]);

const crossPoison = new Map<Language, string>([
    [Language.English, "Cross Poison"],
    [Language.Portuguese, "Corte-veneno"]
]);

const bulletSeed = new Map<Language, string>([
    [Language.English, "Bullet Seed"],
    [Language.Portuguese, "Projétil de Semente"]
]);

const magicalLeaf = new Map<Language, string>([
    [Language.English, "Magical Leaf"],
    [Language.Portuguese, "Folha Mágica"]
]);

const leafBlade = new Map<Language, string>([
    [Language.English, "Leaf Blade"],
    [Language.Portuguese, "Lâmina de Folha"]
]);

const psybeam = new Map<Language, string>([
    [Language.English, "Psybeam"],
    [Language.Portuguese, "Feixe Psíquico"]
]);

const mudBomb = new Map<Language, string>([
    [Language.English, "Mud Bomb"],
    [Language.Portuguese, "Bomba de Lama"]
]);

const suckerPunch = new Map<Language, string>([
    [Language.English, "Sucker Punch"],
    [Language.Portuguese, "Soco Enganador"]
]);

const ironHead = new Map<Language, string>([
    [Language.English, "Iron Head"],
    [Language.Portuguese, "Cabeça de Ferro"]
]);

const foulPlay = new Map<Language, string>([
    [Language.English, "Foul Play"],
    [Language.Portuguese, "Jogo Sujo"]
]);

const trailblaze = new Map<Language, string>([
    [Language.English, "Trailblaze"],
    [Language.Portuguese, "Desbravar"]
]);

const powerGem = new Map<Language, string>([
    [Language.English, "Power Gem"],
    [Language.Portuguese, "Gema Poderosa"]
]);

const payback = new Map<Language, string>([
    [Language.English, "Payback"],
    [Language.Portuguese, "Revide"]
]);

const closeCombat = new Map<Language, string>([
    [Language.English, "Close Combat"],
    [Language.Portuguese, "Corpo-a-corpo"]
]);

const crossChop = new Map<Language, string>([
    [Language.English, "Cross Chop"],
    [Language.Portuguese, "Golpe Cruzado"]
]);

const bubbleBeam = new Map<Language, string>([
    [Language.English, "Bubble Beam"],
    [Language.Portuguese, "Jato de Bolhas"]
]);

const liquidation = new Map<Language, string>([
    [Language.English, "Liquidation"],
    [Language.Portuguese, "Aquaríete"]
]);

const synchronoise = new Map<Language, string>([
    [Language.English, "Synchronoise"],
    [Language.Portuguese, "Barulho Sincronizado"]
]);

const karateChop = new Map<Language, string>([
    [Language.English, "Karate Chop"],
    [Language.Portuguese, "Golpe de Caratê"]
]);

const lowSweep = new Map<Language, string>([
    [Language.English, "Low Sweep"],
    [Language.Portuguese, "Movimento Baixo"]
]);

const counter = new Map<Language, string>([
    [Language.English, "Counter"],
    [Language.Portuguese, "Contra-atacar"]
]);

const lowKick = new Map<Language, string>([
    [Language.English, "Low Kick"],
    [Language.Portuguese, "Rasteira"]
]);

const snarl = new Map<Language, string>([
    [Language.English, "Snarl"],
    [Language.Portuguese, "Rosnado"]
]);

const psychicFangs = new Map<Language, string>([
    [Language.English, "Psychic Fangs"],
    [Language.Portuguese, "Caninos Psíquicos"]
]);

const scald = new Map<Language, string>([
    [Language.English, "Scald"],
    [Language.Portuguese, "Escaldada"]
]);

const dynamicPunch = new Map<Language, string>([
    [Language.English, "Dynamic Punch"],
    [Language.Portuguese, "Soco Dinâmico"]
]);

const submission = new Map<Language, string>([
    [Language.English, "Submission"],
    [Language.Portuguese, "Submissão"]
]);

const powerUpPunch = new Map<Language, string>([
    [Language.English, "Power-Up Punch"],
    [Language.Portuguese, "Soco Empoderador"]
]);

const psychoCut = new Map<Language, string>([
    [Language.English, "Psycho Cut"],
    [Language.Portuguese, "Corte Psíquico"]
]);

const focusBlast = new Map<Language, string>([
    [Language.English, "Focus Blast"],
    [Language.Portuguese, "Explosão Focalizada"]
]);

const futureSight = new Map<Language, string>([
    [Language.English, "Future Sight"],
    [Language.Portuguese, "Visão do Futuro"]
]);

const bulletPunch = new Map<Language, string>([
    [Language.English, "Bullet Punch"],
    [Language.Portuguese, "Soco Projétil"]
]);

const heavySlam = new Map<Language, string>([
    [Language.English, "Heavy Slam"],
    [Language.Portuguese, "Golpe Pesado"]
]);

const leafTornado = new Map<Language, string>([
    [Language.English, "Leaf Tornado"],
    [Language.Portuguese, "Tornado de Folhas"]
]);

const rockThrow = new Map<Language, string>([
    [Language.English, "Rock Throw"],
    [Language.Portuguese, "Lançamento de Rocha"]
]);

const rockBlast = new Map<Language, string>([
    [Language.English, "Rock Blast"],
    [Language.Portuguese, "Explosão de Rocha"]
]);

const highHorsepower = new Map<Language, string>([
    [Language.English, "High Horsepower"],
    [Language.Portuguese, "Potência Equina"]
]);

const incinerate = new Map<Language, string>([
    [Language.English, "Incinerate"],
    [Language.Portuguese, "Incinerar"]
]);

const hex = new Map<Language, string>([
    [Language.English, "Hex"],
    [Language.Portuguese, "Feitiço"]
]);

const zapCannon = new Map<Language, string>([
    [Language.English, "Zap Cannon"],
    [Language.Portuguese, "Canhão Zap"]
]);

const iceShard = new Map<Language, string>([
    [Language.English, "Ice Shard"],
    [Language.Portuguese, "Caco de Gelo"]
]);

const lick = new Map<Language, string>([
    [Language.English, "Lick"],
    [Language.Portuguese, "Lambida"]
]);

const astonish = new Map<Language, string>([
    [Language.English, "Astonish"],
    [Language.Portuguese, "Abismar"]
]);

const auroraBeam = new Map<Language, string>([
    [Language.English, "Aurora Beam"],
    [Language.Portuguese, "Raio Aurora"]
]);

const icyWind = new Map<Language, string>([
    [Language.English, "Icy Wind"],
    [Language.Portuguese, "Vento Congelante"]
]);

const frostBreath = new Map<Language, string>([
    [Language.English, "Frost Breath"],
    [Language.Portuguese, "Respiração de Gelo"]
]);

const sludge = new Map<Language, string>([
    [Language.English, "Sludge"],
    [Language.Portuguese, "Ataque de Lama"]
]);

const razorShell = new Map<Language, string>([
    [Language.English, "Razor Shell"],
    [Language.Portuguese, "Concha Navalha"]
]);

const avalanche = new Map<Language, string>([
    [Language.English, "Avalanche"],
    [Language.Portuguese, "Avalanche"]
]);

const nightShade = new Map<Language, string>([
    [Language.English, "Night Shade"],
    [Language.Portuguese, "Sombra Noturna"]
]);

const shadowPunch = new Map<Language, string>([
    [Language.English, "Shadow Punch"],
    [Language.Portuguese, "Soco Sombrio"]
]);

const viseGrip = new Map<Language, string>([
    [Language.English, "Vise Grip"],
    [Language.Portuguese, "Agarramento Compressor"]
]);

const energyBall = new Map<Language, string>([
    [Language.English, "Energy Ball"],
    [Language.Portuguese, "Bola de Energia"]
]);

const extrasensory = new Map<Language, string>([
    [Language.English, "Extrasensory"],
    [Language.Portuguese, "Extrassensorial"]
]);

const dragonPulse = new Map<Language, string>([
    [Language.English, "Dragon Pulse"],
    [Language.Portuguese, "Pulso do Dragão"]
]);

const dracoMeteor = new Map<Language, string>([
    [Language.English, "Draco Meteor"],
    [Language.Portuguese, "Meteoro do Dragão"]
]);

const blazeKick = new Map<Language, string>([
    [Language.English, "Blaze Kick"],
    [Language.Portuguese, "Chute Labareda"]
]);

const tripleAxel = new Map<Language, string>([
    [Language.English, "Triple Axel"],
    [Language.Portuguese, "Pinote Triplo"]
]);

const brutalSwing = new Map<Language, string>([
    [Language.English, "Brutal Swing"],
    [Language.Portuguese, "Balanço Violento"]
]);

const outrage = new Map<Language, string>([
    [Language.English, "Outrage"],
    [Language.Portuguese, "Ultraje"]
]);

const waterfall = new Map<Language, string>([
    [Language.English, "Waterfall"],
    [Language.Portuguese, "Cachoeira"]
]);

const hiddenPower = new Map<Language, string>([
    [Language.English, "Hidden Power"],
    [Language.Portuguese, "Poder Oculto"]
]);

const hornAttack = new Map<Language, string>([
    [Language.English, "Horn Attack"],
    [Language.Portuguese, "Ataque de Chifre"]
]);

const splash = new Map<Language, string>([
    [Language.English, "Splash"],
    [Language.Portuguese, "Borrifada"]
]);

const transform = new Map<Language, string>([
    [Language.English, "Transform"],
    [Language.Portuguese, "Transformação"]
]);

const lastResort = new Map<Language, string>([
    [Language.English, "Last Resort"],
    [Language.Portuguese, "Último Recurso"]
]);

const brine = new Map<Language, string>([
    [Language.English, "Brine"],
    [Language.Portuguese, "Salmoura"]
]);

const yawn = new Map<Language, string>([
    [Language.English, "Yawn"],
    [Language.Portuguese, "Bocejo"]
]);

const takeDown = new Map<Language, string>([
    [Language.English, "Take Down"],
    [Language.Portuguese, "Desmantelar"]
]);

const geomancy = new Map<Language, string>([
    [Language.English, "Geomancy"],
    [Language.Portuguese, "Geomancia"]
]);

const shadowSneak = new Map<Language, string>([
    [Language.English, "Shadow Sneak"],
    [Language.Portuguese, "Furtividade nas Sombras"]
]);

const meteorBeam = new Map<Language, string>([
    [Language.English, "Meteor Beam"],
    [Language.Portuguese, "Raio Meteórico"]
]);

const leafStorm = new Map<Language, string>([
    [Language.English, "Leaf Storm"],
    [Language.Portuguese, "Tempestade de Folhas"]
]);

const mirrorCoat = new Map<Language, string>([
    [Language.English, "Mirror Coat"],
    [Language.Portuguese, "Casaco Espelhado"]
]);

const triAttack = new Map<Language, string>([
    [Language.English, "Tri Attack"],
    [Language.Portuguese, "Triataque"]
]);

const muddyWater = new Map<Language, string>([
    [Language.English, "Muddy Water"],
    [Language.Portuguese, "Água Barrenta"]
]);

const auraSphere = new Map<Language, string>([
    [Language.English, "Aura Sphere"],
    [Language.Portuguese, "Aura Esférica"]
]);

const VCreate = new Map<Language, string>([
    [Language.English, "V-Create"],
    [Language.Portuguese, "Criação V"]
]);

const sacredFire = new Map<Language, string>([
    [Language.English, "Sacred Fire"],
    [Language.Portuguese, "Fogo Sagrado"]
]);

const icicleSpear = new Map<Language, string>([
    [Language.English, "Icicle Spear"],
    [Language.Portuguese, "Lança Congelada"]
]);

const mysticalFire = new Map<Language, string>([
    [Language.English, "Mystical Fire"],
    [Language.Portuguese, "Fogo Místico"]
]);

const magmaStorm = new Map<Language, string>([
    [Language.English, "Magma Storm"],
    [Language.Portuguese, "Tempestade de Magma"]
]);

const seedFlare = new Map<Language, string>([
    [Language.English, "Seed Flare"],
    [Language.Portuguese, "Semente Ofuscante"]
]);

const obstruct = new Map<Language, string>([
    [Language.English, "Obstruct"],
    [Language.Portuguese, "Obstruir"]
]);

const cut = new Map<Language, string>([
    [Language.English, "Cut"],
    [Language.Portuguese, "Cortar"]
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
    [MovesTranslatorKeys.METAL_CLAW, metalClaw],
    [MovesTranslatorKeys.POWDER_SNOW, powderSnow],
    [MovesTranslatorKeys.BLIZZARD, blizzard],
    [MovesTranslatorKeys.GYRO_BALL, gyroBall],
    [MovesTranslatorKeys.NIGHT_SLASH, nightSlash],
    [MovesTranslatorKeys.BULLDOZE, bulldoze],
    [MovesTranslatorKeys.EARTHQUAKE, earthquake],
    [MovesTranslatorKeys.SCORCHING_SANDS, scorchingSands],
    [MovesTranslatorKeys.SHADOW_CLAW, shadowClaw],
    [MovesTranslatorKeys.ICE_PUNCH, icePunch],
    [MovesTranslatorKeys.STONE_EDGE, stoneEdge],
    [MovesTranslatorKeys.EARTH_POWER, earthPower],
    [MovesTranslatorKeys.STOMP, stomp],
    [MovesTranslatorKeys.MUD_SLAP, mudSlap],
    [MovesTranslatorKeys.ROCK_SMASH, rockSmash],
    [MovesTranslatorKeys.MEGAHORN, megahorn],
    [MovesTranslatorKeys.BREAKING_SWIPE, breakingSwipe],
    [MovesTranslatorKeys.SMACK_DOWN, smackDown],
    [MovesTranslatorKeys.SUPER_POWER, superPower],
    [MovesTranslatorKeys.ROCK_WRECKER, rockWrecker],
    [MovesTranslatorKeys.FURY_CUTTER, furyCutter],
    [MovesTranslatorKeys.IRON_TAIL, ironTail],
    [MovesTranslatorKeys.DOUBLE_KICK, doubleKick],
    [MovesTranslatorKeys.POUND, pound],
    [MovesTranslatorKeys.ZEN_HEADBUTT, zenHeadbutt],
    [MovesTranslatorKeys.MOONBLAST, moonblast],
    [MovesTranslatorKeys.PSYSHOCK, psyshock],
    [MovesTranslatorKeys.CHARGE_BEAM, chargeBeam],
    [MovesTranslatorKeys.FAIRY_WIND, fairyWind],
    [MovesTranslatorKeys.DAZZLING_GLEAM, dazzlingGleam],
    [MovesTranslatorKeys.METEOR_MASH, meteorMash],
    [MovesTranslatorKeys.WEATHER_BALL_FIRE, weatherBall],
    [MovesTranslatorKeys.WEATHER_BALL_ICE, weatherBall],
    [MovesTranslatorKeys.FEINT_ATTACK, feintAttack],
    [MovesTranslatorKeys.HEAT_WAVE, heatWave],
    [MovesTranslatorKeys.ANCIENT_POWER, ancientPower],
    [MovesTranslatorKeys.PLAY_ROUGH, playRough],
    [MovesTranslatorKeys.SWIFT, swift],
    [MovesTranslatorKeys.OMINOUS_WIND, ominousWind],
    [MovesTranslatorKeys.CROSS_POISON, crossPoison],
    [MovesTranslatorKeys.BULLET_SEED, bulletSeed],
    [MovesTranslatorKeys.MAGICAL_LEAF, magicalLeaf],
    [MovesTranslatorKeys.LEAF_BLADE, leafBlade],
    [MovesTranslatorKeys.PSYBEAM, psybeam],
    [MovesTranslatorKeys.MUD_BOMB, mudBomb],
    [MovesTranslatorKeys.SUCKER_PUNCH, suckerPunch],
    [MovesTranslatorKeys.IRON_HEAD, ironHead],
    [MovesTranslatorKeys.FOUL_PLAY, foulPlay],
    [MovesTranslatorKeys.TRAILBLAZE, trailblaze],
    [MovesTranslatorKeys.POWER_GEM, powerGem],
    [MovesTranslatorKeys.PAYBACK, payback],
    [MovesTranslatorKeys.CLOSE_COMBAT, closeCombat],
    [MovesTranslatorKeys.CROSS_CHOP, crossChop],
    [MovesTranslatorKeys.BUBBLE_BEAM, bubbleBeam],
    [MovesTranslatorKeys.LIQUIDATION, liquidation],
    [MovesTranslatorKeys.SYNCHRONOISE, synchronoise],
    [MovesTranslatorKeys.KARATE_CHOP, karateChop],
    [MovesTranslatorKeys.LOW_SWEEP, lowSweep],
    [MovesTranslatorKeys.COUNTER, counter],
    [MovesTranslatorKeys.LOW_KICK, lowKick],
    [MovesTranslatorKeys.SNARL, snarl],
    [MovesTranslatorKeys.PSYCHIC_FANGS, psychicFangs],
    [MovesTranslatorKeys.SCALD, scald],
    [MovesTranslatorKeys.WEATHER_BALL_WATER, weatherBall],
    [MovesTranslatorKeys.DYNAMIC_PUNCH, dynamicPunch],
    [MovesTranslatorKeys.SUBMISSION, submission],
    [MovesTranslatorKeys.POWER_UP_PUNCH, powerUpPunch],
    [MovesTranslatorKeys.PSYCHO_CUT, psychoCut],
    [MovesTranslatorKeys.FOCUS_BLAST, focusBlast],
    [MovesTranslatorKeys.FUTURE_SIGHT, futureSight],
    [MovesTranslatorKeys.BULLET_PUNCH, bulletPunch],
    [MovesTranslatorKeys.HEAVY_SLAM, heavySlam],
    [MovesTranslatorKeys.LEAF_TORNADO, leafTornado],
    [MovesTranslatorKeys.ROCK_THROW, rockThrow],
    [MovesTranslatorKeys.ROCK_BLAST, rockBlast],
    [MovesTranslatorKeys.HIGH_HORSEPOWER, highHorsepower],
    [MovesTranslatorKeys.INCINERATE, incinerate],
    [MovesTranslatorKeys.HEX, hex],
    [MovesTranslatorKeys.ZAP_CANNON, zapCannon],
    [MovesTranslatorKeys.ICE_SHARD, iceShard],
    [MovesTranslatorKeys.LICK, lick],
    [MovesTranslatorKeys.ASTONISH, astonish],
    [MovesTranslatorKeys.AURORA_BEAM, auroraBeam],
    [MovesTranslatorKeys.ICY_WIND, icyWind],
    [MovesTranslatorKeys.FROST_BREATH, frostBreath],
    [MovesTranslatorKeys.SLUDGE, sludge],
    [MovesTranslatorKeys.RAZOR_SHELL, razorShell],
    [MovesTranslatorKeys.AVALANCHE, avalanche],
    [MovesTranslatorKeys.NIGHT_SHADE, nightShade],
    [MovesTranslatorKeys.SHADOW_PUNCH, shadowPunch],
    [MovesTranslatorKeys.VICE_GRIP, viseGrip],
    [MovesTranslatorKeys.ENERGY_BALL, energyBall],
    [MovesTranslatorKeys.EXTRASENSORY, extrasensory],
    [MovesTranslatorKeys.DRAGON_PULSE, dragonPulse],
    [MovesTranslatorKeys.DRACO_METEOR, dracoMeteor],
    [MovesTranslatorKeys.BLAZE_KICK, blazeKick],
    [MovesTranslatorKeys.TRIPLE_AXEL, tripleAxel],
    [MovesTranslatorKeys.BRUTAL_SWING, brutalSwing],
    [MovesTranslatorKeys.OUTRAGE, outrage],
    [MovesTranslatorKeys.WATERFALL, waterfall],
    [MovesTranslatorKeys.HIDDEN_POWER_BUG, hiddenPower],
    [MovesTranslatorKeys.HIDDEN_POWER_DARK, hiddenPower],
    [MovesTranslatorKeys.HIDDEN_POWER_DRAGON, hiddenPower],
    [MovesTranslatorKeys.HIDDEN_POWER_ELECTRIC, hiddenPower],
    [MovesTranslatorKeys.HIDDEN_POWER_FIGHTING, hiddenPower],
    [MovesTranslatorKeys.HIDDEN_POWER_FIRE, hiddenPower],
    [MovesTranslatorKeys.HIDDEN_POWER_FLYING, hiddenPower],
    [MovesTranslatorKeys.HIDDEN_POWER_GHOST, hiddenPower],
    [MovesTranslatorKeys.HIDDEN_POWER_GRASS, hiddenPower],
    [MovesTranslatorKeys.HIDDEN_POWER_GROUND, hiddenPower],
    [MovesTranslatorKeys.HIDDEN_POWER_ICE, hiddenPower],
    [MovesTranslatorKeys.HIDDEN_POWER_POISON, hiddenPower],
    [MovesTranslatorKeys.HIDDEN_POWER_PSYCHIC, hiddenPower],
    [MovesTranslatorKeys.HIDDEN_POWER_ROCK, hiddenPower],
    [MovesTranslatorKeys.HIDDEN_POWER_STEEL, hiddenPower],
    [MovesTranslatorKeys.HIDDEN_POWER_WATER, hiddenPower],
    [MovesTranslatorKeys.HORN_ATTACK, hornAttack],
    [MovesTranslatorKeys.SPLASH, splash],
    [MovesTranslatorKeys.TRANSFORM, transform],
    [MovesTranslatorKeys.LAST_RESORT, lastResort],
    [MovesTranslatorKeys.BRINE, brine],
    [MovesTranslatorKeys.YAWN, yawn],
    [MovesTranslatorKeys.TAKE_DOWN, takeDown],
    [MovesTranslatorKeys.GEOMANCY, geomancy],
    [MovesTranslatorKeys.SHADOW_SNEAK, shadowSneak],
    [MovesTranslatorKeys.METEOR_BEAM, meteorBeam],
    [MovesTranslatorKeys.LEAF_STORM, leafStorm],
    [MovesTranslatorKeys.MIRROR_COAT, mirrorCoat],
    [MovesTranslatorKeys.TRI_ATTACK, triAttack],
    [MovesTranslatorKeys.WEATHER_BALL_ROCK, weatherBall],
    [MovesTranslatorKeys.MUDDY_WATER, muddyWater],
    [MovesTranslatorKeys.AURA_SPHERE, auraSphere],
    [MovesTranslatorKeys.V_CREATE, VCreate],
    [MovesTranslatorKeys.SACRED_FIRE, sacredFire],
    [MovesTranslatorKeys.ICICLE_SPEAR, icicleSpear],
    [MovesTranslatorKeys.MYSTICAL_FIRE, mysticalFire],
    [MovesTranslatorKeys.MAGMA_STORM, magmaStorm],
    [MovesTranslatorKeys.SEED_FLARE, seedFlare],
    [MovesTranslatorKeys.OBSTRUCT, obstruct],
    [MovesTranslatorKeys.CUT, cut],
]);

const movesTranslator = (key: MovesTranslatorKeys, language: Language) => translations.get(key)?.get(language) ?? (MovesTranslatorKeys[key] ? MovesTranslatorKeys[key].toString() : key?.toString());
export const isTranslated = (key: MovesTranslatorKeys) => translations.has(key);

export default movesTranslator;