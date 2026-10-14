import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync, execFileSync } from 'node:child_process';
import { root, readJSON } from '../tooling/core.mjs';

test('CLI installs an immutable local Git ref with exact provenance without changing the source checkout', t => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'avi-cli-')); t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const source = path.join(base, 'source');
  fs.cpSync(root, source, { recursive: true, filter: file => !['.git', '.idea', '.planning', '.playwright-mcp', 'node_modules', 'dist'].includes(path.basename(file)) });
  const git = args => execFileSync('git', ['-C', source, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git(['-c', 'init.templateDir=', 'init', '-q']); git(['add', '.']);
  git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'Fixture release']);
  git(['tag', 'v0.2.0']); const commit = git(['rev-parse', 'HEAD']);
  const catalogFile = path.join(source, 'catalog.json'); const catalog = readJSON(catalogFile); catalog.release = '0.3.0'; fs.writeFileSync(catalogFile, JSON.stringify(catalog));
  const target = path.join(base, 'target'); const home = path.join(base, 'home'); fs.mkdirSync(home);
  const result = spawnSync(process.execPath, [path.join(root, 'tooling/cli.mjs'), 'install', '--source', source, '--ref', 'v0.2.0', '--release', '0.2.0', '--target', target, '--home', home], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const receipt = readJSON(path.join(target, 'avi-skills.lock.json'));
  assert.equal(receipt.source.commit, commit); assert.equal(receipt.source.release, '0.2.0'); assert.equal(receipt.source.dirty, false);
  assert.equal(readJSON(catalogFile).release, '0.3.0');
  const checked = spawnSync(process.execPath, [path.join(root, 'tooling/cli.mjs'), 'check', '--target', target, '--release', '9.0.0'], { encoding: 'utf8' });
  assert.equal(checked.status, 2); assert.equal(JSON.parse(checked.stdout).ok, false);
});
test('CLI rejects invalid commands and missing option values without installing', () => {
  for (const args of [['unknown'], ['install', '--target'], ['install', '--clients', 'unsupported']]) {
    const result = spawnSync(process.execPath, [path.join(root, 'tooling/cli.mjs'), ...args], { encoding: 'utf8' });
    assert.equal(result.status, 1); assert(result.stderr.length);
  }
});
