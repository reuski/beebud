import { z } from 'zod';
import { env } from '$env/dynamic/private';
import { getCachedJson, TTL } from '$lib/server/weather-cache';
import { normalizeEnsembleSlots, type RawEnsembleHourly } from '$lib/utils/ensemble';
import type { CurrentWeather, WeatherSlot } from '$lib/utils/weather';
import {
	buildEnsembleUrl,
	buildForecastDailyUrl,
	buildMetNoUrl,
	buildWeatherDays,
} from '$lib/utils/weather-api';
import type { LayoutServerLoad } from './$types';

const NumberArraySchema = z.array(z.number());
const NullableNumberArraySchema = z.array(z.number().nullable());
const LatitudeSchema = z
	.string()
	.trim()
	.min(1)
	.transform((value) => Number(value))
	.pipe(z.number().finite().min(-90).max(90));
const LongitudeSchema = z
	.string()
	.trim()
	.min(1)
	.transform((value) => Number(value))
	.pipe(z.number().finite().min(-180).max(180));

const MetNoCurrentSchema = z
	.object({
		time: z.string(),
		interval: z.number(),
		temperature_2m: z.number(),
		relative_humidity_2m: z.number(),
		precipitation: z.number(),
		rain: z.number(),
		showers: z.number(),
		snowfall: z.number(),
		weather_code: z.number(),
		is_day: z.number(),
		wind_speed_10m: z.number(),
		wind_gusts_10m: z.number(),
	})
	.strip();

const MetNoHourlySchema = z
	.object({
		time: z.array(z.string()),
		temperature_2m: NullableNumberArraySchema,
		relative_humidity_2m: NullableNumberArraySchema,
		precipitation: NullableNumberArraySchema,
		weather_code: NullableNumberArraySchema,
		is_day: NullableNumberArraySchema,
		wind_speed_10m: NullableNumberArraySchema,
		wind_gusts_10m: NullableNumberArraySchema,
		shortwave_radiation: NullableNumberArraySchema,
		vapour_pressure_deficit: NullableNumberArraySchema,
	})
	.strip();

const ForecastDailySchema = z
	.object({
		time: z.array(z.string()),
		sunrise: z.array(z.string()),
		sunset: z.array(z.string()),
		daylight_duration: NumberArraySchema,
	})
	.strip();

const MetNoResponseSchema = z
	.object({
		timezone: z.string(),
		timezone_abbreviation: z.string(),
		utc_offset_seconds: z.number(),
		current: MetNoCurrentSchema,
		hourly: MetNoHourlySchema,
	})
	.strip();

const ForecastResponseSchema = z
	.object({
		daily: ForecastDailySchema,
	})
	.strip();

const EnsembleHourlySchema = z
	.object({
		time: z.array(z.string()),
		temperature_2m: NullableNumberArraySchema,
		precipitation: NullableNumberArraySchema,
		weather_code: NullableNumberArraySchema,
		is_day: NullableNumberArraySchema,
		wind_speed_10m: NullableNumberArraySchema,
		wind_gusts_10m: NullableNumberArraySchema,
	})
	.catchall(z.union([NullableNumberArraySchema, z.array(z.string())]));

const EnsembleResponseSchema = z
	.object({
		hourly: EnsembleHourlySchema,
	})
	.strip();

const ApiaryEnvSchema = z.object({
	APIARY_LAT: LatitudeSchema,
	APIARY_LON: LongitudeSchema,
});

type MetNoHourly = z.infer<typeof MetNoHourlySchema>;

function parsePayload<T>(schema: z.ZodType<T>, raw: unknown, label: string): T {
	const parsed = schema.safeParse(raw);
	if (parsed.success) return parsed.data;

	console.error(`${label} payload failed validation`, parsed.error);
	throw new Error('Weather API failed');
}

