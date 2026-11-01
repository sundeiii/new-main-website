import adapter from '@sveltejs/adapter-vercel';
import preprocess from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: [
		preprocess({
			postcss: true
		})
	],

	kit: {
		adapter: adapter({
			runtime: 'nodejs20.x',
			// Stockholm, next to the Turso database.
			regions: ['arn1']
		}),
		alias: {
			$lib: './src/lib'
		}
	}
};

export default config;