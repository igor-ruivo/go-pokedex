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

// gh-pages' default behaviour globs up every existing file already on the
// branch and runs a single `git rm <all of them>` to clear it before
// copying the new content over — with ~2,000 prerendered pages that blows
// past Windows' command-line length limit and fails with ENAMETOOLONG
// (confirmed directly, not theoretical). `add: true` skips that wholesale
// removal and just overwrites/adds files from `dist/` instead. Trade-off:
// a file that existed on a previous deploy but isn't in this one any more
// (e.g. a Pokémon that stops existing, a move that gets renamed) lingers on
// the branch as an orphan instead of being cleaned up — acceptable; it's
// invisible to visitors and to crawlers (nothing links to it, it's not in
// the sitemap), and rare, versus every deploy failing outright.
ghpages.publish('dist', { add: true, ...(message ? { message } : {}) }, (err) => {
	if (err) {
		console.error(err);
		process.exit(1);
	}
	console.log('Published.');
});
