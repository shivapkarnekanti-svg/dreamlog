# How Dreamlog encrypts your dreams

Everything here happens in your browser with WebCrypto. The server (Firestore) only stores the results.

## Keys

1. **Data key**: a random 256-bit AES-GCM key, made once when you set up your account. It encrypts every dream.
2. **Passphrase key**: made from your passphrase with PBKDF2-SHA256 (600,000 iterations, random 16-byte salt). It locks ("wraps") the data key.
3. **Recovery key**: 256 random bits, shown once for you to download. It also wraps the data key, so you can get back in if you forget your passphrase.

Your login password (Firebase Auth) is separate and never touches these keys.

## What the server stores

`users/{uid}` (key record):

| Field                           | Meaning                                     |
| ------------------------------- | ------------------------------------------- |
| `v`                             | format version (1)                          |
| `kdf`, `iterations`, `salt`     | how the passphrase key is derived           |
| `passIv`, `passWrapped`         | the data key, wrapped by the passphrase key |
| `recoveryIv`, `recoveryWrapped` | the data key, wrapped by the recovery key   |
| `createdAt`, `updatedAt`        | server timestamps                           |

`users/{uid}/dreams/{id}` (one per dream):

| Field                    | Meaning                                                                |
| ------------------------ | ---------------------------------------------------------------------- |
| `iv`                     | random 12 bytes, new for every save                                    |
| `ciphertext`             | AES-GCM encryption of the dream as JSON (text, date, tags, everything) |
| `createdAt`, `updatedAt` | server timestamps                                                      |

Each ciphertext is bound to your uid and the dream id (AES-GCM additional data), so it can't be moved to another dream or account.

The Firestore rules (`firestore.rules`) only accept these exact fields, so no plaintext field can be added by mistake. Changing your passphrase re-wraps the same data key; the recovery wrap can never be changed.

## What this protects against

- Someone with access to the database (including us) sees only random bytes and timestamps.
- Another signed-in user can't read your records at all (owner-only rules).

## What it doesn't hide

- How many dreams you have, and when you saved them.
- Anything on a compromised device or browser.
- Dreams you choose to send to "Analyze with AI": those go to Anthropic with your own key.

## If you lose your passphrase and recovery key

Your dreams can't be decrypted by anyone, including us. That's the point.
