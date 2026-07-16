const STORAGE_KEY = "grand-oral-finder:access-keys:v1";
const DEVICE_TOKEN_KEY = "grand-oral-finder:device-token:v1";
const ACCESS_KEY_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const ACCESS_KEY_PATTERN = new RegExp(`^GOF[${ACCESS_KEY_ALPHABET}]{32}$`);
const MAX_KEYS = 20;
let memoryDeviceToken: string | null = null;

function createDeviceToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(32));
	return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function getOrCreateDeviceToken() {
	try {
		const existing = localStorage.getItem(DEVICE_TOKEN_KEY);
		if (existing && /^[a-f0-9]{64}$/.test(existing)) return existing;
		const token = createDeviceToken();
		localStorage.setItem(DEVICE_TOKEN_KEY, token);
		return token;
	} catch {
		memoryDeviceToken ??= createDeviceToken();
		return memoryDeviceToken;
	}
}

export function normalizeSubmissionAccessKey(value: string) {
	return value
		.normalize("NFKC")
		.trim()
		.toUpperCase()
		.replace(/[\s_-]+/g, "");
}

export function isSubmissionAccessKey(value: string) {
	return ACCESS_KEY_PATTERN.test(normalizeSubmissionAccessKey(value));
}

export function formatSubmissionAccessKey(value: string) {
	const normalized = normalizeSubmissionAccessKey(value);
	if (!ACCESS_KEY_PATTERN.test(normalized)) return value.trim();
	const payload = normalized.slice(3);
	return `GOF-${payload.match(/.{1,4}/g)?.join("-") ?? payload}`;
}

export function readSubmissionAccessKeys() {
	if (typeof window === "undefined") return [];

	try {
		const parsed: unknown = JSON.parse(
			localStorage.getItem(STORAGE_KEY) ?? "[]",
		);
		if (!Array.isArray(parsed)) return [];
		return [
			...new Set(
				parsed
					.filter(
						(value): value is string =>
							typeof value === "string" && isSubmissionAccessKey(value),
					)
					.map(formatSubmissionAccessKey),
			),
		].slice(0, MAX_KEYS);
	} catch {
		return [];
	}
}

function writeSubmissionAccessKeys(keys: string[]) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(keys.slice(0, MAX_KEYS)));
		return true;
	} catch {
		return false;
	}
}

export function addSubmissionAccessKey(value: string) {
	if (!isSubmissionAccessKey(value)) return false;
	const key = formatSubmissionAccessKey(value);
	const normalized = normalizeSubmissionAccessKey(key);
	const remaining = readSubmissionAccessKeys().filter(
		(existing) => normalizeSubmissionAccessKey(existing) !== normalized,
	);
	return writeSubmissionAccessKeys([key, ...remaining]);
}

export function removeSubmissionAccessKey(value: string) {
	const normalized = normalizeSubmissionAccessKey(value);
	return writeSubmissionAccessKeys(
		readSubmissionAccessKeys().filter(
			(existing) => normalizeSubmissionAccessKey(existing) !== normalized,
		),
	);
}
