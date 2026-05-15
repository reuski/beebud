export type WeatherSource = 'metno' | 'icon-ensemble' | 'ecmwf-ensemble';

export type WeatherSlot = {
	time: string;
	source: WeatherSource;
	temperature: number;
	windSpeed: number;
	windGusts: number;
	precipitation: number;
	precipitationProbability: number | null;
	humidity?: number;
	vapourPressureDeficit?: number;
	shortwaveRadiation?: number;
	weatherCode: number;
	isDay: boolean;
};

export type WeatherDay = {
	dayIndex: number;
	source: WeatherSource;
	dateKey: string;
	sunrise: string;
	sunset: string;
	daylightDuration: number;
	temperatureMax: number;
	temperatureMin: number;
	precipitationSum: number;
	precipitationHours: number;
	weatherCode: number;
	windSpeedMax: number;
	windGustsMax: number;
	slots: WeatherSlot[];
};

export type CurrentWeather = {
	source: 'metno';
	time: string;
	interval: number;
	temperature: number;
	windSpeed: number;
	windGusts: number;
	precipitation: number;
	rain: number;
	showers: number;
	snowfall: number;
	humidity: number;
	weatherCode: number;
	isDay: boolean;
};

export const wetWeatherCodes = new Set([
	51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99,
]);

export const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export function isWetWeatherCode(weatherCode?: number | null): boolean {
	return weatherCode !== undefined && weatherCode !== null && wetWeatherCodes.has(weatherCode);
}

export function apiaryIsoHour(date: Date, timezone: string): string {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-CA', {
			timeZone: timezone,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			hour12: false,
		})
			.formatToParts(date)
			.map(({ type, value }) => [type, value]),
	);

	return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:00`;
}

export function apiaryDateKey(date: Date, timezone: string): string {
	return apiaryIsoHour(date, timezone).slice(0, 10);
}

function localDateTimeWithSeconds(localDateTime: string): string {
	return localDateTime.length === 16 ? `${localDateTime}:00` : localDateTime;
}

export function utcOffsetLabel(utcOffsetSeconds: number): string {
	const sign = utcOffsetSeconds >= 0 ? '+' : '-';
	const absolute = Math.abs(utcOffsetSeconds);
	const hours = String(Math.floor(absolute / 3600)).padStart(2, '0');
	const minutes = String(Math.floor((absolute % 3600) / 60)).padStart(2, '0');

	return `${sign}${hours}:${minutes}`;
}

export function apiaryDateTime(localDateTime: string, utcOffsetSeconds: number): Date {
	return new Date(`${localDateTimeWithSeconds(localDateTime)}${utcOffsetLabel(utcOffsetSeconds)}`);
}

export function dateFromKey(dateKey: string): Date {
	return new Date(`${dateKey}T12:00:00`);
}

export function shortDayLabel(dateKey: string, todayKey: string): string {
	if (dateKey === todayKey) return 'Today';
	return dayNames[dateFromKey(dateKey).getDay()];
}

export function fullDayLabel(dateKey: string, todayKey: string): string {
	const date = dateFromKey(dateKey);
	if (dateKey === todayKey) return 'Today';
	return `${dayNames[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`;
}
