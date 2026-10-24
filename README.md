# Dreamlog

A private, open-source dream journal for the web. Your dreams are encrypted in your browser before they're saved, so the server only ever holds scrambled text. Patterns in your dreams (people, places, emotions, recurring dreams, links to sleep and mood) are worked out in your browser too.

**We can't read your dreams. You can check that in this code.**

## Features

- Log dreams with emotions, people, places, tags, and lucid/nightmare/recurring flags
- Passphrase-based encryption with a downloadable recovery key
- Patterns dashboard, computed on your device
- Optional "Analyze with AI" on dreams you pick, using your own Anthropic API key
- Works offline and installs to your home screen (PWA)
- Export your dreams as JSON, or delete your account and everything in it

## How the privacy works

See [docs/crypto.md](docs/crypto.md). In short: a random key encrypts your dreams with AES-GCM. That key is locked with your passphrase (PBKDF2) and separately with a recovery key. Firestore stores only the locked key and the encrypted dreams.

**If you lose both your passphrase and your recovery key, your dreams can't be recovered by anyone.**

## Run it locally

Needs Node 22+ and Java 21+ (for the Firebase emulators).

```bash
npm install
npm run emulators   # in one terminal
npm run dev         # in another
```

Tests: `npm test`, `npm run test:rules`, `npm run test:e2e:quick`, or everything with `npm run verify`.

## Self-host

1. Fork this repo.
2. Create a free Firebase project (Spark plan). Enable Email/Password auth and Firestore.
3. Copy `.env.example` to `.env.local` and fill in your web config.
4. `npx firebase deploy --only firestore:rules,hosting`

## License

[AGPL-3.0](LICENSE). If you run a modified version as a website, you must publish your changes.

Security reports: see [SECURITY.md](SECURITY.md).
