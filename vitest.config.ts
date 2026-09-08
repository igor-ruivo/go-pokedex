import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// The suite currently only covers pure logic (routing parser, PvP/CP math),
		// so the fast Node environment is enough — no DOM needed.
		environment: 'node',
		include: ['src/**/*.test.ts'],
	},
});
