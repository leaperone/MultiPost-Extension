import assert from 'node:assert/strict';

process.env.TASK_HANDOFF_SECRET = 'extension-task-handoff-regression-secret';

const { createTaskHandoffToken, verifyTaskHandoffToken } = await import('../src/lib/extension/taskHandoff.server.ts');

const issuedAt = 1_000;
const identity = {
  taskId: 'task-1',
  userId: 'user-1',
  targetClientId: 'client-1',
};
const token = createTaskHandoffToken(identity, issuedAt);

assert.equal(verifyTaskHandoffToken(token, identity, issuedAt + 1), true);
assert.equal(verifyTaskHandoffToken(token, { ...identity, taskId: 'task-2' }, issuedAt + 1), false);
assert.equal(verifyTaskHandoffToken(token, { ...identity, targetClientId: 'client-2' }, issuedAt + 1), false);
assert.equal(verifyTaskHandoffToken(`${token}tampered`, identity, issuedAt + 1), false);
assert.equal(verifyTaskHandoffToken(token, identity, issuedAt + 15 * 60 * 1000), false);

console.log('Extension task handoff token regression checks passed.');
