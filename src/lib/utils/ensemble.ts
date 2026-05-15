import { isWetWeatherCode, type WeatherSlot, type WeatherSource } from './weather';

export const ENSEMBLE_FORECAST_VARIABLES = [
	'temperature_2m',
	'precipitation',
	'weather_code',
	'is_day',
	'wind_speed_10m',
	'wind_gusts_10m',
] as const;

type EnsembleVariable = (typeof ENSEMBLE_FORECAST_VARIABLES)[number];

export type RawEnsembleHourly = {
	time: string[];
	[key: string]: string[] | (number | null)[] | undefined;
};

type NumericSeries = (number | null)[];

type EnsembleSeriesLookup = Record<
	EnsembleVariable,
	{
		base: NumericSeries | undefined;
		members: NumericSeries[];
	}
>;

function finiteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

function numericSeries(hourly: RawEnsembleHourly, key: string): NumericSeries | undefined {
	const series = hourly[key];
	if (!Array.isArray(series)) return undefined;
	return series as NumericSeries;
}

function valueAt(series: NumericSeries | undefined, index: number): number | null {
	const value = series?.[index];
	return finiteNumber(value) ? value : null;
}

function percentile(sortedValues: number[], percentileValue: number): number | null {
	if (sortedValues.length === 0) return null;
	if (sortedValues.length === 1) return sortedValues[0];

	const index = (sortedValues.length - 1) * percentileValue;
	const lower = Math.floor(index);
	const upper = Math.ceil(index);
	const weight = index - lower;

	return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function median(values: number[]): number | null {
	return percentile(
		[...values].sort((a, b) => a - b),
		0.5,
	);
}

function buildSeriesLookup(hourly: RawEnsembleHourly): EnsembleSeriesLookup {
	const lookup = Object.fromEntries(
		ENSEMBLE_FORECAST_VARIABLES.map((variable) => [
			variable,
			{
				base: numericSeries(hourly, variable),
				members: [] as { memberIndex: number; series: NumericSeries }[],
			},
		]),
	) as Record<
		EnsembleVariable,
		{
			base: NumericSeries | undefined;
			members: { memberIndex: number; series: NumericSeries }[];
		}
	>;

	for (const key of Object.keys(hourly)) {
		const match = key.match(/^(.*)_member(\d+)$/);
		if (!match) continue;

		const variable = match[1];
		if (!ENSEMBLE_FORECAST_VARIABLES.includes(variable as EnsembleVariable)) continue;

		const series = numericSeries(hourly, key);
		if (!series) continue;

		lookup[variable as EnsembleVariable].members.push({
			memberIndex: Number(match[2]),
			series,
		});
	}

	return Object.fromEntries(
		ENSEMBLE_FORECAST_VARIABLES.map((variable) => [
			variable,
			{
				base: lookup[variable].base,
				members: lookup[variable].members
					.sort((a, b) => a.memberIndex - b.memberIndex)
					.map(({ series }) => series),
			},
		]),
	) as EnsembleSeriesLookup;
}

function memberValues(
	lookup: EnsembleSeriesLookup,
	variable: EnsembleVariable,
	index: number,
): number[] {
	const values = lookup[variable].members
		.map((series) => valueAt(series, index))
		.filter(finiteNumber);

	if (values.length > 0) return values;

	const baseValue = valueAt(lookup[variable].base, index);
	return finiteNumber(baseValue) ? [baseValue] : [];
}

function memberMedian(
	lookup: EnsembleSeriesLookup,
	variable: EnsembleVariable,
	index: number,
): number | null {
	return median(memberValues(lookup, variable, index));
}

function precipitationProbability(lookup: EnsembleSeriesLookup, index: number): number | null {
	const precipitationMembers = lookup.precipitation.members;
	const codeMembers = lookup.weather_code.members;
	const memberCount = Math.max(precipitationMembers.length, codeMembers.length);

	if (memberCount === 0) {
		const precipitation = valueAt(lookup.precipitation.base, index);
		const weatherCode = valueAt(lookup.weather_code.base, index);
		if (!finiteNumber(precipitation) && !finiteNumber(weatherCode)) return null;
		return (precipitation ?? 0) > 0.1 || isWetWeatherCode(weatherCode) ? 100 : 0;
	}

	let validMembers = 0;
	let wetMembers = 0;

	for (let memberIndex = 0; memberIndex < memberCount; memberIndex++) {
		const precipitation = valueAt(precipitationMembers[memberIndex], index);
		const weatherCode = valueAt(codeMembers[memberIndex], index);
		if (!finiteNumber(precipitation) && !finiteNumber(weatherCode)) continue;

		validMembers++;
		if ((precipitation ?? 0) > 0.1 || isWetWeatherCode(weatherCode)) wetMembers++;
	}

	if (validMembers === 0) return null;
	return Math.round((wetMembers / validMembers) * 100);
}

function dominantWeatherCode(codes: number[]): number | null {
	if (codes.length === 0) return null;

	const counts = new Map<number, number>();
	for (const code of codes) {
		const roundedCode = Math.round(code);
		counts.set(roundedCode, (counts.get(roundedCode) ?? 0) + 1);
	}

	return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0];
}

function representativeWeatherCode(
	lookup: EnsembleSeriesLookup,
	index: number,
	wetRisk: number,
): number | null {
	const codes = memberValues(lookup, 'weather_code', index);
	const wetCodes = codes.filter((code) => isWetWeatherCode(code));

	if (wetRisk >= 35 && wetCodes.length > 0) return dominantWeatherCode(wetCodes);
	return dominantWeatherCode(codes);
}

function requiredMedian(
	lookup: EnsembleSeriesLookup,
	variable: EnsembleVariable,
	index: number,
): number | null {
	return memberMedian(lookup, variable, index);
}

export function normalizeEnsembleSlots(
	hourly: RawEnsembleHourly,
	source: Extract<WeatherSource, 'icon-ensemble' | 'ecmwf-ensemble'>,
): WeatherSlot[] {
	const slots: WeatherSlot[] = [];
	const seriesLookup = buildSeriesLookup(hourly);

	for (let index = 0; index < hourly.time.length; index++) {
		const precipitationRisk = precipitationProbability(seriesLookup, index);
		if (precipitationRisk === null) continue;

		const temperature = requiredMedian(seriesLookup, 'temperature_2m', index);
		const windSpeed = requiredMedian(seriesLookup, 'wind_speed_10m', index);
		const windGusts = requiredMedian(seriesLookup, 'wind_gusts_10m', index);
		const precipitation = requiredMedian(seriesLookup, 'precipitation', index);
		const weatherCode = representativeWeatherCode(seriesLookup, index, precipitationRisk);
		const isDay = requiredMedian(seriesLookup, 'is_day', index);

		if (
			temperature === null ||
			windSpeed === null ||
			windGusts === null ||
			precipitation === null ||
			weatherCode === null ||
			isDay === null
		) {
			continue;
		}

		slots.push({
			time: hourly.time[index],
			source,
			temperature,
			windSpeed,
			windGusts,
			precipitation,
			precipitationProbability: precipitationRisk,
			weatherCode,
			isDay: isDay >= 0.5,
		});
	}

	return slots;
}
