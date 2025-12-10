/**
 * Global Rate Limiter with Request Queue
 * Prevents API rate limit errors by queuing and throttling requests
 */

interface QueuedRequest<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  priority: number;
}

export class RateLimiter {
  private queue: QueuedRequest<any>[] = [];
  private processing = false;
  private lastRequestTime = 0;
  private requestCount = 0;
  private windowStart = Date.now();
  
  constructor(
    private maxRequestsPerSecond: number = 3,
    private windowMs: number = 1000
  ) {}

  /**
   * Add a request to the queue
   * @param fn - Function that returns a Promise (the API call)
   * @param priority - Higher priority requests are processed first (default: 0)
   */
  async enqueue<T>(fn: () => Promise<T>, priority: number = 0): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject, priority });
      
      // Sort by priority (higher first)
      this.queue.sort((a, b) => b.priority - a.priority);
      
      // Start processing if not already running
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      // Check if we need to reset the window
      const now = Date.now();
      if (now - this.windowStart >= this.windowMs) {
        this.requestCount = 0;
        this.windowStart = now;
      }

      // If we've hit the rate limit, wait until the next window
      if (this.requestCount >= this.maxRequestsPerSecond) {
        const waitTime = this.windowMs - (now - this.windowStart);
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        this.requestCount = 0;
        this.windowStart = Date.now();
      }

      // Get next request from queue
      const request = this.queue.shift();
      if (!request) break;

      try {
        // Execute the request
        const result = await request.fn();
        this.requestCount++;
        this.lastRequestTime = Date.now();
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }

      // Small delay between requests to be extra safe
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.processing = false;
  }

  /**
   * Update rate limit (e.g., when API key is added)
   */
  setRateLimit(requestsPerSecond: number): void {
    this.maxRequestsPerSecond = requestsPerSecond;
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear the queue (useful for testing or cancellation)
   */
  clearQueue(): void {
    this.queue.forEach(req => req.reject(new Error('Queue cleared')));
    this.queue = [];
  }
}

/**
 * Global rate limiters for different services
 */
export class RateLimiterManager {
  private static pubmedLimiter: RateLimiter;
  private static fallbackLimiter: RateLimiter;

  /**
   * Get PubMed rate limiter (3 req/sec without key, 10 with key)
   */
  static getPubMedLimiter(hasApiKey: boolean = false): RateLimiter {
    if (!this.pubmedLimiter) {
      this.pubmedLimiter = new RateLimiter(hasApiKey ? 10 : 3, 1000);
    } else if (hasApiKey) {
      this.pubmedLimiter.setRateLimit(10);
    }
    return this.pubmedLimiter;
  }

  /**
   * Get fallback sources rate limiter (conservative 2 req/sec)
   */
  static getFallbackLimiter(): RateLimiter {
    if (!this.fallbackLimiter) {
      this.fallbackLimiter = new RateLimiter(2, 1000);
    }
    return this.fallbackLimiter;
  }

  /**
   * Get queue status for monitoring
   */
  static getStatus() {
    return {
      pubmed: {
        queueSize: this.pubmedLimiter?.getQueueSize() || 0,
      },
      fallback: {
        queueSize: this.fallbackLimiter?.getQueueSize() || 0,
      }
    };
  }
}
