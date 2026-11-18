# React + Vite

## Daylight database

Run the website and SQLite API together:

```bash
npm run dev
```

The database is stored in `data/daylight.sqlite` and is ignored by Git. The API runs on port `3001`, and Vite proxies `/api` requests to it.

The local SQLite database is seeded with this demo administrator account:

- Username: `admin`
- Password: `daylight-admin`

Existing accounts are migrated automatically; their username is generated from the part of their email before `@`.

## Deploying on Vercel

The local SQLite API is for development only. Vercel uses the serverless API functions in `api/` with Neon Postgres.

1. Create a Neon Postgres project and copy its connection string.
2. In Vercel, set the project **Root Directory** to `csit340-todomvc-quinaging`.
3. Add `DATABASE_URL` to the Vercel project's Environment Variables and paste the Neon connection string. Do not commit this secret.
4. Deploy or redeploy the project. Vercel creates the database tables automatically on the first API request.
5. Register an account on the deployed site. The hosted database starts empty; local SQLite accounts and study data are not copied automatically.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
