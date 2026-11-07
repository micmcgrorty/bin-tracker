import { render } from "remix/middleware/render";
import { staticFiles } from "remix/middleware/static";
import { createRouter, type RouterContext } from "remix/router";

import {
	type AppDependencies,
	createRootController,
} from "./actions/controller.tsx";
import { routes } from "./routes.ts";

function createBaseRouter() {
	return createRouter({
		middleware: [staticFiles("./public", { index: false }), render()],
	});
}

export function createAppRouter(dependencies: AppDependencies) {
	let router = createBaseRouter();
	router.map(routes, createRootController(dependencies));
	return router;
}

export const router = createAppRouter({
	fetch: (input, init) => globalThis.fetch(input, init),
	now: () => new Date(),
});

export type AppContext = RouterContext<ReturnType<typeof createBaseRouter>>;

declare module "remix" {
	interface RouterTypes {
		context: AppContext;
	}
}
