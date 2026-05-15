import { describe, expect, test } from 'bun:test';
import type { RawEnsembleHourly } from './ensemble';
import type { WeatherSlot } from './weather';
import {
	buildEnsembleUrl,
	buildForecastDailyUrl,
	buildMetNoUrl,
	buildWeatherDays,
	type DailyAstronomy,
	type FutureWeatherCandidate,
} from './weather-api';

const LOCATION = {
	latitude: 12.345678,
	longitude: 45.678912,
} as const;

const TODAY = '2026-04-16';
const TOMORROW = '2026-04-17';

function hourlyTimes(dateKey: string): string[] {
	return Array.from({ length: 24 }, (_, hour) => `${dateKey}T${String(hour).padStart(2, '0')}:00`);
}

function constantSeries(times: string[], value: number): number[] {
	return times.map(() => value);
}

function daylightSeries(times: string[]): number[] {
	return times.map((_, hour) => (hour >= 6 && hour < 21 ? 1 : 0));
}

function rawHourly(
	dateKey: string,
	overrides: Partial<Record<string, (number | null)[]>> = {},
): RawEnsembleHourly {
	const time = hourlyTimes(dateKey);

	return {
		time,
		temperature_2m: overrides.temperature_2m ?? constantSeries(time, 15),
		precipitation: overrides.precipitation ?? constantSeries(time, 0),
		weather_code: overrides.weather_code ?? constantSeries(time, 1),
		is_day: overrides.is_day ?? daylightSeries(time),
		wind_speed_10m: overrides.wind_speed_10m ?? constantSeries(time, 8),
		wind_gusts_10m: overrides.wind_gusts_10m ?? constantSeries(time, 12),
	};
}

function slots(times: string[], source: WeatherSlot['source']): WeatherSlot[] {
	return times.map((time, hour) => ({
		time,
		source,
		temperature: 15,
		windSpeed: 8,
		windGusts: 12,
		precipitation: 0,
		precipitationProbability: source === 'metno' ? null : 20,
		humidity: 60,
		vapourPressureDeficit: 0.8,
		shortwaveRadiation: hour >= 6 && hour < 21 ? 300 : 0,
		weatherCode: 1,
		isDay: hour >= 6 && hour < 21,
	}));
}

function dailyAstronomy(dateKeys = [TODAY, TOMORROW]): DailyAstronomy {
	return {
		time: dateKeys,
		sunrise: dateKeys.map((dateKey) => `${dateKey}T06:00`),
		sunset: dateKeys.map((dateKey) => `${dateKey}T20:50`),
		daylight_duration: dateKeys.map(() => 53_400),
	};
}

function futureCandidate(
	source: FutureWeatherCandidate['source'],
	dateKey: string,
	hourly: RawEnsembleHourly,
	slotTimes = hourlyTimes(dateKey),
): FutureWeatherCandidate {
	return {
		source,
		hourly,
		slots: slots(slotTimes, source),
	};
}

