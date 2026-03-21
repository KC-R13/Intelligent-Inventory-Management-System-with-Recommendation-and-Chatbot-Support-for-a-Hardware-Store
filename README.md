# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Backend API (MySQL)

A new backend API is located under `backend/` for connecting your data and recommender logic:

1. Run SQL script to build DB:
   - `c:\Users\KC Ranasinghe\Downloads\init.sql` (as provided)
   - `mysql -u root -p < init.sql`
2. Copy env file:
   - `cd backend`
   - `cp .env.example .env`
   - set `DB_PASSWORD`, `DB_USER`, etc.
3. Install backend dependencies:
   - `npm install`
4. Run service:
   - `npm run dev` (or `npm start`)
5. API endpoints:
   - `/api/health`
   - `/api/inventory`
   - `/api/dashboard/low-stock`
   - `/api/dashboard/summary`
   - `/api/dashboard/recommendations`

### Connect React frontend

Edit `src/api.js` BASE_URL to `http://localhost:5000/api`, and in `src/pages/Dashboard.jsx` un-comment the `useEffect` calls that fetch from `dashboardApi`.

## React Compiler

The React Compiler is currently not compatible with SWC. See [this issue](https://github.com/vitejs/vite-plugin-react/issues/428) for tracking the progress.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
