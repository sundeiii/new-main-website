// Vercel's file tracer ships the kuromoji package with the serverless function but not its
// dictionary, because kuromoji only reads those files by paths built at runtime. Without it
// /api/romanize fails, so copy the dictionary next to every traced copy of kuromoji.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const functionsDir = path.join(root, '.vercel/output/functions');
const dictSource = path.join(path.dirname(require.resolve('kuromoji/package.json')), 'dict');

function findKuromojiDirs(dir, found = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const full = path.join(dir, entry.name);
		if (entry.name === 'kuromoji' && fs.existsSync(path.join(full, 'package.json'))) {
			found.push(full);
		} else {
			findKuromojiDirs(full, found);
		}
	}
	return found;
}

if (!fs.existsSync(functionsDir)) {
	console.log('copy-kuromoji-dict: no .vercel/output/functions, skipping');
	process.exit(0);
}

const targets = findKuromojiDirs(functionsDir);
if (targets.length === 0) {
	console.error('copy-kuromoji-dict: kuromoji was not traced into any function, romanization will fail');
	process.exit(1);
}

for (const target of targets) {
	fs.cpSync(dictSource, path.join(target, 'dict'), { recursive: true });
	console.log(`copy-kuromoji-dict: copied dictionary to ${path.relative(root, target)}`);
}
