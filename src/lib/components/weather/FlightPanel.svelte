<script lang="ts">
import Panel from '$lib/components/ui/Panel.svelte';
import type { FlightStatus as FlightStatusValue } from '$lib/utils/flight';
import { signalStatusLabels } from '$lib/utils/signals';

const {
	status = 'green',
	reason = 'Stable',
	detail = '',
}: {
	status?: FlightStatusValue;
	reason?: string;
	detail?: string;
} = $props();

const statusLabel = $derived(signalStatusLabels[status]);
</script>

<Panel class="status-frame" signal={status}>
	<div class="status-content">
		<div class="status-copy">
			<span class="status-text">{statusLabel}</span>
			<span class="status-badge">{reason}</span>
			<p class="status-detail">{detail}</p>
		</div>
	</div>
</Panel>

<style>
	.status-content {
		display: grid;
		align-content: center;
		gap: var(--space-3);
		height: 100%;
		padding: var(--space-5) var(--space-5) var(--space-5)
			calc(var(--space-5) + var(--space-1));
	}

	.status-copy {
		display: grid;
		gap: var(--space-2);
		min-width: 0;
	}

	.status-text {
		font-family: var(--font-heading);
		font-size: clamp(2.5rem, 11vw, 5rem);
		font-weight: 700;
		line-height: 0.8;
		letter-spacing: 0.02em;
		text-transform: uppercase;
		color: var(--color-panel-text);
	}

	.status-badge {
		display: inline-flex;
		inline-size: fit-content;
		align-items: center;
		padding: var(--space-1) var(--space-2);
		background: var(--signal);
		color: var(--color-line-strong);
		font-family: var(--font-mono);
		font-size: clamp(0.76rem, 0.68rem + 0.35vw, var(--fs-base));
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.status-detail {
		max-inline-size: 38ch;
		font-family: var(--font-mono);
		font-size: clamp(0.8rem, 0.74rem + 0.25vw, var(--fs-sm));
		letter-spacing: var(--heading-spacing);
		line-height: 1.35;
		color: var(--color-text-subtle);
	}
</style>
