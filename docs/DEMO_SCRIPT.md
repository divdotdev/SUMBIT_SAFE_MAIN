# SubmitSafe judge presentation

Use **MOCK** mode and synthetic PDFs only. The tagline is **Know before you submit.**

## Setup and identities

Start the backend using `npm start` (or `npm run dev`) and the frontend using `npm run dev:web`. The existing `npm run dev:all` starts both. Default URLs are `http://localhost:5173` and `http://localhost:5000/api`; if backend PORT differs, set `VITE_API_URL` in `client/.env.local` to the same backend port and restart Vite. Confirm `/api/health` reports `appMode: MOCK`. MEMORY mode resets records when the backend restarts; run the entire presentation on one server instance. MongoDB is optional and requires a valid local connection configured through the existing environment settings.

The MOCK seed adds accounts through existing bcrypt/JWT authentication. All use the local demo password `Demo@123`:

| Email | Role / purpose |
| --- | --- |
| `demo@submitsafe.in` | Original Demo User; unchanged |
| `rahul@submitsafe.in` | Rahul Sharma, Home Loan presentation |
| `admin@submitsafe.in` | Demo catalog and workflow administration |
| `partner@submitsafe.in` | Demo partner assigned the six seeded Home Loan products |

The partner account is a presentation persona across those configured products, not an actual bank. New products are not automatically assigned to it. Public registration cannot choose an admin/partner role. Sign out at `/profile` before switching accounts. Keep separate browser profiles if you want simultaneous roles; ordinary tabs can inherit session storage when duplicated.

Rahul's seeded profile: DOB **1998-06-15** (age 28 on the September 2026 demo date), Chandigarh, salaried, monthly gross income ₹70,000 / annual ₹8,40,000. Loan form: existing EMI ₹5,000, Home Loan ₹25,00,000, tenure 20 years, self-reported credit range 750+. These are invented demonstration details.

PDFs are in `client/public/demo-home/`: `AADHAAR.pdf`, `PAN.pdf`, `SALARY_SLIP.pdf`, `BANK_STATEMENT.pdf`. They are clearly labeled synthetic. Aadhaar input is masked. PAN uses a synthetic parser example and is masked in all results. Files can be opened at `/demo-home/AADHAAR.pdf` etc. Regenerate with `node scripts/create-home-fixtures.mjs`. Existing Riya Education fixtures remain in `/demo-education/`.

## Exact presentation path

`{productId}`, `{documentId}`, `{applicationId}` and `{agentId}` below are actual IDs in the address bar after selecting a record; do not type those braces. Allow 5–7 minutes.

