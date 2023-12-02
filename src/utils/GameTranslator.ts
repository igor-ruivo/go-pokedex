import { GameLanguage } from "../contexts/language-context";

export enum GameTranslatorKeys {
    //moves:
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
    LOCK_ON,
    TAKE_DOWN,
    TRI_ATTACK,
    //TODO: GIGA_IMPACT,
    //TODO: TECHNO_BLAST_NORMAL,
    //TODO: BOOMBURST,
    WEATHER_BALL_NORMAL,

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
    LEAFAGE,
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
    FUSION_FLARE,
    
    //poison
    SLUDGE_BOMB,
    POISON_STING,
    POISON_JAB,
    ACID,
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
    GUST,
    BRAVE_BIRD,
    HURRICANE,
    FEATHER_DANCE,
    PECK,
    DRILL_PECK,
    SKY_ATTACK,
    HIDDEN_POWER_FLYING,
    //TODO: ACROBATICS,
    //TODO: AEROBLAST,
    FLY,
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
    CRABHAMMER,
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
    ICE_FANG,
    //TODO: TECHNO_BLAST_CHILL,
    ICICLE_SPEAR,
    //TODO: GLACIATE,

    //bug
    BUG_BITE,
    STRUGGLE_BUG,
    BUG_BUZZ,
    SIGNAL_BEAM,
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
    THUNDER_FANG,
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

    //other
    HP,
    CP,
    AttackSearch,
    DefenseSearch,
    HPSearch,
    Great,
    Master,
    GreatLeague,
    UltraLeague,
    MasterLeague,
}

const vineWhip = new Map<GameLanguage, string>([
    [GameLanguage.English, "Vine Whip"],
    [GameLanguage.Portuguese, "Chicote de Vinha"]
]);

const razorLeaf = new Map<GameLanguage, string>([
    [GameLanguage.English, "Razor Leaf"],
    [GameLanguage.Portuguese, "Folha Navalha"]
]);

const franzyPlant = new Map<GameLanguage, string>([
    [GameLanguage.English, "Frenzy Plant"],
    [GameLanguage.Portuguese, "Planta Mortal"]
]);

const sludgeBomb = new Map<GameLanguage, string>([
    [GameLanguage.English, "Sludge Bomb"],
    [GameLanguage.Portuguese, "Bomba de Lodo"]
]);

const petalBlizzard = new Map<GameLanguage, string>([
    [GameLanguage.English, "Petal Blizzard"],
    [GameLanguage.Portuguese, "Nevasca de Pétalas"]
]);

const seedBomb = new Map<GameLanguage, string>([
    [GameLanguage.English, "Seed Bomb"],
    [GameLanguage.Portuguese, "Bomba de Sementes"]
]);

const powerWhip = new Map<GameLanguage, string>([
    [GameLanguage.English, "Power Whip"],
    [GameLanguage.Portuguese, "Chicote Poderoso"]
]);

const solarBeam = new Map<GameLanguage, string>([
    [GameLanguage.English, "Solar Beam"],
    [GameLanguage.Portuguese, "Raio Solar"]
]);

const tackle = new Map<GameLanguage, string>([
    [GameLanguage.English, "Tackle"],
    [GameLanguage.Portuguese, "Investida"]
]);

const scratch = new Map<GameLanguage, string>([
    [GameLanguage.English, "Scratch"],
    [GameLanguage.Portuguese, "Arranhão"]
]);

const ember = new Map<GameLanguage, string>([
    [GameLanguage.English, "Ember"],
    [GameLanguage.Portuguese, "Brasa"]
]);

const flamethrower = new Map<GameLanguage, string>([
    [GameLanguage.English, "Flamethrower"],
    [GameLanguage.Portuguese, "Lança-chamas"]
]);

const flameCharge = new Map<GameLanguage, string>([
    [GameLanguage.English, "Flame Charge"],
    [GameLanguage.Portuguese, "Ataque de Chamas"]
]);

const flameBurst = new Map<GameLanguage, string>([
    [GameLanguage.English, "Flame Burst"],
    [GameLanguage.Portuguese, "Rajada de Chamas"]
]);

const fireFang = new Map<GameLanguage, string>([
    [GameLanguage.English, "Fire Fang"],
    [GameLanguage.Portuguese, "Presas de Fogo"]
]);

const firePunch = new Map<GameLanguage, string>([
    [GameLanguage.English, "Fire Punch"],
    [GameLanguage.Portuguese, "Soco de Fogo"]
]);

const fireSpin = new Map<GameLanguage, string>([
    [GameLanguage.English, "Fire Spin"],
    [GameLanguage.Portuguese, "Chama Furacão"]
]);

const fireBlast = new Map<GameLanguage, string>([
    [GameLanguage.English, "Fire Blast"],
    [GameLanguage.Portuguese, "Rajada de Fogo"]
]);

const overheat = new Map<GameLanguage, string>([
    [GameLanguage.English, "Overheat"],
    [GameLanguage.Portuguese, "Superaquecimento"]
]);

const blastBurn = new Map<GameLanguage, string>([
    [GameLanguage.English, "Blast Burn"],
    [GameLanguage.Portuguese, "Queimadura Explosiva"]
]);

const dragonBreath = new Map<GameLanguage, string>([
    [GameLanguage.English, "Dragon Breath"],
    [GameLanguage.Portuguese, "Sopro do Dragão"]
]);

const dragonClaw = new Map<GameLanguage, string>([
    [GameLanguage.English, "Dragon Claw"],
    [GameLanguage.Portuguese, "Garra de Dragão"]
]);

const wingAttack = new Map<GameLanguage, string>([
    [GameLanguage.English, "Wing Attack"],
    [GameLanguage.Portuguese, "Ataque de Asa"]
]);

const airSlash = new Map<GameLanguage, string>([
    [GameLanguage.English, "Air Slash"],
    [GameLanguage.Portuguese, "Golpe de Ar"]
]);

const bubble = new Map<GameLanguage, string>([
    [GameLanguage.English, "Bubble"],
    [GameLanguage.Portuguese, "Bolha"]
]);

const aquaJet = new Map<GameLanguage, string>([
    [GameLanguage.English, "Aqua Jet"],
    [GameLanguage.Portuguese, "Aqua Jato"]
]);

const aquaTail = new Map<GameLanguage, string>([
    [GameLanguage.English, "Aqua Tail"],
    [GameLanguage.Portuguese, "Aqua Cauda"]
]);

const waterPulse = new Map<GameLanguage, string>([
    [GameLanguage.English, "Water Pulse"],
    [GameLanguage.Portuguese, "Pulso d'Água"]
]);

const bite = new Map<GameLanguage, string>([
    [GameLanguage.English, "Bite"],
    [GameLanguage.Portuguese, "Mordida"]
]);

const waterGun = new Map<GameLanguage, string>([
    [GameLanguage.English, "Water Gun"],
    [GameLanguage.Portuguese, "Revólver d'Água"]
]);

const flashCannon = new Map<GameLanguage, string>([
    [GameLanguage.English, "Flash Cannon"],
    [GameLanguage.Portuguese, "Canhão de Flash"]
]);

const hydroCannon = new Map<GameLanguage, string>([
    [GameLanguage.English, "Hydro Cannon"],
    [GameLanguage.Portuguese, "Hidro Canhão"]
]);

