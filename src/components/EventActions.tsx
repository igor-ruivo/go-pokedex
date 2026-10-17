import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { R } from '../lib/nav';

/** The buttons at the foot of an event card: copy the link to the card (the Events tab opens it expanded) and read the announcement. */
export const EventActions = ({
	eventId,
	announcementUrl,
}: {
	eventId: string;
	announcementUrl: string | undefined;
}) => {
	const { t } = useTranslation(['calendar']);
	const [copied, setCopied] = useState(false);
	const copyLink = async () => {
		try {
			await navigator.clipboard.writeText(`${window.location.origin}${R.calendarEvent(eventId)}`);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1800);
		} catch {
			// no clipboard access (an insecure page, a blocked permission): the button simply does nothing
		}
	};
	return (
		<div className='r-event-actions'>
			<button
				type='button'
				className='r-ext-link r-copy-link'
				data-done={copied ? '' : undefined}
				onClick={(e) => {
					e.stopPropagation();
					void copyLink();
				}}
			>
				{copied ? t('calendar:events.linkCopied') : t('calendar:events.copyLink')}
				<span aria-hidden='true'>{copied ? '✓' : '⧉'}</span>
			</button>
			{announcementUrl && (
				<a
					className='r-ext-link'
					href={announcementUrl}
					target='_blank'
					rel='noopener noreferrer'
					onClick={(e) => e.stopPropagation()}
				>
					{t('calendar:events.readAnnouncement')}
					<span aria-hidden='true'>↗</span>
				</a>
			)}
		</div>
	);
};