| Step | Route / page | Exact action | Talking point | Fallback |
| --- | --- | --- | --- | --- |
| 1 | `/` | Open the landing page; confirm shared Demo banner. | “SubmitSafe helps applicants understand their options and prepare a submission.” | Show the saved application screenshots; say the live demo is unavailable. |
| 2 | `/` | Point to the tagline. | “Know before you submit.” | Read the tagline aloud. |
| 3 | `/login`, then `/loans` | Sign in as Rahul; choose Home Loan and Continue. | “We start with the applicant's goal.” | `/loans/home` opens the Home profile step directly. |
| 4 | `/loans/home` wizard | Fill Rahul, 28, Chandigarh; Continue; Salaried and monthly 70000; Continue; amount 2500000, tenure 20, existing EMI 5000; Continue; 750+; Find Matches. | “These are self-reported synthetic details. This does not query a credit bureau.” | Reload the wizard and re-enter; do not claim an error result is a match. |
| 5 | `/loans/results` | Show the resulting Home lenders. | “These are indicative configured demo products, not current quotations or bank partnerships.” | Show a recorded results screenshot or explain the configured catalog at `/admin/loans`. |
| 6 | `/loans/results`, then `/loans/{productId}` if needed | Expand/read matching reasons. | “Potential-match scoring considers income, age, amount/tenure, employment, self-reported credit and estimated EMI burden. It is not underwriting.” | Read the displayed reasons only; no invented eligibility decisions. |
| 7 | `/loans/results` → `/loans/compare` | Select Compare on three cards; click Compare lenders. | “Applicants can compare indicative cost and requirements.” | Compare two if one product was disabled; preserve the existing comparison flow. |
| 8 | `/loans/results` → `/loans/{productId}` | View Details on a seeded Home lender; click Prepare Application. | “Now we prepare for a selected product.” | Choose another enabled seeded Home product assigned to the demo partner. |
| 9 | `/loans/{productId}/prepare` → `/documents` | Click Continue preparing or Apply Directly while documents are incomplete. | “The existing readiness service identifies missing evidence.” | Open `/documents`; do not imply readiness if checks are incomplete. |
| 10 | `/documents/upload?type=AADHAAR`, then PAN, SALARY_SLIP, BANK_STATEMENT | Upload the four corresponding Rahul PDFs; check the document-analysis consent box for each; Upload & check document. | “Each check has explicit consent. These PDFs contain synthetic data.” | Retry the saved upload; for an OCR failure show Manual Review, then use a searchable PDF. |
| 11 | `/documents/{documentId}` for Aadhaar | Show detection, identity format, readability, extracted name, name/DOB consistency, masked ID and source status. | “Sandbox document analysis. This is not UIDAI authentication. SOURCE_NOT_VERIFIED remains explicit.” | Show `docs/demo-screenshots/rahul-aadhaar.png`; do not claim live source verification. |
| 12 | `/documents` | Show 4 of 4 ready, score, uploaded/missing/attention counts and recommendations. | “Readiness measures this configured document package, not credit approval.” | Show the ready screenshot; if current status needs attention, explain its real recommendation. |
| 13 | `/loans/{productId}/apply` | Review details and tick lender-data-sharing consent. | “Sharing is specific to this selected lender and can be revoked.” | Return through `/loans/{productId}/prepare`; if the profile session was cleared, re-enter the loan wizard. |
| 14 | `/loans/{productId}/apply` → `/applications/{applicationId}` | Click Prepare Application; open View my application. | “A local sandbox application ID is created; no real lender receives it.” | Open `/applications` to recover a saved draft, complete missing checks and continue. |
| 15 | `/loans/{productId}/prepare` | Point out Apply Directly. Do not create another application just to demonstrate the link. | “This option lets the user prepare their package themselves. This demo does not submit to a bank.” | Use the already prepared application as the example. |
| 16 | `/agents` → `/agents/{agentId}` | View Profile; tick assistance consent; Request assistance. | “The existing marketplace saves a local request linked to the selected lender. No real agent is contacted.” | Show the profile and explain the request is unavailable if suspended or consent fails. |
| 17 | `/profile` → `/login?next=%2Fpartner` → `/partner` | Sign out; sign in as partner. | “DEMO PARTNER PORTAL. Pre-screened for application readiness — not credit-approved.” | Use `partner-overview.png`; explain this is a local persona, not a bank integration. |
| 18 | `/partner/leads` → `/partner/leads/{applicationId}` | Open Rahul's lead; show active consent, limited applicant fields and shared document readiness. Accept Lead, then Mark Under Review. | “A lender workflow could receive a consented, prepared package. These buttons update only the local demo stage.” | If missing, check partner assignment and active lender consent; never bypass consent. Use `partner-lead.png` with its screenshot label. |
| 19 | `/schemes` → `/schemes/results` | Enter a demo profile, state, income and occupation; Find Schemes. | “The module compares configured scheme rules. Existing catalog records are fictional; there is no government verification or benefit guarantee.” | Show a configured scheme detail; explicitly say real scraped schemes have not been integrated in this branch. |
| 20 | `/partner`, optionally `/admin` | Explain the business model. For admin, sign out and log in as admin; show metrics, catalogs and assistance requests. | “SubmitSafe demonstrates preparation and consented handoff. Potential revenue could come from preparation services and future contracted partner referrals; neither is an implemented commercial arrangement here.” | Close with the ready-package screenshot and the tagline. |

## Optional privacy proof and administration

After the main presentation, sign in as Rahul at `/settings`, revoke **Lender application sharing**, then return as partner. That lead disappears and its detail/actions return unavailable. Previously displayed information cannot be retroactively erased from a person's view; revocation prevents subsequent API access. Document-analysis consent and agent assistance consent are separate.

Admin uses `/admin/users`, `/admin/applications`, `/admin/documents`, `/admin/loans`, `/admin/schemes`, `/admin/agents`, `/admin/consents`, `/admin/audit`. In loan/scheme management, Edit → Enabled checkbox → Save toggles catalog availability. Agent actions are explicitly demo verify/unverify/suspend. No agent self-application intake or real ratings exist. Do not describe configured profiles as actual submitted applications.

Admin metrics use actual local records. Search and match event counters start when this implementation is installed. The readiness average is labeled as the existing Home checklist average for applicants with uploads. Partner conversion is completed **local workflow** stages / currently consented leads; it is not approval or loan disbursement. Partner stages are separate from the applicant's existing application status and do not fake lender status updates.

Backup screenshots in `docs/demo-screenshots/` are captured from the synthetic automated presentation. They are examples from that run, not live database views.
