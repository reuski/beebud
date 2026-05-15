import { ENSEMBLE_FORECAST_VARIABLES, type RawEnsembleHourly } from './ensemble';
import type { WeatherDay, WeatherSlot } from './weather';

export type WeatherLocation = {
	latitude: number;
	longitude: number;
};

export type DailyAstronomy = {
	time: string[];
	sunrise: string[];
	sunset: string[];
	daylight_duration: number[];
};

export type FutureEnsembleModel = 'icon_seamless' | 'ecmwf_ifs025';

export type FutureWeatherCandidate = {
	source: Extract<WeatherDay['source'], 'icon-ensemble' | 'ecmwf-ensemble'>;
	hourly: RawEnsembleHourly;
	slots: WeatherSlot[];
};

const MET_CURRENT_VARIABLES = [
	'temperature_2m',
	'relative_humidity_2m',
	'precipitation',
	'rain',
	'showers',
	'snowfall',
	'weather_code',
	'is_day',
	'wind_speed_10m',
	'wind_gusts_10m',
] as const;

const MET_HOURLY_VARIABLES = [
	'temperature_2m',
	'relative_humidity_2m',
	'precipitation',
	'weather_code',
	'is_day',
	'wind_speed_10m',
	'wind_gusts_10m',
	'shortwave_radiation',
	'vapour_pressure_deficit',
] as const;

const DAILY_ASTRONOMY_VARIABLES = ['sunrise', 'sunset', 'daylight_duration'] as const;
const WIND_SPEED_UNIT = 'ms' as const;

function buildUrl(host: string, location: WeatherLocation, params: Record<string, string>): string {
	return `${host}?${new URLSearchParams({
		latitude: String(location.latitude),
		longitude: String(location.longitude),
		timezone: 'auto',
		...params,
	})}`;
}

export function buildMetNoUrl(location: WeatherLocation): string {
	return buildUrl('https://api.open-meteo.com/v1/metno', location, {
		forecast_days: '1',
		current: MET_CURRENT_VARIABLES.join(','),
		hourly: MET_HOURLY_VARIABLES.join(','),
		wind_speed_unit: WIND_SPEED_UNIT,
	});
}

export function buildForecastDailyUrl(location: WeatherLocation): string {
	return buildUrl('https://api.open-meteo.com/v1/forecast', location, {
		forecast_days: '8',
		daily: DAILY_ASTRONOMY_VARIABLES.join(','),
	});
}

export function buildEnsembleUrl(location: WeatherLocation, model: FutureEnsembleModel): string {
	return buildUrl('https://ensemble-api.open-meteo.com/v1/ensemble', location, {
		forecast_days: '8',
		models: model,
		hourly: ENSEMBLE_FORECAST_VARIABLES.join(','),
		wind_speed_unit: WIND_SPEED_UNIT,
	});
}

function numericValue(hourly: RawEnsembleHourly, key: string, index: number): number | null {
	const series = hourly[key];
	if (!Array.isArray(series)) return null;

	const value = series[index];
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function hasCompleteDayCoverage(hourly: RawEnsembleHourly, dateKey: string): boolean {
	let hasDaySlot = false;

	for (let index = 0; index < hourly.time.length; index++) {
		if (!hourly.time[index]?.startsWith(dateKey)) continue;
		hasDaySlot = true;

		for (const variable of ENSEMBLE_FORECAST_VARIABLES) {
			if (numericValue(hourly, variable, index) === null) return false;
		}
	}

	return hasDaySlot;
}

function sumSlots(slots: WeatherSlot[], selector: (slot: WeatherSlot) => number): number {
	return slots.reduce((sum, slot) => sum + selector(slot), 0);
}

function maxSlot(slots: WeatherSlot[], selector: (slot: WeatherSlot) => number): number {
	return Math.max(...slots.map(selector));
}

function minSlot(slots: WeatherSlot[], selector: (slot: WeatherSlot) => number): number {
	return Math.min(...slots.map(selector));
}

function dominantWeatherCode(slots: WeatherSlot[]): number {
	const counts = new Map<number, number>();

	for (const slot of slots) {
		const code = Math.round(slot.weatherCode);
		counts.set(code, (counts.get(code) ?? 0) + 1);
	}

	return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
}

function buildWeatherDay(
	dayIndex: number,
	source: WeatherDay['source'],
	daily: DailyAstronomy,
	slots: WeatherSlot[],
): WeatherDay {
	const dateKey = daily.time[dayIndex];
	const daySlots = slots.filter((slot) => slot.time.startsWith(dateKey));

	if (!dateKey || daySlots.length === 0) {
		throw new Error(`Missing ${source} hourly data for D+${dayIndex}`);
	}

	return {
		dayIndex,
		source,
		dateKey,
		sunrise: daily.sunrise[dayIndex],
		sunset: daily.sunset[dayIndex],
		daylightDuration: daily.daylight_duration[dayIndex],
		temperatureMax: maxSlot(daySlots, (slot) => slot.temperature),
		temperatureMin: minSlot(daySlots, (slot) => slot.temperature),
		precipitationSum: sumSlots(daySlots, (slot) => slot.precipitation),
		precipitationHours: daySlots.filter((slot) => slot.precipitation > 0.1).length,
		weatherCode: dominantWeatherCode(daySlots),
		windSpeedMax: maxSlot(daySlots, (slot) => slot.windSpeed),
		windGustsMax: maxSlot(daySlots, (slot) => slot.windGusts),
		slots: daySlots,
	};
}

function preferredFutureSources(dayIndex: number): FutureWeatherCandidate['source'][] {
	return dayIndex <= 4 ? ['icon-ensemble', 'ecmwf-ensemble'] : ['ecmwf-ensemble', 'icon-ensemble'];
}

function pickFutureCandidate(
	dateKey: string,
	dayIndex: number,
	futureCandidates: FutureWeatherCandidate[],
): FutureWeatherCandidate | null {
	for (const source of preferredFutureSources(dayIndex)) {
		const match = futureCandidates.find(
			(candidate) =>
				candidate.source === source && hasCompleteDayCoverage(candidate.hourly, dateKey),
		);
		if (match) return match;
	}

	return null;
}

export function buildWeatherDays(
	daily: DailyAstronomy,
	metNoSlots: WeatherSlot[],
	futureCandidates: FutureWeatherCandidate[],
): WeatherDay[] {
	return daily.time.map((dateKey, dayIndex) => {
		if (dayIndex === 0) {
			return buildWeatherDay(dayIndex, 'metno', daily, metNoSlots);
		}

		const candidate = pickFutureCandidate(dateKey, dayIndex, futureCandidates);
		if (!candidate) {
			throw new Error(`Missing future ensemble hourly data for D+${dayIndex}`);
		}

		return buildWeatherDay(dayIndex, candidate.source, daily, candidate.slots);
	});
}
