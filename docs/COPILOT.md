# SUBMIT-SAFE Copilot

Added incrementally on commit `418bdd3`. The existing OCR, evidence, readiness, matching, consent and application modules remain the source of truth. No new database models or dependencies were added.

## Configure

The default is `AI_PROVIDER=DISABLED`. The app still runs and the Copilot shows its deterministic rules summary, with AI explicitly unavailable.

For the complete local demo, set `AI_PROVIDER=MOCK` in the server environment and restart the backend. This is labeled **DEMO/MOCK — no model called** in the panel. Its keyword router demonstrates the same context and citation pipeline; it is not an LLM.

For Groq's free-tier API, use `AI_PROVIDER=GROQ`, `GROQ_API_KEY` and `AI_MODEL=openai/gpt-oss-20b`. Groq keys must not be placed in `OPENAI_API_KEY`. The Groq adapter uses its [Responses API](https://console.groq.com/docs/responses-api) with strict structured output, low reasoning effort and the same response validation as the OpenAI adapter. Free-tier request/token limits still apply. No additional dependency or separate readiness system is required.

Live Groq validation succeeded on 2026-09-15: authenticated synthetic education-loan requests returned HTTP 200 and grounded, cited answers for readiness, next actions and loan matching. The running local frontend at port 5175 points to backend port 5055, which reports `GROQ` as active. No key was printed or committed. Model-generated plans still fail closed if their references do not support their chosen intent; the prompt explicitly specifies that constraint.

For a real model, set `AI_PROVIDER=OPENAI`, `OPENAI_API_KEY` and `AI_MODEL` to a model available to your account that supports Responses structured outputs. Keep credentials in the server environment; never use `VITE_` credentials. Missing key or model produces an unavailable state. Requests have a 20-second timeout, no tool access, `store: false`, and an 800-token output limit. Provider errors and invalid/incomplete responses fail gracefully without exposing vendor errors or credentials.

The OpenAI adapter follows the official [Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs). Transport behavior is tested with a substitute HTTP transport. On 2026-09-15, the locally configured OpenAI key was used for a synthetic Copilot integration check. OpenAI returned HTTP 429; a minimal diagnostic request confirmed `insufficient_quota` / `credit_balance_exhausted`. The Copilot handled the provider error without fabricating an answer. Successful live generation remains pending API account credits and a retest. The key is stored only in the Git-ignored local `.env`, with owner-only file permissions; no credentials are included in these notes.

## How answers are grounded

`POST /api/copilot/context` and `POST /api/copilot/chat` require the existing bearer authentication. Chat accepts `message` (1–1,200 characters) and these optional context selectors: `applicationId`, `productId`, `loanType`, `comparisonProductIds` (2–3 unique IDs), `schemeId`. Additional fields are rejected. An application is loaded by both ID and authenticated user ID; its product takes precedence. Conflicting selectors are rejected.

The context builder calls `overallReadiness` (including the education requirement mappings and consistency checks) and the existing `matchLoan` / `matchScheme` services. It creates a catalog of explanation facts and server-owned references. The AI interprets the question and selects an intent and relevant fact IDs; the server validates those IDs and intent, then renders their canonical explanations. Free-form model prose, unknown facts and invented URLs are never rendered. This deliberately constrains conversational flexibility in exchange for traceable, reproducible answers.

For next actions, the server always orders existing findings: blocker, missing mandatory evidence, critical conflict, unverified evidence, review, optional improvement. The model cannot reorder priorities. A passing education requirement with source-verification limitations stays passing; the Copilot does not change readiness. Blocker counts count findings, not unique documents; one document can affect several findings.

Every question loads current records. Before returning a model answer the backend rebuilds its sanitized context and compares its version. Relevant changes during the request result in `context_changed`, asking the user to retry. The UI refreshes on opening or changing context and offers a refresh button. Answers include finding/requirement/product/evidence references and configured HTTPS source URLs where available. Demo lender records currently have no official source URL.

The provider interface also exposes `extractStructured`, returning explicit unavailable. Lender-text requirement extraction is deferred: there is no established public lender source-text pipeline here, and generated requirements should not enter the deterministic engine without provenance and validation.

## Data boundaries and known scope

- Context excludes names, full DOB, identity numbers, addresses, filenames, paths, email, phone and raw document/OCR content. Evidence includes types, field-presence flags, confidence, extraction method and source-verification status. The question is stripped of known profile/evidence personal strings and common identifier, email and long-number patterns before provider invocation. This is a minimization filter, not a universal detector of personal details entered as free text; the UI asks users to avoid identifiers.
- Matching inputs already submitted through the existing validated match APIs are retained for 30 minutes in a bounded per-process cache (1,000 entries), separated by user, loan type and loan/scheme scope. Names and city are excluded. They represent self-reported matching inputs, not verified financial data. Anonymous matching continues to work but does not populate authenticated Copilot context.
- A profile update invalidates cached matching inputs. Restart, cache eviction, expiry, or an application amount/tenure differing from the last matching inputs makes personal match reasons unavailable until matching is rerun while signed in. Multi-instance deployments need shared expiring storage for consistent availability. No chat or matching snapshot is written to the database.
- Education readiness uses the existing simplified applicant-income rules. Co-applicant underwriting, institution/course eligibility conditions and lending decisions are explicitly unavailable. Scheme facts explain the selected scheme's configured match reasons; the readiness summary still refers to loan preparation, not a separate scheme readiness assessment.
- The existing HOME readiness engine is reused as-is, including its selection of the best analysis for each required type. Education uses the latest evidence per type. Copilot does not silently change either policy.
- References never establish identity-source verification from OCR. Only actual stored source-verification status is read. The AI cannot mark documents or applications ready, change rules, or submit to a lender.

## Demo and checks

1. Enable explicit `AI_PROVIDER=MOCK`, start the existing frontend/backend, register with a name and DOB, and complete the Education Loan wizard.
2. View configured bank products and select a product so matching inputs and its exact checklist are available.
3. Open Copilot and ask “Why am I not ready?” and “What should I fix next?” Missing requirements come from that product's current checklist.
4. Upload and analyze the existing synthetic education fixtures with consent. For a product requiring Driving Licence, a name variation produces review findings; ask “What information conflicts?”
5. Upload corrected evidence, refresh the Copilot, and observe `READY FOR LENDER REVIEW`, satisfied requirements, and continuing source-verification limitations.
6. On product results/compare, ask why a product matches or why another ranks lower. On an application detail, the Copilot uses that owned application's product.

Run `npm test`, `npm run build`, and `npm run test:frontend`. No lint/typecheck scripts are defined. Playwright starts fresh MOCK servers; to avoid occupied ports use `TEST_API_PORT=5057 TEST_WEB_PORT=5177 npm run test:frontend`. Tests do not reuse an existing server because its provider configuration and memory state may differ. Optional MongoDB integration needs its existing test configuration and is otherwise skipped.

The backend tests cover current and foreign context, ordered remediation, matches/comparison, corrections, invalid/unsafe plans, unsupported questions, source limitations, question/context minimization, cache isolation/expiry, missing credentials, provider failure and stale responses. E2E extends the complete education flow and covers mobile layout, no context, loading, unavailable/provider-error states, recovery and keyboard dismissal. UI failure states are injected at the network boundary; backend failure behavior is tested separately.
