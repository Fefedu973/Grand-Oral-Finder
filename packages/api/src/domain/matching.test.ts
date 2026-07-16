import { describe, expect, test } from "bun:test";

import {
	formatAccessKey,
	generateAccessKey,
	hashAccessKey,
	isAccessKey,
	normalizeAccessKey,
} from "./access-key";
import { contributionInputSchema, normalizeCommissionCode } from "./grand-oral";
import {
	analyzePivot,
	analyzeTemporalPivot,
	unsupportedPivotAnalysis,
} from "./matching";
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

	test("does not treat neutral same-pair rows as independent pivot evidence", () => {
		const result = analyzePivot(
			[
				{ subjectOne: MATHS, subjectTwo: PHYSICS },
				{ subjectOne: PHYSICS, subjectTwo: MATHS },
				{ subjectOne: MATHS, subjectTwo: PHYSICS },
				{ subjectOne: PHYSICS, subjectTwo: MATHS },
				{ subjectOne: MATHS, subjectTwo: "Arts" },
				{ subjectOne: "SVT", subjectTwo: MATHS },
			],
			MATHS,
			PHYSICS,
		);

		expect(result).toMatchObject({
			status: "ambiguous",
			confidence: "none",
			likelyPivot: null,
		});
		expect(
			result.support.find((entry) => entry.subject === MATHS),
		).toMatchObject({ exclusiveCount: 2 });
	});

	test("is invariant to specialty and row order", () => {
		const rows = [
			{ subjectOne: PHYSICS, subjectTwo: "Arts" },
			{ subjectOne: "LLCER", subjectTwo: PHYSICS },
			{ subjectOne: PHYSICS, subjectTwo: "SVT" },
			{ subjectOne: "HGGSP", subjectTwo: PHYSICS },
			{ subjectOne: MATHS, subjectTwo: "NSI" },
		];
		const forward = analyzePivot(rows, MATHS, PHYSICS);
		const reversed = analyzePivot(
			[...rows].reverse().map((row) => ({
				subjectOne: row.subjectTwo,
				subjectTwo: row.subjectOne,
			})),
			PHYSICS,
			MATHS,
		);

		expect(reversed).toMatchObject({
			status: forward.status,
			confidence: forward.confidence,
			likelyPivot: forward.likelyPivot,
			margin: forward.margin,
			sampleSize: forward.sampleSize,
		});
		expect(
			Object.fromEntries(
				reversed.support.map((entry) => [entry.subject, entry.count]),
			),
		).toEqual(
			Object.fromEntries(
				forward.support.map((entry) => [entry.subject, entry.count]),
			),
		);
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

describe("analyzeTemporalPivot", () => {
	const at = (time: string) => new Date(`2026-06-24T${time}:00+02:00`);
	const candidate = {
		examAt: at("10:00"),
		subjectOne: MATHS,
		subjectTwo: PHYSICS,
	};

	test("uses different subject pairs sharing one candidate specialty as strong evidence", () => {
		const result = analyzeTemporalPivot(
			[
				{ examAt: at("08:30"), subjectOne: PHYSICS, subjectTwo: "Arts" },
				{ examAt: at("09:15"), subjectOne: "LLCER", subjectTwo: PHYSICS },
				{ examAt: at("10:45"), subjectOne: PHYSICS, subjectTwo: "SVT" },
				{ examAt: at("11:30"), subjectOne: "HGGSP", subjectTwo: PHYSICS },
			],
			candidate,
		);

		expect(result).toMatchObject({
			status: "trend",
			confidence: "high",
			likelyPivot: PHYSICS,
			temporal: {
				scope: "nearby",
				nearbyPeerCount: 4,
			},
		});
		expect(result.support[0]).toMatchObject({
			subject: PHYSICS,
			exclusiveCount: 4,
			distinctCounterpartCount: 4,
		});
	});

	test("falls back to the whole day with downgraded confidence when nearby evidence is sparse", () => {
		const result = analyzeTemporalPivot(
			[
				{ examAt: at("09:00"), subjectOne: MATHS, subjectTwo: "Arts" },
				{ examAt: at("11:00"), subjectOne: "LLCER", subjectTwo: MATHS },
				{ examAt: at("13:30"), subjectOne: MATHS, subjectTwo: "SVT" },
				{ examAt: at("14:00"), subjectOne: "HGGSP", subjectTwo: MATHS },
				{ examAt: at("14:30"), subjectOne: MATHS, subjectTwo: "SES" },
				{ examAt: at("15:00"), subjectOne: "NSI", subjectTwo: MATHS },
			],
			candidate,
		);

		expect(result).toMatchObject({
			status: "trend",
			confidence: "medium",
			likelyPivot: MATHS,
			temporal: {
				scope: "full-day",
				nearbyPeerCount: 2,
				dayPeerCount: 6,
				fullDayConfidence: "high",
			},
		});
	});

	test("reports a conflicting day trend without discarding the candidate's nearby result", () => {
		const afternoonPhysicsRows = Array.from({ length: 8 }, (_, index) => ({
			examAt: at(
				`${14 + Math.floor(index / 2)}:${index % 2 === 0 ? "00" : "30"}`,
			),
			subjectOne: PHYSICS,
			subjectTwo: `Option ${index + 1}`,
		}));
		const result = analyzeTemporalPivot(
			[
				{ examAt: at("08:30"), subjectOne: MATHS, subjectTwo: "Arts" },
				{ examAt: at("09:00"), subjectOne: "LLCER", subjectTwo: MATHS },
				{ examAt: at("10:30"), subjectOne: MATHS, subjectTwo: "SVT" },
				{ examAt: at("11:30"), subjectOne: "HGGSP", subjectTwo: MATHS },
				...afternoonPhysicsRows,
			],
			candidate,
		);

		expect(result).toMatchObject({
			status: "trend",
			likelyPivot: MATHS,
			temporal: {
				scope: "nearby",
				conflictingDayTrend: true,
				fullDayLikelyPivot: PHYSICS,
			},
		});
	});

	test("returns an anonymized chronological schedule only after the peer threshold", () => {
		const insufficient = analyzeTemporalPivot(
			[
				{ examAt: at("09:00"), subjectOne: MATHS, subjectTwo: "Arts" },
				{ examAt: at("11:00"), subjectOne: "LLCER", subjectTwo: MATHS },
			],
			candidate,
		);
		expect(insufficient.schedule).toMatchObject({
			available: false,
			totalPeerCount: 2,
			entries: [],
		});

		const available = analyzeTemporalPivot(
			[
				{ examAt: at("11:30"), subjectOne: MATHS, subjectTwo: "Arts" },
				{ examAt: at("08:30"), subjectOne: "LLCER", subjectTwo: MATHS },
				{ examAt: at("10:45"), subjectOne: MATHS, subjectTwo: "SVT" },
				{ examAt: at("09:15"), subjectOne: "HGGSP", subjectTwo: MATHS },
			],
			{ ...candidate, examAt: at("10:02") },
		);

		expect(available.schedule.available).toBe(true);
		expect(available.schedule.entries).toHaveLength(5);
		expect(available.schedule.entries.map((entry) => entry.examAt)).toEqual(
			[...available.schedule.entries].map((entry) => entry.examAt).sort(),
		);
		expect(
			available.schedule.entries.find((entry) => entry.isCurrent),
		).toMatchObject({
			examAt: at("10:00").toISOString(),
			inAnalysisWindow: true,
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
	expect(normalizeCommissionCode("comète 42")).toBe("COMÈTE42");
	expect(normalizeCommissionCode("COM-")).toBe("");
});

test("general submissions accept only canonical specialties and coherent dates", () => {
	const validSubmission = {
		schoolUai: "9730001A",
		examYear: 2026,
		track: "general" as const,
		series: "",
		commissionCode: "COM0421",
		codeSource: "official" as const,
		examDay: "2026-06-24",
		examAt: "2026-06-24T10:00:00+02:00",
		subjectOne: MATHS,
		subjectTwo: PHYSICS,
	};

	expect(contributionInputSchema.safeParse(validSubmission).success).toBe(true);
	expect(
		contributionInputSchema.safeParse({
			...validSubmission,
			subjectOne: "Biologie-écologie",
		}).success,
	).toBe(true);
	expect(
		contributionInputSchema.safeParse({
			...validSubmission,
			subjectOne: "Écologie, agronomie et territoires",
		}).success,
	).toBe(false);
	expect(
		contributionInputSchema.safeParse({
			...validSubmission,
			series: "STMG",
		}).success,
	).toBe(false);
	expect(
		contributionInputSchema.safeParse({
			...validSubmission,
			commissionCode: "COM-",
		}).success,
	).toBe(false);
	expect(
		contributionInputSchema.safeParse({
			...validSubmission,
			examDay: "2026-06-25",
		}).success,
	).toBe(false);
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
