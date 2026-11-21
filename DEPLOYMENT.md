# Deploy εpsilonly on Netlify

Production hostname: `epsilonly.netlify.app` (HTTPS).

Keep the exact `APP_ORIGIN` value in the hosting environment. Netlify currently treats this variable as secret, so repeating the full value in source documentation causes a false-positive deployment block.

The display brand is **εpsilonly**; repository, folder, package, and URL names use ASCII `epsilonly`.

Use a Netlify Free account for the initial deployment. Its free allowance is bounded; do not enable upgrades, credit purchases, or paid AI fallback automatically. Keep AI generation off until a working provider and its billing/limits have been explicitly approved.

## Build and environment

Import `Negarkamvij/epsilonly` from GitHub. The repository's `netlify.toml` selects Node 22, `npm run build` and the `.next` output. Netlify's automatic Next.js adapter supplies SSR, route handlers and middleware; this is not a static drag-and-drop deployment.

Set these in the Netlify dashboard for production builds and runtime:

- `NEXT_PUBLIC_SUPABASE_URL`: the connected Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: its public publishable key.
- `APP_ORIGIN`: the exact public HTTPS origin, such as `https://your-site.netlify.app`, without a trailing slash.
- `ENABLE_AI_GENERATION=false`.

A server-only Supabase secret is not needed for signup/login. `SUPABASE_SECRET_KEY` is required later for trusted generated-question writes and account deletion; it must be stored only in the hosting environment, never GitHub or a `NEXT_PUBLIC_` variable. Do not upload `.env.local`. No database password is needed by this application.

Both `NEXT_PUBLIC_` values are compiled into the browser bundle; rebuild after changing them. Pin production `APP_ORIGIN` to prevent authentication redirects and write-request checks from using a proxy's internal hostname. Do not use a private Netlify login gate on the production site if students need to follow email links.

## Supabase production auth URLs

After the public URL exists, set Supabase Authentication → URL Configuration:

- Site URL: the public HTTPS origin.
- Additional redirect URL: `<origin>/auth/callback`.
- Keep local development callbacks separately if needed.

Email confirmation stays enabled, and the password minimum is 12 characters. Existing confirmation emails can contain the old local URL; request a new link after changing the configuration. Account confirmation and password recovery must be tested from the published URL, not a deploy preview.

The project currently uses Supabase's testing mail service, which limits recipients to project-team addresses. Public student signup needs an appropriately configured email-delivery service/custom SMTP. Do not disable email confirmation just to bypass delivery restrictions.

## Post-deployment checks

1. Open the public homepage and signup page on another device.
2. Check that anonymous dashboard/exam visits redirect to login.
3. Verify that private mutation APIs reject anonymous and cross-origin requests.
4. The account owner should sign up with their own password, follow a fresh confirmation email and open the progress dashboard.
5. Test password recovery and logout. Never have an assistant enter a user's new password.
6. AI generation must remain disabled. Uploads are not restored merely by deploying; the depleted Gemini credits/free-tier configuration is a separate issue.

The database migration has already been applied to the owner's Supabase project. Do not run it a second time. Later schema updates need new migrations. Before enabling public document generation, complete PDF page validation/extraction review and mathematical verification from the development plan.
