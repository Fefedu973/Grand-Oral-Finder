export const MATCHING_THRESHOLDS = {
	minimumPeers: 4,
	minimumExclusivePeers: 4,
	mediumPeers: 4,
	highPeers: 6,
	minimumVoteMargin: 2,
	mediumCoverage: 0.7,
	highCoverage: 0.8,
	mediumMarginRate: 0.35,
	highMarginRate: 0.5,
	nearbyRadiusMinutes: 120,
	scheduleRoundingMinutes: 5,
} as const;

export type MatchingRow = {
	subjectOne: string;
	subjectTwo: string;
};

export type TimedMatchingRow = MatchingRow & {
	examAt: Date | number | string;
};

export type MatchingStatus =
	| "trend"
	| "ambiguous"
	| "insufficient"
	| "unsupported-track";

export type MatchingConfidence = "none" | "low" | "medium" | "high";

export type PivotAnalysis = {
	status: MatchingStatus;
	confidence: MatchingConfidence;
	likelyPivot: string | null;
	sampleSize: number;
	comparableCount: number;
	outlierCount: number;
	margin: number;
	support: Array<{
		subject: string;
		count: number;
		rate: number;
		exclusiveCount: number;
		distinctCounterpartCount: number;
	}>;
};

export type TemporalScope = "nearby" | "full-day";

export type TemporalScheduleEntry = MatchingRow & {
	examAt: string;
	isCurrent: boolean;
	inAnalysisWindow: boolean;
};

export type TemporalPivotAnalysis = PivotAnalysis & {
	temporal: {
		scope: TemporalScope;
		nearbyRadiusMinutes: number;
		nearbyPeerCount: number;
		dayPeerCount: number;
		windowStartAt: string;
		windowEndAt: string;
		conflictingDayTrend: boolean;
		fullDayLikelyPivot: string | null;
		fullDayConfidence: MatchingConfidence;
	};
	schedule: {
		available: boolean;
		totalPeerCount: number;
		entries: TemporalScheduleEntry[];
	};
};

type AnalyzePivotOptions = {
	temporallyFocused?: boolean;
};

function includesSubject(row: MatchingRow, subject: string) {
	return row.subjectOne === subject || row.subjectTwo === subject;
}

function supportFor(
	rows: readonly MatchingRow[],
	subject: string,
	competingSubject: string,
) {
	let count = 0;
	let exclusiveCount = 0;
	const counterparts = new Set<string>();

	for (const row of rows) {
		if (!includesSubject(row, subject)) continue;
		count += 1;

		if (includesSubject(row, competingSubject)) continue;
		exclusiveCount += 1;
		if (row.subjectOne !== subject) counterparts.add(row.subjectOne);
		if (row.subjectTwo !== subject) counterparts.add(row.subjectTwo);
	}

	return {
		count,
		exclusiveCount,
		distinctCounterpartCount: counterparts.size,
	};
}

function baseAnalysis(
	rows: readonly MatchingRow[],
	subjectOne: string,
	subjectTwo: string,
) {
	const sampleSize = rows.length;
	const support = [subjectOne, subjectTwo]
		.map((subject) => {
			const competingSubject = subject === subjectOne ? subjectTwo : subjectOne;
			const evidence = supportFor(rows, subject, competingSubject);
			return {
				subject,
				...evidence,
				rate: sampleSize === 0 ? 0 : evidence.count / sampleSize,
			};
		})
		.sort((left, right) => right.count - left.count);
	const comparableCount = rows.filter(
		(row) =>
			includesSubject(row, subjectOne) || includesSubject(row, subjectTwo),
	).length;

	return {
		sampleSize,
		comparableCount,
		outlierCount: sampleSize - comparableCount,
		support,
	};
}

export function unsupportedPivotAnalysis(
	subjectOne: string,
	subjectTwo: string,
): PivotAnalysis {
	return {
		...baseAnalysis([], subjectOne, subjectTwo),
		status: "unsupported-track",
		confidence: "none",
		likelyPivot: null,
		margin: 0,
	};
}

export function analyzePivot(
	rows: readonly MatchingRow[],
	subjectOne: string,
	subjectTwo: string,
	options: AnalyzePivotOptions = {},
): PivotAnalysis {
	const base = baseAnalysis(rows, subjectOne, subjectTwo);
	const [leader, runnerUp] = base.support;
	const margin = (leader?.count ?? 0) - (runnerUp?.count ?? 0);

	if (base.sampleSize < MATCHING_THRESHOLDS.minimumPeers) {
		return {
			...base,
			status: "insufficient",
			confidence: "none",
			likelyPivot: null,
			margin,
		};
	}

	if (
		!leader ||
		leader.exclusiveCount < MATCHING_THRESHOLDS.minimumExclusivePeers ||
		margin < MATCHING_THRESHOLDS.minimumVoteMargin ||
		leader.rate < 0.5
	) {
		return {
			...base,
			status: "ambiguous",
			confidence: "none",
			likelyPivot: null,
			margin,
		};
	}

	const marginRate = margin / base.sampleSize;
	const outlierRate = base.outlierCount / base.sampleSize;
	const hasDiverseLocalConsensus =
		options.temporallyFocused === true &&
		leader.exclusiveCount >= MATCHING_THRESHOLDS.minimumPeers &&
		leader.distinctCounterpartCount >= 3 &&
		(runnerUp?.exclusiveCount ?? 0) === 0 &&
		leader.rate >= MATCHING_THRESHOLDS.highCoverage &&
		outlierRate <= 0.15;
	let confidence: MatchingConfidence = "low";

	if (
		hasDiverseLocalConsensus ||
		(base.sampleSize >= MATCHING_THRESHOLDS.highPeers &&
			leader.rate >= MATCHING_THRESHOLDS.highCoverage &&
			marginRate >= MATCHING_THRESHOLDS.highMarginRate &&
			outlierRate <= 0.15)
	) {
		confidence = "high";
	} else if (
		base.sampleSize >= MATCHING_THRESHOLDS.mediumPeers &&
		leader.rate >= MATCHING_THRESHOLDS.mediumCoverage &&
		marginRate >= MATCHING_THRESHOLDS.mediumMarginRate &&
		outlierRate <= 0.25
	) {
		confidence = "medium";
	}

	return {
		...base,
		status: "trend",
		confidence,
		likelyPivot: leader.subject,
		margin,
	};
}

