import { flightGateProfile, type SignalStatus } from './signals';
import { type CurrentWeather, isWetWeatherCode, type WeatherSlot } from './weather';

export type WeatherData = {
	time: string;
	temperature: number;
	windSpeed: number;
	windGusts: number;
	precipitationProbability: number | null;
	isRaining: boolean;
	isDay: boolean;
	weatherCode?: number;
};

export type FlightStatus = SignalStatus;

export type FlightSuitability = {
	status: FlightStatus;
	score: number;
	reason: string;
	detail: string;
};

function red(reason: string, detail: string): FlightSuitability {
	return {
		status: 'red',
		score: 0,
		reason,
		detail,
	};
}

function yellow(reason: string, detail: string, score = 55): FlightSuitability {
	return {
		status: 'yellow',
		score,
		reason,
		detail,
	};
}

export function calculateFlightSuitability(weather: WeatherData): FlightSuitability {
	const {
		time,
		temperature,
		windSpeed,
		windGusts,
		precipitationProbability,
		isRaining,
		isDay,
		weatherCode,
	} = weather;
	const profile = flightGateProfile(time);

	if (!isDay) {
		return red('Night lock', 'No flight or inspection until first light.');
	}

	if (isRaining || (precipitationProbability === null && isWetWeatherCode(weatherCode))) {
		return red('Precip active', 'Wet weather on site. Keep the hive sealed.');
	}

	if (
		precipitationProbability !== null &&
		precipitationProbability >= profile.precipitation.lockProbability
	) {
		return red(
			'Precip lock',
			`${Math.round(precipitationProbability)}% precip risk. Delay field work.`,
		);
	}

	if (temperature < profile.temperature.lockBelow) {
		return red('Thermal lock', `${Math.round(temperature)}°C on site. Brood chill risk high.`);
	}

	if (windSpeed >= profile.wind.lockAt || windGusts >= profile.wind.gustLockAt) {
		return red(
			'Wind lock',
			`${Math.round(windSpeed)} m/s with ${Math.round(windGusts)} m/s gusts. Frame pull unsafe.`,
		);
	}

	if (profile.dormant) {
		return yellow(
			'Dormant limit',
			'Off-season colony mode. Use emergency checks only and keep brood covered.',
			45,
		);
	}

	if (temperature < profile.temperature.openAt) {
		return yellow(
			'Thermal limit',
			`${Math.round(temperature)}°C on site. Limit brood exposure and work fast.`,
			40,
		);
	}

	if (windSpeed >= profile.wind.limitAt || windGusts >= profile.wind.gustLimitAt) {
		return yellow(
			'Wind limit',
			`${Math.round(windSpeed)} m/s with ${Math.round(windGusts)} m/s gusts. Colonies may run defensive.`,
			50,
		);
	}

	if (
		precipitationProbability !== null &&
		precipitationProbability >= profile.precipitation.limitProbability
	) {
		return yellow(
			'Precip limit',
			`${Math.round(precipitationProbability)}% precip risk. Keep covers ready.`,
			55,
		);
	}

	return {
		status: 'green',
		score: 100,
		reason: 'Stable',
		detail: 'Thermal, wind, and light stay in band. Full inspection viable.',
	};
}

export function hasDeterministicRain(
	weather: Pick<WeatherSlot, 'precipitation' | 'precipitationProbability'>,
): boolean {
	return weather.precipitationProbability === null && weather.precipitation > 0.1;
}

export function assessWeatherSlot(slot: WeatherSlot): FlightSuitability {
	return calculateFlightSuitability({
		time: slot.time,
		temperature: slot.temperature,
		windSpeed: slot.windSpeed,
		windGusts: slot.windGusts,
		precipitationProbability: slot.precipitationProbability,
		isRaining: hasDeterministicRain(slot),
		isDay: slot.isDay,
		weatherCode: slot.weatherCode,
	});
}

export function assessCurrentWeather(current: CurrentWeather): FlightSuitability {
	return calculateFlightSuitability({
		time: current.time,
		temperature: current.temperature,
		windSpeed: current.windSpeed,
		windGusts: current.windGusts,
		precipitationProbability: null,
		isRaining:
			current.precipitation > 0.1 || current.rain + current.showers + current.snowfall > 0.1,
		isDay: current.isDay,
		weatherCode: current.weatherCode,
	});
}
