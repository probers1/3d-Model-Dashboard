/**
 * Rate limiting middleware to prevent DoS attacks.
 */
import type { Request, Response, NextFunction } from 'express';
interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
}
export declare function rateLimit(config?: Partial<RateLimitConfig>): (req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=ratelimit.d.ts.map