function timestamp(value: TimedMatchingRow["examAt"]) {
	const result =
		value instanceof Date
			? value.getTime()
			: typeof value === "number"
				? value
				: new Date(value).getTime();
	return Number.isFinite(result) ? result : 0;
}

function lowerConfidence(confidence: MatchingConfidence): MatchingConfidence {
	if (confidence === "high") return "medium";
	if (confidence === "medium") return "low";
	return confidence;
}

function canonicalPair(row: MatchingRow): MatchingRow {
	const [subjectOne, subjectTwo] = [row.subjectOne, row.subjectTwo].sort(
		(left, right) => left.localeCompare(right, "fr"),
	);
	return {
		subjectOne: subjectOne ?? row.subjectOne,
		subjectTwo: subjectTwo ?? row.subjectTwo,
	};
}

function roundedIsoTime(value: number) {
	const interval = MATCHING_THRESHOLDS.scheduleRoundingMinutes * 60_000;
	return new Date(Math.round(value / interval) * interval).toISOString();
}

export function analyzeTemporalPivot(
	rows: readonly TimedMatchingRow[],
	candidate: TimedMatchingRow,
): TemporalPivotAnalysis {
	const candidateTime = timestamp(candidate.examAt);
	const nearbyRadiusMs = MATCHING_THRESHOLDS.nearbyRadiusMinutes * 60_000;
	// No national source exposes commission shift boundaries. Time proximity is
	// therefore a cautious heuristic, with a downgraded full-day fallback.
	const nearbyRows = rows.filter(
		(row) => Math.abs(timestamp(row.examAt) - candidateTime) <= nearbyRadiusMs,
	);
	const fullDay = analyzePivot(
		rows,
		candidate.subjectOne,
		candidate.subjectTwo,
	);
	const hasLocalSample = nearbyRows.length >= MATCHING_THRESHOLDS.minimumPeers;
	const local = hasLocalSample
		? analyzePivot(nearbyRows, candidate.subjectOne, candidate.subjectTwo, {
				temporallyFocused: true,
			})
		: null;
	const selected = local
		? local
		: {
				...fullDay,
				confidence: lowerConfidence(fullDay.confidence),
			};
	const conflictingDayTrend =
		local?.status === "trend" &&
		fullDay.status === "trend" &&
		local.likelyPivot !== fullDay.likelyPivot;
	const pair = canonicalPair(candidate);
	const scheduleAvailable = rows.length >= MATCHING_THRESHOLDS.minimumPeers;
	const scheduleEntries = scheduleAvailable
		? [
				...rows.map((row) => ({ row, isCurrent: false })),
				{ row: candidate, isCurrent: true },
			]
				.map(({ row, isCurrent }) => ({
					...canonicalPair(row),
					examAt: roundedIsoTime(timestamp(row.examAt)),
					isCurrent,
					inAnalysisWindow:
						Math.abs(timestamp(row.examAt) - candidateTime) <= nearbyRadiusMs,
				}))
				.sort((left, right) => left.examAt.localeCompare(right.examAt))
		: [];

	return {
		...selected,
		temporal: {
			scope: local ? "nearby" : "full-day",
			nearbyRadiusMinutes: MATCHING_THRESHOLDS.nearbyRadiusMinutes,
			nearbyPeerCount: nearbyRows.length,
			dayPeerCount: rows.length,
			windowStartAt: new Date(candidateTime - nearbyRadiusMs).toISOString(),
			windowEndAt: new Date(candidateTime + nearbyRadiusMs).toISOString(),
			conflictingDayTrend,
			fullDayLikelyPivot: fullDay.likelyPivot,
			fullDayConfidence: fullDay.confidence,
		},
		schedule: {
			available: scheduleAvailable,
			totalPeerCount: rows.length,
			entries: scheduleEntries.map((entry) =>
				entry.isCurrent ? { ...entry, ...pair } : entry,
			),
		},
	};
}

export function unsupportedTemporalPivotAnalysis(
	candidate: TimedMatchingRow,
): TemporalPivotAnalysis {
	const candidateTime = timestamp(candidate.examAt);
	const nearbyRadiusMs = MATCHING_THRESHOLDS.nearbyRadiusMinutes * 60_000;

	return {
		...unsupportedPivotAnalysis(candidate.subjectOne, candidate.subjectTwo),
		temporal: {
			scope: "full-day",
			nearbyRadiusMinutes: MATCHING_THRESHOLDS.nearbyRadiusMinutes,
			nearbyPeerCount: 0,
			dayPeerCount: 0,
			windowStartAt: new Date(candidateTime - nearbyRadiusMs).toISOString(),
			windowEndAt: new Date(candidateTime + nearbyRadiusMs).toISOString(),
			conflictingDayTrend: false,
			fullDayLikelyPivot: null,
			fullDayConfidence: "none",
		},
		schedule: {
			available: false,
			totalPeerCount: 0,
			entries: [],
		},
	};
}
