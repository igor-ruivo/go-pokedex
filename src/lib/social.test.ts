import { describe, expect, it } from 'vitest';

import { socialLinks } from './social';

describe('socialLinks', () => {
	it('keeps an https address', () => {
		expect(socialLinks({ discord: 'https://discord.gg/abc' })).toEqual([
			{ id: 'discord', url: 'https://discord.gg/abc' },
		]);
	});

	it('lists a link with no address too, without a url', () => {
		expect(socialLinks({ discord: '' })).toEqual([{ id: 'discord', url: undefined }]);
	});

	it('never turns anything but an https address into a link', () => {
		expect(socialLinks({ discord: 'javascript:alert(1)' })[0].url).toBeUndefined();
		expect(socialLinks({ discord: 'http://example.com' })[0].url).toBeUndefined();
	});
});
