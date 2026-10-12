import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';

export const root = path.resolve(import.meta.dirname, '..');
export const schema = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json';
export const json = value => `${JSON.stringify(value, null, 2)}\n`;
export const sha = value => createHash('sha256').update(value).digest('hex');
export const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));
export const catalogAt = source => readJSON(path.join(source, 'catalog.json'));
export const assert = (condition, message) => { if (!condition) throw new Error(message); };
export const nameValid = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 64;
export const semver = value => typeof value === 'string' && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][a-zA-Z0-9-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][a-zA-Z0-9-]*))*))?(?:\+[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*)?$/.test(value);

export function safePath(base, relative) {
  assert(typeof relative === 'string' && relative && !path.isAbsolute(relative) && !relative.includes('\\'), `Unsafe path: ${relative}`);
  const target = path.resolve(base, relative);
  assert(target.startsWith(`${path.resolve(base)}${path.sep}`), `Path escapes bundle: ${relative}`);
  // Never traverse a symlink, including an existing base directory.
  let current = path.resolve(base);
  for (const part of ['', ...path.relative(base, target).split(path.sep)]) {
    current = path.join(current, part);
    try { assert(!fs.lstatSync(current).isSymbolicLink(), `Symlink is not managed: ${current}`); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return target;
}

export function filesAt(base, relative = '') {
  const directory = path.join(base, relative);
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en')).flatMap(entry => {
    const name = path.posix.join(relative, entry.name);
    assert(!entry.isSymbolicLink(), `Symlink in source: ${name}`);
    return entry.isDirectory() ? filesAt(base, name) : [name];
  });
}

// Authoring uses the portable mapping/scalar subset of YAML, deliberately excluding
// client hooks, executable metadata and custom top-level fields.
export function frontmatter(text, label) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  assert(match, `Missing frontmatter: ${label}`);
  const allowed = new Set(['name', 'description', 'license', 'compatibility', 'metadata', 'allowed-tools']);
  const result = {}; let parent;
  for (const line of match[1].split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const item = line.match(/^(  )?([a-zA-Z0-9_-]+):(?: (.*))?$/);
    assert(item, `Unsupported YAML syntax in ${label}: ${line}`);
    const [, indent, key, raw] = item;
    if (indent) {
      assert(parent === 'metadata' && raw !== undefined, `Invalid nested field in ${label}`);
      assert(!(key in result.metadata), `Duplicate metadata ${key}: ${label}`);
      result.metadata[key] = scalar(raw);
    } else {
      assert(allowed.has(key) && !(key in result), `Unknown/duplicate field ${key}: ${label}`);
      parent = key;
      result[key] = key === 'metadata' ? {} : scalar(raw);
      assert(key !== 'metadata' || raw === undefined, `metadata must be a mapping: ${label}`);
    }
  }
  assert(nameValid(result.name), `Invalid skill name: ${label}`);
  assert(typeof result.description === 'string' && result.description.length > 0 && result.description.length <= 1024, `Invalid description: ${label}`);
  assert(!result.compatibility || result.compatibility.length <= 500, `Compatibility too long: ${label}`);
  return result;
}
function scalar(raw) {
  assert(raw !== undefined && raw.length > 0, 'Empty scalar');
  if (raw.startsWith('"')) return JSON.parse(raw);
  if (raw.startsWith("'")) { assert(raw.endsWith("'"), 'Unclosed YAML string'); return raw.slice(1, -1).replaceAll("''", "'"); }
  assert(!/^[\[\]{|>&*!]/.test(raw) && !/:\s/.test(raw) && !/\s#/.test(raw), `Quote YAML scalar: ${raw}`);
  return raw;
}

export function closure(catalog, selected, kind = 'skills') {
  const ordered = []; const visiting = new Set(); const seen = new Set();
  function visit(name) {
    assert(catalog[kind][name], `Unknown ${kind} dependency: ${name}`);
    assert(!visiting.has(name), `Dependency cycle: ${name}`);
    if (seen.has(name)) return;
    visiting.add(name);
    for (const dep of catalog[kind][name].dependencies) visit(dep);
    visiting.delete(name); seen.add(name); ordered.push(name);
  }
  selected.forEach(visit); return ordered;
}

export function manifest(catalog, name, portable = true) {
  const { version, description, author, keywords } = catalog.packages[name];
  return { ...(portable ? { $schema: schema } : {}), name, version, description, author, keywords };
}

export function validateManifest(value, portable = true) {
  const allowed = new Set(['$schema', 'name', 'version', 'description', 'author', 'homepage', 'repository', 'license', 'keywords', 'extensions']);
  assert(value && typeof value === 'object' && !Array.isArray(value), 'Manifest must be an object');
  assert(Object.keys(value).every(key => allowed.has(key)), 'Unknown plugin manifest property');
  assert(!portable || value.$schema === schema, 'Invalid Agent Plugins schema');
  assert(nameValid(value.name) && semver(value.version), 'Invalid plugin identity/version');
  for (const field of ['description', 'homepage', 'repository', 'license']) assert(value[field] === undefined || typeof value[field] === 'string', `Invalid plugin ${field}`);
  if (value.author) {
    assert(typeof value.author === 'object' && !Array.isArray(value.author) && Object.keys(value.author).every(key => ['name', 'email', 'url'].includes(key) && typeof value.author[key] === 'string'), 'Invalid plugin author');
  }
  assert(value.keywords === undefined || Array.isArray(value.keywords) && value.keywords.every(word => typeof word === 'string'), 'Invalid plugin keywords');
  if (value.extensions) assert(typeof value.extensions === 'object' && !Array.isArray(value.extensions) && Object.values(value.extensions).every(entry => entry && typeof entry === 'object' && !Array.isArray(entry)), 'Invalid plugin extensions');
  return value;
}

export function skillBundle(source, catalog, name) {
  const skill = catalog.skills[name]; const directory = safePath(source, skill.source);
  const output = new Map();
  const references = closure(catalog, skill.references, 'references');
  const rewrite = text => text.replace(/\]\(\.\.\/\.\.\/standards\/([a-z0-9-]+)\.md(#[^)]*)?\)/g, (_, ref, anchor = '') => {
    assert(references.includes(ref), `Undeclared reference ${ref}: ${name}`);
    return `](references/${ref}.md${anchor})`;
  });
  for (const relative of filesAt(directory)) {
    const file = safePath(directory, relative);
    const bytes = fs.readFileSync(file);
    output.set(relative, { bytes: relative.endsWith('.md') ? Buffer.from(rewrite(bytes.toString())) : bytes, mode: fs.statSync(file).mode & 0o111 ? 0o755 : 0o644 });
  }
  for (const reference of references) {
    const ref = catalog.references[reference];
    const bytes = fs.readFileSync(safePath(source, ref.source));
    output.set(`references/${reference}.md`, { bytes, mode: 0o644 });
  }
  validateLinks(output, name);
  return output;
}

export function markdownLinks(text) {
  const prose = text.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '');
  return [...prose.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map(match => match[1].replace(/^<|>$/g, ''));
}
export function validateLinks(files, label) {
  for (const [file, { bytes }] of files) {
    if (!file.endsWith('.md')) continue;
    const text = bytes.toString();
    const resourcePattern = file === 'SKILL.md' || file.endsWith('/SKILL.md') ? /`((?:references|scripts|assets)\/[a-zA-Z0-9_./-]+\.[a-zA-Z0-9]+)`/g : /`(references\/[a-z0-9-]+\.md)`/g;
    const links = [...markdownLinks(text), ...[...text.matchAll(resourcePattern)].map(m => m[1])];
    for (const link of links) {
      if (/^(https?:|mailto:|#)/.test(link)) continue;
      assert(!/^[a-z]+:|^\//i.test(link), `Nonportable link ${link}: ${label}/${file}`);
      const [target, fragment] = link.split('#');
      const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), decodeURIComponent(target)));
      assert(!resolved.startsWith('../') && files.has(resolved), `Broken/escaping link ${link}: ${label}/${file}`);
      if (fragment) {
        const anchors = [...files.get(resolved).bytes.toString().matchAll(/^#{1,6} (.+)$/gm)].map(m => m[1].toLowerCase().replace(/[^\p{L}\p{N}_\- ]/gu, '').replaceAll(' ', '-'));
        assert(anchors.includes(fragment), `Missing anchor ${link}: ${label}/${file}`);
      }
    }
  }
}

export function generated(source = root) {
  const catalog = catalogAt(source); const output = new Map();
  for (const [name, pkg] of Object.entries(catalog.packages)) {
    const prefix = pkg.output === '.' ? '' : `${pkg.output}/`;
    output.set(`${prefix}plugin.json`, { bytes: Buffer.from(json(validateManifest(manifest(catalog, name)))), mode: 0o644 });
    output.set(`${prefix}.claude-plugin/plugin.json`, { bytes: Buffer.from(json(validateManifest(manifest(catalog, name, false), false))), mode: 0o644 });
    for (const skill of closure(catalog, pkg.skills)) {
      for (const [file, entry] of skillBundle(source, catalog, skill)) output.set(`${prefix}skills/${skill}/${file}`, entry);
    }
  }
  output.set('.claude-plugin/marketplace.json', { bytes: Buffer.from(json({ ...catalog.marketplace, plugins: Object.entries(catalog.packages).map(([name, pkg]) => ({ name, source: pkg.output === '.' ? './' : `./${pkg.output}`, description: pkg.description, category: 'workflow' })) })), mode: 0o644 });
  return output;
}

export function validate(source = root, drift = true) {
  const catalog = catalogAt(source);
  assert(catalog.schemaVersion === 1 && semver(catalog.release), 'Invalid catalog version');
  for (const [name, skill] of Object.entries(catalog.skills)) {
    assert(nameValid(name), `Invalid catalog skill: ${name}`);
    assert(Array.isArray(skill.dependencies) && Array.isArray(skill.references), `Invalid dependencies: ${name}`);
    const meta = frontmatter(fs.readFileSync(safePath(source, `${skill.source}/SKILL.md`), 'utf8'), name);
    assert(meta.name === name, `Folder/name mismatch: ${name}`);
    assert(semver(meta.metadata?.version), `Missing metadata version: ${name}`);
    closure(catalog, [name]); closure(catalog, skill.references, 'references');
  }
  assert(catalog.skills['dotnet10-migration'].dependencies.includes('github-project-iteration-issue'), 'Missing migration dependency');
  for (const [name, ref] of Object.entries(catalog.references)) { safePath(source, ref.source); closure(catalog, [name], 'references'); }
  const registry = readJSON(path.join(source, 'standards/registry.json')); const ids = new Set();
  for (const rule of registry.rules) {
    assert(/^AVI-[A-Z0-9]+-\d{3}$/.test(rule.id) && !ids.has(rule.id), `Invalid/duplicate rule: ${rule.id}`); ids.add(rule.id);
    assert(['adopted', 'recommendation', 'unverified'].includes(rule.status) && rule.applicability && rule.maintainer && rule.sources?.length, `Missing rule metadata: ${rule.id}`);
    const content = fs.readFileSync(safePath(source, `standards/${rule.file}`), 'utf8');
    assert(content.includes(`## ${rule.id}\n`) && content.includes(`**${rule.status}**`), `Rule missing from reference: ${rule.id}`);
  }
  const destinations = new Set();
  for (const [name, pkg] of Object.entries(catalog.packages)) {
    assert(nameValid(name) && semver(pkg.version) && pkg.description && pkg.author?.name && pkg.keywords?.length, `Invalid package: ${name}`);
    assert(pkg.output === '.' || safePath(source, pkg.output), `Invalid package output: ${name}`);
    assert(!destinations.has(pkg.output), `Duplicate package output: ${pkg.output}`); destinations.add(pkg.output);
    assert(new Set(pkg.skills).size === pkg.skills.length, `Duplicate package skill: ${name}`);
    assert(closure(catalog, pkg.skills).every(skill => pkg.skills.includes(skill)), `Package dependency not included: ${name}`);
  }
  const output = generated(source);
  if (drift) {
    const index = path.join(source, 'tooling/generated-files.json');
    assert(fs.existsSync(index) && fs.readFileSync(index, 'utf8') === json([...output.keys()].sort()), 'Generated index drift; run npm run build');
    for (const [file, entry] of output) {
      const destination = safePath(source, file);
      assert(fs.existsSync(destination) && fs.readFileSync(destination).equals(entry.bytes) && (fs.statSync(destination).mode & 0o111 ? 0o755 : 0o644) === entry.mode, `Generated drift: ${file}; run npm run build`);
    }
    for (const directory of ['skills', 'plugins']) for (const file of filesAt(path.join(source, directory))) assert(output.has(`${directory}/${file}`), `Unexpected generated file: ${directory}/${file}`);
  }
  const documents = new Map();
  for (const directory of ['standards', 'skill-sources', 'docs', 'adapters', 'tests', 'tooling']) for (const file of filesAt(path.join(source, directory))) documents.set(`${directory}/${file}`, { bytes: fs.readFileSync(path.join(source, directory, file)) });
  for (const file of ['README.md', 'CHANGELOG.md', 'AGENTS.md']) if (fs.existsSync(path.join(source, file))) documents.set(file, { bytes: fs.readFileSync(path.join(source, file)) });
  // Local authoring references may target non-Markdown files; include those too.
  for (const file of ['catalog.json', 'package.json']) documents.set(file, { bytes: fs.readFileSync(path.join(source, file)) });
  for (const [file, entry] of output) documents.set(file, entry);
  validateLinks(documents, 'source');
  return { skills: Object.keys(catalog.skills).length, rules: ids.size, generatedFiles: output.size };
}

export function writeFiles(base, entries) {
  for (const [relative, entry] of entries) {
    const target = safePath(base, relative); fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, entry.bytes, { mode: entry.mode }); fs.chmodSync(target, entry.mode);
  }
}

// Fixed timestamps, sorted USTAR entries and normalized modes make archives reproducible.
export function archive(entries) {
  const blocks = [];
  for (const [name, entry] of [...entries].sort(([a], [b]) => a.localeCompare(b, 'en'))) {
    const header = Buffer.alloc(512); const split = name.length > 100 ? name.lastIndexOf('/') : -1;
    const leaf = split < 0 ? name : name.slice(split + 1); const prefix = split < 0 ? '' : name.slice(0, split);
    assert(Buffer.byteLength(leaf) <= 100 && Buffer.byteLength(prefix) <= 155, `Archive path too long: ${name}`);
    header.write(leaf, 0, 100); header.write(prefix, 345, 155);
    const octal = (offset, size, value) => header.write(value.toString(8).padStart(size - 1, '0') + '\0', offset, size);
    octal(100, 8, entry.mode); octal(108, 8, 0); octal(116, 8, 0); octal(124, 12, entry.bytes.length); octal(136, 12, 0);
    header.fill(32, 148, 156); header.write('0', 156); header.write('ustar\0', 257); header.write('00', 263);
    const checksum = header.reduce((sum, byte) => sum + byte, 0); header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 8);
    blocks.push(header, entry.bytes, Buffer.alloc((512 - entry.bytes.length % 512) % 512));
  }
  return gzipSync(Buffer.concat([...blocks, Buffer.alloc(1024)]), { level: 9 });
}
export function sourceInfo(source, catalog) {
  let commit = null; let dirty = null;
  if (fs.existsSync(path.join(source, '.avi-source-commit'))) {
    commit = fs.readFileSync(path.join(source, '.avi-source-commit'), 'utf8').trim();
    assert(/^[a-f0-9]{40,64}$/.test(commit), 'Invalid archived source commit'); dirty = false;
  }
  if (!commit) try {
    commit = execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    dirty = !!execFileSync('git', ['-C', source, 'status', '--porcelain'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch { /* archives may have no .git */ }
  const entries = generated(source);
  const inputs = [...entries].map(([name, entry]) => `${name}:${sha(entry.bytes)}:${entry.mode}`);
  inputs.push(`catalog:${sha(json(catalog))}`);
  for (const file of filesAt(path.join(source, 'adapters'))) inputs.push(`adapter/${file}:${sha(fs.readFileSync(path.join(source, 'adapters', file)))}`);
  const digest = sha(inputs.sort().join('\n'));
  return { release: catalog.release, commit, dirty, digest };
}
export function build(source = root) {
  validate(source, false);
  const catalog = catalogAt(source); const output = generated(source);
  // Remove only previous generated paths, never authoring sources or unrelated files.
  const index = path.join(source, 'tooling/generated-files.json');
  if (fs.existsSync(index)) for (const file of readJSON(index)) if (!output.has(file)) fs.rmSync(safePath(source, file), { force: true });
  writeFiles(source, output); fs.writeFileSync(index, json([...output.keys()].sort()));
  const artifacts = new Map();
  for (const [name, skill] of Object.entries(catalog.skills)) {
    const entries = new Map([...skillBundle(source, catalog, name)].map(([file, entry]) => [`${name}/${file}`, entry]));
    const meta = frontmatter(entries.get(`${name}/SKILL.md`).bytes.toString(), name);
    artifacts.set(`${name}-${meta.metadata.version}.tar.gz`, { bytes: archive(entries), mode: 0o644 });
  }
  for (const [name, pkg] of Object.entries(catalog.packages)) {
    const entries = new Map();
    entries.set(`${name}/plugin.json`, { bytes: Buffer.from(json(manifest(catalog, name))), mode: 0o644 });
    entries.set(`${name}/.claude-plugin/plugin.json`, { bytes: Buffer.from(json(manifest(catalog, name, false))), mode: 0o644 });
    for (const skill of closure(catalog, pkg.skills)) for (const [file, entry] of skillBundle(source, catalog, skill)) entries.set(`${name}/skills/${skill}/${file}`, entry);
    artifacts.set(`${name}-${pkg.version}.tar.gz`, { bytes: archive(entries), mode: 0o644 });
  }
  artifacts.set('SHA256SUMS', { bytes: Buffer.from([...artifacts].map(([file, entry]) => `${sha(entry.bytes)}  ${file}`).sort().join('\n') + '\n'), mode: 0o644 });
  artifacts.set('release.json', { bytes: Buffer.from(json({ ...sourceInfo(source, catalog), packages: Object.fromEntries(Object.entries(catalog.packages).map(([name, pkg]) => [name, pkg.version])) })), mode: 0o644 });
  const distribution = path.join(source, 'dist');
  const artifactIndex = safePath(distribution, '.generated-files.json');
  if (fs.existsSync(artifactIndex)) for (const file of readJSON(artifactIndex)) if (!artifacts.has(file)) fs.rmSync(safePath(distribution, file), { force: true });
  writeFiles(distribution, artifacts);
  fs.writeFileSync(artifactIndex, json([...artifacts.keys()].sort()));
  return { generatedFiles: output.size, artifacts: artifacts.size };
}
