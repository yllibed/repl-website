#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const docfxApiDir = path.join(rootDir, 'docfx', 'api');
const docfxIndexPath = path.join(rootDir, 'docfx', 'index.md');
const outputDir = path.join(rootDir, 'src', 'content', 'docs', 'api');
const apiReferenceIndexPath = path.join(rootDir, 'src', 'generated', 'api-reference.json');

const pageTypes = new Set(['Namespace', 'Class', 'Struct', 'Interface', 'Enum', 'Delegate']);
const memberTypeGroups = [
	['Constructor', 'Constructors'],
	['Method', 'Methods'],
	['Property', 'Properties'],
	['Field', 'Fields'],
	['Event', 'Events'],
	['Operator', 'Operators'],
];

const documents = [];
const itemsByUid = new Map();
const referencesByUid = new Map();
const pageByUid = new Map();
const routeByUid = new Map();
const nameByUid = new Map();
const childrenOrderByParentUid = new Map();

if (!existsSync(docfxApiDir)) {
	console.error(`DocFX metadata directory not found: ${docfxApiDir}`);
	process.exit(1);
}

await loadDocuments();
const tocOrder = await loadTocOrder();
buildIndexes();
await writeGeneratedFiles(tocOrder);

async function loadDocuments() {
	const entries = await readdir(docfxApiDir);
	for (const entry of entries.filter((name) => name.endsWith('.yml')).sort()) {
		const fullPath = path.join(docfxApiDir, entry);
		const text = await readFile(fullPath, 'utf8');
		const data = yaml.load(text);
		if (!data?.items?.length) continue;
		documents.push({ fileName: entry, data });
	}
}

async function loadTocOrder() {
	const tocPath = path.join(docfxApiDir, 'toc.yml');
	if (!existsSync(tocPath)) return new Map();

	const data = yaml.load(await readFile(tocPath, 'utf8'));
	const order = new Map();
	let index = 1;

	function visit(items) {
		for (const item of items ?? []) {
			if (item.uid && !order.has(item.uid)) order.set(item.uid, index++);
			visit(item.items);
		}
	}

	visit(data?.items);
	return order;
}

function buildIndexes() {
	for (const document of documents) {
		for (const item of document.data.items ?? []) {
			itemsByUid.set(item.uid, item);
			nameByUid.set(item.uid, item.name ?? item.fullName ?? item.uid);
		}
		for (const reference of document.data.references ?? []) {
			referencesByUid.set(reference.uid, reference);
			nameByUid.set(reference.uid, reference.name ?? reference.fullName ?? reference.uid);
		}

		const page = (document.data.items ?? []).find((item) => pageTypes.has(item.type));
		if (page) {
			pageByUid.set(page.uid, { item: page, document });
			routeByUid.set(page.uid, routeIdForPage(page));
		}
	}

	for (const { item, document } of pageByUid.values()) {
		const orderedChildren = new Map();
		for (const [index, uid] of (item.children ?? []).entries()) orderedChildren.set(uid, index + 1);
		childrenOrderByParentUid.set(item.uid, orderedChildren);

		for (const member of document.data.items ?? []) {
			if (member.uid === item.uid || member.parent !== item.uid) continue;
			routeByUid.set(member.uid, `${routeByUid.get(item.uid)}#${anchorForUid(member.uid)}`);
			if (member.overload) {
				routeByUid.set(member.overload, `${routeByUid.get(item.uid)}#${anchorForUid(member.uid)}`);
			}
		}
	}
}

async function writeGeneratedFiles(tocOrder) {
	assertSafeOutputDir();
	await rm(outputDir, { recursive: true, force: true });
	await mkdir(outputDir, { recursive: true });

	const pages = [...pageByUid.values()].sort((a, b) => {
		const aOrder = pageOrder(a.item, tocOrder);
		const bOrder = pageOrder(b.item, tocOrder);
		return aOrder - bOrder || a.item.uid.localeCompare(b.item.uid);
	});

	await writeFile(path.join(outputDir, 'index.mdx'), await renderIndexPage(pages), 'utf8');

	for (const page of pages) {
		const filePath = path.join(outputDir, `${fileSlug(page.item.uid)}.mdx`);
		await writeFile(filePath, renderReferencePage(page.item, page.document, tocOrder), 'utf8');
	}

	await writeApiReferenceIndex();

	console.log(
		`Generated ${pages.length + 1} API reference pages in ${path.relative(rootDir, outputDir)} and ${path.relative(rootDir, apiReferenceIndexPath)}.`
	);
}

