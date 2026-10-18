// Lint, test, commit, push and deploy. The commit message is the first argument ("Changes" when none is given):
// `pnpm ship "Move the GBL rank badges onto the tiles' corners"`.
import { spawnSync } from 'node:child_process';

const message = process.argv[2]?.trim() || 'Changes';

const shell = process.platform === 'win32';

const run = (command, args) => {
	const { status } = spawnSync(command, args, { stdio: 'inherit', shell });
	if (status !== 0) process.exit(status ?? 1);
};

run('pnpm', ['run', 'lint']);
run('pnpm', ['run', 'test']);
run('git', ['add', '.']);
run('git', ['commit', '-m', shell ? JSON.stringify(message) : message]);
run('git', ['push', 'origin', 'main']);
run('pnpm', ['run', 'deploy']);
