import type { CSSProperties } from 'react';

import type { IMilestoneBonuses } from '../DTOs/INews';
import { bonusBullet, DEFAULT_BONUS_ICON } from './BonusBullet';
import { RichText } from './RichText';
import { SparkleIcon } from './SparkleIcon';

/** The two colours a tier's header goes from, as the custom properties its style reads. */
const headerColors = (colors: readonly [string, string]): CSSProperties & Record<'--mc' | '--mc2', string> => ({
	'--mc': colors[0],
	'--mc2': colors[1],
});

/**
 * The major milestone bonuses of a season or of an event with a GO Pass, one row per tier: the tier and the rank that earns it on
 * the left, what it gives on the right. Each bonus has the icon of what it gives (candy, Candy XL, gifts, incense, or the egg with
 * the XP and the Stardust of hatching), found by keywords in its English text, and the sparkle of bonuses when it has none. The
 * English version of the same milestones is the reference for the keywords, whatever the language shown: the bonuses are in the
 * same places in every language.
 */
export const SeasonMilestones = ({
	milestones,
	reference,
}: {
	milestones: IMilestoneBonuses;
	/** The same milestones in English. */
	reference?: IMilestoneBonuses | undefined;
}) => (
	<section className='r-milestones' aria-label={milestones.title}>
		<h3 className='r-milestones-title'>
			<SparkleIcon className='r-section-h-icon' />
			{milestones.title}
		</h3>
		{milestones.intro && milestones.intro.length > 0 && (
			<RichText blocks={milestones.intro} className='r-milestones-intro' />
		)}
		<ol className='r-card r-milestones-list'>
			{milestones.tiers.map((tier, i) => {
				const english = reference?.tiers.length === milestones.tiers.length ? reference.tiers[i] : undefined;
				return (
					<li key={i} className='r-milestone' style={tier.colors ? headerColors(tier.colors) : undefined}>
						<div className='r-milestone-tier'>
							<b>{tier.tier}</b>
							{tier.rank && <span>{tier.rank}</span>}
						</div>
						<RichText
							blocks={tier.blocks}
							bullet={bonusBullet(tier.blocks, english?.blocks)}
							fallbackBullet={DEFAULT_BONUS_ICON}
						/>
					</li>
				);
			})}
		</ol>
	</section>
);
