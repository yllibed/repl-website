// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';

const gaId = process.env.GOOGLE_ANALYTICS_ID;

// https://astro.build/config
export default defineConfig({
	site: 'https://repl.yllibed.org',
	integrations: [
		sitemap(),
		starlight({
			title: 'Repl Toolkit',
			description: 'A .NET framework for building composable command surfaces — CLI, REPL, remote sessions, and MCP tools from one command graph.',
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/yllibed/repl' },
			],
			sidebar: [
				{
					label: 'Getting Started',
					items: [
						{ label: 'Installation', slug: 'getting-started/installation' },
						{ label: 'Your First App', slug: 'getting-started/first-app' },
						{ label: 'Coming from CLI Frameworks', slug: 'getting-started/migrating' },
						{ label: 'CLI Mode', slug: 'getting-started/cli-mode' },
						{ label: 'REPL Mode', slug: 'getting-started/repl-mode' },
						{ label: 'MCP Mode', slug: 'getting-started/mcp-mode' },
					],
				},
				{
					label: 'Cookbook',
					items: [
						{ label: 'Core Basics', slug: 'cookbook/core-basics' },
						{ label: 'Scoped Contexts', slug: 'cookbook/scoped-contexts' },
						{ label: 'Modular Ops', slug: 'cookbook/modular-ops' },
						{ label: 'Interactive Prompts', slug: 'cookbook/interactive-prompts' },
						{ label: 'Hosting Remote Sessions', slug: 'cookbook/hosting-remote' },
						{ label: 'Testing', slug: 'cookbook/testing' },
						{ label: 'Spectre.Console', slug: 'cookbook/spectre' },
						{ label: 'MCP Server', slug: 'cookbook/mcp-server' },
					],
				},
				{
					label: 'Concepts',
					items: [
						{ label: 'Routes & Parameters', slug: 'reference/routes-and-parameters' },
						{ label: 'Modules', slug: 'reference/modules' },
						{ label: 'Dependency Injection', slug: 'reference/dependency-injection' },
						{ label: 'Interactivity', slug: 'reference/interactivity' },
						{ label: 'MCP Server', slug: 'reference/mcp-concepts' },
						{ label: 'MCP — Advanced', slug: 'reference/mcp-advanced' },
						{ label: 'Customization & Output', slug: 'reference/customization' },
						{ label: 'Pipelines & Integration', slug: 'reference/pipelining' },
						{ label: 'Terminal Integration', slug: 'reference/terminal-integration' },
						{ label: 'Architecture', slug: 'reference/architecture' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'Glossary', slug: 'reference/glossary' },
						{ label: 'Agent-Native Development', slug: 'reference/agent-native' },
						{ label: 'Packaging & Distribution', slug: 'reference/packaging' },
						{ label: 'Built-in Types & Formats', slug: 'reference/data-types' },
						{ label: 'Best Practices & FAQ', slug: 'reference/best-practices' },
						{ label: 'Configuration', slug: 'reference/configuration' },
						{ label: 'Packages', slug: 'reference/packages' },
						{ label: 'API Reference', link: '/api/index.html' },
					],
				},
			],
			customCss: ['./src/styles/custom.css'],
			head: [
				{ tag: 'meta', attrs: { property: 'og:image', content: '/og-image.png' } },
				{ tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
				{ tag: 'meta', attrs: { property: 'og:locale', content: 'en_US' } },
				{ tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
				{ tag: 'meta', attrs: { name: 'twitter:image', content: '/og-image.png' } },
				...(gaId ? [
					{
						tag: 'script',
						attrs: { async: true, src: `https://www.googletagmanager.com/gtag/js?id=${gaId}` },
					},
					{
						tag: 'script',
						content: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`,
					},
				] : []),
			],
		}),
	],
});
