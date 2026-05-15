import { assessWeatherSlot, type FlightStatus } from './flight';
import { flightGateProfile } from './signals';
import {
	apiaryIsoHour,
	fullDayLabel,
	isWetWeatherCode,
	type WeatherDay,
	type WeatherSlot,
} from './weather';

export type BestWindow = {
	dayLabel: string;
	dateKey: string;
	startTime: string;
	endTime: string;
	durationHours: number;
	status: FlightStatus;
	conditions: string;
} | null;

export type OpsAlert = {
	type: 'cold-snap' | 'extended-rain' | 'high-wind';
	severity: 'warning' | 'critical';
	label: string;
	detail: string;
	dayLabel: string;
	startTime: string;
};

export type OpsReadinessAction = 'Go' | 'Limit' | 'Hold' | 'Check' | 'Clear' | 'Secure' | 'Watch';

export type OpsReadinessItem = {
	type: 'open-hive' | 'frame-pull' | 'feed-check' | 'secure-gear';
	label: string;
	status: FlightStatus;
	action: OpsReadinessAction;
	timing: string;
	detail: string;
};

export type OpsBrief = {
	bestWindow: BestWindow;
	nextWindow: BestWindow;
	alerts: OpsAlert[];
	readiness: OpsReadinessItem[];
	rangeLabel: string;
};

type WindowRun = {
	slots: WeatherSlot[];
	score: number;
};

function dayLabel(slot: WeatherSlot, todayKey: string): string {
	return fullDayLabel(slot.time.slice(0, 10), todayKey);
}

function slotEndTimeLabel(slot: WeatherSlot): string {
	const hour = Number(slot.time.slice(11, 13));
	const minute = slot.time.slice(14, 16);
	return `${String((hour + 1) % 24).padStart(2, '0')}:${minute}`;
}

function opsRangeLabel(days: WeatherDay[]): string {
	return `${days.length}-day range`;
}

function findQualifiedDayRuns(
	slots: WeatherSlot[],
	currentIso: string,
	minHours: number,
	predicate: (slot: WeatherSlot) => boolean,
): WindowRun[] {
	const daylightSlots = slots.filter((slot) => slot.time >= currentIso && slot.isDay);
	if (daylightSlots.length === 0) return [];

	const runs: WindowRun[] = [];
	let blockSlots: WeatherSlot[] = [];
	let blockScore = 0;

	for (const slot of daylightSlots) {
		const assessment = assessWeatherSlot(slot);

		if (!predicate(slot)) {
			if (blockSlots.length >= minHours) {
				runs.push({ slots: [...blockSlots], score: blockScore + blockSlots.length * 8 });
			}
			blockSlots = [];
			blockScore = 0;
			continue;
		}

		blockSlots.push(slot);
		blockScore += assessment.score;
	}

	if (blockSlots.length >= minHours) {
		runs.push({ slots: [...blockSlots], score: blockScore + blockSlots.length * 8 });
	}

	return runs;
}

function findDayWindows(slots: WeatherSlot[], currentIso: string): WindowRun[] {
	return findQualifiedDayRuns(
		slots,
		currentIso,
		2,
		(slot) => assessWeatherSlot(slot).status !== 'red',
	);
}

function findWindows(days: WeatherDay[], currentIso: string): WindowRun[] {
	const runs: WindowRun[] = [];

	for (const day of days) {
		runs.push(...findDayWindows(day.slots, currentIso));
	}

	return runs.sort((a, b) => b.score - a.score || a.slots[0].time.localeCompare(b.slots[0].time));
}

