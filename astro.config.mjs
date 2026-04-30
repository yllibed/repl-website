// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	site: 'https://repl.yllibed.org',
	integrations: [
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
						{ label: 'Terminal Integration', slug: 'reference/terminal-integration' },
						{ label: 'Architecture', slug: 'reference/architecture' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'API Reference', link: '/api/index.html' },
						{ label: 'Configuration', slug: 'reference/configuration' },
						{ label: 'Packages', slug: 'reference/packages' },
						{ label: 'Best Practices & FAQ', slug: 'reference/best-practices' },
					],
				},
			],
			customCss: ['./src/styles/custom.css'],
			head: [
				{
					tag: 'meta',
					attrs: { property: 'og:image', content: '/og-image.png' },
				},
			],
		}),
	],
});
