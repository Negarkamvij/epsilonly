# Epsilonly AI development plan

Inspection date: November 9, 2026. Scope: Milestone 1 only. This document proposes future work; it does not claim that those features exist. Review the plan before implementing Milestone 2. Do not commit without the owner's approval.

Subsequent approved work: the math answer editor has been implemented independently of the remaining milestones. See `MATH_EDITOR_VALIDATION.md` for changed files, checks and limitations. This resolves the MathQuill prerendering blocker recorded in the original inspection below. Upload security, symbolic grading and the full-stack milestones are not complete.

November 20 follow-up: at the owner's request, Supabase replaces the proposed separate authentication/database setup for the current Next.js app. Account forms, cookie sessions, owner-scoped SQL migrations, saved practice, a dashboard and local automated tests have been implemented. The owner subsequently created the Supabase project; its local public configuration and SQL migration are now applied, with RLS verified on all six tables. Live signup/confirmation, public email delivery and authenticated end-to-end verification remain pending. See `supabase/README.md`. AI generation is disabled by default under the owner's $0-upfront constraint; a working free-tier provider must be configured explicitly. This does not mark the full original Milestone 4 complete: tutoring and broader production validation remain pending.

## 1. Current repository

The existing application is a JavaScript Next.js 15.5.5 App Router project using React 19.1.0, Tailwind CSS 4, ESLint 9, KaTeX/react-katex, and MathQuill/react-mathquill. It has an installed Google Generative AI SDK and an unused OpenAI dependency. There is no Python service, database, migration setup, authentication, automated test suite, CI configuration, or deployment manifest in the inspected source. `next.config.mjs` is empty configuration. The README is the create-next-app template, including generic Vercel guidance; it does not establish an actual deployment.

Scripts available: `npm run dev`, `npm run build`, `npm start`, and `npm run lint`. A package lock and installed dependencies exist. `.env.local` exists and was not opened; `.env*` is ignored. The route references server-side `GEMINI_API_KEY`. No real AI request was made during inspection.

Existing uncommitted work must be preserved: modifications to `app/api/generate/route.js`, `app/exam/page.js`, `app/globals.css`, `components/LatexRenderer.js`, `package.json`, and `package-lock.json`; untracked `components/ExamUploader.js` and `components/MathInput.js`. This milestone adds only this plan.

| Area | Implemented in source | Status and limitations |
| --- | --- | --- |
| Landing page (`app/page.js`) | Purple/pink design, illustration, responsive layout, link to `/exam` | Login, performance review, About/Help and policy links are placeholders; development text and default metadata remain. |
| Upload (`components/ExamUploader.js`) | One-file picker, free-text subject, loading/error UI, multipart POST | Says “Max 20MB” but enforces no size limit; `image/*` is broader than JPG/PNG. No authorization confirmation, page limit, or extraction review. |
| AI route (`app/api/generate/route.js`) | Sends file bytes to hardcoded Gemini model and requests 12 question/solution pairs | No separate extraction, taxonomy, source provenance, schema validation, verification, access control, rate limit, or persistence. Validity of generated math is unknown. |
| Practice (`app/exam/page.js`) | One question at a time, navigation, answer state, five-minute timer, progress, score, retake and review | State disappears on reload. Grading uses lowercase string equality. Hints, per-attempt feedback, difficulty and topic tags are missing. |
| Math components | KaTeX inline rendering and MathQuill answer input | Browser compatibility, accessibility, rendering and input behavior require runtime checks. Do not assume the configured virtual keyboard exists or that `disabled` prevents edits. |
| Learning platform | Landing page advertises progress features | Accounts, history, tutoring, adaptive recommendations, dashboard and ML experiments are absent. |

“Implemented in source” is not an end-to-end test result. Upload/generation requires a provider and has not been exercised. Reuse the landing page design, uploader shell, question navigation, progress/review UI and math renderer where practical; extend them rather than replacing the app.

### Priority defects and risks identified by inspection

