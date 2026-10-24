# Dreamlog: private, open-source dream journal PWA

Read `PROGRESS.md` first, then `PLAN.md` only as needed. Don't read node_modules, dist, coverage or package-lock.json.

## Commands

- `npm run dev`: Vite dev server · `npm run emulators`: Auth + Firestore emulators (project `demo-dreamlog`, Java 21+)
- `npm test`: Vitest unit · `npm run test:rules`: rules tests (run only when rules or rules-tests change)
- Quick e2e, touched specs only: `npx firebase emulators:exec --only auth,firestore --project demo-dreamlog "npx playwright test --project=desktop e2e/<spec>"`. Full `test:e2e` runs only inside `verify`.
- `npm run verify`: lint, typecheck, unit, rules, e2e, build, size, audit. **Must pass before a `mN-done` tag, a deploy, or a push.**

## Stack

Vite + React + TypeScript (strict), modular Firebase SDK (Auth Email/Password, Firestore), WebCrypto, vite-plugin-pwa, Vitest, Playwright + axe. No router, no UI framework, no chart library, no web fonts. AGPL-3.0.

## Privacy and security (HARD)

- The server holds ciphertext only. Dreams: `users/{uid}/dreams/{id}` = `{iv, ciphertext, createdAt, updatedAt}`. Key record: `users/{uid}`. Never add a plaintext field. See `docs/crypto.md`.
- Firestore deny by default, owner-only, verified email, `hasOnly` on every write. Rules tests must pass before any deploy.
- Patterns are computed in the browser. Dream text leaves the device only through the opt-in "Analyze with AI" button (user's own Anthropic key, localStorage only).
- Never render user text as HTML. No analytics or trackers. No service-account keys, tokens or secrets in the repo.
- Spark plan only: never link billing, enable Functions, or any paid API. If a step asks, STOP and tell the user.

## Ask before (irreversible)

Creating the Firebase project, ID or region, auth settings, any deploy, creating the GitHub repo, git push, deleting data, adding any npm package (show downloads, date, license, size).

## Working rules

- Conventional Commits. Commit each finished task after lint, typecheck, unit (and touched quick e2e) pass. Update PROGRESS.md after each task. Tag `mN-done` per milestone.
- PC has 7.8 GB RAM. Check free memory before heavy commands; under 1.5 GB start nothing heavy. One emulator/e2e run at a time; never leave emulators running.
