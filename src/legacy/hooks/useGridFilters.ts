import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { PokemonTypes } from '../DTOs/PokemonTypes';

export interface GridFilters {
	familyTree: boolean;
	showMega: boolean;
	showShadow: boolean;
	showXL: boolean;
	type1Filter: PokemonTypes | undefined;
	type2Filter: PokemonTypes | undefined;
	toggleFamilyTree: () => void;
	toggleShowMega: () => void;
	toggleShowShadow: () => void;
	toggleShowXL: () => void;
	updateType1: (newType: PokemonTypes | undefined) => void;
	updateType2: (newType: PokemonTypes | undefined) => void;
}

// The numeric enum's string names ('Water', 'Fire', ...) — this is also what the
// rest of the app stores at runtime for a selected type.
const TYPE_NAMES = Object.keys(PokemonTypes).filter((key) => Number.isNaN(Number(key)));

const asType = (raw: string | null): PokemonTypes | undefined =>
	raw && TYPE_NAMES.includes(raw) ? (raw as unknown as PokemonTypes) : undefined;

/**
 * The Pokédex / league grid filters, stored in the URL query string so a filtered
 * view is shareable and survives the back button. Booleans default to `true` and
 * only appear in the URL (`?mega=0`) once switched off.
 */
export const useGridFilters = (): GridFilters => {
	const [params, setParams] = useSearchParams();

	const patch = useCallback(
		(mutate: (next: URLSearchParams) => void) => {
			setParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					mutate(next);
					return next;
				},
				{ replace: true }
			);
		},
		[setParams]
	);

	const toggleBool = useCallback(
		(key: string) => {
			patch((next) => (next.get(key) === '0' ? next.delete(key) : next.set(key, '0')));
		},
		[patch]
	);

	const type1Filter = asType(params.get('type'));
	const type2Filter = type1Filter ? asType(params.get('type2')) : undefined;

	const updateType1 = useCallback(
		(newType: PokemonTypes | undefined) => {
			patch((next) => {
				if (!newType) {
					next.delete('type');
					next.delete('type2');
					return;
				}
				next.set('type', String(newType));
				if (String(newType) === next.get('type2')) {
					next.delete('type2');
				}
			});
		},
		[patch]
	);

	const updateType2 = useCallback(
		(newType: PokemonTypes | undefined) => {
			patch((next) => (newType ? next.set('type2', String(newType)) : next.delete('type2')));
		},
		[patch]
	);

	const toggleFamilyTree = useCallback(() => toggleBool('family'), [toggleBool]);
	const toggleShowMega = useCallback(() => toggleBool('mega'), [toggleBool]);
	const toggleShowShadow = useCallback(() => toggleBool('shadow'), [toggleBool]);
	const toggleShowXL = useCallback(() => toggleBool('xl'), [toggleBool]);

	return useMemo(
		() => ({
			familyTree: params.get('family') !== '0',
			showMega: params.get('mega') !== '0',
			showShadow: params.get('shadow') !== '0',
			showXL: params.get('xl') !== '0',
			type1Filter,
			type2Filter,
			toggleFamilyTree,
			toggleShowMega,
			toggleShowShadow,
			toggleShowXL,
			updateType1,
			updateType2,
		}),
		[
			params,
			type1Filter,
			type2Filter,
			toggleFamilyTree,
			toggleShowMega,
			toggleShowShadow,
			toggleShowXL,
			updateType1,
			updateType2,
		]
	);
};