1. **AI configuration:** installed SDK typings define the second `generateContent` argument as request options, not generation configuration. The current token, response MIME and schema settings are passed there. Move these into the supported generation configuration when repairing the route, and validate responses independently.
2. **JSON/LaTeX handling:** doubling every backslash before parsing can corrupt valid escaped JSON and mathematical notation. Parse valid structured JSON once; preserve strings and handle invalid provider responses explicitly. Test delimiters, escapes, fractions and multiline math.
3. **Grading:** `$2x$` and MathQuill's `2x` can compare unequal. Equivalent expressions are also rejected. A short generated answer is not a verified solution. Replace scoring through a mathematical checker in Milestone 3.
4. **Timeout:** the timer marks the exam submitted without saving/grading the current answer. Finish, Submit and timeout should use a shared finalization path, tested with the last unsaved answer.
5. **Browser-only math (build blocker):** `MathInput.js` imports a browser-dependent package and calls `addStyles()` at module scope; the installed package accesses `window`/`document`. Production build fails prerendering `/exam` with `ReferenceError: window is not defined`, consistent with this dependency. Introduce a browser-only boundary and verify the fix before new feature work. Current CSS cannot create a keyboard unsupported by the package.
6. **Untrusted inputs:** the server buffers the whole file without validating type, bytes, size or page count. It accepts an unvalidated `topic`, trusts provider JSON shape and returns success after parsing failures. Enforce limits before costly processing and return typed failures.
7. **Privacy/cost:** the public route has no authentication or rate limit and logs filenames and complete AI output. Remove content logging, add bounded requests and sanitize errors before using real uploads. Document content must never become application instructions.
8. **Accessibility/UI:** check keyboard access to the hidden file input, labels, MathQuill editing, mobile layout, math error fallback, and modal labeling/focus/Escape behavior. The renderer emits a paragraph inside a span in review, which should be corrected when touching that UI.

## 2. Proposed architecture

Keep the current Next.js frontend at the repository root. Add a single `backend/` FastAPI service with Pydantic contracts, SQLAlchemy models and Alembic migrations, plus PostgreSQL. Introduce TypeScript for new or substantially changed frontend modules incrementally; avoid a wholesale rewrite.

| Component | Purpose and communication | Receives / returns | Validation |
| --- | --- | --- | --- |
| Next.js UI and thin server proxy | Reuse design, collect inputs, render math; forward requests to the backend over a same-origin API boundary | Files, review edits, answers / sanitized documents, questions, feedback and progress | Component tests, keyboard checks, browser smoke flow |
| FastAPI application | Own authorization, validation and business rules; keep Next routes free of duplicated AI logic | Validated requests and session identity / Pydantic response models and typed errors | API tests with mocked provider and isolated database |
| Document service | Validate uploads, extract text with PDF tooling; invoke multimodal adapter for insufficient text/images | Bounded document bytes and course selection / reviewable question candidates with page/source references and uncertainty | Invalid bytes, oversize/page limits, malformed extraction, scanned-page fixtures |
| Provider adapter and prompt templates | Configure provider/model/timeouts; isolate SDK details; prompts stored separately in `backend/prompts/` | Necessary question/document context only / schema-validated candidates, hints and explanations | Mocked structured replies, refusal, timeout, injection and malformed JSON cases |
| Mathematical service | Verify supported problem types and student expressions with SymPy in a constrained worker | Restricted expressions, variable/domain assumptions and task type / correct, incorrect, indeterminate or unsupported, with reason | Manually checked Calculus I–III fixtures and domain edge cases |
| PostgreSQL and private storage | Store structured history and keep original documents outside public assets | Owner-scoped records and opaque storage keys / authorized records and streams | Migrations, transactions, cross-user denial and deletion tests |
| Recommendation service | Transparent production baseline separate from experiments | Authorized attempts, difficulty, retries and hint use / estimated review priorities and reasons | Deterministic examples and sparse-history behavior |
| Research modules | Compare BKT and experimental GRU without affecting production | Synthetic/licensed interaction sequences / predictions, metrics and model artifacts | Held-out students, calibration, reproducible runs and leakage checks |

Start extraction as a bounded request with explicit pending/failed status and no unbounded in-process task. Add a durable queue only if measured document latency or hosting limits justify it. Keep provider calls bounded by file/page/output limits, timeouts and request budgets.

