import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import Decimal from 'decimal.js';
import { eq, inArray } from 'drizzle-orm';

import { User } from '../../../db/schema/auth-schema';
import { Credit } from '../../../db/schema/schema';

const defaultDatabaseUrl =
  'postgres://postgres:postgres@localhost:55432/multipost_atlas_replay?sslmode=disable';

process.env.MULTIPOST_DATABASE_URL ??= defaultDatabaseUrl;

const testRunId = randomUUID();
const userIds: string[] = [];

function testUserId(label: string) {
  const id = `credit_test_${label}_${testRunId}`;
  userIds.push(id);
  return id;
}

async function main() {
  const [{ addCredit, deductCredit }, { db, multipostPgPool }] =
    await Promise.all([import('../src/actions/credit/_core'), import('../src/lib/db')]);

  async function createUser(id: string) {
    await db.insert(User).values({
      id,
      email: `${id}@example.test`,
      name: 'Credit Test',
    });
  }

  async function readCredit(userId: string) {
    const [credit] = await db.select().from(Credit).where(eq(Credit.userId, userId)).limit(1);
    assert.ok(credit, `missing credit row for ${userId}`);
    return {
      credits: new Decimal(credit.credits),
      freeCredits: new Decimal(credit.freeCredits),
    };
  }

  try {
    const concurrentDeductUserId = testUserId('deduct');
    await createUser(concurrentDeductUserId);
    assert.equal((await addCredit(concurrentDeductUserId, '1', false)).success, true);
    assert.equal('transaction' in db, true);
    assert.equal(typeof db.transaction, 'function');

    const deductResults = await Promise.all([
      deductCredit(
        {
          userId: concurrentDeductUserId,
          type: 'WEB_SEARCH_API',
          amount: '0.7',
        },
        db,
      ),
      deductCredit(
        {
          userId: concurrentDeductUserId,
          type: 'WEB_SEARCH_API',
          amount: '0.7',
        },
        db,
      ),
    ]);
    assert.equal(deductResults.filter((result) => result.success).length, 1);
    assert.equal(deductResults.filter((result) => !result.success).length, 1);

    const postDeductCredit = await readCredit(concurrentDeductUserId);
    assert.equal(postDeductCredit.credits.eq('0.3'), true);
    assert.equal(postDeductCredit.freeCredits.eq('0'), true);

    const precisionUserId = testUserId('precision');
    await createUser(precisionUserId);
    assert.equal((await addCredit(precisionUserId, '0.1', true)).success, true);
    assert.equal((await addCredit(precisionUserId, '0.2', true)).success, true);

    const precisionCredit = await readCredit(precisionUserId);
    assert.equal(precisionCredit.freeCredits.eq('0.3'), true);

    const incrementUserId = testUserId('increment');
    await createUser(incrementUserId);
    const incrementResults = await Promise.all(
      Array.from({ length: 20 }, () => addCredit(incrementUserId, '0.1', false)),
    );
    assert.equal(incrementResults.every((result) => result.success), true);

    const incrementCredit = await readCredit(incrementUserId);
    assert.equal(incrementCredit.credits.eq('2'), true);

    console.log('credit-r2.6 tests passed');
  } finally {
    if (userIds.length > 0) {
      await db.delete(User).where(inArray(User.id, userIds));
    }
    await multipostPgPool.end();
  }
}

await main();
