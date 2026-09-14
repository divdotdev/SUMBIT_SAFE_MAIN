# SubmitSafe backend

Backend lead implementation on `astra-2-backend`.

```sh
npm install
cp .env.example .env
npm run seed
npm run dev
```

Runs at `http://localhost:5000` in MOCK mode with an automatically seeded in-memory database. Dummy external credentials are never contacted. Demo login: `demo@submitsafe.in` / `Demo@123`.

See [backend setup and API contracts](docs/BACKEND_SETUP.md) for MongoDB persistence, request bodies, consent/document workflows, provider limitations and LIVE configuration. Run `npm test` for validation.

## Frontend

The React/Vite frontend is in `client/`. After `npm --prefix client install`, run `npm run dev:all` to start both services, or `npm run dev:web` alongside the existing backend. Run `npm run build` for production assets and `npm run test:frontend` for the complete browser journey.

See [frontend setup, routes and integration guide](docs/FRONTEND_SETUP.md) for exact environment settings, alternate ports for this Mac, supported workflows and current backend limits.
