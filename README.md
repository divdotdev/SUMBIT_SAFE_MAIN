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
