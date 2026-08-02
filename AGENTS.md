# HomeLab engineering guidelines

## Scope and architecture

- Keep HomeLab as a modular monolith: Next.js in `apps/web` and NestJS in `apps/api`.
- Prefer small, cohesive Nest modules and vertical slices over premature shared abstractions.
- Use PostgreSQL through Prisma; avoid raw interpolated SQL.
- Keep API contracts documented in Swagger and update tests when behavior changes.

## Coding conventions

- Use strict TypeScript; avoid `any` and unsafe type assertions.
- Use dependency injection in NestJS and Server Components by default in Next.js.
- Use kebab-case filenames and descriptive domain names.
- Run Prettier, ESLint, Jest, and builds before handoff.
- Put every environment variable in root `.env.example`; never commit `.env` or secrets.
- Do not log secrets, sensitive request bodies, or database URLs.

## Development data safety

- Never use real patient, medical, laboratory, contact, or payment data in development, tests, fixtures, seeds, source code, screenshots, or logs.
- Use clearly fictional, minimal synthetic data when a test needs representative input.
- Do not implement diagnosis, clinical decision support, real payments, or production patient-data processing at this stage.
- Stop and raise a review concern if a change could expose protected health information or weaken access controls.
