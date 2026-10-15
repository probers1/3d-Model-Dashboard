/**
 * Prepared statement wrappers for type-safe database access.
 */
import type { Database } from './index.js';
export declare const userQueries: {
    getByUsername: (db: Database) => PreparedStatement<T>;
    getById: (db: Database) => PreparedStatement<T>;
    getAll: (db: Database) => PreparedStatement<T>;
    getByRole: (db: Database) => PreparedStatement<T>;
    insert: (db: Database) => PreparedStatement<T>;
};
export declare const modelQueries: {
    getById: (db: Database) => PreparedStatement<T>;
    getAll: (db: Database) => PreparedStatement<T>;
    getByUserId: (db: Database) => PreparedStatement<T>;
    insert: (db: Database) => PreparedStatement<T>;
    update: (db: Database) => PreparedStatement<T>;
    delete: (db: Database) => PreparedStatement<T>;
};
export declare const modelFileQueries: {
    getById: (db: Database) => PreparedStatement<T>;
    getByModelId: (db: Database) => PreparedStatement<T>;
    insert: (db: Database) => PreparedStatement<T>;
};
export declare const sessionQueries: {
    getByUserId: (db: Database) => PreparedStatement<T>;
    validate: (db: Database) => PreparedStatement<T>;
    invalidate: (db: Database) => PreparedStatement<T>;
    cleanupExpired: (db: Database) => PreparedStatement<T>;
};
//# sourceMappingURL=queries.d.ts.map