import { createController } from "remix/router";

import { loadCollectionSchedule } from "../data/collection-schedule.ts";
import { routes } from "../routes.ts";
import { HomePage } from "./home-page.tsx";

export type AppDependencies = {
	fetch: typeof globalThis.fetch;
	now: () => Date;
};

export function createRootController({ fetch, now }: AppDependencies) {
	return createController(routes, {
		actions: {
			async home(context) {
				let data = await loadCollectionSchedule({ fetch, now: now() });
				return context.render(<HomePage data={data} />);
			},
		},
	});
}