const hydroPump = new Map<GameLanguage, string>([
    [GameLanguage.English, "Hydro Pump"],
    [GameLanguage.Portuguese, "Jato d'Água"]
]);

const iceBeam = new Map<GameLanguage, string>([
    [GameLanguage.English, "Ice Beam"],
    [GameLanguage.Portuguese, "Raio Congelante"]
]);

const skullBash = new Map<GameLanguage, string>([
    [GameLanguage.English, "Skull Bash"],
    [GameLanguage.Portuguese, "Quebra-crânio"]
]);

const bugBite = new Map<GameLanguage, string>([
    [GameLanguage.English, "Bug Bite"],
    [GameLanguage.Portuguese, "Picada"]
]);

const struggle = new Map<GameLanguage, string>([
    [GameLanguage.English, "Struggle"],
    [GameLanguage.Portuguese, "Insistência"]
]);

const confusion = new Map<GameLanguage, string>([
    [GameLanguage.English, "Confusion"],
    [GameLanguage.Portuguese, "Confusão"]
]);

const struggleBug = new Map<GameLanguage, string>([
    [GameLanguage.English, "Struggle Bug"],
    [GameLanguage.Portuguese, "Ira de Inseto"]
]);

const bugBuzz = new Map<GameLanguage, string>([
    [GameLanguage.English, "Bug Buzz"],
    [GameLanguage.Portuguese, "Zumbido de Inseto"]
]);

const psychic = new Map<GameLanguage, string>([
    [GameLanguage.English, "Psychic"],
    [GameLanguage.Portuguese, "Psíquico"]
]);

const poisonSting = new Map<GameLanguage, string>([
    [GameLanguage.English, "Poison Sting"],
    [GameLanguage.Portuguese, "Ferrão Venenoso"]
]);

const infestation = new Map<GameLanguage, string>([
    [GameLanguage.English, "Infestation"],
    [GameLanguage.Portuguese, "Infestação"]
]);

const poisonJab = new Map<GameLanguage, string>([
    [GameLanguage.English, "Poison Jab"],
    [GameLanguage.Portuguese, "Golpe Envenenado"]
]);

const aerialAce = new Map<GameLanguage, string>([
    [GameLanguage.English, "Aerial Ace"],
    [GameLanguage.Portuguese, "Ás dos Ares"]
]);

const xScissor = new Map<GameLanguage, string>([
    [GameLanguage.English, "X-Scissor"],
    [GameLanguage.Portuguese, "Tesoura X"]
]);

const fellStinger = new Map<GameLanguage, string>([
    [GameLanguage.English, "Fell Stinger"],
    [GameLanguage.Portuguese, "Ferrão Letal"]
]);

const drillRun = new Map<GameLanguage, string>([
    [GameLanguage.English, "Drill Run"],
    [GameLanguage.Portuguese, "Furação"]
]);

const quickAttack = new Map<GameLanguage, string>([
    [GameLanguage.English, "Quick Attack"],
    [GameLanguage.Portuguese, "Ataque Rápido"]
]);

const airCutter = new Map<GameLanguage, string>([
    [GameLanguage.English, "Air Cutter"],
    [GameLanguage.Portuguese, "Cortador de Ar"]
]);

const twister = new Map<GameLanguage, string>([
    [GameLanguage.English, "Twister"],
    [GameLanguage.Portuguese, "Twister"]
]);

const steelWind = new Map<GameLanguage, string>([
    [GameLanguage.English, "Steel Wing"],
    [GameLanguage.Portuguese, "Asa de Aço"]
]);

const braveBird = new Map<GameLanguage, string>([
    [GameLanguage.English, "Brave Bird"],
    [GameLanguage.Portuguese, "Pássaro Bravo"]
]);

const hurricane = new Map<GameLanguage, string>([
    [GameLanguage.English, "Hurricane"],
    [GameLanguage.Portuguese, "Furacão"]
]);

const featherDance = new Map<GameLanguage, string>([
    [GameLanguage.English, "Feather Dance"],
    [GameLanguage.Portuguese, "Dança das Penas"]
]);

const bodySlam = new Map<GameLanguage, string>([
    [GameLanguage.English, "Body Slam"],
    [GameLanguage.Portuguese, "Pancada Corporal"]
]);

const dig = new Map<GameLanguage, string>([
    [GameLanguage.English, "Dig"],
    [GameLanguage.Portuguese, "Cavar"]
]);

const crunch = new Map<GameLanguage, string>([
    [GameLanguage.English, "Crunch"],
    [GameLanguage.Portuguese, "Mastigada"]
]);

const shadowBall = new Map<GameLanguage, string>([
    [GameLanguage.English, "Shadow Ball"],
    [GameLanguage.Portuguese, "Bola Sombria"]
]);

const hyperBeam = new Map<GameLanguage, string>([
    [GameLanguage.English, "Hyper Beam"],
    [GameLanguage.Portuguese, "Hiper-raio"]
]);

const peck = new Map<GameLanguage, string>([
    [GameLanguage.English, "Peck"],
    [GameLanguage.Portuguese, "Bicada"]
]);

const drillPeck = new Map<GameLanguage, string>([
    [GameLanguage.English, "Drill Peck"],
    [GameLanguage.Portuguese, "Bico Broca"]
]);

const skyAttack = new Map<GameLanguage, string>([
    [GameLanguage.English, "Sky Attack"],
    [GameLanguage.Portuguese, "Ataque do Céu"]
]);

const gunkShot = new Map<GameLanguage, string>([
    [GameLanguage.English, "Gunk Shot"],
    [GameLanguage.Portuguese, "Tiro de Sujeira"]
]);

const poisonFang = new Map<GameLanguage, string>([
    [GameLanguage.English, "Poison Fang"],
    [GameLanguage.Portuguese, "Presa Venenosa"]
]);

const wrap = new Map<GameLanguage, string>([
    [GameLanguage.English, "Wrap"],
    [GameLanguage.Portuguese, "Embrulho"]
]);

const dragonTail = new Map<GameLanguage, string>([
    [GameLanguage.English, "Dragon Tail"],
    [GameLanguage.Portuguese, "Cauda do Dragão"]
]);

const darkPulse = new Map<GameLanguage, string>([
    [GameLanguage.English, "Dark Pulse"],
    [GameLanguage.Portuguese, "Pulso Sombrio"]
]);

const sludgeWave = new Map<GameLanguage, string>([
    [GameLanguage.English, "Sludge Wave"],
    [GameLanguage.Portuguese, "Onda de Lama"]
]);

const acidSpray = new Map<GameLanguage, string>([
    [GameLanguage.English, "Acid Spray"],
    [GameLanguage.Portuguese, "Spray Ácido"]
]);

const thunderShock = new Map<GameLanguage, string>([
    [GameLanguage.English, "Thunder Shock"],
    [GameLanguage.Portuguese, "Trovoada de Choques"]
]);

const discharge = new Map<GameLanguage, string>([
    [GameLanguage.English, "Discharge"],
    [GameLanguage.Portuguese, "Descarga"]
]);

const surf = new Map<GameLanguage, string>([
    [GameLanguage.English, "Surf"],
    [GameLanguage.Portuguese, "Surfar"]
]);

const thunder = new Map<GameLanguage, string>([
    [GameLanguage.English, "Thunder"],
    [GameLanguage.Portuguese, "Trovão"]
]);

const thunderbolt = new Map<GameLanguage, string>([
    [GameLanguage.English, "Thunderbolt"],
    [GameLanguage.Portuguese, "Relâmpago"]
]);

