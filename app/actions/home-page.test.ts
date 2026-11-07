import * as assert from "remix/assert";
import { afterEach, beforeEach, describe, it, mock } from "remix/test";

import { router } from "../router.ts";

// "Now" is pinned to Wednesday 11 November 2026, 09:00 in London.
const NOW = "2026-11-11T09:00:00Z";
const RealDate = globalThis.Date;

class FixedDate extends RealDate {
	constructor(...args: ConstructorParameters<typeof Date> | []) {
		super(...((args.length === 0 ? [NOW] : args) as [string]));
	}

	static now() {
		return new RealDate(NOW).getTime();
	}
}

describe("home page", () => {
	let consoleError: ReturnType<typeof mock.method>;

	beforeEach(() => {
		globalThis.Date = FixedDate as DateConstructor;
		consoleError = mock.method(console, "error", () => {});
	});

	afterEach(() => {
		globalThis.Date = RealDate;
		consoleError.mock.restore?.();
	});

	describe("request to the ReCollect API", () => {
		it("asks for the next 42 days of events for the configured place", async (testContext) => {
			let fetchSpy = testContext.mock.method(globalThis, "fetch", async () =>
				Response.json({ events: [] }),
			);

			await router.fetch(new Request("https://bins.test/"));

			assert.equal(fetchSpy.mock.calls.length, 1);
			assert.equal(
				fetchSpy.mock.calls[0].arguments[0].toString(),
				"https://api.eu.recollect.net/api/places/D338DAD4-D4AF-11F0-9DA3-EE0251E5C8E1/services/50013/events?nomerge=1&hide=reminder_only&after=2026-11-11&before=2026-12-23&locale=en-GB",
			);
			assert.partialDeepEqual(fetchSpy.mock.calls[0].arguments[1], {
				headers: { Accept: "application/json" },
			});
			assert.ok(fetchSpy.mock.calls[0].arguments[1].signal);
		});
	});

	describe("when the API fails", () => {
		it("shows an error when the network request rejects", async (testContext) => {
			testContext.mock.method(globalThis, "fetch", async () => {
				throw new TypeError("fetch failed");
			});

			let response = await router.fetch(new Request("https://bins.test/"));
			let html = await response.text();

			assert.equal(response.status, 200);
			assert.match(
				html,
				/<p role="alert"[^>]*>Couldn't reach the collection service\. Try refreshing shortly\.<\/p>/,
			);
			assert.doesNotMatch(html, /Next collection/);
		});

		it("shows an error when the request times out", async (testContext) => {
			testContext.mock.method(globalThis, "fetch", async () => {
				throw new DOMException(
					"The operation was aborted due to timeout",
					"TimeoutError",
				);
			});

			let response = await router.fetch(new Request("https://bins.test/"));
			let html = await response.text();

			assert.match(
				html,
				/<p role="alert"[^>]*>Couldn't reach the collection service\. Try refreshing shortly\.<\/p>/,
			);
		});

		it("shows an error and logs the status for a server error response", async (testContext) => {
			testContext.mock.method(
				globalThis,
				"fetch",
				async () =>
					new Response("Internal Server Error", {
						status: 500,
						statusText: "Internal Server Error",
					}),
			);

			let response = await router.fetch(new Request("https://bins.test/"));
			let html = await response.text();

			assert.match(
				html,
				/<p role="alert"[^>]*>Couldn't reach the collection service\. Try refreshing shortly\.<\/p>/,
			);
			assert.equal(
				consoleError.mock.calls[0].arguments[1].message,
				"API responded 500 Internal Server Error",
			);
		});

		it("shows an error when the place is not found", async (testContext) => {
			testContext.mock.method(
				globalThis,
				"fetch",
				async () => new Response("Not Found", { status: 404 }),
			);

			let response = await router.fetch(new Request("https://bins.test/"));
			let html = await response.text();

			assert.match(
				html,
				/<p role="alert"[^>]*>Couldn't reach the collection service\. Try refreshing shortly\.<\/p>/,
			);
		});

		it("shows an error when rate limited", async (testContext) => {
			testContext.mock.method(
				globalThis,
				"fetch",
				async () => new Response("Too Many Requests", { status: 429 }),
			);

			let response = await router.fetch(new Request("https://bins.test/"));
			let html = await response.text();

			assert.match(
				html,
				/<p role="alert"[^>]*>Couldn't reach the collection service\. Try refreshing shortly\.<\/p>/,
			);
		});

		it("shows an error when the body is not valid JSON", async (testContext) => {
			testContext.mock.method(
				globalThis,
				"fetch",
				async () =>
					new Response("<html>Service unavailable</html>", {
						headers: { "Content-Type": "text/html" },
					}),
			);

			let response = await router.fetch(new Request("https://bins.test/"));
			let html = await response.text();

			assert.match(
				html,
				/<p role="alert"[^>]*>Couldn't reach the collection service\. Try refreshing shortly\.<\/p>/,
			);
		});

		it("shows an error when the body is JSON null", async (testContext) => {
			testContext.mock.method(globalThis, "fetch", async () =>
				Response.json(null),
			);

			let response = await router.fetch(new Request("https://bins.test/"));
			let html = await response.text();

			assert.match(
				html,
				/<p role="alert"[^>]*>Couldn't reach the collection service\. Try refreshing shortly\.<\/p>/,
			);
		});
	});

	describe("when there are no upcoming collections", () => {
		it("shows an empty message for an empty events list", async (testContext) => {
			testContext.mock.method(globalThis, "fetch", async () =>
				Response.json({ events: [] }),
			);

			let response = await router.fetch(new Request("https://bins.test/"));
			let html = await response.text();

			assert.match(html, /No upcoming collections found\./);
			assert.doesNotMatch(html, /role="alert"/);
			assert.doesNotMatch(html, /Next collection/);
		});

		it("shows an empty message when the events key is missing", async (testContext) => {
			testContext.mock.method(globalThis, "fetch", async () =>
				Response.json({}),
			);

			let response = await router.fetch(new Request("https://bins.test/"));
			let html = await response.text();

			assert.match(html, /No upcoming collections found\./);
		});

		it("ignores events dated before today", async (testContext) => {
			testContext.mock.method(globalThis, "fetch", async () =>
				Response.json({
					events: [
						{
							day: "2026-11-10",
							flags: [{ id: 1, subject: "Black bin", sort_order: 1 }],
						},
						{
							day: "2026-11-04",
							flags: [{ id: 2, subject: "Blue bin", sort_order: 1 }],
						},
					],
				}),
			);

			let response = await router.fetch(new Request("https://bins.test/"));
			let html = await response.text();

			assert.match(html, /No upcoming collections found\./);
			assert.doesNotMatch(html, /Black bin|Blue bin/);
		});
	});

	describe("the next collection", () => {
		it("labels a collection today as Today and highlights it", async (testContext) => {
			testContext.mock.method(globalThis, "fetch", async () =>
				Response.json({
					events: [
						{
							day: "2026-11-11",
							flags: [{ id: 1, subject: "Black bin", sort_order: 1 }],
						},
					],
				}),
			);

			let response = await router.fetch(new Request("https://bins.test/"));
			let html = await response.text();

			assert.match(
				html,
				/Next collection<\/h2><p[^>]*>Today<\/p><p[^>]*>Wednesday 11 November<\/p>.*>Black bin</s,
			);
			assert.match(html, /border: 2px solid var\(--soon\)/);
		});

		it("labels a collection tomorrow as Tomorrow and highlights it", async (testContext) => {
			testContext.mock.method(globalThis, "fetch", async () =>
				Response.json({
					events: [
						{
							day: "2026-11-12",
							flags: [{ id: 1, subject: "Green bin", sort_order: 1 }],
						},
					],
				}),
			);

			let response = await router.fetch(new Request("https://bins.test/"));
			let html = await response.text();

			assert.match(
				html,
				/Next collection<\/h2><p[^>]*>Tomorrow<\/p><p[^>]*>Thursday 12 November<\/p>.*>Green bin</s,
			);
			assert.match(html, /border: 2px solid var\(--soon\)/);
		});

		it("labels a later collection with a day count and does not highlight it", async (testContext) => {
			testContext.mock.method(globalThis, "fetch", async () =>
				Response.json({
					events: [
						{
							day: "2026-11-16",
							flags: [{ id: 1, subject: "Blue bin", sort_order: 1 }],
						},
					],
				}),
			);

			let response = await router.fetch(new Request("https://bins.test/"));
			let html = await response.text();

			assert.match(
				html,
				/Next collection<\/h2><p[^>]*>In 5 days<\/p><p[^>]*>Monday 16 November<\/p>.*>Blue bin</s,
			);
			assert.match(html, /border: 2px solid var\(--rule\)/);
			assert.doesNotMatch(html, /border: 2px solid var\(--soon\)/);
		});

		it("skips past events and shows the first future one as next", async (testContext) => {
			testContext.mock.method(globalThis, "fetch", async () =>
				Response.json({
					events: [
						{
							day: "2026-11-09",
							flags: [{ id: 1, subject: "Old bin", sort_order: 1 }],
						},
						{
							day: "2026-11-14",
							flags: [{ id: 2, subject: "Blue bin", sort_order: 1 }],
						},
					],
				}),
			);

			let response = await router.fetch(new Request("https://bins.test/"));
			let html = await response.text();

			assert.match(html, /Next collection<\/h2><p[^>]*>In 3 days<\/p>/);
			assert.doesNotMatch(html, /Old bin/);
		});

		it("shows the date with no bins for an event without flags", async (testContext) => {
			testContext.mock.method(globalThis, "fetch", async () =>
				Response.json({ events: [{ day: "2026-11-13" }] }),
			);

			let response = await router.fetch(new Request("https://bins.test/"));
			let html = await response.text();

			assert.match(
				html,
				/Next collection<\/h2><p[^>]*>In 2 days<\/p><p[^>]*>Friday 13 November<\/p><ul aria-label="Bins"[^>]*><\/ul>/,
			);
		});
	});

	describe("bins", () => {
		it("orders bins by sort_order", async (testContext) => {
			testContext.mock.method(globalThis, "fetch", async () =>
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

			let response = await router.fetch(new Request("https://bins.test/"));
			let html = await response.text();

			assert.match(html, />First<.*>Second<.*>Third</s);
		});

		it("uses backgroundColor, then color, then a default for the chip colour", async (testContext) => {
			testContext.mock.method(globalThis, "fetch", async () =>
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
								{
									id: 2,
									subject: "ColorOnly",
									sort_order: 2,
									color: "#cc0003",
								},
								{ id: 3, subject: "Neither", sort_order: 3 },
							],
						},
					],
				}),
			);

			let response = await router.fetch(new Request("https://bins.test/"));
			let html = await response.text();

			assert.match(html, /background: #aa0001;/);
			assert.doesNotMatch(html, /background: #bb0002;/);
			assert.match(html, /background: #cc0003;/);
			assert.match(html, /background: #333333;/);
		});

		it("merges separate events on the same day into one collection", async (testContext) => {
			// `nomerge=1` means the API returns one event per service on a day.
			testContext.mock.method(globalThis, "fetch", async () =>
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

			let response = await router.fetch(new Request("https://bins.test/"));
			let html = await response.text();

			assert.match(html, /Next collection.*>Black bin<.*>Food caddy</s);
			assert.doesNotMatch(html, /Coming up later/);
		});

		it("shows a bin once when it is reported twice on the same day", async (testContext) => {
			testContext.mock.method(globalThis, "fetch", async () =>
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

			let response = await router.fetch(new Request("https://bins.test/"));
			let html = await response.text();

			assert.match(html, />Black bin</);
			assert.doesNotMatch(html, />Black bin<.*>Black bin</s);
		});
	});

	describe("coming up later", () => {
		it("lists later collections in date order when the API returns them unsorted", async (testContext) => {
			testContext.mock.method(globalThis, "fetch", async () =>
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

			let response = await router.fetch(new Request("https://bins.test/"));
			let html = await response.text();

			assert.match(
				html,
				/Next collection.*>Bin A<.*Coming up later.*>In 7 days<.*>Wednesday 18 November<.*>Bin B<.*>In 14 days<.*>Wednesday 25 November<.*>Bin C</s,
			);
		});

		it("labels tomorrow as Tomorrow in the later list when today is next", async (testContext) => {
			testContext.mock.method(globalThis, "fetch", async () =>
				Response.json({
					events: [
						{
							day: "2026-11-11",
							flags: [{ id: 1, subject: "Bin A", sort_order: 1 }],
						},
						{
							day: "2026-11-12",
							flags: [{ id: 2, subject: "Bin B", sort_order: 1 }],
						},
					],
				}),
			);

			let response = await router.fetch(new Request("https://bins.test/"));
			let html = await response.text();

			assert.match(
				html,
				/Coming up later.*>Tomorrow<.*>Thursday 12 November<.*>Bin B</s,
			);
		});

		it("shows at most four later collections", async (testContext) => {
			testContext.mock.method(globalThis, "fetch", async () =>
				Response.json({
					events: [
						{
							day: "2026-11-18",
							flags: [{ id: 1, subject: "Week 1", sort_order: 1 }],
						},
						{
							day: "2026-11-25",
							flags: [{ id: 2, subject: "Week 2", sort_order: 1 }],
						},
						{
							day: "2026-12-02",
							flags: [{ id: 3, subject: "Week 3", sort_order: 1 }],
						},
						{
							day: "2026-12-09",
							flags: [{ id: 4, subject: "Week 4", sort_order: 1 }],
						},
						{
							day: "2026-12-16",
							flags: [{ id: 5, subject: "Week 5", sort_order: 1 }],
						},
						{
							day: "2026-12-23",
							flags: [{ id: 6, subject: "Week 6", sort_order: 1 }],
						},
					],
				}),
			);

			let response = await router.fetch(new Request("https://bins.test/"));
			let html = await response.text();

			assert.match(
				html,
				/Next collection.*>Week 1<.*Coming up later.*>Week 2<.*>Week 3<.*>Week 4<.*>Week 5</s,
			);
			assert.doesNotMatch(html, /Week 6/);
		});

		it("omits the section when there is only one collection", async (testContext) => {
			testContext.mock.method(globalThis, "fetch", async () =>
				Response.json({
					events: [
						{
							day: "2026-11-14",
							flags: [{ id: 1, subject: "Solo", sort_order: 1 }],
						},
					],
				}),
			);

			let response = await router.fetch(new Request("https://bins.test/"));
			let html = await response.text();

			assert.doesNotMatch(html, /Coming up later/);
		});
	});
});
