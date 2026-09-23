// Shrinks oversized images in static/.
//   node scripts/optimize-images.cjs          dry run: shows what would change
//   node scripts/optimize-images.cjs --write  applies it
//
// static/images/**   -> converted to .webp (max 800px); update references to the new names.
// static/tournaments -> resized (max 1600px wide) in their current format and name, because
//                       they're linked by URL from the database. Only replaced if smaller.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const write = process.argv.includes('--write');
const root = path.join(__dirname, '../static');
const kb = (n) => `${Math.round(n / 1024)} KB`;

function files(dir, exts) {
	return fs
		.readdirSync(dir, { withFileTypes: true })
		.flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name), exts) : exts.includes(path.extname(e.name).toLowerCase()) ? [path.join(dir, e.name)] : []));
}

async function toWebp(file) {
	const out = file.replace(/\.[^.]+$/, '.webp');
	const data = await sharp(file).resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
	return { file, out, before: fs.statSync(file).size, after: data.length, data, replace: true };
}

async function shrinkInPlace(file) {
	const ext = path.extname(file).toLowerCase();
	const img = sharp(file).resize({ width: 1600, withoutEnlargement: true });
	const data =
		ext === '.png'
			? await img.png({ palette: true, quality: 90, effort: 10, compressionLevel: 9 }).toBuffer()
			: ext === '.webp'
			? await img.webp({ quality: 82 }).toBuffer()
			: await img.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
	const before = fs.statSync(file).size;
	return { file, out: file, before, after: data.length, data, replace: data.length < before * 0.9 };
}

(async () => {
	const jobs = [
		...(await Promise.all(files(path.join(root, 'images'), ['.png', '.jpg', '.jpeg']).map(toWebp))),
		...(await Promise.all(files(path.join(root, 'tournaments'), ['.png', '.jpg', '.jpeg', '.webp']).map(shrinkInPlace)))
	];

	let saved = 0;
	for (const j of jobs) {
		const rel = path.relative(root, j.file);
		if (!j.replace) {
			console.log(`skip   ${rel} (${kb(j.before)}, already small)`);
			continue;
		}
		saved += j.before - j.after;
		console.log(`${write ? 'wrote' : 'would'}  ${rel} ${kb(j.before)} -> ${path.relative(root, j.out)} ${kb(j.after)}`);
		if (write) {
			fs.writeFileSync(j.out, j.data);
			if (j.out !== j.file) fs.unlinkSync(j.file);
		}
	}
	console.log(`\n${write ? 'saved' : 'would save'} ${(saved / 1048576).toFixed(1)} MB`);
})();
