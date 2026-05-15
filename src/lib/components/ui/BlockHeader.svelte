<script lang="ts">
const {
	class: className = '',
	prefix,
	title,
	subtitle = [],
	titleTag = 'h2',
	size = 'hero',
	prefixTone = 'dark',
}: {
	class?: string;
	prefix: string;
	title: string;
	subtitle?: string[];
	titleTag?: 'h1' | 'h2' | 'h3';
	size?: 'hero' | 'support';
	prefixTone?: 'light' | 'dark';
} = $props();

const subtitleParts = $derived(subtitle.filter((part) => part.length > 0));
</script>

<div class={`block-header ${className}`.trim()} data-size={size} data-prefix-tone={prefixTone}>
	<span class="block-prefix-shell">
		<span class="block-prefix-face" data-tone={prefixTone}>
			<span class="block-prefix-text">{prefix}</span>
		</span>
	</span>

	<div class="block-copy">
		<svelte:element this={titleTag} class="block-title">{title}</svelte:element>

		{#if subtitleParts.length > 0}
			<p class="block-subtitle">
				{#each subtitleParts as part, index}
					{#if index > 0}
						<span class="block-divider" aria-hidden="true">::</span>
					{/if}
					<span>{part}</span>
				{/each}
			</p>
		{/if}
	</div>
</div>

<style>
	.block-header {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		align-items: center;
		gap: var(--header-gap);
		min-width: 0;
	}

	.block-prefix-shell {
		--prefix-border: var(--border-strong);
		--prefix-inner-notch: max(calc(var(--prefix-notch) - var(--prefix-border)), 0px);
		display: grid;
		align-self: center;
		padding: var(--prefix-border);
		background: var(--color-line-strong);
		clip-path: polygon(
			var(--prefix-notch) 0,
			100% 0,
			100% calc(100% - var(--prefix-notch)),
			calc(100% - var(--prefix-notch)) 100%,
			0 100%,
			0 var(--prefix-notch)
		);
		box-shadow: var(--shadow-hard);
	}

	.block-prefix-face {
		display: grid;
		place-items: center;
		inline-size: var(--prefix-size-box);
		block-size: var(--prefix-size-box);
		background: var(--prefix-bg);
		color: var(--prefix-color);
		clip-path: polygon(
			var(--prefix-inner-notch) 0,
			100% 0,
			100% calc(100% - var(--prefix-inner-notch)),
			calc(100% - var(--prefix-inner-notch)) 100%,
			0 100%,
			0 var(--prefix-inner-notch)
		);
	}

	.block-prefix-text {
		display: block;
		inline-size: 100%;
		text-align: center;
		font-family: var(--font-heading);
		font-size: var(--prefix-size);
		font-weight: 700;
		letter-spacing: var(--prefix-letter-spacing);
		line-height: 1;
		font-variant-numeric: tabular-nums;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.block-copy {
		display: grid;
		align-content: center;
		gap: var(--copy-gap);
		min-width: 0;
		padding-block: var(--copy-padding-y);
		padding-inline-end: var(--copy-padding-x);
	}

	.block-title {
		font-size: var(--title-size);
		line-height: var(--title-line-height);
		letter-spacing: var(--title-letter-spacing);
		text-wrap: balance;
	}

	.block-subtitle {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--subtitle-gap-y) var(--subtitle-gap-x);
		min-width: 0;
		max-inline-size: 64ch;
		font-family: var(--font-mono);
		font-size: var(--subtitle-size);
		font-weight: 600;
		letter-spacing: var(--label-spacing);
		line-height: 1.28;
		text-transform: uppercase;
		color: var(--color-text-subtle);
	}

	.block-divider {
		color: color-mix(in srgb, var(--color-line) 72%, transparent);
	}

	.block-header[data-prefix-tone='light'] {
		--prefix-bg: color-mix(in srgb, var(--color-panel) 94%, white);
		--prefix-color: var(--color-line-strong);
	}

	.block-header[data-prefix-tone='dark'] {
		--prefix-bg: var(--color-line-strong);
		--prefix-color: var(--color-surface);
	}

	.block-header[data-size='hero'] {
		--header-gap: clamp(0.72rem, 0.58rem + 0.5vw, 0.98rem);
		--prefix-notch: calc(var(--panel-notch) * 0.6);
		--prefix-size-box: clamp(3rem, 2.72rem + 0.82vw, 3.42rem);
		--prefix-size: clamp(0.8rem, 0.72rem + 0.22vw, 0.97rem);
		--prefix-letter-spacing: 0.075em;
		--copy-padding-y: clamp(0.04rem, 0.01rem + 0.08vw, 0.1rem);
		--copy-padding-x: 0;
		--copy-gap: clamp(0.34rem, 0.24rem + 0.22vw, 0.52rem);
		--title-size: clamp(1.66rem, 1.03rem + 2vw, 2.82rem);
		--title-line-height: 0.82;
		--title-letter-spacing: 0.044em;
		--subtitle-size: clamp(0.73rem, 0.71rem + 0.08vw, var(--fs-xs));
		--subtitle-gap-y: 0.18rem;
		--subtitle-gap-x: 0.58rem;
	}

	.block-header[data-size='support'] {
		--header-gap: clamp(0.58rem, 0.52rem + 0.22vw, 0.72rem);
		--prefix-notch: calc(var(--panel-notch) * 0.55);
		--prefix-size-box: clamp(2.7rem, 2.58rem + 0.34vw, 2.88rem);
		--prefix-size: clamp(0.72rem, 0.68rem + 0.14vw, 0.82rem);
		--prefix-letter-spacing: 0.07em;
		--copy-padding-y: 0;
		--copy-padding-x: 0;
		--copy-gap: clamp(0.22rem, 0.16rem + 0.12vw, 0.3rem);
		--title-size: clamp(1.24rem, 1.04rem + 0.62vw, 1.7rem);
		--title-line-height: 0.86;
		--title-letter-spacing: 0.038em;
		--subtitle-size: clamp(0.68rem, 0.66rem + 0.06vw, 0.72rem);
		--subtitle-gap-y: 0.12rem;
		--subtitle-gap-x: 0.44rem;
	}

	@media (max-width: 40rem) {
		.block-subtitle {
			gap: 0.125rem 0.375rem;
			font-size: clamp(0.68rem, 0.62rem + 0.18vw, var(--subtitle-size));
		}
	}
</style>
