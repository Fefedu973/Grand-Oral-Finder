import { z } from "zod";

export const GENERAL_SPECIALTIES = [
	"Arts",
	"Biologie-écologie",
	"Éducation physique, pratiques et culture sportives",
	"Histoire-géographie, géopolitique et sciences politiques",
	"Humanités, littérature et philosophie",
	"Langues, littératures et cultures étrangères et régionales",
	"Littérature, langues et cultures de l’Antiquité",
	"Mathématiques",
	"Numérique et sciences informatiques",
	"Physique-chimie",
	"Sciences de l’ingénieur",
	"Sciences de la vie et de la Terre",
	"Sciences économiques et sociales",
] as const;

export const TECHNOLOGICAL_SERIES = [
	"S2TMD",
	"ST2S",
	"STD2A",
	"STHR",
	"STI2D",
	"STL",
	"STMG",
] as const;

const currentYear = new Date().getFullYear();

export const trackSchema = z.enum(["general", "technological"]);
export const codeSourceSchema = z.enum(["official", "shared"]);

const contributionBaseSchema = z.object({
	schoolUai: z
		.string()
		.regex(/^\d{7}[A-Z]$/, "Sélectionnez un établissement valide."),
	examYear: z
		.number()
		.int()
		.min(2021)
		.max(currentYear + 2),
	track: trackSchema,
	series: z.string().trim().max(20).default(""),
	commissionCode: z
		.string()
		.trim()
		.min(2, "Le code doit contenir au moins deux caractères.")
		.max(32, "Le code est trop long."),
	codeSource: codeSourceSchema,
	examDay: z.iso.date(),
	examAt: z.iso.datetime({ offset: true }),
	subjectOne: z.string().trim().min(2).max(120),
	subjectTwo: z.string().trim().min(2).max(120),
});

type ContributionFields = Pick<
	z.infer<typeof contributionBaseSchema>,
	"series" | "subjectOne" | "subjectTwo" | "track"
>;

function hasDifferentSubjects(value: ContributionFields) {
	return value.subjectOne !== value.subjectTwo;
}

function hasValidSeries(value: ContributionFields) {
	if (value.track === "general") return value.series === "";
	return TECHNOLOGICAL_SERIES.includes(
		value.series as (typeof TECHNOLOGICAL_SERIES)[number],
	);
}

function hasValidGeneralSubject(
	value: ContributionFields,
	field: "subjectOne" | "subjectTwo",
) {
	return (
		value.track !== "general" ||
		GENERAL_SPECIALTIES.includes(
			value[field] as (typeof GENERAL_SPECIALTIES)[number],
		)
	);
}

function hasUsableCommissionCode(
	value: Pick<z.infer<typeof contributionBaseSchema>, "commissionCode">,
) {
	return normalizeCommissionCode(value.commissionCode).length >= 2;
}

function hasMatchingExamDay(
	value: Pick<z.infer<typeof contributionBaseSchema>, "examAt" | "examDay">,
) {
	return value.examAt.slice(0, 10) === value.examDay;
}

export const contributionInputSchema = contributionBaseSchema
	.refine(hasDifferentSubjects, {
		message: "Les deux sujets ou spécialités doivent être différents.",
		path: ["subjectTwo"],
	})
	.refine((value) => hasValidGeneralSubject(value, "subjectOne"), {
		message: "Sélectionnez une spécialité générale dans la liste.",
		path: ["subjectOne"],
	})
	.refine((value) => hasValidGeneralSubject(value, "subjectTwo"), {
		message: "Sélectionnez une spécialité générale dans la liste.",
		path: ["subjectTwo"],
	})
	.refine(hasValidSeries, {
		message: "La série ne correspond pas à la voie sélectionnée.",
		path: ["series"],
	})
	.refine(hasUsableCommissionCode, {
		message: "Le code normalisé doit contenir au moins deux caractères.",
		path: ["commissionCode"],
	})
	.refine(hasMatchingExamDay, {
		message: "La date et l’heure de passage doivent désigner le même jour.",
		path: ["examAt"],
	});

export const finderInputSchema = contributionBaseSchema
	.omit({
		examAt: true,
	})
	.refine(hasDifferentSubjects, {
		message: "Les deux sujets ou spécialités doivent être différents.",
		path: ["subjectTwo"],
	})
	.refine((value) => hasValidGeneralSubject(value, "subjectOne"), {
		message: "Sélectionnez une spécialité générale dans la liste.",
		path: ["subjectOne"],
	})
	.refine((value) => hasValidGeneralSubject(value, "subjectTwo"), {
		message: "Sélectionnez une spécialité générale dans la liste.",
		path: ["subjectTwo"],
	})
	.refine(hasValidSeries, {
		message: "La série ne correspond pas à la voie sélectionnée.",
		path: ["series"],
	})
	.refine(hasUsableCommissionCode, {
		message: "Le code normalisé doit contenir au moins deux caractères.",
		path: ["commissionCode"],
	});

export type ContributionInput = z.infer<typeof contributionInputSchema>;
export type FinderInput = z.infer<typeof finderInputSchema>;

export function normalizeCommissionCode(value: string) {
	return value
		.normalize("NFKC")
		.trim()
		.toLocaleUpperCase("fr-FR")
		.replace(/^COM(?=\d|[\s:._-])/u, "")
		.replace(/[\s._-]+/g, "");
}
