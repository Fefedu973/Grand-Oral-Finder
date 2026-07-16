import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
	path: "../../apps/server/.env",
});

const projectRoot = fileURLToPath(new URL("../../", import.meta.url));
const rawDatabaseUrl = process.env.DATABASE_URL || "";
const databaseUrl = rawDatabaseUrl.startsWith("file:./")
	? `file:${resolve(projectRoot, rawDatabaseUrl.slice(5)).replaceAll("\\", "/")}`
	: rawDatabaseUrl;

export default defineConfig({
	schema: "./src/schema",
	out: "./src/migrations",
	dialect: "turso",
	dbCredentials: {
		url: databaseUrl,
	},
});
