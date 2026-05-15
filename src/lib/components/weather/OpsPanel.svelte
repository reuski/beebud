<script lang="ts">
import type { BestWindow, OpsAlert, OpsReadinessItem } from '$lib/utils/ops';
import { signalStatusLabels } from '$lib/utils/signals';

const {
	bestWindow,
	nextWindow,
	readiness,
	alerts,
	rangeLabel,
}: {
	bestWindow: BestWindow;
	nextWindow: BestWindow;
	readiness: OpsReadinessItem[];
	alerts: OpsAlert[];
	rangeLabel: string;
} = $props();
</script>

<div class="panel-body">
	<section class="panel-band">
		{#if bestWindow}
			<div class="section-head window-head">
				<span class="label label-strong">Best window</span>
				<span class="signal-badge {bestWindow.status}">{signalStatusLabels[bestWindow.status]}</span>
			</div>

			<div class="window-main">
				<h3 class="window-day heading">{bestWindow.dayLabel}</h3>
				<span class="window-range">{bestWindow.startTime}&#8211;{bestWindow.endTime}</span>
				<span class="label">{bestWindow.durationHours}h workable</span>
			</div>

			<p class="window-detail">{bestWindow.conditions}</p>

			{#if nextWindow}
				<div class="window-alt panel-section">
					<span class="label">Next</span>
					<span class="window-alt-main">
						{nextWindow.dayLabel} {nextWindow.startTime}&#8211;{nextWindow.endTime}
					</span>
					<span class="label window-alt-meta">{nextWindow.durationHours}h</span>
				</div>
			{/if}
		{:else}
			<div class="empty-state">
				<span class="label label-strong">Best window</span>
				<p class="window-detail">No viable window in {rangeLabel}</p>
			</div>
		{/if}
	</section>

	<div class="detail-grid">
		<section class="detail-section panel-section">
			<div class="section-head">
				<span class="label label-strong">Active alerts</span>
				<span class="label">{alerts.length} in {rangeLabel}</span>
			</div>

			<div class="alerts-list">
				{#if alerts.length > 0}
					{#each alerts as alert (alert.type)}
						<div class="alert-row {alert.severity}">
							<div class="alert-head">
								<span class="alert-label heading">{alert.label}</span>
								<span class="label">{alert.dayLabel}</span>
							</div>
							<span class="label alert-detail">{alert.detail}</span>
						</div>
					{/each}
				{:else}
					<div class="alert-row clear">
						<div class="alert-head">
							<span class="alert-label heading">Clear</span>
							<span class="label">{rangeLabel}</span>
						</div>
						<span class="label alert-detail">No sustained cold, wet, or wind alert detected.</span>
					</div>
				{/if}
			</div>
		</section>

		{#if readiness.length > 0}
			<section class="detail-section panel-section">
				<div class="section-head">
					<span class="label label-strong">Ops readiness</span>
					<span class="label">Window adjusted</span>
				</div>

				<div class="readiness-list">
					{#each readiness as item (item.type)}
						<article class="readiness-row {item.status}">
							<header class="readiness-head">
								<span class="label label-strong readiness-label">{item.label}</span>
								<span class="readiness-action">{item.action}</span>
							</header>

							<div class="readiness-main">
								<span class="readiness-timing heading">{item.timing}</span>
								<span class="label readiness-detail">{item.detail}</span>
							</div>
						</article>
					{/each}
				</div>
			</section>
		{/if}
	</div>
</div>

<style>
	.window-head {
		align-items: center;
	}

	.empty-state {
		display: grid;
		gap: var(--space-1);
		min-width: 0;
	}

	.window-main {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-1) var(--space-3);
		min-width: 0;
	}

	.window-day {
		font-size: clamp(1.7rem, 1.25rem + 1.1vw, 2.45rem);
		line-height: 0.88;
	}

	.window-range {
		font-family: var(--font-mono);
		font-size: var(--fs-lg);
		letter-spacing: 0.05em;
		line-height: 1.1;
		text-transform: uppercase;
		color: var(--color-panel-text);
	}

	.signal-badge.green {
		background: var(--color-success);
	}

	.signal-badge.yellow {
		background: var(--color-warning);
	}

	.signal-badge.red {
		background: var(--color-danger);
	}

	.window-detail {
		font-family: var(--font-mono);
		font-size: var(--fs-sm);
		letter-spacing: var(--heading-spacing);
		line-height: 1.35;
		color: var(--color-text-subtle);
	}

	.window-alt {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: var(--space-1) var(--space-3);
	}

	.window-alt-meta {
		margin-inline-start: auto;
	}

	.window-alt-main {
		font-family: var(--font-mono);
		font-size: var(--fs-sm);
		font-weight: 700;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: var(--color-text);
	}

	.detail-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: var(--space-4);
		align-items: start;
	}

	.detail-section {
		display: grid;
		gap: var(--space-3);
		min-width: 0;
	}

	.alerts-list,
	.readiness-list {
		display: grid;
		gap: var(--border);
		background: var(--color-line);
	}

	.alert-row,
	.readiness-row {
		display: grid;
		gap: var(--space-2);
		min-width: 0;
		padding: var(--space-3) var(--space-4);
		background: var(--color-panel-alt);
	}

	.alert-row,
	.readiness-row {
		--row-accent: var(--color-line);
		background:
			linear-gradient(90deg, var(--row-accent) 0 var(--space-1), transparent 0),
			var(--color-panel-alt);
	}

	.alert-row.warning,
	.readiness-row.yellow {
		--row-accent: var(--color-warning);
	}

	.alert-row.critical,
	.readiness-row.red {
		--row-accent: var(--color-danger);
	}

	.alert-row.clear,
	.readiness-row.green {
		--row-accent: var(--color-success);
	}

	.alert-head,
	.readiness-head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-1) var(--space-3);
	}

	.alert-label {
		font-size: var(--fs-sm);
		font-weight: 700;
	}

	.alert-detail,
	.readiness-detail {
		font-size: var(--fs-sm);
		letter-spacing: var(--heading-spacing);
		line-height: 1.35;
		text-transform: none;
	}

	.readiness-label {
		color: var(--color-text);
	}

	.readiness-action {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-block-size: 1.35rem;
		padding: 0.125rem var(--space-2);
		background: var(--row-accent);
		color: var(--color-line-strong);
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		font-weight: 700;
		letter-spacing: var(--label-spacing);
		line-height: 1;
		text-transform: uppercase;
	}

	.readiness-main {
		display: grid;
		gap: var(--space-1);
		min-width: 0;
	}

	.readiness-timing {
		font-size: var(--fs-sm);
		line-height: 1.05;
	}

	@container (min-width: 32rem) {
		.window-main {
			gap: var(--space-1) var(--space-4);
		}

		.readiness-row {
			padding: var(--space-3) var(--space-4);
		}
	}
</style>
