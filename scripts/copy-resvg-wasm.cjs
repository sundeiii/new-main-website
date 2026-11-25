// Like copy-kuromoji-dict: Vercel's file tracer ships @resvg/resvg-wasm with the serverless
// function but not its .wasm file (it's only read at runtime), and /og needs it to draw the
// link-preview cards. Copy it next to every traced copy of the package.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const functionsDir = path.join(root, '.vercel/output/functions');
const source = path.join(path.dirname(require.resolve('@resvg/resvg-wasm')), 'index_bg.wasm');

function findDirs(dir, found = []) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const full = path.join(dir, entry.name);
		if (entry.name === 'resvg-wasm' && path.basename(dir) === '@resvg') found.push(full);
		else findDirs(full, found);
	}
	return found;
}

if (!fs.existsSync(functionsDir)) {
	console.log('copy-resvg-wasm: no .vercel/output/functions, skipping');
	process.exit(0);
}
const targets = findDirs(functionsDir);
if (targets.length === 0) {
	console.error('copy-resvg-wasm: no traced copy of @resvg/resvg-wasm found');
	process.exit(1);
}
for (const dir of targets) {
	fs.copyFileSync(source, path.join(dir, 'index_bg.wasm'));
	console.log('copy-resvg-wasm: copied to', path.relative(root, dir));
}
