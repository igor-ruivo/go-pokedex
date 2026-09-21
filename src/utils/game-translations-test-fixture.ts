import { GameLanguage } from '../contexts/language-context';
import type { GameTranslationsPayload } from './game-translations-store';

// Mirrors real `game-translations.json` shape/values (en + pt_br only — the
// two locales exercised by the search-string builder tests) so those tests
// don't depend on the network. Seed with `__setGameTranslationsForTests`
// (game-translations-store.ts) in a `beforeAll`, not imported by app code.
export const gameTranslationsTestFixture: GameTranslationsPayload = {
	translations: {
		attackSearch: { [GameLanguage.en]: 'attack', [GameLanguage.ptbr]: 'ataque' },
		defenseSearch: { [GameLanguage.en]: 'defense', [GameLanguage.ptbr]: 'defesa' },
		hpSearch: { [GameLanguage.en]: 'hp', [GameLanguage.ptbr]: 'ps' },
		cpSearch: { [GameLanguage.en]: 'cp', [GameLanguage.ptbr]: 'pc' },
		shadowSearch: { [GameLanguage.en]: 'shadow', [GameLanguage.ptbr]: 'sombroso' },
		legendary: { [GameLanguage.en]: 'legendary', [GameLanguage.ptbr]: 'lendário' },
		mythical: { [GameLanguage.en]: 'mythical', [GameLanguage.ptbr]: 'mítico' },
		megaEvolve: { [GameLanguage.en]: 'megaevolve', [GameLanguage.ptbr]: 'megaevolui' },
		ultraBeast: { [GameLanguage.en]: 'ultrabeast', [GameLanguage.ptbr]: 'ultracriatura' },
		favorite: { [GameLanguage.en]: 'favorite', [GameLanguage.ptbr]: 'favorito' },
		dynamaxSearch: { [GameLanguage.en]: 'dynamax', [GameLanguage.ptbr]: 'dinamax' },
		fusionSearch: { [GameLanguage.en]: 'fusion', [GameLanguage.ptbr]: 'fusão' },
		gigantamaxSearch: { [GameLanguage.en]: 'gigantamax', [GameLanguage.ptbr]: 'gigamax' },
		backgroundSearch: { [GameLanguage.en]: 'background', [GameLanguage.ptbr]: 'fundo' },
		specialBackgroundSearch: {
			[GameLanguage.en]: 'specialbackground',
			[GameLanguage.ptbr]: 'fundoespecial',
		},
		shinySearch: { [GameLanguage.en]: 'shiny', [GameLanguage.ptbr]: 'brilhante' },
		costumeSearch: { [GameLanguage.en]: 'costume', [GameLanguage.ptbr]: 'traje' },
		tradedSearch: { [GameLanguage.en]: 'traded', [GameLanguage.ptbr]: 'trocado' },
		cpDisplay: { [GameLanguage.en]: 'CP', [GameLanguage.ptbr]: 'PC' },
		raidDisplay: { [GameLanguage.en]: 'raid', [GameLanguage.ptbr]: 'Reide' },
		shadowDisplay: { [GameLanguage.en]: 'Shadow', [GameLanguage.ptbr]: 'Sombroso' },
		fastAttackHeader: { [GameLanguage.en]: 'Fast Attack', [GameLanguage.ptbr]: 'Ataque Ágil' },
		chargedAttackHeader: {
			[GameLanguage.en]: 'Charged Attack',
			[GameLanguage.ptbr]: 'Ataque Carregado',
		},
		greatLeagueLong: { [GameLanguage.en]: 'Great League', [GameLanguage.ptbr]: 'Grande Liga' },
		ultraLeagueLong: { [GameLanguage.en]: 'Ultra League', [GameLanguage.ptbr]: 'Ultra-liga' },
		masterLeagueLong: { [GameLanguage.en]: 'Master League', [GameLanguage.ptbr]: 'Liga Mestra' },
		greatLeagueShort: { [GameLanguage.en]: 'Great', [GameLanguage.ptbr]: 'Grande' },
		ultraLeagueShort: { [GameLanguage.en]: 'Ultra', [GameLanguage.ptbr]: 'Ultra' },
		masterLeagueShort: { [GameLanguage.en]: 'Master', [GameLanguage.ptbr]: 'Mestra' },
	},
	types: Object.fromEntries(
		[
			['bug', 'Bug', 'Inseto'],
			['dark', 'Dark', 'Sombrio'],
			['dragon', 'Dragon', 'Dragão'],
			['electric', 'Electric', 'Elétrico'],
			['fairy', 'Fairy', 'Fada'],
			['fighting', 'Fighting', 'Lutador'],
			['fire', 'Fire', 'Fogo'],
			['flying', 'Flying', 'Voador'],
			['ghost', 'Ghost', 'Fantasma'],
			['grass', 'Grass', 'Planta'],
			['ground', 'Ground', 'Terrestre'],
			['ice', 'Ice', 'Gelo'],
			['normal', 'Normal', 'Normal'],
			['poison', 'Poison', 'Venenoso'],
			['psychic', 'Psychic', 'Psíquico'],
			['rock', 'Rock', 'Pedra'],
			['steel', 'Steel', 'Aço'],
			['water', 'Water', 'Água'],
		].map(([type, en, ptbr]) => [
			type,
			{
				display: { [GameLanguage.en]: en, [GameLanguage.ptbr]: ptbr },
				search: { [GameLanguage.en]: en.toLowerCase(), [GameLanguage.ptbr]: ptbr.toLowerCase() },
			},
		])
	),
};
