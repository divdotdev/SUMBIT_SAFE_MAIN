# SubmitSafe backend

Node.js, Express, Mongoose/MongoDB, JWT, bcrypt, Multer, Helmet, CORS and rate limiting. This is a working sandbox backend; demo matches are not approvals, current quotations, government eligibility determinations or identity authentication.

## Run immediately

Requires Node.js 22.13+ (tested on Node 26) and npm. Run commands from the repository root:

```sh
npm install
cp .env.example .env
npm run seed
npm run dev
```

The API listens on `http://localhost:5000`. `npm start` runs without watch mode. `GET /api/health` reports `status`, `appMode` and `databaseStatus`.

Default `APP_MODE=MOCK` and `MOCK_DATABASE=MEMORY` work with all the supplied dummy values. **No attempt is made to contact the dummy Mongo URI, SMS service or provider URLs.** Memory mode validates records with the same Mongoose schemas but loses records on restart. It automatically seeds each server process. Running the seed command separately in MEMORY mode validates/seeds only that command's ephemeral database; it does not persist data for the server.

Demo account: `demo@submitsafe.in` / `Demo@123`. Seed data includes six named demo home loan products, three fictional education loan products, 16 fictional schemes and eight fictional agents. Seeding is idempotent and never resets an existing user's password. Every catalog record has `dataMode=DEMO`. Loan rates and APR are percentages per year, processing fees are percentages of principal, money is INR, and tenure is years. Demo APR is a separately seeded illustration, not a computed quotation.

## Persist using MongoDB

Run a local MongoDB instance or use your own MongoDB connection string, then change `.env`:

```dotenv
APP_MODE=MOCK
MOCK_DATABASE=MONGODB
MONGODB_URI=mongodb://127.0.0.1:27017/submitsafe
```

Run `npm run seed`, then `npm run dev`. Placeholder Mongo credentials are rejected before connection if MongoDB is enabled. A connection failure stops startup; it never silently falls back to memory. MOCK startup seeds missing demo records in either database mode. For Mongo persistence checks, use a dedicated test database and `TEST_MONGODB_URI=mongodb://127.0.0.1:27017/submitsafe_test npm test`.

## API conventions

JSON requests use `Content-Type: application/json`. Protected routes require `Authorization: Bearer <token>`. Tokens expire after two hours. Error responses use `{ "error": { "code": "...", "message": "..." } }`, with field errors for invalid input. Unknown fields are rejected. IDs are 24-character MongoDB ObjectId strings.

Public endpoints:

| Method | Path | Body / result |
| --- | --- | --- |
| GET | `/api/health` | Health and database state |
| POST | `/api/auth/register` | `name`, `email`, `password`, optional `phone`, `profile`; returns `user`, `token` |
| POST | `/api/auth/login` | `email`, `password`; returns `user`, `token` |
| POST | `/api/auth/send-otp` | `phone`; returns `challengeId`, 300-second expiry |
| POST | `/api/auth/verify-otp` | `phone`, `challengeId`, `otp`; MOCK OTP is `123456` |
| GET | `/api/loans` | `{data, count}`; defaults HOME, `?loanType=EDUCATION` or `ALL` |
| GET | `/api/loans/:id` | `{data}` |
| POST | `/api/loans/match` | Match profile below; `{data}` sorted by score |
| POST | `/api/loans/compare` | `{loanProductIds: [id, id], profile: <match profile>}`; 2–6 unique products |
| GET | `/api/schemes` | `{data, count}`; optional `?category=Education` |
| GET | `/api/schemes/:id` | `{data}` |
| POST | `/api/schemes/match` | `age`, `employmentType`, `annualIncome` or `monthlyIncome`, optional `city` |
| GET | `/api/agents` | `{data, count}`; optional `?city=Delhi` |
| GET | `/api/agents/:id` | `{data}` |

Protected endpoints:

