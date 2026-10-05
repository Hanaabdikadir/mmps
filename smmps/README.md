# Muqdishu Market Price System (MMPS)

A web-based platform to collect, manage, analyze, and display real-time market prices for **Livestock**, **Water Supply**, and **Electricity** in Mogadishu, Somalia.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | TypeScript + Next.js 16 (App Router) |
| Backend | Next.js API Routes (Node.js) |
| Database | PostgreSQL + Prisma ORM |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Auth | JWT + Bcrypt |

## Features

- **Real-time price monitoring** for three sectors
- **Dashboard analytics** with stats and 7-day trend charts
- **District-level filtering** across 16 Mogadishu districts
- **Role-based access**: Public, Registered User, Administrator
- **Admin panel** for adding price records
- **Reports page** (Daily, Weekly, Monthly, Quarterly, Annual)
- **Responsive design** for desktop, tablet, and mobile

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+

### 1. Install dependencies

```bash
cd smmps
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and update your PostgreSQL connection:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/mmps?schema=public"
JWT_SECRET="your-long-random-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Create database and run migrations

```bash
# Create the database with PostgreSQL tools
createdb mmps

# Apply committed Prisma migrations
npm run db:deploy

# Seed required permissions and system essentials
npm run db:seed
```

### 4. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
mmps/
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # System essentials seeder
├── src/
│   ├── app/
│   │   ├── api/           # REST API routes
│   │   ├── admin/         # Admin panel
│   │   ├── livestock/     # Livestock prices page
│   │   ├── water/         # Water prices page
│   │   ├── electricity/   # Electricity prices page
│   │   ├── reports/       # Reports page
│   │   ├── login/         # Authentication
│   │   └── page.tsx       # Dashboard
│   ├── components/        # Reusable UI components
│   └── lib/               # Utilities, auth, Prisma client
└── .env.example
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Sign in |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/me` | Current user |
| GET/POST | `/api/livestock` | Livestock prices |
| GET/POST | `/api/water` | Water prices |
| GET/POST | `/api/electricity` | Electricity prices |
| GET | `/api/dashboard` | Dashboard stats & trends |

## Deployment

- **Frontend/API**: [Vercel](https://vercel.com)
- **Database**: Managed PostgreSQL on Railway, Render, Neon, or Supabase

## License

Private — Muqdishu Market Price System (MMPS)
