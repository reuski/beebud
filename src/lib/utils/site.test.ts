import { describe, expect, test } from 'bun:test';
import { buildSiteModel } from './site';
import type { WeatherDay, WeatherSlot } from './weather';

function slot(time: string, values: Partial<WeatherSlot> = {}): WeatherSlot {
	return {
		time,
		source: 'metno',
		temperature: 15,
		windSpeed: 2,
		windGusts: 4,
		precipitation: 0,
		precipitationProbability: null,
		humidity: 75,
		vapourPressureDeficit: 0.45,
		shortwaveRadiation: 220,
		weatherCode: 1,
		isDay: true,
		...values,
	};
}

function day(dateKey: string, slots: WeatherSlot[]): WeatherDay {
	return {
		dayIndex: 0,
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

describe('Finnish site gates', () => {
	test('treats spring nectar weather as active under lower Nordic solar angle', () => {
		const model = buildSiteModel(
			day('2026-04-15', [slot('2026-04-15T10:00'), slot('2026-04-15T11:00')]),
			undefined,
			'UTC',
			new Date('2026-04-15T09:00:00Z'),
		);

		expect(model.nectarFlow).toMatchObject({
			rating: 'high',
			driver: 'Thermal, VPD, and solar in band',
		});
	});

	test('locks nectar flow during the Finnish dormant season', () => {
		const model = buildSiteModel(
			day('2026-01-15', [slot('2026-01-15T12:00', { temperature: 18 })]),
			undefined,
			'UTC',
			new Date('2026-01-15T09:00:00Z'),
		);

		expect(model.nectarFlow).toMatchObject({
			rating: 'none',
			driver: 'Dormant season',
			factors: [],
		});
	});
});
