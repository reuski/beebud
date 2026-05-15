<script lang="ts">
import { onMount } from 'svelte';
import Logo from '$lib/components/ui/Logo.svelte';
import { apiaryDateTime } from '$lib/utils/weather';

type TopbarWeather = {
	timezone: string;
	utcOffsetSeconds: number;
	current: {
		time: string;
	};
};

const { weather }: { weather: TopbarWeather } = $props();
let now = $state(new Date());

onMount(() => {
	let intervalId: number | null = null;
	const update = () => {
		now = new Date();
	};
	const timeoutId = window.setTimeout(
		() => {
			update();
			intervalId = window.setInterval(update, 60_000);
		},
		60_000 - (Date.now() % 60_000),
	);
	const handleVisibilityChange = () => {
		if (document.visibilityState === 'visible') {
			update();
		}
	};

	document.addEventListener('visibilitychange', handleVisibilityChange);

	return () => {
		window.clearTimeout(timeoutId);
		document.removeEventListener('visibilitychange', handleVisibilityChange);

		if (intervalId !== null) {
			window.clearInterval(intervalId);
		}
	};
});

function format(date: Date, options: Intl.DateTimeFormatOptions) {
	return new Intl.DateTimeFormat(undefined, {
		...options,
		timeZone: weather.timezone,
	}).format(date);
}

const observedAt = $derived(apiaryDateTime(weather.current.time, weather.utcOffsetSeconds));
const timeStr = $derived(
	format(now, {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	}),
);
const dateStr = $derived(
	format(now, {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
	}),
);
const syncStr = $derived(
	`Sync ${format(observedAt, {
		hour: '2-digit',
		minute: '2-digit',
		hour12: false,
	})}`,
);
</script>

<header class="app-header">
	<div class="header-content">
		<div class="brand-band">
			<div class="logo-container">
				<Logo />
			</div>
		</div>

		<div class="header-meta">
			<div class="meta-copy">
				<span class="meta-date">{dateStr}</span>
				<span class="meta-detail">{syncStr}</span>
			</div>

			<div class="time-rail">
				<div class="time">{timeStr}</div>
			</div>
		</div>
	</div>
</header>

<style>
	.app-header {
		position: sticky;
		top: 0;
		z-index: 20;
		border-block-end: var(--border-strong) solid var(--color-line-strong);
		background: color-mix(in srgb, var(--color-panel) 94%, white);
		backdrop-filter: blur(10px);
	}

	.header-content {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: clamp(0.75rem, 2vw, 1.25rem);
		inline-size: 100%;
		padding: var(--space-3) var(--page-gutter-x);
		min-block-size: clamp(5.25rem, 8vw, 6rem);
	}

	.brand-band {
		display: flex;
		align-items: center;
		min-width: 0;
	}

	.logo-container {
		inline-size: min(100%, clamp(8.75rem, 24vw, 13.25rem));
		color: var(--color-text);
	}

	.header-meta {
		display: grid;
		grid-template-columns: auto auto;
		align-items: center;
		justify-self: end;
		gap: clamp(0.75rem, 1.8vw, 1.25rem);
		max-inline-size: 100%;
	}

	.meta-copy {
		display: grid;
		justify-items: end;
		gap: var(--space-1);
		min-width: 0;
		text-align: right;
	}

	.meta-date,
	.meta-detail,
	.time {
		font-variant-numeric: tabular-nums;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.meta-date,
	.meta-detail {
		font-family: var(--font-mono);
		letter-spacing: var(--label-spacing);
		line-height: 1.2;
	}

	.meta-date {
		font-size: clamp(0.72rem, 1.4vw, var(--fs-sm));
	}

	.meta-detail {
		font-size: clamp(0.68rem, 1.1vw, var(--fs-xs));
		color: var(--color-text-subtle);
	}

	.time-rail {
		display: grid;
		align-items: center;
		justify-items: end;
		padding-inline-start: clamp(0.625rem, 1.8vw, 1rem);
		border-inline-start: var(--border) solid var(--color-line);
	}

	.time {
		font-family: var(--font-heading);
		font-size: clamp(2rem, 5vw, 4rem);
		letter-spacing: var(--heading-spacing);
		line-height: 0.78;
	}

	@media (max-width: 40rem) {
		.header-content {
			gap: var(--space-3);
			padding: var(--space-4) var(--page-gutter-x);
		}

		.logo-container {
			inline-size: auto;
			block-size: clamp(3rem, 10vw, 3.75rem);
			aspect-ratio: 464 / 152;
		}

		.header-meta {
			grid-template-columns: minmax(0, 1fr);
			gap: var(--space-1);
		}

		.meta-date {
			display: none;
		}

		.meta-detail {
			font-size: clamp(0.72rem, 0.6rem + 0.35vw, 0.82rem);
			line-height: 1;
		}

		.time-rail {
			padding-inline-start: 0;
			border-inline-start: 0;
		}

		.time {
			font-size: clamp(1.85rem, 6vw, 2.4rem);
			line-height: 0.86;
		}
	}
</style>
