/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Fallback config for local AI Studio development
import firebaseConfigLocal from '../firebase-applet-config.json';

// In production (GitHub), these are injected from GitHub Secrets via vite.config.ts
const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

// Selection logic: Prefer environment variables, fallback to local file if env is missing/dummy
const isEnvValid = envConfig.apiKey && envConfig.apiKey !== 'dummy' && !envConfig.apiKey.includes('${{');

// Merge: start with local config, then override with valid env vars
const finalConfig = {
  ...firebaseConfigLocal,
  ...(isEnvValid ? Object.fromEntries(
    Object.entries(envConfig).filter(([_, v]) => v !== undefined && v !== '' && !String(v).includes('${{'))
  ) : {})
};

if (!isEnvValid && import.meta.env.PROD) {
  console.warn("🚨 [Firebase Config Warning]: API Key not found in environment. Using fallback local configuration.");
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