describe('weather load helpers', () => {
	test('builds a MET Norway URL for current and today hourly only', () => {
		const url = new URL(buildMetNoUrl(LOCATION));

		expect(`${url.origin}${url.pathname}`).toBe('https://api.open-meteo.com/v1/metno');
		expect(url.searchParams.get('forecast_days')).toBe('1');
		expect(url.searchParams.get('daily')).toBeNull();
		expect(url.searchParams.get('current')).toContain('temperature_2m');
		expect(url.searchParams.get('hourly')).toContain('vapour_pressure_deficit');
		expect(url.searchParams.get('wind_speed_unit')).toBe('ms');
	});

	test('builds an ensemble URL with wind in meters per second', () => {
		const url = new URL(buildEnsembleUrl(LOCATION, 'icon_seamless'));

		expect(`${url.origin}${url.pathname}`).toBe('https://ensemble-api.open-meteo.com/v1/ensemble');
		expect(url.searchParams.get('models')).toBe('icon_seamless');
		expect(url.searchParams.get('hourly')).toContain('wind_speed_10m');
		expect(url.searchParams.get('hourly')).not.toContain('shortwave_radiation');
		expect(url.searchParams.get('wind_speed_unit')).toBe('ms');
	});

	test('builds a generic forecast URL for 8-day astronomy data', () => {
		const url = new URL(buildForecastDailyUrl(LOCATION));

		expect(`${url.origin}${url.pathname}`).toBe('https://api.open-meteo.com/v1/forecast');
		expect(url.searchParams.get('forecast_days')).toBe('8');
		expect(url.searchParams.get('daily')).toBe('sunrise,sunset,daylight_duration');
		expect(url.searchParams.get('current')).toBeNull();
		expect(url.searchParams.get('hourly')).toBeNull();
	});

	test('keeps day 0 on MET Norway and prefers ICON when future coverage is complete', () => {
		const days = buildWeatherDays(dailyAstronomy(), slots(hourlyTimes(TODAY), 'metno'), [
			futureCandidate('icon-ensemble', TOMORROW, rawHourly(TOMORROW)),
			futureCandidate('ecmwf-ensemble', TOMORROW, rawHourly(TOMORROW)),
		]);

		expect(days[0].source).toBe('metno');
		expect(days[1].source).toBe('icon-ensemble');
	});

	test('prefers ECMWF once the plan moves into the week-range horizon', () => {
		const dateKeys = [TODAY, '2026-04-17', '2026-04-18', '2026-04-19', '2026-04-20', '2026-04-21'];
		const longRangeDate = dateKeys[5];
		const days = buildWeatherDays(dailyAstronomy(dateKeys), slots(hourlyTimes(TODAY), 'metno'), [
			futureCandidate('icon-ensemble', longRangeDate, rawHourly(longRangeDate)),
			futureCandidate('ecmwf-ensemble', longRangeDate, rawHourly(longRangeDate)),
			futureCandidate('icon-ensemble', TOMORROW, rawHourly(TOMORROW)),
			futureCandidate('ecmwf-ensemble', TOMORROW, rawHourly(TOMORROW)),
			futureCandidate('icon-ensemble', '2026-04-18', rawHourly('2026-04-18')),
			futureCandidate('ecmwf-ensemble', '2026-04-18', rawHourly('2026-04-18')),
			futureCandidate('icon-ensemble', '2026-04-19', rawHourly('2026-04-19')),
			futureCandidate('ecmwf-ensemble', '2026-04-19', rawHourly('2026-04-19')),
			futureCandidate('icon-ensemble', '2026-04-20', rawHourly('2026-04-20')),
			futureCandidate('ecmwf-ensemble', '2026-04-20', rawHourly('2026-04-20')),
		]);

		expect(days[1].source).toBe('icon-ensemble');
		expect(days[5].source).toBe('ecmwf-ensemble');
	});

	test('falls back to ECMWF when ICON is missing a required hourly field for the date', () => {
		const iconTimes = hourlyTimes(TOMORROW);
		const partialIcon = rawHourly(TOMORROW, {
			wind_gusts_10m: iconTimes.map((_, index) => (index === 5 ? null : 12)),
		});

		const days = buildWeatherDays(dailyAstronomy(), slots(hourlyTimes(TODAY), 'metno'), [
			futureCandidate(
				'icon-ensemble',
				TOMORROW,
				partialIcon,
				iconTimes.filter((_, index) => index !== 5),
			),
			futureCandidate('ecmwf-ensemble', TOMORROW, rawHourly(TOMORROW)),
		]);

		expect(days[1].source).toBe('ecmwf-ensemble');
	});

	test('throws when neither future ensemble source fully covers the date', () => {
		const iconTimes = hourlyTimes(TOMORROW);
		const partialIcon = rawHourly(TOMORROW, {
			wind_gusts_10m: iconTimes.map((_, index) => (index === 5 ? null : 12)),
		});
		const partialEcmwf = rawHourly(TOMORROW, {
			precipitation: iconTimes.map((_, index) => (index === 8 ? null : 0)),
		});

		expect(() =>
			buildWeatherDays(dailyAstronomy(), slots(hourlyTimes(TODAY), 'metno'), [
				futureCandidate(
					'icon-ensemble',
					TOMORROW,
					partialIcon,
					iconTimes.filter((_, index) => index !== 5),
				),
				futureCandidate(
					'ecmwf-ensemble',
					TOMORROW,
					partialEcmwf,
					iconTimes.filter((_, index) => index !== 8),
				),
			]),
		).toThrow('Missing future ensemble hourly data for D+1');
	});
});
