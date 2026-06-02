import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  buildMcpServers,
  clientConfigPath,
  configureJsonClient,
  createSkillsSymlink,
  detectClients,
  mergeMcpConfig,
  parseClientList,
  runSetup,
} from './setup_installer.mjs';

async function tempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'usdd-setup-test-'));
}

test('buildMcpServers creates durable analytics and official MCP entries', () => {
  const servers = buildMcpServers({
    env: {
      TRONGRID_API_KEY: 'tron-key',
      ETH_RPC_URL: '',
      BSC_RPC_URL: 'https://bsc.example',
    },
  });
  assert.deepEqual(servers['usdd-analytics'], {
    command: 'usdd-skills',
    args: ['mcp-server'],
  });
  assert.deepEqual(servers['usdd-full'], {
    command: 'mcp-server-usdd',
    args: [],
    env: {
      TRONGRID_API_KEY: 'tron-key',
      BSC_RPC_URL: 'https://bsc.example',
    },
  });
});

test('mergeMcpConfig preserves existing servers and replaces USDD servers', () => {
  const existing = {
    theme: 'dark',
    mcpServers: {
      existing: { command: 'node', args: ['server.js'] },
      'usdd-analytics': { command: 'old' },
    },
  };
  const servers = buildMcpServers();
  const merged = mergeMcpConfig(existing, servers);
  assert.equal(merged.theme, 'dark');
  assert.deepEqual(merged.mcpServers.existing, { command: 'node', args: ['server.js'] });
  assert.deepEqual(merged.mcpServers['usdd-analytics'], { command: 'usdd-skills', args: ['mcp-server'] });
  assert.equal(merged.mcpServers['usdd-full'].command, 'mcp-server-usdd');
});

test('clientConfigPath resolves supported client config files', () => {
  const home = '/Users/example';
  const cwd = '/workspace/app';
  assert.equal(clientConfigPath('project', { home, cwd }), '/workspace/app/.mcp.json');
  assert.equal(clientConfigPath('cursor', { home, cwd }), '/Users/example/.cursor/mcp.json');
  assert.equal(clientConfigPath('codex', { home, cwd }), '/Users/example/.codex/mcp.json');
  assert.equal(
    clientConfigPath('claude-desktop', { home, cwd, platform: 'darwin' }),
    '/Users/example/Library/Application Support/Claude/claude_desktop_config.json'
  );
});

test('parseClientList supports auto, all, and comma lists', () => {
  assert.deepEqual(parseClientList(), ['auto']);
  assert.deepEqual(parseClientList('auto'), ['auto']);
  assert.deepEqual(parseClientList('all'), ['project', 'claude-desktop', 'cursor', 'codex']);
  assert.deepEqual(parseClientList('cursor,codex'), ['cursor', 'codex']);
});

test('configureJsonClient writes merged config and backs up existing file', async () => {
  const cwd = await tempDir();
  const filePath = path.join(cwd, '.mcp.json');
  await fs.writeFile(filePath, `${JSON.stringify({ mcpServers: { other: { command: 'old' } } }, null, 2)}\n`);

  const result = await configureJsonClient('project', {
    servers: buildMcpServers(),
    cwd,
  });

  assert.equal(result.filePath, filePath);
  assert.match(result.backup, /\.mcp\.json\.bak-/);

  const updated = JSON.parse(await fs.readFile(filePath, 'utf8'));
  assert.equal(updated.mcpServers.other.command, 'old');
  assert.equal(updated.mcpServers['usdd-analytics'].command, 'usdd-skills');

  const backup = JSON.parse(await fs.readFile(result.backup, 'utf8'));
  assert.equal(backup.mcpServers.other.command, 'old');
  assert.equal(backup.mcpServers['usdd-analytics'], undefined);
});

test('createSkillsSymlink backs up existing target and links source', async () => {
  const root = await tempDir();
  const source = path.join(root, 'source-skills');
  const target = path.join(root, '.agents', 'skills', 'usdd-skills');
  await fs.mkdir(source, { recursive: true });
  await fs.mkdir(target, { recursive: true });
  await fs.writeFile(path.join(target, 'old.txt'), 'old');

  const result = await createSkillsSymlink({ sourceSkillsDir: source, targetPath: target });
  assert.match(result.backup, /usdd-skills\.bak-/);

  const link = await fs.readlink(target);
  assert.equal(path.resolve(path.dirname(target), link), source);

  const old = await fs.readFile(path.join(result.backup, 'old.txt'), 'utf8');
  assert.equal(old, 'old');
});

