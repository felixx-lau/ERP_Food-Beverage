import { prisma, getActivePrismaClient } from './prisma';
import { transactionContext } from './transactionContext';
import { createHash } from 'node:crypto';
import { BusinessError, Actor } from './validation';

// Acquire SQLite's writer lock before reading entitlement or lifecycle state.
// Nested engines share this transaction, including sequences and audit writes.
export async function atomic<T>(operation: () => Promise<T>): Promise<T> {
  if (transactionContext.getStore()) return operation();
  const client = await getActivePrismaClient();
  return client.$transaction(async tx => {
    await tx.$executeRawUnsafe('UPDATE "Account" SET "currentBalance" = "currentBalance" WHERE "code" = \'1010\'');
    return transactionContext.run(tx, operation);
  }, { maxWait: 10000, timeout: 20000 });
}

export async function idempotent<T>(actor: Actor, operation: string, key: string | undefined, input: unknown, run: () => Promise<T>): Promise<T> {
  if (!key) return atomic(run);
  if (key.length > 150) throw new BusinessError('Idempotency key terlalu panjang.');
  return atomic(async () => {
    const identity = createHash('sha256').update(`${actor.id}:${operation}:${key}`).digest('hex');
    const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    const previous = await prisma.requestIdentity.findUnique({ where: { id: identity } });
    if (previous) {
      if (previous.fingerprint !== fingerprint) throw new BusinessError('Request key sudah dipakai untuk data berbeda.', 409);
      return JSON.parse(previous.result) as T;
    }
    const result = await run();
    await prisma.requestIdentity.create({ data: { id: identity, fingerprint, result: JSON.stringify(result) } });
    return result;
  });
}
