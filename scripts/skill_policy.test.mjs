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
