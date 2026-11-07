import type { Handle, RemixNode } from "remix/component";
import { css } from "remix/component";

import { DARK, LIGHT, paletteRule } from "../ui/theme.ts";

/** The theme palettes, light by default and dark when the system asks. */
const THEME_STYLES = `${paletteRule(LIGHT)}
@media (prefers-color-scheme: dark) {
${paletteRule(DARK)}
}`;

export interface DocumentProps {
	children?: RemixNode;
	head?: RemixNode;
	title?: string;
}

export function Document(handle: Handle<DocumentProps>) {
	return () => {
		let { children, head, title } = handle.props;

		return (
			<html lang="en">
				<head>
					<meta charSet="utf-8" />
					<meta name="viewport" content="width=device-width, initial-scale=1" />
					<meta name="color-scheme" content="light dark" />
					<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
					<title>{title}</title>
					<style>{THEME_STYLES}</style>
					{head}
				</head>
				<body mix={css({ margin: 0 })}>{children}</body>
			</html>
		);
	};
}