function buildConditions(slots: WeatherSlot[]): string {
	let tempSum = 0;
	let windSum = 0;
	let precipitationSum = 0;
	let probabilitySum = 0;
	let probabilityCount = 0;

	for (const slot of slots) {
		tempSum += slot.temperature;
		windSum += slot.windSpeed;
		precipitationSum += slot.precipitation;
		if (slot.precipitationProbability !== null) {
			probabilitySum += slot.precipitationProbability;
			probabilityCount++;
		}
	}

	const avgTemp = Math.round(tempSum / slots.length);
	const avgWind = Math.round(windSum / slots.length);
	const avgProbability =
		probabilityCount > 0 ? Math.round(probabilitySum / probabilityCount) : null;
	const precipLabel =
		avgProbability !== null
			? avgProbability >= 20
				? `${avgProbability}% precip risk`
				: 'dry'
			: precipitationSum > 0.1
				? `${precipitationSum.toFixed(1)}mm precip`
				: 'dry';

	return `${avgTemp}\u00B0C :: wind ${avgWind} m/s :: ${precipLabel}`;
}

function runToWindow(run: WindowRun, todayKey: string): NonNullable<BestWindow> {
	const start = run.slots[0];
	const end = run.slots.at(-1) ?? start;
	const allGreen = run.slots.every((slot) => assessWeatherSlot(slot).status === 'green');

	return {
		dayLabel: dayLabel(start, todayKey),
		dateKey: start.time.slice(0, 10),
		startTime: start.time.slice(11, 16),
		endTime: slotEndTimeLabel(end),
		durationHours: run.slots.length,
		status: allGreen ? 'green' : 'yellow',
		conditions: buildConditions(run.slots),
	};
}

function findBestWindows(
	days: WeatherDay[],
	currentIso: string,
	todayKey: string,
): { best: BestWindow; next: BestWindow } {
	const runs = findWindows(days, currentIso);
	if (runs.length === 0) return { best: null, next: null };

	const best = runToWindow(runs[0], todayKey);
	const nextRun =
		runs.find((run) => run.slots[0].time.slice(0, 10) !== best.dateKey) ?? runs[1] ?? null;

	return {
		best,
		next: nextRun ? runToWindow(nextRun, todayKey) : null,
	};
}

function isWetSlot(slot: WeatherSlot): boolean {
	const precipitation = flightGateProfile(slot.time).precipitation;

	if (slot.precipitationProbability === null) {
		return slot.precipitation > 0.1 || isWetWeatherCode(slot.weatherCode);
	}

	return slot.precipitationProbability >= precipitation.limitProbability;
}

function isColdLockSlot(slot: WeatherSlot): boolean {
	return slot.isDay && slot.temperature < flightGateProfile(slot.time).temperature.lockBelow;
}

function isWindLimitSlot(slot: WeatherSlot): boolean {
	const wind = flightGateProfile(slot.time).wind;
	return slot.isDay && (slot.windSpeed >= wind.limitAt || slot.windGusts >= wind.gustLimitAt);
}

function isWindLockSlot(slot: WeatherSlot): boolean {
	const wind = flightGateProfile(slot.time).wind;
	return slot.isDay && (slot.windSpeed >= wind.lockAt || slot.windGusts >= wind.gustLockAt);
}

function futureSlots(days: WeatherDay[], currentIso: string): WeatherSlot[] {
	return days.flatMap((day) => day.slots).filter((slot) => slot.time >= currentIso);
}

function detectFirstRun(
	slots: WeatherSlot[],
	minHours: number,
	predicate: (slot: WeatherSlot) => boolean,
): WeatherSlot[] {
	let run: WeatherSlot[] = [];

	for (const slot of slots) {
		if (predicate(slot)) {
			run.push(slot);
			continue;
		}

		if (run.length >= minHours) return run;
		run = [];
	}

	return run.length >= minHours ? run : [];
}

