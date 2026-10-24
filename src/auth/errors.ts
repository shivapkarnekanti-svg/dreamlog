import { FirebaseError } from 'firebase/app'

const messages: Record<string, string> = {
  'auth/invalid-email': 'That email address is not valid.',
  'auth/missing-password': 'Enter your password.',
  'auth/weak-password': 'Choose a password of at least 6 characters.',
  'auth/email-already-in-use': 'An account with that email already exists. Try signing in.',
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/user-not-found': 'Wrong email or password.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
}

export function authMessage(e: unknown): string {
  if (e instanceof FirebaseError) return messages[e.code] ?? 'Something went wrong. Try again.'
  return 'Something went wrong. Try again.'
}
