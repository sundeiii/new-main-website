/** Runs `setup` once per server instance; retries on the next call if it failed. */
export function once(setup: () => Promise<unknown>) {
	let ready: Promise<unknown> | null = null;
	return () =>
		(ready ??= setup().catch((e) => {
			ready = null;
			throw e;
		}));
}
