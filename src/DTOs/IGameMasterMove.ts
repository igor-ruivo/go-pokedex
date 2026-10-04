import type { GameLanguage } from '../contexts/language-context';

export interface IGameMasterMove {
	moveId: string;
	vId: string;
	type: string;
	isFast: boolean;
	isSuperMega?: boolean;
	pvpPower: number;
	pvePower: number;
	pvpCooldown: number;
	pveCooldown: number;
	/** Seconds into the PvE animation before the hit lands. Absent for synthetic moves. */
	pveDamageWindowStart?: number;
	pveDamageWindowEnd?: number;
	pvpEnergy: number;
	pveEnergy: number;
	buffs?: BuffsType;
	moveName: Record<GameLanguage, string>;
	/** Only on the typed variants of one move (Hidden Power): the name without the type. */
	groupName?: Record<GameLanguage, string>;
}

export interface BuffsType {
	buffActivationChance: number;
	[key: string]: number;
}
