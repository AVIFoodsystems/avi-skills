import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { root, assert, json, sha, readJSON, safePath, filesAt, catalogAt, closure, skillBundle, manifest, sourceInfo, validate } from './core.mjs';

export const clientDirectories = { codex: '.agents/skills', claude: '.claude/skills', kiro: '.kiro/skills' };
const begin = '<!-- avi-skills:start -->'; const end = '<!-- avi-skills:end -->';
const receiptName = scope => scope === 'user' ? '.avi-skills/receipt.json' : 'avi-skills.lock.json';
const buffer = text => Buffer.from(text);
const getBlock = bytes => {
  const text = bytes.toString(); const start = text.indexOf(begin); const finish = text.indexOf(end);
  assert((start < 0 && finish < 0) || (start >= 0 && finish > start), 'Invalid AVI managed block');
  assert(text.indexOf(begin, start + begin.length) < 0 && text.indexOf(end, finish + end.length) < 0, 'Duplicate AVI managed block');
  return start < 0 ? null : buffer(text.slice(start, finish + end.length));
};
function mergeBlock(existing, desired) {
  const old = getBlock(existing);
  if (old) return buffer(existing.toString().replace(old.toString(), desired?.toString() || ''));
  return buffer(existing.toString() + (existing.length && !existing.toString().endsWith('\n') ? '\n' : '') + desired.toString() + '\n');
}
function template(source, file, values) {
  return fs.readFileSync(path.join(source, 'adapters', file), 'utf8').replace(/\{\{([a-zA-Z]+)\}\}/g, (_, name) => {
    assert(values[name] !== undefined, `Missing template value: ${name}`); return values[name];
  }).trim();
}
function ownedBlock(text) { return buffer(`${begin}\n${text}\n${end}`); }
export function readReceipt(target, scope = 'repository') {
  const file = safePath(target, receiptName(scope));
  if (!fs.existsSync(file)) return null;
  const receipt = readJSON(file);
  assert(receipt.schemaVersion === 1 && receipt.owner === 'avi-skills' && receipt.scope === scope && receipt.files && receipt.source?.digest, `Invalid receipt: ${file}`);
  for (const [name, entry] of Object.entries(receipt.files)) {
    safePath(target, name);
    assert(/^[a-f0-9]{64}$/.test(entry.sha256) && ['file', 'block'].includes(entry.kind) && Number.isInteger(entry.mode) && entry.mode >= 0 && entry.mode <= 0o777, `Invalid receipt entry: ${name}`);
  }
  return receipt;
}
function actualEntry(target, name, entry) {
  const file = safePath(target, name);
  if (!fs.existsSync(file)) return null;
  const stat = fs.statSync(file); assert(stat.isFile(), `Expected file: ${file}`);
  const bytes = fs.readFileSync(file);
  const owned = entry.kind === 'block' ? getBlock(bytes) : bytes;
  return { bytes, checksum: owned ? sha(owned) : null, mode: stat.mode & 0o777 };
}
function selection(catalog, options, old) {
  const packages = options.packages || old?.packages || ['avi-engineering'];
  for (const name of packages) assert(catalog.packages[name], `Unknown package: ${name}`);
  const packageSkills = [...new Set(packages.flatMap(name => catalog.packages[name].skills))];
  const skills = closure(catalog, options.skills || (options.packages ? packageSkills : old?.skills || packageSkills));
  assert(skills.every(name => packageSkills.includes(name)), 'Selected skills/dependencies are outside selected packages');
  const clients = options.clients || old?.clients || ['codex'];
  assert(clients.length > 0 && clients.every(name => clientDirectories[name]) && new Set(clients).size === clients.length, 'Clients must be unique codex, claude or kiro');
  const mode = options.mode || old?.mode || 'standalone';
  assert(['standalone', 'native', 'compat'].includes(mode), 'Mode must be standalone, native or compat');
  assert(mode !== 'compat' || clients.every(name => name === 'kiro'), 'Compatibility mode is for Kiro custom agents');
  return { packages, skills, clients, mode };
}
export function desiredInstallation(source, catalog, target, options, old) {
  const chosen = selection(catalog, options, old); const entries = new Map();
  const info = sourceInfo(source, catalog);
  if (options.release) assert(options.release === info.release, `Source release ${info.release} does not match requested ${options.release}; select its checkout with --source or --ref`);
  const values = { packages: chosen.packages.join(', '), release: info.release, skillPaths: chosen.clients.map(client => clientDirectories[client]).join(', ') };
  function file(name, entry, client) { entries.set(name, { ...entry, kind: 'file', client }); }
  if (chosen.mode === 'native') {
    assert(options.scope === 'user', 'Native packages use user scope; repository bundles use standalone skills');
    // Stage immutable packages inside their own local marketplace. No client config
    // is rewritten and native activation remains a visible client operation.
    const selectionDigest = sha(json({ packages: [...chosen.packages].sort(), skills: [...chosen.skills].sort() })).slice(0, 8);
    const marketplaceRoot = `.avi-skills/marketplaces/${info.release}-${info.digest.slice(0, 12)}-${selectionDigest}`;
    for (const pkg of chosen.packages) {
      const base = `${marketplaceRoot}/plugins/${pkg}`;
      file(`${base}/plugin.json`, { bytes: buffer(json(manifest(catalog, pkg))), mode: 0o644 }, 'native');
      file(`${base}/.claude-plugin/plugin.json`, { bytes: buffer(json(manifest(catalog, pkg, false))), mode: 0o644 }, 'native');
      for (const skill of chosen.skills.filter(name => catalog.packages[pkg].skills.includes(name))) for (const [name, entry] of skillBundle(source, catalog, skill)) file(`${base}/skills/${skill}/${name}`, entry, 'native');
    }
    file(`${marketplaceRoot}/.agents/plugins/marketplace.json`, { bytes: buffer(json({ name: 'avi-skills', plugins: chosen.packages.map(name => ({ name, source: { source: 'local', path: `./plugins/${name}` }, policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' }, category: 'Productivity' })) })), mode: 0o644 }, 'native');
    file(`${marketplaceRoot}/.claude-plugin/marketplace.json`, { bytes: buffer(json({ ...catalog.marketplace, plugins: chosen.packages.map(name => ({ name, source: `./plugins/${name}` })) })), mode: 0o644 }, 'native');
    values.marketplaceRoot = path.join(target, marketplaceRoot);
  } else {
    for (const client of chosen.clients) {
      for (const skill of chosen.skills) for (const [name, entry] of skillBundle(source, catalog, skill)) file(`${clientDirectories[client]}/${skill}/${name}`, entry, client);
      if (client === 'kiro' && chosen.mode === 'compat') {
        const routes = chosen.skills.map(name => `- ${name}: read ${path.join(target, clientDirectories.kiro, name, 'SKILL.md')}`).join('\n');
        file('.kiro/avi-routing.md', { bytes: buffer(template(source, 'kiro-routing.md.tmpl', { ...values, routes }) + '\n'), mode: 0o644 }, client);
        const agent = readJSON(path.join(source, 'adapters/kiro-agent.json'));
        agent.resources = [`file://${path.join(target, '.kiro/avi-routing.md')}`];
        file('.kiro/agents/avi.json', { bytes: buffer(json(agent)), mode: 0o644 }, client);
      }
    }
    if (options.scope === 'repository') {
      entries.set('AGENTS.md', { bytes: ownedBlock(template(source, 'AGENTS.md.tmpl', values)), mode: 0o644, kind: 'block', client: 'shared' });
      if (chosen.clients.includes('claude')) entries.set('CLAUDE.md', { bytes: ownedBlock(template(source, 'CLAUDE.md.tmpl', values)), mode: 0o644, kind: 'block', client: 'claude' });
    }
  }
  return { entries, chosen, info, values };
}
export function install(options = {}) {
  const source = path.resolve(options.source || root); const scope = options.scope || 'repository';
  assert(['repository', 'user'].includes(scope), 'Scope must be repository or user');
  const target = path.resolve(options.target || (scope === 'user' ? os.homedir() : process.cwd()));
  assert(target !== source, 'Choose a consuming repository or isolated directory, not the authoring repository');
  const receiptFile = safePath(target, receiptName(scope)); const old = readReceipt(target, scope);
  if (options.update) assert(old, 'No installation receipt; use install first');
  validate(source);
  const catalog = catalogAt(source); const desired = desiredInstallation(source, catalog, target, { ...options, scope }, old);
  const duplicateIssues = findDuplicates(target, options.home || os.homedir(), desired.chosen, scope);
  if (scope === 'user' && desired.chosen.mode !== 'native') {
    const repository = path.resolve(options.repository || process.cwd());
    if (repository !== target) {
      const local = readReceipt(repository, 'repository');
      if (local) for (const client of desired.chosen.clients) for (const skill of desired.chosen.skills) {
        if (local.clients.includes(client) && local.skills.includes(skill)) duplicateIssues.push(`Duplicate ${skill} for ${client}: disable the repository installation at ${repository} before enabling user guidance.`);
      }
    }
  }
  const blockingDuplicates = duplicateIssues.filter(message => !message.startsWith('Potential native duplicate'));
  assert(blockingDuplicates.length === 0, blockingDuplicates.join('\n'));
  const conflicts = []; const actions = []; const mutations = new Map();
  const retainedNative = {};
  // Preflight the entire operation before the first write, including removed files.
  for (const [name, entry] of Object.entries(old?.files || {})) {
    const actual = actualEntry(target, name, entry);
    if (actual && (actual.checksum !== entry.sha256 || (entry.kind === 'file' && actual.mode !== entry.mode))) conflicts.push(`Modified managed file: ${name}`);
    if (!desired.entries.has(name) && actual) {
      if (old.mode === 'native' && desired.chosen.mode === 'native') { retainedNative[name] = entry; continue; }
      mutations.set(name, entry.kind === 'block' ? { bytes: mergeBlock(actual.bytes, null), mode: actual.mode } : null);
      actions.push({ action: 'remove', path: name });
    }
  }
  const receiptEntries = { ...retainedNative };
  for (const [name, entry] of desired.entries) {
    const destination = safePath(target, name); const previous = old?.files[name];
    const exists = fs.existsSync(destination);
    assert(!exists || fs.statSync(destination).isFile(), `Expected regular file: ${name}`);
    const current = exists ? fs.readFileSync(destination) : buffer('');
    if (!previous && exists && (entry.kind === 'file' || getBlock(current))) conflicts.push(`Unowned file/block exists: ${name}`);
    const bytes = entry.kind === 'block' ? mergeBlock(current, entry.bytes) : entry.bytes;
    const mode = entry.kind === 'block' && exists ? fs.statSync(destination).mode & 0o777 : entry.mode;
    if (!exists || !current.equals(bytes) || (fs.statSync(destination).mode & 0o777) !== mode) {
      mutations.set(name, { bytes, mode }); actions.push({ action: exists ? 'update' : 'create', path: name });
    }
    receiptEntries[name] = { sha256: sha(entry.bytes), mode, kind: entry.kind, client: entry.client };
  }
  assert(conflicts.length === 0, `${conflicts.join('\n')}\nPreserve or restore local edits before updating; no files changed.`);
  const receipt = { schemaVersion: 1, owner: 'avi-skills', scope, source: desired.info, packages: desired.chosen.packages, packageVersions: Object.fromEntries(desired.chosen.packages.map(name => [name, catalog.packages[name].version])), skills: desired.chosen.skills, clients: desired.chosen.clients, mode: desired.chosen.mode, activation: desired.chosen.mode === 'native' ? 'staged' : 'standalone', files: receiptEntries };
  const receiptBytes = buffer(json(receipt));
  if (!fs.existsSync(receiptFile) || !fs.readFileSync(receiptFile).equals(receiptBytes)) {
    mutations.set(receiptName(scope), { bytes: receiptBytes, mode: 0o644 }); actions.push({ action: 'record', path: receiptName(scope) });
  }
  if (!options.dryRun) applyTransaction(target, mutations);
  return { target, dryRun: !!options.dryRun, actions, release: receipt.source.release, skills: receipt.skills, activation: receipt.activation, ...(duplicateIssues.length ? { warnings: duplicateIssues } : {}), ...(desired.values.marketplaceRoot ? { marketplaceRoot: desired.values.marketplaceRoot, next: desired.chosen.clients.map(client => nativeInstruction(client, desired.values.marketplaceRoot, desired.chosen.packages)) } : {}) };
}
function nativeInstruction(client, directory, packages) {
  if (client === 'codex') return { client, action: 'Register this immutable directory with codex plugin marketplace add, then install/enable the selected packages in the supported client plugin browser.', directory, packages };
  if (client === 'claude') return { client, action: 'Use /plugin marketplace add with this directory, then /plugin install <package>@avi-skills.', directory, packages };
  return { client, action: 'Use Powers > Add Custom Power > Import power from a folder for each plugins/<package> directory on a supported Kiro version.', directory, packages };
}
function applyTransaction(target, mutations) {
  const originals = new Map();
  try {
    for (const [name, entry] of mutations) {
      const file = safePath(target, name);
      originals.set(name, fs.existsSync(file) ? { bytes: fs.readFileSync(file), mode: fs.statSync(file).mode & 0o777 } : null);
      if (!entry) { fs.rmSync(file, { force: true }); continue; }
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, entry.bytes); fs.chmodSync(file, entry.mode);
    }
  } catch (error) {
    for (const [name, entry] of [...originals].reverse()) {
      const file = safePath(target, name);
      if (entry) { fs.writeFileSync(file, entry.bytes); fs.chmodSync(file, entry.mode); }
      else fs.rmSync(file, { force: true });
    }
    throw error;
  }
}
export function check(options = {}) {
  const scope = options.scope || 'repository'; const target = path.resolve(options.target || (scope === 'user' ? os.homedir() : process.cwd()));
  const receipt = readReceipt(target, scope); assert(receipt, 'No avi-skills installation receipt');
  const issues = [];
  for (const [name, entry] of Object.entries(receipt.files)) {
    const actual = actualEntry(target, name, entry);
    if (!actual) issues.push({ type: 'missing', path: name });
    else if (actual.checksum !== entry.sha256 || (entry.kind === 'file' && actual.mode !== entry.mode)) issues.push({ type: 'modified', path: name });
  }
  if (options.release && options.release !== receipt.source.release) issues.push({ type: 'release-conflict', installed: receipt.source.release, required: options.release });
  if (options.source) {
    const source = path.resolve(options.source); validate(source);
    const expected = desiredInstallation(source, catalogAt(source), target, { ...options, scope }, receipt);
    if (expected.info.digest !== receipt.source.digest) issues.push({ type: 'source-conflict', installed: receipt.source.digest, required: expected.info.digest });
  }
  return { ok: issues.length === 0, target, source: receipt.source, activation: receipt.activation, issues };
}
export function uninstall(options = {}) {
  const scope = options.scope || 'repository'; const target = path.resolve(options.target || (scope === 'user' ? os.homedir() : process.cwd()));
  const receipt = readReceipt(target, scope); assert(receipt, 'No avi-skills installation receipt');
  const retained = {}; const actions = []; const mutations = new Map();
  for (const [name, entry] of Object.entries(receipt.files)) {
    const actual = actualEntry(target, name, entry);
    if (actual && (actual.checksum !== entry.sha256 || (entry.kind === 'file' && actual.mode !== entry.mode))) { retained[name] = entry; continue; }
    if (actual) { mutations.set(name, entry.kind === 'block' ? { bytes: mergeBlock(actual.bytes, null), mode: actual.mode } : null); actions.push({ action: 'remove', path: name }); }
  }
  const receiptPath = receiptName(scope);
  mutations.set(receiptPath, Object.keys(retained).length ? { bytes: buffer(json({ ...receipt, files: retained })), mode: 0o644 } : null);
  actions.push({ action: Object.keys(retained).length ? 'retain-receipt' : 'remove', path: receiptPath });
  if (!options.dryRun) applyTransaction(target, mutations);
  return { target, dryRun: !!options.dryRun, actions, retained: Object.keys(retained) };
}
export function findDuplicates(target, home, chosen, scope) {
  const issues = [];
  if (scope === 'repository' && path.resolve(target) !== path.resolve(home)) {
    const managed = readReceipt(home, 'user');
    for (const client of chosen.clients) for (const skill of chosen.skills) {
      if (fs.existsSync(path.join(home, clientDirectories[client], skill, 'SKILL.md'))) issues.push(`Duplicate ${skill} for ${client}: disable the user skill at ${path.join(home, clientDirectories[client], skill)} before installing the repository bundle.`);
      if (client === 'codex' && fs.existsSync(path.join(home, '.codex/skills', skill, 'SKILL.md'))) issues.push(`Duplicate ${skill} for codex: disable the legacy user skill at ${path.join(home, '.codex/skills', skill)} before installing the repository bundle.`);
      if (managed?.mode === 'native' && managed.clients.includes(client) && managed.skills.includes(skill)) issues.push(`Potential native duplicate ${skill} for ${client}: user receipt stages release ${managed.source.release}; disable its active native package before selecting the repository bundle, or uninstall the staged managed installation.`);
    }
  }
  // Detect unowned sibling copies in this installation surface by frontmatter name.
  if (chosen.mode !== 'native') for (const client of chosen.clients) {
    const directory = path.join(target, clientDirectories[client]);
    for (const file of filesAt(directory).filter(file => file.endsWith('/SKILL.md'))) {
      const match = fs.readFileSync(path.join(directory, file), 'utf8').match(/^name: ([a-z0-9-]+)$/m);
      if (match && chosen.skills.includes(match[1]) && file !== `${match[1]}/SKILL.md`) issues.push(`Duplicate ${match[1]} for ${client}: disable ${path.join(directory, file)}.`);
    }
  }
  return issues;
}
export function capabilities() {
  return ['codex', 'claude', 'kiro-cli'].map(command => {
    const result = spawnSync(command, ['--version'], { encoding: 'utf8', timeout: 5000 });
    const help = command === 'codex' && result.status === 0 ? spawnSync(command, ['plugin', '--help'], { encoding: 'utf8', timeout: 5000 }) : null;
    return { command, available: result.status === 0, version: result.status === 0 ? result.stdout.trim() : null, diagnostic: result.status !== 0 ? (result.stderr || result.stdout || result.error?.message || '').trim() : undefined, pluginCommand: help ? help.status === 0 : 'not-probed', behavioralSupport: 'untested' };
  });
}
export function doctor(options = {}) {
  const scope = options.scope || 'repository'; const target = path.resolve(options.target || (scope === 'user' ? os.homedir() : process.cwd()));
  const home = path.resolve(options.home || os.homedir()); const receipt = readReceipt(target, scope);
  const issues = receipt ? check({ ...options, target }).issues : [{ type: 'not-installed' }];
  if (receipt) issues.push(...findDuplicates(target, home, receipt, scope).map(message => ({ type: 'duplicate', message })));
  const managed = target !== home ? readReceipt(home, 'user') : null;
  if (receipt && managed && managed.skills.some(name => receipt.skills.includes(name)) && managed.source.release !== receipt.source.release) issues.push({ type: 'managed-release-conflict', repository: receipt.source.release, managed: managed.source.release });
  if (options.repository) {
    const requirement = readReceipt(path.resolve(options.repository), 'repository');
    if (receipt && requirement && receipt.source.release !== requirement.source.release) issues.push({ type: 'repository-release-conflict', installed: receipt.source.release, required: requirement.source.release });
    if (receipt && requirement && receipt.clients.some(client => requirement.clients.includes(client)) && receipt.skills.some(skill => requirement.skills.includes(skill))) issues.push({ type: 'duplicate', message: `User and repository guidance overlap: disable the source at ${target} or ${path.resolve(options.repository)} for the affected client/skill.` });
  }
  return { target, clients: options.probe === false ? [] : capabilities(), installation: receipt ? { release: receipt.source.release, mode: receipt.mode, activation: receipt.activation } : null, issues, limitation: 'Native staging does not prove activation. External vendor caches and IDE versions require separate client verification; receipts report only AVI-managed installations.' };
}
