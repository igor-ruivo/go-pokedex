/** Which build is running: the commit it was made from and when (see `define` in vite.config.ts); absent under tests. */
export const APP_COMMIT: string = typeof __APP_COMMIT__ === 'string' ? __APP_COMMIT__ : 'dev';
export const APP_BUILT_AT: number | undefined =
	typeof __APP_BUILT_AT__ === 'string' ? Date.parse(__APP_BUILT_AT__) || undefined : undefined;
