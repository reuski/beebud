import type { Handle } from '@sveltejs/kit';

const EMPTY_204 = new Set([
	'/favicon.ico',
	'/apple-touch-icon.png',
	'/apple-touch-icon-precomposed.png',
]);

export const handle: Handle = async ({ event, resolve }) => {
	if (EMPTY_204.has(event.url.pathname)) {
		return new Response(null, {
			status: 204,
			headers: { 'cache-control': 'public, max-age=604800, immutable' },
		});
	}
	return resolve(event);
};
