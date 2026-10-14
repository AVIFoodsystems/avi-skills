import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { root, build, validate, catalogAt, closure, generated, skillBundle, validateLinks, frontmatter, sha, safePath, validateManifest, manifest } from '../tooling/core.mjs';

function temporary(t) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avi-packaging-')); t.after(() => fs.rmSync(dir, { recursive: true, force: true })); return dir; }
test('all generated packages match canonical content; dependency closure preserves legacy names', () => {
  assert.equal(validate().skills, 7);
  const catalog = catalogAt(root);
  assert.deepEqual(closure(catalog, ['dotnet10-migration']), ['github-project-iteration-issue', 'dotnet10-migration']);
  assert.equal(catalog.packages['avi-migration'].version, '0.1.5');
  const script = 'github-project-iteration-issue/scripts/create_stories.sh';
  assert.deepEqual(generated().get(`skills/${script}`).bytes, fs.readFileSync(path.join(root, 'skill-sources', script)));
  assert.equal(generated().get(`skills/${script}`).mode, 0o755);
});
test('standalone references resolve inside each bundle without authoring paths', () => {
  const catalog = catalogAt(root);
  for (const name of Object.keys(catalog.skills)) {
    const files = skillBundle(root, catalog, name); validateLinks(files, name);
    assert.equal(frontmatter(files.get('SKILL.md').bytes.toString(), name).name, name);
    assert(!files.get('SKILL.md').bytes.toString().includes('../../standards/'));
  }
});
test('reproducible archives extract complete executable artifacts', t => {
  // Build in a copy so tests do not mutate or race the working tree.
  const source = path.join(temporary(t), 'source'); fs.cpSync(root, source, { recursive: true, filter: file => !['.git', '.idea', '.planning', '.playwright-mcp', 'node_modules', 'dist'].includes(path.basename(file)) });
  build(source);
  const archiveFiles = fs.readdirSync(path.join(source, 'dist')).filter(name => name.endsWith('.tar.gz'));
  assert.equal(archiveFiles.length, 9);
  const before = Object.fromEntries(archiveFiles.map(name => [name, sha(fs.readFileSync(path.join(source, 'dist', name)))]));
  build(source);
  for (const file of archiveFiles) {
    assert.equal(sha(fs.readFileSync(path.join(source, 'dist', file))), before[file]);
    const target = path.join(temporary(t), 'extract'); fs.mkdirSync(target);
    execFileSync('tar', ['-xzf', path.join(source, 'dist', file), '-C', target]);
    const name = fs.readdirSync(target)[0];
    const base = path.join(target, name);
    if (name.startsWith('avi-') && fs.existsSync(path.join(base, 'plugin.json'))) {
      const pkg = JSON.parse(fs.readFileSync(path.join(base, 'plugin.json')));
      assert.equal(pkg.name, name);
      for (const skill of fs.readdirSync(path.join(base, 'skills'))) verifyExtracted(path.join(base, 'skills', skill), skill);
    } else verifyExtracted(base, name);
  }
  const checksums = fs.readFileSync(path.join(source, 'dist/SHA256SUMS'), 'utf8').trim().split('\n');
  for (const line of checksums) { const [checksum, file] = line.split('  '); assert.equal(checksum, sha(fs.readFileSync(path.join(source, 'dist', file)))); }
  const catalog = catalogAt(source); catalog.packages['avi-engineering'].version = '0.2.0'; fs.writeFileSync(path.join(source, 'catalog.json'), JSON.stringify(catalog));
  build(source);
  assert(!fs.existsSync(path.join(source, 'dist/avi-engineering-0.1.0.tar.gz')));
  assert(fs.existsSync(path.join(source, 'dist/avi-engineering-0.2.0.tar.gz')));
});
function verifyExtracted(base, name) {
  const entries = new Map();
  function visit(directory, prefix = '') { for (const file of fs.readdirSync(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, file.name); const absolute = path.join(directory, file.name);
    if (file.isDirectory()) visit(absolute, relative); else entries.set(relative, { bytes: fs.readFileSync(absolute) });
  } }
  visit(base); validateLinks(entries, name);
  if (name === 'github-project-iteration-issue') assert(fs.statSync(path.join(base, 'scripts/create_stories.sh')).mode & 0o111);
}
test('invalid frontmatter, cycles, undeclared/escaping references and drift fail validation', t => {
  const valid = manifest(catalogAt(root), 'avi-engineering'); validateManifest(valid);
  assert.throws(() => validateManifest({ ...valid, skills: './skills' }), /Unknown/);
  assert.throws(() => validateManifest({ ...valid, author: { name: 42 } }), /author/);
  assert.throws(() => validateManifest({ ...valid, version: '01.0.0' }), /version/);
  assert.throws(() => frontmatter('---\nname: Invalid\ndescription: x\n---\n', 'bad'), /name/);
  assert.throws(() => frontmatter('---\nname: valid\ndescription: x\nversion: 1.0.0\n---\n', 'bad'), /field/);
  assert.throws(() => closure({ skills: { a: { dependencies: ['b'] }, b: { dependencies: ['a'] } } }, ['a']), /cycle/);
  assert.throws(() => validateLinks(new Map([['SKILL.md', { bytes: Buffer.from('[escape](../../secret.md)') }]]), 'bad'), /escaping/);
  assert.throws(() => safePath('/tmp/example', '../secret'), /escapes/);
  const source = path.join(temporary(t), 'source'); fs.cpSync(root, source, { recursive: true, filter: file => !['.git', '.idea', '.planning', '.playwright-mcp', 'dist'].includes(path.basename(file)) });
  fs.appendFileSync(path.join(source, 'skills/dotnet10-migration/SKILL.md'), '\nlocal edit\n');
  assert.throws(() => validate(source), /Generated drift/);
  build(source); fs.writeFileSync(path.join(source, 'plugins/avi-engineering/extra.md'), 'unexpected');
  assert.throws(() => validate(source), /Unexpected generated file/);
});
