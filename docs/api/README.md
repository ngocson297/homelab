# API notes

The NestJS API runs on port `3001` by default. Interactive OpenAPI documentation is available at `http://localhost:3001/docs`, and the initial health endpoint is `GET /health`.

## Test Catalog

- `GET /lab-tests`: supports `search`, `homeCollectable`, `page`, and `limit` query parameters.
- `GET /lab-tests/:id`: returns one test or HTTP 404. Invalid UUIDs return HTTP 400.

The public catalog intentionally returns both `ACTIVE` and `INACTIVE` records. Consumers must use the `status` field to label current availability; this preserves historical catalog links without implying that an inactive test can be booked.

Decimal values are returned as strings so price and volume precision are preserved in JSON.
