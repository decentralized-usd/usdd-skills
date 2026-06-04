#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PACKAGE_SOURCE, parseClientList, runSetup } from '../scripts/setup_installer.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function printHelp() {
  console.log(`USDD Skills

Usage:
  usdd-skills setup [options]
  usdd-skills mcp-server
  usdd-skills list-tools

Setup options:
  --yes                    Run non-interactively
  --client <list>           auto, all, or comma list: project,claude-desktop,cursor,codex
  --dry-run                 Show planned writes without changing files
  --skip-global-install     Do not npm install global packages
  --local-source            Configure analytics MCP from this checkout instead of usdd-skills binary
  --package-source <spec>   Install usdd-skills globally from an npm package or git URL

Examples:
  npx --yes --package=git+https://github.com/decentralized-usd/usdd-skills.git usdd-skills setup --yes
  usdd-skills setup --client claude-desktop,cursor --yes
  node bin/usdd-skills.mjs setup --local-source --skip-global-install --client project --yes
`);
}

function parseArgs(argv) {
  const options = {
    command: argv[0],
    clients: ['auto'],
    yes: false,
    dryRun: false,
    skipGlobalInstall: false,
    localSource: false,
    packageSource: DEFAULT_PACKAGE_SOURCE,
  };

  for (let i = 1; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--yes' || arg === '-y') options.yes = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--skip-global-install') options.skipGlobalInstall = true;
    else if (arg === '--local-source') options.localSource = true;
    else if (arg === '--package-source') {
      i += 1;
      if (!argv[i]) throw new Error('--package-source requires a value');
      options.packageSource = argv[i];
    } else if (arg.startsWith('--package-source=')) {
      options.packageSource = arg.slice('--package-source='.length);
    }
    else if (arg === '--client') {
      i += 1;
      if (!argv[i]) throw new Error('--client requires a value');
      options.clients = parseClientList(argv[i]);
    } else if (arg.startsWith('--client=')) {
      options.clients = parseClientList(arg.slice('--client='.length));
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return options;
}

function runMcpServer(args = []) {
  const script = path.join(repoRoot, 'scripts', 'mcp_server.mjs');
  const result = spawnSync(process.execPath, [script, ...args], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    printHelp();
    return;
  }

  if (argv[0] === 'mcp-server') {
    runMcpServer(argv.slice(1));
    return;
  }

  if (argv[0] === 'list-tools') {
    runMcpServer(['--list-tools']);
    return;
  }

  if (argv[0] !== 'setup') {
    throw new Error(`Unknown command: ${argv[0]}`);
  }

  const options = parseArgs(argv);
  const result = await runSetup(options);
  console.log('');
  console.log('USDD Skills setup complete.');
  console.log(`Configured clients: ${result.clients.join(', ')}`);
  for (const item of result.results) {
    const backup = item.backup ? ` (backup: ${item.backup})` : '';
    const skipped = item.skipped ? ' (already linked)' : '';
    console.log(`- ${item.client || 'skills'}: ${item.filePath || item.targetPath}${backup}${skipped}`);
  }
  console.log('');
  console.log('Next: restart your AI client and ask "Show current USDD Earn APY".');
}

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
