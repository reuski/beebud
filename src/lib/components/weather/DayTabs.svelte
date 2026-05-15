<script lang="ts">
const { days, selected, onselect } = $props<{
	days: {
		label: string;
		date: string;
		dateKey: string;
		status: 'green' | 'yellow' | 'red';
		metricLabel: string | null;
	}[];
	selected: number;
	onselect: (dateKey: string) => void;
}>();
</script>

<div class="day-selector-shell">
	<nav class="day-selector" style={`--day-count: ${days.length}`} aria-label="Window grid">
		{#each days as day, i (day.dateKey)}
			<button
				type="button"
				class:active={i === selected}
				class="day-tab"
				onclick={() => onselect(day.dateKey)}
				aria-pressed={i === selected}
				aria-label={`Open ${day.label} ${day.date} grid`}
			>
				<div class="day-head">
					<span class="day-label">{day.label}</span>
					<span class="day-mark {day.status}"></span>
				</div>
				<div class="day-meta">
					<span class="day-date">{day.date}</span>
					{#if day.metricLabel}
						<span class="day-metric">{day.metricLabel}</span>
					{/if}
				</div>
			</button>
		{/each}
	</nav>
</div>

<style>
	.day-selector-shell {
		min-width: 0;
	}

	.day-selector {
		display: grid;
		grid-template-columns: repeat(var(--day-count), minmax(0, 1fr));
		gap: var(--border);
		background: var(--color-line-strong);
	}

	.day-tab {
		display: grid;
		grid-template-rows: auto auto;
		align-content: center;
		gap: var(--space-1);
		min-width: 0;
		min-height: var(--space-touch);
		padding: var(--space-2) var(--space-3);
		background: var(--color-panel-alt);
		color: var(--color-text);
		text-align: left;
		cursor: pointer;
		touch-action: manipulation;
	}

	.day-tab:hover:not(.active) {
		background: var(--color-surface-dim);
	}

	.day-tab.active {
		background: var(--color-line-strong);
		color: var(--color-surface);
	}

	.day-head {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: var(--space-2);
	}

	.day-label {
		font-family: var(--font-mono);
		font-size: var(--fs-sm);
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.day-meta {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0 var(--space-2);
		min-width: 0;
	}

	.day-date,
	.day-metric {
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		font-weight: 700;
		letter-spacing: var(--label-spacing);
		text-transform: uppercase;
		color: var(--color-text-subtle);
		white-space: nowrap;
	}

	.day-mark {
		inline-size: 0.75rem;
		block-size: 0.75rem;
		background: var(--color-line);
	}

	.day-mark.green {
		background: var(--color-success);
	}

	.day-mark.yellow {
		background: var(--color-warning);
	}

	.day-mark.red {
		background: var(--color-danger);
	}

	.day-tab.active .day-date,
	.day-tab.active .day-metric {
		color: color-mix(in srgb, var(--color-surface) 76%, transparent);
	}

	@media (max-width: 64rem) {
		.day-selector {
			grid-template-columns: none;
			grid-auto-flow: column;
			grid-auto-columns: minmax(9rem, 42vw);
			overflow-x: auto;
			overscroll-behavior-inline: contain;
			scroll-snap-type: x proximity;
			scrollbar-width: none;
			-webkit-overflow-scrolling: touch;
		}

		.day-selector::-webkit-scrollbar {
			display: none;
		}

		.day-tab {
			scroll-snap-align: start;
		}
	}
</style>
