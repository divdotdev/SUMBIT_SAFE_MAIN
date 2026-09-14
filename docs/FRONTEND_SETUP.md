# SubmitSafe frontend

The frontend lives in `client/` and integrates with the existing Express backend through `client/src/services/api.js`. No backend route, controller, model, provider, or database implementation was changed. Frontend work is isolated on `astra-1-frontend`, based on backend commit `bfdf3c1`.

## Install and run

Use Node.js 22.13+ and npm. From the repository root:

```sh
npm install
npm --prefix client install
cp .env.example .env
cp client/.env.example client/.env
npm run seed
npm run dev:all
```

Copy the environment examples only if you do not already have your own `.env` files. `npm run dev:all` starts the existing backend and Vite frontend together. Defaults are:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:5000/api/health`
- Frontend environment: `VITE_API_URL=http://localhost:5000/api`
- Backend allowed origin: `FRONTEND_URL=http://localhost:5173`

For separate terminals:

```sh
# Terminal 1: existing backend
npm run dev

# Terminal 2: frontend
npm run dev:web
```

On this Mac, ports 5000 and 5173 were occupied by macOS and another app. Use the verified alternate ports without changing either app:

```sh
PORT=5055 FRONTEND_PORT=5175 FRONTEND_URL=http://localhost:5175 VITE_API_URL=http://localhost:5055/api npm run dev:all
```

Then open `http://localhost:5175`. Environment variables must agree on the backend origin and API port. `FRONTEND_PORT` configures Vite; it is not a backend setting. Command-line environment values take precedence over the example files.

The default backend is MOCK with ephemeral memory storage. Backend startup seeds six loan products, 16 schemes, eight agents, and `demo@submitsafe.in` / `Demo@123`. Restarting a MEMORY backend clears new accounts and applications. See `BACKEND_SETUP.md` for MongoDB persistence.

## Build and test

```sh
npm run build
npm run test:frontend
npm test
```

The production build is written to `client/dist`. Deploy it to a static host with SPA fallback to `index.html`, set `VITE_API_URL` before building, and configure the backend's `FRONTEND_URL` to that host's exact origin. No deployment is performed by these commands.

Browser tests use installed Google Chrome (`channel: chrome`) and temporary local web servers on ports 5055/5175, reusing an existing SubmitSafe server if present. They exercise the real backend with synthetic documents; no API data is mocked in the main journey. One error-state test deliberately blocks a request and verifies retry. The suite adds a uniquely named user and demo records to the running MOCK backend. Use an isolated MOCK instance for testing. Browser tests require permission to launch Chrome and bind local ports.

For screenshots:

```sh
mkdir -p /tmp/submitsafe-frontend-shots
SCREENSHOT_DIR=/tmp/submitsafe-frontend-shots npm run test:frontend
```

The root backend test command is unchanged. Its optional MongoDB persistence test needs a dedicated `TEST_MONGODB_URI` as documented in the backend guide.

## Pages

- Landing, sign in and registration: `/`, `/login`, `/register`.
- Account: `/dashboard`, `/profile`, `/settings`.
- Loan wizard: `/loans`, `/loans/home`, `/loans/personal`, `/loans/education`, `/loans/car`.
- Loan results and workflow: `/loans/results`, `/loans/compare`, `/loans/:id`, `/loans/:id/prepare`, `/loans/:id/apply`.
- Documents: `/documents`, `/documents/upload`, `/documents/:id`.
- Schemes: `/schemes`, `/schemes/results`, `/schemes/:id`.
- Assistance: `/agents`, `/agents/:id`.
- Applications: `/applications`, `/applications/:id`.

Protected pages return users to their original destination after sign in. Every page has loading/error/empty states where applicable. Desktop comparison tables become stacked cards on mobile. The mobile navigation uses an accessible expandable menu. Forms use native validation, proper labels, visible focus, busy states and reduced-motion support. The wordmark, home illustration and fictional agent avatars are local SVG artwork; fonts are bundled locally.

