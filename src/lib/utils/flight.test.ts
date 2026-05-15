import { describe, expect, test } from 'bun:test';
import { calculateFlightSuitability, type WeatherData } from './flight';

function weather(values: Partial<WeatherData> = {}): WeatherData {
	return {
		time: '2026-04-15T12:00',
		temperature: 18,
		windSpeed: 2,
		windGusts: 4,
		precipitationProbability: 0,
		isRaining: false,
		isDay: true,
		weatherCode: 1,
		...values,
	};
}

describe('Finnish flight gates', () => {
	test('uses stricter shoulder-season thermal gates than midsummer gates', () => {
		expect(calculateFlightSuitability(weather({ temperature: 15 })).status).toBe('yellow');
		expect(calculateFlightSuitability(weather({ temperature: 16 })).status).toBe('green');
		expect(
			calculateFlightSuitability(weather({ time: '2026-07-15T12:00', temperature: 15 })).status,
		).toBe('green');
	});

	test('caps otherwise open winter weather at dormant limit', () => {
		expect(
			calculateFlightSuitability(weather({ time: '2026-01-15T12:00', temperature: 18 })).reason,
		).toBe('Dormant limit');
	});

	test('locks spring inspections at Baltic gust thresholds', () => {
		expect(calculateFlightSuitability(weather({ windSpeed: 8, windGusts: 12 })).status).toBe('red');
	});

	test('keeps convective summer precip risk in limit before lock threshold', () => {
		expect(
			calculateFlightSuitability(
				weather({
					time: '2026-07-15T12:00',
					precipitationProbability: 70,
				}),
			).status,
		).toBe('yellow');
		expect(
			calculateFlightSuitability(
				weather({
					time: '2026-07-15T12:00',
					precipitationProbability: 75,
				}),
			).status,
		).toBe('red');
	});
});