| Method | Path | Body / result |
| --- | --- | --- |
| GET | `/api/user/me` | `{user}`; excludes password hash |
| PATCH | `/api/user/me` | `{name, profile}`; name/DOB changes invalidate document analyses |
| GET | `/api/documents/:id` | Owned document metadata and persisted analysis |
| POST | `/api/documents/upload` | Multipart `file` and `documentType`; `{document}` |
| GET | `/api/documents` | Current user's document metadata |
| POST | `/api/documents/:id/analyze` | `{consentId}`; `{analysis}` |
| GET | `/api/documents/readiness` | `overallScore`, `status`, components, recommendations and analyses |
| POST | `/api/consents` | `purpose`, `documentIds`, `sharedWith`, `version` |
| GET | `/api/consents` | Current user's consents, including revoked ones |
| PATCH | `/api/consents/:id/revoke` | Revoke consent; no body required |
| POST | `/api/applications` | `loanProductId`, `loanType: "HOME"` or `"EDUCATION"`, `loanAmount`, `tenure`, optional `consentId` |
| GET | `/api/applications` | Current user's applications |
| GET | `/api/applications/:id` | `{application}` |
| PATCH | `/api/applications/:id/status` | `status`, optional `consentId` |
| POST | `/api/agents/:id/request` | `{consentId}`; saves assistance request |

Registration accepts `profile.dob` as `YYYY-MM-DD`, `profile.city`, `profile.employmentType` and `profile.monthlyIncome`. Clients cannot choose a privileged role. OTP challenges have a five-minute expiry, 60-second resend cooldown, five attempts and single use. Completing a MOCK OTP does not create a session or verify real phone ownership.

Loan match profile (`loanType` defaults to `HOME`; send `EDUCATION` for education products):

```json
{
  "name": "Demo User",
  "age": 30,
  "city": "Delhi",
  "employmentType": "salaried",
  "monthlyIncome": 100000,
  "existingEmi": 0,
  "loanAmount": 3000000,
  "tenureYears": 20,
  "creditScoreRange": "750-799"
}
```

Income can alternatively be `annualIncome`; if both are supplied they must agree. Employment options: `salaried`, `self-employed`, `business`, `student`, `farmer`, `unemployed`, `other`. Credit can be a numeric score 300–900 or one of `300-549`, `550-649`, `650-699`, `700-749`, `750-799`, `800-900`, `unknown`. Range matching uses its lower bound.

Scoring uses income 30, age including maturity 15, amount/tenure limits 20, credit 20, employment 10, and existing plus proposed EMI affordability 5. `potentialMatch` means score >=70; it is never approval. `approxMonthlyEmi` uses the standard reducing-balance formula at the demo minimum interest rate and excludes fees. Every result includes reasons, warnings and a demo disclaimer.

## Documents and consent workflow

1. Register/login with a profile name and DOB.
2. Upload a PDF, PNG, JPG or JPEG. `documentType` is `AADHAAR`, `PAN`, `DRIVING_LICENCE`, `SALARY_SLIP`, `BANK_STATEMENT`, `ADMISSION_LETTER` or `FEE_SCHEDULE`. The default limit is 10 MiB, configurable through `MAX_UPLOAD_MB` (1–25). MIME, file signature and extension must agree. Files receive random UUID names and private filesystem permissions. The API never returns storage filenames or server paths and never serves uploads publicly.
3. Create consent: `{"purpose":"DOCUMENT_ANALYSIS","documentIds":["<document ID>"],"sharedWith":"SubmitSafe","version":"1.0"}`.
4. Analyze using that consent ID. Consent must be active, owned by the same user, and include the document. It is checked again after OCR before saving results.
5. Read aggregate readiness. The legacy HOME checklist requires the original four document types. Education uses the configured mappings documented in [the Education Loan demo guide](EDUCATION_DEMO.md). It scores uploads, readability, name/profile match, detected format and coverage equally. Uploading duplicates cannot increase scores beyond 100. `Ready` also requires a passing analysis for every required type.

