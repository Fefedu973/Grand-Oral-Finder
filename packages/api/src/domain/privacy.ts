import { createHash, createHmac } from "node:crypto";

export function hashDeviceToken(value: string) {
	return createHash("sha256").update(value).digest("hex");
}

export function hashClientIp(value: string, secret: string) {
	return createHmac("sha256", secret).update(value).digest("hex");
}
