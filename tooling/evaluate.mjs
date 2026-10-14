#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root, assert, json, readJSON, safePath } from './core.mjs';
import { install } from './install.mjs';

export function releaseGate(results, matrix, scenarios) {
  const missing = [];
  for (const cell of matrix.entries.filter(entry => entry.required)) for (const scenario of scenarios.scenarios) for (const invocation of cell.invocations) {
    const passes = results.runs.filter(run => run.matrixId === cell.id && run.scenarioId === scenario.id && run.invocation === invocation && run.status === 'passed');
    const evidenced = passes.some(run => run.clientVersion && run.model && run.reviewer && run.date && run.installationMode === cell.mode && run.evidence?.length && Array.isArray(run.loadedReferences) && (scenario.id === 'unrelated' || run.loadedReferences.length) && scenario.requiredOutcomes.every(outcome => run.outcomes?.[outcome] === true));
    if (!evidenced) missing.push(`${cell.id}/${scenario.id}/${invocation}`);
  }
  return { supported: missing.length === 0, missing };
}
export function prepare(output, aviWeb) {
  output = path.resolve(output);
  assert(!fs.existsSync(output), 'Pilot output must be a new isolated directory');
  assert(output !== root && !output.startsWith(root + path.sep), 'Pilot output must be outside the authoring checkout');
  if (aviWeb) assert(!output.startsWith(path.resolve(aviWeb) + path.sep), 'Pilot must be outside avi-web');
  fs.mkdirSync(output, { recursive: true });
  fs.cpSync(path.join(root, 'tests/fixtures'), path.join(output, 'fixtures'), { recursive: true, dereference: false });
  const home = path.join(output, 'home'); fs.mkdirSync(home);
  const reports = [];
  for (const fixture of ['non-nx', 'nx', 'mobile', 'legacy-migration']) reports.push(install({ target: path.join(output, 'fixtures', fixture), clients: ['codex', 'claude', 'kiro'], packages: fixture === 'legacy-migration' ? ['avi-migration'] : ['avi-engineering'], home }));
  if (aviWeb) {
    const source = path.resolve(aviWeb); const target = path.join(output, 'avi-web'); fs.mkdirSync(target);
    const tracked = execFileSync('git', ['-C', source, 'ls-files', '-z'], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).split('\0').filter(Boolean);
    for (const relative of tracked) {
      if (!/^(apps\/|libs\/|docs\/architecture\/|tools\/|package(?:-lock)?\.json$|nx\.json$|tsconfig[^/]*\.json$|eslint[^/]*|AGENTS\.md$)/.test(relative)) continue;
      const file = safePath(source, relative);
      if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
      const destination = safePath(target, relative); fs.mkdirSync(path.dirname(destination), { recursive: true }); fs.copyFileSync(file, destination);
    }
    // Include source documentation edits even when not yet tracked.
    fs.cpSync(path.join(source, 'docs/architecture'), path.join(target, 'docs/architecture'), { recursive: true });
    reports.push(install({ target, clients: ['codex', 'claude', 'kiro'], home }));
  }
  const scenarios = readJSON(path.join(root, 'tests/evaluations/scenarios.json'));
  fs.mkdirSync(path.join(output, 'prompts'));
  for (const scenario of scenarios.scenarios) fs.writeFileSync(path.join(output, 'prompts', `${scenario.id}.md`), `# ${scenario.id}\n\nFixture: ${scenario.fixture}\n\n${scenario.prompt}\n\nFor explicit invocation, select ${scenario.skill || 'no AVI skill'}. For automatic selection, omit explicit skill invocation. Record actual loaded references, client/version, model, installation mode, decisions and artifacts.\n`);
  fs.writeFileSync(path.join(output, 'preparation.json'), json({ kind: 'packaging-and-context-preparation', behavioralStatus: 'untested', reports }));
  return { output, installations: reports.length, behavioralStatus: 'untested' };
}
if (process.argv[1] === import.meta.filename) {
  try {
    const args = process.argv.slice(2);
    if (args.includes('--check')) {
      const result = releaseGate(readJSON(path.join(root, 'tests/evaluations/results.json')), readJSON(path.join(root, 'tests/evaluations/matrix.json')), readJSON(path.join(root, 'tests/evaluations/scenarios.json')));
      process.stdout.write(json(result)); if (!result.supported) process.exitCode = 2;
    } else if (args.includes('--prepare')) {
      const value = key => args.includes(key) ? args[args.indexOf(key) + 1] : undefined;
      assert(value('--output'), 'Provide --output PATH'); process.stdout.write(json(prepare(value('--output'), value('--avi-web'))));
    } else throw new Error('Use --prepare --output PATH [--avi-web PATH] or --check');
  } catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
