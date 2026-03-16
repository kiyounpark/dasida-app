import { createHash } from 'node:crypto';

export const FIRESTORE_BATCH_WRITE_LIMIT = 400;

type ImportableRecord = Record<string, unknown> & {
  id: string;
  accountKey: string;
};

type MigrationLedgerMarker = {
  sourceAnonymousAccountKey: string;
  importedAt: string;
  updatedAt: string;
};

export type ImportWriteOperation =
  | {
      collection: 'attempts';
      docId: string;
      data: ImportableRecord;
    }
  | {
      collection: 'attemptResults';
      docId: string;
      data: ImportableRecord;
    }
  | {
      collection: 'reviewTasks';
      docId: string;
      data: ImportableRecord;
    }
  | {
      collection: 'migrationLedger';
      docId: 'migrations';
      data: {
        markers: Record<string, MigrationLedgerMarker>;
        updatedAt: string;
      };
    };

function rewriteImportRecord<T extends ImportableRecord>(record: T, targetAccountKey: string): T {
  return {
    ...record,
    accountKey: targetAccountKey,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeImportDocument(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = {
    ...existing,
  };

  for (const [key, value] of Object.entries(incoming)) {
    const existingValue = merged[key];

    if (isPlainObject(existingValue) && isPlainObject(value)) {
      merged[key] = mergeImportDocument(existingValue, value);
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

export function hashMigrationSourceAccountKey(sourceAnonymousAccountKey: string) {
  return createHash('sha256').update(sourceAnonymousAccountKey).digest('hex');
}

export function buildImportWriteOperationPath(
  targetAccountKey: string,
  operation: ImportWriteOperation,
) {
  switch (operation.collection) {
    case 'attempts':
      return `users/${targetAccountKey}/attempts/${operation.docId}`;
    case 'attemptResults':
      return `users/${targetAccountKey}/attemptResults/${operation.docId}`;
    case 'reviewTasks':
      return `users/${targetAccountKey}/reviewTasks/${operation.docId}`;
    case 'migrationLedger':
      return `users/${targetAccountKey}/private/${operation.docId}`;
  }
}

export function buildImportWriteOperations(params: {
  targetAccountKey: string;
  sourceAnonymousAccountKey: string;
  attempts: ImportableRecord[];
  resultsByAttemptId: Record<string, ImportableRecord[]>;
  reviewTasks: ImportableRecord[];
  timestamp?: string;
}) {
  const timestamp = params.timestamp ?? new Date().toISOString();
  const migrationSourceHash = hashMigrationSourceAccountKey(params.sourceAnonymousAccountKey);
  const rewrittenAttempts = params.attempts.map((attempt) =>
    rewriteImportRecord(attempt, params.targetAccountKey),
  );
  const rewrittenResults = Object.values(params.resultsByAttemptId)
    .flat()
    .map((result) => rewriteImportRecord(result, params.targetAccountKey));
  const rewrittenReviewTasks = params.reviewTasks.map((task) =>
    rewriteImportRecord(task, params.targetAccountKey),
  );

  const operations: ImportWriteOperation[] = [
    ...rewrittenAttempts.map((attempt) => ({
      collection: 'attempts' as const,
      docId: attempt.id,
      data: attempt,
    })),
    ...rewrittenResults.map((result) => ({
      collection: 'attemptResults' as const,
      docId: result.id,
      data: result,
    })),
    ...rewrittenReviewTasks.map((task) => ({
      collection: 'reviewTasks' as const,
      docId: task.id,
      data: task,
    })),
    {
      collection: 'migrationLedger',
      docId: 'migrations',
      data: {
        markers: {
          [migrationSourceHash]: {
            sourceAnonymousAccountKey: params.sourceAnonymousAccountKey,
            importedAt: timestamp,
            updatedAt: timestamp,
          },
        },
        updatedAt: timestamp,
      },
    },
  ];

  return {
    migrationSourceHash,
    operations,
    timestamp,
  };
}

export function groupImportWriteOperations(
  operations: ImportWriteOperation[],
  batchLimit = FIRESTORE_BATCH_WRITE_LIMIT,
) {
  const batches: ImportWriteOperation[][] = [];

  for (let index = 0; index < operations.length; index += batchLimit) {
    batches.push(operations.slice(index, index + batchLimit));
  }

  return batches;
}

export function applyImportWriteOperationsWithMerge(params: {
  targetAccountKey: string;
  store: Map<string, Record<string, unknown>>;
  operations: ImportWriteOperation[];
  committedBatchCountBeforeFailure?: number;
}) {
  const batches = groupImportWriteOperations(params.operations);
  const committedBatchLimit = params.committedBatchCountBeforeFailure ?? batches.length;

  batches.slice(0, committedBatchLimit).forEach((batch) => {
    batch.forEach((operation) => {
      const path = buildImportWriteOperationPath(params.targetAccountKey, operation);
      const existingDocument = params.store.get(path) ?? {};
      params.store.set(path, mergeImportDocument(existingDocument, operation.data));
    });
  });

  if (committedBatchLimit < batches.length) {
    throw new Error(`Simulated import failure after ${committedBatchLimit} committed batches.`);
  }

  return params.store;
}
