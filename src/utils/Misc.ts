export const inCamelCase = (str: string) => str?.substring(0, 1)?.toUpperCase() + str?.substring(1);

export const localeStringSmallestOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
};

export const localeStringSmallOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false
};

export const localeStringOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    weekday: 'short',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: false
};