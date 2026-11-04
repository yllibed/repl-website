/**
 * Text measurement for the diagrams. Diagram text is set in JetBrains Mono, whose glyphs all advance 0.6 em,
 * so a label's width is its length times 0.6 times its font size. The sizes mirror the `.rt-tag`, `.rt-code`
 * and `.rt-note` rules in src/styles/custom.css; change both together.
 */
const fontSize = { tag: 14, code: 12.5, note: 11.5 } as const;

export type TextKind = keyof typeof fontSize;

/** The width of `text` in viewBox units when drawn with the given rt-* text class. */
export const textWidth = (text: string, kind: TextKind): number => text.length * fontSize[kind] * 0.6;
