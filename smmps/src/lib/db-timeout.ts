/** Max wait for PostgreSQL/Prisma before failing the request closed. */
export const DB_TIMEOUT_MS = 15000;

export function withDbTimeout<T>(
  promise: Promise<T>,
  ms: number = DB_TIMEOUT_MS
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Database timed out")), ms)
    ),
  ]);
}
