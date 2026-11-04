import type { Handle } from "remix/component";
import { css } from "remix/component";

import { Document } from "./document.tsx";

const PLACE_ID =
	process.env.RECOLLECT_PLACE_ID ?? "D338DAD4-D4AF-11F0-9DA3-EE0251E5C8E1";
const SERVICE_ID = process.env.RECOLLECT_SERVICE_ID ?? "50013";
const LOOKAHEAD_DAYS = 42;
const TIME_ZONE = "Europe/London";

type RawFlag = {
	id: number;
	subject: string;
	sort_order: number;
	backgroundColor?: string;
	color?: string;
};

type RawEvent = {
	day: string; // YYYY-MM-DD
	flags: RawFlag[];
};

type Bin = { id: number; label: string; colour: string };
type Collection = { day: string; bins: Bin[] };

export type BinData =
	| { ok: true; today: string; collections: Collection[] }
	| { ok: false; message: string };

function todayInLondon(now = new Date()): string {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: TIME_ZONE,
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

export async function loadBins(): Promise<BinData> {
	try {
		let today = todayInLondon();
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

		let response = await fetch(url, {
			headers: { Accept: "application/json" },
			signal: AbortSignal.timeout(8000),
		});
		if (!response.ok) {
			throw new Error(
				`API responded ${response.status} ${response.statusText}`,
			);
		}

		let payload = (await response.json()) as { events?: RawEvent[] };

		let byDay = new Map<string, Map<number, RawFlag>>();
		for (let event of payload.events ?? []) {
			if (event.day < today) continue;
			let flags = byDay.get(event.day) ?? new Map<number, RawFlag>();
			for (let flag of event.flags ?? []) flags.set(flag.id, flag);
			byDay.set(event.day, flags);
		}

		let collections: Collection[] = [...byDay.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([day, flags]) => ({
				day,
				bins: [...flags.values()]
					.sort((a, b) => a.sort_order - b.sort_order)
					.map((flag) => ({
						id: flag.id,
						label: flag.subject,
						colour: flag.backgroundColor ?? flag.color ?? "#333333",
					})),
			}));

		return { ok: true, today, collections };
	} catch (error) {
		console.error("Failed to load bin collections", error);
		return {
			ok: false,
			message: "Couldn't reach the collection service. Try refreshing shortly.",
		};
	}
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

const FONT_STACK =
	"'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";

export function HomePage(handle: Handle<{ data: BinData }>) {
	return () => {
		let { data } = handle.props;

		return (
			<Document title="Bin Day" head={<HomeHead />}>
				<main
					mix={css({
						"--bg": "#f5f7fa",
						"--surface": "#ffffff",
						"--text": "#101826",
						"--muted": "#46526a",
						"--accent": "#005eb8",
						"--rule": "#cbd5e3",
						"--soon": "#218410",
						"@media (prefers-color-scheme: dark)": {
							"--bg": "#0e1522",
							"--surface": "#17223a",
							"--text": "#e8eef7",
							"--muted": "#a9b6c9",
							"--accent": "#5ba3ff",
							"--rule": "#2a3750",
							"--soon": "#4ade80",
						},
						"& *, & *::before, & *::after": { boxSizing: "border-box" },
						margin: 0,
						padding: "64px 20px",
						minHeight: "100vh",
						background: "var(--bg)",
						color: "var(--text)",
						fontFamily: FONT_STACK,
						fontSize: "16px",
						lineHeight: 1.5,
						WebkitFontSmoothing: "antialiased",
					})}
				>
					<div
						mix={css({
							width: "100%",
							maxWidth: "560px",
							margin: "0 auto",
							display: "flex",
							flexDirection: "column",
							gap: "40px",
						})}
					>
						<h1
							mix={css({
								margin: 0,
								fontSize: "clamp(32px, 7vw, 44px)",
								fontWeight: 800,
								letterSpacing: "-0.03em",
								lineHeight: 1.05,
							})}
						>
							Bin Day
						</h1>

						{data.ok ? (
							<Collections today={data.today} collections={data.collections} />
						) : (
							<p
								role="alert"
								mix={css({
									margin: 0,
									padding: "16px 20px",
									border: "2px solid #b42318",
									borderRadius: "10px",
									background: "var(--surface)",
								})}
							>
								{data.message}
							</p>
						)}
					</div>
				</main>
			</Document>
		);
	};
}

function HomeHead() {
	return () => (
		<>
			<meta name="description" content="Upcoming bin collection days." />
			<meta httpEquiv="refresh" content="3600" />
			<link rel="preconnect" href="https://fonts.googleapis.com" />
			<link
				rel="preconnect"
				href="https://fonts.gstatic.com"
				crossOrigin="anonymous"
			/>
			<link
				rel="stylesheet"
				href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap"
			/>
		</>
	);
}

function Collections(
	handle: Handle<{ today: string; collections: Collection[] }>,
) {
	return () => {
		let { today, collections } = handle.props;
		let [next, ...rest] = collections;
		let later = rest.slice(0, 4);

		if (!next) {
			return <p mix={css({ margin: 0 })}>No upcoming collections found.</p>;
		}

		let soon = next.day === today || next.day === addDays(today, 1);

		return (
			<>
				<section
					aria-labelledby="next-heading"
					mix={css({
						padding: "28px",
						borderRadius: "14px",
						background: "var(--surface)",
						border: soon ? "2px solid var(--soon)" : "2px solid var(--rule)",
						display: "flex",
						flexDirection: "column",
						gap: "6px",
					})}
				>
					<h2
						id="next-heading"
						mix={css({
							margin: 0,
							fontSize: "13px",
							fontWeight: 700,
							letterSpacing: "0.08em",
							textTransform: "uppercase",
							color: "var(--muted)",
						})}
					>
						Next collection
					</h2>
					<p
						mix={css({
							margin: 0,
							fontSize: "clamp(32px, 8vw, 44px)",
							fontWeight: 800,
							letterSpacing: "-0.03em",
							lineHeight: 1.1,
						})}
					>
						{relativeLabel(next.day, today)}
					</p>
					<p
						mix={css({
							margin: "0 0 14px",
							color: "var(--muted)",
							fontSize: "18px",
						})}
					>
						{formatDay(next.day)}
					</p>
					<BinChips bins={next.bins} large />
				</section>

				{later.length > 0 ? (
					<section
						aria-labelledby="later-heading"
						mix={css({ display: "flex", flexDirection: "column", gap: "14px" })}
					>
						<h2
							id="later-heading"
							mix={css({
								margin: 0,
								fontSize: "18px",
								fontWeight: 700,
								color: "var(--muted)",
							})}
						>
							Coming up later
						</h2>
						<ul
							mix={css({
								listStyle: "none",
								margin: 0,
								padding: 0,
								display: "flex",
								flexDirection: "column",
								gap: "10px",
							})}
						>
							{later.map((collection) => (
								<li
									key={collection.day}
									mix={css({
										padding: "14px 18px",
										borderRadius: "10px",
										background: "var(--surface)",
										border: "1px solid var(--rule)",
										display: "flex",
										flexDirection: "column",
										gap: "10px",
									})}
								>
									<div
										mix={css({
											display: "flex",
											flexWrap: "wrap",
											justifyContent: "space-between",
											alignItems: "baseline",
											gap: "2px 16px",
										})}
									>
										<span mix={css({ fontWeight: 700 })}>
											{relativeLabel(collection.day, today)}
										</span>
										<span
											mix={css({ fontSize: "15px", color: "var(--muted)" })}
										>
											{formatDay(collection.day)}
										</span>
									</div>
									<BinChips bins={collection.bins} />
								</li>
							))}
						</ul>
					</section>
				) : null}
			</>
		);
	};
}

function BinChips(handle: Handle<{ bins: Bin[]; large?: boolean }>) {
	return () => {
		let { bins, large } = handle.props;

		return (
			<ul
				aria-label="Bins"
				mix={css({
					listStyle: "none",
					margin: 0,
					padding: 0,
					display: "flex",
					flexWrap: "wrap",
					gap: "8px",
				})}
			>
				{bins.map((bin) => (
					<li
						key={bin.id}
						mix={css({
							padding: large ? "8px 16px" : "4px 10px",
							borderRadius: "8px",
							background: bin.colour,
							color: "#ffffff",
							fontWeight: 700,
							fontSize: large ? "16px" : "13px",
						})}
					>
						{bin.label}
					</li>
				))}
			</ul>
		);
	};
}
