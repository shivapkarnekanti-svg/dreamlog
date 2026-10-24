# Dream journal: does building one make sense?

## Context

You want a website where people log dreams and see patterns in them, private to the one person who wrote them. You chose: a product for others, patterns found locally, with AI analysis only on request. This is a new project, separate from Shoppy (new folder, new repo, new Firebase project).

## What already exists (research, Oct 2026)

The market is crowded. Dozens of apps, mostly mobile:

- **Oniri**: voice capture, AI interpretation, lucid dreaming tools, about 3.8k ratings on the US App Store.
- **Elsewhere**: finds recurring symbols, characters and settings across dreams.
- **Dream Journal Ultimate**: free, theme graphs, AI interpretation. Also has a public "Dream Wall".
- **Shape**: lucid dreaming, $19.99 a month, iOS only.
- **Dreamink, myDream, Dremi, Dream Catcher, DreamScape, Oneira, Reverie**: newer apps that sell privacy ("on-device", "zero-knowledge", "E2EE").

Gaps I found:

1. **Privacy you can check.** Every privacy claim is the developer's own word. I found no open-source dream journal with end-to-end encryption. Apps with AI insights send your dream text to a server, which works against "only I can see it".
2. **Web-first.** Almost every competitor is a phone app. Few work well in a browser on a laptop.
3. **Patterns about you, not dream-dictionary meanings.** Most apps do "a snake means X". Few link dreams to your own life: mood, stress, sleep, the people in your life, over months.

## Verdict

- **As a business:** weak. The space is full, it's hard to charge for, and users switch for features, not privacy. Don't quit anything for it.
- **As a niche product:** reasonable if the pitch is sharp: _"an open-source dream journal encrypted on your device. We can't read your dreams. Patterns are worked out in your browser."_ Being open source makes the privacy claim checkable, which is the one thing competitors can't copy cheaply.
- **Lower-risk path:** build it for yourself first (about 2–4 weekends). Use it for a month. Then put up a landing page and see whether anyone signs up before you build accounts, billing and so on.

## Recommended approach

Reuse the stack you know from Shoppy, adjusted for encryption.

**Platform:** PWA first. If store presence or reliable reminders become necessary, wrap the same code with Capacitor later (no rewrite).

**Stack:** Vite + React + TypeScript PWA, Firebase Auth (email/password) and Firestore on the free Spark plan. Firestore only stores ciphertext.

**Encryption (the core):**

- On sign-up, the browser generates a random data key and encrypts each dream with AES-GCM using WebCrypto (built into browsers, so no library needed).
- The data key is wrapped with a key derived from a passphrase, separate from the login password. Derive it with PBKDF2 (WebCrypto), or Argon2id via a vetted library. Ask before adding the library.
- Firestore holds only `{iv, ciphertext, createdAt}` per dream. Rules allow `users/{uid}/dreams/*` for that uid only, deny by default.
- Warn users plainly: **forget the passphrase and your dreams are gone.** Offer a recovery key to download at sign-up.

**Entry form:** date, free text, emotions (fixed list), people, places, tags, lucid/nightmare/recurring flags, sleep quality, waking mood.

**Local patterns (in the browser, after decrypting).** Each one is a plain TypeScript function over the decrypted dreams. Nothing is sent anywhere.

Tier 1, from the form fields (simple counting, M3):

| Pattern                                                                              | Example insight                                    |
| ------------------------------------------------------------------------------------ | -------------------------------------------------- |
| Top people, places, tags, emotions                                                   | "Your mother appears in 31% of dreams"             |
| Trend over time (by month)                                                           | "Falling dreams up from 2 to 9 since August"       |
| Co-occurrence with lift (how much more often two things appear together than chance) | "When 'work' appears, 'anxious' is 3x more likely" |
| Links to sleep quality and waking mood                                               | "Nightmares follow nights you rated sleep 1–2"     |
| Day-of-week and seasonal rhythm                                                      | "Most vivid dreams on weekends"                    |
| Nightmare, lucid and recurring rates                                                 | "Lucid rate 4% → 11% this quarter"                 |
| New vs. faded                                                                        | "New this month: water, a house. Gone: school"     |

