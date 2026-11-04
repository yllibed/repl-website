/**
 * Rows of a data source drawn as cells, shared by the paging diagrams so each kind keeps one look and one
 * meaning across the site. `CellRow.astro` draws a row; `CellLegend.astro` explains the kinds a diagram uses.
 */
import { textWidth } from './metrics';

export type CellKind = 'kept' | 'read' | 'probe' | 'none';
export type LegendKind = Exclude<CellKind, 'none'>;

export const cell = { size: 24, gap: 6 } as const;

/** The distance from one cell's left edge to the next. */
export const cellPitch = cell.size + cell.gap;

/** The width of a row of `count` cells, from the first cell's left edge to the last cell's right edge. */
export const rowWidth = (count: number): number => count * cellPitch - cell.gap;

/** What each kind means, worded for the legend, in legend order. 'none' is a gap and has no entry. */
export const cellMeaning: Record<LegendKind, string> = {
	kept: 'returned on this page',
	read: 'read, then not returned',
	probe: 'read to detect a next page',
};

/** The kinds that appear in the given rows, in legend order. */
export const legendKinds = (rows: readonly (readonly CellKind[])[]): LegendKind[] =>
	(Object.keys(cellMeaning) as LegendKind[]).filter((kind) => rows.some((row) => row.includes(kind)));

/** Spacing of a legend entry: cell, gap, label, gap to the next entry. A legend is one cell high plus `below`. */
export const legendSpacing = { label: 8, entry: 28, below: 10 } as const;

/** The vertical room a legend line takes. */
export const legendHeight = cell.size + legendSpacing.below;

/** The left edge of each legend entry, relative to the legend's start, and the width of the whole line. */
export const legendLayout = (kinds: readonly LegendKind[]): { offsets: number[]; width: number } => {
	const offsets: number[] = [];
	let x = 0;
	for (const kind of kinds) {
		offsets.push(x);
		x += cell.size + legendSpacing.label + textWidth(cellMeaning[kind], 'note') + legendSpacing.entry;
	}
	return { offsets, width: Math.max(0, x - legendSpacing.entry) };
};

/** Vertical rhythm of a lane in the comparison diagrams: title above the row, note below it. */
export const lane = { title: 30, height: 96, note: 46 } as const;

/** Builds a row from runs, such as `[['read', 5], ['kept', 5], ['probe', 1]]`. */
export const cellRun = (runs: readonly [CellKind, number][]): CellKind[] =>
	runs.flatMap(([kind, count]) => Array<CellKind>(count).fill(kind));
