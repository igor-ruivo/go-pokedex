export interface IGameMasterMove {
    moveId: string,
    vId: string,
    type: string,
    isFast: boolean,
    pvpPower: number,
    pvePower: number,
    pvpCooldown: number,
    pveCooldown: number,
    pvpEnergy: number,
    pveEnergy: number,
    buffs?: BuffsType
}

export interface BuffsType  {
    buffActivationChance: number;
    [key: string]: number;
};