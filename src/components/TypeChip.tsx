import { useLanguage } from '../contexts/language-context';
import { typeVar } from '../lib/types';
import { gameTypeDisplayTranslator } from '../utils/GameTranslator';

/** A Pokémon type as the app's standard coloured pill (`.r-eff-t`), named in the player's in-game language. */
export const TypeChip = ({
	type,
	className,
	children,
}: {
	type: string;
	className?: string;
	children?: React.ReactNode;
}) => {
	const { currentGameLanguage: gl } = useLanguage();
	return (
		<span className={className ? `r-eff-t ${className}` : 'r-eff-t'} style={{ ['--tc' as string]: typeVar(type) }}>
			{gameTypeDisplayTranslator(type, gl) || type}
			{children}
		</span>
	);
};
