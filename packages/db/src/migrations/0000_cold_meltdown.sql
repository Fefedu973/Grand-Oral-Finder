CREATE TABLE `exam_session` (
	`id` text PRIMARY KEY NOT NULL,
	`school_uai` text NOT NULL,
	`exam_year` integer NOT NULL,
	`track` text NOT NULL,
	`series` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`school_uai`) REFERENCES `school`(`uai`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `exam_session_school_year_track_unique` ON `exam_session` (`school_uai`,`exam_year`,`track`,`series`);--> statement-breakpoint
CREATE INDEX `exam_session_year_idx` ON `exam_session` (`exam_year`);--> statement-breakpoint
CREATE TABLE `rate_limit_event` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`action` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_limit_event_lookup_idx` ON `rate_limit_event` (`action`,`fingerprint`,`created_at`);--> statement-breakpoint
CREATE TABLE `school` (
	`uai` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`postal_code` text,
	`academy` text,
	`sector` text,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `submission` (
	`id` text PRIMARY KEY NOT NULL,
	`access_key_hash` text NOT NULL,
	`device_hash` text NOT NULL,
	`exam_session_id` text NOT NULL,
	`commission_code` text NOT NULL,
	`code_source` text DEFAULT 'official' NOT NULL,
	`exam_day` text NOT NULL,
	`exam_at` integer NOT NULL,
	`subject_one` text NOT NULL,
	`subject_two` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`edit_window_started_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`edit_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`exam_session_id`) REFERENCES `exam_session`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `submission_access_key_hash_unique` ON `submission` (`access_key_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `submission_device_session_unique` ON `submission` (`device_hash`,`exam_session_id`);--> statement-breakpoint
CREATE INDEX `submission_session_idx` ON `submission` (`exam_session_id`);--> statement-breakpoint
CREATE INDEX `submission_lookup_idx` ON `submission` (`exam_session_id`,`exam_day`,`code_source`,`commission_code`);