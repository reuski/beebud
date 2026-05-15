import { describe, expect, test } from 'bun:test';
import { buildOpsModel } from './ops';
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

describe('ops view model', () => {
	test('treats yellow-only daylight as a limited ops window instead of a lockout', () => {
		const ops = buildOpsModel(
			[
				day('2026-04-15', 0, [
					slot('2026-04-15T09:00', { temperature: 10 }),
					slot('2026-04-15T10:00', { temperature: 12 }),
					slot('2026-04-15T11:00', { temperature: 13 }),
					slot('2026-04-15T12:00', { temperature: 13 }),
					slot('2026-04-15T13:00', { temperature: 11 }),
				]),
				day('2026-04-16', 1, [slot('2026-04-16T12:00', { temperature: 10 })]),
			],
			'UTC',
			new Date('2026-04-15T09:15:00Z'),
		);

		expect(ops.bestWindow).toMatchObject({
			dateKey: '2026-04-15',
			startTime: '10:00',
			endTime: '13:00',
			status: 'yellow',
		});
		expect(ops.readiness.find((item) => item.type === 'open-hive')).toMatchObject({
			status: 'yellow',
			action: 'Limit',
		});
	});

	test('marks days with a sustained green run as good and exposes the best window', () => {
		const ops = buildOpsModel(
			[
				day('2026-04-15', 0, [
					slot('2026-04-15T09:00', { temperature: 10 }),
					slot('2026-04-15T10:00'),
					slot('2026-04-15T11:00'),
					slot('2026-04-15T12:00'),
					slot('2026-04-15T13:00', { windSpeed: 8, windGusts: 12 }),
				]),
				day('2026-04-16', 1, [slot('2026-04-16T12:00', { temperature: 10 })]),
			],
			'UTC',
			new Date('2026-04-15T09:15:00Z'),
		);

		expect(ops.readiness.find((item) => item.type === 'frame-pull')).toMatchObject({
			status: 'green',
			action: 'Go',
		});
		expect(ops.bestWindow).toMatchObject({
			dateKey: '2026-04-15',
			startTime: '10:00',
			endTime: '13:00',
			durationHours: 3,
			status: 'green',
		});
	});

	test('selects the highest-scoring window across the full forecast horizon', () => {
		const ops = buildOpsModel(
			[
				day('2026-04-15', 0, [slot('2026-04-15T10:00'), slot('2026-04-15T11:00')]),
				day('2026-04-16', 1, [slot('2026-04-16T10:00', { temperature: 10 })]),
				day('2026-04-17', 2, [slot('2026-04-17T10:00', { temperature: 10 })]),
				day('2026-04-18', 3, [slot('2026-04-18T10:00', { temperature: 10 })]),
				day('2026-04-19', 4, [
					slot('2026-04-19T10:00'),
					slot('2026-04-19T11:00'),
					slot('2026-04-19T12:00'),
				]),
			],
			'UTC',
			new Date('2026-04-15T09:15:00Z'),
		);

		expect(ops.bestWindow).toMatchObject({
			dateKey: '2026-04-19',
			startTime: '10:00',
			endTime: '13:00',
			durationHours: 3,
			status: 'green',
		});
		expect(ops.rangeLabel).toBe('5-day range');
	});

	test('builds task readiness from windows and active alerts', () => {
		const ops = buildOpsModel(
			[
				day('2026-04-15', 0, [
					slot('2026-04-15T10:00'),
					slot('2026-04-15T11:00'),
					slot('2026-04-15T12:00', { precipitationProbability: 80 }),
					slot('2026-04-15T13:00', { precipitationProbability: 80 }),
					slot('2026-04-15T14:00', { precipitationProbability: 80 }),
					slot('2026-04-15T15:00', { precipitationProbability: 80 }),
					slot('2026-04-15T16:00', { precipitationProbability: 80 }),
					slot('2026-04-15T17:00', { precipitationProbability: 80 }),
					slot('2026-04-15T18:00', { precipitationProbability: 80 }),
					slot('2026-04-15T19:00', { precipitationProbability: 80 }),
				]),
			],
			'UTC',
			new Date('2026-04-15T09:15:00Z'),
		);

		expect(ops.alerts[0]).toMatchObject({
			type: 'extended-rain',
			label: 'Precip Risk',
		});
		expect(ops.readiness.find((item) => item.type === 'open-hive')).toMatchObject({
			status: 'green',
			action: 'Go',
			timing: 'Today 10:00–12:00',
		});
		expect(ops.readiness.find((item) => item.type === 'feed-check')).toMatchObject({
			status: 'yellow',
			action: 'Check',
		});
		expect(ops.readiness.find((item) => item.type === 'secure-gear')).toMatchObject({
			status: 'green',
			action: 'Clear',
		});
	});

	test('keeps mixed green and limit windows in limit status', () => {
		const ops = buildOpsModel(
			[
				day('2026-04-15', 0, [
					slot('2026-04-15T10:00'),
					slot('2026-04-15T11:00', { temperature: 13 }),
					slot('2026-04-15T12:00'),
				]),
			],
			'UTC',
			new Date('2026-04-15T09:15:00Z'),
		);

		expect(ops.bestWindow).toMatchObject({
			startTime: '10:00',
			endTime: '13:00',
			status: 'yellow',
		});
		expect(ops.readiness.find((item) => item.type === 'open-hive')).toMatchObject({
			status: 'yellow',
			action: 'Limit',
		});
		expect(ops.readiness.find((item) => item.type === 'frame-pull')).toMatchObject({
			status: 'yellow',
			action: 'Limit',
		});
	});

	test('uses precipitation limit probability for sustained precip alerts', () => {
		const ops = buildOpsModel(
			[
				day('2026-06-15', 0, [
					slot('2026-06-15T09:00', { precipitationProbability: 45 }),
					slot('2026-06-15T10:00', { precipitationProbability: 45 }),
					slot('2026-06-15T11:00', { precipitationProbability: 45 }),
					slot('2026-06-15T12:00', { precipitationProbability: 45 }),
					slot('2026-06-15T13:00', { precipitationProbability: 45 }),
					slot('2026-06-15T14:00', { precipitationProbability: 45 }),
					slot('2026-06-15T15:00', { precipitationProbability: 45 }),
					slot('2026-06-15T16:00', { precipitationProbability: 45 }),
				]),
			],
			'UTC',
			new Date('2026-06-15T08:15:00Z'),
		);

		expect(ops.alerts[0]).toMatchObject({
			type: 'extended-rain',
			label: 'Precip Risk',
		});
	});
});
