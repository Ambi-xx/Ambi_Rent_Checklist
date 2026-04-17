/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Fallback config for local development
import firebaseConfigLocal from '../firebase-applet-config.json';

const envConfigRaw = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

// Selection logic & Sanitize (Trim whitespace/quotes that might come from GitHub Secrets)
const envConfig: any = {};
Object.entries(envConfigRaw).forEach(([k, v]) => {
  if (v && v !== 'dummy' && !v.includes('${{')) {
    envConfig[k] = String(v).trim().replace(/['"]/g, '');
  }
});

const isEnvValid = !!envConfig.apiKey;

// Merge configuration
const finalConfig = {
  ...firebaseConfigLocal,
  ...envConfig
};

// DIAGNOSTIC LOGS - These MUST appear in production console if the build is fresh
if (import.meta.env.PROD) {
  console.log("%c🛠 [Ambitious Build Diagnostic]", "color: white; background: #2563eb; padding: 4px 8px; border-radius: 4px;");
  console.log(`📡 Config Source: ${isEnvValid ? 'GitHub Secrets (Injected)' : 'Local JSON (Fallback)'}`);
  console.log(`📋 Project ID: ${finalConfig.projectId}`);
  console.log(`🔑 Key Fragment: ...${finalConfig.apiKey?.slice(-6)}`);
  
  if (finalConfig.apiKey?.length && finalConfig.apiKey.length < 30) {
    console.warn("⚠️ Warning: API Key looks suspiciously short. Check your GitHub Secrets.");
  }
}

// Initialize Firebase SDK
const app = initializeApp(finalConfig);
export const db = getFirestore(app, finalConfig.firestoreDatabaseId || '(default)');
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    if (!finalConfig.apiKey || finalConfig.apiKey === 'dummy') {
      throw new Error("Firebase API Key is missing or invalid. Check GitHub Secrets.");
    }
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    console.error("Auth Error:", error);
    
    let msg = error.message;
    if (error.code === 'auth/api-key-not-valid') {
      msg = "API Key が無効です。GitHub Secrets に正しいキーが設定されているか、Google Cloud Console で制限がかかっていないか確認してください。";
    }
    
    alert("ログインエラー: " + msg);
    throw error;
  }
};

export const logOut = () => signOut(auth);

export { OperationType, handleFirestoreError } from './utils/firestoreErrorHandler';
export type { FirestoreErrorInfo } from './utils/firestoreErrorHandler';
