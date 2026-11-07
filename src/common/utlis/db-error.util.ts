import { QueryFailedError } from 'typeorm';

export function isUniqueConstraintViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;

  const driverError: any = error.driverError;

  // PostgreSQL
  if (driverError?.code === '23505') return true;

  // MySQL / MariaDB
  if (driverError?.code === 'ER_DUP_ENTRY') return true;

  // SQLite
  if (driverError?.code === 'SQLITE_CONSTRAINT') return true;

  return false;
}
