import {
	generateAccessKey,
	hashAccessKey,
} from "@grand-oral-finder/api/domain/access-key";
import { hashDeviceToken } from "@grand-oral-finder/api/domain/privacy";
import {
	db,
	examSession,
	rateLimitEvent,
	school,
	submission,
} from "@grand-oral-finder/db";
import { env } from "@grand-oral-finder/env/server";
import { like } from "drizzle-orm";

const SESSION_IDS = {
	strong: "10000000-0000-4000-8000-000000000001",
	ambiguous: "10000000-0000-4000-8000-000000000002",
	insufficient: "10000000-0000-4000-8000-000000000003",
	technological: "10000000-0000-4000-8000-000000000004",
} as const;

const DEMO_KEYS = {
	strong: "GOF-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAB",
	ambiguous: "GOF-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAC",
	insufficient: "GOF-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAD",
	technological: "GOF-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAA-AAAE",
} as const;

if (
	env.NODE_ENV === "production" ||
	(!env.DATABASE_URL.includes("local.db") &&
		process.env.ALLOW_TEST_SEED !== "1")
) {
	throw new Error(
		"Le seed de démonstration est bloqué hors de la base locale. Définissez ALLOW_TEST_SEED=1 uniquement si cette base non-production est volontaire.",
	);
}

const schools = [
	{
		uai: "0690522T",
		name: "Lycée Aux Lazaristes - La Salle site Fourvière",
		city: "Lyon",
		postalCode: "69321",
		academy: "Lyon",
		sector: "Privé",
	},
	{
		uai: "0690671E",
		name: "Lycée Aux Lazaristes - La Salle site Croix-Rousse",
		city: "Lyon",
		postalCode: "69283",
		academy: "Lyon",
		sector: "Privé",
	},
	{
		uai: "0750655E",
		name: "Lycée Louis Le Grand",
		city: "Paris",
		postalCode: "75005",
		academy: "Paris",
		sector: "Public",
	},
	{
		uai: "0750648X",
		name: "Lycée Victor Hugo",
		city: "Paris",
		postalCode: "75003",
		academy: "Paris",
		sector: "Public",
	},
] as const;

const sessions = [
	{
		id: SESSION_IDS.strong,
		schoolUai: "0690522T",
		examYear: 2026,
		track: "general",
		series: "",
	},
	{
		id: SESSION_IDS.ambiguous,
		schoolUai: "0690671E",
		examYear: 2026,
		track: "general",
		series: "",
	},
	{
		id: SESSION_IDS.insufficient,
		schoolUai: "0750655E",
		examYear: 2026,
		track: "general",
		series: "",
	},
	{
		id: SESSION_IDS.technological,
		schoolUai: "0750648X",
		examYear: 2026,
		track: "technological",
		series: "STMG",
	},
] as const;

type SeedSubmission = {
	id: string;
	accessKeyHash: string;
	deviceHash: string;
	examSessionId: string;
	commissionCode: string;
	codeSource: "official" | "shared";
	examDay: string;
	examAt: Date;
	subjectOne: string;
	subjectTwo: string;
};

