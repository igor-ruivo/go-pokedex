/// <reference types="vite/client" />

declare module '*.module.css' {
	const classes: Record<string, string>;
	export default classes;
}

/** Short hash of the commit the app was built from (`-dirty` when it had uncommitted changes) — set by vite.config.ts. */
declare const __APP_COMMIT__: string;
/** ISO time of the build — set by vite.config.ts. */
declare const __APP_BUILT_AT__: string;
