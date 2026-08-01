import assert from 'node:assert/strict';

import { taskSchema, TaskType } from '../src/routes/api/extension/-types.ts';

const targetClientId = 'client-1';

const draftTask = taskSchema.parse({
  targetClientId,
  taskType: TaskType.DRAFT_POST,
  taskData: {
    draftId: 'draft-1',
    platforms: [{ name: 'DYNAMIC_FACEBOOK' }],
  },
});

assert.equal(draftTask.taskType, TaskType.DRAFT_POST);
assert.equal(draftTask.taskData.draftId, 'draft-1');
assert.equal(typeof draftTask.taskData.timestamp, 'number');

const publishTask = taskSchema.parse({
  targetClientId,
  taskType: TaskType.PUBLISH_POST,
  taskData: {
    platforms: [{ name: 'DYNAMIC_FACEBOOK' }],
    data: {
      title: 'Test post',
      content: 'Test content',
    },
    untrustedField: 'must not be persisted',
  },
});

assert.equal(publishTask.taskType, TaskType.PUBLISH_POST);
assert.equal(publishTask.taskData.isAutoPublish, false);
assert.equal('untrustedField' in publishTask.taskData, false);

const scheduledTask = taskSchema.parse({
  targetClientId,
  taskType: TaskType.SCHEDULE_PUBLISH_POST,
  taskData: {
    platforms: [{ name: 'DYNAMIC_FACEBOOK' }],
    data: { content: 'Scheduled post' },
    timestamp: Date.now() + 60_000,
  },
});

assert.equal(scheduledTask.taskType, TaskType.SCHEDULE_PUBLISH_POST);
assert.equal(scheduledTask.taskData.isAutoPublish, false);

assert.equal(
  taskSchema.safeParse({
    targetClientId,
    taskType: TaskType.PUBLISH_POST,
    taskData: {
      draftId: 'draft-1',
      platforms: [{ name: 'DYNAMIC_FACEBOOK' }],
      timestamp: Date.now(),
    },
  }).success,
  false,
);

assert.equal(
  taskSchema.safeParse({
    targetClientId,
    taskType: TaskType.SCHEDULE_PUBLISH_POST,
    taskData: {
      platforms: [{ name: 'DYNAMIC_FACEBOOK' }],
      data: { content: 'Scheduled post' },
    },
  }).success,
  false,
);

assert.equal(
  taskSchema.safeParse({
    targetClientId,
    taskType: TaskType.DRAFT_POST,
    taskData: {
      platforms: [{ name: 'DYNAMIC_FACEBOOK' }],
      data: { content: 'Not a draft task' },
    },
  }).success,
  false,
);

assert.equal(
  taskSchema.safeParse({
    targetClientId,
    taskType: TaskType.PUBLISH_POST,
    taskData: {
      platforms: [],
      data: { content: 'No destination platform' },
    },
  }).success,
  false,
);

console.log('Extension task schema regression checks passed.');
