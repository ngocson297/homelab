# Database notes

PostgreSQL runs locally through Docker Compose. Prisma schema changes belong in `apps/api/prisma/schema.prisma`; migrations must be reviewed before application.

Development and test data must always be synthetic and must never contain real patient or medical information.

Run `npm run prisma:seed` after migrations to idempotently insert the 10 synthetic Test Catalog records.
