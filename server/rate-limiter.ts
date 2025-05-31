// Simple rate limiter implementation for Bun/Hono
// Limits requests based on IP address

interface RateLimitConfig {
  windowMs: number;    // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;    // Optional error message
}

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private store: Map<string, RateLimitRecord> = new Map();
  private config: RateLimitConfig;
  
  constructor(config: RateLimitConfig) {
    this.config = {
      message: 'Too many requests, please try again later',
      ...config
    };
    
    // Setup cleanup interval (every minute)
    setInterval(() => this.cleanup(), 60 * 1000);
  }
  
  // Clean up expired records
  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (record.resetAt <= now) {
        this.store.delete(key);
      }
    }
  }
  
  // Check if a request is allowed
  public check(ip: string): boolean {
    const now = Date.now();
    const record = this.store.get(ip);
    
    // If no record exists or the window has expired, create a new record
    if (!record || record.resetAt <= now) {
      this.store.set(ip, {
        count: 1,
        resetAt: now + this.config.windowMs
      });
      return true;
    }
    
    // If under the limit, increment and allow
    if (record.count < this.config.maxRequests) {
      record.count++;
      return true;
    }
    
    // Otherwise, deny the request
    return false;
  }
  
  // Middleware for Hono
  public middleware() {
    return async (c: any, next: () => Promise<void>) => {
      // Get client IP from various headers (including those set by Nginx)
      const ip = 
        c.req.header('X-Forwarded-For')?.split(',')[0] || 
        c.req.header('X-Real-IP') || 
        c.req.raw.socket.remoteAddress || 
        '0.0.0.0';
      
      if (this.check(ip)) {
        // Request is allowed, continue
        await next();
      } else {
        // Request is denied, return 429 Too Many Requests
        return c.json(
          { error: this.config.message },
          429,
          { 'Retry-After': Math.ceil(this.config.windowMs / 1000) }
        );
      }
    };
  }
}
