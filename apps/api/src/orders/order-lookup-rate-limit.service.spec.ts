import { HttpException } from '@nestjs/common';
import { OrderLookupRateLimitService } from './order-lookup-rate-limit.service';

describe('OrderLookupRateLimitService', () => {
  it('allows ten attempts in a minute and blocks the next one', () => {
    const limiter = new OrderLookupRateLimitService();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      expect(() =>
        limiter.assertAllowed('synthetic-client', 1_000),
      ).not.toThrow();
    }
    expect(() => limiter.assertAllowed('synthetic-client', 1_000)).toThrow(
      HttpException,
    );
  });

  it('resets the window and isolates clients', () => {
    const limiter = new OrderLookupRateLimitService();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      limiter.assertAllowed('first-client', 1_000);
    }
    expect(() => limiter.assertAllowed('second-client', 1_000)).not.toThrow();
    expect(() => limiter.assertAllowed('first-client', 61_001)).not.toThrow();
  });
});
