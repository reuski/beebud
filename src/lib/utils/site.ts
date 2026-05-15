import {
	flightGateProfile,
	type NectarGateProfile,
	nectarGateProfile,
	type RangeGate,
} from './signals';
import { apiaryIsoHour, isWetWeatherCode, type WeatherDay, type WeatherSlot } from './weather';

export type DaylightInfo = {
	sunrise: string;
	sunset: string;
	totalHours: number;
	totalDisplay: string;
	trend: 'growing' | 'shrinking' | 'stable';
	trendDelta: string;
};

export type NectarFlow = {
	rating: 'high' | 'moderate' | 'low' | 'none';
	driver: string;
	factors: NectarFactor[];
};

export type NectarFactor = {
	label: string;
	value: string;
	interpretation: string;
	status: 'good' | 'watch' | 'limit';
};

export type EnvironmentGrid = {
	wetHours: number;
	solarPeak: number;
	tempMin: number;
	tempMax: number;
};

export type SiteModel = {
	nectarFlow: NectarFlow;
	daylight: DaylightInfo;
	environment: EnvironmentGrid;
};

function formatDuration(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.round((seconds % 3600) / 60);
	return `${hours}h ${minutes}m`;
}

function calculateDaylight(today: WeatherDay, tomorrow?: WeatherDay): DaylightInfo {
	const durationSec = today.daylightDuration;
	let trend: DaylightInfo['trend'] = 'stable';
	let trendDelta = 'Steady';

	if (tomorrow) {
		const diffSec = tomorrow.daylightDuration - durationSec;
		const diffMin = Math.round(Math.abs(diffSec) / 60);
		if (diffMin >= 1) {
			trend = diffSec > 0 ? 'growing' : 'shrinking';
			const sign = diffSec > 0 ? '+' : '\u2212';
			trendDelta = `${sign}${diffMin} min`;
		}
	}

	return {
		sunrise: today.sunrise.slice(11, 16),
		sunset: today.sunset.slice(11, 16),
		totalHours: durationSec / 3600,
		totalDisplay: formatDuration(durationSec),
		trend,
		trendDelta,
	};
}

function scoreRange(value: number, range: RangeGate): number {
	if (value >= range.optimalLow && value <= range.optimalHigh) return 1;
	if (value < range.absoluteLow || value > range.absoluteHigh) return 0;
	if (value < range.optimalLow) {
		return (value - range.absoluteLow) / (range.optimalLow - range.absoluteLow);
	}

	return (range.absoluteHigh - value) / (range.absoluteHigh - range.optimalHigh);
}

function wetPenalty(slot: WeatherSlot): number {
	const precipitation = flightGateProfile(slot.time).precipitation;

	if (slot.precipitationProbability === null) {
		return slot.precipitation > 0.1 || isWetWeatherCode(slot.weatherCode) ? 0.35 : 1;
	}

	return slot.precipitationProbability >= precipitation.lockProbability
		? 0.45
		: slot.precipitationProbability >= precipitation.limitProbability
			? 0.75
			: 1;
}

type NectarScores = {
	temp: number;
	humidity: number;
	vpd: number;
	light: number;
};

type NectarAverages = {
	temp: number;
	humidity: number;
	vpd: number;
	light: number;
};

function limitingDriver(
	scores: NectarScores,
	averages: NectarAverages,
	profile: NectarGateProfile,
): string {
	const limiting = Object.entries(scores).sort((a, b) => a[1] - b[1])[0][0];

	if (limiting === 'temp') {
		return averages.temp < profile.temperature.optimalLow
			? 'Thermal band low'
			: 'Thermal load high';
	}

	if (limiting === 'humidity') {
		return averages.humidity < profile.humidity.optimalLow
			? 'Moisture deficit'
			: 'Moisture saturation';
	}

	if (limiting === 'vpd') {
		return averages.vpd < profile.vapourPressureDeficit.optimalLow ? 'VPD low' : 'VPD high';
	}

	return averages.light < profile.shortwaveRadiation.optimalLow
		? 'Solar input low'
		: 'Solar load high';
}

function factorStatus(score: number): NectarFactor['status'] {
	if (score >= 0.7) return 'good';
	if (score >= 0.4) return 'watch';
	return 'limit';
}

function hasSiteSignals(
	slot: WeatherSlot,
): slot is WeatherSlot &
	Required<Pick<WeatherSlot, 'humidity' | 'vapourPressureDeficit' | 'shortwaveRadiation'>> {
	return (
		typeof slot.humidity === 'number' &&
		typeof slot.vapourPressureDeficit === 'number' &&
		typeof slot.shortwaveRadiation === 'number'
	);
}

function inOptimalRange(value: number, range: RangeGate): boolean {
	return value >= range.optimalLow && value <= range.optimalHigh;
}

function tempInterpretation(value: number, range: RangeGate): string {
	if (inOptimalRange(value, range)) return 'In band';
	return value < range.optimalLow ? (value < range.absoluteLow ? 'Cold' : 'Cool') : 'Hot';
}

