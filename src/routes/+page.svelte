<script lang="ts">
import { onMount } from 'svelte';
import BlockHeader from '$lib/components/ui/BlockHeader.svelte';
import Panel from '$lib/components/ui/Panel.svelte';
import DayTabs from '$lib/components/weather/DayTabs.svelte';
import FlightPanel from '$lib/components/weather/FlightPanel.svelte';
import ForecastGrid from '$lib/components/weather/ForecastGrid.svelte';
import OpsPanel from '$lib/components/weather/OpsPanel.svelte';
import SitePanel from '$lib/components/weather/SitePanel.svelte';
import {
	assessCurrentWeather,
	buildDaySummaries,
	buildForecast,
	currentPrecipitationLabel,
	forecastLabel,
	forecastWindowSummary,
} from '$lib/utils/forecast';
import { buildOpsModel } from '$lib/utils/ops';
import { buildSiteModel } from '$lib/utils/site';
import type { PageProps } from './$types';

function selectedDayIndex(days: { dateKey: string }[], selectedDateKey: string | null): number {
	const match = days.findIndex((day) => day.dateKey === selectedDateKey);
	return match >= 0 ? match : 0;
}

const { data }: PageProps = $props();
const weather = $derived(data.weather);

let now = $state(new Date());
let selectedDateKey = $state<string | null>(null);

onMount(() => {
	const intervalId = window.setInterval(() => {
		now = new Date();
	}, 60_000);

	return () => {
		window.clearInterval(intervalId);
	};
});

const dayTabs = $derived(buildDaySummaries(weather.days, weather.timezone, now));
const activeDay = $derived(selectedDayIndex(dayTabs, selectedDateKey));
const flight = $derived(assessCurrentWeather(weather.current));
const rainText = $derived(currentPrecipitationLabel(weather.current));
const forecast = $derived(buildForecast(weather.days, activeDay, weather.timezone, now));
const forecastTitle = $derived(forecastLabel(dayTabs, activeDay));
const windowText = $derived(forecastWindowSummary(forecast));
const ops = $derived(buildOpsModel(weather.days, weather.timezone, now));
const site = $derived(buildSiteModel(weather.days[0], weather.days[1], weather.timezone, now));
</script>

<div class="app-container">
	<section class="section-stack">
		<BlockHeader
			prefix="A1"
			title="Flight Gate"
			subtitle={['Live apiary envelope']}
			titleTag="h1"
			prefixTone="light"
		/>

		<div class="hero-layout">
			<FlightPanel
				status={flight.status}
				reason={flight.reason}
				detail={flight.detail}
			/>

			<Panel class="telemetry-frame">
				<div class="telemetry-grid">
					<div class="telemetry-cell">
						<span class="telemetry-label">Thermal</span>
						<span class="telemetry-value">{Math.round(weather.current.temperature)}°C</span>
					</div>

					<div class="telemetry-cell">
						<span class="telemetry-label">Wind</span>
						<span class="telemetry-value">{Math.round(weather.current.windSpeed)} m/s</span>
					</div>

					<div class="telemetry-cell">
						<span class="telemetry-label">RH</span>
						<span class="telemetry-value">{Math.round(weather.current.humidity)}%</span>
					</div>

					<div class="telemetry-cell">
						<span class="telemetry-label">Precip</span>
						<span class="telemetry-value">{rainText}</span>
					</div>
				</div>
			</Panel>
		</div>
	</section>

	<section class="section-stack">
		<BlockHeader
			prefix="B1"
			title="Forecast Rail"
			subtitle={[forecastTitle, windowText]}
			titleTag="h2"
			prefixTone="dark"
		/>

		<div class="forecast-group">
			<DayTabs
				days={dayTabs}
				selected={activeDay}
				onselect={(dateKey) => {
					selectedDateKey = dateKey;
				}}
			/>
			<ForecastGrid {forecast} />
		</div>
	</section>

	<div class="support-grid">
		<section class="section-stack">
			<BlockHeader
				prefix="01"
				title="Ops Deck"
				subtitle={['Window and alert board']}
				titleTag="h2"
				size="support"
				prefixTone="light"
			/>

			<Panel class="support-card">
				<OpsPanel
					bestWindow={ops.bestWindow}
					nextWindow={ops.nextWindow}
					readiness={ops.readiness}
					alerts={ops.alerts}
					rangeLabel={ops.rangeLabel}
				/>
			</Panel>
		</section>

		<section class="section-stack">
			<BlockHeader
				prefix="02"
				title="Site Core"
				subtitle={['Nectar and air profile']}
				titleTag="h2"
				size="support"
				prefixTone="dark"
			/>

			<Panel class="support-card">
				<SitePanel
					nectarFlow={site.nectarFlow}
					daylight={site.daylight}
					environment={site.environment}
				/>
			</Panel>
		</section>
	</div>
</div>

<style>
	.app-container {
		display: grid;
		gap: var(--space-6);
		inline-size: 100%;
		padding: var(--space-6) var(--page-gutter-x) var(--space-12);
	}

	.section-stack {
		display: grid;
		grid-template-rows: auto minmax(0, 1fr);
		gap: var(--space-3);
	}

	:global(.support-card) {
		--panel-bg: color-mix(in srgb, var(--color-panel) 96%, white);
		--panel-padding: clamp(var(--space-4), 0.9rem + 0.8vw, var(--space-6));
		--panel-gap: var(--space-4);
		--panel-align: stretch;
	}

	.hero-layout,
	.support-grid {
		display: grid;
		gap: var(--space-4);
		align-items: stretch;
	}

	.hero-layout {
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 25rem), 1fr));
	}

	.support-grid {
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 28rem), 1fr));
		gap: var(--space-5);
	}

	.hero-layout > :global(.status-frame),
	.hero-layout > :global(.telemetry-frame) {
		min-block-size: clamp(12rem, 20vw, 14rem);
	}

	.forecast-group {
		display: grid;
		gap: var(--border);
		padding: var(--border-strong);
		background: var(--color-line-strong);
		box-shadow: var(--shadow-hard);
	}

	.telemetry-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--border);
		height: 100%;
		background: var(--color-line-strong);
	}

	.telemetry-cell {
		display: grid;
		align-content: start;
		gap: var(--space-2);
		min-width: 0;
		min-block-size: clamp(5.25rem, 10vw, 6.5rem);
		padding: clamp(0.85rem, 0.6rem + 0.8vw, 1.1rem);
		background: var(--color-panel);
	}

	.telemetry-label {
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		letter-spacing: var(--label-spacing);
		text-transform: uppercase;
		color: var(--color-text-subtle);
	}

	.telemetry-value {
		font-family: var(--font-heading);
		font-size: clamp(1.75rem, 1.3rem + 1.4vw, 2.55rem);
		line-height: 0.9;
		letter-spacing: var(--heading-spacing);
		text-transform: uppercase;
		color: var(--color-panel-text);
	}
</style>
