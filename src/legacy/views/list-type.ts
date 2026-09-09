/**
 * The mode the Pokédex grid renders in. Kept in its own module so leaf components
 * (miniatures, badges) can import it without pulling in the whole Pokédex view.
 */
export enum ListType {
	POKEDEX,
	GREAT_LEAGUE,
	ULTRA_LEAGUE,
	MASTER_LEAGUE,
	RAID,
}