function detectAlerts(days: WeatherDay[], currentIso: string, todayKey: string): OpsAlert[] {
	const slots = futureSlots(days, currentIso);
	const alerts: OpsAlert[] = [];

	const coldRun = detectFirstRun(slots, 6, isColdLockSlot);
	if (coldRun.length > 0) {
		const minTemp = Math.round(Math.min(...coldRun.map((slot) => slot.temperature)));
		const lockTemp = Math.round(flightGateProfile(coldRun[0].time).temperature.lockBelow);
		alerts.push({
			type: 'cold-snap',
			severity: 'critical',
			label: 'Thermal Lock',
			detail: `${coldRun.length}h below ${lockTemp}\u00B0C, min ${minTemp}\u00B0C. Check stores and feed if light.`,
			dayLabel: dayLabel(coldRun[0], todayKey),
			startTime: coldRun[0].time,
		});
	}

	const rainRun = detectFirstRun(slots, 8, isWetSlot);
	if (rainRun.length > 0) {
		const probabilistic = rainRun.some((slot) => slot.precipitationProbability !== null);
		alerts.push({
			type: 'extended-rain',
			severity: 'warning',
			label: probabilistic ? 'Precip Risk' : 'Wet Span',
			detail: `${rainRun.length}h wet span. Expect confinement and higher feed draw.`,
			dayLabel: dayLabel(rainRun[0], todayKey),
			startTime: rainRun[0].time,
		});
	}

	const windLockRun = detectFirstRun(slots, 3, isWindLockSlot);
	if (windLockRun.length > 0) {
		const maxGust = Math.round(Math.max(...windLockRun.map((slot) => slot.windGusts)));
		alerts.push({
			type: 'high-wind',
			severity: 'critical',
			label: 'Wind Lock',
			detail: `${windLockRun.length}h wind lock, gusts to ${maxGust} m/s. Secure covers and skip frame pull.`,
			dayLabel: dayLabel(windLockRun[0], todayKey),
			startTime: windLockRun[0].time,
		});
	} else {
		const windRun = detectFirstRun(slots, 6, isWindLimitSlot);
		if (windRun.length > 0) {
			const maxGust = Math.round(Math.max(...windRun.map((slot) => slot.windGusts)));
			alerts.push({
				type: 'high-wind',
				severity: 'warning',
				label: 'Wind Load',
				detail: `${windRun.length}h wind span, gusts to ${maxGust} m/s. Frame pull risky.`,
				dayLabel: dayLabel(windRun[0], todayKey),
				startTime: windRun[0].time,
			});
		}
	}

	return alerts.sort((a, b) => {
		const order = { critical: 0, warning: 1 };
		return order[a.severity] - order[b.severity] || a.startTime.localeCompare(b.startTime);
	});
}

function findQualifiedWindows(
	days: WeatherDay[],
	currentIso: string,
	minHours: number,
	predicate: (slot: WeatherSlot) => boolean,
): WindowRun[] {
	const runs: WindowRun[] = [];

	for (const day of days) {
		runs.push(...findQualifiedDayRuns(day.slots, currentIso, minHours, predicate));
	}

	return runs.sort((a, b) => b.score - a.score || a.slots[0].time.localeCompare(b.slots[0].time));
}

function windowTiming(window: NonNullable<BestWindow>): string {
	return `${window.dayLabel} ${window.startTime}\u2013${window.endTime}`;
}

function holdDetail(alerts: OpsAlert[], fallback: string): string {
	const alert = alerts[0];
	return alert ? `${alert.label}: ${alert.detail}` : fallback;
}

function firstAlertOfType(alerts: OpsAlert[], types: OpsAlert['type'][]): OpsAlert | null {
	return (
		alerts
			.filter((alert) => types.includes(alert.type))
			.sort((a, b) => a.startTime.localeCompare(b.startTime))[0] ?? null
	);
}

