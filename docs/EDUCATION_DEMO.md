# Education Loan hackathon demo

This continues the existing app on `astra-1-continue`. Nothing has been committed or pushed. The [pre-implementation audit](EDUCATION_AUDIT.md) records all 18 starting classifications and the reused files/services.

## Start or use the running app

Current Mac setup: frontend `http://localhost:5173`, backend `http://localhost:5001/api`. Both ports were observed listening during verification. Do not start a second copy if they are already running. If restarting both:

```sh
PORT=5001 FRONTEND_PORT=5173 FRONTEND_URL=http://localhost:5173 VITE_API_URL=http://localhost:5001/api npm run dev:all
```

Port 5001 is only an environment override; the source keeps its configurable defaults. Backend mode must be MOCK / MEMORY for the offline demonstration. Browser tests use isolated ports 5055/5175.

## Exact click-by-click main journey

1. Open the app. Click **Sign in**, then **Create an account**. Use a unique email, password `Password1!`, full name **Riya Sharma**, DOB **15 June 2003** (`2003-06-15`) and city **Delhi**. Click **Create account**. The existing Demo User account has different identity details; do not upload Riya fixtures under that profile.
2. Click **Loans** in the navigation. Select **Education Loan**, then **Continue**.
3. Enter age **23**; confirm name **Riya Sharma** and city **Delhi**. Click **Continue**.
4. Select **Student**, enter monthly income **25000**, then **Continue**. Explain that this is a fictional working student: the simplified rule uses the applicant's own income, not a co-applicant's income.
5. Enter loan amount **500000**, tenure **10** years and existing EMI **0**. Click **Continue**.
6. Choose **750+**, then **View requirements**. The initial state is **NOT READY**. Show identity, PAN, income, bank, admission and fee requirements before uploading.
7. Expand **Download synthetic demo documents**. Download the Aadhaar, PAN, salary slip, bank statement, admission letter and fee schedule PDFs. The same fixtures are in `client/public/demo-education/`. All are prominently marked synthetic; Aadhaar is already masked.
8. On each requirement card, click its **Upload …** button. Choose the corresponding PDF, tick **I consent to SubmitSafe analyzing…**, then click **Upload & check document**. Inspect recognition, extraction, source verification and applicant consistency. Click **Continue Preparing** to return to the checklist. Repeat for all six documents.
9. Show the relationship on each card: requirement → linked evidence → PDF_TEXT / USER_UPLOAD → source status → PASS, PASS WITH VERIFICATION LIMITATION or REVIEW → explanation. Aadhaar shows `XXXX XXXX 1234`; PAN is normalized and format-checked but displayed masked.
10. Confirm **READY FOR LENDER REVIEW**. Aadhaar/PAN names and DOB are MATCH. Identity source status remains **SOURCE_NOT_VERIFIED**. Other sources are **NOT_AVAILABLE**. Readiness is preparation under configured rules, not authenticity or approval.
11. Scroll to **Configured education scheme matches**. The four displayed matches meet the seeded age/income/occupation criteria for these inputs. They are fictional schemes with no government/ministry affiliation. Click a scheme name to inspect its details, then use browser Back to return to Documents.
12. Click **View configured bank products**. Three clearly marked fictional Education Loan products appear. Results are ranked by the existing deterministic score; the sort describes best match based on configured preferences. Inspect rates, EMI and reasons; disclose that all figures are synthetic.
13. Select **Compare** on Learning Bank and Campus Finance. Click **Compare lenders**. Inspect costs, required documents and scores side by side. Use Back to return to results.
14. Click **Prepare Application** on **Learning Bank Demo Education Loan**. The product-specific readiness badge should remain **READY FOR LENDER REVIEW**. Click **Apply Directly**.
15. Review the applicant, amount, tenure and readiness. Tick lender-sharing consent, then click **Prepare Application**. The success dialog shows an `SS-EDUCATION-YYYY-12345` code. Click **View my application**. The existing workflow records a sandbox Submitted state; no real lender receives it and no approval is given.

## Demonstrate the core review scenario and a specific product

Do this before step 14 if you want to show the full evidence story:

1. On results choose **Prepare Application** for **Study Credit Demo Education Loan**. This fictional product requires Driving Licence specifically. Aadhaar alone no longer satisfies its identity requirement: **NOT READY**.
2. Click **Continue preparing**. The checklist identifies the selected product. Expand downloads and download **DL name variation demo PDF** and **Driving Licence demo PDF**.
3. Click **Upload Driving Licence**. Upload `DRIVING_LICENCE_VARIATION.pdf`, grant analysis consent and check it. Its name is **Riya S Sharma**; source status stays **SOURCE_NOT_VERIFIED**.
4. Click **Continue Preparing**. Show **REVIEW REQUIRED** and the **POSSIBLE_MATCH** comparisons for the DL. Aadhaar ↔ PAN remains **MATCH**. This is a possible name variation requiring review, not a fraud finding. The application cannot be marked Ready.
5. Replace the synthetic DL with `DRIVING_LICENCE.pdf` (the fixture's name is Riya Sharma). Grant consent and check it again. This models receiving corrected evidence, not approving or editing a real licence.
6. Return to the checklist: **READY FOR LENDER REVIEW**. Latest upload of each document type is used, so the corrected DL supersedes the variation fixture. Click **Review selected product**, **Apply Directly**, consent, and **Prepare Application**.

To demonstrate missing income, pause after identity/PAN uploads: the Applicant income evidence card says MISSING. For a profile correction, open **Profile → Edit applicant details**, change name/DOB and save. Existing document analyses are invalidated; recheck uploads with consent and re-enter loan needs. There is no manual override that turns a conflict into a pass.

## Disclosures to judges and remaining limits

- Education lenders Learning Bank, Campus Finance and Study Credit, their rates/APR/fees/requirements, all 16 schemes, agents and all downloadable documents are synthetic. Existing branded home products also contain illustrative demo figures and imply no bank partnership.
- Local PDF extraction and bundled English Tesseract OCR are real local processing. OCR success, document markers and QR detection never establish source authenticity. No UIDAI, PAN/Income Tax, DigiLocker, Parivahan, government, institution, financial, credit-bureau or lender API verifies this demo. LIVE adapters deliberately return ProviderNotConfiguredError.
- Education uses a versioned fictional checklist. It does not implement real co-applicant underwriting, collateral rules, institution accreditation, subsidy applications, real lender eligibility or an education moratorium. EMI is the existing immediate-repayment illustration; credit is self-reported.
- Recognition/extraction is heuristic. Labeled, searchable English PDFs are the reliable demo path. Scanned PDFs require a PNG/JPEG or review. DL supports labeled fields and a common two-letter/13-digit format; other formats need review. Address differences return UNCERTAIN and require review when both addresses are present; absent optional addresses do not block the checklist. Bank coverage is an approximate date-span check.
- MEMORY records disappear on backend restart; sessions expire after two hours. The dev watcher restarts after backend edits. Complete code changes and start a fresh demo account before presenting. Stale selected product IDs after a restart can be cleared by re-entering the education wizard.
- Original uploads are retained in private local files, without encryption-at-rest or automatic deletion/retention. Analysis stores normalized name/DOB/address fields for comparisons, masked identifiers and provenance, never raw OCR text or complete Aadhaar/PAN/DL identifiers. Use the supplied synthetic documents.
- Existing throttles remain: 20 uploads and 30 analyses per 15 minutes per IP. Repeated rehearsals can hit those limits. A clean MOCK server restart resets in-memory rate limits and all in-memory records.
- MongoDB persistence is optional and was not tested without TEST_MONGODB_URI. No external integrations are required for the main local demo.

## Fixtures and checks

Regenerate the eight PDFs deterministically with `node scripts/create-education-fixtures.mjs`. No dependencies were added. The two existing `allowScripts` changes were preserved unchanged.

Run `npm test`, `npm run build`, and `npm run test:frontend`. Tests require permission to bind local ports and launch Chrome. The Playwright suite retains the two existing journeys and adds Education Loan, missing evidence, source-status display, comparison, specific DL requirements, name variation, correction, profile invalidation and sandbox submission, using real local APIs and extraction.