function hourlyValue(series: (number | null)[], index: number): number | null {
	const value = series[index];
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getApiaryLocation() {
	const parsed = ApiaryEnvSchema.safeParse(env);

	if (parsed.success) {
		return {
			latitude: parsed.data.APIARY_LAT,
			longitude: parsed.data.APIARY_LON,
		};
	}

	console.error('Apiary location failed validation', parsed.error);
	throw new Error('Weather API failed');
}

function normalizeCurrent(current: z.infer<typeof MetNoCurrentSchema>): CurrentWeather {
	return {
		source: 'metno',
		time: current.time,
		interval: current.interval,
		temperature: current.temperature_2m,
		windSpeed: current.wind_speed_10m,
		windGusts: current.wind_gusts_10m,
		precipitation: current.precipitation,
		rain: current.rain,
		showers: current.showers,
		snowfall: current.snowfall,
		humidity: current.relative_humidity_2m,
		weatherCode: current.weather_code,
		isDay: current.is_day === 1,
	};
}

function normalizeMetNoSlots(hourly: MetNoHourly): WeatherSlot[] {
	const slots: WeatherSlot[] = [];

	for (let index = 0; index < hourly.time.length; index++) {
		const temperature = hourlyValue(hourly.temperature_2m, index);
		const windSpeed = hourlyValue(hourly.wind_speed_10m, index);
		const windGusts = hourlyValue(hourly.wind_gusts_10m, index);
		const precipitation = hourlyValue(hourly.precipitation, index);
		const humidity = hourlyValue(hourly.relative_humidity_2m, index);
		const vapourPressureDeficit = hourlyValue(hourly.vapour_pressure_deficit, index);
		const shortwaveRadiation = hourlyValue(hourly.shortwave_radiation, index);
		const weatherCode = hourlyValue(hourly.weather_code, index);
		const isDay = hourlyValue(hourly.is_day, index);

		if (
			temperature === null ||
			windSpeed === null ||
			windGusts === null ||
			precipitation === null ||
			humidity === null ||
			vapourPressureDeficit === null ||
			shortwaveRadiation === null ||
			weatherCode === null ||
			isDay === null
		) {
			continue;
		}

		slots.push({
			time: hourly.time[index],
			source: 'metno',
			temperature,
			windSpeed,
			windGusts,
			precipitation,
			precipitationProbability: null,
			humidity,
			vapourPressureDeficit,
			shortwaveRadiation,
			weatherCode,
			isDay: isDay === 1,
		});
	}

	return slots;
}

const WEATHER_DEPENDENCY = 'data:weather';

export const load: LayoutServerLoad = async ({ depends, fetch }) => {
	depends(WEATHER_DEPENDENCY);

	try {
		const apiary = getApiaryLocation();
		const [metNoRaw, astronomyRaw, iconRaw, ecmwfRaw] = await Promise.all([
			getCachedJson(fetch, buildMetNoUrl(apiary), TTL.metno),
			getCachedJson(fetch, buildForecastDailyUrl(apiary), TTL.astronomy),
			getCachedJson(fetch, buildEnsembleUrl(apiary, 'icon_seamless'), TTL.ensemble),
			getCachedJson(fetch, buildEnsembleUrl(apiary, 'ecmwf_ifs025'), TTL.ensemble),
		]);

		const metNo = parsePayload(MetNoResponseSchema, metNoRaw, 'MET Norway');
		const astronomy = parsePayload(ForecastResponseSchema, astronomyRaw, 'Forecast daily');
		const icon = parsePayload(EnsembleResponseSchema, iconRaw, 'ICON ensemble');
		const ecmwf = parsePayload(EnsembleResponseSchema, ecmwfRaw, 'ECMWF ensemble');

		const current = normalizeCurrent(metNo.current);
		const metNoSlots = normalizeMetNoSlots(metNo.hourly);
		const iconSlots = normalizeEnsembleSlots(icon.hourly as RawEnsembleHourly, 'icon-ensemble');
		const ecmwfSlots = normalizeEnsembleSlots(ecmwf.hourly as RawEnsembleHourly, 'ecmwf-ensemble');

		return {
			weather: {
				timezone: metNo.timezone,
				timezone_abbreviation: metNo.timezone_abbreviation,
				utcOffsetSeconds: metNo.utc_offset_seconds,
				current,
				days: buildWeatherDays(astronomy.daily, metNoSlots, [
					{
						source: 'icon-ensemble',
						hourly: icon.hourly as RawEnsembleHourly,
						slots: iconSlots,
					},
					{
						source: 'ecmwf-ensemble',
						hourly: ecmwf.hourly as RawEnsembleHourly,
						slots: ecmwfSlots,
					},
				]),
			},
		};
	} catch (error) {
		console.error('Weather API failed', error);
		throw new Error('Weather API failed');
	}
};
