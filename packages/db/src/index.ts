import { env } from "@grand-oral-finder/env/server";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

export * from "./schema";

function createDatabaseClient() {
	const configuredUrl = env.DATABASE_URL;

	if (
		!configuredUrl.startsWith("http://") &&
		!configuredUrl.startsWith("https://")
	) {
		return createClient({ url: configuredUrl });
	}

	const parsedUrl = new URL(configuredUrl);
	if (parsedUrl.username === "" && parsedUrl.password === "") {
		return createClient({ url: configuredUrl });
	}

	const username = decodeURIComponent(parsedUrl.username);
	const password = decodeURIComponent(parsedUrl.password);
	const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;

	parsedUrl.username = "";
	parsedUrl.password = "";

	return createClient({
		url: parsedUrl.toString(),
		fetch(
			input: Parameters<typeof globalThis.fetch>[0],
			init?: Parameters<typeof globalThis.fetch>[1],
		) {
			const headers = new Headers(init?.headers);
			headers.set("Authorization", authorization);
			return globalThis.fetch(input, { ...init, headers });
		},
	});
}

export function createDb() {
	const client = createDatabaseClient();
	return drizzle({ client, schema });
}

export const db = createDb();
