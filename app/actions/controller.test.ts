import * as assert from "remix/assert";
import { describe, it } from "remix/test";

import { createAppRouter } from "../router.ts";

describe("home page", () => {
	it("shows an error when the collection service can't be reached", async (testContext) => {
		testContext.mock.method(console, "error", () => {});
		let router = createAppRouter({
			fetch: async () => {
				throw new TypeError("fetch failed");
			},
			now: () => new Date("2026-11-11T09:00:00Z"),
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

	it("shows an empty message when there are no upcoming collections", async () => {
		let router = createAppRouter({
			fetch: async () => Response.json({ events: [] }),
			now: () => new Date("2026-11-11T09:00:00Z"),
		});

		let response = await router.fetch(new Request("https://bins.test/"));
		let html = await response.text();

		assert.match(html, /No upcoming collections found\./);
		assert.doesNotMatch(html, /role="alert"/);
		assert.doesNotMatch(html, /Next collection/);
	});

	it("highlights a collection today as the next collection", async () => {
		let router = createAppRouter({
			fetch: async () =>
				Response.json({
					events: [
						{
							day: "2026-11-11",
							flags: [
								{
									id: 1,
									subject: "Black bin",
									sort_order: 1,
									backgroundColor: "#111111",
								},
							],
						},
					],
				}),
			now: () => new Date("2026-11-11T09:00:00Z"),
		});

		let response = await router.fetch(new Request("https://bins.test/"));
		let html = await response.text();

		assert.match(
			html,
			/Next collection<\/h2><p[^>]*>Today<\/p><p[^>]*>Wednesday 11 November<\/p>.*>Black bin</s,
		);
		assert.match(html, /border: 2px solid var\(--soon\)/);
		assert.match(html, /background: #111111;/);
		assert.doesNotMatch(html, /Coming up later/);
	});

	it("does not highlight a next collection several days away", async () => {
		let router = createAppRouter({
			fetch: async () =>
				Response.json({
					events: [
						{
							day: "2026-11-16",
							flags: [{ id: 1, subject: "Blue bin", sort_order: 1 }],
						},
					],
				}),
			now: () => new Date("2026-11-11T09:00:00Z"),
		});

		let response = await router.fetch(new Request("https://bins.test/"));
		let html = await response.text();

		assert.match(
			html,
			/Next collection<\/h2><p[^>]*>In 5 days<\/p><p[^>]*>Monday 16 November<\/p>.*>Blue bin</s,
		);
		assert.match(html, /border: 2px solid var\(--rule\)/);
		assert.doesNotMatch(html, /border: 2px solid var\(--soon\)/);
	});

	it("lists up to four later collections after the next one", async () => {
		let router = createAppRouter({
			fetch: async () =>
				Response.json({
					events: [
						{
							day: "2026-11-12",
							flags: [{ id: 1, subject: "Week 1", sort_order: 1 }],
						},
						{
							day: "2026-11-18",
							flags: [{ id: 2, subject: "Week 2", sort_order: 1 }],
						},
						{
							day: "2026-11-25",
							flags: [{ id: 3, subject: "Week 3", sort_order: 1 }],
						},
						{
							day: "2026-12-02",
							flags: [{ id: 4, subject: "Week 4", sort_order: 1 }],
						},
						{
							day: "2026-12-09",
							flags: [{ id: 5, subject: "Week 5", sort_order: 1 }],
						},
						{
							day: "2026-12-16",
							flags: [{ id: 6, subject: "Week 6", sort_order: 1 }],
						},
					],
				}),
			now: () => new Date("2026-11-11T09:00:00Z"),
		});

		let response = await router.fetch(new Request("https://bins.test/"));
		let html = await response.text();

		assert.match(
			html,
			/Next collection.*>Tomorrow<.*>Week 1<.*Coming up later.*>In 7 days<.*>Wednesday 18 November<.*>Week 2<.*>Week 3<.*>Week 4<.*>Week 5</s,
		);
		assert.doesNotMatch(html, /Week 6/);
	});
});
