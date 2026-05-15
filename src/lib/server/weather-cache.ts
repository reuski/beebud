type Entry = { value: unknown; fetchedAt: number; lockUntil: number };
type Fetcher = typeof fetch;

const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

export const TTL = {
	metno: 5 * 60 * 1000,
	astronomy: 6 * 60 * 60 * 1000,
	ensemble: 3 * 60 * 60 * 1000,
} as const;

export async function getCachedJson<T>(fetcher: Fetcher, url: string, ttlMs: number): Promise<T> {
	const hit = cache.get(url);
	const now = Date.now();

	if (hit && (now - hit.fetchedAt < ttlMs || now < hit.lockUntil)) {
		return hit.value as T;
	}

	if (hit) {
		void refresh(fetcher, url);
		return hit.value as T;
	}

	return (await refresh(fetcher, url)) as T;
}

function refresh(fetcher: Fetcher, url: string): Promise<unknown> {
	const existing = inflight.get(url);
	if (existing) return existing;

	const promise = (async () => {
		try {
			const res = await fetcher(url, { signal: AbortSignal.timeout(8000) });

			if (res.status === 429) {
				const retryAfter = Number(res.headers.get('retry-after')) || 60;
				const lockMs = Math.min(Math.max(retryAfter, 60), 1800) * 1000;
				const hit = cache.get(url);
				if (hit) {
					hit.lockUntil = Date.now() + lockMs;
					return hit.value;
				}
				throw new Error(`429 rate-limited, retry after ${retryAfter}s`);
			}

			if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

			const value = await res.json();
			cache.set(url, { value, fetchedAt: Date.now(), lockUntil: 0 });
			return value;
		} catch (err) {
			const hit = cache.get(url);
			if (hit) {
				console.warn('[weather-cache] stale served', url, err);
				return hit.value;
			}
			throw err;
		} finally {
			inflight.delete(url);
		}
	})();

	inflight.set(url, promise);
	return promise;
}
