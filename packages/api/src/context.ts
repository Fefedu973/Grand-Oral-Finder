import { db } from "@grand-oral-finder/db";
import type { Context as HonoContext } from "hono";

export type CreateContextOptions = {
	context: HonoContext;
};

type Database = Omit<typeof db, "$client">;

export type Context = {
	db: Database;
	clientIp: string;
};

export function createContext({ context }: CreateContextOptions): Context {
	const forwardedFor = context.req
		.header("x-forwarded-for")
		?.split(",")[0]
		?.trim();
	return {
		db,
		clientIp:
			forwardedFor ||
			context.req.header("cf-connecting-ip") ||
			context.req.header("x-real-ip") ||
			"unknown",
	};
}
