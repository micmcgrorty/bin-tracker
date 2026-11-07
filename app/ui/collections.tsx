import type { Handle } from "remix/component";
import { css } from "remix/component";

import type { Collection } from "../data/collection-schedule.ts";
import { BinChips } from "./bin-chips.tsx";

export function Collections(
	handle: Handle<{ next: Collection | null; later: Collection[] }>,
) {
	return () => {
		let { next, later } = handle.props;

		if (!next) {
			return <p mix={css({ margin: 0 })}>No upcoming collections found.</p>;
		}

		return (
			<>
				<section
					aria-labelledby="next-heading"
					mix={css({
						padding: "28px",
						borderRadius: "14px",
						background: "var(--surface)",
						border: next.soon
							? "2px solid var(--soon)"
							: "2px solid var(--rule)",
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
						{next.label}
					</p>
					<p
						mix={css({
							margin: "0 0 14px",
							color: "var(--muted)",
							fontSize: "18px",
						})}
					>
						{next.date}
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
											{collection.label}
										</span>
										<span
											mix={css({ fontSize: "15px", color: "var(--muted)" })}
										>
											{collection.date}
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
