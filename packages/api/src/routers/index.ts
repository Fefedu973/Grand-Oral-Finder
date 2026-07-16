import {
	examSession,
	rateLimitEvent,
	school,
	submission,
} from "@grand-oral-finder/db";
import { env } from "@grand-oral-finder/env/server";
import type { RouterClient } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import {
	and,
	count,
	desc,
	eq,
	gt,
	inArray,
	like,
	lt,
	ne,
	or,
	sql,
} from "drizzle-orm";
import { z } from "zod";

import type { Context } from "../context";
import {
	generateAccessKey,
	hashAccessKey,
	isAccessKey,
	normalizeAccessKey,
} from "../domain/access-key";
import {
	contributionInputSchema,
	type finderInputSchema,
	normalizeCommissionCode,
} from "../domain/grand-oral";
import { analyzePivot, unsupportedPivotAnalysis } from "../domain/matching";
import { hashClientIp, hashDeviceToken } from "../domain/privacy";
import { publicProcedure } from "../index";

const DIRECTORY_URL =
	"https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/records";
const DIRECTORY_CACHE_TTL = 30 * 60 * 1000;
const CREATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const CREATE_LIMIT = 3;
const RATE_LIMIT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;
const EDIT_LIMIT = 12;
const EDIT_MIN_INTERVAL_MS = 5_000;

const directorySchoolSchema = z.object({
	identifiant_de_l_etablissement: z.string(),
	nom_etablissement: z.string(),
	nom_commune: z.string(),
	code_postal: z.string().nullable().optional(),
	libelle_academie: z.string().nullable().optional(),
	statut_public_prive: z.string().nullable().optional(),
});

const accessKeySchema = z
	.string()
	.trim()
	.max(80)
	.refine(isAccessKey, "Clé de récupération invalide.");
const deviceTokenSchema = z.string().regex(/^[a-f0-9]{64}$/);

type DirectorySchool = z.infer<typeof directorySchoolSchema>;
type FinderInput = z.infer<typeof finderInputSchema>;

const directoryCache = new Map<
	string,
	{ expiresAt: number; rows: DirectorySchool[] }
>();

function schoolDto(value: DirectorySchool) {
	return {
		uai: value.identifiant_de_l_etablissement,
		name: value.nom_etablissement,
		city: value.nom_commune,
		postalCode: value.code_postal ?? null,
		academy: value.libelle_academie ?? null,
		sector: value.statut_public_prive ?? null,
	};
}

async function queryDirectory(where: string, limit = 12) {
	const cacheKey = `${limit}:${where}`;
	const cached = directoryCache.get(cacheKey);
	if (cached && cached.expiresAt > Date.now()) return cached.rows;

	const url = new URL(DIRECTORY_URL);
	url.searchParams.set("limit", String(limit));
	url.searchParams.set(
		"select",
		"identifiant_de_l_etablissement,nom_etablissement,nom_commune,code_postal,libelle_academie,statut_public_prive",
	);
	url.searchParams.set("where", where);

	const response = await fetch(url, {
		headers: { Accept: "application/json" },
		signal: AbortSignal.timeout(6_000),
	});
	if (!response.ok) {
		throw new ORPCError("SERVICE_UNAVAILABLE", {
			message: "L’annuaire des établissements est temporairement indisponible.",
		});
	}

	const payload = z
		.object({ results: z.array(directorySchoolSchema) })
		.parse(await response.json());
	directoryCache.set(cacheKey, {
		expiresAt: Date.now() + DIRECTORY_CACHE_TTL,
		rows: payload.results,
	});
	return payload.results;
}

async function getDirectorySchool(db: Context["db"], uai: string) {
	try {
		const rows = await queryDirectory(
			`identifiant_de_l_etablissement = "${uai}"`,
			1,
		);
		const result = rows[0];
		if (result) return schoolDto(result);
	} catch (error) {
		const localRows = await db
			.select()
			.from(school)
			.where(eq(school.uai, uai))
			.limit(1);
		if (localRows[0]) return localRows[0];
		throw error;
	}

	throw new ORPCError("NOT_FOUND", { message: "Établissement introuvable." });
}

