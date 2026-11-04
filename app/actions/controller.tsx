import { createController } from "remix/router";

import { routes } from "../routes.ts";
import { HomePage, loadBins } from "./home-page.tsx";

export default createController(routes, {
	actions: {
		async home(context) {
			let data = await loadBins();
			return context.render(<HomePage data={data} />);
		},
	},
});