function humidityInterpretation(value: number, range: RangeGate): string {
	if (inOptimalRange(value, range)) return 'In band';
	return value < range.optimalLow ? 'Dry' : 'Humid';
}

function vpdInterpretation(value: number, range: RangeGate): string {
	if (inOptimalRange(value, range)) return 'In band';
	return value < range.optimalLow ? 'Low' : 'High';
}

function lightInterpretation(value: number, range: RangeGate): string {
	if (value >= range.optimalHigh) return 'Strong';
	if (value >= range.optimalLow) return 'Live';
	return value >= range.absoluteLow ? 'Dim' : 'Low';
}

function calculateNectarFlow(today: WeatherDay, currentIso: string): NectarFlow {
	const profile = nectarGateProfile(today.dateKey);

	if (!profile.active) {
		return {
			rating: 'none',
			driver: 'Dormant season',
			factors: [],
		};
	}

	const slots = today.slots
		.filter(hasSiteSignals)
		.filter((slot) => slot.time >= currentIso && slot.isDay);

	if (slots.length === 0) {
		return {
			rating: 'none',
			driver: 'Solar cycle offline',
			factors: [],
		};
	}

	let tempScoreSum = 0;
	let humidityScoreSum = 0;
	let vpdScoreSum = 0;
	let lightScoreSum = 0;
	let avgTemp = 0;
	let avgHumidity = 0;
	let avgVpd = 0;
	let avgLight = 0;

	for (const slot of slots) {
		const penalty = wetPenalty(slot);
		tempScoreSum += scoreRange(slot.temperature, profile.temperature) * penalty;
		humidityScoreSum += scoreRange(slot.humidity, profile.humidity) * penalty;
		vpdScoreSum += scoreRange(slot.vapourPressureDeficit, profile.vapourPressureDeficit) * penalty;
		lightScoreSum += scoreRange(slot.shortwaveRadiation, profile.shortwaveRadiation) * penalty;
		avgTemp += slot.temperature;
		avgHumidity += slot.humidity;
		avgVpd += slot.vapourPressureDeficit;
		avgLight += slot.shortwaveRadiation;
	}

	const tempScore = tempScoreSum / slots.length;
	const humidityScore = humidityScoreSum / slots.length;
	const vpdScore = vpdScoreSum / slots.length;
	const lightScore = lightScoreSum / slots.length;
	avgTemp /= slots.length;
	avgHumidity /= slots.length;
	avgVpd /= slots.length;
	avgLight /= slots.length;
	const combined = tempScore * 0.3 + humidityScore * 0.2 + vpdScore * 0.25 + lightScore * 0.25;
	const rating: NectarFlow['rating'] =
		combined >= 0.7 ? 'high' : combined >= 0.45 ? 'moderate' : combined >= 0.2 ? 'low' : 'none';
	const scores = {
		temp: tempScore,
		humidity: humidityScore,
		vpd: vpdScore,
		light: lightScore,
	};

	const driver =
		combined >= 0.7
			? 'Thermal, VPD, and solar in band'
			: limitingDriver(
					scores,
					{ temp: avgTemp, humidity: avgHumidity, vpd: avgVpd, light: avgLight },
					profile,
				);

	return {
		rating,
		driver,
		factors: [
			{
				label: 'Thermal',
				value: `${Math.round(avgTemp)}\u00B0C`,
				interpretation: tempInterpretation(avgTemp, profile.temperature),
				status: factorStatus(tempScore),
			},
			{
				label: 'Moisture',
				value: `${Math.round(avgHumidity)}%`,
				interpretation: humidityInterpretation(avgHumidity, profile.humidity),
				status: factorStatus(humidityScore),
			},
			{
				label: 'VPD',
				value: `${Math.round(avgVpd * 100) / 100} kPa`,
				interpretation: vpdInterpretation(avgVpd, profile.vapourPressureDeficit),
				status: factorStatus(vpdScore),
			},
			{
				label: 'Solar',
				value: `${Math.round(avgLight / 10) * 10} W/m\u00B2`,
				interpretation: lightInterpretation(avgLight, profile.shortwaveRadiation),
				status: factorStatus(lightScore),
			},
		],
	};
}

function calculateEnvironment(today: WeatherDay): EnvironmentGrid {
	const solarPeak = Math.max(
		0,
		...today.slots
			.filter(hasSiteSignals)
			.filter((slot) => slot.isDay)
			.map((slot) => slot.shortwaveRadiation),
	);

	return {
		wetHours: today.precipitationHours,
		solarPeak: Math.round(solarPeak / 10) * 10,
		tempMin: Math.round(today.temperatureMin),
		tempMax: Math.round(today.temperatureMax),
	};
}

export function buildSiteModel(
	today: WeatherDay,
	tomorrow: WeatherDay | undefined,
	timezone: string,
	now: Date,
): SiteModel {
	const currentIso = apiaryIsoHour(now, timezone);

	return {
		nectarFlow: calculateNectarFlow(today, currentIso),
		daylight: calculateDaylight(today, tomorrow),
		environment: calculateEnvironment(today),
	};
}