test('detectClients includes project and existing client directories', async () => {
  const home = await tempDir();
  await fs.mkdir(path.join(home, '.cursor'), { recursive: true });
  await fs.mkdir(path.join(home, '.codex'), { recursive: true });
  const clients = detectClients({ home, cwd: '/workspace/app', platform: 'linux' });
  assert.deepEqual(clients, ['project', 'cursor', 'codex']);
});

test('runSetup dry-run skips npm install and reports project config', async () => {
  const cwd = await tempDir();
  let ran = false;
  const result = await runSetup({
    clients: ['project'],
    yes: true,
    dryRun: true,
    cwd,
    home: await tempDir(),
    run: async () => {
      ran = true;
    },
    log: () => {},
  });

  assert.equal(ran, false);
  assert.deepEqual(result.clients, ['project']);
  assert.equal(result.results[0].filePath, path.join(cwd, '.mcp.json'));
  assert.equal(result.results[0].dryRun, true);
});

test('runSetup local source writes a portable project config', async () => {
  const root = await tempDir();
  const repoRoot = path.join(root, 'checkout');
  await fs.mkdir(repoRoot);
  const projectConfig = path.join(root, '.mcp.json');

  const result = await runSetup({
    clients: ['project'],
    yes: true,
    localSource: true,
    skipGlobalInstall: true,
    cwd: root,
    home: root,
    repoRoot,
    env: { ETH_RPC_URL: 'https://secret.example' },
    skillsTargetPath: path.join(root, '.agents', 'skills', 'usdd-skills'),
    log: () => {},
  });

  const updated = JSON.parse(await fs.readFile(projectConfig, 'utf8'));
  assert.deepEqual(updated.mcpServers['usdd-analytics'], {
    command: 'node',
    args: ['./checkout/scripts/mcp_server.mjs'],
  });
  assert.deepEqual(updated.mcpServers['usdd-full'].env, {
    ETH_RPC_URL: 'https://secret.example',
  });
  assert.equal(JSON.stringify(updated).includes(process.execPath), false);
  assert.equal(JSON.stringify(updated).includes(root), false);
  assert.equal(result.results[0].client, 'project');
  assert.equal(result.results[0].filePath, projectConfig);
  assert.equal(result.results[0].skipped, undefined);
});

test('runSetup local source still configures user-level clients', async () => {
  const root = await tempDir();
  const repoRoot = path.join(root, 'checkout');
  const cursorConfig = path.join(root, '.cursor', 'mcp.json');

  const result = await runSetup({
    clients: ['cursor'],
    yes: true,
    localSource: true,
    skipGlobalInstall: true,
    cwd: root,
    home: root,
    repoRoot,
    env: { BSC_RPC_URL: 'https://bsc.example' },
    skillsTargetPath: path.join(root, '.agents', 'skills', 'usdd-skills'),
    log: () => {},
  });

  const updated = JSON.parse(await fs.readFile(cursorConfig, 'utf8'));
  assert.equal(updated.mcpServers['usdd-analytics'].command, process.execPath);
  assert.deepEqual(updated.mcpServers['usdd-analytics'].args, [
    path.join(repoRoot, 'scripts', 'mcp_server.mjs'),
  ]);
  assert.deepEqual(updated.mcpServers['usdd-full'].env, {
    BSC_RPC_URL: 'https://bsc.example',
  });
  assert.equal(result.results[0].client, 'cursor');
  assert.equal(result.results[0].filePath, cursorConfig);
});

test('runSetup installs the requested git package source', async () => {
  const root = await tempDir();
  const calls = [];
  const packageSource = 'git+https://github.com/decentralized-usd/usdd-skills.git';
  await runSetup({
    clients: ['project'],
    yes: true,
    localSource: true,
    packageSource,
    cwd: root,
    home: root,
    skillsTargetPath: path.join(root, '.agents', 'skills', 'usdd-skills'),
    run: async (command, args) => {
      calls.push([command, args]);
    },
    log: () => {},
  });

  assert.deepEqual(calls, [
    ['npm', ['install', '-g', packageSource, '@usdd/mcp-server-usdd']],
  ]);
});