Use a restricted mathematical grammar, never unrestricted `eval`, `sympify` or arbitrary LaTeX execution on student input. Enforce expression length, nesting, allowed symbols/functions, compute time and memory limits. Equivalence must respect domain restrictions; numerical sampling alone cannot prove it. Proof/open-ended answers require a separate review path. Generated-answer verification and student-answer grading are separate records.

### Proposed data model and contracts

- `users`: minimal account identity; identity provider identifier if using managed authentication.
- `courses`, `topics`: stable IDs, course membership, extensible subtopic hierarchy; seed all topics listed in the implementation brief for Calculus I, II and III. Question-topic relationships are many-to-many.
- `documents`: owner, opaque storage key, media type, byte/page count, authorization confirmation, processing status and timestamps.
- `extracted_questions`: document/page/subquestion provenance, text/math, proposed course/topics/difficulty, confidence/review reasons, revision and student approval status. Save corrected revisions before generation.
- `generated_questions`: owner, source question revision, question, final answer, ordered solution steps, hints, domain assumptions, difficulty, topic links, generation provenance and verification status/reason.
- `practice_sessions`, `session_questions`, `attempts`, `hint_events`: owner, ordering, question, raw/normalized answer, grading result, retry count, difficulty snapshot, hints and timestamps. Repeated submits use an idempotency key; attempts and progress updates are transactional.
- `topic_estimates`, `recommendation_history`: estimator/version, evidence count, estimate, recommendation reasons and timestamps. These are estimates, not proven mastery.
- Tutor messages: bounded retention and structured context if persistence is needed; avoid unnecessary personal data.

Proposed API groups: `/documents` upload/status; `/documents/{id}/questions` review/update/approve; `/practice/generate`; `/sessions` and `/sessions/{id}/attempts`; `/questions/{id}/hint` and `/solution`; `/tutor`; `/progress`; `/recommendations`; `/account` deletion. All identifiers require server-side ownership checks; ownership never comes from a trusted client-supplied user ID. Responses omit answer keys until an authorized hint/solution/submission action requires them.

Secrets remain server-side. Future `.env.example` should document placeholders for database URL, private storage root, provider/model/key, session/auth settings, frontend/backend URLs and upload limits; explicitly allow that example in `.gitignore`. Do not copy the local environment file. Choose one supported provider initially behind the adapter, avoiding simultaneous unnecessary SDKs.

## 3. Milestones and acceptance criteria

### Milestone 1 — Inspect and plan (this change)

- Read current source, dependencies, configuration and README; distinguish existing UI from verified behavior.
- Record existing work, defects, architecture, phases, tests and approval decisions here.
- Run available lint/build checks and report their actual outcomes. There is no `test` script.
- Preserve application code and stop for plan review. A green production build is not assumed; unresolved findings are explicitly queued below.

### Milestone 2 — Stabilize and build upload, extraction, classification and review

First resolve the existing production-rendering/configuration/JSON issues relevant to the new flow. Add FastAPI contracts and extensible taxonomy. Implement one document at a time initially, server-enforced limits (proposed: 20 MiB, 10 pages, one file per request), magic-byte/type checks, rejection of malformed/encrypted/unsupported PDFs, and authorization confirmation. Bound request bodies at the proxy and server before reading the entire upload. Private temporary storage must be outside `public/`, have opaque names and a cleanup policy.

Extract text where useful, fall back to multimodal analysis, validate all output with Pydantic, retain question/subquestion source references, and show uncertainty and editable course/topic/difficulty suggestions. Never generate practice directly from an unreviewed extraction. Treat extracted text as untrusted data, not system instructions.

Acceptance:
- PDF/JPG/PNG fixtures pass; disguised formats, empty/corrupt files, exceeded limits and provider failures produce clear safe errors.
- Review can correct and approve each extracted question; unknown topics and incomplete math remain flagged.
- Unit tests cover file validation, taxonomy classification and extraction schemas; integration tests mock AI replies including malicious instructions and malformed data.
- Until Milestone 4, this workflow is local development with synthetic/authorized fixtures only: no public upload deployment, shared private records or durable student storage. If public access is needed sooner, move authentication and ownership enforcement forward before release.

### Milestone 3 — Verified generation and practice

