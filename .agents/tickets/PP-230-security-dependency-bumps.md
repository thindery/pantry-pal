# PP-230: Security dependency bumps (Next.js, Auth.js, zod and transitive)

**Status:** 🔨 In progress (2026-11-26)
**Priority:** P0
**Phase:** Security
**Created:** 2026-11-26
**Depends on:** —
**Blocks:** —

---

## Problem

`npm audit --omit=dev` on origin/main (Nov 26) reported 10 vulnerabilities: 4 critical, 5 high, 1 moderate. Live app ran `next` 16.2.10 and `next-auth` 5.0.0-beta.31.

- **next 16.2.10:** unauthenticated RCE paths (Image Optimization API, `next/og`, `use cache`), a Middleware/Proxy bypass, Server Action DoS and SSRF, cache poisoning. Our middleware gates `/dashboard`, so the bypass matters. Fixed in 16.4.6, same major.
- **next-auth / @auth/core:** `auth` object fails open on config errors, email homoglyph bypass, `getToken()` throws on malformed Bearer headers. Fixed in next-auth 5.0.0-beta.32 and @auth/core 0.41.3 (via @auth/pg-adapter 1.11.3).
- **zod < 4.6.6:** memory exhaustion on oversized collections. Fixed in 4.6.7.
- **Transitive:** source-map-js, baseline-browser-mapping, nanoid, postcss (all picked up by the lockfile update; postcss comes with next 16.4.6).

## Work

1. Bump `next` and `eslint-config-next` to 16.4.6 (exact pin kept), `next-auth` to `^5.0.0-beta.32`, `@auth/pg-adapter` to `^1.11.3`, `zod` to `^4.6.7`.
2. Regenerate `package-lock.json` with `npm install --package-lock-only` and update only the transitive packages above. **Do not run `npm audit fix`:** it jumps `vite` 6 to 8 (a dev-tool major) and drops the cross-platform esbuild and rollup entries.
3. `npm run check` plus a production `next build` must pass. Smoke the app: sign-in redirect, `/dashboard/`, `/pricing/`, `/recipes/`.
4. Deploy with `./deploy/deploy-docker.sh main`, check the build id inside the frontend container, and run the site-qa hook.

## Result

`npm audit --omit=dev`: 0 vulnerabilities. Dev-only advisories left: none flagged after the update except the dev-tree `zod` 3.x copy pulled by `eslint-plugin-react-hooks` (lint tool, never shipped).

## Rules

No new services, no spend, no secrets. No change to the auth design, only the library versions.
