<script lang="ts">
import type { DaylightInfo, EnvironmentGrid, NectarFlow } from '$lib/utils/site';

const {
	nectarFlow,
	daylight,
	environment,
}: {
	nectarFlow: NectarFlow;
	daylight: DaylightInfo;
	environment: EnvironmentGrid;
} = $props();

const nectarLabels = {
	high: 'Surge',
	moderate: 'Flow',
	low: 'Trace',
	none: 'Null',
} as const;

function timeFraction(hhmm: string): number {
	const [hours, minutes] = hhmm.split(':').map(Number);
	return Math.min(1, Math.max(0, (hours * 60 + minutes) / 1440));
}

const arcStart = $derived(`${(timeFraction(daylight.sunrise) * 100).toFixed(2)}%`);
const arcWidth = $derived(
	`${((timeFraction(daylight.sunset) - timeFraction(daylight.sunrise)) * 100).toFixed(2)}%`,
);
</script>

<div class="panel-body">
	<section class="panel-band">
		<div class="section-head">
			<span class="label label-strong">Nectar flow</span>
			<span class="signal-badge {nectarFlow.rating}">{nectarLabels[nectarFlow.rating]}</span>
		</div>

		<p class="nectar-driver">{nectarFlow.driver}</p>

		{#if nectarFlow.factors.length > 0}
			<div class="factor-grid">
				{#each nectarFlow.factors as factor (factor.label)}
					<div class="factor {factor.status}">
						<span class="label">{factor.label}</span>
						<span class="factor-interpretation heading">{factor.interpretation}</span>
						<span class="label">{factor.value}</span>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<section class="detail-section panel-section">
		<div class="section-head">
			<span class="label label-strong">Solar arc</span>
			<span class="trend-badge {daylight.trend}">{daylight.trendDelta}</span>
		</div>

		<div
			class="solar-scale"
			style:--arc-start={arcStart}
			style:--arc-width={arcWidth}
		>
			<div class="solar-fill"></div>
		</div>
		<div class="solar-ticks" aria-hidden="true">
			<span>00</span>
			<span>06</span>
			<span>12</span>
			<span>18</span>
			<span>24</span>
		</div>

		<div class="solar-grid">
			<div class="solar-card">
				<span class="label">Sunrise</span>
				<span class="metric-value">{daylight.sunrise}</span>
			</div>
			<div class="solar-card">
				<span class="label">Daylight</span>
				<span class="metric-value">{daylight.totalDisplay}</span>
			</div>
			<div class="solar-card">
				<span class="label">Sunset</span>
				<span class="metric-value">{daylight.sunset}</span>
			</div>
		</div>
	</section>

	<section class="detail-section panel-section">
		<div class="section-head">
			<span class="label label-strong">Environment</span>
			<span class="label">Day field profile</span>
		</div>

		<div class="metric-grid">
			<div class="metric-card">
				<span class="label">Wet hrs</span>
				<div class="metric-main">
					<span class="metric-value">{environment.wetHours}</span>
					<span class="label">h</span>
				</div>
			</div>

			<div class="metric-card">
				<span class="label">Peak sun</span>
				<div class="metric-main">
					<span class="metric-value">{environment.solarPeak}</span>
					<span class="label">W/m²</span>
				</div>
			</div>

			<div class="metric-card">
				<span class="label">Min</span>
				<div class="metric-main">
					<span class="metric-value">{environment.tempMin}°</span>
					<span class="label">C</span>
				</div>
			</div>

			<div class="metric-card">
				<span class="label">Max</span>
				<div class="metric-main">
					<span class="metric-value">{environment.tempMax}°</span>
					<span class="label">C</span>
				</div>
			</div>
		</div>
	</section>
</div>

<style>
	.signal-badge.high,
	.trend-badge.growing {
		background: var(--color-success);
	}

	.signal-badge.moderate,
	.signal-badge.low,
	.trend-badge.shrinking {
		background: var(--color-warning);
	}

	.signal-badge.none {
		background: var(--color-danger);
	}

	.trend-badge.stable {
		background: var(--color-panel);
	}

	.nectar-driver {
		font-family: var(--font-mono);
		font-size: var(--fs-sm);
		letter-spacing: var(--heading-spacing);
		line-height: 1.35;
		color: var(--color-text-subtle);
	}

	.detail-section {
		display: grid;
		gap: var(--space-3);
		min-width: 0;
	}

	.factor-grid,
	.metric-grid,
	.solar-grid {
		display: grid;
		gap: var(--border);
		background: var(--color-line);
		grid-template-columns: 1fr;
	}

	.factor,
	.solar-card {
		display: grid;
		gap: var(--space-2);
		align-content: start;
		min-width: 0;
		min-block-size: 5.25rem;
		padding: var(--space-3);
		background: var(--color-panel-alt);
	}

	.metric-card {
		display: grid;
		gap: var(--space-2);
		align-content: start;
		min-width: 0;
		min-block-size: 5.25rem;
		padding: var(--space-3);
		background: var(--color-panel-alt);
	}

	.factor {
		--factor-accent: var(--color-line);
		background:
			linear-gradient(90deg, var(--factor-accent) 0 var(--space-1), transparent 0),
			var(--color-panel-alt);
	}

	.factor.good {
		--factor-accent: var(--color-success);
	}

	.factor.watch {
		--factor-accent: var(--color-warning);
	}

	.factor.limit {
		--factor-accent: var(--color-danger);
	}

	.factor-interpretation {
		font-size: var(--fs-sm);
		line-height: 1;
	}

	.metric-main {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-1) var(--space-2);
		min-width: 0;
	}

	.metric-value {
		font-family: var(--font-heading);
		font-size: var(--fs-xl);
		line-height: 1;
		letter-spacing: var(--heading-spacing);
		text-transform: uppercase;
		color: var(--color-panel-text);
	}

	.solar-scale {
		--arc-start: 0%;
		--arc-width: 0%;
		position: relative;
		inline-size: 100%;
		block-size: 0.75rem;
		background: var(--color-line);
	}

	.solar-fill {
		position: absolute;
		inset-block: 0;
		inset-inline-start: var(--arc-start);
		inline-size: var(--arc-width);
		background: var(--color-line-strong);
	}

	.solar-ticks {
		display: flex;
		justify-content: space-between;
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		font-variant-numeric: tabular-nums;
		letter-spacing: var(--label-spacing);
		color: var(--color-text-subtle);
	}

	.solar-card .metric-value {
		font-size: var(--fs-lg);
	}

	@container (min-width: 26rem) {
		.factor-grid,
		.metric-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@container (min-width: 32rem) {
		.solar-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
