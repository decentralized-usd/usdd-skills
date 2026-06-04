import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const writeSkillFiles = [
  'SKILL.md',
  'skills/usdd-vault-v1/SKILL.md',
  'skills/usdd-psm-v1/SKILL.md',
  'skills/usdd-earn-v1/SKILL.md',
];
const addressLookupSkillFiles = [
  'skills/usdd-vault-v1/SKILL.md',
  'skills/usdd-psm-v1/SKILL.md',
  'skills/usdd-earn-v1/SKILL.md',
];
const explicitNetworkSkillFiles = [
  'SKILL.md',
  'skills/usdd-vault-v1/SKILL.md',
  'skills/usdd-psm-v1/SKILL.md',
  'skills/usdd-earn-v1/SKILL.md',
];

test('write-capable skills require non-skippable prechecks and fresh confirmation', async () => {
  for (const relativePath of writeSkillFiles) {
    const skill = await fs.readFile(path.join(repoRoot, relativePath), 'utf8');
    assert.match(skill, /NEVER skip/i, `${relativePath} must forbid skipping safety steps`);
    assert.match(skill, /fresh affirmative confirmation/i, `${relativePath} must require fresh confirmation`);
    assert.match(
      skill,
      /initial request.*does not count as confirmation/i,
      `${relativePath} must reject confirmation embedded in the initial request`
    );
    assert.match(
      skill,
      /approve_token.*business write/i,
      `${relativePath} must gate approve_token and the business write together`
    );
  }
});

test('official write skills use Chainlog-backed protocol address lookup', async () => {
  for (const relativePath of addressLookupSkillFiles) {
    const skill = await fs.readFile(path.join(repoRoot, relativePath), 'utf8');
    assert.match(
      skill,
      /Chainlog-backed `get_protocol_addresses`/i,
      `${relativePath} must use Chainlog-backed protocol address lookup`
    );
    assert.match(
      skill,
      /get_chainlog_address/,
      `${relativePath} must mention single-key Chainlog resolution`
    );
  }
});

test('chain-dependent skills require explicit network before any tool call', async () => {
  for (const relativePath of explicitNetworkSkillFiles) {
    const skill = await fs.readFile(path.join(repoRoot, relativePath), 'utf8');
    assert.match(
      skill,
      /first response must ask which network/i,
      `${relativePath} must ask for network before doing chain-dependent work`
    );
    assert.match(
      skill,
      /Do not call any MCP tool before the user names the network/i,
      `${relativePath} must forbid tool calls before network is explicit`
    );
    assert.match(
      skill,
      /Never default to TRON/i,
      `${relativePath} must explicitly forbid defaulting to TRON`
    );
  }
});

test('PSM skill covers missing-network swap regression prompt', async () => {
  const skill = await fs.readFile(path.join(repoRoot, 'skills/usdd-psm-v1/SKILL.md'), 'utf8');
  assert.match(skill, /Swap 500 USDT to USDD\./);
  assert.match(skill, /ask which network/i);
  assert.match(skill, /no MCP tool/i);
});

test('protocol address resolution forbids static tables and overview fallback', async () => {
  for (const relativePath of explicitNetworkSkillFiles) {
    const skill = await fs.readFile(path.join(repoRoot, relativePath), 'utf8');
    assert.match(
      skill,
      /Chainlog-backed resolver first/i,
      `${relativePath} must prefer Chainlog-backed resolver`
    );
    assert.match(
      skill,
      /Do not fallback to `get_protocol_overview` just to discover addresses/i,
      `${relativePath} must forbid overview fallback for address discovery`
    );
    assert.match(
      skill,
      /Do not use local full-address tables/i,
      `${relativePath} must forbid local full-address tables`
    );
    assert.match(
      skill,
      /TronGrid `429`/,
      `${relativePath} must describe the TronGrid 429 stop condition`
    );
  }
});
