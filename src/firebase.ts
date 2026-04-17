/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Fallback config for local AI Studio development
import firebaseConfigLocal from '../firebase-applet-config.json';

// In production (GitHub), these are injected from GitHub Secrets via vite.config.ts
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

// Selection logic: If env vars exist and aren't "dummy", use them. Otherwise fallback to local.
// Trigger build after GitHub Secrets and Firebase Domain authorization
const isEnvValid = firebaseConfig.apiKey && firebaseConfig.apiKey !== 'dummy' && !firebaseConfig.apiKey.includes('${{');
const finalConfig = isEnvValid ? firebaseConfig : firebaseConfigLocal;

if (!isEnvValid && import.meta.env.PROD) {
  console.error("🚨 [Firebase Config Error]: Project is running in production but GitHub Secrets were not found. Falling back to local/dummy config which will fail Auth.");
}

// Initialize Firebase SDK
const app = initializeApp(finalConfig);
export const db = getFirestore(app, finalConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    if (finalConfig.apiKey === 'dummy') {
      throw new Error("Firebase API Key is missing. Please set up GitHub Secrets.");
    }
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    console.error("Login Error:", error);
    alert("ログインエラー: " + (error.message || "認証に失敗しました。GitHubのSecret設定を確認してください。"));
    throw error;
  }
};

export const logOut = () => signOut(auth);

export { OperationType, handleFirestoreError } from './utils/firestoreErrorHandler';
export type { FirestoreErrorInfo } from './utils/firestoreErrorHandler';
