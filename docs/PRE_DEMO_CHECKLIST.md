# Pre-demo checklist

## Environment and startup

- [ ] `git branch --show-current` is `astra-3-documents-admin`; review changes before any commit or push.
- [ ] Confirm `APP_MODE=MOCK`. Dummy provider credentials remain unused. Never paste or display real secrets during the demo.
- [ ] Use existing scripts: `npm start` / `npm run dev` for backend; `npm run dev:web` for frontend; or `npm run dev:all` for both.
- [ ] Check `http://localhost:<backend-port>/api/health`: `status=ok`, `appMode=MOCK`, `databaseStatus=mock-memory` or `connected`.
- [ ] Default frontend 5173, backend 5000. If backend is 5001, put `VITE_API_URL=http://localhost:5001/api` in `client/.env.local` and restart Vite. Check browser Network requests target that same port. Ensure FRONTEND_URL matches the Vite origin.
- [ ] MEMORY persistence lasts only while the backend runs. Keep that process running through the demo. For MongoDB use existing `MOCK_DATABASE=MONGODB` + valid local `MONGODB_URI`; verify connectivity and run `npm run seed`. Do not use dummy remote domains.
- [ ] Use a fresh Rahul session or inspect existing uploads/applications first. Do not reset another developer's database. The MEMORY seed runs on server start; seeding an already running separate MEMORY process does not modify it.
- [ ] `demo@submitsafe.in` / `Demo@123` signs in. Separate accounts `rahul@submitsafe.in`, `admin@submitsafe.in`, `partner@submitsafe.in` use the same MOCK-only password. Existing database instances need restart/seed to add new demo identities.
- [ ] PDFs exist under `client/public/demo-home/`: Aadhaar, PAN, salary slip, bank statement. They are synthetic. Preserve `/demo-education/` and Riya's demo.

## Presentation smoke test

- [ ] Home Loan form: Rahul, 28, Chandigarh, salaried, monthly 70000, existing EMI 5000, amount 2500000, 20 years, 750+.
- [ ] Rahul's `/profile` has DOB 1998-06-15 and the same name as PDFs. Editing name/DOB invalidates checks; re-analyze if changed.
- [ ] `/loans/results` shows seeded configured Home products; reasons are potential matches and rates indicative.
- [ ] Select three lenders → `/loans/compare`; verify cost/tenure/documents and responsive layout.
- [ ] Choose an enabled seeded Home lender; `/loans/{id}/prepare` and `/documents` open correctly.
- [ ] Upload the four synthetic PDFs with explicit document-analysis consent. Unsupported/corrupt/large uploads show a recoverable error.
- [ ] OCR/extraction works locally. Searchable PDFs do not require a network OCR service. Image OCR uses bundled English language data. Uncertain extraction is review, not fraud.
- [ ] Aadhaar displays `XXXX XXXX 4821`; PAN displays `ABCDE****F`. No full identifiers appear in result UI, admin tables, partner table, screenshots or logs.
- [ ] `SOURCE_NOT_VERIFIED`, sandbox footer, detection, format, confidence and consistency are visible and distinguishable.
- [ ] `/documents` shows expected upload/missing/attention counts, readiness and next action.
- [ ] Give lender consent at `/loans/{id}/apply`; prepare application; confirm ID and existing local Submitted state at `/applications/{id}`. Nothing is sent externally.
- [ ] `/agents` shows demo profiles; request assistance; `/admin/agents` shows saved request and selected lender. Do not claim real contacts or ratings.
- [ ] `/partner` requires partner role; shows DEMO PARTNER PORTAL and DEMO METRICS. Applicant/admin role must be denied.
- [ ] `/partner/leads` shows the consented seeded Home application. No identity numbers/names are in the table; detail has appropriate consented profile fields and shared readiness.
- [ ] Accept Lead → Mark Under Review works locally; Request Additional Document requires a note. Mark Completed requires shared readiness. Reject/complete close the local partner stage, not a credit decision.
- [ ] `/admin` requires admin role; all eight sections render. Create/edit/enable-disable configured loans/schemes; restore intended demo records afterward. Default source/date fields remain unknown unless sourced.
- [ ] Demo verify/unverify/suspend works; suspended agents cannot receive new requests. Restore availability for presentation if testing suspension.
- [ ] `/schemes` and `/schemes/results` work; no government affiliation or guaranteed eligibility is implied. Current catalog is fictional; unfinished scrape work is not presented as integrated data.
- [ ] `/settings` revocation removes partner access immediately on subsequent request. Recreate explicit consent/application if you want a visible lead afterward.
- [ ] Sign out at `/profile`; protected routes return to login. Expired sessions show the existing sign-in message. Switching accounts clears prior form state.
- [ ] At 390px and desktop widths, navigation, documents, tables and forms are usable. Tables scroll horizontally inside their region rather than overflowing the page.
- [ ] 404, backend-unavailable, upload/OCR retry, no applications and no consented leads have understandable states. Never show an error as a successful check.

## Validation and backup

- [ ] Run `npm test`, `npm run build`, `npm run test:frontend`. Tests start isolated servers at default 5055 / 5175; keep those ports free. Local socket/Chrome permissions are required in restricted environments.
- [ ] MongoDB persistence test requires its documented test URI. A skipped MongoDB test is not proof of persistence; say when only MEMORY was tested.
- [ ] Review `docs/DEVELOPER3_REPORT.md` for final outcomes and limitations.
- [ ] Open backup PNGs from `docs/demo-screenshots/` (Aadhaar, readiness, partner overview/detail/mobile, admin overview/mobile). They show synthetic test data and are not live views.
- [ ] Rehearse `docs/DEMO_SCRIPT.md` in one uninterrupted backend session. Keep PDF files and screenshots accessible locally for offline fallback.
- [ ] No commit, push, merge or PR until the requested review.