async function calculatePrediction(
	db: Context["db"],
	input: FinderInput,
	excludedSubmissionId?: string,
) {
	if (input.track === "technological") {
		return unsupportedPivotAnalysis(input.subjectOne, input.subjectTwo);
	}

	const normalizedCode = normalizeCommissionCode(input.commissionCode);
	const sessions = await db
		.select({ id: examSession.id })
		.from(examSession)
		.where(
			and(
				eq(examSession.schoolUai, input.schoolUai),
				eq(examSession.examYear, input.examYear),
				eq(examSession.track, input.track),
				eq(examSession.series, input.series),
			),
		)
		.limit(1);

	const filters = sessions[0]
		? [
				eq(submission.examSessionId, sessions[0].id),
				eq(submission.examDay, input.examDay),
				eq(submission.codeSource, input.codeSource),
				eq(submission.commissionCode, normalizedCode),
			]
		: [];
	if (excludedSubmissionId) {
		filters.push(ne(submission.id, excludedSubmissionId));
	}

	const rows = sessions[0]
		? await db
				.select({
					subjectOne: submission.subjectOne,
					subjectTwo: submission.subjectTwo,
				})
				.from(submission)
				.where(and(...filters))
		: [];

	return analyzePivot(rows, input.subjectOne, input.subjectTwo);
}

const ownedSubmissionFields = {
	id: submission.id,
	accessKeyHash: submission.accessKeyHash,
	schoolUai: school.uai,
	schoolName: school.name,
	schoolCity: school.city,
	schoolPostalCode: school.postalCode,
	schoolAcademy: school.academy,
	schoolSector: school.sector,
	examYear: examSession.examYear,
	track: examSession.track,
	series: examSession.series,
	commissionCode: submission.commissionCode,
	codeSource: submission.codeSource,
	examDay: submission.examDay,
	examAt: submission.examAt,
	subjectOne: submission.subjectOne,
	subjectTwo: submission.subjectTwo,
	version: submission.version,
	updatedAt: submission.updatedAt,
};

