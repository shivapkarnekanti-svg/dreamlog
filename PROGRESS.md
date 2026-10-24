# Progress

Plan: `PLAN.md`. Rules for working here: `CLAUDE.md`.

## Milestones

- [x] M1: Auth, passphrase + recovery key, encrypted dream create/list/edit/delete, rules and tests (`m1-done`)
- [x] M2: Entry form fields, search (`m2-done`)
- [x] M3: Patterns dashboard (`m3-done`)
- [x] M4: Opt-in AI read (own key), export, delete account (`m4-done`)
- [ ] M5: Landing page, CI deploy from tags with build hashes, CSP, deploy (ask first)
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

M5 (ask the user first: Firebase project ID/region, GitHub repo, any deploy, any new package):

1. CSP header (connect-src only Firebase + api.anthropic.com), security headers in firebase.json.
2. GitHub Actions: run verify on PRs; deploy from `mN-done` tags with published build hashes; "Verify this build" page.
3. Landing page, README screenshots, CONTRIBUTING.md, issue templates; branch protection once the repo exists.
4. Real-device check of the PWA install and offline logging.

## Notes

- No Firebase project yet: everything runs on the emulators (`demo-dreamlog`).
- Verified 2026-10-24: `npm run verify` passes (49 unit, 11 rules, 16 e2e on desktop + pixel-390, 0 audit issues).
- Flaky once under low memory: first journal e2e timed out waiting for the sign-in button; passed on rerun.
- Fixed during verification: ID token refresh after email verification; recurring-dream detection 5.3s to 0.6s at 2,000 dreams.
