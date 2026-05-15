import { assessCurrentWeather, assessWeatherSlot, type FlightStatus } from './flight';
import { classifyWorkableDay, flightGateProfile } from './signals';
import {
	apiaryIsoHour,
	type CurrentWeather,
	dateFromKey,
	shortDayLabel,
	type WeatherDay,
	type WeatherSlot,
} from './weather';

export type ForecastSlot = {
	time: string;
	temp: number;
	wind: number;
	gust: number;
	precipitation: number;
	precipitationProbability: number | null;
	riskLabel: string | null;
	suitability: FlightStatus;
	isWindow: boolean;
	isWindowStart: boolean;
};

type ForecastDraft = Omit<ForecastSlot, 'isWindow' | 'isWindowStart'>;

export type DaySummary = {
	label: string;
	date: string;
	dateKey: string;
	status: FlightStatus;
	metricLabel: string | null;
	rain: string | null;
};

function findWindowStart(slots: ForecastDraft[]): number {
	const firstGreen = slots.findIndex((slot) => slot.suitability === 'green');
	if (firstGreen >= 0) return firstGreen;
	return slots.findIndex((slot) => slot.suitability === 'yellow');
}

function applyWindow(slots: ForecastDraft[]): ForecastSlot[] {
	const windowStart = findWindowStart(slots);
	let windowEnd = windowStart;

	while (
		windowEnd >= 0 &&
		windowEnd + 1 < slots.length &&
		slots[windowEnd + 1].suitability !== 'red'
	) {
		windowEnd += 1;
	}

	return slots.map((slot, index) => ({
		...slot,
		isWindow: windowStart >= 0 && index >= windowStart && index <= windowEnd,
		isWindowStart: index === windowStart,
	}));
}

export function buildDaySummaries(days: WeatherDay[], timezone: string, now: Date): DaySummary[] {
	const nowIso = apiaryIsoHour(now, timezone);
	const todayKey = nowIso.slice(0, 10);

	return days.map((day) => {
		const daylightSlots = day.slots.filter((slot) => slot.isDay);
		const remainingSlots =
			day.dayIndex === 0 ? daylightSlots.filter((slot) => slot.time >= nowIso) : daylightSlots;
		const assessTarget =
			remainingSlots.length > 0
				? remainingSlots
				: daylightSlots.length > 0
					? daylightSlots
					: day.slots;
		let greenHours = 0;
		let yellowHours = 0;

		for (const slot of assessTarget) {
			const slotStatus = assessWeatherSlot(slot).status;
			if (slotStatus === 'green') {
				greenHours++;
			} else if (slotStatus === 'yellow') {
				yellowHours++;
			}
		}

		const status: FlightStatus = classifyWorkableDay(
			greenHours,
			yellowHours,
			assessTarget.length,
		).signal;

		let maxProb = 0;
		let totalPrecip = 0;
		let hasProb = false;

		for (const slot of daylightSlots) {
			if (slot.precipitationProbability !== null) {
				hasProb = true;
				maxProb = Math.max(maxProb, slot.precipitationProbability);
			}
			totalPrecip += slot.precipitation;
		}

		const precipLimit = flightGateProfile(day.dateKey).precipitation.limitProbability;
		const rain =
			hasProb && maxProb >= precipLimit
				? `${Math.round(maxProb)}%`
				: !hasProb && totalPrecip > 0.1
					? `${totalPrecip.toFixed(1)}mm`
					: null;
		const metricLabel = rain ?? `WND ${Math.round(day.windSpeedMax)}`;

		const date = dateFromKey(day.dateKey);

		return {
			label: shortDayLabel(day.dateKey, todayKey),
			date: `${date.getDate()}/${date.getMonth() + 1}`,
			dateKey: day.dateKey,
			status,
			metricLabel,
			rain,
		};
	});
}

export function buildForecast(
	days: WeatherDay[],
	selectedDay: number,
	timezone: string,
	now: Date,
): ForecastSlot[] {
	const targetDay = days[selectedDay];
	if (!targetDay) return [];

	const nowIso = apiaryIsoHour(now, timezone);
	const daylightSlots = targetDay.slots.filter(
		(slot) => slot.isDay && (targetDay.dayIndex !== 0 || slot.time >= nowIso),
	);

	const picked =
		daylightSlots.length <= 8
			? daylightSlots
			: targetDay.dayIndex === 0
				? daylightSlots.slice(0, 8)
				: (() => {
						const skip = Math.floor((daylightSlots.length - 8) / 2);
						return daylightSlots.slice(skip, skip + 8);
					})();

	return applyWindow(
		picked.map((slot) => {
			const assessment = assessWeatherSlot(slot);
			return {
				time: slot.time.slice(11, 16),
				temp: Math.round(slot.temperature),
				wind: Math.round(slot.windSpeed),
				gust: Math.round(slot.windGusts),
				precipitation: Math.round(slot.precipitation * 10) / 10,
				precipitationProbability:
					slot.precipitationProbability === null ? null : Math.round(slot.precipitationProbability),
				riskLabel: precipitationRiskLabel(slot),
				suitability: assessment.status,
			};
		}),
	);
}

function precipitationRiskLabel(slot: WeatherSlot): string | null {
	const precipLimit = flightGateProfile(slot.time).precipitation.limitProbability;

	if (slot.precipitationProbability !== null && slot.precipitationProbability >= precipLimit) {
		return `${Math.round(slot.precipitationProbability)}%`;
	}

	if (slot.precipitationProbability === null && slot.precipitation > 0.1) {
		return `${(Math.round(slot.precipitation * 10) / 10).toFixed(1)}mm`;
	}

	return null;
}

export function forecastLabel(daySummaries: DaySummary[], selectedDay: number): string {
	const day = daySummaries[selectedDay];
	if (!day) return 'Grid';
	return selectedDay === 0 ? day.label : `${day.label} ${day.date}`;
}

export function forecastWindowSummary(forecast: ForecastSlot[]): string {
	const start = forecast.find((slot) => slot.isWindowStart);
	if (!start) return 'No viable window';

	const windowSlots = forecast.filter((slot) => slot.isWindow);
	const end = windowSlots.at(-1);
	if (!end || end.time === start.time) return `Open ${start.time}`;

	return `Open ${start.time}-${end.time}`;
}

export function currentPrecipitationLabel(current: CurrentWeather): string {
	return current.precipitation > 0.1 ? `${current.precipitation.toFixed(1)} mm` : 'Dry';
}

export { assessCurrentWeather };
