# Progress

Plan: `PLAN.md`. Rules for working here: `CLAUDE.md`.

## Milestones

- [ ] M1: Auth, passphrase + recovery key, encrypted dream create/list/edit/delete, rules and tests
- [ ] M2: Entry form fields, search (in the browser, on decrypted data)
- [ ] M3: Patterns dashboard (local pattern functions + SVG/CSS charts)
- [ ] M4: Opt-in AI read (own key), export, delete account
- [ ] M5: Landing page, CI deploy from tags with build hashes, CSP, deploy (ask first)
- [ ] M6 (optional): theme grouping with transformers.js

## Done

- Scaffold: Vite/React/TS, PWA, Firebase emulators (`demo-dreamlog`), ESLint/Prettier, Vitest, Playwright + axe, secret-scan pre-commit hook, icons.
- `src/crypto/vault.ts`: data key, PBKDF2 passphrase wrap, recovery wrap, AES-GCM dream encryption.
- `firestore.rules`: owner-only key record and ciphertext-only dreams.

## Next up

- Review crypto + store, rules tests on the emulator, then auth/passphrase UI and dream CRUD UI.

## Notes

- No Firebase project yet: everything runs on the emulators until the user gives a project ID.
