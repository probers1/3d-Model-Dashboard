/**
 * Authentication and authorization middleware.
 */
import type { Request, Response, NextFunction } from 'express';
import type { User } from '../types/index.js';
export interface AuthContext {
    user: User | null;
    authenticated: boolean;
}
export declare function requireAuth(ctx: AuthContext, req: Request, res: Response, next: NextFunction): void;
export declare function requireAdmin(ctx: AuthContext, req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map