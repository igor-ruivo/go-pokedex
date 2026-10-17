import { useLanguage } from '../contexts/language-context';
import { gblRankMedal } from '../lib/gbl';

/**
 * The rank an encounter of the GO Battle League is met at, drawn as the game does it: a shield with its rank for the lower ranks, a
 * numbered medal with a ball in its ring for the rating ranks. `exact`: a rank-up encounter (at that rank); otherwise a standard one,
 * from that rank on ("6+").
 */
export const GblRankBadge = ({ rank, exact }: { rank: number; exact: boolean }) => {
	const { currentLanguage } = useLanguage();
	const medal = gblRankMedal(rank, exact);
	return (
		<span className='r-gbl-rank' data-numbered={medal.ring ? '' : undefined} aria-hidden='true'>
			<img src={medal.medal} alt='' loading='lazy' />
			{medal.ring && (
				<img
					className='r-gbl-rank-ring'
					src={medal.ring.image}
					alt=''
					loading='lazy'
					style={{ left: `${medal.ring.x}%`, top: `${medal.ring.y}%`, width: `${medal.ring.width}%` }}
				/>
			)}
			<b>{medal.plus ? `${medal.rank}+` : medal.rank.toLocaleString(currentLanguage)}</b>
		</span>
	);
};