const wildCharge = new Map<GameLanguage, string>([
    [GameLanguage.English, "Wild Charge"],
    [GameLanguage.Portuguese, "Ataque Selvagem"]
]);

const thunderPunch = new Map<GameLanguage, string>([
    [GameLanguage.English, "Thunder Punch"],
    [GameLanguage.Portuguese, "Soco Trovoada"]
]);

const disarmingVoice = new Map<GameLanguage, string>([
    [GameLanguage.English, "Disarming Voice"],
    [GameLanguage.Portuguese, "Voz Desarmante"]
]);

const spark = new Map<GameLanguage, string>([
    [GameLanguage.English, "Spark"],
    [GameLanguage.Portuguese, "Faísca"]
]);

const voltSwitch = new Map<GameLanguage, string>([
    [GameLanguage.English, "Volt Switch"],
    [GameLanguage.Portuguese, "Troca Elétrica"]
]);

const charm = new Map<GameLanguage, string>([
    [GameLanguage.English, "Charm"],
    [GameLanguage.Portuguese, "Encantar"]
]);

const brickBreak = new Map<GameLanguage, string>([
    [GameLanguage.English, "Brick Break"],
    [GameLanguage.Portuguese, "Quebra-telha"]
]);

const grassKnot = new Map<GameLanguage, string>([
    [GameLanguage.English, "Grass Knot"],
    [GameLanguage.Portuguese, "Nó de Grama"]
]);

const mudShot = new Map<GameLanguage, string>([
    [GameLanguage.English, "Mud Shot"],
    [GameLanguage.Portuguese, "Tiro de Lama"]
]);

const sandTomb = new Map<GameLanguage, string>([
    [GameLanguage.English, "Sand Tomb"],
    [GameLanguage.Portuguese, "Fosso de Areia"]
]);

const rockSlide = new Map<GameLanguage, string>([
    [GameLanguage.English, "Rock Slide"],
    [GameLanguage.Portuguese, "Deslize de Pedras"]
]);

const rockTomb = new Map<GameLanguage, string>([
    [GameLanguage.English, "Rock Tomb"],
    [GameLanguage.Portuguese, "Tumba de Rochas"]
]);

const metalClaw = new Map<GameLanguage, string>([
    [GameLanguage.English, "Metal Claw"],
    [GameLanguage.Portuguese, "Garra de Metal"]
]);

const powderSnow = new Map<GameLanguage, string>([
    [GameLanguage.English, "Powder Snow"],
    [GameLanguage.Portuguese, "Neve em Pó"]
]);

const blizzard = new Map<GameLanguage, string>([
    [GameLanguage.English, "Blizzard"],
    [GameLanguage.Portuguese, "Nevasca"]
]);

const gyroBall = new Map<GameLanguage, string>([
    [GameLanguage.English, "Gyro Ball"],
    [GameLanguage.Portuguese, "Girobola"]
]);

const nightSlash = new Map<GameLanguage, string>([
    [GameLanguage.English, "Night Slash"],
    [GameLanguage.Portuguese, "Talho Noturno"]
]);

const bulldoze = new Map<GameLanguage, string>([
    [GameLanguage.English, "Bulldoze"],
    [GameLanguage.Portuguese, "Tremor"]
]);

const earthquake = new Map<GameLanguage, string>([
    [GameLanguage.English, "Earthquake"],
    [GameLanguage.Portuguese, "Terremoto"]
]);

const scorchingSands = new Map<GameLanguage, string>([
    [GameLanguage.English, "Scorching Sands"],
    [GameLanguage.Portuguese, "Areias Ardentes"]
]);

const shadowClaw = new Map<GameLanguage, string>([
    [GameLanguage.English, "Shadow Claw"],
    [GameLanguage.Portuguese, "Garra Sombria"]
]);

const icePunch = new Map<GameLanguage, string>([
    [GameLanguage.English, "Ice Punch"],
    [GameLanguage.Portuguese, "Soco de Gelo"]
]);

const stoneEdge = new Map<GameLanguage, string>([
    [GameLanguage.English, "Stone Edge"],
    [GameLanguage.Portuguese, "Gume de Pedra"]
]);

const earthPower = new Map<GameLanguage, string>([
    [GameLanguage.English, "Earth Power"],
    [GameLanguage.Portuguese, "Poder da Terra"]
]);

const stomp = new Map<GameLanguage, string>([
    [GameLanguage.English, "Stomp"],
    [GameLanguage.Portuguese, "Pisotear"]
]);

const mudSlap = new Map<GameLanguage, string>([
    [GameLanguage.English, "Mud Slap"],
    [GameLanguage.Portuguese, "Tapa de Lama"]
]);

const rockSmash = new Map<GameLanguage, string>([
    [GameLanguage.English, "Rock Smash"],
    [GameLanguage.Portuguese, "Esmagamento de Pedras"]
]);

const megahorn = new Map<GameLanguage, string>([
    [GameLanguage.English, "Megahorn"],
    [GameLanguage.Portuguese, "Megachifre"]
]);

const breakingSwipe = new Map<GameLanguage, string>([
    [GameLanguage.English, "Breaking Swipe"],
    [GameLanguage.Portuguese, "Golpe Deslizante"]
]);

const smackDown = new Map<GameLanguage, string>([
    [GameLanguage.English, "Smack Down"],
    [GameLanguage.Portuguese, "Derrubada"]
]);

const superPower = new Map<GameLanguage, string>([
    [GameLanguage.English, "Superpower"],
    [GameLanguage.Portuguese, "Superpoder"]
]);

const rockWrecker = new Map<GameLanguage, string>([
    [GameLanguage.English, "Rock Wrecker"],
    [GameLanguage.Portuguese, "Demolidor de Pedras"]
]);

const furyCutter = new Map<GameLanguage, string>([
    [GameLanguage.English, "Fury Cutter"],
    [GameLanguage.Portuguese, "Cortador de Fúria"]
]);

const ironTail = new Map<GameLanguage, string>([
    [GameLanguage.English, "Iron Tail"],
    [GameLanguage.Portuguese, "Cauda de Ferro"]
]);

const doubleKick = new Map<GameLanguage, string>([
    [GameLanguage.English, "Double Kick"],
    [GameLanguage.Portuguese, "Chute Duplo"]
]);

const pound = new Map<GameLanguage, string>([
    [GameLanguage.English, "Pound"],
    [GameLanguage.Portuguese, "Pancada"]
]);

const zenHeadbutt = new Map<GameLanguage, string>([
    [GameLanguage.English, "Zen Headbutt"],
    [GameLanguage.Portuguese, "Cabeçada Zen"]
]);

const moonblast = new Map<GameLanguage, string>([
    [GameLanguage.English, "Moonblast"],
    [GameLanguage.Portuguese, "Explosão Lunar"]
]);

const psyshock = new Map<GameLanguage, string>([
    [GameLanguage.English, "Psyshock"],
    [GameLanguage.Portuguese, "Choque Psíquico"]
]);

const chargeBeam = new Map<GameLanguage, string>([
    [GameLanguage.English, "Charge Beam"],
    [GameLanguage.Portuguese, "Carga de Raio"]
]);

const fairyWind = new Map<GameLanguage, string>([
    [GameLanguage.English, "Fairy Wind"],
    [GameLanguage.Portuguese, "Vento de Fada"]
]);

