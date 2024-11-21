import { SOLANA_CONSTANTS } from './constants';

interface RateLimitConfig {
  interval: number;
  maxAttempts: number;
  backoffFactor: number;
  maxInterval: number;
  queueTimeout: number;
}

class RateLimiter {
  private static instance: RateLimiter;
  private requestTimes: number[] = [];
  private currentInterval: number;
  private readonly maxInterval: number;
  private readonly backoffFactor: number;
  private readonly maxAttempts: number;
  private readonly queueTimeout: number;
  private requestQueue: Promise<void> = Promise.resolve();
  private isProcessing: boolean = false;
  private successfulRequests: number = 0;
  private lastIntervalChange: number = Date.now();
  private lastRequestTime: number = 0;
  private requestCount: number = 0;
  private windowStart: number = Date.now();
  private readonly MAX_REQUESTS_PER_MINUTE = 100;

  private constructor(config: RateLimitConfig) {
    this.currentInterval = config.interval;
    this.maxInterval = config.maxInterval;
    this.backoffFactor = config.backoffFactor;
    this.maxAttempts = config.maxAttempts;
    this.queueTimeout = config.queueTimeout;
  }

  public static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter({
        interval: SOLANA_CONSTANTS.REQUEST_INTERVAL,
        maxAttempts: 3,
        backoffFactor: 1.5,
        maxInterval: 2000,
        queueTimeout: 30000
      });
    }
    return RateLimiter.instance;
  }

  private async waitForQueue(): Promise<void> {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Queue timeout')), this.queueTimeout);
    });

    try {
      await Promise.race([this.requestQueue, timeoutPromise]);
    } catch (error) {
      this.isProcessing = false;
      throw error;
    }
  }

  private checkRateWindow(): boolean {
    const now = Date.now();
    const windowSize = 60000; // 1 minute window

    if (now - this.windowStart >= windowSize) {
      this.windowStart = now;
      this.requestCount = 0;
      return true;
    }

    return this.requestCount < this.MAX_REQUESTS_PER_MINUTE;
  }

  public async checkRateLimit(): Promise<void> {
    if (this.isProcessing) {
      await this.waitForQueue();
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // Check rate window
    if (!this.checkRateWindow()) {
      const waitTime = 60000 - (now - this.windowStart);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    if (timeSinceLastRequest < this.currentInterval) {
      await new Promise(resolve => setTimeout(resolve, this.currentInterval - timeSinceLastRequest));
    }

    this.isProcessing = true;
    this.requestQueue = (async () => {
      try {
        this.requestTimes = this.requestTimes.filter(time => now - time < this.currentInterval);

        if (this.requestTimes.length >= this.maxAttempts) {
          const waitTime = this.currentInterval - (now - this.requestTimes[0]);
          if (waitTime > 0) {
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }

        this.requestTimes.push(now);
        this.lastRequestTime = now;
        this.requestCount++;
        this.successfulRequests++;

        if (this.successfulRequests >= 50 && now - this.lastIntervalChange > 60000) {
          this.optimizeInterval();
        }
      } finally {
        this.isProcessing = false;
      }
    })();

    await this.requestQueue;
  }

  private optimizeInterval(): void {
    const now = Date.now();
    if (this.successfulRequests >= 50 && now - this.lastIntervalChange > 60000) {
      this.decreaseInterval();
      this.successfulRequests = 0;
      this.lastIntervalChange = now;
    }
  }

  public increaseInterval(): void {
    const newInterval = Math.min(
      this.currentInterval * this.backoffFactor,
      this.maxInterval
    );
    
    if (newInterval !== this.currentInterval) {
      console.warn(`Increasing rate limit interval to ${newInterval}ms`);
      this.currentInterval = newInterval;
      this.lastIntervalChange = Date.now();
      this.successfulRequests = 0;
    }
  }

  public decreaseInterval(): void {
    const minInterval = SOLANA_CONSTANTS.REQUEST_INTERVAL;
    const newInterval = Math.max(
      minInterval,
      this.currentInterval / this.backoffFactor
    );
    
    if (newInterval !== this.currentInterval && newInterval >= minInterval) {
      console.log(`Decreasing rate limit interval to ${newInterval}ms`);
      this.currentInterval = newInterval;
      this.lastIntervalChange = Date.now();
    }
  }

  public getCurrentInterval(): number {
    return this.currentInterval;
  }

  public reset(): void {
    this.requestTimes = [];
    this.currentInterval = SOLANA_CONSTANTS.REQUEST_INTERVAL;
    this.isProcessing = false;
    this.requestQueue = Promise.resolve();
    this.successfulRequests = 0;
    this.lastIntervalChange = Date.now();
    this.lastRequestTime = 0;
    this.requestCount = 0;
    this.windowStart = Date.now();
  }
}

export const rateLimiter = RateLimiter.getInstance();