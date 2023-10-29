import { Language } from "../contexts/language-context";

export enum MovesTranslatorKeys {
    //normal
    TACKLE,
    SCRATCH,

    //grass
    VINE_WHIP,
    RAZOR_LEAF,
    FRENZY_PLANT,
    PETAL_BLIZZARD,
    SEED_BOMB,
    POWER_WHIP,
    SOLAR_BEAM,

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

    //dragon
    DRAGON_BREATH,
    DRAGON_CLAW,

    //flying
    WING_ATTACK,
    AIR_SLASH,

    //water
    BUBBLE,
    AQUA_JET,
    AQUA_TAIL,
    WATER_PULSE
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
]);

const movesTranslator = (key: MovesTranslatorKeys, language: Language) => translations.get(key)?.get(language) ?? (MovesTranslatorKeys[key] ? MovesTranslatorKeys[key].toString() : key?.toString());

export default movesTranslator;