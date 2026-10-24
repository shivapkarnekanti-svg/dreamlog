# Contributing to Dreamlog

Thanks for helping. Dreamlog is a private dream journal, so a few rules are fixed:

- The server only ever stores ciphertext. Never add a plaintext field. See `docs/crypto.md`.
- Patterns are computed in the browser. Dream text leaves the device only through the opt-in "Analyze with AI" button.
- No analytics, trackers, or third-party scripts.
- Free Firebase (Spark) plan only.

## Set up

```bash
npm ci
cp .env.example .env.local
npm run emulators   # terminal 1: Auth and Firestore emulators (needs Java 21+)
npm run dev         # terminal 2
```

## Before you open a pull request

```bash
npm run verify
```

This runs lint, typecheck, unit tests, Firestore rules tests, end-to-end tests, the build and an audit. CI runs the same command on every pull request.

## Style

- Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- Small pull requests. One change each.
- Adding a dependency needs a reason in the pull request: what it does, license, size, and why a few lines of code would not do.

## Security problems

Do not open a public issue. Follow `SECURITY.md`.
