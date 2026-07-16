import { randomUUID } from "node:crypto";

import { relations, sql } from "drizzle-orm";
import {
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

const now = sql`(cast(unixepoch('subsecond') * 1000 as integer))`;

export const school = sqliteTable("school", {
	uai: text("uai").primaryKey(),
	name: text("name").notNull(),
	city: text("city").notNull(),
	postalCode: text("postal_code"),
	academy: text("academy"),
	sector: text("sector"),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(now)
		.$onUpdate(() => new Date())
		.notNull(),
});

export const examSession = sqliteTable(
	"exam_session",
	{
		id: text("id").primaryKey().$defaultFn(randomUUID),
		schoolUai: text("school_uai")
			.notNull()
			.references(() => school.uai, { onDelete: "restrict" }),
		examYear: integer("exam_year").notNull(),
		track: text("track").notNull(),
		series: text("series").default("").notNull(),
		status: text("status").default("open").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(now)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(now)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("exam_session_school_year_track_unique").on(
			table.schoolUai,
			table.examYear,
			table.track,
			table.series,
		),
		index("exam_session_year_idx").on(table.examYear),
	],
);

export const submission = sqliteTable(
	"submission",
	{
		id: text("id").primaryKey().$defaultFn(randomUUID),
		accessKeyHash: text("access_key_hash").notNull().unique(),
		deviceHash: text("device_hash").notNull(),
		examSessionId: text("exam_session_id")
			.notNull()
			.references(() => examSession.id, { onDelete: "cascade" }),
		commissionCode: text("commission_code").notNull(),
		codeSource: text("code_source").default("official").notNull(),
		examDay: text("exam_day").notNull(),
		examAt: integer("exam_at", { mode: "timestamp_ms" }).notNull(),
		subjectOne: text("subject_one").notNull(),
		subjectTwo: text("subject_two").notNull(),
		version: integer("version").default(1).notNull(),
		editWindowStartedAt: integer("edit_window_started_at", {
			mode: "timestamp_ms",
		})
			.default(now)
			.notNull(),
		editCount: integer("edit_count").default(0).notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(now)
			.notNull(),
		updatedAt: integer("updated_at", { mode: "timestamp_ms" })
			.default(now)
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("submission_device_session_unique").on(
			table.deviceHash,
			table.examSessionId,
		),
		index("submission_session_idx").on(table.examSessionId),
		index("submission_lookup_idx").on(
			table.examSessionId,
			table.examDay,
			table.codeSource,
			table.commissionCode,
		),
	],
);

export const rateLimitEvent = sqliteTable(
	"rate_limit_event",
	{
		id: text("id").primaryKey().$defaultFn(randomUUID),
		fingerprint: text("fingerprint").notNull(),
		action: text("action").notNull(),
		createdAt: integer("created_at", { mode: "timestamp_ms" })
			.default(now)
			.notNull(),
	},
	(table) => [
		index("rate_limit_event_lookup_idx").on(
			table.action,
			table.fingerprint,
			table.createdAt,
		),
	],
);

export const schoolRelations = relations(school, ({ many }) => ({
	sessions: many(examSession),
}));

export const examSessionRelations = relations(examSession, ({ many, one }) => ({
	school: one(school, {
		fields: [examSession.schoolUai],
		references: [school.uai],
	}),
	submissions: many(submission),
}));

export const submissionRelations = relations(submission, ({ one }) => ({
	session: one(examSession, {
		fields: [submission.examSessionId],
		references: [examSession.id],
	}),
}));
