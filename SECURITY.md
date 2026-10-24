# Security policy

Dreamlog's promise is that only you can read your dreams. If you find a way around that, please tell us privately.

## Reporting

Use GitHub's **Report a vulnerability** button (Security tab → Advisories) on this repository. Please don't open a public issue for security problems.

Include what you found, how to reproduce it, and what an attacker could read or change. We aim to reply within 7 days.

## In scope

- Anything that lets the server, another user, or a network observer read dream text or keys.
- Firestore rules that allow reading or writing another user's data.
- The encryption design in `docs/crypto.md` and its code in `src/crypto/`.
- The opt-in AI feature sending more than the dreams the user selected.

## Out of scope

- Losing your own passphrase and recovery key. By design, nobody can recover your dreams without them.
- A compromised device or browser extension that can read the page.