function assertSafeOutputDir() {
	const resolvedOutput = path.resolve(outputDir);
	const expectedParent = path.resolve(rootDir, 'src', 'content', 'docs');
	if (!resolvedOutput.startsWith(expectedParent + path.sep) || path.basename(resolvedOutput) !== 'api') {
		throw new Error(`Refusing to remove unexpected output directory: ${resolvedOutput}`);
	}
}

async function renderIndexPage(pages) {
	const namespaces = pages
		.map(({ item }) => item)
		.filter((item) => item.type === 'Namespace')
		.sort((a, b) => a.uid.localeCompare(b.uid));
	const intro = await readDocfxIntro();
	const lines = [
		frontmatter({
			title: 'API Reference',
			description: 'Generated API reference for the Repl Toolkit packages.',
			editUrl: false,
			sidebar: { label: 'Overview', order: 0 },
		}),
		intro,
		'## Namespaces',
		'',
		...namespaces.map((item) => listItemForUid(item.uid, item.type, item.summary)),
		'',
	];

	return lines.join('\n');
}

async function readDocfxIntro() {
	if (!existsSync(docfxIndexPath)) {
		return 'Generated API reference for the Repl Toolkit packages.\n';
	}

	const text = await readFile(docfxIndexPath, 'utf8');
	return text
		.replace(/^---[\s\S]*?---\s*/, '')
		.replace(/^#\s+.+\n+/, '')
		.trim()
		.concat('\n');
}

function renderReferencePage(item, document, tocOrder) {
	const isNamespace = item.type === 'Namespace';
	const lines = [
		frontmatter({
			title: item.name ?? item.uid,
			description: plainText(item.summary) || `${item.type} ${item.fullName ?? item.uid}.`,
			editUrl: false,
			slug: routeByUid.get(item.uid),
			sidebar: {
				label: item.name ?? item.uid,
				order: pageOrder(item, tocOrder),
				hidden: !isNamespace,
			},
		}),
	];

	const summary = renderInline(item.summary);
	if (summary) lines.push(summary, '');

	lines.push(renderApiMetadata(item));

	if (item.syntax?.content) {
		lines.push('## Signature', '', codeBlock('csharp', item.syntax.content), '');
		lines.push(...renderTypeParameters(item.syntax.typeParameters));
		lines.push(...renderParameters(item.syntax.parameters));
		lines.push(...renderReturn(item.syntax.return));
	}

	if (isNamespace) {
		lines.push(...renderNamespaceChildren(item));
	} else {
		lines.push(...renderTypeRelationships(item));
		lines.push(...renderMembers(item, document));
	}

	return lines.filter((line, index, all) => !(line === '' && all[index - 1] === '')).join('\n').trimEnd() + '\n';
}

function renderApiMetadata(item) {
	const lines = ['## API', ''];
	lines.push(`- Kind: ${codeSpan(item.type)}`);
	if (item.namespace) lines.push(`- Namespace: ${renderUidReference(item.namespace)}`);
	if (item.assemblies?.length) {
		lines.push(`- Assembly: ${item.assemblies.map(codeSpan).join(', ')}`);
	}
	if (item.source?.remote?.repo && item.source?.remote?.path) {
		const source = item.source.remote;
		const line = item.source.startLine ? `#L${item.source.startLine}` : '';
		lines.push(`- Source: [${escapeMdxPlain(source.path)}](${source.repo.replace(/\.git$/, '')}/blob/${source.branch ?? 'main'}/${source.path}${line})`);
	}
	lines.push('');
	return lines.join('\n');
}

function renderNamespaceChildren(item) {
	const childItems = (item.children ?? [])
		.map((uid) => itemsByUid.get(uid))
		.filter((child) => child && pageTypes.has(child.type) && child.type !== 'Namespace')
		.sort((a, b) => childOrder(item.uid, a.uid) - childOrder(item.uid, b.uid) || a.name.localeCompare(b.name));

	if (!childItems.length) return [];

	return [
		'## Types',
		'',
		...childItems.map((child) => listItemForUid(child.uid, child.type, child.summary)),
		'',
	];
}

function renderTypeRelationships(item) {
	const sections = [];
	sections.push(...renderUidList('Inheritance', item.inheritance));
	sections.push(...renderUidList('Implements', item.implements));
	sections.push(...renderUidList('Derived Classes', item.derivedClasses));
	sections.push(...renderUidList('Extension Methods', item.extensionMethods));
	return sections;
}

function renderUidList(title, uids) {
	if (!uids?.length) return [];
	return [hasAnySectionPrefix(title), '', ...uids.map((uid) => `- ${renderUidReference(uid)}`), ''];
}

function hasAnySectionPrefix(title) {
	return `## ${title}`;
}

function renderMembers(page, document) {
	const members = (document.data.items ?? []).filter((item) => item.parent === page.uid && item.uid !== page.uid);
	if (!members.length) return [];

	const lines = [];
	for (const [type, title] of memberTypeGroups) {
		const group = members
			.filter((member) => member.type === type)
			.sort((a, b) => childOrder(page.uid, a.uid) - childOrder(page.uid, b.uid) || a.name.localeCompare(b.name));
		if (!group.length) continue;

		lines.push(`## ${title}`, '');
		for (const member of group) lines.push(...renderMember(member));
	}

	return lines;
}

function renderMember(member) {
	const lines = [`<a id="${anchorForUid(member.uid)}"></a>`, '', `### ${codeSpan(member.name ?? member.id)}`, ''];
	const summary = renderInline(member.summary);
	if (summary) lines.push(summary, '');

	if (member.syntax?.content) {
		lines.push(codeBlock('csharp', member.syntax.content), '');
	}

	lines.push(...renderTypeParameters(member.syntax?.typeParameters));
	lines.push(...renderParameters(member.syntax?.parameters));
	lines.push(...renderReturn(member.syntax?.return));

	return lines;
}

function renderTypeParameters(typeParameters) {
	if (!typeParameters?.length) return [];
	return [
		'#### Type Parameters',
		'',
		...typeParameters.map((parameter) => {
			const description = renderInline(parameter.description);
			return `- ${codeSpan(parameter.id)}${description ? `: ${description}` : ''}`;
		}),
		'',
	];
}

function renderParameters(parameters) {
	if (!parameters?.length) return [];
	return [
		'#### Parameters',
		'',
		...parameters.map((parameter) => {
			const type = parameter.type ? ` (${renderUidReference(parameter.type)})` : '';
			const description = renderInline(parameter.description);
			return `- ${codeSpan(parameter.id)}${type}${description ? `: ${description}` : ''}`;
		}),
		'',
	];
}

function renderReturn(returnValue) {
	if (!returnValue) return [];
	const type = returnValue.type ? ` ${renderUidReference(returnValue.type)}` : '';
	const description = renderInline(returnValue.description);
	return ['#### Returns', '', `${type}${description ? ` - ${description}` : ''}`.trim(), ''];
}

async function writeApiReferenceIndex() {
	const entries = [...routeByUid.entries()]
		.map(([uid, route]) => {
			const item = itemsByUid.get(uid);
			if (!item) return null;
			return {
				uid,
				name: item.name ?? friendlyNameFromUid(uid),
				fullName: item.fullName ?? uid,
				kind: item.type,
				href: routeToUrl(route),
			};
		})
		.filter(Boolean)
		.sort((a, b) => a.uid.localeCompare(b.uid));

	await mkdir(path.dirname(apiReferenceIndexPath), { recursive: true });
	await writeFile(apiReferenceIndexPath, `${JSON.stringify(entries, null, '\t')}\n`, 'utf8');
}

function listItemForUid(uid, kind, summary) {
	const description = renderInline(summary);
	return `- ${renderUidReference(uid)} ${codeSpan(kind)}${description ? ` - ${description}` : ''}`;
}

function renderUidReference(uid) {
	if (!uid) return '';

	const normalized = normalizeXref(uid);
	const route = routeByUid.get(normalized);
	const reference = referencesByUid.get(normalized);
	const label = nameByUid.get(normalized) ?? friendlyNameFromUid(normalized);

	if (route) return markdownLink(label, routeToUrl(route));
	if (reference?.isExternal && reference.href) return markdownLink(label, reference.href);
	return codeSpan(label);
}

function renderInline(value) {
	if (value === undefined || value === null) return '';
	let text = decodeHtml(String(value).replace(/\r\n/g, '\n')).trim();
	if (!text) return '';

	text = text
		.replace(/<xref\s+href="([^"]+)"[^>]*>(.*?)<\/xref>/gi, (_, href, inner) =>
			renderXref(href, inner)
		)
		.replace(/<xref\s+href="([^"]+)"[^>]*\/>/gi, (_, href) => renderXref(href, ''))
		.replace(/<see\s+cref="([^"]+)"[^>]*>(.*?)<\/see>/gi, (_, href, inner) =>
			renderXref(href, inner)
		)
		.replace(/<see\s+cref="([^"]+)"[^>]*\/>/gi, (_, href) => renderXref(href, ''))
		.replace(/<paramref\s+name="([^"]+)"\s*\/>/gi, (_, name) => codeSpan(name))
		.replace(/<typeparamref\s+name="([^"]+)"\s*\/>/gi, (_, name) => codeSpan(name))
		.replace(/<see\s+langword="([^"]+)"\s*\/>/gi, (_, word) => codeSpan(word))
		.replace(/<(?:c|code)>([\s\S]*?)<\/(?:c|code)>/gi, (_, code) => codeSpan(decodeHtml(stripTags(code))))
		.replace(/<para>\s*/gi, '\n\n')
		.replace(/\s*<\/para>/gi, '\n\n')
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<[^>]+>/g, '');

	return escapeMdxSyntax(text)
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

