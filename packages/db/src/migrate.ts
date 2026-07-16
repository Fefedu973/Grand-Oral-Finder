import { fileURLToPath } from "node:url";

import { migrate } from "drizzle-orm/libsql/migrator";

import { db } from "./index";

await migrate(db, {
	migrationsFolder: fileURLToPath(new URL("./migrations", import.meta.url)),
});

console.log("Database migrations applied.");
