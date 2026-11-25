// Writes src/lib/commits.json from this repo's git history, for the auto changelog on /changelog.
// Vercel builds from a shallow clone that only has the newest commits, so the commits already
// saved in the file are kept and merged with whatever git can see here.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/lib/commits.json');

let saved = [];
try {
	saved = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch {}

let fresh = [];
try {
	const log = execSync('git log --no-merges -n 500 --date=short --format=%H%x1f%ad%x1f%s%x1e', { encoding: 'utf8' });
	fresh = log
		.split('\x1e')
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const [sha, date, text] = line.split('\x1f');
			return { sha, date, text };
		});
} catch {
	console.log('generate-changelog: no git here, keeping the saved commits');
}

// Newest first: git's own order, then older saved ones it no longer sees.
const seen = new Set(fresh.map((c) => c.sha));
const commits = [...fresh, ...saved.filter((c) => !seen.has(c.sha))]
	.filter((c) => !/\[skip changelog\]/i.test(c.text))
	.sort((a, b) => b.date.localeCompare(a.date))
	.slice(0, 500);

fs.writeFileSync(file, JSON.stringify(commits, null, '\t') + '\n');
console.log(`generate-changelog: ${commits.length} commits`);
