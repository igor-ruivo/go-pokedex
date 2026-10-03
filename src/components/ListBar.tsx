import type { ReactNode } from 'react';

interface ListBarProps {
	/** Count / status text, drawn as a section heading with a trailing rule. */
	label: ReactNode;
	/** Extra inline controls that belong to the label (e.g. a "?" hint toggle). */
	labelExtra?: ReactNode;
	/** Applied-filter chips + Clear, shown on their own line below. */
	applied?: ReactNode;
	/** The filter / sort chips, shown on the right of the rule, centered on it. */
	children?: ReactNode;
}

/**
 * The one-line header shared by every list: "<count> ———— [filter] [sort]".
 * The rule after the count is vertically centered with the chips.
 */
export const ListBar = ({ label, labelExtra, applied, children }: ListBarProps) => (
	<>
		<div className='r-listbar'>
			<div className='r-section-h r-listbar-h'>
				<span>{label}</span>
				{labelExtra}
			</div>
			{children}
		</div>
		{applied}
	</>
);