const dazzlingGleam = new Map<GameLanguage, string>([
    [GameLanguage.English, "Dazzling Gleam"],
    [GameLanguage.Portuguese, "Clarão Deslumbrante"]
]);

const meteorMash = new Map<GameLanguage, string>([
    [GameLanguage.English, "Meteor Mash"],
    [GameLanguage.Portuguese, "Meteoro Esmagador"]
]);

const weatherBall = new Map<GameLanguage, string>([
    [GameLanguage.English, "Weather Ball"],
    [GameLanguage.Portuguese, "Esfera Climática"]
]);

const feintAttack = new Map<GameLanguage, string>([
    [GameLanguage.English, "Feint Attack"],
    [GameLanguage.Portuguese, "Ataque Dissimulado"]
]);

const heatWave = new Map<GameLanguage, string>([
    [GameLanguage.English, "Heat Wave"],
    [GameLanguage.Portuguese, "Onda de Calor"]
]);

const ancientPower = new Map<GameLanguage, string>([
    [GameLanguage.English, "Ancient Power"],
    [GameLanguage.Portuguese, "Poder Ancestral"]
]);

const playRough = new Map<GameLanguage, string>([
    [GameLanguage.English, "Play Rough"],
    [GameLanguage.Portuguese, "Jogo Duro"]
]);

const swift = new Map<GameLanguage, string>([
    [GameLanguage.English, "Swift"],
    [GameLanguage.Portuguese, "Ataque Veloz"]
]);

const ominousWind = new Map<GameLanguage, string>([
    [GameLanguage.English, "Ominous Wind"],
    [GameLanguage.Portuguese, "Vento Ominoso"]
]);

const crossPoison = new Map<GameLanguage, string>([
    [GameLanguage.English, "Cross Poison"],
    [GameLanguage.Portuguese, "Corte-veneno"]
]);

const bulletSeed = new Map<GameLanguage, string>([
    [GameLanguage.English, "Bullet Seed"],
    [GameLanguage.Portuguese, "Projétil de Semente"]
]);

const magicalLeaf = new Map<GameLanguage, string>([
    [GameLanguage.English, "Magical Leaf"],
    [GameLanguage.Portuguese, "Folha Mágica"]
]);

const leafBlade = new Map<GameLanguage, string>([
    [GameLanguage.English, "Leaf Blade"],
    [GameLanguage.Portuguese, "Lâmina de Folha"]
]);

const psybeam = new Map<GameLanguage, string>([
    [GameLanguage.English, "Psybeam"],
    [GameLanguage.Portuguese, "Feixe Psíquico"]
]);

const mudBomb = new Map<GameLanguage, string>([
    [GameLanguage.English, "Mud Bomb"],
    [GameLanguage.Portuguese, "Bomba de Lama"]
]);

const suckerPunch = new Map<GameLanguage, string>([
    [GameLanguage.English, "Sucker Punch"],
    [GameLanguage.Portuguese, "Soco Enganador"]
]);

const ironHead = new Map<GameLanguage, string>([
    [GameLanguage.English, "Iron Head"],
    [GameLanguage.Portuguese, "Cabeça de Ferro"]
]);

const foulPlay = new Map<GameLanguage, string>([
    [GameLanguage.English, "Foul Play"],
    [GameLanguage.Portuguese, "Jogo Sujo"]
]);

const trailblaze = new Map<GameLanguage, string>([
    [GameLanguage.English, "Trailblaze"],
    [GameLanguage.Portuguese, "Desbravar"]
]);

const powerGem = new Map<GameLanguage, string>([
    [GameLanguage.English, "Power Gem"],
    [GameLanguage.Portuguese, "Gema Poderosa"]
]);

const payback = new Map<GameLanguage, string>([
    [GameLanguage.English, "Payback"],
    [GameLanguage.Portuguese, "Revide"]
]);

const closeCombat = new Map<GameLanguage, string>([
    [GameLanguage.English, "Close Combat"],
    [GameLanguage.Portuguese, "Corpo-a-corpo"]
]);

const crossChop = new Map<GameLanguage, string>([
    [GameLanguage.English, "Cross Chop"],
    [GameLanguage.Portuguese, "Golpe Cruzado"]
]);

const bubbleBeam = new Map<GameLanguage, string>([
    [GameLanguage.English, "Bubble Beam"],
    [GameLanguage.Portuguese, "Jato de Bolhas"]
]);

const liquidation = new Map<GameLanguage, string>([
    [GameLanguage.English, "Liquidation"],
    [GameLanguage.Portuguese, "Aquaríete"]
]);

const synchronoise = new Map<GameLanguage, string>([
    [GameLanguage.English, "Synchronoise"],
    [GameLanguage.Portuguese, "Barulho Sincronizado"]
]);

const karateChop = new Map<GameLanguage, string>([
    [GameLanguage.English, "Karate Chop"],
    [GameLanguage.Portuguese, "Golpe de Caratê"]
]);

const lowSweep = new Map<GameLanguage, string>([
    [GameLanguage.English, "Low Sweep"],
    [GameLanguage.Portuguese, "Movimento Baixo"]
]);

const counter = new Map<GameLanguage, string>([
    [GameLanguage.English, "Counter"],
    [GameLanguage.Portuguese, "Contra-atacar"]
]);

const lowKick = new Map<GameLanguage, string>([
    [GameLanguage.English, "Low Kick"],
    [GameLanguage.Portuguese, "Rasteira"]
]);

const snarl = new Map<GameLanguage, string>([
    [GameLanguage.English, "Snarl"],
    [GameLanguage.Portuguese, "Rosnado"]
]);

const psychicFangs = new Map<GameLanguage, string>([
    [GameLanguage.English, "Psychic Fangs"],
    [GameLanguage.Portuguese, "Caninos Psíquicos"]
]);

const scald = new Map<GameLanguage, string>([
    [GameLanguage.English, "Scald"],
    [GameLanguage.Portuguese, "Escaldada"]
]);

const dynamicPunch = new Map<GameLanguage, string>([
    [GameLanguage.English, "Dynamic Punch"],
    [GameLanguage.Portuguese, "Soco Dinâmico"]
]);

const submission = new Map<GameLanguage, string>([
    [GameLanguage.English, "Submission"],
    [GameLanguage.Portuguese, "Submissão"]
]);

const powerUpPunch = new Map<GameLanguage, string>([
    [GameLanguage.English, "Power-Up Punch"],
    [GameLanguage.Portuguese, "Soco Empoderador"]
]);

const psychoCut = new Map<GameLanguage, string>([
    [GameLanguage.English, "Psycho Cut"],
    [GameLanguage.Portuguese, "Corte Psíquico"]
]);

const focusBlast = new Map<GameLanguage, string>([
    [GameLanguage.English, "Focus Blast"],
    [GameLanguage.Portuguese, "Explosão Focalizada"]
]);

const futureSight = new Map<GameLanguage, string>([
    [GameLanguage.English, "Future Sight"],
    [GameLanguage.Portuguese, "Visão do Futuro"]
]);

const bulletPunch = new Map<GameLanguage, string>([
    [GameLanguage.English, "Bullet Punch"],
    [GameLanguage.Portuguese, "Soco Projétil"]
]);

const heavySlam = new Map<GameLanguage, string>([
    [GameLanguage.English, "Heavy Slam"],
    [GameLanguage.Portuguese, "Golpe Pesado"]
]);