## Existing endpoints connected

| Feature | Existing backend endpoints |
| --- | --- |
| Mode banner | `GET /api/health` |
| Account | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/user/me` |
| Demo phone check | `POST /api/auth/send-otp`, `POST /api/auth/verify-otp` |
| Loans | `GET /api/loans`, `GET /api/loans/:id`, `POST /api/loans/match`, `POST /api/loans/compare` |
| Documents | `GET /api/documents`, `POST /api/documents/upload`, `POST /api/documents/:id/analyze`, `GET /api/documents/readiness` |
| Applications | `POST /api/applications`, `GET /api/applications`, `GET /api/applications/:id`, `PATCH /api/applications/:id/status` |
| Schemes | `GET /api/schemes`, `GET /api/schemes/:id`, `POST /api/schemes/match` |
| Agents | `GET /api/agents`, `GET /api/agents/:id`, `POST /api/agents/:id/request` |
| Consent | `POST /api/consents`, `GET /api/consents`, `PATCH /api/consents/:id/revoke` |

Scores, EMI estimates, catalogs, analyses, readiness and application codes come from the API. The client does not recreate the backend's scoring or underwriting logic. There are no static fallback records: an unreachable API produces an honest retry state.

JWTs and form progress are stored in this tab's `sessionStorage`. Signing out clears account/form state. Saved schemes are a local session bookmark because there is no saved-scheme endpoint. Backend results are fetched again on page load. Raw document text and complete identifiers are not placed in browser storage or displayed. Stored identifiers use masked forms. Uploaded document contents are never rendered as previews.

## Full demo journey

1. Register a test account using the same name and DOB as the synthetic documents you will upload. Or choose “Try the demo account” on Sign in.
2. Choose Home Loan. Fill the five short steps and select Find Matches.
3. Inspect API-provided scores, reasons, rates and EMI. Choose up to three lenders; compare requires at least two.
4. Open a loan, select Prepare Application, and continue to documents.
5. Upload Aadhaar, PAN, a salary slip, and a bank statement one at a time. Each check requires an explicit consent checkbox. The demo bank checklist requires three months of coverage. Name and DOB must match the account.
6. When the API reports Ready, choose Apply Directly and review applicant, amount, tenure, EMI and readiness. Give lender-sharing consent and choose Prepare Application.
7. The client creates a Draft, moves it to Ready, and records a Submitted sandbox application. It retains the created ID during partial failures so a retry resumes the same application. The success dialog shows the backend-generated code and clearly states that no real lender was contacted.
8. Explore scheme matches, save a scheme for this session, or request assistance from a fictional agent after giving consent.
9. Visit the dashboard and application detail. In MOCK mode, later review/completion stages can be explicitly simulated through the backend. Manage or revoke consents in Settings.

## Backend limits represented honestly

- Only home loans exist. Personal, education and car pages explain availability and link to the supported home-loan flow; they never relabel home-loan data.
- The backend accepts one salary slip and four total document types. Additional slips and employment proof are not fabricated as supported requirements.
- Schemes are fictional, with no ministry affiliation. State is collected for session context but not sent to the strict matching API, which supports age, income and occupation. Scheme document consent leads to the general readiness checklist, not an invented scheme-specific verifier.
- Agent records have no real photo, verification, rating, review or experience fields. The UI uses labeled demo profiles, illustrative avatars and honest “not provided” details.
- Profile editing and password reset are unavailable because the backend has no endpoints for them. Profile and consent pages explain what is supported.
- OTP is a separate sandbox phone challenge, not a login mechanism or an account update.
- Scanned PDFs may require manual review. Local image OCR and searchable-PDF extraction work through the existing backend. Analysis always states that it is not UIDAI authentication.
- LIVE provider integrations remain unavailable until backend adapters are implemented. The UI does not invent endpoints or silently substitute demo verification.