function buildReadiness(
	days: WeatherDay[],
	currentIso: string,
	todayKey: string,
	bestWindow: BestWindow,
	alerts: OpsAlert[],
): OpsReadinessItem[] {
	const strictWindowRun = findQualifiedWindows(
		days,
		currentIso,
		2,
		(slot) => assessWeatherSlot(slot).status === 'green',
	)[0];
	const strictWindow = strictWindowRun ? runToWindow(strictWindowRun, todayKey) : null;
	const windAlert = firstAlertOfType(alerts, ['high-wind']);
	const confinementAlert = firstAlertOfType(alerts, ['cold-snap', 'extended-rain']);

	const openHive: OpsReadinessItem = bestWindow
		? {
				type: 'open-hive',
				label: 'Open hive',
				status: bestWindow.status,
				action: bestWindow.status === 'green' ? 'Go' : 'Limit',
				timing: windowTiming(bestWindow),
				detail:
					bestWindow.status === 'green'
						? `Full inspection viable :: ${bestWindow.conditions}`
						: `Light check only :: ${bestWindow.conditions}`,
			}
		: {
				type: 'open-hive',
				label: 'Open hive',
				status: 'red',
				action: 'Hold',
				timing: 'No viable span',
				detail: holdDetail(alerts, 'No daylight weather gap meets the hive-open threshold.'),
			};

	const framePull: OpsReadinessItem = strictWindow
		? {
				type: 'frame-pull',
				label: 'Frame pull',
				status: 'green',
				action: 'Go',
				timing: windowTiming(strictWindow),
				detail: `Stable green run :: ${strictWindow.conditions}`,
			}
		: bestWindow
			? {
					type: 'frame-pull',
					label: 'Frame pull',
					status: 'yellow',
					action: 'Limit',
					timing: windowTiming(bestWindow),
					detail: windAlert
						? `${windAlert.label}: skip deep frame work near wind span.`
						: 'No full-green run; avoid brood exposure and deep frame work.',
				}
			: {
					type: 'frame-pull',
					label: 'Frame pull',
					status: 'red',
					action: 'Hold',
					timing: 'No stable span',
					detail: holdDetail(alerts, 'No green frame-pull window in range.'),
				};

	const feedCheck: OpsReadinessItem = confinementAlert
		? bestWindow
			? {
					type: 'feed-check',
					label: 'Feed check',
					status: 'yellow',
					action: 'Check',
					timing: windowTiming(bestWindow),
					detail: `${confinementAlert.label} ${confinementAlert.dayLabel}: check light colonies in the next safe gap.`,
				}
			: {
					type: 'feed-check',
					label: 'Feed check',
					status: 'red',
					action: 'Hold',
					timing: confinementAlert.dayLabel,
					detail: `${confinementAlert.label}: wait for safe access before opening.`,
				}
		: {
				type: 'feed-check',
				label: 'Feed check',
				status: 'green',
				action: 'Clear',
				timing: 'As needed',
				detail: 'No cold/wet confinement signal in range.',
			};

	const secureGear: OpsReadinessItem = windAlert
		? {
				type: 'secure-gear',
				label: 'Secure gear',
				status: windAlert.severity === 'critical' ? 'red' : 'yellow',
				action: windAlert.severity === 'critical' ? 'Secure' : 'Watch',
				timing: windAlert.dayLabel,
				detail: windAlert.detail,
			}
		: {
				type: 'secure-gear',
				label: 'Secure gear',
				status: 'green',
				action: 'Clear',
				timing: 'No wind alert',
				detail: 'No wind-action signal in range.',
			};

	return [openHive, framePull, feedCheck, secureGear];
}

export function buildOpsModel(days: WeatherDay[], timezone: string, now: Date): OpsBrief {
	const currentIso = apiaryIsoHour(now, timezone);
	const todayKey = currentIso.slice(0, 10);
	const { best, next } = findBestWindows(days, currentIso, todayKey);
	const alerts = detectAlerts(days, currentIso, todayKey);

	return {
		bestWindow: best,
		nextWindow: next,
		alerts,
		readiness: buildReadiness(days, currentIso, todayKey, best, alerts),
		rangeLabel: opsRangeLabel(days),
	};
}