const leafTornado = new Map<GameLanguage, string>([
    [GameLanguage.English, "Leaf Tornado"],
    [GameLanguage.Portuguese, "Tornado de Folhas"]
]);

const rockThrow = new Map<GameLanguage, string>([
    [GameLanguage.English, "Rock Throw"],
    [GameLanguage.Portuguese, "Lançamento de Rocha"]
]);

const rockBlast = new Map<GameLanguage, string>([
    [GameLanguage.English, "Rock Blast"],
    [GameLanguage.Portuguese, "Explosão de Rocha"]
]);

const highHorsepower = new Map<GameLanguage, string>([
    [GameLanguage.English, "High Horsepower"],
    [GameLanguage.Portuguese, "Potência Equina"]
]);

const incinerate = new Map<GameLanguage, string>([
    [GameLanguage.English, "Incinerate"],
    [GameLanguage.Portuguese, "Incinerar"]
]);

const hex = new Map<GameLanguage, string>([
    [GameLanguage.English, "Hex"],
    [GameLanguage.Portuguese, "Feitiço"]
]);

const zapCannon = new Map<GameLanguage, string>([
    [GameLanguage.English, "Zap Cannon"],
    [GameLanguage.Portuguese, "Canhão Zap"]
]);

const iceShard = new Map<GameLanguage, string>([
    [GameLanguage.English, "Ice Shard"],
    [GameLanguage.Portuguese, "Caco de Gelo"]
]);

const lick = new Map<GameLanguage, string>([
    [GameLanguage.English, "Lick"],
    [GameLanguage.Portuguese, "Lambida"]
]);

const astonish = new Map<GameLanguage, string>([
    [GameLanguage.English, "Astonish"],
    [GameLanguage.Portuguese, "Abismar"]
]);

const auroraBeam = new Map<GameLanguage, string>([
    [GameLanguage.English, "Aurora Beam"],
    [GameLanguage.Portuguese, "Raio Aurora"]
]);

const icyWind = new Map<GameLanguage, string>([
    [GameLanguage.English, "Icy Wind"],
    [GameLanguage.Portuguese, "Vento Congelante"]
]);

const frostBreath = new Map<GameLanguage, string>([
    [GameLanguage.English, "Frost Breath"],
    [GameLanguage.Portuguese, "Respiração de Gelo"]
]);

const sludge = new Map<GameLanguage, string>([
    [GameLanguage.English, "Sludge"],
    [GameLanguage.Portuguese, "Ataque de Lama"]
]);

const razorShell = new Map<GameLanguage, string>([
    [GameLanguage.English, "Razor Shell"],
    [GameLanguage.Portuguese, "Concha Navalha"]
]);

const avalanche = new Map<GameLanguage, string>([
    [GameLanguage.English, "Avalanche"],
    [GameLanguage.Portuguese, "Avalanche"]
]);

const nightShade = new Map<GameLanguage, string>([
    [GameLanguage.English, "Night Shade"],
    [GameLanguage.Portuguese, "Sombra Noturna"]
]);

const shadowPunch = new Map<GameLanguage, string>([
    [GameLanguage.English, "Shadow Punch"],
    [GameLanguage.Portuguese, "Soco Sombrio"]
]);

const viseGrip = new Map<GameLanguage, string>([
    [GameLanguage.English, "Vise Grip"],
    [GameLanguage.Portuguese, "Agarramento Compressor"]
]);

const energyBall = new Map<GameLanguage, string>([
    [GameLanguage.English, "Energy Ball"],
    [GameLanguage.Portuguese, "Bola de Energia"]
]);

const extrasensory = new Map<GameLanguage, string>([
    [GameLanguage.English, "Extrasensory"],
    [GameLanguage.Portuguese, "Extrassensorial"]
]);

const dragonPulse = new Map<GameLanguage, string>([
    [GameLanguage.English, "Dragon Pulse"],
    [GameLanguage.Portuguese, "Pulso do Dragão"]
]);

const dracoMeteor = new Map<GameLanguage, string>([
    [GameLanguage.English, "Draco Meteor"],
    [GameLanguage.Portuguese, "Meteoro do Dragão"]
]);

const blazeKick = new Map<GameLanguage, string>([
    [GameLanguage.English, "Blaze Kick"],
    [GameLanguage.Portuguese, "Chute Labareda"]
]);

const tripleAxel = new Map<GameLanguage, string>([
    [GameLanguage.English, "Triple Axel"],
    [GameLanguage.Portuguese, "Pinote Triplo"]
]);

const brutalSwing = new Map<GameLanguage, string>([
    [GameLanguage.English, "Brutal Swing"],
    [GameLanguage.Portuguese, "Balanço Violento"]
]);

const outrage = new Map<GameLanguage, string>([
    [GameLanguage.English, "Outrage"],
    [GameLanguage.Portuguese, "Ultraje"]
]);

const waterfall = new Map<GameLanguage, string>([
    [GameLanguage.English, "Waterfall"],
    [GameLanguage.Portuguese, "Cachoeira"]
]);

const hiddenPower = new Map<GameLanguage, string>([
    [GameLanguage.English, "Hidden Power"],
    [GameLanguage.Portuguese, "Poder Oculto"]
]);

const hornAttack = new Map<GameLanguage, string>([
    [GameLanguage.English, "Horn Attack"],
    [GameLanguage.Portuguese, "Ataque de Chifre"]
]);

const splash = new Map<GameLanguage, string>([
    [GameLanguage.English, "Splash"],
    [GameLanguage.Portuguese, "Borrifada"]
]);

const transform = new Map<GameLanguage, string>([
    [GameLanguage.English, "Transform"],
    [GameLanguage.Portuguese, "Transformação"]
]);

const lastResort = new Map<GameLanguage, string>([
    [GameLanguage.English, "Last Resort"],
    [GameLanguage.Portuguese, "Último Recurso"]
]);

const brine = new Map<GameLanguage, string>([
    [GameLanguage.English, "Brine"],
    [GameLanguage.Portuguese, "Salmoura"]
]);

const yawn = new Map<GameLanguage, string>([
    [GameLanguage.English, "Yawn"],
    [GameLanguage.Portuguese, "Bocejo"]
]);

const takeDown = new Map<GameLanguage, string>([
    [GameLanguage.English, "Take Down"],
    [GameLanguage.Portuguese, "Desmantelar"]
]);

const geomancy = new Map<GameLanguage, string>([
    [GameLanguage.English, "Geomancy"],
    [GameLanguage.Portuguese, "Geomancia"]
]);

const shadowSneak = new Map<GameLanguage, string>([
    [GameLanguage.English, "Shadow Sneak"],
    [GameLanguage.Portuguese, "Furtividade nas Sombras"]
]);

const meteorBeam = new Map<GameLanguage, string>([
    [GameLanguage.English, "Meteor Beam"],
    [GameLanguage.Portuguese, "Raio Meteórico"]
]);

const leafStorm = new Map<GameLanguage, string>([
    [GameLanguage.English, "Leaf Storm"],
    [GameLanguage.Portuguese, "Tempestade de Folhas"]
]);

const mirrorCoat = new Map<GameLanguage, string>([
    [GameLanguage.English, "Mirror Coat"],
    [GameLanguage.Portuguese, "Casaco Espelhado"]
]);

const triAttack = new Map<GameLanguage, string>([
    [GameLanguage.English, "Tri Attack"],
    [GameLanguage.Portuguese, "Triataque"]
]);

