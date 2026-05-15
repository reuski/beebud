import { describe, expect, test } from 'bun:test';
import { buildDaySummaries, buildForecast, forecastLabel, forecastWindowSummary } from './forecast';
import type { WeatherDay, WeatherSlot } from './weather';

function slot(time: string, values: Partial<WeatherSlot> = {}): WeatherSlot {
	return {
		time,
		source: 'metno',
		temperature: 18,
		windSpeed: 2,
		windGusts: 4,
		precipitation: 0,
		precipitationProbability: null,
		humidity: 55,
		vapourPressureDeficit: 0.8,
		shortwaveRadiation: 500,
		weatherCode: 1,
		isDay: true,
		...values,
	};
}

function day(dateKey: string, dayIndex: number, slots: WeatherSlot[]): WeatherDay {
	return {
		dayIndex,
		source: 'metno',
		dateKey,
		sunrise: `${dateKey}T06:00`,
		sunset: `${dateKey}T20:00`,
		daylightDuration: 50_400,
		temperatureMax: Math.max(...slots.map((item) => item.temperature)),
		temperatureMin: Math.min(...slots.map((item) => item.temperature)),
		precipitationSum: slots.reduce((sum, item) => sum + item.precipitation, 0),
		precipitationHours: slots.filter((item) => item.precipitation > 0.1).length,
		weatherCode: 1,
		windSpeedMax: Math.max(...slots.map((item) => item.windSpeed)),
		windGustsMax: Math.max(...slots.map((item) => item.windGusts)),
		slots,
	};
}

describe('weather view models', () => {
	const now = new Date('2026-04-15T10:15:00Z');
	const days = [
		day('2026-04-15', 0, [
			slot('2026-04-15T09:00', { temperature: 10 }),
			slot('2026-04-15T10:00', { temperature: 13 }),
			slot('2026-04-15T11:00'),
			slot('2026-04-15T12:00', {
				temperature: 13,
				precipitationProbability: 52,
			}),
			slot('2026-04-15T13:00', { temperature: 10 }),
		]),
		day('2026-04-16', 1, [slot('2026-04-16T12:00', { temperature: 10, windSpeed: 21 })]),
	];

	test('builds day summaries from remaining daylight slots', () => {
		const summaries = buildDaySummaries(days, 'UTC', now);

		expect(summaries[0]).toMatchObject({
			label: 'Today',
			date: '15/4',
			dateKey: '2026-04-15',
			status: 'green',
			metricLabel: '52%',
			rain: '52%',
		});
		expect(summaries[1]).toMatchObject({
			dateKey: '2026-04-16',
			status: 'red',
			metricLabel: 'WND 21',
			rain: null,
		});
		expect(forecastLabel(summaries, 1)).toBe(`${summaries[1].label} 16/4`);
	});

	test('uses wind fallback when rain signal is absent', () => {
		const summaries = buildDaySummaries(
			[
				day('2026-04-17', 0, [slot('2026-04-17T11:00', { temperature: 13, windSpeed: 18 })]),
				day('2026-04-18', 1, [slot('2026-04-18T12:00', { temperature: 10, windSpeed: 24 })]),
			],
			'UTC',
			new Date('2026-04-17T09:00:00Z'),
		);

		expect(summaries.map((summary) => summary.metricLabel)).toEqual(['WND 18', 'WND 24']);
	});

	test('builds a forecast track and marks the viable window', () => {
		const forecast = buildForecast(days, 0, 'UTC', now);

		expect(forecast.map((item) => [item.time, item.suitability, item.isWindow])).toEqual([
			['10:00', 'yellow', false],
			['11:00', 'green', true],
			['12:00', 'yellow', true],
			['13:00', 'red', false],
		]);
		expect(forecast.find((item) => item.isWindowStart)?.time).toBe('11:00');
		expect(forecast.find((item) => item.time === '12:00')?.riskLabel).toBe('52%');
		expect(forecastWindowSummary(forecast)).toBe('Open 11:00-12:00');
	});
});
