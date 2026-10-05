import type { ReactNode } from 'react';

import type { IRichBlock } from '../DTOs/IRichText';
import { blockText, BONUS_ICON_URL, type BonusIconKey, bonusIcons } from '../lib/milestone-icons';
import { SparkleIcon } from './SparkleIcon';

/** How far down (in px) each of the candies of a count sits, so that they do not line up. */
const COPY_HEIGHTS = [3, 0, 6, 1, 4];

/** The icons of a bonus as pictures; the single vials of a Stardust multiplier float over the two-vial picture instead of widening the row. */
const pictures = (icons: ReadonlyArray<BonusIconKey>): Array<ReactNode> => {
	const out: Array<ReactNode> = [];
	for (let i = 0; i < icons.length; i++) {
		const key = icons[i];
		if (key === 'stardust') {
			let vials = 0;
			while (icons[i + 1] === 'stardustVial') {
				vials++;
				i++;
			}
			out.push(
				<span key={`stardust-${i}`} className='r-stardust-stack'>
					<img src={BONUS_ICON_URL.stardust} alt='' loading='lazy' />
					{Array.from({ length: vials }, (_, v) => (
						<img
							key={v}
							className='r-stardust-vial'
							src={BONUS_ICON_URL.stardustVial}
							alt=''
							loading='lazy'
							style={{ ['--v' as string]: v }}
						/>
					))}
				</span>
			);
		} else if (icons[i + 1] === key) {
			// a count of the same candy: smaller pictures side by side in the room of one, each at a slightly different height
			let count = 1;
			while (icons[i + 1] === key) {
				count++;
				i++;
			}
			out.push(
				<span key={`${key}-${i}`} className='r-stardust-stack'>
					{Array.from({ length: count }, (_, v) => (
						<img
							key={v}
							className='r-icon-copy'
							src={BONUS_ICON_URL[key]}
							alt=''
							loading='lazy'
							style={{
								['--v' as string]: v,
								['--n' as string]: count,
								['--y' as string]: COPY_HEIGHTS[v % COPY_HEIGHTS.length],
							}}
						/>
					))}
				</span>
			);
		} else {
			out.push(<img key={`${key}-${i}`} data-icon={key} src={BONUS_ICON_URL[key]} alt='' loading='lazy' />);
		}
	}
	return out;
};

/** The icon of a bonus that has none of its own, drawn only next to bonuses that do. */
export const DEFAULT_BONUS_ICON = (
	<span className='r-milestone-icons'>
		<SparkleIcon className='r-milestone-bullet' />
	</span>
);

/**
 * The icons of one bonus or reward: what it gives (candy, gifts, incense, the egg with the XP and the Stardust of hatching, a Lucky
 * Egg…), found by keywords in its English text. Nothing when there is none (the list decides whether that gets the default icon).
 */
export const BonusIcons = ({ englishText }: { englishText: string }) => {
	const icons = bonusIcons(englishText);
	return icons.length > 0 ? <span className='r-milestone-icons'>{pictures(icons)}</span> : null;
};

/**
 * The bullet of each bonus or reward of a list of blocks. `reference` is the same list in English: the points are in the same places
 * in every language, so the keywords are searched in the English one whatever the language shown (and in the point itself when the
 * two lists do not line up).
 */
export const bonusBullet = (blocks: ReadonlyArray<IRichBlock>, reference?: ReadonlyArray<IRichBlock>) => {
	const bulletOf = (block: IRichBlock, index: number): ReactNode => {
		const englishText = blockText(reference?.length === blocks.length ? reference[index] : block);
		return bonusIcons(englishText).length > 0 ? <BonusIcons englishText={englishText} /> : null;
	};
	return bulletOf;
};
