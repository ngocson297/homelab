import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;
const MAX_TRACKED_CLIENTS = 10_000;

type ClientWindow = { count: number; resetAt: number };

@Injectable()
export class OrderLookupRateLimitService {
  private readonly clients = new Map<string, ClientWindow>();

  assertAllowed(clientKey: string, now = Date.now()): void {
    this.prune(now);
    const current = this.clients.get(clientKey);
    if (!current || current.resetAt <= now) {
      this.clients.set(clientKey, { count: 1, resetAt: now + WINDOW_MS });
      return;
    }
    if (current.count >= MAX_ATTEMPTS) {
      throw new HttpException(
        'Quá nhiều yêu cầu tra cứu. Vui lòng thử lại sau.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    current.count += 1;
  }

  private prune(now: number): void {
    for (const [key, value] of this.clients) {
      if (value.resetAt <= now) this.clients.delete(key);
    }
    if (this.clients.size >= MAX_TRACKED_CLIENTS) {
      const oldestKey = this.clients.keys().next().value as string | undefined;
      if (oldestKey) this.clients.delete(oldestKey);
    }
  }
}
