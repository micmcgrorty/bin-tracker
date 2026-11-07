import type { Handle } from "remix/component";
import { css } from "remix/component";

import type { CollectionSchedule } from "../data/collection-schedule.ts";
import { Collections } from "../ui/collections.tsx";
import { Document } from "./document.tsx";

const FONT_STACK =
	"'Bricolage Grotesque', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";

export function HomePage(handle: Handle<{ data: CollectionSchedule }>) {
	return () => {
		let { data } = handle.props;

		return (
			<Document title="Bin Day" head={<HomeHead />}>
				<main
					mix={css({
						"--bg": "#f5f7fa",
						"--surface": "#ffffff",
						"--text": "#101826",
						"--muted": "#46526a",
						"--accent": "#005eb8",
						"--rule": "#cbd5e3",
						"--soon": "#218410",
						"@media (prefers-color-scheme: dark)": {
							"--bg": "#0e1522",
							"--surface": "#17223a",
							"--text": "#e8eef7",
							"--muted": "#a9b6c9",
							"--accent": "#5ba3ff",
							"--rule": "#2a3750",
							"--soon": "#4ade80",
						},
						"& *, & *::before, & *::after": { boxSizing: "border-box" },
						margin: 0,
						padding: "64px 20px",
						minHeight: "100vh",
						background: "var(--bg)",
						color: "var(--text)",
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
									border: "2px solid #b42318",
									borderRadius: "10px",
									background: "var(--surface)",
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
			<link rel="preconnect" href="https://fonts.googleapis.com" />
			<link
				rel="preconnect"
				href="https://fonts.gstatic.com"
				crossOrigin="anonymous"
			/>
			<link
				rel="stylesheet"
				href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap"
			/>
		</>
	);
}
