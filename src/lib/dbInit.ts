export function ensureDatabaseExists(): string {
  // SQLite needs persistent storage; /tmp copies lose writes across restarts.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    throw new Error('SQLite ERP memerlukan disk persisten. Deployment serverless dinonaktifkan; gunakan host persisten atau migrasikan database terlebih dahulu.');
  }
  return process.env.DATABASE_URL || 'file:./erp.db';
}
