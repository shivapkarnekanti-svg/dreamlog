# Progress

Plan: `PLAN.md`. Rules for working here: `CLAUDE.md`.

## Milestones

- [x] M1: Auth, passphrase + recovery key, encrypted dream create/list/edit/delete, rules and tests (`m1-done`)
- [x] M2: Entry form fields, search (`m2-done`)
- [x] M3: Patterns dashboard (`m3-done`)
- [x] M4: Opt-in AI read (own key), export, delete account (`m4-done`)
- [x] M5: Landing text, CSP and security headers, build hashes, verify page, CI, deploy (`m5-done`; real-device PWA check still open)
- [ ] M6 (optional): theme grouping with transformers.js

A milestone is ticked and tagged `mN-done` only after `npm run verify` passes.

## Done

- Scaffold, WebCrypto vault, ciphertext-only Firestore rules (`docs/crypto.md`).
- M1 screens: `src/auth/*`, `src/App.tsx`, `src/dreams/DreamsScreen.tsx`; e2e spec `e2e/journal.spec.ts` (3 tests, written, NOT yet run).
- M2: emotions, people, places, tags, flags, sleep/mood, search (`src/dreams/*`).
- M3: `src/patterns/*` (compute, text, Dashboard, SVG charts).
- M4: `src/ai/*` (Analyze with AI), `src/account/*` (export, delete account), rules allow owner delete of `users/{uid}`.
- Tabs in the dreams screen: Journal, Patterns, Analyze, Account.
- Verified end to end (see Notes).

## Next up

1. Real-device check of the PWA install and offline logging.
2. Optional: deploy from CI with keyless login (Workload Identity Federation) and a `production` environment approval.
3. Branch protection on `main` once the team grows; close GitHub secret-scanning alert 1 and restrict the Firebase API key in Google Cloud.
4. M6 (optional): theme grouping with transformers.js (needs package approval).

## Notes

- Firebase project created 2026-10-23: `dreamlog-app-5754` (Spark, region nam5 chosen; Firestore database and Email/Password sign-in still to be enabled in the console). Local work still runs on the emulators (`demo-dreamlog`).
- GitHub repo: https://github.com/shivapkarnekanti-svg/dreamlog (public, nothing pushed yet).
- Deployed 2026-10-24 from the maintainer PC with `firebase deploy` (no CI deploy key by choice): Firestore rules and Hosting at https://dreamlog-app-5754.web.app, with CSP and security headers. Tag workflow `deploy.yml` re-verifies, builds and publishes build hashes only.
- Verified 2026-10-24: `npm run verify` passes (49 unit, 11 rules, 16 e2e on desktop + pixel-390, 0 audit issues).
- Flaky once under low memory: first journal e2e timed out waiting for the sign-in button; passed on rerun.
- Fixed during verification: ID token refresh after email verification; recurring-dream detection 5.3s to 0.6s at 2,000 dreams.
