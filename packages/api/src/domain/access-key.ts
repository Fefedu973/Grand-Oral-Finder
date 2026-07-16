import { createHash, randomBytes } from "node:crypto";

const ACCESS_KEY_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const ACCESS_KEY_CHARACTER_COUNT = 32;
const ACCESS_KEY_PATTERN = new RegExp(
	`^GOF[${ACCESS_KEY_ALPHABET}]{${ACCESS_KEY_CHARACTER_COUNT}}$`,
);

function encodeBase32(bytes: Uint8Array) {
	let output = "";
	let value = 0;
	let bitCount = 0;

	for (const byte of bytes) {
		value = (value << 8) | byte;
		bitCount += 8;
		while (bitCount >= 5) {
			output += ACCESS_KEY_ALPHABET[(value >>> (bitCount - 5)) & 31];
			bitCount -= 5;
		}
	}

	if (bitCount > 0) {
		output += ACCESS_KEY_ALPHABET[(value << (5 - bitCount)) & 31];
	}

	return output;
}

export function normalizeAccessKey(value: string) {
	return value
		.normalize("NFKC")
		.trim()
		.toUpperCase()
		.replace(/[\s_-]+/g, "");
}

export function formatAccessKey(value: string) {
	const normalized = normalizeAccessKey(value);
	if (!ACCESS_KEY_PATTERN.test(normalized)) return value.trim();
	const payload = normalized.slice(3);
	return `GOF-${payload.match(/.{1,4}/g)?.join("-") ?? payload}`;
}

export function isAccessKey(value: string) {
	return ACCESS_KEY_PATTERN.test(normalizeAccessKey(value));
}

export function generateAccessKey() {
	const payload = encodeBase32(randomBytes(20)).slice(
		0,
		ACCESS_KEY_CHARACTER_COUNT,
	);
	return formatAccessKey(`GOF${payload}`);
}

export function hashAccessKey(value: string) {
	const normalized = normalizeAccessKey(value);
	if (!ACCESS_KEY_PATTERN.test(normalized)) {
		throw new Error("Clé de récupération invalide.");
	}
	return createHash("sha256").update(normalized).digest("hex");
}
