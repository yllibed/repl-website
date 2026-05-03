#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const docfxConfigPath = path.join(rootDir, 'docfx', 'docfx.json');
const docfxOutputDir = path.join(rootDir, 'docfx', 'api');
const legacyPublicApiDir = path.join(rootDir, 'public', 'api');
const generatorPath = path.join(__dirname, 'generate-api-mdx.mjs');

const skipMetadata = process.argv.includes('--skip-metadata');

try {
	if (!skipMetadata && (await hasConfiguredSourceProjects())) {
		run('docfx', ['metadata', docfxConfigPath]);
	} else if (!hasGeneratedMetadata()) {
		throw new Error(
			'No Repl source projects or existing DocFX metadata were found. ' +
				'Check out the Repl source into ./repl-source or run DocFX metadata first.'
		);
	} else if (!skipMetadata) {
		console.log('No Repl source projects found. Reusing existing DocFX metadata in docfx/api.');
	}

	await removeLegacyPublicApi();
	run(process.execPath, [generatorPath]);
} catch (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
}

async function removeLegacyPublicApi() {
	if (!existsSync(legacyPublicApiDir)) return;

	const resolved = path.resolve(legacyPublicApiDir);
	const expected = path.resolve(rootDir, 'public', 'api');
	if (resolved !== expected) {
		throw new Error(`Refusing to remove unexpected legacy API directory: ${resolved}`);
	}

	await rm(legacyPublicApiDir, { recursive: true, force: true });
	console.log('Removed legacy public/api DocFX output.');
}

async function hasConfiguredSourceProjects() {
	const config = JSON.parse(await readFile(docfxConfigPath, 'utf8'));
	const configDir = path.dirname(docfxConfigPath);
	const metadata = Array.isArray(config.metadata) ? config.metadata : [config.metadata];

	for (const block of metadata.filter(Boolean)) {
		for (const source of block.src ?? []) {
			const sourceDir = path.resolve(configDir, source.src ?? '.');
			for (const pattern of source.files ?? []) {
				if (hasMatchingFile(sourceDir, pattern)) return true;
			}
		}
	}

	return false;
}

function hasGeneratedMetadata() {
	if (!existsSync(docfxOutputDir)) return false;
	return readdirSync(docfxOutputDir).some((entry) => entry.endsWith('.yml'));
}

function hasMatchingFile(directory, pattern) {
	if (!existsSync(directory)) return false;

	if (pattern === '*.csproj') {
		return readdirSync(directory).some((entry) => entry.endsWith('.csproj'));
	}

	if (pattern.startsWith('**/')) {
		const suffix = pattern.slice(3).replace('*', '');
		return hasRecursiveMatch(directory, suffix);
	}

	return existsSync(path.join(directory, pattern));
}

function hasRecursiveMatch(directory, suffix) {
	for (const entry of readdirSync(directory)) {
		const fullPath = path.join(directory, entry);
		const stats = statSync(fullPath);
		if (stats.isDirectory() && hasRecursiveMatch(fullPath, suffix)) return true;
		if (stats.isFile() && entry.endsWith(suffix)) return true;
	}

	return false;
}

function run(command, args) {
	const result = spawnSync(command, args, {
		cwd: rootDir,
		stdio: 'inherit',
		shell: process.platform === 'win32' && command !== process.execPath,
	});

	if (result.status !== 0) {
		throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}.`);
	}
}