Local image OCR uses Tesseract.js and English language data bundled through `@tesseract.js-data/eng`; there are no runtime language-data downloads. Set `LOCAL_OCR_ENABLED=false` to require manual image review. Searchable PDFs use local PDF.js text extraction (first 30 pages, at most 200,000 text characters). Scanned PDFs require manual review or a PNG/JPEG upload. OCR image recognition times out after 30 seconds. OCR is heuristic: multilingual text, rotated scans, complex layouts and unusual dates may need manual review.

Analysis detects identity markers, masked Aadhaar (`XXXX XXXX 1234`) or PAN (`ABCDE****F`) patterns, profile-name and DOB consistency. Salary results include employee/employer/month detection and gross/net salary if found. Bank results include bank/account-holder/period detection and approximate months covered. Three months of bank coverage are expected. No bank underwriting is performed. Text-PDF confidence is a fixed extraction heuristic of 90; image confidence comes from Tesseract and neither is an authentication probability.

Raw OCR text and full government identifiers are not persisted in analysis or audit records. Normalized names, dates of birth, addresses and useful document fields are now persisted in ownership-scoped analysis records for consistency checks; identifiers remain masked. Audit records contain no extracted fields. The original uploaded file is retained privately for analysis and can itself contain sensitive information; this is local storage, with no encryption-at-rest or automatic retention/deletion policy implemented. Use synthetic documents in the demo. Metadata filenames have Aadhaar/PAN-like strings redacted. Analyses return `passed`, `warning`, `failed` or `manual_review` with `verificationMode=SANDBOX_DOCUMENT_CHECK` and:

> This result assesses document readiness and does not constitute UIDAI authentication.

Supported consent purposes: `DOCUMENT_ANALYSIS`, `LENDER_DATA_SHARE`, `AGENT_ASSISTANCE`, `SCHEME_DOCUMENT_CHECK`. Version defaults to `1.0`. Document-analysis and scheme-check consents require document IDs. For lender sharing set `sharedWith` to the loan product ID. For agent assistance set it to the agent ID. All referenced documents must belong to the user. Revocation prevents new processing; it does not retroactively delete existing analysis.

## Applications and assistance

Applications start in `Draft` with a unique `SS-HOME-YYYY-12345` or `SS-EDUCATION-YYYY-12345` code. Allowed transitions:

```text
Draft -> Documents Pending or Ready
Documents Pending -> Draft or Ready
Ready -> Documents Pending or Submitted
Submitted -> Under Review
Under Review -> Completed
```

`Ready` and `Submitted` require overall document readiness. Submission additionally requires active lender-sharing consent matching the selected product. In MOCK mode users can simulate review/completion. In LIVE mode review/completion requires an admin; a real submission adapter is still required. MOCK responses say: `Sandbox application prepared. No application has been sent to a real lender.` Agent requests are saved locally and no agent is contacted.

## Models, providers and LIVE configuration

Mongoose models are in `server/models/index.js`: User, LoanProduct, LoanApplication, Document, DocumentAnalysis, Scheme, Agent, Consent, AuditLog, AgentRequest. Models enforce enums and references; service checks enforce ownership. Unique indexes cover email, catalog slugs, application code and per-document analysis.

Provider directories each contain a base interface, MOCK adapter and explicit LIVE stub:

- Document: `analyzeIdentityDocument()`; MockDocumentProvider delegates to LocalOCRProvider; SignzyDocumentProvider is the LIVE stub.
- Identity: `verifyIdentity()`, `verifyPan()`; SignzyIdentityProvider is the LIVE stub.
- Financial: `analyzeBankStatement()`, `analyzeIncome()`, `extractFinancialSummary()`; PerfiosFinancialProvider is the LIVE stub.
- Credit: `getCreditReport()`; RealCreditProvider is the LIVE stub and mock credit never fabricates a score.
- Lender: `submitApplication()`; PartnerLenderProvider is the LIVE stub.