function seededSubmission(
	index: number,
	accessKey: string,
	values: Omit<SeedSubmission, "id" | "accessKeyHash" | "deviceHash">,
): SeedSubmission {
	return {
		id: `30000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
		accessKeyHash: hashAccessKey(accessKey),
		deviceHash: hashDeviceToken(`seed-device-${index}`),
		...values,
	};
}

const strongBase = {
	examSessionId: SESSION_IDS.strong,
	commissionCode: "0421",
	codeSource: "official" as const,
	examDay: "2026-06-24",
};
const ambiguousBase = {
	examSessionId: SESSION_IDS.ambiguous,
	commissionCode: "0577",
	codeSource: "official" as const,
	examDay: "2026-06-25",
};
const insufficientBase = {
	examSessionId: SESSION_IDS.insufficient,
	commissionCode: "0999",
	codeSource: "official" as const,
	examDay: "2026-06-26",
};
const technologicalBase = {
	examSessionId: SESSION_IDS.technological,
	commissionCode: "T004",
	codeSource: "shared" as const,
	examDay: "2026-06-27",
};

const submissions: SeedSubmission[] = [
	seededSubmission(1, DEMO_KEYS.strong, {
		...strongBase,
		examAt: new Date("2026-06-24T10:30:00+02:00"),
		subjectOne: "Mathématiques",
		subjectTwo: "Physique-chimie",
	}),
	seededSubmission(2, generateAccessKey(), {
		...strongBase,
		examAt: new Date("2026-06-24T08:30:00+02:00"),
		subjectOne: "Mathématiques",
		subjectTwo: "Numérique et sciences informatiques",
	}),
	seededSubmission(3, generateAccessKey(), {
		...strongBase,
		examAt: new Date("2026-06-24T09:00:00+02:00"),
		subjectOne: "Sciences de la vie et de la Terre",
		subjectTwo: "Mathématiques",
	}),
	seededSubmission(4, generateAccessKey(), {
		...strongBase,
		examAt: new Date("2026-06-24T09:30:00+02:00"),
		subjectOne: "Mathématiques",
		subjectTwo: "Sciences économiques et sociales",
	}),
	seededSubmission(5, generateAccessKey(), {
		...strongBase,
		examAt: new Date("2026-06-24T11:00:00+02:00"),
		subjectOne: "Histoire-géographie, géopolitique et sciences politiques",
		subjectTwo: "Mathématiques",
	}),
	seededSubmission(6, generateAccessKey(), {
		...strongBase,
		examAt: new Date("2026-06-24T11:30:00+02:00"),
		subjectOne: "Mathématiques",
		subjectTwo: "Humanités, littérature et philosophie",
	}),
	seededSubmission(7, generateAccessKey(), {
		...strongBase,
		examAt: new Date("2026-06-24T12:00:00+02:00"),
		subjectOne: "Physique-chimie",
		subjectTwo: "Mathématiques",
	}),
	seededSubmission(8, DEMO_KEYS.ambiguous, {
		...ambiguousBase,
		examAt: new Date("2026-06-25T10:00:00+02:00"),
		subjectOne: "Mathématiques",
		subjectTwo: "Physique-chimie",
	}),
	seededSubmission(9, generateAccessKey(), {
		...ambiguousBase,
		examAt: new Date("2026-06-25T09:00:00+02:00"),
		subjectOne: "Mathématiques",
		subjectTwo: "Physique-chimie",
	}),
	seededSubmission(10, generateAccessKey(), {
		...ambiguousBase,
		examAt: new Date("2026-06-25T09:30:00+02:00"),
		subjectOne: "Physique-chimie",
		subjectTwo: "Mathématiques",
	}),
	seededSubmission(12, generateAccessKey(), {
		...ambiguousBase,
		examAt: new Date("2026-06-25T11:00:00+02:00"),
		subjectOne: "Mathématiques",
		subjectTwo: "Physique-chimie",
	}),
	seededSubmission(15, generateAccessKey(), {
		...ambiguousBase,
		examAt: new Date("2026-06-25T11:30:00+02:00"),
		subjectOne: "Physique-chimie",
		subjectTwo: "Mathématiques",
	}),
	seededSubmission(11, DEMO_KEYS.insufficient, {
		...insufficientBase,
		examAt: new Date("2026-06-26T10:00:00+02:00"),
		subjectOne: "Mathématiques",
		subjectTwo: "Physique-chimie",
	}),
	seededSubmission(13, DEMO_KEYS.technological, {
		...technologicalBase,
		examAt: new Date("2026-06-27T10:00:00+02:00"),
		subjectOne: "Management",
		subjectTwo: "Droit-économie",
	}),
	seededSubmission(14, generateAccessKey(), {
		...technologicalBase,
		examAt: new Date("2026-06-27T09:30:00+02:00"),
		subjectOne: "Management",
		subjectTwo: "Droit-économie",
	}),
];

await db.transaction(async (tx) => {
	await tx.delete(rateLimitEvent);
	await tx
		.delete(submission)
		.where(like(submission.id, "30000000-0000-4000-8000-%"));

	for (const value of schools) {
		await tx.insert(school).values(value).onConflictDoUpdate({
			target: school.uai,
			set: value,
		});
	}

	for (const value of sessions) {
		await tx.insert(examSession).values(value).onConflictDoUpdate({
			target: examSession.id,
			set: value,
		});
	}

	await tx.insert(submission).values(submissions);
});

console.log(`
Seed de démonstration appliqué à ${env.DATABASE_URL}

Clés à importer dans « Mes déclarations » :
  Fort         ${DEMO_KEYS.strong}
  Ambigu       ${DEMO_KEYS.ambiguous}
  Insuffisant  ${DEMO_KEYS.insufficient}
  Non supporté ${DEMO_KEYS.technological}

Scénarios à saisir sur l’accueil :
  Fort         Fourvière · 2026 · 24/06 · officiel 0421 · Maths / Physique-chimie
  Ambigu       Croix-Rousse · 2026 · 25/06 · officiel 0577 · Maths / Physique-chimie
  Insuffisant  Louis-le-Grand · 2026 · 26/06 · officiel 0999 · Maths / Physique-chimie
  Non supporté Victor Hugo Paris · 2026 · 27/06 · STMG · partagé T004
`);
