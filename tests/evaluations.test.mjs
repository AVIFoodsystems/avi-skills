import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { root, readJSON } from '../tooling/core.mjs';
import { prepare, releaseGate } from '../tooling/evaluate.mjs';
test('release gate refuses untested combinations or passes without outcome evidence', () => {
  const matrix = { entries: [{ id: 'client', required: true, mode: 'standalone', invocations: ['explicit', 'automatic'] }] };
  const scenarios = { scenarios: [{ id: 'classic', requiredOutcomes: ['preserve-classic', 'string-id'] }] };
  assert.equal(releaseGate({ runs: [] }, matrix, scenarios).missing.length, 2);
  const run = { matrixId: 'client', scenarioId: 'classic', invocation: 'explicit', status: 'passed', clientVersion: '1.0', model: 'evaluated-model', reviewer: 'reviewer', date: '2026-10-12', installationMode: 'standalone', loadedReferences: ['ngrx-classic.md'], evidence: ['reviewed-artifact'], outcomes: { 'preserve-classic': true, 'string-id': true } };
  assert.equal(releaseGate({ runs: [run] }, matrix, scenarios).missing.length, 1);
  assert.equal(releaseGate({ runs: [run, { ...run, invocation: 'automatic' }] }, matrix, scenarios).supported, true);
  assert.equal(releaseGate({ runs: [run, { ...run, invocation: 'automatic', evidence: [] }] }, matrix, scenarios).supported, false);
  assert.equal(releaseGate(readJSON(path.join(root, 'tests/evaluations/results.json')), readJSON(path.join(root, 'tests/evaluations/matrix.json')), readJSON(path.join(root, 'tests/evaluations/scenarios.json'))).supported, false);
});
test('pilot preparation installs isolated non-Nx, Nx and mobile context without claiming behavior', t => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'avi-eval-')); t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const output = path.join(base, 'pilot'); const result = prepare(output);
  assert.equal(result.installations, 4); assert.equal(result.behavioralStatus, 'untested');
  assert(fs.existsSync(path.join(output, 'fixtures/non-nx/.agents/skills/avi-ngrx/references/ngrx-classic.md')));
  assert(!fs.existsSync(path.join(output, 'fixtures/non-nx/nx.json')));
  assert.throws(() => prepare(output), /new isolated/);
});