All LIVE provider methods and LIVE OTP return HTTP 503 with `error.code=ProviderNotConfiguredError`. **Changing credentials alone does not implement the missing integrations.** Provider endpoints have deliberately not been invented. Implement adapters using the contracted vendor documentation, authentication protocol and response schemas before enabling them. LIVE never silently uses fake verification. LIVE also rejects the default JWT secret, requires MongoDB and disables demo seeding.

All values in `.env.example` are intentionally dummy. Replace MongoDB URI, JWT secret (at least 32 random characters), and production frontend origin. When implementing integrations, replace the Signzy base URL/client ID/client secret/API key, Perfios equivalents, SMS keys/secret and provider selection, credit bureau client ID/key/secret, and bank partner URL/API key/provider selection. Google OAuth client ID/secret are reserved placeholders; **Google OAuth is not implemented**. No dummy credentials have been verified. `FILE_STORAGE_MODE=LOCAL` is the only supported storage mode.

## Security and validation

Helmet, exact frontend-origin CORS, JWT validation with fixed HS256/issuer/audience, bcrypt cost 12, strict request schemas, 64 KiB JSON limit, MIME/signature checks and route limits are active. Limits are 300 API requests/15 minutes/IP, 30 auth requests/15 minutes/IP, five OTP sends/15 minutes/IP, 20 uploads/15 minutes/IP and 30 analysis attempts/15 minutes/IP. Express proxy trust is disabled; explicitly configure a known proxy if deploying behind one. In-memory rate limits and OTP challenges are per process; distributed deployment needs shared storage.

Audit logs contain action, user ID, resource ID and timestamps for LOGIN, DOCUMENT_UPLOAD, DOCUMENT_ANALYSIS, CONSENT_GIVEN, CONSENT_REVOKED, APPLICATION_CREATED, APPLICATION_STATUS_CHANGED and AGENT_REQUESTED. Passwords, tokens, raw OCR, PAN/Aadhaar values, bank contents and provider secrets are never included. User document/application/consent queries are ownership scoped.

## Verification

```sh
npm test
```

Tests exercise real local Tesseract image extraction and cover health, registration/login, OTP/replay, matching/comparison, PDF uploads/extraction, consent and revocation, aggregate readiness, catalogs, agent requests, application transitions, ownership isolation, upload size/signature validation, EMI and LIVE provider failures. A local MongoDB test can be enabled with the dedicated `TEST_MONGODB_URI` above; it inserts a test user and removes only that record. Tests need permission to bind temporary local HTTP ports. `npm run seed` is also a standalone smoke check.

## Education evidence contract

`GET /api/documents/readiness?loanType=EDUCATION` returns `mappings`, `consistency`, `finalState`, `requirementsVersion` and legacy `status`/`overallScore` fields. Add `productId` to use a selected product; the server derives the loan type from the product and rejects contradictory types. Application transitions use the same service with the persisted product ID. General education identity accepts Aadhaar or DL; a product can require a particular type. Latest upload per type wins.

Each analysis has `evidence.recognition`, `extraction`, `fields`, `sourceVerification`, `consistency` and `provenance`. Source statuses are SOURCE_VERIFIED, SOURCE_NOT_VERIFIED, VERIFICATION_FAILED and NOT_AVAILABLE. Local extraction only returns SOURCE_NOT_VERIFIED for identity and NOT_AVAILABLE for other documents. No configured adapter returns SOURCE_VERIFIED. Recognition and OCR do not authenticate a QR code or an authority. PAN whitespace is removed and case normalized before format validation; only the masked result is retained. DL extraction currently supports labeled values and a common two-letter/13-digit format; other layouts require review.

Education source, mapping and consistency tests include possible middle-name variations, mismatched DOB, missing evidence, bad replacements, profile correction and product-specific requirements. No human-review override is implemented: replace/correct evidence and recheck.
