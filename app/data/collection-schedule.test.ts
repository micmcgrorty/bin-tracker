import * as assert from "remix/assert";
import { describe, it } from "remix/test";

import { loadCollectionSchedule } from "./collection-schedule.ts";

describe("loadCollectionSchedule", () => {
	it("requests the next 42 days of events from ReCollect", async (testContext) => {
		let fetch = testContext.mock.fn<typeof globalThis.fetch>(async () =>
			Response.json({ events: [] }),
		);

		await loadCollectionSchedule({
			fetch,
			now: new Date("2026-11-11T09:00:00Z"),
		});

		assert.equal(fetch.mock.calls.length, 1);
		assert.equal(
			fetch.mock.calls[0].arguments[0].toString(),
			"https://api.eu.recollect.net/api/places/D338DAD4-D4AF-11F0-9DA3-EE0251E5C8E1/services/50013/events?nomerge=1&hide=reminder_only&after=2026-11-11&before=2026-12-23&locale=en-GB",
		);
		assert.partialDeepEqual(fetch.mock.calls[0].arguments[1], {
			headers: { Accept: "application/json" },
		});
		assert.ok(fetch.mock.calls[0].arguments[1]?.signal);
	});

	describe("when ReCollect cannot be used", () => {
		it("returns a failure when the request rejects", async (testContext) => {
			testContext.mock.method(console, "error", () => {});
			let fetch = testContext.mock.fn(async () => {
				throw new TypeError("fetch failed");
			});

			let schedule = await loadCollectionSchedule({
				fetch,
				now: new Date("2026-11-11T09:00:00Z"),
			});

			assert.deepEqual(schedule, {
				ok: false,
				message:
					"Couldn't reach the collection service. Try refreshing shortly.",
			});
		});

		it("returns a failure and logs the status for a non-OK response", async (testContext) => {
			let consoleError = testContext.mock.method(console, "error", () => {});
			let fetch = testContext.mock.fn(async () =>
				Response.json(
					{ error: "Internal Server Error" },
					{ status: 500, statusText: "Internal Server Error" },
				),
			);

			let schedule = await loadCollectionSchedule({
				fetch,
				now: new Date("2026-11-11T09:00:00Z"),
			});

			assert.deepEqual(schedule, {
				ok: false,
				message:
					"Couldn't reach the collection service. Try refreshing shortly.",
			});
			assert.equal(
				consoleError.mock.calls[0].arguments[1].message,
				"API responded 500 Internal Server Error",
			);
		});

		it("returns a failure when the body is not valid JSON", async (testContext) => {
			testContext.mock.method(console, "error", () => {});
			let fetch = testContext.mock.fn(
				async () =>
					new Response("<html>Service unavailable</html>", {
						headers: { "Content-Type": "text/html" },
					}),
			);

			let schedule = await loadCollectionSchedule({
				fetch,
				now: new Date("2026-11-11T09:00:00Z"),
			});

			assert.deepEqual(schedule, {
				ok: false,
				message:
					"Couldn't reach the collection service. Try refreshing shortly.",
			});
		});

		it("returns a failure when the body is JSON null", async (testContext) => {
			testContext.mock.method(console, "error", () => {});
			let fetch = testContext.mock.fn(async () => Response.json(null));

			let schedule = await loadCollectionSchedule({
				fetch,
				now: new Date("2026-11-11T09:00:00Z"),
			});

			assert.deepEqual(schedule, {
				ok: false,
				message:
					"Couldn't reach the collection service. Try refreshing shortly.",
			});
		});
	});

	it("uses the date in London, which is ahead of UTC in summer", async (testContext) => {
		let fetch = testContext.mock.fn(async () => Response.json({ events: [] }));

		let schedule = await loadCollectionSchedule({
			fetch,
			now: new Date("2026-07-01T23:30:00Z"),
		});

		assert.deepEqual(schedule, {
			ok: true,
			today: "2026-07-02",
			collections: [],
		});
	});

	it("returns no collections when the events key is missing", async (testContext) => {
		let fetch = testContext.mock.fn(async () => Response.json({}));

		let schedule = await loadCollectionSchedule({
			fetch,
			now: new Date("2026-11-11T09:00:00Z"),
		});

		assert.deepEqual(schedule, {
			ok: true,
			today: "2026-11-11",
			collections: [],
		});
	});

	it("drops events dated before today", async (testContext) => {
		let fetch = testContext.mock.fn(async () =>
			Response.json({
				events: [
					{
						day: "2026-11-10",
						flags: [{ id: 1, subject: "Black bin", sort_order: 1 }],
					},
					{
						day: "2026-11-12",
						flags: [{ id: 2, subject: "Blue bin", sort_order: 1 }],
					},
				],
			}),
		);

		let schedule = await loadCollectionSchedule({
			fetch,
			now: new Date("2026-11-11T09:00:00Z"),
		});

		assert.deepEqual(schedule, {
			ok: true,
			today: "2026-11-11",
			collections: [
				{
					day: "2026-11-12",
					bins: [{ id: 2, label: "Blue bin", colour: "#333333" }],
				},
			],
		});
	});

	it("orders collections by date", async (testContext) => {
		let fetch = testContext.mock.fn(async () =>
			Response.json({
				events: [
					{
						day: "2026-11-25",
						flags: [{ id: 3, subject: "Bin C", sort_order: 1 }],
					},
					{
						day: "2026-11-12",
						flags: [{ id: 1, subject: "Bin A", sort_order: 1 }],
					},
					{
						day: "2026-11-18",
						flags: [{ id: 2, subject: "Bin B", sort_order: 1 }],
					},
				],
			}),
		);

		let schedule = await loadCollectionSchedule({
			fetch,
			now: new Date("2026-11-11T09:00:00Z"),
		});

		assert.deepEqual(schedule, {
			ok: true,
			today: "2026-11-11",
			collections: [
				{
					day: "2026-11-12",
					bins: [{ id: 1, label: "Bin A", colour: "#333333" }],
				},
				{
					day: "2026-11-18",
					bins: [{ id: 2, label: "Bin B", colour: "#333333" }],
				},
				{
					day: "2026-11-25",
					bins: [{ id: 3, label: "Bin C", colour: "#333333" }],
				},
			],
		});
	});

	it("merges separate events on the same day into one collection", async (testContext) => {
		let fetch = testContext.mock.fn(async () =>
			Response.json({
				events: [
					{
						day: "2026-11-15",
						flags: [{ id: 1, subject: "Black bin", sort_order: 1 }],
					},
					{
						day: "2026-11-15",
						flags: [{ id: 2, subject: "Food caddy", sort_order: 2 }],
					},
				],
			}),
		);

		let schedule = await loadCollectionSchedule({
			fetch,
			now: new Date("2026-11-11T09:00:00Z"),
		});

		assert.deepEqual(schedule, {
			ok: true,
			today: "2026-11-11",
			collections: [
				{
					day: "2026-11-15",
					bins: [
						{ id: 1, label: "Black bin", colour: "#333333" },
						{ id: 2, label: "Food caddy", colour: "#333333" },
					],
				},
			],
		});
	});

	it("lists a bin once when it is reported twice on the same day", async (testContext) => {
		let fetch = testContext.mock.fn(async () =>
			Response.json({
				events: [
					{
						day: "2026-11-15",
						flags: [{ id: 1, subject: "Black bin", sort_order: 1 }],
					},
					{
						day: "2026-11-15",
						flags: [{ id: 1, subject: "Black bin", sort_order: 1 }],
					},
				],
			}),
		);

		let schedule = await loadCollectionSchedule({
			fetch,
			now: new Date("2026-11-11T09:00:00Z"),
		});

		assert.deepEqual(schedule, {
			ok: true,
			today: "2026-11-11",
			collections: [
				{
					day: "2026-11-15",
					bins: [{ id: 1, label: "Black bin", colour: "#333333" }],
				},
			],
		});
	});

	it("orders bins by sort_order", async (testContext) => {
		let fetch = testContext.mock.fn(async () =>
			Response.json({
				events: [
					{
						day: "2026-11-12",
						flags: [
							{ id: 3, subject: "Third", sort_order: 30 },
							{ id: 1, subject: "First", sort_order: 10 },
							{ id: 2, subject: "Second", sort_order: 20 },
						],
					},
				],
			}),
		);

		let schedule = await loadCollectionSchedule({
			fetch,
			now: new Date("2026-11-11T09:00:00Z"),
		});

		assert.deepEqual(schedule, {
			ok: true,
			today: "2026-11-11",
			collections: [
				{
					day: "2026-11-12",
					bins: [
						{ id: 1, label: "First", colour: "#333333" },
						{ id: 2, label: "Second", colour: "#333333" },
						{ id: 3, label: "Third", colour: "#333333" },
					],
				},
			],
		});
	});

	it("colours a bin with backgroundColor, then color, then a default", async (testContext) => {
		let fetch = testContext.mock.fn(async () =>
			Response.json({
				events: [
					{
						day: "2026-11-12",
						flags: [
							{
								id: 1,
								subject: "Both",
								sort_order: 1,
								backgroundColor: "#aa0001",
								color: "#bb0002",
							},
							{ id: 2, subject: "ColorOnly", sort_order: 2, color: "#cc0003" },
							{ id: 3, subject: "Neither", sort_order: 3 },
						],
					},
				],
			}),
		);

		let schedule = await loadCollectionSchedule({
			fetch,
			now: new Date("2026-11-11T09:00:00Z"),
		});

		assert.deepEqual(schedule, {
			ok: true,
			today: "2026-11-11",
			collections: [
				{
					day: "2026-11-12",
					bins: [
						{ id: 1, label: "Both", colour: "#aa0001" },
						{ id: 2, label: "ColorOnly", colour: "#cc0003" },
						{ id: 3, label: "Neither", colour: "#333333" },
					],
				},
			],
		});
	});

	it("returns a collection with no bins for an event without flags", async (testContext) => {
		let fetch = testContext.mock.fn(async () =>
			Response.json({ events: [{ day: "2026-11-13" }] }),
		);

		let schedule = await loadCollectionSchedule({
			fetch,
			now: new Date("2026-11-11T09:00:00Z"),
		});

		assert.deepEqual(schedule, {
			ok: true,
			today: "2026-11-11",
			collections: [{ day: "2026-11-13", bins: [] }],
		});
	});

	it("returns a collection for an event today", async (testContext) => {
		let fetch = testContext.mock.fn(async () =>
			Response.json({
				events: [
					{
						day: "2026-11-11",
						flags: [
							{
								id: 1,
								subject: "Black bin",
								sort_order: 1,
								backgroundColor: "#000000",
							},
						],
					},
				],
			}),
		);

		let schedule = await loadCollectionSchedule({
			fetch,
			now: new Date("2026-11-11T09:00:00Z"),
		});

		assert.deepEqual(schedule, {
			ok: true,
			today: "2026-11-11",
			collections: [
				{
					day: "2026-11-11",
					bins: [{ id: 1, label: "Black bin", colour: "#000000" }],
				},
			],
		});
	});
});
