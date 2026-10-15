/**
 * SQLite database layer with prepared statements and WAL mode.
 *
 * Yanii Principles:
 * - Prepared statements (SQL injection prevention)
 * - WAL mode for concurrency
 * - Foreign key constraints
 * - Type-safe queries via parameterized access
 */
export interface Database {
    prepare<T>(sql: string): PreparedStatement<T>;
    exec(sql: string): void;
}
export interface PreparedStatement<T> {
    get(args: unknown[]): T | null;
    all(args: unknown[]): T[];
    run(args: unknown[]): RunResult;
}
interface RunResult {
    lastInsertRowid?: number;
    changes: number;
}
/**
 * Creates and initializes the SQLite database with schema.
 */
export declare function createDatabase(dbPath: string): Database;
export {};
//# sourceMappingURL=index.d.ts.map