Tier 2, from the free text (no AI, still local, M3):

- Keyword counts after removing stopwords, plus two-word phrases ("teeth falling").
- **Recurring-dream detection:** TF-IDF vectors with cosine similarity flag dreams that are close to earlier ones. That's about 50 lines of plain TypeScript.
- Suggesting tags from your own vocabulary.

Tier 3, optional later (M6, needs package approval): run an embedding model **in the browser** with transformers.js. The model is about 25 MB, downloaded once and cached. It groups dreams into themes by meaning ("being chased" and "running from someone" land together). Still nothing leaves the device.

The opt-in AI read (below) is the only path where text leaves the device.

**Opt-in AI read:** the user picks specific dreams and clicks "Analyze with AI". A clear notice says this text leaves the device. Calls Claude (`claude-sonnet-5-5`). An API key must never be in the browser, so either:

- (a) users paste their own Anthropic key, kept only in local storage (no server, free for you), or
- (b) a small proxy on a free tier such as a Cloudflare Worker. Not Firebase Functions, which needs the Blaze plan.

Start with (a).

**Export / delete:** export decrypted JSON, and delete the account with all its data.

## Making it open source

1. **Public GitHub repo** from day one, so the history shows nothing hidden was ever added.
2. **License: AGPL-3.0** (recommended). Anyone can use, change and self-host it. Anyone who runs a modified version as a website must publish their changes, so no one can take it closed. MIT is the alternative if you don't mind that.
3. **No secrets in the repo.** The Firebase web config is public by design (security comes from rules and App Check), so it's fine to commit. Never commit service-account keys or tokens. Turn on GitHub secret scanning.
4. **Make the privacy checkable, not just the code readable:**
   - Deploy only through GitHub Actions from tagged commits, so the live site is built from public code anyone can see.
   - Publish the hashes of the built files with each release, and add a "Verify this build" page explaining how to rebuild and compare.
   - Add `SECURITY.md` (how to report issues) and a `docs/crypto.md` describing the encryption design in plain words.
   - Add a CSP header that allows network calls only to Firebase (and Anthropic when the AI button is used), so the page can't quietly send data elsewhere.
5. **Community files:** README (pitch, screenshots, self-host guide), CONTRIBUTING.md, issue templates.
6. **Self-hosting:** document "fork, create your own free Firebase project, deploy" so privacy-focused users don't have to trust your instance.

## Git workflow (same as Shoppy, plus PRs because the repo is public)

- Small Conventional Commits on a feature branch; `docs:` commit updates PROGRESS.md.
- Big features: one branch each (parallel tracks when files don't overlap), merged with `--no-ff` and a `merge: <feature>` message.
- From M1, open a PR for each branch; GitHub Actions runs `npm run verify`; main is protected (no direct pushes, CI must pass).
- Tag `mN-done` per milestone; deploy from tags via Actions with build hashes.

## Milestones

1. M1: Auth, encrypted dream create/list/edit/delete, rules and tests.
2. M2: Entry form fields, search (in the browser, on decrypted data).
3. M3: Patterns dashboard (charts).
4. M4: Opt-in AI read (bring your own key), export, delete account.
5. M5: Landing page, CI deploy from tags with build hashes, CSP, deploy to Firebase Hosting (ask first). The repo is public from M1.
6. M6 (optional): theme grouping in the browser with transformers.js.

## Verification

- Unit tests: encrypt/decrypt round trip, wrong passphrase fails, pattern functions on fixture dreams.
- Rules tests on the emulator: user B can't read user A's dreams; stored docs contain no plaintext fields.
- Playwright: sign up, log a dream, reload, unlock with passphrase, see it in patterns. Check in the Firestore emulator UI that only ciphertext is stored.
- Manual: the AI button sends only the selected dreams (check the Network tab).

## Before starting (needs your OK)

Project folder name and location, Firebase project ID and region, any npm packages (charts, Argon2, keywords), and deploys.
