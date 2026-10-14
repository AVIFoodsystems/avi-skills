#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { build, validate, root, assert, json } from './core.mjs';
import { install, check, doctor, uninstall } from './install.mjs';

const commands = ['build', 'validate', 'install', 'update', 'check', 'doctor', 'uninstall'];
const usage = `AVI skills tooling (Node 24)\n\nnode tooling/cli.mjs <${commands.join('|')}> [options]\n\n--target PATH                 Consuming repository or user home\n--scope repository|user       Default: repository\n--clients codex,claude,kiro    Default: codex (updates preserve selection)\n--packages avi-engineering,avi-migration\n--skills NAME,NAME            Dependency closure is included\n--mode standalone|native|compat\n--source PATH                 Local release checkout (default: this repository)\n--ref REF                     Immutable local Git commit/tag; no network fetch\n--release VERSION             Require exact catalog release\n--home PATH                   User home for duplicate diagnostics\n--repository PATH             Compare a user install to a repository lock\n--dry-run                     Preview install/update/uninstall without writes\n--no-probe                    Doctor skips client executables\n\nNative mode stages immutable plugin/Power packages and returns activation steps.\n`;
let temporary;
try {
  assert(Number(process.versions.node.split('.')[0]) === 24, 'Use Node.js 24 LTS');
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === '--help' || args.includes('--help')) { process.stdout.write(usage); }
  else {
    assert(commands.includes(command), `Unknown command: ${command}`);
    const options = {};
    const boolean = { '--dry-run': 'dryRun', '--no-probe': 'noProbe' };
    const flags = new Set(['target', 'scope', 'clients', 'packages', 'skills', 'mode', 'source', 'ref', 'release', 'home', 'repository']);
    for (let i = 0; i < args.length; i++) {
      const flag = args[i];
      if (boolean[flag]) { options[boolean[flag]] = true; continue; }
      assert(flag.startsWith('--') && flags.has(flag.slice(2)), `Unknown option: ${flag}`);
      const value = args[++i]; assert(value && !value.startsWith('--'), `Missing value: ${flag}`);
      const key = flag.slice(2); assert(options[key] === undefined, `Duplicate option: ${flag}`);
      options[key] = ['clients', 'packages', 'skills'].includes(key) ? value.split(',') : value;
    }
    if (options.ref) {
      assert(['install', 'update', 'check', 'doctor'].includes(command), '--ref is for installation/diagnostics');
      const source = path.resolve(options.source || root);
      const commit = execFileSync('git', ['-C', source, 'rev-parse', '--verify', '--end-of-options', `${options.ref}^{commit}`], { encoding: 'utf8' }).trim();
      temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'avi-release-'));
      const tar = execFileSync('git', ['-C', source, 'archive', commit], { maxBuffer: 64 * 1024 * 1024 });
      execFileSync('tar', ['-xf', '-', '-C', temporary], { input: tar });
      // Preserve exact provenance for a Git archive without creating a checkout.
      fs.writeFileSync(path.join(temporary, '.avi-source-commit'), commit);
      options.source = temporary;
    }
    let result;
    if (command === 'build') result = build(options.source);
    else if (command === 'validate') result = validate(options.source);
    else if (command === 'install' || command === 'update') result = install({ ...options, update: command === 'update' });
    else if (command === 'check') result = check(options);
    else if (command === 'doctor') result = doctor({ ...options, probe: !options.noProbe });
    else result = uninstall(options);
    process.stdout.write(json(result));
    if (result.ok === false || result.retained?.length || command === 'doctor' && result.issues.length) process.exitCode = 2;
  }
} catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
finally { if (temporary) fs.rmSync(temporary, { recursive: true, force: true }); }