Generate concept-aligned variants from approved source revisions; support Easy/Medium/Hard, topic tags, full solutions, hints and verification provenance. Add the restricted symbolic checker and explicit indeterminate/unsupported outcomes. Preserve the existing navigation/review UI while adding reliable submission feedback, difficulty, topic, hint, solution and next-question behavior. Finalize current answers consistently on timeout, Finish and Submit; keep timer as an optional practice mode if approved.

#### Required math answer editor

Students must be able to enter answers visually in a Pearson-style math editor: textbook-like fractions, powers, roots and symbols, with keyboard typing and a clickable/touch-friendly toolbar. This is an embedded Epsilonly answer interface; no Pearson account or integration is required.

- Provide templates for fractions, exponents, subscripts, square/nth roots, parentheses, absolute values, logarithms, trigonometric functions, pi and infinity. Include calculus templates for integrals, derivatives, limits, sums and vectors/matrices where the supported question type needs them.
- Let students move between template slots, edit nested expressions, select/delete content, and undo/redo. Preserve answers when navigating between questions. Provide clear input instructions and an accessible plain-text alternative using documented syntax.
- Keep the expression visibly typeset while editing. Match the answer format to the question: an expression, equation, interval, ordered tuple/vector or multiple labeled answer fields. Show examples and syntax feedback without revealing the correct answer.
- Keep a consistent editor value and answer-format contract between the frontend and mathematical service. Store the original input and the validated normalized representation; convert only through the restricted parser. Do not assume editor-generated LaTeX is automatically valid or safe for SymPy.
- Evaluate the existing MathQuill component against these requirements first. Repair and extend it if it meets browser, accessibility and template requirements; otherwise document the limitations and select a maintained editor before replacing it. Rendering with KaTeX alone does not provide editable math or a toolbar.
- A well-formatted answer is not necessarily correct. The backend checks mathematical equivalence only for supported answer types and returns indeterminate/unsupported when reliable grading is unavailable.

Acceptance:
- Structured generation responses validate; failure cannot silently become an empty successful exam. Unverified answers carry visible uncertainty and cannot be scored as guaranteed correct.
- Manually verified fixtures cover limits/derivatives, integrals/series, and multivariable/vector topics; unsupported cases are honestly marked.
- Tests cover equivalent forms, dollar delimiters, singularities, domain restrictions, undefined values, arbitrary constants where applicable, expression resource limits and proofs requiring review.
- A browser smoke flow covers upload review → generation → math input → hints → submission → solution → next question, including mobile and keyboard use.
- Editor interaction tests cover toolbar insertion, nested fractions/powers, template-slot navigation, undo/redo, answer restoration, read-only submission state, mobile touch and the plain-text alternative. Round-trip fixtures include `1/2`, `(x+1)/(x-1)`, `sqrt(x)`, `sin(x)^2`, definite integrals, intervals and vectors; unsupported formats are explicitly explained rather than silently misgraded. Keyboard/screen-reader checks and a passing production build are required.
- Generation/checking remains local development until private identity and persistence are ready.

### Milestone 4 — Authentication, persistent progress and tutoring

Select an established authentication solution rather than inventing a credential/session protocol. Add migrations and owner-scoped repositories; keep documents private and authenticated downloads ownership-checked. Persist sessions, attempts and hint use. Add tutoring with structured current-question context, hint-first behavior, bounded history/output and configurable request budgets. Avoid sending names, emails or other unnecessary identifiers to the provider.

Acceptance:
- Sign-in/out, session expiry and applicable secure cookie/CSRF controls work; cross-user reads/writes/downloads fail for every private resource.
- Attempts survive reload; retry/idempotency tests prevent duplicate records; failed transactions do not leave inconsistent progress.
- Rate limits, body limits, safe errors, redacted logs and an AI-error notice are present before external use. Shared hosting uses a rate-limit mechanism that works across service instances.
- Account deletion removes dependent database records and private files, with documented backup retention and failure/retry behavior.
- Tutor integration tests mock hints, follow-up explanations, refusals and timeouts. No claim that tutoring proves an open-ended answer correct.

### Milestone 5 — Baseline recommendations and dashboard

Estimate review needs from a documented recent-attempt window, correctness, difficulty, retries and hint usage. Show evidence counts and plain-language reasons rather than misleading decimal mastery percentages. Reuse the landing page's performance entry point.

