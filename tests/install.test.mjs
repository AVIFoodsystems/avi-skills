import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { root, build, readJSON } from '../tooling/core.mjs';
import { install, check, doctor, uninstall, readReceipt } from '../tooling/install.mjs';
function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'avi-install-')); t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const target = path.join(base, 'app'); const home = path.join(base, 'home'); fs.mkdirSync(target); fs.mkdirSync(home);
  return { base, target, home };
}
test('all repository adapters install idempotently and preserve unrelated instructions', t => {
  const { target, home } = fixture(t);
  const agents = '# Existing instructions\n\nKeep this text.\n'; fs.writeFileSync(path.join(target, 'AGENTS.md'), agents);
  const options = { target, home, clients: ['codex', 'claude', 'kiro'] };
  const preview = install({ ...options, dryRun: true }); assert(preview.actions.length); assert.equal(fs.readdirSync(target).length, 1);
  install(options); assert.equal(check({ target }).ok, true); assert.equal(install(options).actions.length, 0);
  assert.equal(readReceipt(target).skills.length, 5);
  assert(fs.readFileSync(path.join(target, 'CLAUDE.md'), 'utf8').includes('@AGENTS.md'));
  fs.appendFileSync(path.join(target, 'AGENTS.md'), '\nAdditional local note.\n');
  assert.equal(check({ target }).ok, true); install(options);
  const previewUninstall = uninstall({ target, dryRun: true }); assert(previewUninstall.actions.length); assert(fs.existsSync(path.join(target, 'avi-skills.lock.json')));
  uninstall({ target }); assert(!fs.existsSync(path.join(target, 'avi-skills.lock.json')));
  assert(fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf8').startsWith(agents));
  assert(fs.readFileSync(path.join(target, 'AGENTS.md'), 'utf8').includes('Additional local note.'));
});
test('migration dependency and executable script survive client selection', t => {
  const { target, home } = fixture(t);
  install({ target, home, packages: ['avi-migration'], skills: ['dotnet10-migration'], clients: ['claude'] });
  assert.deepEqual(new Set(readReceipt(target).skills), new Set(['dotnet10-migration', 'github-project-iteration-issue']));
  assert(fs.statSync(path.join(target, '.claude/skills/github-project-iteration-issue/scripts/create_stories.sh')).mode & 0o111);
});
test('modified files block all update writes; uninstall retains edits and their receipt', t => {
  const { target, home } = fixture(t); install({ target, home });
  const file = path.join(target, '.agents/skills/avi-ngrx/SKILL.md'); fs.appendFileSync(file, '\nCustom edit.\n');
  const before = fs.readFileSync(path.join(target, 'avi-skills.lock.json'));
  assert.throws(() => install({ target, home, update: true, clients: ['codex', 'claude'] }), /Modified managed file/);
  assert.deepEqual(fs.readFileSync(path.join(target, 'avi-skills.lock.json')), before);
  assert(!fs.existsSync(path.join(target, '.claude/skills/avi-angular/SKILL.md')));
  assert.equal(check({ target }).issues[0].type, 'modified');
  const result = uninstall({ target }); assert.deepEqual(result.retained, ['.agents/skills/avi-ngrx/SKILL.md']);
  assert(fs.readFileSync(file, 'utf8').includes('Custom edit.')); assert.equal(Object.keys(readReceipt(target).files).length, 1);
});
test('update and rollback use exact release source; selection removals are owned', t => {
  const { base, target, home } = fixture(t); install({ target, home });
  const source = path.join(base, 'new-source'); fs.cpSync(root, source, { recursive: true, filter: file => !['.git', '.idea', '.planning', '.playwright-mcp', 'dist'].includes(path.basename(file)) });
  const catalog = readJSON(path.join(source, 'catalog.json')); catalog.release = '0.3.0'; catalog.packages['avi-engineering'].version = '0.2.0'; fs.writeFileSync(path.join(source, 'catalog.json'), JSON.stringify(catalog));
  fs.appendFileSync(path.join(source, 'standards/context.md'), '\nA reviewed update.\n'); build(source);
  assert.throws(() => install({ target, home, source, update: true, release: '0.2.0' }), /does not match/);
  install({ target, home, source, update: true, release: '0.3.0' }); assert.equal(readReceipt(target).source.release, '0.3.0');
  assert.equal(check({ target, source }).ok, true); assert.equal(check({ target, source: root }).issues[0].type, 'source-conflict');
  install({ target, home, source: root, update: true, release: '0.2.0' }); assert.equal(check({ target, source: root }).ok, true);
  install({ target, home, update: true, skills: ['avi-ngrx'] }); assert(!fs.existsSync(path.join(target, '.agents/skills/avi-angular/SKILL.md')));
});
test('unowned files and symlink destinations fail without changes', t => {
  const { target, home, base } = fixture(t); const external = path.join(base, 'external'); fs.mkdirSync(external);
  fs.symlinkSync(external, path.join(target, '.agents'));
  assert.throws(() => install({ target, home }), /Symlink/); assert.equal(fs.readdirSync(external).length, 0);
  fs.unlinkSync(path.join(target, '.agents')); fs.mkdirSync(path.join(target, '.agents/skills/avi-angular'), { recursive: true });
  fs.writeFileSync(path.join(target, '.agents/skills/avi-angular/SKILL.md'), 'unowned');
  assert.throws(() => install({ target, home }), /Unowned/); assert(!fs.existsSync(path.join(target, 'avi-skills.lock.json')));
});
test('managed skills conflict with repository bundles and doctor reports version requirements', t => {
  const { target, home } = fixture(t);
  install({ target: home, scope: 'user', clients: ['codex'] });
  assert.throws(() => install({ target, home }), /Duplicate.*disable/);
  uninstall({ target: home, scope: 'user' }); install({ target, home });
  assert.throws(() => install({ target: home, scope: 'user', clients: ['codex'], repository: target }), /Duplicate.*disable/);
  install({ target: home, scope: 'user', clients: ['claude'] });
  const result = doctor({ target: home, scope: 'user', repository: target, release: '0.1.0', probe: false });
  assert(result.issues.some(issue => issue.type === 'release-conflict'));
});
test('adapter changes are detected against an exact source even when package versions stay the same', t => {
  const { base, target, home } = fixture(t); install({ target, home });
  const source = path.join(base, 'new-source'); fs.cpSync(root, source, { recursive: true, filter: file => !['.git', '.idea', '.planning', '.playwright-mcp', 'dist'].includes(path.basename(file)) });
  fs.appendFileSync(path.join(source, 'adapters/AGENTS.md.tmpl'), '\nUpdated routing context.\n');
  assert.equal(check({ target, source }).issues[0].type, 'source-conflict');
});
test('native staging is immutable, update retains old version paths, and standalone transition works', t => {
  const { target: home, base } = fixture(t);
  const options = { target: home, scope: 'user', mode: 'native', clients: ['codex', 'claude', 'kiro'] };
  const staged = install(options); assert.equal(staged.activation, 'staged'); assert.equal(staged.next.length, 3);
  assert(fs.existsSync(path.join(staged.marketplaceRoot, 'plugins/avi-engineering/plugin.json')));
  assert.equal(install(options).actions.length, 0);
  const source = path.join(base, 'new-source'); fs.cpSync(root, source, { recursive: true, filter: file => !['.git', '.idea', '.planning', '.playwright-mcp', 'dist'].includes(path.basename(file)) });
  const catalog = readJSON(path.join(source, 'catalog.json')); catalog.release = '0.3.0'; fs.writeFileSync(path.join(source, 'catalog.json'), JSON.stringify(catalog)); build(source);
  const next = install({ ...options, source, update: true }); assert.notEqual(next.marketplaceRoot, staged.marketplaceRoot);
  assert(fs.existsSync(path.join(staged.marketplaceRoot, 'plugins/avi-engineering/plugin.json'))); assert.equal(check({ target: home, scope: 'user' }).ok, true);
  install({ target: home, scope: 'user', mode: 'standalone', clients: ['codex'], update: true });
  assert(fs.existsSync(path.join(home, '.agents/skills/avi-angular/SKILL.md')));
  assert(!fs.existsSync(path.join(staged.marketplaceRoot, 'plugins/avi-engineering/plugin.json')));
});
test('Kiro compatibility routes through one explicit file resource; missing references are detected', t => {
  const { target, home } = fixture(t);
  install({ target, home, clients: ['kiro'], mode: 'compat' });
  const agent = readJSON(path.join(target, '.kiro/agents/avi.json')); assert.equal(agent.resources.length, 1);
  assert.equal(agent.resources[0], `file://${path.join(target, '.kiro/avi-routing.md')}`); assert(!agent.model && !agent.toolsSettings);
  fs.rmSync(path.join(target, '.kiro/skills/avi-ngrx/references/ngrx-classic.md'));
  assert(check({ target }).issues.some(issue => issue.type === 'missing'));
});
test('local permission changes are preserved as conflicts and private instruction files retain their mode', t => {
  const { target, home } = fixture(t);
  fs.writeFileSync(path.join(target, 'AGENTS.md'), '# Private local instructions\n', { mode: 0o600 });
  install({ target, home }); assert.equal(fs.statSync(path.join(target, 'AGENTS.md')).mode & 0o777, 0o600);
  const file = path.join(target, '.agents/skills/avi-ngrx/SKILL.md'); fs.chmodSync(file, 0o600);
  assert.throws(() => install({ target, home, update: true }), /Modified managed file/);
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  assert.equal(uninstall({ target }).retained.length, 1);
});
test('inactive native staging does not block a repository bundle; potential activation conflicts remain visible', t => {
  const { target, home } = fixture(t);
  install({ target: home, scope: 'user', mode: 'native', clients: ['codex'] });
  const result = install({ target, home }); assert.equal(result.activation, 'standalone');
  assert(result.warnings.some(message => message.startsWith('Potential native duplicate')));
  assert(doctor({ target, home, probe: false }).issues.some(issue => issue.type === 'duplicate'));
});
