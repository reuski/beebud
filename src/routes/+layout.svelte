<script lang="ts">
import '../app.css';
import { onMount } from 'svelte';
import { invalidate } from '$app/navigation';
import favicon from '$lib/assets/favicon.svg?url';
import Topbar from '$lib/components/ui/Topbar.svelte';
import type { LayoutProps } from './$types';

const WEATHER_DEPENDENCY = 'data:weather';

const { children, data }: LayoutProps = $props();

onMount(() => {
	let timeoutId: number | null = null;
	let refreshPromise: Promise<void> | null = null;

	const refresh = () => {
		if (document.visibilityState !== 'visible' || !navigator.onLine) {
			return refreshPromise;
		}

		refreshPromise ??= invalidate(WEATHER_DEPENDENCY).finally(() => {
			refreshPromise = null;
		});

		return refreshPromise;
	};

	const schedule = () => {
		const intervalMs = Math.max(60_000, data.weather.current.interval * 1000);
		const remainder = Date.now() % intervalMs;
		const delay = remainder === 0 ? intervalMs : intervalMs - remainder;

		timeoutId = window.setTimeout(async () => {
			await refresh();
			schedule();
		}, delay);
	};

	const reschedule = () => {
		if (timeoutId !== null) {
			window.clearTimeout(timeoutId);
		}

		schedule();
	};

	const handleOnline = async () => {
		await refresh();
		reschedule();
	};

	const handleVisibilityChange = async () => {
		if (document.visibilityState !== 'visible') {
			return;
		}

		await refresh();
		reschedule();
	};

	schedule();
	window.addEventListener('online', handleOnline);
	document.addEventListener('visibilitychange', handleVisibilityChange);

	return () => {
		if (timeoutId !== null) {
			window.clearTimeout(timeoutId);
		}

		window.removeEventListener('online', handleOnline);
		document.removeEventListener('visibilitychange', handleVisibilityChange);
	};
});
</script>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<link rel="icon" href={favicon} />
</svelte:head>

<Topbar weather={data.weather} />

<main>
	{@render children()}
</main>
