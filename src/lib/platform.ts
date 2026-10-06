export type Platform = 'ios' | 'android' | 'other';

/**
 * The kind of device the page is on, to follow its own navigation guidelines: iPhone / iPad (the Human Interface Guidelines' tab
 * bar) or Android (Material's navigation bar); anything else is `other`. An iPad that asks for the desktop site says it is a Mac, so
 * a "Mac" with a touch screen is counted as iOS.
 */
export const detectPlatform = (nav: Pick<Navigator, 'userAgent' | 'platform' | 'maxTouchPoints'> = navigator): Platform => {
	if (/iPhone|iPad|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1)) return 'ios';
	if (/Android/i.test(nav.userAgent)) return 'android';
	return 'other';
};
