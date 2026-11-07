import type { Handle } from "remix/component";
import { css } from "remix/component";

import type { Bin } from "../data/collection-schedule.ts";

export function BinChips(handle: Handle<{ bins: Bin[]; large?: boolean }>) {
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
