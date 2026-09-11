// Thin wrapper around gh-pages' own CLI, which breaks when pnpm forwards a
// trailing `-m "message"` through `deploy` (a multi-command `&&` script):
// pnpm inserts a literal `--` token ahead of the forwarded args regardless
// of whether you typed one yourself, and gh-pages' CLI argv parser chokes
// on that bare `--` ("too many arguments") — confirmed directly, not
// theoretical. Sidesteps it entirely by using gh-pages' *programmatic* API
// instead of its CLI, and by parsing argv ourselves, tolerant of a stray
// `--` wherever it lands. Usage: `pnpm run deploy -- -m "commit message"`
// (or without the `--` — both work; the message is optional either way).
import ghpages from 'gh-pages';

const args = process.argv.slice(2).filter((a) => a !== '--');
const flagIndex = args.indexOf('-m');
const message = flagIndex !== -1 ? args[flagIndex + 1] : undefined;

ghpages.publish('dist', message ? { message } : {}, (err) => {
	if (err) {
		console.error(err);
		process.exit(1);
	}
	console.log('Published.');
});
