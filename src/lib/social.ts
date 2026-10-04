/**
 * The project's social links. A link with no address is still shown (as a button that goes nowhere yet); put the invite here
 * and it becomes a real link in the footer and on the About page at once.
 */
export const SOCIAL_LINKS = {
	/** The Discord server's invite link, e.g. 'https://discord.gg/xxxxxxx'. */
	discord: 'https://discord.gg/Q5us3Rjhh',
} as const;

export interface SocialLink {
	id: 'discord';
	/** Where it goes; `undefined` while there is no address yet (or it is not an https one). */
	url: string | undefined;
}

export const socialLinks = (links: Record<string, string> = SOCIAL_LINKS): Array<SocialLink> =>
	(Object.entries(links) as Array<[SocialLink['id'], string]>).map(([id, url]) => ({
		id,
		url: url.startsWith('https://') ? url : undefined,
	}));
