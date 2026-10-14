import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { root } from '../tooling/core.mjs';

const script = path.join(root, 'skills/github-project-iteration-issue/scripts/create_stories.sh');
function run(t, overrides = {}, args = []) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'avi-gh-')); t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const log = path.join(directory, 'calls.jsonl'); const body = path.join(directory, 'body.txt');
  fs.writeFileSync(path.join(directory, 'gh'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2); const env = process.env;
fs.appendFileSync(env.AVI_MOCK_LOG, JSON.stringify(args)+'\\n');
const get = name => args[args.indexOf(name)+1];
if(args[0]==='label') console.log(env.AVI_MISSING_LABEL ? 'backlog' : 'backlog\\nneeds triage\\nfeature');
else if(args[0]==='project' && args[1]==='view') console.log('PROJECT_ID');
else if(args[0]==='api' && args[1].startsWith('users/')) console.log(env.AVI_OWNER_TYPE || 'Organization');
else if(args[0]==='api' && args[1]==='graphql') {
  const root = env.AVI_OWNER_TYPE === 'User' ? 'user' : 'organization';
  console.log(JSON.stringify({data:{[root]:{projectV2:{fields:{nodes:[{id:'FIELD_ID',name:'Iteration',configuration:{iterations:[{id:'ITERATION_ID', title:'Active Iteration',startDate:new Date().toISOString().slice(0,10),duration:14}]}}]}}}}}));
} else if(args[0]==='issue' && args[1]==='create') {
  if(env.AVI_CREATE_FAIL) { console.error('mocked permission failure'); process.exit(1); }
  fs.writeFileSync(env.AVI_MOCK_BODY, fs.readFileSync(get('--body-file')));
  console.log('https://github.com/ExampleOwner/example/issues/42');
} else if(args[0]==='project' && args[1]==='item-add') console.log('ITEM_ID');
else if(args[0]==='project' && args[1]==='item-edit') console.log('updated');
else { console.error('Unexpected mocked gh call'); process.exit(1); }
`, { mode: 0o755 });
  const input = '## Description\nLiteral $() and `backticks` stay in the body.\n\n- [ ] GIVEN input\n      WHEN processed\n      THEN preserve text\n';
  const environment = { ...process.env, PATH: `${directory}:${process.env.PATH}`, AVI_MOCK_LOG: log, AVI_MOCK_BODY: body, ...overrides };
  // Prevent ambient story env vars from changing test inputs.
  for (const name of ['ISSUE_TITLE', 'ISSUE_BODY', 'ISSUE_BODY_FILE', 'OWNER', 'REPO', 'PROJECT_NUMBER', 'ITERATION_TITLE', 'LABELS']) delete environment[name];
  const result = spawnSync('bash', [script, '--title', 'feat: Add example behavior', '--body-file', '-', '--owner', 'ExampleOwner', '--repo', 'example', '--project', '3', '--iteration', 'current', '--labels', 'feature', ...args], { env: environment, input, encoding: 'utf8' });
  const calls = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse) : [];
  return { result, calls, body: fs.existsSync(body) ? fs.readFileSync(body, 'utf8') : null, input };
}
test('legacy script validates then creates, adds and assigns an iteration with literal stdin body', t => {
  const { result, calls, body, input } = run(t);
  assert.equal(result.status, 0, result.stdout + result.stderr); assert.equal(body, input);
  const create = calls.findIndex(call => call[0] === 'issue'); const lookup = calls.findIndex(call => call[0] === 'api' && call[1] === 'graphql');
  assert(lookup >= 0 && lookup < create);
  const labels = calls[create]; assert.equal(labels[labels.indexOf('--label') + 1], 'backlog,needs triage,feature');
  assert.deepEqual(calls.at(-1), ['project', 'item-edit', '--id', 'ITEM_ID', '--project-id', 'PROJECT_ID', '--field-id', 'FIELD_ID', '--iteration-id', 'ITERATION_ID']);
});
test('user-owned project and literal iteration title are supported', t => {
  const { result, calls } = run(t, { AVI_OWNER_TYPE: 'User' }, ['--iteration', 'Active Iteration']);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const graphql = calls.find(call => call[0] === 'api' && call[1] === 'graphql'); assert(graphql[graphql.indexOf('-f') + 1].includes('user(login:'));
});
test('unknown iterations and missing labels fail before any issue mutation', t => {
  for (const [env, args] of [[{}, ['--iteration', 'Expired Iteration']], [{ AVI_MISSING_LABEL: '1' }, []]]) {
    const { result, calls } = run(t, env, args); assert.notEqual(result.status, 0);
    assert(!calls.some(call => call[0] === 'issue' || call[1] === 'item-add' || call[1] === 'item-edit'));
  }
});
test('issue creation failure is reported and does not add a project item', t => {
  const { result, calls } = run(t, { AVI_CREATE_FAIL: '1' }); assert.notEqual(result.status, 0);
  assert(result.stdout.includes('gh issue create failed')); assert(!calls.some(call => call[1] === 'item-add'));
});
test('help and missing required inputs retain the legacy interface', () => {
  const help = spawnSync('bash', [script, '--help'], { encoding: 'utf8' }); assert.equal(help.status, 0); assert(help.stdout.includes('--body-file'));
  const invalid = spawnSync('bash', [script, '--title'], { encoding: 'utf8' }); assert.notEqual(invalid.status, 0); assert(invalid.stdout.includes('Missing value'));
});
