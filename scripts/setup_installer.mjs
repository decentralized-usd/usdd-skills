import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '..');

export const JSON_CLIENTS = new Set(['project', 'claude-desktop', 'cursor', 'codex']);
export const ALL_CLIENTS = ['project', 'claude-desktop', 'cursor', 'codex'];
export const RPC_ENV_KEYS = ['TRONGRID_API_KEY', 'ETH_RPC_URL', 'BSC_RPC_URL'];

export function checkNodeVersion(version = process.versions.node) {
  const major = Number(String(version).split('.')[0]);
  if (!Number.isInteger(major) || major < 20) {
    throw new Error(`Node.js v20+ is required. Current version: ${version}`);
  }
}

export function buildMcpServers({
  analyticsCommand = 'usdd-skills',
  analyticsArgs = ['mcp-server'],
  officialCommand = 'mcp-server-usdd',
  env = process.env,
} = {}) {
  const officialEnv = {};
  for (const key of RPC_ENV_KEYS) {
    if (env[key]) officialEnv[key] = env[key];
  }

  return {
    'usdd-analytics': {
      command: analyticsCommand,
      args: analyticsArgs,
    },
    'usdd-full': {
      command: officialCommand,
      args: [],
      env: officialEnv,
    },
  };
}

export function mergeMcpConfig(existing, servers) {
  return {
    ...existing,
    mcpServers: {
      ...(existing && existing.mcpServers ? existing.mcpServers : {}),
      ...servers,
    },
  };
}

export function clientConfigPath(client, {
  home = os.homedir(),
  platform = process.platform,
  cwd = process.cwd(),
} = {}) {
  switch (client) {
    case 'project':
      return path.join(cwd, '.mcp.json');
    case 'cursor':
      return path.join(home, '.cursor', 'mcp.json');
    case 'codex':
      return path.join(home, '.codex', 'mcp.json');
    case 'claude-desktop':
      if (platform === 'darwin') {
        return path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
      }
      if (platform === 'win32') {
        const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
        return path.join(appData, 'Claude', 'claude_desktop_config.json');
      }
      return path.join(home, '.config', 'Claude', 'claude_desktop_config.json');
    default:
      throw new Error(`Unsupported client: ${client}`);
  }
}

export function parseClientList(value) {
  if (!value || value === 'auto') return ['auto'];
  if (value === 'all') return [...ALL_CLIENTS];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function detectClients({
  home = os.homedir(),
  platform = process.platform,
  cwd = process.cwd(),
} = {}) {
  const clients = ['project'];
  for (const client of ['claude-desktop', 'cursor', 'codex']) {
    const configPath = clientConfigPath(client, { home, platform, cwd });
    const parent = path.dirname(configPath);
    if (fsSync.existsSync(configPath) || fsSync.existsSync(parent)) {
      clients.push(client);
    }
  }
  return clients;
}

export function backupPath(filePath, date = new Date()) {
  const stamp = date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  return `${filePath}.bak-${stamp}`;
}

export async function readJsonIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    if (!raw.trim()) return {};
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw new Error(`Failed to read JSON config ${filePath}: ${error.message}`);
  }
}

export async function writeJsonWithBackup(filePath, data, { dryRun = false } = {}) {
  const existed = fsSync.existsSync(filePath);
  const backup = existed ? backupPath(filePath) : null;
  if (dryRun) return { filePath, backup, dryRun: true };

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  if (existed) await fs.copyFile(filePath, backup);
  await fs.writeFile(`${filePath}.tmp`, `${JSON.stringify(data, null, 2)}\n`);
  await fs.rename(`${filePath}.tmp`, filePath);
  return { filePath, backup, dryRun: false };
}

export async function configureJsonClient(client, {
  servers,
  home = os.homedir(),
  platform = process.platform,
  cwd = process.cwd(),
  dryRun = false,
} = {}) {
  if (!JSON_CLIENTS.has(client)) throw new Error(`Unsupported JSON client: ${client}`);
  const configPath = clientConfigPath(client, { home, platform, cwd });
  const existing = await readJsonIfExists(configPath);
  const merged = mergeMcpConfig(existing, servers);
  const result = await writeJsonWithBackup(configPath, merged, { dryRun });
  return { client, ...result };
}

export async function createSkillsSymlink({
  sourceSkillsDir,
  targetPath = path.join(os.homedir(), '.agents', 'skills', 'usdd-skills'),
  dryRun = false,
} = {}) {
  if (!sourceSkillsDir) throw new Error('sourceSkillsDir is required');
  const parent = path.dirname(targetPath);
  const existed = fsSync.existsSync(targetPath);
  let backup = null;

  if (existed) {
    const stat = await fs.lstat(targetPath);
    if (stat.isSymbolicLink()) {
      const current = await fs.readlink(targetPath);
      const resolved = path.resolve(parent, current);
      if (resolved === sourceSkillsDir) {
        return { targetPath, backup: null, skipped: true, dryRun };
      }
    }
    backup = backupPath(targetPath);
  }

  if (dryRun) return { targetPath, backup, skipped: false, dryRun: true };

  await fs.mkdir(parent, { recursive: true });
  if (existed) await fs.rename(targetPath, backup);
  await fs.symlink(sourceSkillsDir, targetPath, 'dir');
  return { targetPath, backup, skipped: false, dryRun: false };
}

export function runCommand(command, args, {
  cwd = process.cwd(),
  env = process.env,
  stdio = 'inherit',
} = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });
}

export async function resolveGlobalPackageRoot(packageName) {
  let output = '';
  await new Promise((resolve, reject) => {
    const child = spawn('npm', ['root', '-g'], { stdio: ['ignore', 'pipe', 'inherit'] });
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm root -g exited with code ${code}`));
    });
  });
  return path.join(output.trim(), packageName);
}

export async function runSetup({
  clients = ['auto'],
  yes = false,
  dryRun = false,
  skipGlobalInstall = false,
  localSource = false,
  home = os.homedir(),
  platform = process.platform,
  cwd = process.cwd(),
  env = process.env,
  run = runCommand,
  log = console.log,
} = {}) {
  checkNodeVersion();

  const selectedClients = clients.includes('auto')
    ? detectClients({ home, platform, cwd })
    : clients;

  for (const client of selectedClients) {
    if (!ALL_CLIENTS.includes(client)) throw new Error(`Unsupported client: ${client}`);
  }

  if (!yes) {
    log(`Configuring clients: ${selectedClients.join(', ')}`);
    log('Use --yes to run non-interactively.');
  }

  if (!skipGlobalInstall && !dryRun) {
    await run('npm', ['install', '-g', '@usdd/usdd-skills', '@usdd/mcp-server-usdd']);
  }

  const useLocalSource = localSource || skipGlobalInstall;
  const servers = useLocalSource
    ? buildMcpServers({
        analyticsCommand: process.execPath,
        analyticsArgs: [path.join(REPO_ROOT, 'scripts', 'mcp_server.mjs')],
        env,
      })
    : buildMcpServers({ env });

  const results = [];
  for (const client of selectedClients) {
    results.push(await configureJsonClient(client, { servers, home, platform, cwd, dryRun }));
  }

  let sourceSkillsDir = path.join(REPO_ROOT, 'skills');
  if (!useLocalSource && !dryRun) {
    sourceSkillsDir = path.join(await resolveGlobalPackageRoot('@usdd/usdd-skills'), 'skills');
  }
  results.push(await createSkillsSymlink({ sourceSkillsDir, dryRun }));

  return {
    clients: selectedClients,
    servers,
    results,
    skippedGlobalInstall: skipGlobalInstall,
    localSource: useLocalSource,
  };
}
