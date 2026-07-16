import { describe, expect, test } from "bun:test";

import {
	formatAccessKey,
	generateAccessKey,
	hashAccessKey,
	isAccessKey,
	normalizeAccessKey,
} from "./access-key";
import { normalizeCommissionCode } from "./grand-oral";
import { analyzePivot, unsupportedPivotAnalysis } from "./matching";
import { hashClientIp, hashDeviceToken } from "./privacy";

const MATHS = "Mathématiques";
const PHYSICS = "Physique-chimie";

describe("analyzePivot", () => {
	test("requires at least four independent peers", () => {
		expect(analyzePivot([], MATHS, PHYSICS)).toMatchObject({
			status: "insufficient",
			likelyPivot: null,
			sampleSize: 0,
		});
		expect(
			analyzePivot([{ subjectOne: MATHS, subjectTwo: "NSI" }], MATHS, PHYSICS),
		).toMatchObject({ status: "insufficient", likelyPivot: null });
	});

	test("detects a cautious trend from four concordant peers", () => {
		const result = analyzePivot(
			[
				{ subjectOne: MATHS, subjectTwo: "NSI" },
				{ subjectOne: "SVT", subjectTwo: MATHS },
				{ subjectOne: MATHS, subjectTwo: "SES" },
				{ subjectOne: "HGGSP", subjectTwo: MATHS },
			],
			MATHS,
			PHYSICS,
		);

		expect(result).toMatchObject({
			status: "trend",
			confidence: "medium",
			likelyPivot: MATHS,
			margin: 4,
		});
	});

	test("does not invent a pivot when both specialties are equally common", () => {
		const result = analyzePivot(
			[
				{ subjectOne: MATHS, subjectTwo: PHYSICS },
				{ subjectOne: PHYSICS, subjectTwo: MATHS },
				{ subjectOne: MATHS, subjectTwo: PHYSICS },
				{ subjectOne: PHYSICS, subjectTwo: MATHS },
			],
			MATHS,
			PHYSICS,
		);

		expect(result).toMatchObject({
			status: "ambiguous",
			confidence: "none",
			likelyPivot: null,
		});
	});

	test("reports high confidence only for a broad and clean consensus", () => {
		const result = analyzePivot(
			[
				{ subjectOne: MATHS, subjectTwo: "NSI" },
				{ subjectOne: "SVT", subjectTwo: MATHS },
				{ subjectOne: MATHS, subjectTwo: "SES" },
				{ subjectOne: "HGGSP", subjectTwo: MATHS },
				{ subjectOne: MATHS, subjectTwo: "HLP" },
				{ subjectOne: PHYSICS, subjectTwo: MATHS },
			],
			MATHS,
			PHYSICS,
		);

		expect(result).toMatchObject({
			status: "trend",
			confidence: "high",
			likelyPivot: MATHS,
			sampleSize: 6,
			outlierCount: 0,
		});
	});

	test("keeps noisy groups at low confidence", () => {
		const result = analyzePivot(
			[
				{ subjectOne: MATHS, subjectTwo: "NSI" },
				{ subjectOne: MATHS, subjectTwo: "SES" },
				{ subjectOne: MATHS, subjectTwo: "SVT" },
				{ subjectOne: MATHS, subjectTwo: "HLP" },
				{ subjectOne: "HGGSP", subjectTwo: "HLP" },
				{ subjectOne: "Arts", subjectTwo: "LLCER" },
			],
			MATHS,
			PHYSICS,
		);

		expect(result).toMatchObject({
			status: "trend",
			confidence: "low",
			likelyPivot: MATHS,
			outlierCount: 2,
		});
	});
});

test("technological tracks are explicitly unsupported", () => {
	expect(unsupportedPivotAnalysis("Projet", "Étude")).toMatchObject({
		status: "unsupported-track",
		confidence: "none",
		likelyPivot: null,
	});
});

test("commission codes match with or without the COM prefix", () => {
	expect(normalizeCommissionCode(" COM 04-21 ")).toBe("0421");
	expect(normalizeCommissionCode("bcg 10")).toBe("BCG10");
});

test("recovery keys are high-entropy, format-tolerant and hashable", () => {
	const key = generateAccessKey();
	expect(isAccessKey(key)).toBe(true);
	expect(normalizeAccessKey(key)).toHaveLength(35);
	expect(formatAccessKey(normalizeAccessKey(key))).toBe(key);
	expect(hashAccessKey(key)).toHaveLength(64);
	expect(generateAccessKey()).not.toBe(key);
});

test("client identifiers are deterministic hashes and never stored raw", () => {
	const secret = "test-secret-with-at-least-thirty-two-characters";
	const ipHash = hashClientIp("203.0.113.42", secret);

	expect(ipHash).toHaveLength(64);
	expect(ipHash).not.toContain("203.0.113.42");
	expect(hashClientIp("203.0.113.42", secret)).toBe(ipHash);
	expect(hashClientIp("203.0.113.43", secret)).not.toBe(ipHash);
	expect(hashDeviceToken("browser-token")).toHaveLength(64);
});
