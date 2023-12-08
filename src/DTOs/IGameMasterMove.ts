export interface IGameMasterMove {
    moveId: string,
    vId: string,
    type: string,
    isFast: boolean,
    pvpPower: number,
    pvePower: number,
    pvpDuration: number,
    pveDuration: number,
    pvpEnergyDelta: number,
    pveEnergyDelta: number,
    pvpBuffs?: BuffEntry
}

interface BuffEntry {
    chance: number,
    buffs: Buff[]
}

export interface Buff {
    buff: string,
    quantity: number
}