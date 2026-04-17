/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { 
  getFirestore, 
} from 'firebase/firestore';

// We import the config statically. 
// In GitHub Actions, a dummy file is created by the workflow to satisfy the compiler.
// In local dev, the real file exists.
import firebaseConfigLocal from '../firebase-applet-config.json';

// We prefer environment variables (filled in GitHub CI) but fallback to local config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigLocal.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigLocal.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigLocal.projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigLocal.appId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfigLocal.firestoreDatabaseId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigLocal.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigLocal.messagingSenderId,
};

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig.apiKey && firebaseConfig.apiKey !== "dummy" ? firebaseConfig : firebaseConfigLocal);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logOut = () => signOut(auth);

export { OperationType, handleFirestoreError } from './utils/firestoreErrorHandler';
export type { FirestoreErrorInfo } from './utils/firestoreErrorHandler';
