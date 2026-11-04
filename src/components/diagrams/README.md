# Diagrams

Diagrams are inline SVG in Astro components, drawn with one visual vocabulary taken from the site's
overalls motif. Colours come from the `--rt-*` variables in `src/styles/custom.css`, so every diagram
follows the light and dark themes without a second file.

## Adding a diagram

1. Create `src/components/diagrams/MyDiagram.astro`.
2. Put the drawing inside `<Figure viewWidth={...} viewHeight={...} label="..." caption="...">` from
   `../Figure.astro`, which renders the `<svg>`. The caption states what the diagram shows, not how
   it is drawn.
3. Use only the `rt-*` classes below; do not add `<style>` blocks or literal colours.
4. Use `Pocket.astro` for a pocket, and compute the `viewBox` from the data when the diagram repeats
   an element, as `Layering.astro` does, so adding an item cannot clip the drawing.
5. Import the component in the MDX page, next to the text it illustrates.

## Vocabulary

| Element | Means | Class |
|---|---|---|
| Cloth | A layer, a container, a group of packages | `rt-cloth`, `rx` 2 |
| Pocket | A component the reader plugs in: a surface, a channel, a transport | `Pocket.astro` (`rt-pocket` plus an `rt-stitch` inset of 5) |
| Stitch | Decoration inside a shape, such as a pocket's inner outline | `rt-stitch` |
| Thread | Flow: dispatch, data, a request travelling | `rt-thread` |
| Rule | Static structure: tree branches, "contains", "depends on" | `rt-rule` |
| Node | A point in the command graph, or where flows meet | `rt-node`, r 4 |
| Step | A position in a real sequence, never decoration | `rt-step`, r 11, number in `rt-stepn` |
| Leader | A thin line from an annotation to what it describes | `rt-lead` |

Text uses `rt-tag` for box titles, `rt-code` for routes, types and commands, and `rt-note` for
annotations outside the drawing.

- Thread is the only dashed line between shapes. A dashed line inside a shape is a stitch.
- Flow reads top to bottom, or left to right for a sequence. Arrowheads are not used.
- Draw at the size the diagram is meant to show, about 550 to 950 units wide, and leave at least 8
  units between a label and any stroke.
- Keep text at 11.5 units or more. `Figure` lets a diagram shrink to 85 % of its natural width, then
  scrolls horizontally, so text stays near 10 px or larger on a phone.

## Accessibility

`Figure` gives the `<svg>` `role="img"`. Its `label` describes the structure in one or two sentences:
what connects to what. Build it from the same data as the drawing when the diagram repeats an
element, as `Layering.astro` does. Keep text as real `<text>` elements so it stays searchable.

## When not to draw

A table or a list is better when there is no topology to show: a list of packages, a list of options,
or a long sequence such as the pipeline stages in `reference/pipelining.mdx`. Draw only when position
or connection carries information; a short sequence of a few numbered steps, as in
`ExecutionStages.astro`, is the limit.