export const appRouter = {
	healthCheck: publicProcedure.handler(() => "OK"),
	schools: {
		search: publicProcedure
			.input(z.object({ query: z.string().trim().min(2).max(80) }))
			.handler(async ({ context, input }) => {
				const query = input.query.replace(/[^\p{L}\p{N} .'-]/gu, " ").trim();
				const encoded = JSON.stringify(query);
				const where = `type_etablissement = "Lycée" and (search(nom_etablissement, ${encoded}) or search(nom_commune, ${encoded}) or search(code_postal, ${encoded}))`;
				try {
					return (await queryDirectory(where)).map(schoolDto);
				} catch (error) {
					const pattern = `%${query}%`;
					const localRows = await context.db
						.select()
						.from(school)
						.where(
							or(
								like(school.name, pattern),
								like(school.city, pattern),
								like(school.postalCode, pattern),
							),
						)
						.limit(12);
					if (localRows.length > 0) return localRows;
					throw error;
				}
			}),
	},
	submissions: {
		owned: publicProcedure
			.input(z.object({ accessKeys: z.array(accessKeySchema).max(20) }))
			.handler(async ({ context, input }) => {
				const keysByNormalizedValue = new Map(
					input.accessKeys.map((accessKey) => [
						normalizeAccessKey(accessKey),
						accessKey,
					]),
				);
				const keyByHash = new Map(
					[...keysByNormalizedValue.values()].map((accessKey) => [
						hashAccessKey(accessKey),
						accessKey,
					]),
				);
				const hashes = [...keyByHash.keys()];
				if (hashes.length === 0) return [];

				const rows = await context.db
					.select(ownedSubmissionFields)
					.from(submission)
					.innerJoin(examSession, eq(submission.examSessionId, examSession.id))
					.innerJoin(school, eq(examSession.schoolUai, school.uai))
					.where(inArray(submission.accessKeyHash, hashes))
					.orderBy(desc(submission.updatedAt));

				return rows.flatMap(({ accessKeyHash, ...row }) => {
					const accessKey = keyByHash.get(accessKeyHash);
					return accessKey ? [{ ...row, accessKey }] : [];
				});
			}),
		create: publicProcedure
			.input(
				z.object({
					deviceToken: deviceTokenSchema,
					data: contributionInputSchema,
				}),
			)
			.handler(async ({ context, input }) => {
				const creatorIpHash = hashClientIp(
					context.clientIp,
					env.IP_HASH_SECRET,
				);
				const deviceHash = hashDeviceToken(input.deviceToken);

				const directorySchool = await getDirectorySchool(
					context.db,
					input.data.schoolUai,
				);
				const normalizedCode = normalizeCommissionCode(
					input.data.commissionCode,
				);
				const accessKey = generateAccessKey();
				const accessKeyHash = hashAccessKey(accessKey);

				const saved = await context.db.transaction(async (tx) => {
					await tx
						.delete(rateLimitEvent)
						.where(
							lt(
								rateLimitEvent.createdAt,
								new Date(Date.now() - RATE_LIMIT_RETENTION_MS),
							),
						);
					const recentCreations = await tx
						.select({ value: count() })
						.from(rateLimitEvent)
						.where(
							and(
								eq(rateLimitEvent.action, "submission:create"),
								eq(rateLimitEvent.fingerprint, creatorIpHash),
								gt(
									rateLimitEvent.createdAt,
									new Date(Date.now() - CREATE_WINDOW_MS),
								),
							),
						);
					if ((recentCreations[0]?.value ?? 0) >= CREATE_LIMIT) {
						throw new ORPCError("TOO_MANY_REQUESTS", {
							message:
								"Cette connexion a déjà créé plusieurs déclarations récemment. Réessayez dans 24 heures ou modifiez une déclaration existante avec sa clé.",
						});
					}

					await tx
						.insert(school)
						.values(directorySchool)
						.onConflictDoUpdate({
							target: school.uai,
							set: { ...directorySchool, updatedAt: new Date() },
						});

					const sessions = await tx
						.insert(examSession)
						.values({
							schoolUai: input.data.schoolUai,
							examYear: input.data.examYear,
							track: input.data.track,
							series: input.data.series,
						})
						.onConflictDoUpdate({
							target: [
								examSession.schoolUai,
								examSession.examYear,
								examSession.track,
								examSession.series,
							],
							set: { updatedAt: new Date() },
						})
						.returning({ id: examSession.id });

					const sessionId = sessions[0]?.id;
					if (!sessionId) throw new ORPCError("INTERNAL_SERVER_ERROR");

					const duplicate = await tx
						.select({ id: submission.id })
						.from(submission)
						.where(
							and(
								eq(submission.deviceHash, deviceHash),
								eq(submission.examSessionId, sessionId),
							),
						)
						.limit(1);
					if (duplicate[0]) {
						throw new ORPCError("CONFLICT", {
							message:
								"Une déclaration existe déjà pour cette session sur cet appareil. Ouvrez « Mes déclarations » pour la modifier.",
						});
					}

					const inserted = await tx
						.insert(submission)
						.values({
							accessKeyHash,
							deviceHash,
							examSessionId: sessionId,
							commissionCode: normalizedCode,
							codeSource: input.data.codeSource,
							examDay: input.data.examDay,
							examAt: new Date(input.data.examAt),
							subjectOne: input.data.subjectOne,
							subjectTwo: input.data.subjectTwo,
						})
						.returning({ id: submission.id });
					await tx.insert(rateLimitEvent).values({
						fingerprint: creatorIpHash,
						action: "submission:create",
					});
					return inserted[0];
				});

				if (!saved) throw new ORPCError("INTERNAL_SERVER_ERROR");
				return {
					id: saved.id,
					accessKey,
					prediction: await calculatePrediction(
						context.db,
						input.data,
						saved.id,
					),
				};
			}),
		update: publicProcedure
			.input(
				z.object({
					accessKey: accessKeySchema,
					data: contributionInputSchema,
				}),
			)
			.handler(async ({ context, input }) => {
				const accessKeyHash = hashAccessKey(input.accessKey);
				const existing = await context.db
					.select({
						id: submission.id,
						updatedAt: submission.updatedAt,
						editWindowStartedAt: submission.editWindowStartedAt,
						editCount: submission.editCount,
					})
					.from(submission)
					.where(eq(submission.accessKeyHash, accessKeyHash))
					.limit(1);
				const existingSubmission = existing[0];
				if (!existingSubmission) {
					throw new ORPCError("NOT_FOUND", {
						message: "Déclaration ou clé de récupération introuvable.",
					});
				}

				const now = new Date();
				if (
					now.getTime() - existingSubmission.updatedAt.getTime() <
					EDIT_MIN_INTERVAL_MS
				) {
					throw new ORPCError("TOO_MANY_REQUESTS", {
						message:
							"Patientez quelques secondes avant une nouvelle modification.",
					});
				}
				const editWindowExpired =
					now.getTime() - existingSubmission.editWindowStartedAt.getTime() >=
					EDIT_WINDOW_MS;
				if (!editWindowExpired && existingSubmission.editCount >= EDIT_LIMIT) {
					throw new ORPCError("TOO_MANY_REQUESTS", {
						message:
							"La limite de douze modifications par 24 heures est atteinte pour cette déclaration.",
					});
				}
				const nextEditCount = editWindowExpired
					? 1
					: existingSubmission.editCount + 1;
				const nextEditWindowStartedAt = editWindowExpired
					? now
					: existingSubmission.editWindowStartedAt;

				const directorySchool = await getDirectorySchool(
					context.db,
					input.data.schoolUai,
				);
				const normalizedCode = normalizeCommissionCode(
					input.data.commissionCode,
				);

				await context.db.transaction(async (tx) => {
					await tx
						.insert(school)
						.values(directorySchool)
						.onConflictDoUpdate({
							target: school.uai,
							set: { ...directorySchool, updatedAt: new Date() },
						});
					const sessions = await tx
						.insert(examSession)
						.values({
							schoolUai: input.data.schoolUai,
							examYear: input.data.examYear,
							track: input.data.track,
							series: input.data.series,
						})
						.onConflictDoUpdate({
							target: [
								examSession.schoolUai,
								examSession.examYear,
								examSession.track,
								examSession.series,
							],
							set: { updatedAt: new Date() },
						})
						.returning({ id: examSession.id });

					const sessionId = sessions[0]?.id;
					if (!sessionId) throw new ORPCError("INTERNAL_SERVER_ERROR");

					await tx
						.update(submission)
						.set({
							examSessionId: sessionId,
							commissionCode: normalizedCode,
							codeSource: input.data.codeSource,
							examDay: input.data.examDay,
							examAt: new Date(input.data.examAt),
							subjectOne: input.data.subjectOne,
							subjectTwo: input.data.subjectTwo,
							updatedAt: now,
							version: sql`${submission.version} + 1`,
							editCount: nextEditCount,
							editWindowStartedAt: nextEditWindowStartedAt,
						})
						.where(eq(submission.id, existingSubmission.id));
				});

				return {
					id: existingSubmission.id,
					prediction: await calculatePrediction(
						context.db,
						input.data,
						existingSubmission.id,
					),
				};
			}),
		remove: publicProcedure
			.input(z.object({ accessKey: accessKeySchema }))
			.handler(async ({ context, input }) => {
				const deleted = await context.db
					.delete(submission)
					.where(eq(submission.accessKeyHash, hashAccessKey(input.accessKey)))
					.returning({ id: submission.id });
				if (!deleted[0]) {
					throw new ORPCError("NOT_FOUND", {
						message: "Déclaration ou clé de récupération introuvable.",
					});
				}
				return deleted[0];
			}),
	},
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
