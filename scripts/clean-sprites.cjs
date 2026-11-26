// Tidies the edges of cut-out companion pictures (static/companion/ryo):
//   node scripts/clean-sprites.cjs [file ...]   (no files = every .webp/.png in the folder)
// Background removers leave light halos and sticker borders around a character. This walks
// inward from the see-through area through light, greyish pixels (never through the drawing's
// dark outline, and at most a few pixels deep), makes those see-through, then trims the faint
// leftover fringe and softens the edge by half a pixel. Writes the files back in place.
const sharp = require('sharp');
sharp.cache(false); // otherwise Windows keeps the file open and it can't be overwritten
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'static', 'companion', 'ryo');
// pixels; enough for a thin halo, small enough not to eat clothes. A thick sticker border needs
// more: DEPTH=28 node scripts/clean-sprites.cjs sad.webp (that's what sad.webp got).
const MAX_DEPTH = +process.env.DEPTH || 14;
const RIM = 4; // how deep the pale-blue-rim rule reaches

async function clean(file) {
	const full = path.join(DIR, file);
	const { data, info } = await sharp(fs.readFileSync(full)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	const { width: w, height: h } = info;
	const px = (i) => i * 4;

	// "Halo" pixels: light and nearly grey (white, light grey, the pale blue-grey of a bad mask).
	// Skin and pale pink clothes are light too, but warm, so they never count. Deep in, only
	// near-greys do (a sticker border); right at the edge also light cool tints (the pale blue
	// rim a mask leaves around blue hair).
	const halo = (i, d) => {
		const p = px(i);
		const r = data[p], g = data[p + 1], b = data[p + 2];
		const lum = 0.299 * r + 0.587 * g + 0.114 * b;
		if (lum > 175 && Math.max(r, g, b) - Math.min(r, g, b) < 24) return true;
		return d <= RIM && lum > 140 && b >= r + 8 && b >= g;
	};
	const clear = (i) => data[px(i) + 3] < 24;

	// Breadth-first from every see-through pixel into halo pixels.
	const depth = new Int16Array(w * h).fill(-1);
	let queue = [];
	for (let i = 0; i < w * h; i++) if (clear(i)) (depth[i] = 0), queue.push(i);
	let removed = 0;
	for (let d = 1; d <= MAX_DEPTH && queue.length; d++) {
		const next = [];
		for (const i of queue) {
			const x = i % w;
			const y = (i / w) | 0;
			for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
				const nx = x + dx;
				const ny = y + dy;
				if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
				const j = ny * w + nx;
				if (depth[j] !== -1 || !halo(j, d)) continue;
				depth[j] = d;
				data[px(j) + 3] = 0;
				removed++;
				next.push(j);
			}
		}
		queue = next;
	}

	// Faint leftovers become fully see-through, and edge pixels lose a little opacity so the
	// cut looks soft instead of jagged.
	const alpha = new Uint8Array(w * h);
	for (let i = 0; i < w * h; i++) alpha[i] = data[px(i) + 3] < 40 ? 0 : data[px(i) + 3];
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			const i = y * w + x;
			if (!alpha[i]) {
				data[px(i) + 3] = 0;
				continue;
			}
			let open = 0;
			for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
				const nx = x + dx;
				const ny = y + dy;
				if (nx >= 0 && ny >= 0 && nx < w && ny < h && !alpha[ny * w + nx]) open++;
			}
			data[px(i) + 3] = open ? Math.round(alpha[i] * (open >= 2 ? 0.55 : 0.8)) : alpha[i];
		}

	// Crop to what's left, keeping a 2px margin.
	let minX = w, minY = h, maxX = -1, maxY = -1;
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++)
			if (data[px(y * w + x) + 3]) {
				if (x < minX) minX = x;
				if (x > maxX) maxX = x;
				if (y < minY) minY = y;
				if (y > maxY) maxY = y;
			}
	const left = Math.max(0, minX - 2);
	const top = Math.max(0, minY - 2);
	const out = sharp(data, { raw: { width: w, height: h, channels: 4 } }).extract({ left, top, width: Math.min(w, maxX + 3) - left, height: Math.min(h, maxY + 3) - top });
	const buf = file.endsWith('.png') ? await out.png({ compressionLevel: 9 }).toBuffer() : await out.webp({ quality: 90, alphaQuality: 100 }).toBuffer();
	fs.writeFileSync(full, buf);
	console.log(`${file}: removed ${removed} halo pixels`);
}

(async () => {
	const files = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(DIR).filter((f) => /\.(webp|png)$/.test(f));
	for (const f of files) await clean(f);
})();
