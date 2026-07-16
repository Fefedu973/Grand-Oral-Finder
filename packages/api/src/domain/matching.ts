export const MATCHING_THRESHOLDS = {
	minimumPeers: 4,
	mediumPeers: 4,
	highPeers: 6,
	minimumVoteMargin: 2,
	mediumCoverage: 0.7,
	highCoverage: 0.8,
	mediumMarginRate: 0.35,
	highMarginRate: 0.5,
} as const;

export type MatchingRow = {
	subjectOne: string;
	subjectTwo: string;
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
	}>;
};

function supportFor(rows: readonly MatchingRow[], subject: string) {
	return rows.reduce(
		(count, row) =>
			row.subjectOne === subject || row.subjectTwo === subject
				? count + 1
				: count,
		0,
	);
}

function baseAnalysis(
	rows: readonly MatchingRow[],
	subjectOne: string,
	subjectTwo: string,
) {
	const sampleSize = rows.length;
	const support = [subjectOne, subjectTwo]
		.map((subject) => {
			const count = supportFor(rows, subject);
			return {
				subject,
				count,
				rate: sampleSize === 0 ? 0 : count / sampleSize,
			};
		})
		.sort((left, right) => right.count - left.count);
	const comparableCount = rows.filter(
		(row) =>
			row.subjectOne === subjectOne ||
			row.subjectTwo === subjectOne ||
			row.subjectOne === subjectTwo ||
			row.subjectTwo === subjectTwo,
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
		leader.count < MATCHING_THRESHOLDS.minimumPeers ||
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
	let confidence: MatchingConfidence = "low";

	if (
		base.sampleSize >= MATCHING_THRESHOLDS.highPeers &&
		leader.rate >= MATCHING_THRESHOLDS.highCoverage &&
		marginRate >= MATCHING_THRESHOLDS.highMarginRate &&
		outlierRate <= 0.15
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
