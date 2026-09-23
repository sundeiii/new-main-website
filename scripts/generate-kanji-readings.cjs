// Builds src/lib/server/kanji-on.json, a kanji -> on'yomi (romaji) table used by romanize.ts for
// rare kanji that kuroshiro's dictionary doesn't know.
//
// Data: kJapaneseOn from the Unicode Unihan database (Unicode License v3,
// https://www.unicode.org/license.txt). To regenerate, download
// https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip, extract it, and run:
//   node scripts/generate-kanji-readings.cjs path/to/Unihan_Readings.txt
const fs = require('fs');
const path = require('path');

const source = process.argv[2];
if (!source) {
	console.error('usage: node scripts/generate-kanji-readings.cjs path/to/Unihan_Readings.txt');
	process.exit(1);
}

const readings = {};
for (const line of fs.readFileSync(source, 'utf8').split('\n')) {
	const [codepoint, field, value] = line.trim().split('\t');
	if (field !== 'kJapaneseOn' || !value) continue;
	const char = String.fromCodePoint(parseInt(codepoint.slice(2), 16));
	// First listed reading is the most common one.
	readings[char] = value.split(' ')[0].toLowerCase();
}

const out = path.join(__dirname, '../src/lib/server/kanji-on.json');
fs.writeFileSync(out, JSON.stringify(readings));
console.log(`Wrote ${Object.keys(readings).length} readings to ${path.relative(process.cwd(), out)}`);
