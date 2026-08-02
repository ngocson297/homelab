# HomeLab

## Tạo Admin local

Admin không được tạo tự động hoặc qua seed. Trên PowerShell, đặt biến môi trường chỉ cho terminal hiện tại:

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL="admin@homelab.local"
$env:BOOTSTRAP_ADMIN_PASSWORD="<set-a-strong-local-password-with-a-number>"
$env:BOOTSTRAP_ADMIN_NAME="HomeLab Admin"
npm run admin:create --workspace api
```

Script không in password, không ghi password vào source và không tự thay đổi account đã tồn tại.

Monorepo nền tảng đặt lịch lấy mẫu xét nghiệm tại nhà. Giai đoạn hiện tại chỉ gồm nền móng kỹ thuật và Test Catalog; không xử lý dữ liệu bệnh nhân thật, chatbot AI hoặc thanh toán thật.

## Yêu cầu môi trường

- Node.js 22+
- npm 10+
- Docker Engine và Docker Compose plugin

## Cài đặt

```bash
npm install
cp .env.example .env
```

Trên PowerShell, dùng `Copy-Item .env.example .env`. Các giá trị mẫu chỉ dành cho local development.

## Chạy local

```bash
docker compose up -d postgres
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
```

Chạy API và frontend trong hai terminal:

```bash
npm run dev:api
npm run dev:web
```

- Frontend: http://localhost:3000
- API health: http://localhost:3001/health
- Swagger: http://localhost:3001/docs

Test Catalog endpoints:

- `GET /lab-tests?search=blood&homeCollectable=true&page=1&limit=20`
- `GET /lab-tests/:id`

```json
{ "status": "ok", "service": "homelab-api" }
```

## Kiểm tra chất lượng

```bash
npm run lint
npm run test
npm run build
```

Database-backed integration tests áp dụng migration và seed vào database được cấu hình bởi `DATABASE_URL`. Chỉ sử dụng database test độc lập:

```bash
npm run test:integration:db --workspace api
```

## Cấu trúc

- `apps/web`: Next.js App Router, TypeScript, Tailwind CSS
- `apps/api`: NestJS, Swagger, Prisma, Jest
- `docs`: ghi chú product, database và API
- `docker-compose.yml`: PostgreSQL local

Không đưa dữ liệu bệnh nhân, y tế, liên hệ hoặc thanh toán thật vào source code, seed, fixture, test hay log.
### Create a local collector

Set `BOOTSTRAP_COLLECTOR_EMAIL`, `BOOTSTRAP_COLLECTOR_PASSWORD`, `BOOTSTRAP_COLLECTOR_NAME`, `BOOTSTRAP_COLLECTOR_EMPLOYEE_CODE`, and `BOOTSTRAP_COLLECTOR_PHONE` in the uncommitted `.env`, then run:

```powershell
npm run collector:create
```

The command creates an `ACTIVE` staff account with role `COLLECTOR` and an `OFF_DUTY` profile atomically. It refuses to overwrite an existing email or employee code.
