const PLACE_ID =
	process.env.RECOLLECT_PLACE_ID ?? "D338DAD4-D4AF-11F0-9DA3-EE0251E5C8E1";
const SERVICE_ID = process.env.RECOLLECT_SERVICE_ID ?? "50013";
const LOOKAHEAD_DAYS = 42;
const LATER_LIMIT = 4;

type RawFlag = {
	id: number;
	subject: string;
	sort_order: number;
	backgroundColor?: string;
	color?: string;
};

type RawEvent = {
	day: string; // YYYY-MM-DD
	flags?: RawFlag[];
};

export type Bin = { id: number; label: string; colour: string };
export type Collection = {
	day: string; // YYYY-MM-DD
	label: string; // "Today", "Tomorrow", "In 5 days"
	date: string; // "Wednesday 11 November"
	soon: boolean;
	bins: Bin[];
};

export type CollectionSchedule =
	| { ok: true; next: Collection | null; later: Collection[] }
	| { ok: false; message: string };

export type ScheduleDependencies = {
	fetch: typeof globalThis.fetch;
	now: Date;
};

function todayInLondon(now: Date): string {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "Europe/London",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(now);
}

function addDays(day: string, n: number): string {
	let date = new Date(`${day}T00:00:00Z`);
	date.setUTCDate(date.getUTCDate() + n);
	return date.toISOString().slice(0, 10);
}

function relativeLabel(day: string, today: string): string {
	if (day === today) return "Today";
	if (day === addDays(today, 1)) return "Tomorrow";
	let diff = Math.round(
		(Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
			86_400_000,
	);
	return `In ${diff} days`;
}

function formatDay(day: string): string {
	return new Intl.DateTimeFormat("en-GB", {
		weekday: "long",
		day: "numeric",
		month: "long",
		timeZone: "UTC",
	}).format(new Date(`${day}T00:00:00Z`));
}

/** WCAG AA minimum contrast for normal-size text. */
const MIN_CONTRAST = 4.5;

function relativeLuminance(rgb: number[]): number {
	let [r, g, b] = rgb.map((channel) => {
		let value = channel / 255;
		return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Bin chips use white text on the colour ReCollect gives each bin. Some of
 * those colours are too light for white text, so darken them just enough
 * to reach WCAG AA contrast, keeping the hue the council chose.
 */
function readableBehindWhiteText(hex: string): string {
	let rgb = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
	if (rgb.some(Number.isNaN)) return hex;

	let contrastWithWhite = (channels: number[]) =>
		1.05 / (relativeLuminance(channels) + 0.05);
	if (contrastWithWhite(rgb) >= MIN_CONTRAST) return hex;

	let darkened = rgb;
	for (let scale = 0.99; scale > 0; scale -= 0.01) {
		darkened = rgb.map((channel) => Math.round(channel * scale));
		if (contrastWithWhite(darkened) >= MIN_CONTRAST) break;
	}

	let hexChannels = darkened.map((channel) =>
		channel.toString(16).padStart(2, "0"),
	);
	return `#${hexChannels.join("").toUpperCase()}`;
}

export async function loadCollectionSchedule({
	fetch,
	now,
}: ScheduleDependencies): Promise<CollectionSchedule> {
	let today = todayInLondon(now);
	let url = new URL(
		`https://api.eu.recollect.net/api/places/${PLACE_ID}/services/${SERVICE_ID}/events`,
	);
	url.search = new URLSearchParams({
		nomerge: "1",
		hide: "reminder_only",
		after: today,
		before: addDays(today, LOOKAHEAD_DAYS),
		locale: "en-GB",
	}).toString();

	let events: RawEvent[];
	try {
		let response = await fetch(url, {
			headers: { Accept: "application/json" },
			signal: AbortSignal.timeout(8000),
		});
		if (!response.ok) {
			throw new Error(
				`API responded ${response.status} ${response.statusText}`,
			);
		}
		let payload: { events?: RawEvent[] } = await response.json();
		events = payload.events ?? [];
	} catch (error) {
		console.error("Failed to load bin collections", error);
		return {
			ok: false,
			message: "Couldn't reach the collection service. Try refreshing shortly.",
		};
	}

	let upcoming = events
		.filter((event) => event.day >= today)
		.sort((a, b) => a.day.localeCompare(b.day));

	let flagsByDay = new Map<string, Map<number, RawFlag>>();
	for (let event of upcoming) {
		let flags = flagsByDay.get(event.day) ?? new Map<number, RawFlag>();
		for (let flag of event.flags ?? []) flags.set(flag.id, flag);
		flagsByDay.set(event.day, flags);
	}

	let [next = null, ...later] = [...flagsByDay].map(([day, flags]) => ({
		day,
		label: relativeLabel(day, today),
		date: formatDay(day),
		soon: day === today || day === addDays(today, 1),
		bins: [...flags.values()]
			.sort((a, b) => a.sort_order - b.sort_order)
			.map((flag) => ({
				id: flag.id,
				label: flag.subject,
				colour: readableBehindWhiteText(
					flag.backgroundColor ?? flag.color ?? "#333333",
				),
			})),
	}));

	return { ok: true, next, later: later.slice(0, LATER_LIMIT) };
}
