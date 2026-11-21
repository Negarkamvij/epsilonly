# CalcQuest

CalcQuest is a Next.js calculus practice prototype. The phased platform architecture and current limitations are documented in [DEVELOPMENT_PLAN.md](./DEVELOPMENT_PLAN.md).

## Math answer editor

Visit `/exam` to upload material, or `/math-editor` to try the answer editor without an upload or AI request. The editor supports visual fractions, powers, subscripts, roots, functions, calculus notation and vector brackets. It includes a responsive symbol toolbar, undo/redo, clear, a labeled LaTeX text alternative, and a read-only submitted view. Use `/` for a fraction, `^` for a power, and arrow keys or Tab to move between expression slots. Undo uses Ctrl/Cmd+Z; redo uses Ctrl/Cmd+Shift+Z.

Answers are represented as LaTeX. Signed-in practice sessions autosave to Supabase after setup; the standalone playground is temporary and needs no account. MathQuill loads only in the browser so production prerendering can complete. There is no Pearson integration.

## Accounts and saved progress

CalcQuest now includes a Supabase email/password integration, confirmation and password recovery routes, private practice sessions, answer autosave, submission history and a progress dashboard. The Supabase project is connected locally and the database migration has been applied. The signup form is active; account creation and email confirmation still need a user-run test. Public email delivery settings need configuring before inviting students. Follow [supabase/README.md](./supabase/README.md) and [.env.example](./.env.example), then apply the included SQL migration. Use `/signup`, `/login` and `/dashboard` after setup.

The service calculates and stores exact-answer matches on the server, not mathematical equivalence. AI answers remain unverified, and these matches are not mastery estimates or verified ML labels. Full extraction review, symbolic grading and adaptive prediction remain future milestones.

AI generation is disabled by default to prevent unapproved provider usage. There is no paid fallback. The current Gemini project reported HTTP 402 (depleted credits); generating from uploads still requires a working free-tier or otherwise explicitly approved API configuration. The math playground remains available without an AI call.

Run `npm test` for validation, mocked-generation and PostgreSQL/RLS tests, plus `npm run lint` and `npm run build`. No tests use real student data or paid model calls. Local SQL tests pass; live Supabase signup/email delivery, PostgREST and persistence checks remain pending project configuration. Dependency advisories remain in legacy math/build packages; review them before a public launch.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Netlify setup, public Supabase authentication URLs and post-deployment checks. Local environment files are not committed. AI generation remains disabled by default.
