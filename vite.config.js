import { sveltekit } from '@sveltejs/kit/vite';
import * as dotenv from 'dotenv';

dotenv.config();

const config = {
	plugins: [sveltekit()],
	ssr: {
		external: ['kuroshiro', 'kuroshiro-analyzer-kuromoji', 'kuromoji']
	},
	// The database client (libSQL) uses BigInt literals, which the dev dependency scan's default
	// target (es2020) refuses to compile.
	optimizeDeps: {
		esbuildOptions: { target: 'es2022' }
	}
};

export default config;