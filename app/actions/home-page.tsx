import type { Handle } from "remix/component";
import { css } from "remix/component";

import type { CollectionSchedule } from "../data/collection-schedule.ts";
import { Collections } from "../ui/collections.tsx";
import { FONT_STACK } from "../ui/styles.ts";
import { theme } from "../ui/theme.ts";
import { Document } from "./document.tsx";

export function HomePage(handle: Handle<{ data: CollectionSchedule }>) {
	return () => {
		let { data } = handle.props;

		return (
			<Document title="Bin Day" head={<HomeHead />}>
				<main
					mix={css({
						"& *, & *::before, & *::after": { boxSizing: "border-box" },
						margin: 0,
						padding: "64px 20px",
						minHeight: "100vh",
						background: theme.bg,
						color: theme.text,
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
							<Collections next={data.next} later={data.later} />
						) : (
							<p
								role="alert"
								mix={css({
									margin: 0,
									padding: "16px 20px",
									border: `2px solid ${theme.alert}`,
									borderRadius: "10px",
									background: theme.surface,
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
		</>
	);
}