const muddyWater = new Map<GameLanguage, string>([
    [GameLanguage.English, "Muddy Water"],
    [GameLanguage.Portuguese, "Água Barrenta"]
]);

const auraSphere = new Map<GameLanguage, string>([
    [GameLanguage.English, "Aura Sphere"],
    [GameLanguage.Portuguese, "Aura Esférica"]
]);

const VCreate = new Map<GameLanguage, string>([
    [GameLanguage.English, "V-Create"],
    [GameLanguage.Portuguese, "Criação V"]
]);

const sacredFire = new Map<GameLanguage, string>([
    [GameLanguage.English, "Sacred Fire"],
    [GameLanguage.Portuguese, "Fogo Sagrado"]
]);

const icicleSpear = new Map<GameLanguage, string>([
    [GameLanguage.English, "Icicle Spear"],
    [GameLanguage.Portuguese, "Lança Congelada"]
]);

const mysticalFire = new Map<GameLanguage, string>([
    [GameLanguage.English, "Mystical Fire"],
    [GameLanguage.Portuguese, "Fogo Místico"]
]);

const magmaStorm = new Map<GameLanguage, string>([
    [GameLanguage.English, "Magma Storm"],
    [GameLanguage.Portuguese, "Tempestade de Magma"]
]);

const seedFlare = new Map<GameLanguage, string>([
    [GameLanguage.English, "Seed Flare"],
    [GameLanguage.Portuguese, "Semente Ofuscante"]
]);

const obstruct = new Map<GameLanguage, string>([
    [GameLanguage.English, "Obstruct"],
    [GameLanguage.Portuguese, "Obstruir"]
]);

const cut = new Map<GameLanguage, string>([
    [GameLanguage.English, "Cut"],
    [GameLanguage.Portuguese, "Cortar"]
]);

