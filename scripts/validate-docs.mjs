#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const errors = [];

function fail(file, line, message) {
  const location = line ? `${file}:${line}` : file;
  errors.push(`${location}\n  ${message}`);
}

function readText(file) {
  return fs.readFileSync(path.join(repoRoot, file), 'utf8');
}

function walk(dir) {
  const absolute = path.join(repoRoot, dir);
  if (!fs.existsSync(absolute)) return [];
  const entries = fs.readdirSync(absolute, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['.git', 'node_modules', 'dist', '.astro'].includes(entry.name)) continue;
      files.push(...walk(relative));
    } else if (/\.(mdx|md|txt)$/.test(entry.name)) {
      files.push(relative.replaceAll(path.sep, '/'));
    }
  }
  return files;
}

function extractJsonBlocks(file, text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let inJson = false;
  let startLine = 0;
  let buffer = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!inJson && /^```json\b/.test(trimmed)) {
      inJson = true;
      startLine = index + 2;
      buffer = [];
      continue;
    }

    if (inJson && trimmed === '```') {
      blocks.push({ file, startLine, text: buffer.join('\n') });
      inJson = false;
      buffer = [];
      continue;
    }

    if (inJson) buffer.push(line);
  }

  return blocks;
}

function validateServerConfig(block) {
  const relevant = /"(?:mcpServers|servers)"|McpServerSample\.csproj/.test(block.text);
  if (!relevant) return;

  let parsed;
  try {
    parsed = JSON.parse(block.text);
  } catch (error) {
    fail(block.file, block.startLine, `MCP host JSON must be valid copy/paste JSON: ${error.message}`);
    return;
  }

  validateServerMap(block, parsed.mcpServers, 'mcpServers');
  validateServerMap(block, parsed.servers, 'servers');
}

function validateServerMap(block, serverMap, key) {
  if (!serverMap || typeof serverMap !== 'object' || Array.isArray(serverMap)) return;

  for (const [name, server] of Object.entries(serverMap)) {
    if (!server || typeof server !== 'object') continue;

    if (key === 'servers' && server.command && server.type !== 'stdio') {
      fail(
        block.file,
        block.startLine,
        `VS Code-style server "${name}" uses top-level "servers" but is missing "type": "stdio".`
      );
    }

    const command = server.command;
    const args = Array.isArray(server.args) ? server.args : [];
    const launchesDotnetProject = command === 'dotnet'
      && args.includes('run')
      && args.includes('--project')
      && args.some((arg) => typeof arg === 'string' && arg.endsWith('.csproj'));

    if (launchesDotnetProject) {
      const projectIndex = args.indexOf('--project');
      const noBuildIndex = args.indexOf('--no-build');
      if (noBuildIndex === -1 || noBuildIndex > projectIndex) {
        fail(
          block.file,
          block.startLine,
          `MCP host server "${name}" runs a .csproj with dotnet run but does not place "--no-build" before "--project".`
        );
      }
    }
  }
}

function validateMcpHostDocs(file, text) {
  if (/Repl\.Mcp\s+is\s+(?:an?|the)\s+MCP server/i.test(text)) {
    fail(file, 1, 'Describe Repl.Mcp as the component used to build MCP servers, not as the MCP server itself.');
  }

  if (file.endsWith('cookbook/mcp-server.mdx') && text.includes('## Agent-host setup')) {
    const section = text.split('## Agent-host setup', 2)[1].split('\n## ', 1)[0];

    if (!section.includes('dotnet build samples/08-mcp-server/McpServerSample.csproj')) {
      fail(file, findLine(text, '## Agent-host setup'), 'Agent-host setup should tell users to build the local sample before configuring an MCP host.');
    }

    if (!section.includes('"--no-build"')) {
      fail(file, findLine(text, '## Agent-host setup'), 'Agent-host setup must use "--no-build" for dotnet-run host configs.');
    }

    if (!section.includes('"repl-contacts-sample"')) {
      fail(file, findLine(text, '## Agent-host setup'), 'Agent-host setup should use the shared sample server name "repl-contacts-sample".');
    }

    if (section.includes('.vscode/mcp.json') && !section.includes('"servers"')) {
      fail(file, findLine(text, '.vscode/mcp.json'), 'VS Code .vscode/mcp.json examples must use top-level "servers", not only "mcpServers".');
    }
  }
}

function validateLlmsTxt(file, text) {
  if (!file.endsWith('llms.txt')) return;

  if (text.includes('For Coding Agents') && !text.includes('/getting-started/for-coding-agents/')) {
    fail(file, findLine(text, 'For Coding Agents'), 'llms.txt mentions For Coding Agents but does not link the canonical page.');
  }

  if (text.includes('Repl.Mcp') && /Repl\.Mcp\s+is\s+(?:an?|the)\s+MCP server/i.test(text)) {
    fail(file, findLine(text, 'Repl.Mcp'), 'llms.txt should say Repl.Mcp is the component; the app is the MCP server.');
  }
}

function findLine(text, needle) {
  const lines = text.split(/\r?\n/);
  const index = lines.findIndex((line) => line.includes(needle));
  return index === -1 ? 1 : index + 1;
}

const files = [
  ...walk('src/content/docs'),
  ...walk('public'),
].sort();

for (const file of files) {
  const text = readText(file);
  validateMcpHostDocs(file, text);
  validateLlmsTxt(file, text);
  for (const block of extractJsonBlocks(file, text)) validateServerConfig(block);
}

if (errors.length > 0) {
  console.error(`Documentation validation failed with ${errors.length} issue(s):\n`);
  for (const error of errors) console.error(`- ${error}\n`);
  process.exit(1);
}

console.log(`Documentation validation passed (${files.length} files checked).`);
