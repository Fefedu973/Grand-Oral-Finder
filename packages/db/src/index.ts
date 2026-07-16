import { env } from "@grand-oral-finder/env/server";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

export * from "./schema";

export function createDb() {
	const client = createClient({ url: env.DATABASE_URL });
	return drizzle({ client, schema });
}

export const db = createDb();
