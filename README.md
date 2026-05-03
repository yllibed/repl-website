# Repl Toolkit — Documentation Site

Source for the [Repl Toolkit documentation](https://repl.yllibed.org), built with [Astro Starlight](https://starlight.astro.build).

## Structure

```
src/content/docs/
├── getting-started/   # Installation, first app, CLI/REPL/MCP modes, migration guide
├── cookbook/          # Task-focused guides (core basics, modules, prompts, testing, …)
├── reference/         # API-level reference (routes, DI, modules, MCP, data types, …)
└── api/               # Generated API reference MDX, ignored by git
```

The API reference under `/api/` is generated at build time. DocFX extracts managed-reference YAML from the Repl source, then `scripts/generate-api-mdx.mjs` converts it into Starlight content.

## Local development

```bash
npm install
npm run docs:api   # regenerate API reference MDX
npm run dev        # regenerate API reference and start http://localhost:4321
npm run build      # regenerate API reference and build ./dist/
npm run preview    # preview the production build locally
```

## Deployment

Pushes to `main` trigger the GitHub Actions workflow (`.github/workflows/deploy.yml`), which:

1. Resolves the latest Repl release tag.
2. Checks out the Repl source at that tag.
3. Generates Starlight API reference content with DocFX metadata.
4. Builds the Astro site.
5. Deploys to GitHub Pages.

A daily scheduled run keeps the API reference in sync with new releases even without a doc change.
