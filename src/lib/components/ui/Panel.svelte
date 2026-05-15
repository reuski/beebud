<script lang="ts">
import type { Snippet } from 'svelte';

const {
	children,
	class: className = '',
	signal,
}: {
	children: Snippet;
	class?: string;
	signal?: 'green' | 'yellow' | 'red';
} = $props();
</script>

<div class={`panel-shell ${className}`.trim()} data-signal={signal}>
	<div class="panel-rail">
		<div class="panel-inner">
			<span class="panel-signal"></span>
			{@render children()}
		</div>
	</div>
</div>

<style>
	.panel-shell {
		--panel-notch-size: var(--panel-notch);
		--panel-border: var(--border-strong);
		--panel-inner-notch: max(calc(var(--panel-notch-size) - var(--panel-border)), 0px);
		--panel-bg: var(--color-panel);
		--panel-color: var(--color-panel-text);
		--panel-padding: var(--space-5);
		--panel-rows: auto minmax(0, 1fr);
		--panel-gap: 0;
		--panel-accent: transparent;
		--panel-accent-width: 0;
		--panel-align: start;
		--signal: var(--panel-accent);
		display: grid;
		min-width: 0;
		height: 100%;
		filter: drop-shadow(var(--shadow-hard));
	}

	.panel-shell[data-signal='green'] {
		--panel-accent: var(--color-success);
	}

	.panel-shell[data-signal='yellow'] {
		--panel-accent: var(--color-warning);
	}

	.panel-shell[data-signal='red'] {
		--panel-accent: var(--color-danger);
	}

	.panel-rail {
		display: grid;
		min-width: 0;
		height: 100%;
		padding: var(--panel-border);
		background: var(--color-line-strong);
		clip-path: polygon(
			var(--panel-notch-size) 0,
			100% 0,
			100% calc(100% - var(--panel-notch-size)),
			calc(100% - var(--panel-notch-size)) 100%,
			0 100%,
			0 var(--panel-notch-size)
		);
	}

	.panel-inner {
		position: relative;
		display: grid;
		grid-template-rows: var(--panel-rows);
		align-content: var(--panel-align);
		gap: var(--panel-gap);
		min-width: 0;
		height: 100%;
		padding: var(--panel-padding);
		background: var(--panel-bg);
		color: var(--panel-color);
		clip-path: polygon(
			var(--panel-inner-notch) 0,
			100% 0,
			100% calc(100% - var(--panel-inner-notch)),
			calc(100% - var(--panel-inner-notch)) 100%,
			0 100%,
			0 var(--panel-inner-notch)
		);
	}

	.panel-signal {
		position: absolute;
		inset: 0 auto 0 0;
		inline-size: var(--panel-accent-width);
		background: var(--panel-accent);
	}

	.status-frame {
		--panel-notch-size: 0px;
		--panel-padding: 0;
		--panel-rows: 1fr;
		--panel-color: var(--color-text);
		--panel-accent-width: 4px;
	}

	.telemetry-frame {
		--panel-padding: 0;
		--panel-rows: 1fr;
	}
</style>
