# Repository audit before implementation

Branch inspected: `astra-1-continue`. Existing uncommitted `allowScripts` settings in both package manifests are intentional and preserved. This audit describes the starting state, before code changes.

| Area | Starting classification | Evidence / reuse |
| --- | --- | --- |
| Education Loan end-to-end | MISSING | `client/src/pages/LoanWizard.jsx` renders coming soon; application validator accepts HOME only; seed has only home products. |
| Applicant profile | PARTIAL | User schema, registration, login and Profile page work; no profile update endpoint or correction UI. |
| Loan requirements/checklist | PARTIAL | Product `documentsRequired` exists; documents page and readiness hard-code the same four types. No education requirements. |
| Document upload | COMPLETE | Existing consent-aware document controller, MIME sniffing, size limits, ownership checks and private storage support PDF/PNG/JPEG. |
| OCR pipeline | COMPLETE | LocalOCRProvider uses bundled Tesseract English and PDF.js text extraction; scanned PDFs honestly require review. No external API needed. |
| Aadhaar evidence | PARTIAL | Recognizes markers and digits, masks number and compares profile name/DOB; no normalized evidence or explicit source status. |
| PAN evidence | PARTIAL | Pattern detection and masking exist; no spaced PAN normalization or normalized holder evidence. |
| Driving Licence evidence | MISSING | Not in document enum, OCR classifier or UI. |
| Normalized evidence objects | MISSING | Analysis has booleans and financial fields, but discards holder fields needed for comparison. |
| Source-verification statuses | PARTIAL | Existing disclaimers correctly deny UIDAI authentication and mock identity returns verified:false; requested status vocabulary is absent. LIVE adapters fail explicitly. |
| Cross-document consistency | MISSING | Each document compares against profile tokens; documents are not compared with one another. |
| Requirement-to-Evidence mapping | MISSING | No requirement/evidence/provenance/result/explanation model or response. |
| Application readiness | PARTIAL | Deterministic four-document score exists, reused by application transitions; lacks contextual rules, conflicts and requested final states. |
| Government scheme matching | PARTIAL | Existing matching service, API and UI use 16 clearly fictional schemes; education journey/category integration absent. |
| Bank/lender product matching | PARTIAL | Weighted deterministic matching works for six demo home products; education catalog and student rules absent. |
| Loan comparison | COMPLETE | Existing compare API and desktop/mobile views support multiple products, costs, reasons and document requirements. Needs education context. |
| Specific-product mode | PARTIAL | Product detail, prepare and apply routes exist; checklist ignores selected product and type is hard-coded HOME. |
| Frontend/backend integration | COMPLETE | Existing API client, authenticated routes, session state and error/retry states work; configurable API URL. Education integration is missing. |

No broken existing subsystem was established by source inspection. Baseline tests are checked separately; COMPLETE means implemented for the existing supported scope, not production certification.

## Reuse and extension plan

- Extend `server/services/documentAnalysis.js` and the existing `DocumentAnalysis` schema; keep LocalOCRProvider and the upload/consent path. Add reusable evidence normalization/comparison helpers, not another OCR pipeline.
- Extend existing `overallReadiness` with configured education/product requirements and explicit evidence mappings. Retain the home response contract and gate application transitions with the same service.
- Extend `User`, `LoanProduct`, `documentTypes`, input validators, catalog/workflow controllers and the current seed. Keep Store validation shared between MEMORY and MongoDB.
- Extend LoanWizard, Documents, Loans, PrepareApplication, Profile and the existing API client. Reuse comparison, consent, authentication, UI components and styles.
- Add synthetic education fixtures and regression tests. Keep existing home tests, dependency settings and default ports intact.

## Scope decisions

Education demo requirements are fictional, configured preparation rules: identity (Aadhaar or DL), PAN, applicant income, three-month bank statement, admission letter and fee schedule. A working student can satisfy the simplified applicant-income rule. Co-applicant underwriting, real institution eligibility, subsidies, collateral and live lender/provider checks remain external/unimplemented and must not be implied.

OCR, recognition, source verification and consistency will be reported separately. Local extraction never produces SOURCE_VERIFIED. Readiness only means ready for lender review under the configured demo checklist.
