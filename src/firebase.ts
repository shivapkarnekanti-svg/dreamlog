import { initializeApp } from 'firebase/app'
import { browserLocalPersistence, connectAuthEmulator, initializeAuth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

export const USE_EMULATORS = import.meta.env.VITE_USE_EMULATORS === 'true'

const env = import.meta.env
// The web config is public by design. Without one, the app talks to the demo emulator project.
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY || 'demo-key',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-dreamlog.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'demo-dreamlog',
  appId: env.VITE_FIREBASE_APP_ID || 'demo-app-id',
})

export const auth = initializeAuth(app, { persistence: browserLocalPersistence })

// The offline cache holds the same ciphertext the server does, never plaintext.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

if (USE_EMULATORS) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
