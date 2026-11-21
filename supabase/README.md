# Supabase setup for εpsilonly

Status, November 20, 2026: the owner created the Supabase project. Its public URL/key are connected in the ignored local environment file, the migration was applied through the dashboard SQL Editor, and all six application tables were verified with RLS enabled. The local signup form is active. Site URL and the exact local callback were configured, email confirmation remains enabled, and the minimum password length was set to 12. No subscription, billing change, real student account, password entry, or confirmation email was created by the assistant. Read-only live API checks passed: the public key reaches auth settings, signups are enabled, and anonymous reads of student sessions and answers are denied with PostgreSQL permission errors. A user-run signup/confirmation test remains pending. The server-only secret key is still unset, so AI session creation and account deletion remain unavailable; AI calls also remain explicitly disabled.

## Create a project and apply the schema

1. Create a project in the Supabase dashboard using the Free plan. Keep its database password private. No Docker or separate Python authentication service is needed.
2. Open the project's SQL Editor and run `supabase/migrations/202611200001_accounts_progress.sql` once. Alternatively, apply it through the Supabase CLI migration workflow. Do not rerun it manually over existing tables; subsequent schema changes should use new migrations.
3. Leave the `private` schema out of the Data API's exposed schemas. Its answer keys must never be available to browser clients.
4. From the project's Connect panel, obtain the project URL and publishable key (legacy anon keys also work).

## Configure the application

Add these settings to `.env.local`, preserving any existing variables:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SECRET_KEY=your-server-only-secret-key
ENABLE_AI_GENERATION=false
APP_ORIGIN=http://127.0.0.1:3000
```

Set `APP_ORIGIN` to the exact HTTPS origin behind a production reverse proxy; local development may use its matching HTTP origin.

The first two Supabase values are public app configuration. The server-only secret (or legacy `SUPABASE_SERVICE_ROLE_KEY`) is needed to create trusted question records and delete accounts. Enter it privately in the local environment file or deployment secret settings, never in chat or a public file. Never give it a `NEXT_PUBLIC_` prefix. The app does not need the database password.

Without a configured Supabase project, account forms deliberately show a setup notice and cannot create accounts. Without the server-only secret, login can work but generation and account deletion cannot. Production builds inline public settings, so rebuild/restart after changing them.

`ENABLE_AI_GENERATION` defaults to off. No paid AI fallback is used. Set it to `true` only after confirming that the API key/project has an acceptable quota and billing configuration. Google's free quotas are limited; a paid project's depleted credits do not automatically make its requests free. Existing generation uses Gemini and still needs a working `GEMINI_API_KEY`. Provider HTTP 402 now produces a specific credits-depleted message rather than a generic upload failure.

## Configure email authentication

In Supabase Authentication settings:

- Enable email/password authentication and keep email confirmation enabled.
- Set the minimum password length to 12 (the UI enforces 12–128 characters).
- Set Site URL to `http://127.0.0.1:3000` for local development. Use your actual HTTPS domain when deployed.
- Allow the exact callback URL `http://127.0.0.1:3000/auth/callback`; add your production callback when deployed. If developing on `localhost` instead, use that consistently and add its callback too.
- Configure password strength, built-in auth rate limits and bot protection before public launch.

The default confirmation flow uses `/auth/callback` and PKCE, which is best tested in the same browser where signup started. A token-hash template also supports cross-browser confirmation via `/auth/confirm`:

Confirmation email link:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard">Confirm your email</a>
```

Password recovery email link:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset your password</a>
```

Supabase's default SMTP service is for testing and restricts delivery to project team addresses. Public email signups require configuring an email delivery service/custom SMTP. Evaluate its free quota separately; this change does not purchase or configure an email service. See the [official SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).

## Data flow and privacy

- Supabase Auth stores credentials; εpsilonly never stores plaintext passwords or duplicates identity records.
- Middleware refreshes cookie-based sessions. Private pages and API routes independently verify the user with the Auth server; client-side navigation state is not authorization.
- `practice_sessions`, `practice_questions`, `practice_answers` and `practice_attempts` have RLS policies that allow authenticated students to select only their own records. Anonymous access is denied.
- Direct student writes to those tables are denied. Server-only generation RPCs create sessions and answer keys; user-authenticated RPCs validate ownership and save or submit their answers.
- Answer keys are in `private.question_answers`. The review RPC reveals them only for a completed session owned by the caller.
- Draft answers autosave after a short debounce. The UI reports save failures. Wait for “Saved” before leaving; edits made offline or before a successful save are not guaranteed durable.
- The existing five-minute practice timer runs from the saved session start time. Reloading an expired session submits its saved answers; untimed practice is not implemented yet.
- Submission is transactional and idempotent: it saves the latest supplied answers, writes one attempt per question, and marks the session completed. A retry returns the existing result.
- Dashboard totals include all completed sessions; history displays the latest 20. Activity dates use UTC. No synthetic success metrics appear in a real dashboard.
- Current grades are exact-text matches, with `grading_method=exact_text_v1` and `is_correct=NULL`. Do not use these records as verified correctness labels for ML. Mathematical equivalence, question verification, hint tracking and knowledge tracing remain future work.
- Generation is restricted to five requests per user per 15 minutes using a database-backed quota. It accepts PDF/JPG/PNG signatures and bounds streamed upload bytes; full PDF parsing/page-count validation and extraction review are still pending.
- Original uploaded documents are not persisted by this implementation. Their bytes are sent only to the configured generation provider after the user confirms authorization. No user name/email is included in the model prompt, and raw uploads/provider output are not logged.
- Clear-history removes the current user's sessions, drafts, attempts and private answer keys. Account deletion additionally requires password reauthentication and a server-side admin call, and cascades through owned data. Database backups, if enabled, follow the project's configured retention.

## Verification

```sh
npm test
npm run lint
npm run build
# With the local server running:
npm run test:http
# After connecting a Supabase project (read-only live checks):
npm run test:supabase
```

Tests use synthetic users and an in-memory PostgreSQL engine (PGlite). They run the actual migration with simulated Supabase auth roles and `auth.uid()`, covering RLS, cross-user denial, private keys, rollback, immutable/idempotent submission, aggregates, quotas and deletion. Provider tests use mocks and make no paid calls. They do not replace testing Supabase Auth email delivery, PostgREST RPCs and cookie refresh against the live project.

Local verification on November 20, 2026: 10 automated test cases passed (including the PostgreSQL/RLS workflow), 11 HTTP smoke checks passed, and lint/build passed. The signup interface was also checked in the browser with the expected unconfigured-project notice. The in-memory SQL workflow covers several ownership and transaction assertions within one test case. No live student identity or hosted Supabase database was used.

After connecting a disposable development project, manually verify signup → confirmation → login → generation → answer autosave → reload/resume → submission → dashboard → logout, and repeat cross-user denial using two test accounts. Test confirmation expiry, password recovery, resumed sessions, interrupted network saves, and deletion with disposable data before inviting students.

Next.js was patched to 15.5.29 and compatible transitive fixes were applied. The dependency audit still reports advisories in legacy math/rendering dependencies and the build chain; these require a separate compatibility review before public release. Do not treat this local build as production certification.
