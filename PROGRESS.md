# Progress

Plan: `PLAN.md`. Rules for working here: `CLAUDE.md`.

## Milestones

- [ ] M1: Auth, passphrase + recovery key, encrypted dream create/list/edit/delete, rules and tests (coded; emulator tests not yet run)
- [ ] M2: Entry form fields, search (coded; unit tests pass)
- [ ] M3: Patterns dashboard (coded; unit tests pass)
- [ ] M4: Opt-in AI read (own key), export, delete account (coded; unit tests pass, new rules test not yet run)
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
- 49 unit tests pass; lint and typecheck clean.

## Next up

1. **Run the emulator suites** (needs > 1.5 GB free RAM, Java 21+): `npm run test:rules`, then `npm run test:e2e:quick -- e2e/journal.spec.ts`. Fix whatever fails. The e2e spec and the new delete-rule test have never run.
2. Add e2e for the M2 fields/search, the Patterns tab, export and delete account (quick project only).
3. `npm run verify`, then tag `m1-done` … `m4-done`.
4. M5 (ask the user first for the Firebase project ID/region, GitHub repo, any deploy): CSP header, CI deploy from tags with build hashes, "Verify this build" page, landing page.

## Notes

- No Firebase project yet: everything runs on the emulators (`demo-dreamlog`).
- The 2,000-dream pattern test takes ~5s alone (grows with n²); a typical journal is far smaller.
- Update the pattern perf if journals above ~1,500 dreams matter (e.g. limit recurring detection to the last N).
