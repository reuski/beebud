export type SignalStatus = 'green' | 'yellow' | 'red';
export type FinnishSeason = 'dormant' | 'spring' | 'summer' | 'autumn';
export type OutlookStatus = 'good' | 'fair' | 'poor';

export type RangeGate = {
	optimalLow: number;
	optimalHigh: number;
	absoluteLow: number;
	absoluteHigh: number;
};

export type FlightGateProfile = {
	season: FinnishSeason;
	dormant: boolean;
	temperature: {
		lockBelow: number;
		openAt: number;
	};
	wind: {
		limitAt: number;
		lockAt: number;
		gustLimitAt: number;
		gustLockAt: number;
	};
	precipitation: {
		limitProbability: number;
		lockProbability: number;
	};
};

export type NectarGateProfile = {
	season: FinnishSeason;
	active: boolean;
	temperature: RangeGate;
	humidity: RangeGate;
	vapourPressureDeficit: RangeGate;
	shortwaveRadiation: RangeGate;
};

export type WorkableDaySignal = {
	status: OutlookStatus;
	signal: SignalStatus;
	availability: number;
};

export const signalStatusLabels = {
	green: 'Open',
	yellow: 'Limit',
	red: 'Lock',
} as const satisfies Record<SignalStatus, string>;

const DEFAULT_SEASON: FinnishSeason = 'summer';

const FLIGHT_GATE_PROFILES = {
	dormant: {
		season: 'dormant',
		dormant: true,
		temperature: {
			lockBelow: 12,
			openAt: 16,
		},
		wind: {
			limitAt: 4.5,
			lockAt: 7,
			gustLimitAt: 7,
			gustLockAt: 10,
		},
		precipitation: {
			limitProbability: 35,
			lockProbability: 65,
		},
	},
	spring: {
		season: 'spring',
		dormant: false,
		temperature: {
			lockBelow: 12,
			openAt: 16,
		},
		wind: {
			limitAt: 5,
			lockAt: 8,
			gustLimitAt: 8,
			gustLockAt: 12,
		},
		precipitation: {
			limitProbability: 40,
			lockProbability: 70,
		},
	},
	summer: {
		season: 'summer',
		dormant: false,
		temperature: {
			lockBelow: 11,
			openAt: 15,
		},
		wind: {
			limitAt: 6,
			lockAt: 9,
			gustLimitAt: 9,
			gustLockAt: 13,
		},
		precipitation: {
			limitProbability: 45,
			lockProbability: 75,
		},
	},
	autumn: {
		season: 'autumn',
		dormant: false,
		temperature: {
			lockBelow: 12,
			openAt: 16,
		},
		wind: {
			limitAt: 5,
			lockAt: 8,
			gustLimitAt: 8,
			gustLockAt: 12,
		},
		precipitation: {
			limitProbability: 40,
			lockProbability: 70,
		},
	},
} as const satisfies Record<FinnishSeason, FlightGateProfile>;

const NECTAR_GATE_PROFILES = {
	dormant: {
		season: 'dormant',
		active: false,
		temperature: {
			optimalLow: 15,
			optimalHigh: 22,
			absoluteLow: 10,
			absoluteHigh: 28,
		},
		humidity: {
			optimalLow: 50,
			optimalHigh: 85,
			absoluteLow: 30,
			absoluteHigh: 98,
		},
		vapourPressureDeficit: {
			optimalLow: 0.2,
			optimalHigh: 0.8,
			absoluteLow: 0.05,
			absoluteHigh: 1.4,
		},
		shortwaveRadiation: {
			optimalLow: 120,
			optimalHigh: 500,
			absoluteLow: 30,
			absoluteHigh: 750,
		},
	},
	spring: {
		season: 'spring',
		active: true,
		temperature: {
			optimalLow: 14,
			optimalHigh: 24,
			absoluteLow: 8,
			absoluteHigh: 30,
		},
		humidity: {
			optimalLow: 50,
			optimalHigh: 85,
			absoluteLow: 30,
			absoluteHigh: 98,
		},
		vapourPressureDeficit: {
			optimalLow: 0.25,
			optimalHigh: 0.95,
			absoluteLow: 0.05,
			absoluteHigh: 1.6,
		},
		shortwaveRadiation: {
			optimalLow: 180,
			optimalHigh: 720,
			absoluteLow: 40,
			absoluteHigh: 900,
		},
	},
	summer: {
		season: 'summer',
		active: true,
		temperature: {
			optimalLow: 16,
			optimalHigh: 27,
			absoluteLow: 10,
			absoluteHigh: 32,
		},
		humidity: {
			optimalLow: 45,
			optimalHigh: 80,
			absoluteLow: 25,
			absoluteHigh: 95,
		},
		vapourPressureDeficit: {
			optimalLow: 0.35,
			optimalHigh: 1.2,
			absoluteLow: 0.1,
			absoluteHigh: 2,
		},
		shortwaveRadiation: {
			optimalLow: 260,
			optimalHigh: 850,
			absoluteLow: 70,
			absoluteHigh: 1000,
		},
	},
	autumn: {
		season: 'autumn',
		active: true,
		temperature: {
			optimalLow: 13,
			optimalHigh: 22,
			absoluteLow: 8,
			absoluteHigh: 28,
		},
		humidity: {
			optimalLow: 55,
			optimalHigh: 88,
			absoluteLow: 35,
			absoluteHigh: 98,
		},
		vapourPressureDeficit: {
			optimalLow: 0.2,
			optimalHigh: 0.85,
			absoluteLow: 0.05,
			absoluteHigh: 1.5,
		},
		shortwaveRadiation: {
			optimalLow: 120,
			optimalHigh: 600,
			absoluteLow: 30,
			absoluteHigh: 800,
		},
	},
} as const satisfies Record<FinnishSeason, NectarGateProfile>;

function monthFromIso(iso?: string): number | null {
	const match = iso?.match(/^\d{4}-(\d{2})-/);
	if (!match) return null;

	const month = Number(match[1]);
	return month >= 1 && month <= 12 ? month : null;
}

export function finnishSeasonFromIso(iso?: string): FinnishSeason {
	const month = monthFromIso(iso);
	if (month === null) return DEFAULT_SEASON;
	if (month >= 4 && month <= 5) return 'spring';
	if (month >= 6 && month <= 8) return 'summer';
	if (month >= 9 && month <= 10) return 'autumn';
	return 'dormant';
}

export function flightGateProfile(iso?: string): FlightGateProfile {
	return FLIGHT_GATE_PROFILES[finnishSeasonFromIso(iso)];
}

export function nectarGateProfile(iso?: string): NectarGateProfile {
	return NECTAR_GATE_PROFILES[finnishSeasonFromIso(iso)];
}

export function classifyWorkableDay(
	greenHours: number,
	yellowHours: number,
	daylightHours: number,
): WorkableDaySignal {
	const workableHours = greenHours + yellowHours;
	const availability = daylightHours > 0 ? (greenHours + yellowHours * 0.55) / daylightHours : 0;

	if (
		greenHours >= 3 ||
		(greenHours >= 2 && workableHours >= 3) ||
		(greenHours >= 1 && availability >= 0.45)
	) {
		return {
			status: 'good',
			signal: 'green',
			availability,
		};
	}

	if (greenHours >= 1 || workableHours >= 2 || availability >= 0.18) {
		return {
			status: 'fair',
			signal: 'yellow',
			availability,
		};
	}

	return {
		status: 'poor',
		signal: 'red',
		availability,
	};
}