function renderXref(href, inner) {
	const normalized = normalizeXref(href);
	const route = routeByUid.get(normalized);
	const reference = referencesByUid.get(normalized);
	const label = stripTags(inner).trim() || nameByUid.get(normalized) || friendlyNameFromUid(normalized);

	if (route) return markdownLink(label, routeToUrl(route));
	if (reference?.href) return markdownLink(label, reference.href);
	return codeSpan(label);
}

function normalizeXref(value) {
	let normalized = decodeURIComponent(String(value));
	normalized = normalized.replace(/^T:/, '').replace(/^M:/, '').replace(/^P:/, '').replace(/^F:/, '');
	normalized = normalized.replace(/\.html(?:#.*)?$/, '');
	return normalized;
}

function frontmatter(data) {
	return `---\n${yaml.dump(data, { lineWidth: 120, quotingType: '"', forceQuotes: true }).trimEnd()}\n---\n`;
}

function routeIdForPage(item) {
	if (item.type === 'Namespace') return `api/${uidToPath(item.uid)}`;
	return `api/${uidToPath(item.namespace || item.parent)}/${slugSegment(item.id ?? item.name ?? item.uid)}`;
}

function routeToUrl(route) {
	const [routePath, anchor] = route.split('#');
	const cleanRoute = routePath.replace(/\/index$/, '');
	return `/${cleanRoute}/${anchor ? `#${anchor}` : ''}`;
}

function uidToPath(uid) {
	return String(uid)
		.split('.')
		.filter(Boolean)
		.map(slugSegment)
		.join('/');
}

function slugSegment(value) {
	return String(value)
		.replace(/`(\d+)/g, '-$1')
		.replace(/<[^>]*>/g, '')
		.replace(/[^A-Za-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase();
}

function fileSlug(uid) {
	return slugSegment(uid.replace(/\./g, '-'));
}

function anchorForUid(uid) {
	return `m-${fileSlug(uid)}`;
}

function pageOrder(item, tocOrder) {
	if (item.type === 'Namespace') return tocOrder.get(item.uid) ?? 1000;
	return childOrder(item.parent, item.uid);
}

function childOrder(parentUid, uid) {
	return childrenOrderByParentUid.get(parentUid)?.get(uid) ?? 1000;
}

function plainText(value) {
	return decodeHtml(renderInline(value)
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/`([^`]+)`/g, '$1')
		.replace(/\\/g, '')
		.trim());
}

function friendlyNameFromUid(uid) {
	const withoutParameters = String(uid).split('(')[0];
	return withoutParameters.split('.').at(-1)?.replace(/`(\d+)/g, '<T>') ?? uid;
}

function markdownLink(label, href) {
	return `[${escapeLinkLabel(label)}](${href})`;
}

function codeSpan(value) {
	const text = String(value ?? '').replace(/\s+/g, ' ').trim();
	const ticks = text.includes('`') ? '``' : '`';
	return `${ticks}${text}${ticks}`;
}

function codeBlock(language, value) {
	return `\`\`\`${language}\n${String(value).trim()}\n\`\`\``;
}

function stripTags(value) {
	return String(value).replace(/<[^>]+>/g, '');
}

function decodeHtml(value) {
	return String(value)
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, '&');
}

function escapeLinkLabel(value) {
	return escapeMdxPlain(value).replace(/([\[\]])/g, '\\$1');
}

function escapeMdxSyntax(value) {
	return String(value)
		.split(/(`[^`]*`|\[[^\]]+\]\([^)]+\))/g)
		.map((part) => {
			if (!part || part.startsWith('`') || part.startsWith('[')) return part;
			return escapeMdxPlain(part);
		})
		.join('');
}

function escapeMdxPlain(value) {
	return String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/{/g, '\\{').replace(/}/g, '\\}');
}
