<script lang="ts">
import type { ForecastSlot } from '$lib/utils/forecast';
import { signalStatusLabels } from '$lib/utils/signals';

const { forecast } = $props<{ forecast: ForecastSlot[] }>();

function statusLabel(status: ForecastSlot['suitability']) {
	return signalStatusLabels[status];
}
</script>

<div class="forecast-track-shell">
	{#if forecast.length === 0}
		<div class="forecast-empty">
			<span class="empty-label">No daylight slots</span>
		</div>
	{:else}
		<div class="forecast-track" style={`--slot-count: ${forecast.length}`}>
			{#each forecast as slot (slot.time)}
				<article
					class="forecast-item {slot.suitability} {slot.isWindow ? 'window' : ''}"
					aria-label={`${slot.time} ${statusLabel(slot.suitability)}, ${slot.temp} degrees`}
				>
					<div class="slot-header">
						<span class="slot-time">{slot.time}</span>
						{#if slot.riskLabel}
							<span class="slot-risk">{slot.riskLabel}</span>
						{/if}
					</div>

					<div class="slot-main">
						<span class="slot-temp">{slot.temp}°</span>
						<div class="slot-meta">
							<span>WND {slot.wind}</span>
							<span>GST {slot.gust}</span>
						</div>
					</div>
				</article>
			{/each}
		</div>
	{/if}
</div>

<style>
	.forecast-track-shell {
		display: block;
		min-width: 0;
		touch-action: pan-y;
	}

	.forecast-empty {
		display: grid;
		place-items: center;
		min-height: 5.5rem;
		padding: var(--space-4);
		background: var(--color-panel);
	}

	.empty-label {
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		font-weight: 700;
		letter-spacing: var(--label-spacing);
		text-transform: uppercase;
		color: var(--color-text-subtle);
	}

	.forecast-track {
		display: grid;
		grid-template-columns: repeat(var(--slot-count), minmax(0, 1fr));
		gap: var(--border);
		background: var(--color-line-strong);
	}

	.forecast-item {
		--signal: var(--color-line);
		display: grid;
		grid-template-rows: auto 1fr;
		gap: var(--space-3);
		min-width: 0;
		min-height: 7.25rem;
		padding: var(--space-3);
		background: var(--color-panel);
	}

	.forecast-item.window {
		background: color-mix(in srgb, var(--signal) 5%, var(--color-panel));
		box-shadow: inset 3px 0 0 var(--signal);
	}

	.forecast-item.green {
		--signal: var(--color-success);
	}

	.forecast-item.yellow {
		--signal: var(--color-warning);
	}

	.forecast-item.red {
		--signal: var(--color-danger);
	}

	.slot-header {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.slot-time {
		min-width: 0;
		font-family: var(--font-mono);
		font-size: var(--fs-sm);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		letter-spacing: var(--label-spacing);
		text-transform: uppercase;
	}

	.slot-risk {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin-inline-start: auto;
		padding: 0.125rem var(--space-2);
		background: var(--color-panel-strong);
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		letter-spacing: var(--label-spacing);
		line-height: 1;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.slot-main {
		display: grid;
		align-content: space-between;
		gap: var(--space-3);
	}

	.slot-temp {
		font-family: var(--font-heading);
		font-size: clamp(2.2rem, 3vw, 3.4rem);
		line-height: 0.82;
		letter-spacing: 0.03em;
		color: var(--color-panel-text);
	}

	.slot-meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-1) var(--space-3);
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.06em;
		line-height: 1.2;
		text-transform: uppercase;
		color: var(--color-text-subtle);
	}

	@media (max-width: 64rem) {
		.forecast-track {
			grid-template-columns: 1fr;
		}

		.forecast-item {
			min-height: 6.75rem;
		}

		.slot-temp {
			font-size: clamp(2.35rem, 9vw, 3.5rem);
		}
	}
</style>
