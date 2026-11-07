const TOKENS = {
	bg: "--bg",
	surface: "--surface",
	text: "--text",
	muted: "--muted",
	rule: "--rule",
	soon: "--soon",
	alert: "--alert",
} as const;

export type Token = keyof typeof TOKENS;

/** A value for every theme token. */
export type Palette = Record<Token, string>;

export const LIGHT: Palette = {
	bg: "#f5f7fa",
	surface: "#ffffff",
	text: "#101826",
	muted: "#46526a",
	rule: "#cbd5e3",
	soon: "#218410",
	alert: "#b42318",
};

export const DARK: Palette = {
	bg: "#0e1522",
	surface: "#17223a",
	text: "#e8eef7",
	muted: "#a9b6c9",
	rule: "#2a3750",
	soon: "#4ade80",
	alert: "#b42318",
};

/** References to the theme tokens, for use in styles: `theme.muted`. */
export const theme = Object.fromEntries(
	Object.entries(TOKENS).map(([token, property]) => [
		token,
		`var(${property})`,
	]),
) as Record<Token, string>;

/** A palette as a `:root` rule that sets every token's custom property. */
export function paletteRule(palette: Palette): string {
	let declarations = Object.entries(palette)
		.map(([token, value]) => `\t${TOKENS[token as Token]}: ${value};`)
		.join("\n");

	return `:root {\n${declarations}\n}`;
}
