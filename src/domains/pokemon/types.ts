export interface Pokemon {
	id: number;
	name: string;
	types: Array<string>;
	baseStats: {
		attack: number;
		defense: number;
		stamina: number;
	};
	image: string;
}
