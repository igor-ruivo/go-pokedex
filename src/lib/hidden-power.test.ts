import { describe, expect, it } from 'vitest';

import { GameLanguage } from '../contexts/language-context';
import type { IGameMasterMove } from '../DTOs/IGameMasterMove';
import { baseMoveId, baseMoveIds, HIDDEN_POWER, isHiddenPowerVariant, withGenericHiddenPower } from './hidden-power';
import { moveOwners } from './moves';

/** The same text in every language the moves are named in. */
const names = (text: string): Record<GameLanguage, string> => ({
	[GameLanguage.en]: text,
	[GameLanguage.ptbr]: text,
	[GameLanguage.de]: text,
	[GameLanguage.es]: text,
	[GameLanguage.esMx]: text,
	[GameLanguage.fr]: text,
	[GameLanguage.hi]: text,
	[GameLanguage.id]: text,
	[GameLanguage.it]: text,
	[GameLanguage.ja]: text,
	[GameLanguage.ko]: text,
	[GameLanguage.ru]: text,
	[GameLanguage.th]: text,
	[GameLanguage.tr]: text,
	[GameLanguage.zhHant]: text,
});

const move = (moveId: string, type: string, extra: Partial<IGameMasterMove> = {}): IGameMasterMove => ({
	moveId,
	vId: '1',
	type,
	isFast: true,
	pvpPower: 9,
	pvePower: 15,
	pvpCooldown: 1.5,
	pveCooldown: 1.5,
	pvpEnergy: 8,
	pveEnergy: 15,
	moveName: names(moveId),
	...extra,
});

const hp = (type: string) =>
	move(`HIDDEN_POWER_${type.toUpperCase()}`, type, {
		moveName: names(`Hidden Power ${type}`),
		groupName: names('Hidden Power'),
	});

describe('Hidden Power ids', () => {
	it('knows a typed variant from any other move, the generic one included', () => {
		expect(isHiddenPowerVariant('HIDDEN_POWER_PSYCHIC')).toBe(true);
		expect(isHiddenPowerVariant('HIDDEN_POWER')).toBe(false);
		expect(isHiddenPowerVariant('WEATHER_BALL_FIRE')).toBe(false);
		expect(isHiddenPowerVariant('HIDDEN_POWERFUL')).toBe(false);
	});

	it('lists every variant as the generic Hidden Power, and leaves other moves alone', () => {
		expect(baseMoveId('HIDDEN_POWER_FIRE')).toBe(HIDDEN_POWER);
		expect(baseMoveId('WEATHER_BALL_FIRE')).toBe('WEATHER_BALL_FIRE');
		expect(baseMoveIds(['TACKLE', 'HIDDEN_POWER_BUG', 'HIDDEN_POWER_ICE', 'TACKLE'])).toEqual(['TACKLE', HIDDEN_POWER]);
	});
});

describe('withGenericHiddenPower', () => {
	const moves = Object.fromEntries(
		[
			move('TACKLE', 'normal'),
			hp('fire'),
			hp('psychic'),
			hp('water'),
			move('WEATHER_BALL_FIRE', 'fire'),
			move('WEATHER_BALL_ICE', 'ice'),
		].map((m) => [m.moveId, m])
	);

	it('replaces the variants with one Normal-type Hidden Power named without a type', () => {
		const shown = withGenericHiddenPower(moves);
		expect(Object.keys(shown).filter((id) => id.startsWith('HIDDEN_POWER'))).toEqual([HIDDEN_POWER]);
		expect(shown[HIDDEN_POWER]).toMatchObject({ moveId: HIDDEN_POWER, type: 'normal', pvePower: 15, pvpPower: 9 });
		expect(shown[HIDDEN_POWER].moveName.en).toBe('Hidden Power');
	});

	it('keeps the other moves, Weather Ball’s typed variants included, as they are', () => {
		const shown = withGenericHiddenPower(moves);
		expect(shown.TACKLE).toBe(moves.TACKLE);
		expect(shown.WEATHER_BALL_FIRE).toBe(moves.WEATHER_BALL_FIRE);
		expect(shown.WEATHER_BALL_ICE).toBe(moves.WEATHER_BALL_ICE);
	});

	it('does not change the table it is given, and returns one without Hidden Power as it is', () => {
		const copy = structuredClone(moves);
		withGenericHiddenPower(moves);
		expect(moves).toEqual(copy);
		const without = { TACKLE: move('TACKLE', 'normal') };
		expect(withGenericHiddenPower(without)).toBe(without);
	});
});

describe('moveOwners for Hidden Power', () => {
	const pokemon = (fastMoves: Array<string>) => ({ fastMoves, chargedMoves: [], extraChargedMoves: [] });

	it('finds every Pokémon that has any variant under the generic id, and the exact id for any other move', () => {
		const gm = {
			starmie: pokemon(['TACKLE', 'HIDDEN_POWER_WATER', 'HIDDEN_POWER_FIRE']),
			porygon: pokemon(['HIDDEN_POWER_ICE']),
			pidgey: pokemon(['TACKLE']),
		};
		const ownerIds = (moveId: string) =>
			moveOwners(moveId, gm).map((owner) => Object.keys(gm).find((id) => gm[id as keyof typeof gm] === owner));
		expect(ownerIds(HIDDEN_POWER)).toEqual(['starmie', 'porygon']);
		expect(ownerIds('TACKLE')).toEqual(['starmie', 'pidgey']);
	});
});
