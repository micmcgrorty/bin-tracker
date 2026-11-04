import { createRouter, type RouterContext } from "remix/router";
import { render } from "remix/middleware/render";
import { staticFiles } from "remix/middleware/static";

import controller from "./actions/controller.tsx";
import { routes } from "./routes.ts";

export const router = createRouter({
	middleware: [staticFiles("./public", { index: false }), render()],
});

export type AppContext = RouterContext<typeof router>;

declare module "remix" {
	interface RouterTypes {
		context: AppContext;
	}
}

router.map(routes, controller);
