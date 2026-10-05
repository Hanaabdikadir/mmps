# Muqdishu Market Price System

A market-price platform for livestock, water, and electricity in Mogadishu. People can read prices, and staff can sign in to manage them.

**Live:** [hana-mmps-live.netlify.app](https://hana-mmps-live.netlify.app)

The app lives in `smmps`. The full setup notes are in `smmps/README.md`.

## What you can open

- Public prices for livestock, water, and electricity
- Dashboards and reports
- Sign-in for company admins, sector admins, and the super admin

## Run

```bash
cd smmps
npm install
```

Set `DATABASE_URL` and `JWT_SECRET` in `smmps/.env`, then:

```bash
npm run db:deploy
npm run db:seed
npm run dev
```

Open http://localhost:3000

Do not commit `.env`.

## Stack

TypeScript, Next.js, React, Tailwind CSS, Prisma, PostgreSQL, and JWT.