const hp = new Map<GameLanguage, string>([
    [GameLanguage.English, "HP"],
    [GameLanguage.Portuguese, "PS"]
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

const lockOn = new Map<GameLanguage, string>([
    [GameLanguage.English, "Lock On"],
    [GameLanguage.Portuguese, "Mirar"]
]);

const leafage = new Map<GameLanguage, string>([
    [GameLanguage.English, "Leafage"],
    [GameLanguage.Portuguese, "Folhagem"]
]);

const fusionFlare = new Map<GameLanguage, string>([
    [GameLanguage.English, "Fusion Flare"],
    [GameLanguage.Portuguese, "Chama da Fusão"]
]);

const acid = new Map<GameLanguage, string>([
    [GameLanguage.English, "Acid"],
    [GameLanguage.Portuguese, "Ácido"]
]);

const gust = new Map<GameLanguage, string>([
    [GameLanguage.English, "Gust"],
    [GameLanguage.Portuguese, "Lufada de Vento"]
]);

const fly = new Map<GameLanguage, string>([
    [GameLanguage.English, "Fly"],
    [GameLanguage.Portuguese, "Voar"]
]);

const crabhammer = new Map<GameLanguage, string>([
    [GameLanguage.English, "Crabhammer"],
    [GameLanguage.Portuguese, "Martelo Caranguejo"]
]);

const iceFang = new Map<GameLanguage, string>([
    [GameLanguage.English, "Ice Fang"],
    [GameLanguage.Portuguese, "Presa de Gelo"]
]);

const signalBeam = new Map<GameLanguage, string>([
    [GameLanguage.English, "Signal Beam"],
    [GameLanguage.Portuguese, "Feixe Sinalizador"]
]);

const thunderFang = new Map<GameLanguage, string>([
    [GameLanguage.English, "Thunder Fang"],
    [GameLanguage.Portuguese, "Presa Trovejante"]
]);

const translations = new Map<GameTranslatorKeys, Map<GameLanguage, string>>([
    [GameTranslatorKeys.VINE_WHIP, vineWhip],
    [GameTranslatorKeys.FRENZY_PLANT, franzyPlant],
    [GameTranslatorKeys.SLUDGE_BOMB, sludgeBomb],
    [GameTranslatorKeys.PETAL_BLIZZARD, petalBlizzard],
    [GameTranslatorKeys.SEED_BOMB, seedBomb],
    [GameTranslatorKeys.POWER_WHIP, powerWhip],
    [GameTranslatorKeys.RAZOR_LEAF, razorLeaf],
    [GameTranslatorKeys.SOLAR_BEAM, solarBeam],
    [GameTranslatorKeys.TACKLE, tackle],
    [GameTranslatorKeys.SCRATCH, scratch],
    [GameTranslatorKeys.EMBER, ember],
    [GameTranslatorKeys.FLAMETHROWER, flamethrower],
    [GameTranslatorKeys.FLAME_CHARGE, flameCharge],
    [GameTranslatorKeys.FLAME_BURST, flameBurst],
    [GameTranslatorKeys.FIRE_FANG, fireFang],
    [GameTranslatorKeys.FIRE_PUNCH, firePunch],
    [GameTranslatorKeys.FIRE_SPIN, fireSpin],
    [GameTranslatorKeys.FIRE_BLAST, fireBlast],
    [GameTranslatorKeys.OVERHEAT, overheat],
    [GameTranslatorKeys.BLAST_BURN, blastBurn],
    [GameTranslatorKeys.DRAGON_BREATH, dragonBreath],
    [GameTranslatorKeys.DRAGON_CLAW, dragonClaw],
    [GameTranslatorKeys.WING_ATTACK, wingAttack],
    [GameTranslatorKeys.AIR_SLASH, airSlash],
    [GameTranslatorKeys.BUBBLE, bubble],
    [GameTranslatorKeys.AQUA_JET, aquaJet],
    [GameTranslatorKeys.AQUA_TAIL, aquaTail],
    [GameTranslatorKeys.WATER_PULSE, waterPulse],
    [GameTranslatorKeys.BITE, bite],
    [GameTranslatorKeys.WATER_GUN, waterGun],
    [GameTranslatorKeys.FLASH_CANNON, flashCannon],
    [GameTranslatorKeys.HYDRO_CANNON, hydroCannon],
    [GameTranslatorKeys.HYDRO_PUMP, hydroPump],
    [GameTranslatorKeys.ICE_BEAM, iceBeam],
    [GameTranslatorKeys.SKULL_BASH, skullBash],
    [GameTranslatorKeys.BUG_BITE, bugBite],
    [GameTranslatorKeys.STRUGGLE, struggle],
    [GameTranslatorKeys.CONFUSION, confusion],
    [GameTranslatorKeys.STRUGGLE_BUG, struggleBug],
    [GameTranslatorKeys.BUG_BUZZ, bugBuzz],
    [GameTranslatorKeys.PSYCHIC, psychic],
    [GameTranslatorKeys.POISON_STING, poisonSting],
    [GameTranslatorKeys.INFESTATION, infestation],
    [GameTranslatorKeys.POISON_JAB, poisonJab],
    [GameTranslatorKeys.AERIAL_ACE, aerialAce],
    [GameTranslatorKeys.X_SCISSOR, xScissor],
    [GameTranslatorKeys.FELL_STINGER, fellStinger],
    [GameTranslatorKeys.DRILL_RUN, drillRun],
    [GameTranslatorKeys.QUICK_ATTACK, quickAttack],
    [GameTranslatorKeys.AIR_CUTTER, airCutter],
    [GameTranslatorKeys.TWISTER, twister],
    [GameTranslatorKeys.STEEL_WING, steelWind],
    [GameTranslatorKeys.BRAVE_BIRD, braveBird],
    [GameTranslatorKeys.HURRICANE, hurricane],
    [GameTranslatorKeys.FEATHER_DANCE, featherDance],
    [GameTranslatorKeys.BODY_SLAM, bodySlam],
    [GameTranslatorKeys.DIG, dig],
    [GameTranslatorKeys.CRUNCH, crunch],
    [GameTranslatorKeys.SHADOW_BALL, shadowBall],
    [GameTranslatorKeys.HYPER_BEAM, hyperBeam],
    [GameTranslatorKeys.PECK, peck],
    [GameTranslatorKeys.DRILL_PECK, drillPeck],
    [GameTranslatorKeys.SKY_ATTACK, skyAttack],
    [GameTranslatorKeys.GUNK_SHOT, gunkShot],
    [GameTranslatorKeys.POISON_FANG, poisonFang],
    [GameTranslatorKeys.WRAP, wrap],
    [GameTranslatorKeys.DRAGON_TAIL, dragonTail],
    [GameTranslatorKeys.DARK_PULSE, darkPulse],
    [GameTranslatorKeys.SLUDGE_WAVE, sludgeWave],
    [GameTranslatorKeys.ACID_SPRAY, acidSpray],
    [GameTranslatorKeys.THUNDER_SHOCK, thunderShock],
    [GameTranslatorKeys.DISCHARGE, discharge],
    [GameTranslatorKeys.SURF, surf],
    [GameTranslatorKeys.THUNDER, thunder],
    [GameTranslatorKeys.THUNDERBOLT, thunderbolt],
    [GameTranslatorKeys.WILD_CHARGE, wildCharge],
    [GameTranslatorKeys.THUNDER_PUNCH, thunderPunch],
    [GameTranslatorKeys.DISARMING_VOICE, disarmingVoice],
    [GameTranslatorKeys.SPARK, spark],
    [GameTranslatorKeys.VOLT_SWITCH, voltSwitch],
    [GameTranslatorKeys.CHARM, charm],
    [GameTranslatorKeys.BRICK_BREAK, brickBreak],
    [GameTranslatorKeys.GRASS_KNOT, grassKnot],
    [GameTranslatorKeys.MUD_SHOT, mudShot],
    [GameTranslatorKeys.SAND_TOMB, sandTomb],
    [GameTranslatorKeys.ROCK_SLIDE, rockSlide],
    [GameTranslatorKeys.ROCK_TOMB, rockTomb],
    [GameTranslatorKeys.METAL_CLAW, metalClaw],
    [GameTranslatorKeys.POWDER_SNOW, powderSnow],
    [GameTranslatorKeys.BLIZZARD, blizzard],
    [GameTranslatorKeys.GYRO_BALL, gyroBall],
    [GameTranslatorKeys.NIGHT_SLASH, nightSlash],
    [GameTranslatorKeys.BULLDOZE, bulldoze],
    [GameTranslatorKeys.EARTHQUAKE, earthquake],
    [GameTranslatorKeys.SCORCHING_SANDS, scorchingSands],
    [GameTranslatorKeys.SHADOW_CLAW, shadowClaw],
    [GameTranslatorKeys.ICE_PUNCH, icePunch],
    [GameTranslatorKeys.STONE_EDGE, stoneEdge],
    [GameTranslatorKeys.EARTH_POWER, earthPower],
    [GameTranslatorKeys.STOMP, stomp],
    [GameTranslatorKeys.MUD_SLAP, mudSlap],
    [GameTranslatorKeys.ROCK_SMASH, rockSmash],
    [GameTranslatorKeys.MEGAHORN, megahorn],
    [GameTranslatorKeys.BREAKING_SWIPE, breakingSwipe],
    [GameTranslatorKeys.SMACK_DOWN, smackDown],
    [GameTranslatorKeys.SUPER_POWER, superPower],
    [GameTranslatorKeys.ROCK_WRECKER, rockWrecker],
    [GameTranslatorKeys.FURY_CUTTER, furyCutter],
    [GameTranslatorKeys.IRON_TAIL, ironTail],
    [GameTranslatorKeys.DOUBLE_KICK, doubleKick],
    [GameTranslatorKeys.POUND, pound],
    [GameTranslatorKeys.ZEN_HEADBUTT, zenHeadbutt],
    [GameTranslatorKeys.MOONBLAST, moonblast],
    [GameTranslatorKeys.PSYSHOCK, psyshock],
    [GameTranslatorKeys.CHARGE_BEAM, chargeBeam],
    [GameTranslatorKeys.FAIRY_WIND, fairyWind],
    [GameTranslatorKeys.DAZZLING_GLEAM, dazzlingGleam],
    [GameTranslatorKeys.METEOR_MASH, meteorMash],
    [GameTranslatorKeys.WEATHER_BALL_FIRE, weatherBall],
    [GameTranslatorKeys.WEATHER_BALL_ICE, weatherBall],
    [GameTranslatorKeys.FEINT_ATTACK, feintAttack],
    [GameTranslatorKeys.HEAT_WAVE, heatWave],
    [GameTranslatorKeys.ANCIENT_POWER, ancientPower],
    [GameTranslatorKeys.PLAY_ROUGH, playRough],
    [GameTranslatorKeys.SWIFT, swift],
    [GameTranslatorKeys.OMINOUS_WIND, ominousWind],
    [GameTranslatorKeys.CROSS_POISON, crossPoison],
    [GameTranslatorKeys.BULLET_SEED, bulletSeed],
    [GameTranslatorKeys.MAGICAL_LEAF, magicalLeaf],
    [GameTranslatorKeys.LEAF_BLADE, leafBlade],
    [GameTranslatorKeys.PSYBEAM, psybeam],
    [GameTranslatorKeys.MUD_BOMB, mudBomb],
    [GameTranslatorKeys.SUCKER_PUNCH, suckerPunch],
    [GameTranslatorKeys.IRON_HEAD, ironHead],
    [GameTranslatorKeys.FOUL_PLAY, foulPlay],
    [GameTranslatorKeys.TRAILBLAZE, trailblaze],
    [GameTranslatorKeys.POWER_GEM, powerGem],
    [GameTranslatorKeys.PAYBACK, payback],
    [GameTranslatorKeys.CLOSE_COMBAT, closeCombat],
    [GameTranslatorKeys.CROSS_CHOP, crossChop],
    [GameTranslatorKeys.BUBBLE_BEAM, bubbleBeam],
    [GameTranslatorKeys.LIQUIDATION, liquidation],
    [GameTranslatorKeys.SYNCHRONOISE, synchronoise],
    [GameTranslatorKeys.KARATE_CHOP, karateChop],
    [GameTranslatorKeys.LOW_SWEEP, lowSweep],
    [GameTranslatorKeys.COUNTER, counter],
    [GameTranslatorKeys.LOW_KICK, lowKick],
    [GameTranslatorKeys.SNARL, snarl],
    [GameTranslatorKeys.PSYCHIC_FANGS, psychicFangs],
    [GameTranslatorKeys.SCALD, scald],
    [GameTranslatorKeys.WEATHER_BALL_WATER, weatherBall],
    [GameTranslatorKeys.DYNAMIC_PUNCH, dynamicPunch],
    [GameTranslatorKeys.SUBMISSION, submission],
    [GameTranslatorKeys.POWER_UP_PUNCH, powerUpPunch],
    [GameTranslatorKeys.PSYCHO_CUT, psychoCut],
    [GameTranslatorKeys.FOCUS_BLAST, focusBlast],
    [GameTranslatorKeys.FUTURE_SIGHT, futureSight],
    [GameTranslatorKeys.BULLET_PUNCH, bulletPunch],
    [GameTranslatorKeys.HEAVY_SLAM, heavySlam],
    [GameTranslatorKeys.LEAF_TORNADO, leafTornado],
    [GameTranslatorKeys.ROCK_THROW, rockThrow],
    [GameTranslatorKeys.ROCK_BLAST, rockBlast],
    [GameTranslatorKeys.HIGH_HORSEPOWER, highHorsepower],
    [GameTranslatorKeys.INCINERATE, incinerate],
    [GameTranslatorKeys.HEX, hex],
    [GameTranslatorKeys.ZAP_CANNON, zapCannon],
    [GameTranslatorKeys.ICE_SHARD, iceShard],
    [GameTranslatorKeys.LICK, lick],
    [GameTranslatorKeys.ASTONISH, astonish],
    [GameTranslatorKeys.AURORA_BEAM, auroraBeam],
    [GameTranslatorKeys.ICY_WIND, icyWind],
    [GameTranslatorKeys.FROST_BREATH, frostBreath],
    [GameTranslatorKeys.SLUDGE, sludge],
    [GameTranslatorKeys.RAZOR_SHELL, razorShell],
    [GameTranslatorKeys.AVALANCHE, avalanche],
    [GameTranslatorKeys.NIGHT_SHADE, nightShade],
    [GameTranslatorKeys.SHADOW_PUNCH, shadowPunch],
    [GameTranslatorKeys.VICE_GRIP, viseGrip],
    [GameTranslatorKeys.ENERGY_BALL, energyBall],
    [GameTranslatorKeys.EXTRASENSORY, extrasensory],
    [GameTranslatorKeys.DRAGON_PULSE, dragonPulse],
    [GameTranslatorKeys.DRACO_METEOR, dracoMeteor],
    [GameTranslatorKeys.BLAZE_KICK, blazeKick],
    [GameTranslatorKeys.TRIPLE_AXEL, tripleAxel],
    [GameTranslatorKeys.BRUTAL_SWING, brutalSwing],
    [GameTranslatorKeys.OUTRAGE, outrage],
    [GameTranslatorKeys.WATERFALL, waterfall],
    [GameTranslatorKeys.HIDDEN_POWER_BUG, hiddenPower],
    [GameTranslatorKeys.HIDDEN_POWER_DARK, hiddenPower],
    [GameTranslatorKeys.HIDDEN_POWER_DRAGON, hiddenPower],
    [GameTranslatorKeys.HIDDEN_POWER_ELECTRIC, hiddenPower],
    [GameTranslatorKeys.HIDDEN_POWER_FIGHTING, hiddenPower],
    [GameTranslatorKeys.HIDDEN_POWER_FIRE, hiddenPower],
    [GameTranslatorKeys.HIDDEN_POWER_FLYING, hiddenPower],
    [GameTranslatorKeys.HIDDEN_POWER_GHOST, hiddenPower],
    [GameTranslatorKeys.HIDDEN_POWER_GRASS, hiddenPower],
    [GameTranslatorKeys.HIDDEN_POWER_GROUND, hiddenPower],
    [GameTranslatorKeys.HIDDEN_POWER_ICE, hiddenPower],
    [GameTranslatorKeys.HIDDEN_POWER_POISON, hiddenPower],
    [GameTranslatorKeys.HIDDEN_POWER_PSYCHIC, hiddenPower],
    [GameTranslatorKeys.HIDDEN_POWER_ROCK, hiddenPower],
    [GameTranslatorKeys.HIDDEN_POWER_STEEL, hiddenPower],
    [GameTranslatorKeys.HIDDEN_POWER_WATER, hiddenPower],
    [GameTranslatorKeys.HORN_ATTACK, hornAttack],
    [GameTranslatorKeys.SPLASH, splash],
    [GameTranslatorKeys.TRANSFORM, transform],
    [GameTranslatorKeys.LAST_RESORT, lastResort],
    [GameTranslatorKeys.BRINE, brine],
    [GameTranslatorKeys.YAWN, yawn],
    [GameTranslatorKeys.TAKE_DOWN, takeDown],
    [GameTranslatorKeys.GEOMANCY, geomancy],
    [GameTranslatorKeys.SHADOW_SNEAK, shadowSneak],
    [GameTranslatorKeys.METEOR_BEAM, meteorBeam],
    [GameTranslatorKeys.LEAF_STORM, leafStorm],
    [GameTranslatorKeys.MIRROR_COAT, mirrorCoat],
    [GameTranslatorKeys.TRI_ATTACK, triAttack],
    [GameTranslatorKeys.WEATHER_BALL_ROCK, weatherBall],
    [GameTranslatorKeys.MUDDY_WATER, muddyWater],
    [GameTranslatorKeys.AURA_SPHERE, auraSphere],
    [GameTranslatorKeys.V_CREATE, VCreate],
    [GameTranslatorKeys.SACRED_FIRE, sacredFire],
    [GameTranslatorKeys.ICICLE_SPEAR, icicleSpear],
    [GameTranslatorKeys.MYSTICAL_FIRE, mysticalFire],
    [GameTranslatorKeys.MAGMA_STORM, magmaStorm],
    [GameTranslatorKeys.SEED_FLARE, seedFlare],
    [GameTranslatorKeys.OBSTRUCT, obstruct],
    [GameTranslatorKeys.CUT, cut],
    [GameTranslatorKeys.HP, hp],
    [GameTranslatorKeys.AttackSearch, attackSearch],
    [GameTranslatorKeys.DefenseSearch, defenseSearch],
    [GameTranslatorKeys.HPSearch, hpSearch],
    [GameTranslatorKeys.CP, cp],
    [GameTranslatorKeys.Great, great],
    [GameTranslatorKeys.Master, master],
    [GameTranslatorKeys.GreatLeague, greatLeague],
    [GameTranslatorKeys.UltraLeague, ultraLeague],
    [GameTranslatorKeys.MasterLeague, masterLeague],
    [GameTranslatorKeys.LOCK_ON, lockOn],
    [GameTranslatorKeys.WEATHER_BALL_NORMAL, weatherBall],
    [GameTranslatorKeys.LEAFAGE, leafage],
    [GameTranslatorKeys.FUSION_FLARE, fusionFlare],
    [GameTranslatorKeys.ACID, acid],
    [GameTranslatorKeys.GUST, gust],
    [GameTranslatorKeys.FLY, fly],
    [GameTranslatorKeys.CRABHAMMER, crabhammer],
    [GameTranslatorKeys.ICE_FANG, iceFang],
    [GameTranslatorKeys.SIGNAL_BEAM, signalBeam],
    [GameTranslatorKeys.THUNDER_FANG, thunderFang],
]);

const gameTranslator = (key: GameTranslatorKeys, language: GameLanguage) => translations.get(key)?.get(language) ?? (GameTranslatorKeys[key] ? GameTranslatorKeys[key].toString() : key?.toString());
export const isTranslated = (key: GameTranslatorKeys) => translations.has(key);

export default gameTranslator;