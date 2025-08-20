export const inCamelCase = (str: string) => str?.substring(0, 1)?.toUpperCase() + str?.substring(1);

// Get current UTC timestamp to avoid timezone issues when comparing with backend epoch timestamps
export const getCurrentUTCTimestamp = (): number => {
	const now = new Date();
	return Date.UTC(
		now.getUTCFullYear(),
		now.getUTCMonth(),
		now.getUTCDate(),
		now.getUTCHours(),
		now.getUTCMinutes(),
		now.getUTCSeconds(),
		now.getUTCMilliseconds()
	);
};

export const localeStringSmallestOptions: Intl.DateTimeFormatOptions = {
	timeZone: 'UTC',
	day: 'numeric',
	month: 'short',
	year: 'numeric',
};

export const localeStringSmallOptions: Intl.DateTimeFormatOptions = {
	timeZone: 'UTC',
	day: 'numeric',
	month: 'short',
	year: 'numeric',
	hour: 'numeric',
	minute: '2-digit',
	hour12: false,
};

export const localeStringOptions: Intl.DateTimeFormatOptions = {
	timeZone: 'UTC',
	day: 'numeric',
	weekday: 'short',
	month: 'short',
	year: 'numeric',
	hour: 'numeric',
	minute: '2-digit',
	hour12: false,
};

export const localeStringMiniature: Intl.DateTimeFormatOptions = {
	timeZone: 'UTC',
	day: 'numeric',
	month: 'long',
};
