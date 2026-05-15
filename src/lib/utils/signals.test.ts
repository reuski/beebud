import { describe, expect, test } from 'bun:test';
import { classifyWorkableDay, finnishSeasonFromIso, flightGateProfile } from './signals';

describe('shared signal gates', () => {
	test('maps Finnish beekeeping seasons from local forecast dates', () => {
		expect(finnishSeasonFromIso('2026-01-15T12:00')).toBe('dormant');
		expect(finnishSeasonFromIso('2026-04-15T12:00')).toBe('spring');
		expect(finnishSeasonFromIso('2026-07-15T12:00')).toBe('summer');
		expect(finnishSeasonFromIso('2026-09-15T12:00')).toBe('autumn');
	});

	test('keeps day-level green signals tied to at least one open hour', () => {
		expect(classifyWorkableDay(0, 8, 8).signal).toBe('yellow');
		expect(classifyWorkableDay(1, 5, 8).signal).toBe('green');
		expect(classifyWorkableDay(0, 1, 8).signal).toBe('red');
	});

	test('uses lower summer thermal threshold than spring shoulder weather', () => {
		expect(flightGateProfile('2026-04-15T12:00').temperature.openAt).toBe(16);
		expect(flightGateProfile('2026-07-15T12:00').temperature.openAt).toBe(15);
	});
});