Acceptance:
- Dashboard shows attempts, recent accuracy, topic performance, history, topics needing review, recommended next questions and progress over time.
- Recommendations prioritize supported weak areas, handle new students and sparse evidence, and respect course selection and document privacy.
- Deterministic tests cover retries, hinted correct answers, difficulty, recent improvement and empty history. Every dashboard figure reconciles with saved attempts.

### Milestone 6 — BKT and GRU research experiments

Create separate `backend/research/` modules. BKT documents initial mastery p(L0), learning p(T), guess p(G), slip p(S), and updates: for correct responses, posterior = L(1-S)/(L(1-S)+(1-L)G); for incorrect, posterior = LS/(LS+(1-L)(1-G)); next L = posterior + (1-posterior)T. Validate probabilities and handle degenerate denominators explicitly. Document binary-skill and stationary-parameter assumptions and the policy for multi-topic items.

Add an experimental PyTorch GRU using topic/correctness interaction sequences, sequence masks and next-interaction targets. Use synthetic or appropriately licensed data; no real student training records without explicit permission and privacy safeguards. Keep PyTorch an optional research dependency.

Acceptance:
- BKT numerical/edge tests pass; GRU shape, masking, target shifting and reproducibility tests pass.
- Baseline, BKT and GRU are compared on the same held-out students with no preprocessing leakage; report ROC-AUC where defined, log loss, Brier score and calibration, plus sample size and uncertainty.
- Experiments record dataset license/provenance, seeds, split rules, parameters and limitations. Synthetic results do not imply real-world superiority.
- Production continues using the baseline until a separately reviewed evaluation supports a change.

## 4. Testing, documentation and deployment

Use pytest for Python units/API integration, an isolated PostgreSQL test database for persistence/authorization, frontend interaction tests where state matters, and a small browser smoke suite. Mock paid AI calls in normal tests. Keep manually verified calculus fixtures with assumptions, accepted answers, expected verification status and explanation of edge cases. Never use real student data in examples or tests.

Update the README incrementally as features land: architecture and data flow, exact prerequisites, environment setup, migration commands, frontend/backend development commands, test commands, current limitations, research plans and deployment steps. Add screenshots only from working verified UI. Pin Python dependencies, retain the npm lockfile, and assess supported versions and security updates before public deployment rather than silently upgrading during inspection.

Initial deployment proposal: Next.js hosting plus a Python-capable backend host, managed PostgreSQL and private persistent storage. Do not store uploads on ephemeral frontend disks. Final hosts remain undecided. Document HTTPS, backend origin restrictions, proxy body/time limits, private storage, migration execution, backups, retention/deletion and secret configuration. No public release before Milestone 4 security acceptance. Add CI for lint/build and backend tests once the service exists.

After every milestone: summarize changes and files, report executed tests and limitations, identify decisions requiring review, and wait before beginning the next milestone. Commit only with explicit approval.

## 5. Decisions for plan review

1. Approve keeping Next.js in place and adding one FastAPI service, PostgreSQL and private storage, with incremental TypeScript adoption.
2. Confirm the existing provider should remain the initial adapter, or select another provider before making paid integration calls. Confirm upload/page limits and provider data handling/cost preferences.
3. Select authentication and deployment providers before Milestone 4; bring identity work forward if multi-user access is needed earlier.
4. Decide whether the five-minute exam mode should remain optional alongside untimed practice. Default proposal: preserve it as optional.

No provider purchase, migration, deployment, commit or later-milestone implementation is authorized by this document alone.

## 6. Milestone 1 validation record

- `npm run lint`: passed, zero errors and one existing `@next/next/no-img-element` warning at `app/page.js:40`.
- `npm run build`: initial sandbox attempt failed because Turbopack could not bind a local port. The approved rerun outside the sandbox compiled successfully, then failed prerendering `/exam` with `ReferenceError: window is not defined`. Production build is therefore failing; it is not certified stable.
- `git diff --check`: reports existing trailing whitespace in the pre-existing modified application files; those files were left unchanged.
- Automated unit/integration tests: unavailable; no test script or test files found in the inspected project.
- Live AI generation, browser interaction, authenticated access and database behavior: not tested; the latter two are not implemented.
