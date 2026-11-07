import type { Handle, RemixNode } from "remix/component";
import { css } from "remix/component";

import { FONT_FACES } from "../ui/styles.ts";
import { DARK, LIGHT, paletteRule } from "../ui/theme.ts";

/** Site-wide rules: the font faces, then the theme palettes (light by default, dark when the system asks). */
const SITE_STYLES = `${FONT_FACES}
${paletteRule(LIGHT)}
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
					<link
						rel="preload"
						href="/fonts/bricolage-grotesque-latin.woff2"
						as="font"
						type="font/woff2"
						crossOrigin="anonymous"
					/>
					<style>{SITE_STYLES}</style>
					{head}
				</head>
				<body mix={css({ margin: 0 })}>{children}</body>
			</html>
		);
	};
}
